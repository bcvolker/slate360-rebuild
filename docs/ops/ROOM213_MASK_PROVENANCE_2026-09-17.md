# Room 213 mask-hash provenance investigation — 2026-09-17

**Scope:** forensic only. No masks were uploaded, no tar was overwritten, no masks were regenerated,
no recipe hash was changed, `mask.py` was not modified, and Arm C / Arm D were **not** launched.

## Result in one line

**There is no mask divergence.** All 6,016 view-level masks are byte-for-byte and pixel-for-pixel
identical across local disk, the Modal volume, and the immutable staged tar. The
`EXP3 input identity mismatch` that stopped the launch was a **false positive caused by a bug in the
hash function itself** (`workers/recon-experiment/hashes.py`), which embeds each file's absolute
filesystem path into the aggregate hash. Three physically identical mask sets living under three
different absolute paths (`/mnt/c/s360/tmp/splat-lab/cecc2763/views/masks` locally,
`/vol/inputs/cecc2763/views/masks` on the Modal volume, and a third scratch path used for this
investigation) necessarily produce three different `sha256_dir` values even though their content
never diverged.

## 1. Full 6,016-file diff (local vs. Modal-volume vs. tar)

Method: downloaded the volume's live extracted mask directory and the immutable
`inputs/cecc2763.tar` to local disk, then computed, for every file in all three sets, both a raw
encoded-bytes SHA-256 and a decoded-pixel-array SHA-256 (`PIL.Image.open(...).convert("L")` →
`numpy` bytes → SHA-256). Script: `qa/exp3-mask-provenance/_audit_hashes.py`. Full per-file table:
[`qa/exp3-mask-provenance/mask-diff.csv`](../../qa/exp3-mask-provenance/mask-diff.csv) (not committed
with image content — hashes only). Aggregate: `qa/exp3-mask-provenance/_scratch/summary.json` (local
scratch, not committed).

| | Local | Volume (live, currently extracted) | Tar (immutable, `inputs/cecc2763.tar`) |
|---|---|---|---|
| File count | 6016 | 6016 | 6016 |
| Filename set equal to the other two | — | yes | yes |
| Missing files | 0 | 0 | 0 |

| Pairwise comparison | Byte-identical | Byte-different | Pixel-identical despite byte diff | Pixel-different |
|---|---|---|---|---|
| local vs. volume | **6016 / 6016** | 0 | 0 | 0 |
| local vs. tar | **6016 / 6016** | 0 | 0 | 0 |
| volume vs. tar | **6016 / 6016** | 0 | 0 | 0 |

Zero files differ by any measure across any pair. There is no bounding box, pixel-count, or region
classification to report for any file — there are no differing files to classify. The CSV's
`changed_pixel_count` / `changed_pixel_pct` / `changed_bbox` / `change_region_class` columns are
present (per spec) and empty on every row for this reason.

## 2. Modal tar provenance

| Field | Value |
|---|---|
| Remote path | `inputs/cecc2763.tar` on volume `slate360-recon-experiments` |
| SHA-256 (whole tar file) | `adc72bf7b7b4446a3d39cbd3b7cb62c5769f703747f7fc2347cfd6d969a838b3` |
| Size | 1,607,055,360 bytes (1.5 GiB) |
| `modal volume ls --json` timestamps | `inputs/frozen-recipe.json` created/modified **2026-09-17 12:11 PDT**; `inputs/visual-poses.json` **2026-09-17 12:11 PDT**; `inputs/cecc2763` (the extracted directory) **2026-09-17 12:21 PDT** (Modal's volume metadata does not expose a separate mtime for `inputs/cecc2763.tar` itself beyond the directory listing shown) |
| `tar masks == currently extracted volume masks`? | **Yes — verified by direct hashing, not inferred.** All 6,016 masks extracted fresh from the tar are byte- and pixel-identical to the volume's live extracted copy (§1, volume vs. tar row). |

## 3. What Experiment 2 actually used

Read: `workers/modal/recon-experiment/worker.py` (`_ensure_inputs`, `stage_inputs`, `train_arm`),
`qa/exp2-run/{A,B}/train-cmd.json`, `qa/exp2-run/{A,B}/effective-config.json`.

- `train-cmd.json` for both Experiment 2 arms passes `--data /vol/inputs/cecc2763/views` with **no**
  `--load-dir` (a from-scratch run reading directly off the volume).
- `_ensure_inputs(vol)` is idempotent by construction:

  ```python
  def _ensure_inputs(vol: Path) -> Path:
      data = vol / "inputs" / "cecc2763"
      marker = data / "views" / "transforms.json"
      tar = vol / "inputs" / "cecc2763.tar"
      if marker.is_file():
          return data / "views"          # <-- short-circuits, never re-extracts
      if tar.is_file():
          data.mkdir(parents=True, exist_ok=True)
          with tarfile.open(tar, "r") as tf:
              tf.extractall(data)
          ...
      ...
      return data / "views"
  ```

  Once `views/transforms.json` exists under `inputs/cecc2763/`, every later call — Experiment 2's
  `stage_inputs.remote()`, both of Experiment 2's arms, and my failed Experiment 3 launch attempt —
  returns the **same already-extracted directory** without touching the tar again. Nothing else in
  the codebase writes to `/vol/inputs/cecc2763/views/masks/*`.
- Conclusion: the tar was extracted to the volume **exactly once**. Experiment 2 read that single
  extraction (via `_ensure_inputs`), and so did my failed Experiment 3 attempt minutes ago. There is
  no code path by which the two runs could have seen different volume content.
- This matches the timestamps in §2: `inputs/cecc2763` (the extraction) is dated 2026-09-17 12:21
  PDT, and Experiment 2's Modal run (`ap-F6K6wtSXXOOqjuIEatCXXs`, train dirs
  `2026-09-17_201258`/`_201247`) ran that same afternoon/evening, after the extraction existed.

## 4. Hashing the retained Experiment 2 masks

The masks Experiment 2 actually trained on are the volume's current `inputs/cecc2763/views/masks/`
— per §3, that directory was never re-extracted or otherwise touched after Experiment 2 ran. Those
are exactly the "volume" files hashed in §1: raw-byte and decoded-pixel hashes recorded for all 6,016
files in `qa/exp3-mask-provenance/_scratch/{raw_hashes,decoded_hashes}.json` (local scratch — not
committed), using the identical hashing approach `verify_inputs()` relies on (`hashes.sha256_file`
plus a decoded-pixel check added for this investigation). Result: identical to local disk and to the
tar, as shown in §1.

## 5. Auditing the hash algorithm — root cause

`mask_hash` is produced by `sha256_dir()` in `workers/recon-experiment/hashes.py`:

```python
def sha256_paths(paths: Iterable[Path]) -> str:
    """Stable hash of many files: sorted relative names + per-file sha256."""
    items = []
    for path in paths:
        p = Path(path)
        items.append((p.as_posix(), sha256_file(p) if p.is_file() else ""))
    items.sort()
    return sha256_json(items)

def sha256_dir(root: Path, patterns: tuple[str, ...] = ("*",)) -> str:
    root = Path(root)
    files: list[Path] = []
    for pat in patterns:
        files.extend(p for p in root.glob(pat) if p.is_file())
    files = sorted(set(files), key=lambda p: p.as_posix())
    return sha256_paths(files)
```

The docstring says "sorted **relative names**," but `root.glob(pattern)` returns paths **prefixed
with `root`**, and `sha256_paths` calls `p.as_posix()` on that full path without ever stripping
`root`. So the tuple hashed for every file is `(full_absolute_path, content_sha256)`, not
`(filename, content_sha256)`. The aggregate hash is therefore a hash of **content plus the exact
absolute directory the content happens to live under** — it is not a content-only hash and is not
portable across machines/mount points, which is exactly what "mask_hash" (and, by the same code
path, `pose_hash`/`seed_hash` computed via `sha256_file`, which is fine, and `source_hash`, computed
via `sha256_json` over a manifest that itself embeds no absolute paths) is documented and relied
upon to be.

**What each hash actually covers:**

| Question | Answer |
|---|---|
| Contents only? | No — path is embedded too |
| Filenames + contents? | No — the *full absolute path*, not just the filename, is embedded |
| Directory ordering? | Sorted deterministically by posix path string; not the cause here |
| PNG metadata? | Raw file bytes are hashed (`sha256_file`), which includes any PNG metadata/encoder differences, but no such difference was found (§1) |
| Raw encoded bytes? | Yes, per-file (`sha256_file`) |
| Decoded pixel values? | Not by the production code; added separately for this investigation and found identical (§1) |

**Minimal reproduction** (no repo files touched, `/tmp` scratch only): two temp directories under
different absolute paths, each containing one file with byte-identical content:

```
dir a: /tmp/proof_a_skj0jxm5 -> 18648d7cdb1ca4eb666aec9d385683a32000c798cd431286987714344e90900d
dir b: /tmp/proof_b_xxd0flio -> 665102ba7393892f8c767b24fae5df3becffd82b2dc97f5b26aa3e4696121e70
identical content, different absolute path => hashes equal? False
```

This confirms the mechanism directly: `sha256_dir` on identical content under two different roots
produces two different hashes, every time, independent of any real mask difference.

**Observed aggregate hashes for the real Room 213 masks** (all three computed from provably
identical file sets):

| Set | Root path used | `sha256_dir` |
|---|---|---|
| Local | `/mnt/c/s360/tmp/splat-lab/cecc2763/views/masks` | `20daa8e25daa806411f45f24a434f81e16767402b413d436f3c5602735a8a2b6` (= the frozen recipe's `mask_hash`) |
| Volume (as seen from inside the Modal container by `verify_inputs`) | `/vol/inputs/cecc2763/views/masks` | `f38bd55f9a493643630e4e6e6b22b9fd0d7918111132024cf2ea7aa1d1f3e8b5` (the value that triggered the abort) |
| Volume (this investigation's local copy of the same content) | `.../qa/exp3-mask-provenance/_scratch/vol-masks-dir/masks` | `c1e31e57057352423d02a8af11caf956dd2f4950a016e528d604f33ecb36a259` (a **third** value, same content, yet another root) |
| Tar (extracted to this investigation's scratch path) | `.../qa/exp3-mask-provenance/_scratch/tar-extract/views/masks` | `9acde6bc7b75be097a1a929fb2ff3ceb2d223cdf33bc782dbab2efca5de62847` (a **fourth** value, same content again) |

Four different aggregate hashes, zero content differences. This is conclusive: the aggregate
`mask_hash` field is unfit to compare across machines or mount points, and every one of these four
values is a legitimate hash of the *same* mask set.

## 6. Local mutation history (`mask.py` and the local job folder)

- `workers/local/splat-lab/stages/mask.py` last **committed** 2026-09-12 13:33:46 -0700 (commit
  `94b9e2bc`). It carries an **uncommitted** working-tree modification, on-disk mtime
  2026-09-17 11:59:08 -0700.
- That uncommitted diff (23 added lines total) is exclusively cache-fingerprint/gating logic
  (`mask_contract.cache_is_valid`, a `mask-meta.json` fingerprint write, an early-return when cached
  masks are already valid, and a fail-closed error path). It contains **no pixel-generation or
  mask-drawing code** — nothing in the diff can alter what a mask looks like, only whether the stage
  re-runs at all.
- The panorama-level cache marker for this exact job, `tmp/splat-lab/cecc2763/mask-meta.json`, is
  dated **2026-09-16 21:42:11 -0700** — the night of the original capture-processing run, hours
  before the tar was ever staged to Modal (§2, §3).
- The corresponding marker for the *view-level* masks that `mask_hash` actually covers,
  `views/views-meta.json`, **does not exist** in this job's folder. The uncommitted `views.py`
  fail-closed/cache logic that would create it has therefore **never executed against `cecc2763`**.
- A full scan of every one of the 6,016 local `views/masks/*.png` file mtimes shows the entire set
  falls inside a single 37-minute window, **2026-09-16 22:25:38 → 23:02:29 -0700** (matching
  `views/transforms.json`, written 23:02:29 the same night). No file has a modification time later
  than that window — in particular, none from 2026-09-17 (the day the tar was staged) or later.

Conclusion: the local masks were generated once, overnight 2026-09-16, and have not been touched
since — including by the uncommitted `mask.py`/`views.py` changes, which never ran against this job
and could not have altered mask pixels even if they had. This is independent corroboration of the
direct byte/pixel equality already shown in §1.

## 7. Decision rule outcome

The exact Experiment 2 mask set **is** provably recoverable, and it is not actually missing — it is
identical to what is already sitting locally and on the volume. Per the decision hierarchy: use this
(single, unchanged) set for Experiment 3; Experiment 3's inputs already are Experiment 2's inputs,
byte-for-byte. No new immutable artifact needs to be carved out and no `inputs/cecc2763-exp2-canonical.tar`
is necessary, because there was never a second, different set to recover from — `cecc2763.tar` already
is that canonical artifact, and it has not been touched or re-extracted since the first (only) time
it was expanded onto the volume.

The **old recorded `mask_hash` is proven to be an artifact of the hashing method** (absolute-path
inclusion, §5), not a record of which masks were used. **I have not changed the recorded hash, the
recipe, or the hashing code in this session** — that correction is scoped to Experiment 3's own
validity gate and would need `verify_inputs()`/`sha256_dir()` fixed to hash root-relative filenames
before either arm can be relaunched, which is outside "forensic only" and outside what I was asked to
do here.

**Recommended fix (not applied):** in `workers/recon-experiment/hashes.py`, make `sha256_paths` /
`sha256_dir` hash each file's path **relative to `root`** (e.g. `p.relative_to(root).as_posix()`
threaded through from `sha256_dir`) instead of the full path. That single change would make
`mask_hash` (and `sha256_dir`'s other callers: `mask_contract.mask_set_hash`,
`views.py`'s cache fingerprint) portable across machines, and local/volume/tar would then all report
the identical value directly instead of only being provably identical via this out-of-band audit.

## Confidence

**HIGH.** Every file in both mask sets (6,016/6,016) was hashed twice (raw bytes and decoded pixels)
from three independent copies of the data (local disk, the live Modal volume, and a fresh extraction
of the immutable tar), with zero discrepancies of any kind. The root cause of the aggregate-hash
mismatch was directly reproduced in isolation (two temp directories, identical content, different
paths, different hashes). The code path proving Experiment 2 and this investigation read the same
volume extraction was read directly, not inferred from timing alone, though the timing (tar staged
2026-09-17 12:21 PDT, Experiment 2 ran later that day, masks generated 2026-09-16 22:25–23:02 PDT,
zero mask edits since) is independently consistent with it.

---

`EXP2_MASK_SET_CONFIRMED_VOLUME`
