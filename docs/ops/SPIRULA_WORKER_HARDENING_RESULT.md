# Spirula worker hardening — result (2026-09-23/24)

Branch `feature/spirula-worker-hardening` (from audited `45df6609`). Modal app `slate360-spirula-hardened` (isolated:
no web endpoint, no production callback, no migration; `slate360-spirula-experimental` and production untouched).
R2 root `experimental/spirula-hardened/`. Evidence JSON lives under that root (paths below).

## Golden package (frozen first)

Source of truth: `C:/s360-recon-exp/docs/ops/ROOM213_SPIRULA_1M_MANIFEST.json` (complete: SHA, command, resolved config,
projection, resolution, cameras, masks, split, scene transform, counts, PLY hash, eval references).

| item | value |
|---|---|
| dataset manifest | `datasets/room213-golden-v1/dataset_manifest.json`, sha256 `3b58ec74…891c` |
| dataset (canonical file list) | sha256 `d8e74c16…75d6`; 1,316 files, 443 unique content-addressed objects |
| images | 1,056 = 218 train + 24 holdout + 14 fixed-eval duplicates + 800 walkthrough eval (pinhole) |
| cameras | 1 & 2 OPENCV_FISHEYE 3840², pp 1920; 3 = walkthrough pinhole 1280×720 |
| projection / transform | native fisheye (`--warp-to-pinhole 0`), scene transform identity |
| flags | byte-identical to the manifest's `training.command` (checked programmatically) |
| resolved config (normalized) | `085213c5…bd57` = golden run's `config.json` |
| golden camera dump | sha `945eeca2…07fb`, 218 cameras, train_frame_scale 5.53252602, 56,674 points |
| golden master PLY | `7e7b5d18…3a62` (re-hashed from the volume at packaging) |
| job | `jobs/room213-golden-repro-v1.json`, sha256 `9edc7a06…93d7` |

## Binary (the one deviation from the golden build — recorded, not hidden)

Golden run: upstream `fd1afca1`, binary `24cf3ca8…5dc5a3`. The worker runs **`fd1afca1+resume-nsh-2f6a873bb639`**:
the same upstream commit, the golden image/cmake/flags, plus ONE line (patch sha256 `2f6a873b…7331`), binary
`dce42548…d8aa` (R2 `tools/spirula/<build id>/`, verified by hash at image build and on every attempt):

```diff
-    target.num_sh         = (cfg.sh_degree + 1) * (cfg.sh_degree + 1);
+    target.num_sh         = (cfg.sh_degree + 1) * (cfg.sh_degree + 1) - 1;
```

Why: upstream checkpoints store `num_sh` = SH *rest* coefficients (15 at SH3); `restore_checkpoint()` targeted 16, so
every resume took the host "adapt" path, resampled SH 15→16 and exported `f_rest_0..47` (65 properties). Found by the
strict gate on fixture runs v1/v2 (rejected, diagnostics preserved). The line executes only under `--resume`; a fresh
run's code path is unchanged. Recipe (flags, dataset, cap, steps, SH, appearance) unchanged.

## Blockers (Astra) — status

1. **Prepared-dataset entrypoint** — `jobspec.py`: immutable job (sha-verified) → exact train-only command; existing
   COLMAP/masks/poses, no SfM, native fisheye, full resolution. Unknown/missing fields and non-golden flags rejected;
   locked flags must be explicit. Dataset materialized per file from content-addressed R2 with per-file hash check. FIXED.
2. **ACTIVE_KEY / started_key** — obsolete claims/storage modules removed; `ids.py` allowlist rejects `.`, `..`, `/`,
   `\`, whitespace, control chars, uppercase, `--`. FIXED.
3. **One strict gate** — `gate.final_acceptance` for every exit path. Exit 0 (no crash text) or ONLY the SIGSEGV whose
   stack has `on_exit` + `__libc_start_main` from `spirula train`, after full terminal evidence. SIGABRT, exit 7, any
   other code rejected. `state.txt` never accepted. Real exit code + crash text kept in the decision and diagnostics. FIXED
   (live: fixture v3 accepted `-11` with the full chain).
4. **Provenance** — inventory (path, bytes, sha256, type, run, attempt, terminal step) built before upload; fresh R2
   `get_object` re-hash against it; stored inventory hash checked. FIXED (live: 8 items fresh-read on fixture v3).
5. **Real checkpoint/resume** — periodic checkpoints shipped durably while training (inventory → upload → fresh read →
   `ckpt.json` pointer last). Fresh worker: downloads, verifies dataset/job/config/build/backend compatibility and
   per-file hashes, resumes with `--resume`. Gate requires Spirula's `Resumed from … at step k`, next step in (k, k+100],
   no layout adaptation, and byte-identical restored state. FIXED (live, below).
6. **Recovery and locking** — `runlock.py`: RUN / OWNER lease / COMPLETED on R2 conditional writes (If-None-Match /
   If-Match). Takeover only when Modal reports the previous owner's call FINISHED (a stale heartbeat alone is refused);
   same attempt id never reused; COMPLETED blocks all attempts; lease loss stops the trainer. FIXED (live R2 duplicate test).
7. **Runtime and cost** — runtime limit from the wall clock (independent of stdout; silent process killed); hook
   failures stop the trainer; `max_containers=1`, `retries=0`, `AUTOMATIC_RETRIES=0`; $5 / 240 min caps including prior
   attempts; persisted ledger (GPU s, wall s, attempts, USD). No callback exists in this milestone; `callback_effect`
   never spawns/retrains. Refused launches write nothing under the attempt. FIXED.
8. **Camera/config fidelity** — every file listed and hashed; per image camera id, lens folder ↔ physical lens,
   q/t exact + finite, split, PNG dims = camera, mask; intrinsics/distortion exact; transform/projection contract.
   Then Spirula's own camera dump compared value-by-value with the golden dump. FIXED (live, below).

## Tests (`test_hardening.py`, 47 probes; all pass on Linux via `selftest`, 45 run in the first Linux pass + 2 added)

NaN opacity · NaN rotation · NaN/Inf SH (f_dc, f_rest) · malformed scale (double type, -Inf, truncated body) · zero
quaternion · fake `state.txt` (alongside and instead of state.tar) · empty/invalid/non-full `state.tar` · changed resolved
config (volatile paths ignored) · changed dataset manifest · changed object/pose/lens/split/intrinsics/transform · extra
file in dataset tree · changed terminal PLY after upload · incomplete inventory · wrong/illegal attempt id · mismatched
dataset/job/binary/backend/GPU · unrelated SIGABRT (string + real `os.abort`) · arbitrary nonzero & exit 7 (real
process) · exit 0 with crash text · SIGSEGV mid-training / wrong stack / without artifact chain · stale artifact reuse
(stale remote bytes + dropped upload; stale local run without this attempt's log) · checkpoint step mismatch /
beyond-terminal · count vs state · resume continuity + wrong resume step + layout-adapt line + restored-state mismatch ·
silent-process runtime violation (real sleep, killed < 15 s) · poll-hook exception stops trainer · duplicate
simultaneous launch (in-memory, 16-thread race, and real R2) · stale heartbeat alone not proof · lease loss · COMPLETED
blocks · callback retry never retrains · cost caps incl. prior ledger.

## Fresh-worker resume (real Spirula, fixture `fixture-resume-v3`, job `788b0e94…`)

- A (`…-a01`, task `ta-01M38ET4…`): full 30k schedule, durable step-5000 shipped + fresh-read, then killed →
  `interrupted` (exit -2), diagnostics kept.
- B (`…-a02`, task `ta-01M38EVW…`, `workExistedAtStart=false`): lease takeover (A's call finished), downloaded +
  verified step 5000, `Resumed from …step-000005000.ckpt at step 5000`, first step 5001, **no layout adaptation**;
  restored state: 5/5 world arrays and 17/17 engine/optimizer buffers **byte-identical** to A's durable checkpoint;
  finished 30000; exit -11 accepted only as the known on_exit SIGSEGV; PLY 62 props, all finite, 18,482 Gaussians;
  8 artifacts fresh-read from R2 → `completed`.
- Before the patch (v1, v2 on the golden binary): B rejected — `master PLY: schema mismatch (65 props, expected 62)`.

## Fidelity on the real Room 213 package (`fidelity_probe`, L40S, no training)

1,316 files hashed; 1,056 images checked (218 train, 24 holdout, 14 duplicate, 800 walkthrough); 3 cameras exact.
Spirula camera dump: 218 cameras (= golden), **max abs diff 0.0** on c2w, viewmats, intrinsics, distortion,
train_to_normalized, points; train_frame_scale 5.53252602, 56,674 points. So Spirula trains on exactly the 218 golden
train views; holdout/duplicate/walkthrough views are eval-only.

## Cost

Ledger rates are the configured card (L40S $1.95/h). Fixture v3 attempts: $0.036. Hardening total incl. v1/v2
fixtures, config probes, fidelity probe (~6 min L40S), CPU packaging/build: ≈ $1 GPU + CPU packaging/build.

## Self-audit vs Astra

All 8 blockers have code + probe + (for 3, 4, 5, 6, 8) live evidence. Known limits (not blockers for a single
supervised reproduction): the ledger records at attempt end (a hard container kill loses that attempt's entry, the Modal
4 h timeout still bounds it); a Modal preemption re-delivers the same attempt id, which the lease refuses (safe, but the
attempt is lost, never retried automatically); the Room 213 job's `expectedMinutes` (40) is a projection, and the
trainer is killed at 2× that.

**Decision: all blockers closed → launch exactly one Room 213 reproduction with the golden job.**

## Room 213 worker run (launched 2026-09-24 01:03:53 UTC)

Launch facts: L40S (max_containers=1, retries=0) · projected 40 min / $1.30 (hard trainer kill at 80 min) · run
`room213-golden-repro-v1`, attempt `-a01`, call `fc-01M38F1GB68AHGVBKTGGV7XN8R` · job `9edc7a06…93d7` · dataset
manifest `3b58ec74…891c` · resolved config `085213c5…bd57` · build `fd1afca1+resume-nsh-2f6a873bb639`.

Result: **completed, accepted by the strict gate.** Fresh container; prepare (1,316-file materialize + fidelity +
camera dump = golden) → 30,000 steps (Spirula training time 1,587 s vs golden 1,671 s) → eval 838 views → exit -11
accepted only as the known on_exit SIGSEGV with the full chain → 1,686 artifacts inventoried, uploaded, fresh-read.
Durable checkpoints 5k–25k shipped during training. Master PLY `275b885a…cfb`, 996,260 Gaussians, 62 properties,
all finite. End-to-end 55.2 min (training finished ~01:37; the rest is eval + upload/fresh-read of 1,686 files).
Cost: ledger $1.10 at trainer exit; full container time 55.2 min ≈ **$1.80** at the L40S card rate.

## Golden vs worker (`compare_golden`, same views identified by content, same masks, same metric code)

| | golden | worker |
|---|---|---|
| Gaussians | 996,092 | 996,260 |
| bbox p1 / p99 | [-7.16,-6.85,-4.59] / [6.11,3.09,6.74] | [-7.12,-7.00,-4.59] / [6.23,3.13,6.68] |
| opacity median / max-scale median | 0.1362 / 0.01071 | 0.1364 / 0.01073 |
| held-out 24 PSNR / SSIM | 19.19 / 0.714 | 19.21 / 0.715 |
| fixed view camera2/frame_00103 PSNR / SSIM | 19.16 / 0.745 | 19.17 / 0.746 |
| Spirula own eval (838 views) avg PSNR | 4.220 | 4.214 (walkthrough GT is black by design) |

Worker vs golden render agreement: held-out 29.6 dB / 0.958 SSIM; fixed view 32.2 dB; walkthrough 800/800 poses
matched uniquely (median NCC 0.995), median 31.6 dB (p10 29.5). Fixed-view crops (edge ratio / gradient corr vs
source): ceiling 0.154/0.45 vs 0.153/0.44 · windows 0.514/0.685 vs 0.528/0.686 · chairs 0.739/0.792 vs 0.756/0.796 ·
table 0.757/0.784 vs 0.773/0.789 · door 0.665/0.735 vs 0.636/0.736 · carpet 0.570/0.531 vs 0.575/0.533. Visual crops
and walkthrough frames: indistinguishable. Spark viewer (the app's Spark 2.1.0 renderer, same poses as the golden Spark
check): worker PLY loads and renders; worker vs golden Spark frames median 32.3 dB, min 28.9 dB, no empty frames
(54 of 80 poses rendered at report time — pane throttled while hidden). Outputs: R2 `runs/room213-golden-repro-v1/compare/`.

Absolute bbox extremes differ (a few far-out low-opacity floaters in both runs; ±700–1,200 units) — stochastic, the
1–99 % extents agree to ~0.1 unit.

## Remaining production gaps (not blockers for this milestone)

- The ledger is written at trainer exit; eval upload + fresh-read time after that (~20 min here) is not in it. Record
  the ledger again after the gate (or at function exit).
- Inventory upload/fresh-read is sequential (1,686 files ≈ 20 min of GPU-container time); move it to a CPU function or
  parallelize.
- Callback route + production migration intentionally NOT deployed (milestone rule). Production untouched.
- Preemption re-delivers the same attempt id, which the lease refuses: safe, but it needs a supervised new attempt id.
- The patched build must stay recorded as a patch; drop it once upstream fixes the resume SH target.

**Verdict: A. WORKER REPRODUCES GOLDEN SPIRULA RESULT — PIPELINE PROVEN.**
