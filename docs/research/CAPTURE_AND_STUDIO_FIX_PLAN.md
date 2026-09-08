# Capture + Research Studio fix plan

**Consensus after Cursor + second review (2026-09-08):** keep this file as the briefing. Execution contract is §10 at the bottom. Do **not** start 360, restyle, or TestFlight until Step A’s phone-open gate is true.

**Date:** 2026-09-08  
**Audience:** Brian + any other AI (Grok laptop, Cursor, Claude)  
**Status:** Diagnosis complete. Desktop studio is **not** producing splats yet. This is fixable.  
**Repo:** `bcvolker/slate360-rebuild` branch `feat/grok-workspace`  
**Desktop clone:** `C:\s360-desktop`  
**Do not reorder** the locked product sequence in `docs/GROK_BUILD_HANDOFF_2026-09-06.md`.

---

## 0. What Brian asked

1. Why the Windows research app has produced **zero Gaussian splats**.
2. Make the app look like real software: two tabs **360 photo/video** and **2D photo/video** (no “drone / iPhone” labels).
3. Settings and export options that a human can understand; pick save location; default file type that opens in the existing Twin / Spark viewer.
4. Can the **phone app** take timed stills + video **and** LiDAR, then this desktop program build a **Gaussian splat plus a LiDAR mesh**?
5. iPhone has **three cameras** — which lens, and should timed stills use multiple focal lengths?
6. TestFlight Twin360 did **not** update; Quick Scan is still a long unnamed file dump.
7. How LiDAR / RTK / other sensors would fit later.
8. A plan other AIs can review before more code.

---

## 1. Ground truth (do not argue with field evidence)

From `docs/GROK_BUILD_HANDOFF_2026-09-06.md` (locked):

- Nothing produced so far is contractor-worthy.
- The product is a **Gaussian splat walkthrough**, not 360 video playback.
- Phone + 360 on one stick has produced nothing of value. Fusion is last.
- Twin360 Quick Scan is a **file dump**. Keep the app as Brian’s LiDAR capture tool. One operator fix: **named session (thumbnail + date + Process)**.
- iPhone LiDAR ~**5 m**. Interior measure only. Not Matterport Pro3.
- Desktop RTX **3090 24 GB** is the factory. Do not burn Modal iterating quality.
- Sell a **2D Postshot share link** first, then 360 splat, then LiDAR as a **separate measure layer**.

Viewer constraint (code, not opinion): Spark / Twin share page loads **`.spz`**. A Postshot/GGPS `.ply` will not open there (`resolveTwinViewerKind`).

---

## 2. Why the desktop program is non-functional

Screenshot `Screenshot 2026-09-06 160501.png` is the old “GGPS Research Studio” window: crude layout, jargon checkboxes, header still says “Gaussian PLY for local inspect”, progress said “Extracting stills” with almost no feedback.

### 2.1 What actually ran

File: `C:\Users\Brian PC\Desktop\Slate360Research\Insta360\AOB Files\stitchedhighpass.mp4`

| Fact | Value |
|---|---|
| Duration | 413.9 s (~6 min 54 s) |
| Size | ~6.6 GB |
| Codec / size | HEVC, 5760×2880, true 2:1 equirect |
| Extract rate used | 0.5 fps (correct for a long walk) |
| Stills written | **207 JPEGs** (~1 MB each) |
| Jobs | `ggps-jobs\20260906-160452-stitchedhighpass` and `...\20260906-161209-stitchedhighpass` |

Extract **worked**. The 7 GB decode took ~90 s. The UI did not say that clearly (ffmpeg `-loglevel error`, no frame counter).

### 2.2 Failure A — WSL quoting (both jobs)

`drop.log` for the 16:12 job:

```
STAGE sfm
bash ".../run_pipeline.sh" --scene "/mnt/c/Users/Brian PC/ggps-jobs/..." --ggps "/mnt/c/research/ggps" --train  --iters 7000
wsl exit=2
```

Reproduced 2026-09-08: old `wsl bash -lc "<quoted string>"` prints `need --scene and --ggps` and exits **2**. Cause: username `Brian PC` has a space; PowerShell split the command line. **No cameras, no train, no SPZ.**

Fix already in `run_job.ps1` on `feat/grok-workspace` (`f19850c8`): pass `wsl.exe` an **argument array**, not one quoted string. Brian’s screenshot job ran **before** he relaunched that build.

### 2.3 Failure B — OpenSfM abort (after quoting fix)

On 2026-09-08, argv launch **did** enter the pipeline, then:

```
OpenSfM spherical
ERP size 5760x2880 ratio=2.000
extract_metadata ... Aborted (core dumped)
```

So even with quoting fixed, **360 SfM is not healthy**. OpenSfM’s venv (`~/slate360-engines/opensfm/.venv`) previously showed a NumPy 1.x/2.x ABI mismatch. 207 frames of 5.7K ERP on `/mnt/c/...` (NTFS via DrvFS) is a bad place for that stack.

Trainers that **are** healthy today:

| Tool | Status | Role |
|---|---|---|
| PanoLOG conda | **Ready** — torch 2.8.0+cu126, sm_86, RTX 3090 | GGPS train **after** poses exist |
| Postshot CLI | **Ready** — `C:\Program Files\Jawset Postshot\bin\postshot-cli.exe` v1.1.69 | **2D** Gaussian (phone/drone/any pinhole) |
| ffmpeg | Ready | Video → stills |
| Twin ingest | Ready if `.spz` exists | `scripts/local-splat/ingest-splat.mjs` → `/share/twin/[token]` |

**PanoLOG cannot invent cameras.** No SfM ⇒ no `train_large.py` ⇒ no splat. That is why the status bar can say “Trainer ready” while the user still has zero output.

### 2.4 UI problems in the screenshot (product, not just polish)

- Window title / header still GGPS-branded and “PLY”, while the real deliverable is **SPZ**.
- Tabs (if present in a later commit) were labeled “Phone and drone” — Brian correctly does not want device names.
- Settings are engine knobs (`0.5 fps`, `7k steps`, `Large outdoor partition`) with no plain-language default.
- Export is a small button, not an obvious “Save as…” with format + folder.
- Recent jobs list empty in the shot even though jobs existed (refresh / path).
- Two-column layout feels like a debug panel, not a shipped app.
- No Cancel, no percent, no “207/207 frames”.

---

## 3. Recommended product shape (desktop)

**Name:** Slate360 Research Studio (or Capture Studio). Not “GGPS”.

**Two tabs only:**

| Tab | Accepts | Trainer | Output |
|---|---|---|---|
| **360 photo or video** | Stitched equirect jpg/png **or** stitched equirect mp4. Reject `.insv`. | Spherical SfM + GGPS (research) | `.spz` default |
| **2D photo or video** | Any pinhole stills or video (phone, drone, DSLR — do not name them) | **Postshot** on the 3090 | `.spz` default |

One primary button: **Create splat**.  
One secondary: **Save as…** (folder picker).

### 3.1 Settings a human can read

Hide engine names unless “Advanced” is open.

| Shown | Meaning | Default for `stitchedhighpass` |
|---|---|---|
| Coverage | Short / Medium / Long walk | **Long** (0.5 stills/sec → ~207 frames) |
| Quality | Preview / Final | **Preview** until the first splat exists |
| Open in Twin | Yes/No | Yes |

Map under the hood: Coverage → fps; Quality → 7k vs 30k (GGPS) or 30 vs 60 kSteps (Postshot). Do not show “7k steps” or “partition”.

### 3.2 Export (default already selected)

Gaussian splat is **not** an OBJ mesh. Do not pretend it is.

| Format | Default | Opens in |
|---|---|---|
| **SPZ v3** | **Yes** | Twin / Spark share viewer |
| Gaussian PLY | Optional | Research tools, SuperSplat, etc. |
| `.splat` | Optional | Other viewers |
| HTML | Optional | Double-click local preview |
| OBJ / GLB | **Not from this Gaussian train** | Comes from the **LiDAR mesh** path, separately |

Save As: Windows dialog, default folder `Desktop\Slate360Exports\<project>.spz`. Optional: mint Twin share (already scripted).

### 3.3 Make 360 actually finish (required for “functional”)

Do this **before** more UI chrome.

1. Relaunch the studio from the current `feat/grok-workspace` so the argv WSL fix is live.
2. **Do not re-extract** `stitchedhighpass` (207 frames already on disk). Resume that job.
3. Copy the job to a **Linux filesystem** (`\\wsl$\Ubuntu-22.04\home\rian_\ggps-jobs\...`) so OpenSfM is not on DrvFS.
4. Fix or replace OpenSfM:
   - Repair the OpenSfM venv (numpy ABI), **or**
   - Prefer **OpenMVG spherical** (what GGPS’s own scripts expect), **or**
   - For a first 360 proof, unwrap with a **hard camera rig** (one pose per timestamp) — not independent cube-face COLMAP (that is the production bug we must not repeat).
5. Only then call PanoLOG `train_large.py`.
6. `convert-splat.mjs` → `gaussian.spz` → optional `ingest-splat.mjs`.

**Faster proof of “the app can emit a splat”:** run the **2D tab** on a short iPhone walk through **Postshot**. That path does not need OpenSfM. It is also the locked L0 product.

### 3.4 UI polish (after one splat exists)

- Graphite/navy shell, one gold accent on the primary button, 48 px targets, no jargon.
- Tabs: “360 photo or video” / “2D photo or video”.
- Huge drop zone; File → Add files / Add folder.
- Live probe: duration, 2:1 yes/no, estimated still count, ETA.
- Progress: Extract 45/207 → Cameras → Train 12 min left → Save SPZ.
- Cancel.
- Recent jobs with thumbnail, date, status (Extracted / Failed cameras / Splat ready).
- Help copy in one paragraph, not a wall of log.

---

## 4. Phone capture: timed stills, video, LiDAR

**Yes, the phone can capture the ingredients. The phone must not train.** Heavy compute stays on the 3090 (`CLAUDE.md`).

### 4.1 What to capture on device

| Stream | For | Notes |
|---|---|---|
| **2D video or timed stills** (wide camera) | Gaussian splat | Hero for L0. Same Postshot path as desktop drop. |
| **ARKit poses + iPhone LiDAR depth** | Metric mesh / measure layer | Twin360’s job. ~5 m range. Interior only. |
| **360** | Separate splat | X4 on a pole, stitched in Studio, then 360 tab. Not on the iPhone. |

Timed stills vs video:

- Video is faster in the field; desktop extracts 0.5–2 fps and drops blur.
- Timed stills (0.5–1 s interval, AE/WB locked, landscape) can be sharper (less rolling shutter).
- **Overlap matters more than timed vs video.** 70–80% overlap, two heights, close the loop (`TWIN360_CAPTURE_SOP.md`).
- Practical SOP: one slow 4K **wide-camera** video walk, plus optional stills at corners. Do not require a custom intervalometer before L0 works.

### 4.2 Which of the three iPhone lenses

Pro models have **Ultra Wide (~13 mm)**, **Wide / Main (~24 mm)**, **Tele (~77–120 mm depending on year)**. LiDAR is a **separate ToF** next to that cluster. ARKit RGB+depth is calibrated to the **main wide camera**.

**Lock splat capture to 1× Wide (main).**

| Lens | Use in this product |
|---|---|
| Wide 1× | **Only lens for the splat walk** |
| Ultra Wide | Distortion + different intrinsics; poisons a single-camera splat |
| Tele | Different camera; use later for a *detail inset*, not mixed into the same train |
| LiDAR | Depth/mesh layer, not a “fourth photo lens” |

Mixing focal lengths in one Gaussian train **does add too much complexity** for the first SKU: SfM must treat them as different cameras or the scene warps. Apple’s multi-cam fusion is for 2D photos, not for a single photogrammetry camera model.

Do **not** time-bracket 0.5× / 1× / 5× on the same walk until 1× 2D splat and 360 splat each look good alone.

### 4.3 Gaussian splat + LiDAR mesh — how it should work

This already matches the Twin viewer architecture (Reality vs Geometry), if we stop fusing too early.

```
PHONE                          DESKTOP 3090                         VIEWER
Wide 1× video/stills  ──►  Postshot ──► appearance.spz  ──►  Reality (splat)
ARKit + LiDAR depth   ──►  TSDF / existing mesh job ──►  geometry.glb ──►  Geometry (mesh)
360 stitched mp4      ──►  GGPS (research) or later gsplat ──►  second splat (optional)
```

- Client can toggle splat vs mesh.
- Numbers on screen: **laser governs**; iPhone LiDAR is estimating-grade until VALID-1.
- **Do not fuse 360 × LiDAR × 2D** until each path works alone (handoff Phase L3).

### 4.4 RTK

iPhone has **no survey RTK**. External RTK (Emlid, Bad Elf) can geotag photos; that is a later exterior/civil SKU, not the interior splat blocker. ARKit local metric frame + a tape/laser check is enough for the first interior jobs.

---

## 5. Twin360 TestFlight / Quick Scan dump

Locked operator fix: **named session = thumbnail + date + Process**, not a raw file list.

Why the phone “didn’t update”:

- App Store / TestFlight / Codemagic was **frozen** in the 2026-09-06 handoff until a sellable splat exists.
- Last Codemagic iOS build seen from this desktop: **#80** `ios-capacitor` on `feature/twin-capture-preservation-clean` (2026-09-01), not necessarily a Twin360 scan-list redesign.
- Quick Scan titles are still auto-generated: `Quick Scan — ${Mon} ${day}` (`lib/digital-twin/quick-scan-title.ts`). That **is** the dump.

Plan (one phone fix, then freeze store again):

1. Confirm the device’s TestFlight build number vs Codemagic #80 / latest `sitewalk360-ios` or Twin workflow.
2. If the list-UI fix never shipped, implement **only** that: project or “Quick scan” at top; each row = thumbnail, user title (default location+time), date, duration, **Process**. Hide raw filenames.
3. Ship **one** TestFlight. Brian names it on device.
4. Do not do App Store polish, IAP, or Site Walk overhaul.

---

## 6. Work order (fixable — this is the sequence)

Share this list with Cursor/Claude. Each step has an exit gate.

| # | Work | Gate | Who |
|---|---|---|---|
| **A** | Prove **2D** Postshot → `gaussian.spz` → Twin share from a short iPhone walk | Brian opens the share on his phone | Desktop studio 2D tab |
| **B** | Resume `stitchedhighpass` 207 frames; fix OpenSfM/OpenMVG on Linux disk; GGPS train → SPZ | Same room, 360 share | Desktop 360 tab |
| **C** | Restyle studio: two tabs as named above; human settings; Save As SPZ default | Brian can use it without a walkthrough | Desktop |
| **D** | Twin360: named sessions + one TestFlight | List is usable in the field | Phone, one store build |
| **E** | Phone: lock capture to 1× wide; optional timed stills; keep LiDAR as mesh sidecar | One scan folder = RGB + depth + poses | Phone, after A |
| **F** | Viewer: splat + mesh toggle on the same share (already the Twin idea) | Reality vs Geometry on one link | After A and LiDAR mesh |
| **G** | Cloud 360 (gsplat, no GGPS in SaaS) | Only after B looks like money | Modal later |

**Do not** start FUSE, RTK, multi-focal, or App Store in this list.

---

## 7. Is it fixable?

**Yes.** The 3090, Postshot, PanoLOG, ffmpeg, `.env.local`, R2, and Twin ingest are in place. Extract of a hard 6.6 GB 360 file already works. Failures are: (1) a quoting bug on `Brian PC`, (2) OpenSfM crashing, (3) an unfinished operator UI, (4) TestFlight freeze + Quick Scan dump.

Highest-confidence first splat: **2D tab + Postshot + SPZ**, not 360 GGPS. That is also the locked business order.

---

## 8. Explicit non-goals (for reviewers)

- Shipping GGPS/OmniGS CUDA in the SaaS (CC BY-NC + GPL). Desktop research wrap only.
- Playing 360 video as the client deliverable.
- Mixing UW/tele into the first splat.
- Fusing LiDAR with 360 before each is good alone.
- DIY long-range LiDAR or RTK as the current blocker.
- OBJ as the Gaussian export.

---

## 9. File map for implementers

| Piece | Path |
|---|---|
| Desktop studio UI | `scripts/research/ggps-drop-app/GGPS-Research-Drop.ps1` |
| Job runner | `scripts/research/ggps-drop-app/run_job.ps1` |
| 360 WSL pipeline | `scripts/research/ggps-drop-app/wsl/run_pipeline.sh` |
| SPZ pack | `scripts/research/ggps-drop-app/convert-splat.mjs` |
| Twin ingest | `scripts/local-splat/ingest-splat.mjs` |
| PanoLOG install | `scripts/research/ggps-drop-app/wsl/install_panolog.sh` |
| Quick Scan titles | `lib/digital-twin/quick-scan-title.ts` |
| Locked briefing | `docs/GROK_BUILD_HANDOFF_2026-09-06.md` |
| Capture SOP | `docs/design/TWIN360_CAPTURE_SOP.md` |
| Failed 360 stills | `%USERPROFILE%\ggps-jobs\20260906-161209-stitchedhighpass\images` (207 frames, keep) |
| Proven 360 Route B (untracked on `C:\s360`, **not** in desktop clone) | `C:\s360\scripts\ops\x4-quality-gaussian\` + `brush_app.exe` |
| 8-bit SPZ packer | `scripts/ops/pack-appearance-web-spz.py` (generalize; kitchen paths hardcoded today) |

---

## 10. Consensus execution contract (after two reviews)

Reviewed 2026-09-08 against live `C:\s360-desktop` scripts. Adopt all of this.

### Confirmed in code

- 2D ffmpeg extract is **360-only** (`-not $is2d`). Dropping an iPhone `.mov` on the 2D tab writes **zero stills**.
- Empty `$kept` still does `$sortedSharp[0].Sharp` → throw. Postshot never starts.
- 2D path may import the **raw movie** if stills &lt; 20. Wrong first proof.
- UI `Start-Process -ArgumentList` still quotes `C:\Users\Brian PC\...`. Same bug class as WSL.
- `convert-splat.mjs` is SPZ **v3** but uses splat-transform **defaults** for SH bits. Kitchen packer uses **8/8**.
- Postshot CLI default SPZ is **v4**; Spark rejects &gt; v3. Runner already passes `--spz-version 3` — still prefer **PLY → 8-bit packer**.
- Route B + Brush exists on **`C:\s360`** (untracked) and `Desktop\Slate360Research\engines\brush\brush_app.exe`. **Not** in the desktop git clone. GGPS remains research-only.
- Independent cube-face COLMAP = production bug. **Rig-locked** faces from one panorama pose = Route B, keep.

### Must land before Brian hits Create splat (Step A code)

1. 2D video: ffmpeg-extract stills (same Coverage fps as 360).
2. If `$kept.Count -eq 0`, skip sharpness; do not index `[0]`.
3. Postshot `--import` the **still folder**; export PLY; pack SPZ v3 **8-bit**; copy `export\gaussian.spz`.
4. Launch `run_job.ps1` in-process or via `-File` temp script. Dummy job whose path contains a space must pass.
5. Ingest remains `ingest-splat.mjs`.

### Step A gate (only work until true)

Short interior, iPhone **1× Wide**, 4K, AE/WB locked, HDR off, slow loop, Coverage Short (2 fps), Quality Preview.

Pass: `export\gaussian.spz` exists; share `https://www.slate360.ai/share/twin/...`; Brian opens it on his phone; he would send it to a GC **or** he recaptures. **No more pipeline until that call.**

### Step B (only after A)

- Engine: **Route B + Brush** (commit `x4-quality-gaussian` / `x4-v1-canonical`). GGPS = Advanced/research.
- Copy JPEGs onto ext4 as **real files**. No `/mnt/c/Users/Brian PC` image symlinks.
- First 360: **short** stitched clip (~51 s), not the 207-frame 7 min walk.
- Pack with 8-bit SPZ. Same phone-open gate. Then optionally resume 207 frames at 3840×1920.

### After A (small)

Tabs: **360 photo or video** / **2D photo or video**. Export → **Save as…**. Never show “trainer ready” with an empty export folder.

### Later (frozen until A looks like money)

TestFlight named sessions. 1× Wide lock in Twin360. Reality+Geometry on one share. Cloud 360. No fusion, no multi-focal, no App Store, no OpenSfM-as-default, no invented 360 poses.
