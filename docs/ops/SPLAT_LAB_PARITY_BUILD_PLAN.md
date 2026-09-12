# Slate360 Splat — parity build plan, revision 2 (for Sonnet 5)

Revised 2026-09-12 by Claude Fable 5.1 after (a) reading the reference studio's own kitchen job
output, (b) two Cursor/Grok build-plan drafts and a Grok equipment thread supplied by Brian, and
(c) verifying every technical claim below against the machine. Section 9 says exactly what was
accepted or rejected from those drafts and why. Everything here is a fact taken from a file on
disk, a command run on this machine, or one of Brian's screenshots, unless marked *assumption*.

Goal: one desktop program, **Slate360 Splat**, that opens from a Desktop icon with no login and
works like the reference studio card for card, plus **Slate360 Splat Lab**, the same program
with experimental options on. Same pipeline architecture as the reference (native
equirectangular SfM on panoramas, 16 derived training views, masks in SfM and training, auto
step/cap formulas, live telemetry) so that no hidden difference makes Slate360's output worse.

The reference product's name is used in this internal doc only. **Never put it in UI copy, code
identifiers, commit messages or user-facing text.** Say "reference layout" if needed.

---

## Implementation status (2026-09-12, Claude Sonnet 5)

Phases 0–3 are built, verified end-to-end through the real web UI (not scratch scripts), and
committed on `feature/splat-lab` (commits `94b9e2bc`, `3d3cb67d`, `540f9d0e`, `e1d0dda4`). What
changed from the plan as written, and three real bugs found only by actually running the finished
system, are below. Phase 4 (MCMC trainer) is not started — see the note at the end of this section.

**What works, proven live:** started a job through `POST /api/splat-lab/run` on the real kitchen
folder (an 8-second-capped clip for a fast test) and watched it complete unattended through the
actual card UI: frames (11.5s) → mask (43.3s) → native equirect SfM (111.2s, **64/64 panoramas
registered, 31,795 points, 1.11px mean reprojection error**) → 16-view training-set build (164.9s,
**1,024 views, reprojection sanity check 18.2%**) → training (65.9s, 300 steps) → export (11.8s,
a 3.2 MB PLY). The low-quality-capture banner fired correctly (luma 53.5/255, 26% shadow) and the
exported splat rendered in the View/Publish card's 3D viewer. Cancel killed the WSL process tree
in ~4s; Rerun-from-frames correctly reused existing frames without racing the newly spawned
process (see bug 3 below). All three project guards (`design`, `architecture`,
`file-size-regression`) pass; 36 Python tests pass (33 new, permanently locking down the 16-view
rotation math to 1e-6 against COLMAP's own camera model — see `test_views_reprojection.py`).

**Full-scale proof run, completed** (the real 815-panorama kitchen capture, not the 8-second test):
native equirect feature extraction took 471s (reference: 2,475s at higher resolution). Matching was
measured twice on the identical feature set: **exhaustive took 2,900s (48.3 min)**; **sequential +
FAISS-vocab-tree loop closure took 197s (3.3 min)** — a 14.7x speedup, consistent with the
reference's own ~434s. This is why `_EXHAUSTIVE_MAX` in `sfm.py` is 200, not the 1,200 originally
guessed — exhaustive is only sane for small captures now that sequential+loop is proven fast and
correct. `colmap model_analyzer` on the finished sparse model:

```
Registered images: 815 / 815 (100%)
Points: 420,993
Mean reprojection error: 1.258 px
```

**815/815 registered with more points than the reference's own run on this same kitchen**
(416,273) — the native path is not just parity, it is a slightly denser reconstruction. Mapping
(retriangulation + global bundle adjustment) took **2,585s (43.1 min)** — this is the one number
that misses the plan's own ≤30-min-total target (features 471s + matching 197s + mapping 2,585s ≈
54.2 min total). The reference reports 752s (12.5 min) for the equivalent phase, so its
proprietary Vulkan-based bundle adjuster is meaningfully faster than stock COLMAP's CPU Ceres
solver on this problem size. Follow-up for Sonnet/Lab: check whether this COLMAP 4.1 build's
`mapper` has a GPU bundle-adjustment path (`--Mapper.ba_use_gpu` or similar) before accepting 43
minutes as the ceiling — not investigated in this session for time.

**Three real bugs found only by running the finished system, not visible from reading the code:**

1. **Cross-instance job state.** `job-store.ts`'s in-memory `Map` is not reliably shared across
   different Next.js API route handlers in dev mode — a job started by `POST /api/splat-lab/run`
   was invisible to `GET /api/splat-lab/jobs/[id]` moments later. Every write now also persists to
   `<jobDir>/live-status.json`, and every read prefers that file. `tmp/` was also never actually
   gitignored (`/tmp-*` only matches root-level `tmp-*`, not the `tmp/` directory) — fixed.
2. **Every real pipeline run silently failed before writing a single stage record.**
   `wslCleanEnv()`'s return value had no trailing `;`, and the array-joined-with-spaces command
   string swallowed the entire `python run.py --input ... --quality auto --strategy default`
   invocation as arguments to the preceding `export PYTHONIOENCODING=utf-8` statement
   (`export: '--quality': not a valid identifier`). This means the desktop app's Run button never
   actually worked end-to-end before this fix, regardless of which pipeline version was behind it.
3. **Rerun raced its own kill.** The fire-and-forget WSL kill has an internal 1-second delayed
   SIGKILL sweep matching by job id, not a specific PID — it was killing the brand-new process for
   the same job id moments after Rerun started it. Now awaited to completion first.

Also: COLMAP 4.1's **binary** sparse-model format (`cameras.bin`/`images.bin`) does not match the
classic enum this codebase's original binary reader assumed (COLMAP's newer rig/frame architecture
renumbered camera model IDs and added `frames.bin`/`rigs.bin`) — crashed the first live-data run of
the views stage. Fixed by exporting and reading COLMAP's **TEXT** format instead, which is stable
and documented across versions; `colmap_io.py`'s docstring has the detail. Two hydration bugs
(`HelpTooltip`'s own `<button>` nested inside another `<button>` in two components) were also found
and fixed while checking the browser console during verification.

**Not done: Phase 4 (MCMC trainer via gsplat).** This needs a real bright recapture to A/B against
per the plan's own acceptance rule (§7.6) — it cannot be honestly promoted from a dark 8-second test
clip. The `strategy: "mcmc"` UI option exists in the Lab clone's knobs but the Python side still
runs the default nerfstudio trainer regardless of that setting; wiring the actual gsplat trainer is
the next slice.

---

## 0. Rules (read before touching anything)

- Branch `feature/splat-lab` in `C:\s360` only. Never rebase, merge or force-push `main`.
- Stage explicit paths. Never `git add .`. Never commit `.env.local`, `tmp/`, `scripts/splat-lab/bin/`, `workers/local/splat-lab/models/*.onnx`, videos or frames.
- Do not edit: entitlements, billing, Stripe, middleware, existing migrations. You **may** edit the thin pages under `app/(dashboard)/splat-lab/**` so the CEO-gated hosted route reuses the new panel; keep its `layout.tsx` gate untouched.
- Every new `.ts`/`.tsx` file < 300 lines (guard:file-size-regression, `.ts/.tsx` only). Split, don't grow.
- Tokens only: `var(--graphite-canvas)`, `var(--graphite-primary)`, `var(--twin360-blue)`, `var(--graphite-muted)`, `var(--graphite-text-header)`, `var(--graphite-text-body)`. No hex, no amber, no glow, no `rounded-full` (guard:design).
- Desktop route `app/splat-lab-desktop/**`: no login, localhost-only Host check in its `layout.tsx`. Any filesystem-browsing API you add must refuse non-localhost hosts the same way and must not be reachable from the hosted app.
- Typecheck with a scoped tsconfig (bare `tsc` OOM-crashes): temp `tsconfig.splatlab.json` extending `./tsconfig.json`, `incremental: false`, `include: ["app/splat-lab-desktop/**/*","app/(dashboard)/splat-lab/**/*","app/api/splat-lab/**/*","components/splat-lab/**/*","lib/splat-lab/**/*"]`.
- WSL: distro `Ubuntu-22.04`; Python `/home/rian_/slate360-engines/nerfstudio/.venv/bin/python` (nerfstudio 1.1.5, gsplat 1.5.3, torch 2.5.1+cu124, tensorboard 2.20); COLMAP 4.1.0 CUDA at `/home/rian_/slate360-engines/colmap-4.1.0/bin/colmap`; ffmpeg on PATH. The vocab tree at `/home/rian_/.local/share/nerfstudio/vocab_tree.fbow` is the **legacy format and crashes COLMAP 4.1** (`visual_index.cc:690 Failed to read faiss index`, verified). COLMAP ≥ 3.12 needs the FAISS index file `vocab_tree_faiss_flickr100K_words32K.bin` from the COLMAP GitHub releases page (Phase 1 task; store it under `/home/rian_/slate360-engines/colmap-4.1.0/`). Never put `$VAR` inside an inline `wsl -lc '...'` string; write a `.sh` file and run it.
- Two uncommitted edits exist (`workers/local/splat-lab/stages/frames.py`, `stages/mask.py`: reuse existing frames/masks). They are correct; commit them in Phase 1.
- `tmp/splat-lab/kitchen-proven/{images,masks,sfm/faces}` are reusable inputs: keep. Its `sfm/colmap/colmap/database.db` (3.8 GB, exhaustive matcher, never finished) can be deleted.
- Do not start a GPU train while `nvidia-smi` shows another trainer.
- Quality claims only via matched screenshots in one viewer (§7). Never "looks good" from a metric.

---

## 1. Ground truth: the reference studio on this kitchen

Files: `C:\Users\Brian PC\Documents\AirVis\kitchen_AirVisStudio\{airvisstudio-workspace.json, splats/0/airvisstudio-splat.json, splats/splat-trainer.log, Extracted/splat-training-views/*.json, SFM/splat-cube-faces/*.json}`.

| Item | Value | Source |
|---|---|---|
| Input | `highpass.mp4` + `lowpass.mp4`, X4 stitched 7680×3840, 203.5 s total | workspace json |
| Frames | 4 fps → **815 panoramas**, sharpest of 25 candidates per slot | workspace json |
| Masks | RTMDet people (+ nadir) on the equirect, used in SfM **and** training (`alpha.masked=13040`) | workspace json, trainer log |
| SfM | **native EQUIRECTANGULAR** camera, one pose per pano, sequential overlap 4 + vocab-tree loop closure, **not exhaustive**; 815/815 registered, **416,273 points**; features 2475 s, matching 434 s, mapping 752 s | workspace json, splat json, manifests |
| Training views | **16 virtual 90° pinhole views per pano**, max 1280 px each → 13,040 views | training-views json `canonical16-fov90-max1280-v1` |
| Trainer | Vulkan MCMC fork, preset `safe`, **image.max_resolution=1024**, SH 3 (interval 10,866), L1+SSIM 0.2, opacity/scale reg 0.01, background grey+noise, bilateral grid off, black-point boost on | trainer log |
| Steps | **326,000** = 13,040 × 50 ÷ imagesPerStep 2 (floor 25,000) | splat json `stepResolution` |
| Splat cap | **6,520,000** = views × 500; GPU-safe 17.4 M; final 6,519,997 | splat json `splatCapResolution` |
| Low-quality flag | **`lowQualityCapture: true`** → `--low-quality` preset (scene scale fixed 0.2) | splat json, trainer CLI help |
| Runtime | ≈ 5 h on the RTX 3090 (≈ 4 h training) | manifests |
| Output | `model.ply` 1.54 GB standard 3DGS + `model.rad` (LOD); SPZ/SOG optional; collision none | splat json |

Footage measured on the 815 panoramas: mean luma **59.5/255**, **23.4 %** deep shadow, Laplacian
variance ≈ 100 at 1920 px. Night, warm ceiling lights, glossy dark cabinets.

**Conclusion (unchanged by the reviews):** the reference already ran the stronger 360 stack and
its own classifier flagged the capture as low quality. Its softness is (1) darkness, (2) training
at 1024 px, (3) a 3.4-minute night walk. A Slate360 clone matches that recipe; it cannot add
photons. Sellable output needs a lit recapture (§8) and training at ≥ 1280–1920.

---

## 2. What was verified on this machine today (facts the plan depends on)

| Claim | Result | How verified |
|---|---|---|
| Stock COLMAP 4.1.0 supports `EQUIRECTANGULAR` cameras | **Yes.** feature_extractor, sequential_matcher and mapper all accept it; 3 real panos registered with 2,811 points in a smoke test. `SPHERICAL` is **not** a valid model name. | `probe-equirect.sh`, 2026-09-12 11:53 |
| Full native SfM on all 815 kitchen panoramas with masks | See §2.1 (proof run, numbers filled in below) | `native-sfm-test.sh` → `tmp/splat-lab/native-sfm-test/` |
| COLMAP option names | `--ImageReader.camera_model`, `--ImageReader.mask_path` (mask = `<mask_path>/<image name incl. .jpg>.png`, zero = ignore), `--ImageReader.single_camera 1`, `--FeatureExtraction.max_image_size`, `--SiftExtraction.max_num_features` (default 8192; **not** `FeatureExtraction.max_num_features`), `--SequentialMatching.{overlap,quadratic_overlap,loop_detection,loop_detection_period,loop_detection_num_images,vocab_tree_path}`, `--VocabTreeMatching.match_list_path`, `matches_importer --match_list_path --match_type pairs`, `rig_configurator --rig_config_path` | `colmap <cmd> -h` |
| nerfstudio 1.1.5 splatfacto: MCMC / splat cap flag | **None.** Only `default` densification. gsplat 1.5.3 has `MCMCStrategy`; `/home/rian_/slate360-engines/gsplat/examples/simple_trainer.py` runs `mcmc --strategy.cap-max N`. | `ns-train splatfacto --help` |
| nerfstudio image cache | `--pipeline.datamanager.cache-images {cpu,gpu}` only, **no disk streaming**. 13,040 views × 1920² × 3 B = **144 GB > 128 GB RAM**. At 1280 px = 64 GB (fits). At 1024 = 41 GB. | `ns-train splatfacto --help` |
| nerfstudio dataparser `mask_path` per frame and `ply_file_path` init | Supported (`nerfstudio_dataparser.py:171, 353`) | grep |
| Trainer prints tqdm `N / M … it/s`? | **No** (local-writer table). Current `train.py` regexes never match → HUD stays "—". | code read |
| `cancelJob` | SIGTERMs `wsl.exe` only; Linux chain survives (observed: `run.py` → `ns-process-data` → `colmap exhaustive_matcher` alive 2 h 35 m after the UI was closed; the reboot killed it). | `ps` in WSL |
| Exhaustive matcher on 9,768 faces | 47.7 M pairs; 3.8 GB db after 67 min, unfinished. Reference matched 815 panos in 434 s. | `ps`, `ls -la` |
| C# compiler for `.exe` launchers | `C:\WINDOWS\Microsoft.NET\Framework64\v4.0.30319\csc.exe` present; no .NET SDK. | PowerShell |
| Two `.exe` Desktop programs | **Built and placed today**: `Slate360 Splat.exe`, `Slate360 Splat Lab.exe` (290 KB each, hex-S icon baked in, no shortcut arrow because they are programs, not `.lnk`). All `.lnk` variants removed. Source: `scripts/splat-lab/Slate360Launcher.cs` + `build-launchers.ps1`. | `build-launchers.ps1` run |
| Browser folder picker gives a path? | **No.** `<input webkitdirectory>` exposes file names, never the absolute folder path, and the pipeline needs a path for WSL. Use a localhost-only `fs/list` API + mini browser (§3.3). | Chromium behaviour |
| py360convert / numpy / pillow in the venv | Present (1.0.4 / 1.26.4 / 12.3.0). The blocked screenshot predates the install. | `pip show` |

### 2.1 Native SfM proof run on all 815 panoramas (stock COLMAP, masks on) — COMPLETE

Settings: `EQUIRECTANGULAR`, single camera, `mask_path` (the reference's own RTMDet masks renamed to COLMAP's `<name>.jpg.png`), `max_image_size 4096`, default 8,192 SIFT features, mapper defaults. Recipe: `docs/ops/splat-lab-parity/native-sfm-recipe.sh`.

Result (2026-09-12, RTX 3090, panoramas read from `/mnt/c`):

| Step | Measured |
|---|---|
| Feature extraction, 815 panos, masks applied, 4096 px | **471 s** (reference: 2475 s at 7680 px) |
| Sequential + FAISS vocab-tree loop detection | **197 s** (legacy tree crashed, see §0; FAISS tree fixed it) |
| Exhaustive matching, same 815 panos, same features (comparison) | 2,900 s — 14.7x slower than sequential |
| Mapper (retriangulation + global BA) | **2,585 s (43.1 min)** — the reference reports 752 s for the equivalent phase |
| **Registered** | **815 / 815 (100%)** |
| **Points** | **420,993** (reference: 416,273 — denser) |
| **Mean reprojection error** | **1.258 px** |

Native equirectangular SfM registers every panorama with more points than the reference's own run on this same kitchen. Total wall time (features+matching+mapping) ≈ 54 min, over the plan's ≤30-min target — mapping (COLMAP's CPU Ceres bundle adjustment) is now the bottleneck, not matching. Worth checking whether this COLMAP build exposes a GPU bundle-adjustment path before accepting 43 minutes as the ceiling (not done this session).

---

## 3. Target UI — card by card (reference layout, Slate360 skin)

Single column, max 1120 px, 16 px gaps, cards `rounded-xl border border-white/10 bg-white/[0.04] backdrop-blur p-4`, mono uppercase 10 px card labels, accent `var(--twin360-blue)` on interactive states only, page `var(--graphite-canvas)`. No capture essay on the home screen (it moves to a `?` help sheet). No wall of knobs: every option lives behind a gear on its stage card.

### 3.1 Title bar
Slate360 logo (`Slate360Logo variant="dark"`), product name ("Slate360 Splat" / "Slate360 Splat Lab"), version from `package.json`; right: GPU chip ("RTX 3090 · 24 GB"), **doctor dot** (green when §4.7 passed, red with a tooltip listing what failed), Settings gear.

### 3.2 Workspace card
Name, folder (default `C:\Users\Brian PC\Slate360Jobs\<name>`), Open folder, Recent (last 10, from `tmp/splat-lab/workspaces.json`). Creating one makes `<folder>/{input,extracted,sfm,views,splats,exports}`.

### 3.3 Input card
Path box + **Browse…** opening `PathBrowser` (calls `GET /api/splat-lab/fs/list?path=` which returns folders + video/image files; localhost-only, refuses anything outside fixed roots `C:\Users\Brian PC\{Desktop,Documents,Slate360Jobs,Videos}`), plus drag-drop of files (names only, used to pre-fill the box when the folder is already chosen). Shows detection: "360 video · 7680×3840 · 2 files · 3 m 24 s" via `ffprobe` in WSL. Gear = Prepare Images options: Spherical mode **Native / Rig**, fps 2/3/4/5, Image size Auto/4K/6K/8K, Max duration, Mask people (default on).

### 3.4 Run All row
**Run All**, **Cancel** (enabled while running), status text Idle / Preparing / Reconstructing / Building views / Training / Exporting / Done. Run All skips stages whose outputs exist and whose settings fingerprint is unchanged (`lib/splat-lab/fingerprint.ts`).

### 3.5 Prepare Images card
Status dot · "1 · Prepare Images" · "814 frames @ 4 fps · people in 526" · elapsed · **Rerun** · gear. Strip of 8 frame thumbnails with the mask tinted at 30 %.

### 3.6 Reconstruction card
Sub-rows with status, detail, elapsed: **Feature Extraction** ("815 panos · native spherical · 8k features"), **Feature Matching** ("sequential 4 + loop closure · N pairs"), **Sparse Model** ("815 / 815 registered · 416,273 points · 0.9 px"). Buttons: **View SfM** (existing `SfmViewer`, full width; cameras = panorama centres), **Rerun**, gear (mode Native/Rig, max features 8k/16k/32k, overlap, loop closure on/off). Chips: registered %, points, mean reprojection error, total time.

### 3.7 Splat Generation card
Steps segmented **Test / Medium / High / Auto** with the resolved number ("Auto · 326,000 steps"). Gear: **Image size 768 / 1024 / 1280 / 1920 / Max** with a live **RAM estimate** (`views × W² × 3 B`) and a red note when it exceeds 100 GB, SH 0–3, Splat limit Auto (`views × 500`, shown) / number with "enforced only with the Lab trainer" note, Outputs PLY / SPZ / SOG, Strategy Default / MCMC (Lab), Bilateral grid, GPU. Live row: **Iteration 12,340 / 326,000 · Splats 1.84 M · 22.5 it/s · ETA 3 h 51 m · Elapsed 9 m**, progress bar, **Cancel**, **Live View** (nerfstudio viewer iframe, opened on demand only), **Export**. Completed: path, size, splat count, Open in viewer.

### 3.8 View / Publish card
`SplatViewerCore` at 16:9, full-screen; **Export** (PLY/SPZ/SOG → `exports/`); **Compare** (load a second model, A/B toggle, same camera); **Publish to Slate360** (existing `PublishToPortal`, labelled "requires sign-in").

### 3.9 Settings modal
Engine paths, GPU, default workspace root, default fps, **Run doctor** (each dependency with version + dot).

### 3.10 Job history rail
Collapsible list of workspaces with status/date/splats; click loads.

### 3.11 Lab differences
Same screen plus a **Lab sources** card (Phone LiDAR, RTK priors) **only when those code paths do something**; until then hide them (Cursor's point, accepted). Lab-only gear options: Strategy MCMC, sharpest-frame pick, 12-view legacy SfM.

### 3.12 File plan (each < 300 lines)
```
components/splat-lab/
  SplatLabPanel.tsx      shell: state, polling, Run All, card order (rewrite; keep name)
  TitleBar.tsx           WorkspaceCard.tsx   InputCard.tsx   PathBrowser.tsx
  StageCard.tsx          PrepareImagesCard.tsx (+FrameStrip.tsx)
  ReconstructionCard.tsx SplatGenerationCard.tsx (+SplatOptions.tsx, LiveRow.tsx)
  ViewPublishCard.tsx    SettingsModal.tsx   JobHistoryRail.tsx   HelpSheet.tsx
  keep: SfmViewer.tsx, LiveViewHud.tsx, PublishToPortal.tsx, HelpTooltip.tsx
  delete: SplatLabKnobs.tsx (its HELP strings move into the gears), CaptureGuide.tsx → HelpSheet
lib/splat-lab/
  keep + extend: clones.ts, job-types.ts, job-store.ts, job-runner.ts, wsl.ts, publish-export.ts
  new: steps.ts (auto formulas, unit-tested), fingerprint.ts, fs-roots.ts (allowed roots), doctor.ts
app/api/splat-lab/
  new: fs/list/route.ts (localhost-only), doctor/route.ts, jobs/[id]/rerun/route.ts (body {fromStage})
app/(dashboard)/splat-lab/page.tsx + lab/page.tsx  → render the same SplatLabPanel (gate untouched)
```

---

## 4. Target pipeline — stage by stage

Keep `pipeline.py::emit` (one JSON line per event). New stage names: `frames`, `mask`, `sfm.features`, `sfm.matching`, `sfm.mapping`, `views`, `train`, `export`, plus `doctor`. Every record has `elapsed_s`. `run.py` gains `--workspace <dir>` (replaces `--output/--job-id`) and `--from-stage <name>`.

### 4.1 frames, mask (keep; small changes)
- ffmpeg at N fps into `extracted/frames/`; write `extracted/frames.json` (timestamps). Exact 4 fps in Phases 1–3 (sharpest-of-25 is Phase 4, so the A/B against the reference uses the same frames — Cursor's point, accepted).
- RTMDet masks on the equirect; also write the COLMAP-named copy `extracted/masks-colmap/<frame>.jpg.png` (zero = ignore, dilated 24 px at 7680 wide).
- Compute `extracted/quality.json`: mean luma, deep-shadow %, Laplacian variance on 24 sampled frames. Thresholds for the banner: luma < 70, shadow > 20 %, sharpness < 150.

### 4.2 sfm — native equirectangular on panoramas (Proven default; verified §2)
```
colmap feature_extractor --database_path sfm/database.db --image_path extracted/frames \
  --ImageReader.camera_model EQUIRECTANGULAR --ImageReader.single_camera 1 \
  --ImageReader.mask_path extracted/masks-colmap \
  --FeatureExtraction.use_gpu 1 --FeatureExtraction.max_image_size 4096 --SiftExtraction.max_num_features 16384
# Matching: panoramas are few (one per 0.25 s), so exhaustive is cheap and closes every loop
# (high pass ↔ low pass) with no vocab tree. 815 panos = 332k pairs. Use it up to 1,200 panos.
colmap exhaustive_matcher --database_path sfm/database.db --ExhaustiveMatching.block_size 100 \
  --FeatureMatching.use_gpu 1 --FeatureMatching.num_threads 16
# Longer walks (> 1,200 panos): sequential + loop closure with the FAISS vocab tree (§0).
colmap sequential_matcher --database_path sfm/database.db \
  --SequentialMatching.overlap 4 --SequentialMatching.quadratic_overlap 0 \
  --SequentialMatching.loop_detection 1 --SequentialMatching.loop_detection_period 10 \
  --SequentialMatching.loop_detection_num_images 30 \
  --SequentialMatching.vocab_tree_path /home/rian_/slate360-engines/colmap-4.1.0/vocab_tree_faiss_flickr100K_words32K.bin \
  --FeatureMatching.use_gpu 1
colmap mapper --database_path sfm/database.db --image_path extracted/frames --output_path sfm/sparse --Mapper.num_threads 16
colmap model_analyzer --path sfm/sparse/0      # → registered, points, mean reprojection error
```
Never run exhaustive on split faces (that is the 9,768-image / 47 M-pair mistake); exhaustive is only ever on panoramas.
- Emit the three sub-stages with elapsed times. Write `sfm/stats.json` `{registered, total, points, mean_reproj_px, elapsed:{features,matching,mapping}}`, `sfm/points.ply` (`colmap model_converter --output_type PLY`), and `sfm/preview.json` (existing `sfm_preview.py`; cameras = the 815 pano poses).
- **Rig mode** (gear option, Lab first): 6 cube faces per pano at 1536 px, PINHOLE `f = W/2`, `rig_configurator` JSON with zero baseline and fixed rotations, same matcher. Only needed if Native under-registers on some capture. Not needed for the kitchen.
- Retire `ns-process-data` and `_split_cube_faces` for 360 input. Keep `ns-process-data images` for flat stills/drone folders.
- Budget for the kitchen: matching ≤ 15 min, whole SfM ≤ 30 min, ≥ 805/815 registered, ≥ 300 k points (§2.1 gives the measured numbers).

### 4.3 views — the training set (new; mirrors the reference's `splat-training-views`)
- For each registered pano render **16 canonical 90° pinhole views**: yaw 0,45,…,315 at pitch 0 (8), yaw 0,90,180,270 at pitch +45 (4) and −45 (4). Use `py360convert.e2p(equi, fov_deg=90, u_deg=yaw, v_deg=pitch, out_hw=(W,W))`; same call on the mask → 1-channel PNG.
- Pose: `c2w_view = c2w_pano @ R_view` where `R_view` is the rotation of the view frame relative to the pano frame in e2p's convention. **Prove it once**: `tests/test_views_reprojection.py` projects `sfm/points.ply` into one generated view and requires ≥ 60 % of projections to fall on an image edge (Canny) within 3 px; the stage fails if the test fails. This is the only place a sign error can hide.
- COLMAP's EQUIRECTANGULAR model: read `images.bin` (`qvec, tvec` world→cam) exactly as for any camera; the pano frame's +Z is the image centre column, +X right, +Y down (COLMAP convention). Write nerfstudio `transforms.json` with the OpenGL flip nerfstudio expects (`c2w[:, 1:3] *= -1`), `camera_model: "OPENCV"`, `fl_x = fl_y = W/2`, `cx = cy = W/2`, `w = h = W`, per frame `file_path`, `mask_path`, `transform_matrix`, and top-level `ply_file_path: "../sfm/points.ply"`.
- **Image size** option → `W`: 768 / 1024 / 1280 / 1920 / Max (Max = pano width ÷ 4). **Proven default 1280** for 16 views (64 GB RAM cache; the reference's own view layout is max 1280). 1920 is allowed only when `views × W² × 3 B < 100 GB` (i.e. ≤ 9,000 views) or with the Lab trainer once it streams from disk; the gear shows the estimate and blocks otherwise.

### 4.4 train
- **Auto steps** = `views × 50 ÷ images_per_step`, floor 25,000 (kitchen: 326,000). Test 5,000 / Medium 30,000 / High 100,000. **Auto cap** = `views × 500`, GPU-limited (kitchen: 6,520,000). Both in `lib/splat-lab/steps.ts` with unit tests; the UI shows the resolved values before Run.
- Proven (nerfstudio 1.1.5):
  ```
  ns-train splatfacto --data views/ --output-dir splats/N/train --max-num-iterations <steps> \
    --pipeline.model.sh-degree <sh> --pipeline.model.sh-degree-interval <steps/30> \
    --pipeline.model.cull-alpha-thresh 0.005 --pipeline.model.stop-split-at <0.6*steps> \
    --pipeline.model.use-bilateral-grid <opt> --pipeline.datamanager.cache-images cpu \
    --pipeline.datamanager.masks-on-gpu True --logging.local-writer.enable True --logging.steps-per-log 50 \
    --vis viewer+tensorboard --viewer.quit-on-train-completion True --viewer.websocket-port 7007
  ```
  Splat cap is **not enforced** here; the UI says so. Expected wall time at 1280/326k on the 3090: longer than the reference's 4 h (*assumption*: 6–9 h); the ETA in the live row is the truth, not a promise.
- Lab (Phase 4): gsplat `simple_trainer.py mcmc --strategy.cap-max <cap> --sh-degree 3` on a COLMAP-layout copy of `views/` (`images/` + `sparse/0` with 13,040 PINHOLE cameras written by the views stage), plus a ≈ 20-line alpha-mask multiply in its loss. Promote to Proven only after §7.6 on a **bright** recapture.
- **Telemetry** (fix now): parse local-writer lines `^\s*(\d+)\s+\((\d+\.\d+)%\)` for step/percent and the `ETA` column for remaining; read `gaussian_count` every 10 s from `splats/N/train/**/events.out.tfevents*` with `tensorboard.backend.event_processing.event_accumulator.EventAccumulator`. Emit at most one train record per 2 s. Acceptance: HUD moves within 60 s.
- Low-quality banner (from `extracted/quality.json`) before training: "This capture is dim/soft (luma 59, 23 % shadow). Expect a soft model. Re-shoot with lights on." Never silently degrade.

### 4.5 export
`ns-export gaussian-splat` → `splats/N/model.ply`; splat-transform → `.spz` (+ `.sog` if selected); write `splats/N/slate360-splat.json` with `iterations, splatCount, inputPointCount, stepResolution, splatCapResolution, settings, quality` so the two products compare line by line.

### 4.6 cancel (fix now)
```ts
// lib/splat-lab/job-store.ts
execFileSync("wsl.exe", ["-d","Ubuntu-22.04","--","bash","-lc",
  `pkill -TERM -f -- "--job-id ${id}( |$)"; sleep 1; pkill -KILL -f -- "splat-lab/${id}/"; true`]);
```
Job ids are 8 hex chars, so the pattern cannot hit another job. Then SIGTERM the `wsl.exe` child and mark cancelled. Verify `ps -eo args | grep <id>` is empty within 5 s.

### 4.7 doctor (new; runs at app start and from Settings)
Checks with version + path: ffmpeg/ffprobe, venv python, `import py360convert, numpy, PIL, onnxruntime, gsplat, nerfstudio, tensorboard`, `colmap --version`, `EQUIRECTANGULAR` in `colmap feature_extractor -h`, vocab tree file, `torch.cuda.is_available()`, free disk on the workspace drive, port 7007 free. Writes `tmp/splat-lab/doctor.json`; title-bar dot reads it. This is what turns "blocked mid-run: package missing" into a red dot before Run.

### 4.8 desktop launchers (done today; Sonnet keeps them working)
`scripts/splat-lab/Slate360Launcher.cs` + `build-launchers.ps1` compile two `.exe` files with the hex-S icon and copy them to the Desktop; `launch.ps1` does the real work (port check, `npm run dev` if needed, Edge `--app=http://localhost:3000/splat-lab-desktop[/lab]`). Add `scripts/splat-lab/bin/` to `.gitignore`. Improve: the launcher should show a small "Starting Slate360 Splat…" window while the dev server compiles (today it is silent for up to a minute on a cold machine), and `launch.ps1` should pass `-Clone lab` through unchanged.

---

## 5. Quality-parity matrix (Brian's worry: "differences that make ours worse")

| Dimension | Reference | Slate360 today | Slate360 after this plan |
|---|---|---|---|
| SfM camera | native equirect, 1 pose/pano | 12 independent pinholes/pano, exhaustive | native equirect, 1 pose/pano (§4.2) — **same** |
| Matching | sequential 4 + loop closure | exhaustive (days) | sequential 4 + loop closure — **same** |
| Masks in SfM | yes | yes (burned into images) | yes via `mask_path` — **same** |
| Training views | 16 × 90° at ≤ 1280 | 12 SfM faces | 16 × 90° derived from pano pose — **same** |
| Training resolution | 1024 (their kitchen run) | 1920 nominal | 1280 default, 1920 where RAM allows — **≥ theirs** |
| Init | 416k SfM points | SfM points | SfM points via `ply_file_path` — **same** |
| Masks in training | alpha | none | `mask_path` per view — **same** |
| Densification | MCMC, cap views×500 | default, no cap | Proven: default (no cap, stated); Lab: MCMC with cap — **gap until Phase 4** |
| Steps | views×50/2 | fixed presets | same formula — **same** |
| SH | 3 | 3 | 3 — same |
| Exposure handling | black-point boost | none | bilateral grid option (better founded) |
| Telemetry | live | dead | live — same |
| Output | PLY + RAD LOD | PLY/SPZ | PLY/SPZ/SOG; LOD later |
| Wall time | ≈ 5 h | never finished | SfM ≤ 30 min; train 6–9 h at 1280/326k (*assumption*) |

Only one row stays open (MCMC + cap), and that row is not why the kitchen is soft.

---

## 6. Build order

**Phase 0 — hygiene (30 min).** `nvidia-smi` idle; delete `tmp/splat-lab/kitchen-proven/sfm/colmap/colmap/database.db`; keep images/masks/faces; `.gitignore` `scripts/splat-lab/bin/`.

**Phase 1 — stop the bleeding (½ day).** 1 cancel (§4.6). 2 telemetry (§4.4). 3 doctor + dot (§4.7). 4 commit frames/mask reuse. 5 fetch the FAISS vocab tree into `/home/rian_/slate360-engines/colmap-4.1.0/` and make the doctor check it. 6 remove the hard-coded exhaustive matching on faces: until §4.2 lands, the face flow uses `sequential_matcher --SequentialMatching.overlap 48` (12 faces × 4 panos) with no loop detection, so nothing can run for days again.

**Phase 2 — pipeline parity (2–3 days).** Native equirect SfM with sub-stages; `views` stage + reprojection test; auto formulas; Image size enum with RAM estimate; workspace folders; `--from-stage`; `slate360-splat.json`; quality banner. Run the kitchen end to end at Medium steps to prove the chain, then Auto.

**Phase 3 — UI parity (2–3 days).** All cards (§3) on `/splat-lab-desktop`, `/splat-lab-desktop/lab`, and the hosted `/splat-lab` pages. Delete the knob wall. Screenshot acceptance (§7.1).

**Phase 4 — trainer research (Lab).** MCMC + cap via gsplat; bilateral grid A/B; sharpest-of-25 frames; disk-streaming datamanager for 1920 × 16 views. Promote only on a §7.6 win on a bright recapture.

---

## 7. Acceptance — nothing is "done" without these

1. **Screenshots side by side.** For every reference screenshot Brian supplied (Prepare Images popover, SfM options, SfM viewer, Splat options, training progress, completed job, home) produce the Slate360 equivalent at the same window size → `docs/ops/splat-lab-parity/<name>-{reference,slate360}.png`. Same cards, same controls, same numbers.
2. **Kitchen SfM** on `C:\Users\Brian PC\Desktop\9.10 kitchen high and low pass`: ≥ 805/815 registered, ≥ 300 k points, matching ≤ 15 min, total ≤ 30 min; numbers in `sfm/stats.json`.
3. **Views**: 13,040 images + 13,040 masks, reprojection test passes.
4. **Telemetry** moves within 60 s; **Cancel** clears WSL within 5 s (`ps`).
5. **Formulas**: 13,040 views → "326,000 steps" and "6,520,000 splats" shown before Run (unit test).
6. **A/B in one viewer**: reference `model.ply` packed to SPZ (1.54 GB → ≈ 250 MB; never load the raw PLY in the browser) vs the Slate360 model; four matched screenshots each (on-path, off-path, ceiling, plan). The only allowed quality claim.
7. Guards: scoped typecheck, `guard:design`, `guard:architecture`, `guard:file-size-regression`.
8. **Cold double-click**: with no dev server running, `Slate360 Splat.exe` opens the UI within 90 s with a green doctor dot; `Slate360 Splat Lab.exe` opens `/lab`.

---

## 8. Capture with the equipment Brian already owns (no purchases)

Kit: Insta360 X4, iPhone Pro (LiDAR), Mavic 3 Enterprise RTK; possibly a DJI Avata 360. None of the priced upgrades (X6, Luna, handheld SLAM LiDAR, Livox DIY) are required for a sellable kitchen; X6 only helps dark interiors, and the plan's first rule is to not shoot dark interiors.

- **Light the room**: every lamp, blinds open, daytime. Target mean luma ≥ 100/255, < 5 % deep shadow (the app's banner tells him if not).
- **X4**: 360 video, Standard colour (no I-Log), **8K30 when bright; 5.7K60 or interval stills if still dim** (Grok's "never 5.7K60" rejected for dark rooms), AE + WB locked on a mid-tone, shutter ≈ 1/250 if light allows, FlowState / horizon lock / tilt recovery **off** on export (Grok's "FlowState on" rejected), equirect, max bitrate, keep `.insv`.
- Pole above head, operator under the camera, Mask people on.
- 0.3–0.7 m/s, no pivots, high + low pass (already right), close the loop, 0.7–1 m from surfaces, a third slow pass over fine detail.
- Both lenses wiped before every walk.
- Process: Image size 1280–1920, SH 3, Auto steps, cap Auto; never a "safe / low-quality" preset.
- iPhone LiDAR = a scale bar (a 0.915 m door), not appearance. Drone RTK = the outdoor coordinate frame. Do not mix phone + drone + 360 in one first job; sub-scenes then merge is a later product (Grok, accepted for later).
- Fastest test on the footage already captured: retrain the reference's kitchen SfM at Image size 1920 / Max with the low-quality preset off (≈ 6–8 h). Recommended, Brian's call.

---

## 9. Review of the supplied drafts (what changed and why)

**Accepted from the Cursor drafts:** no third-party brand name in UI/code/commits; reuse the new panel on the hosted `/splat-lab` pages (gate untouched); `.exe` launchers instead of a registry icon change; defer sharpest-of-25 so the A/B uses identical frames; hide Lab LiDAR/RTK toggles until wired; job-scoped `pkill`; localhost-only filesystem API; stated ETA honesty for splatfacto vs the Vulkan trainer; "Proven SfM must not stay 12-view".

**Corrected in the Cursor drafts:** (1) "Native equirect is Lab-only / we don't have their COLMAP fork" — **wrong**: stock COLMAP 4.1.0 on this machine supports `EQUIRECTANGULAR` end to end (§2), so Native is the Proven default and the rig path is the fallback, not the other way round. (2) "`<input webkitdirectory>` folder picker" — cannot yield a path; use `fs/list`. (3) "Kill the orphan first" — already dead after the reboot; the database is the only leftover. (4) "SfM ~12.5 min" for the reference — their manifests say features 2475 s + matching 434 s + mapping 752 s ≈ 61 min plus extraction. (5) "Proven train default 1920" — impossible with 16 views on nerfstudio's in-RAM cache (144 GB); default is 1280 with 1920 gated by the RAM estimate. (6) Sub-stage checkboxes "UI only until runner supports skip" — `--from-stage` makes them real in Phase 2; don't ship fake controls.

**Accepted from the Grok equipment thread:** stay on the X4; quality is capture + overlap + locked exposure; 1024 is preview quality, finals at 1280–2048; iPhone LiDAR is scale, not beauty; COLMAP import is the door for GPS/LiDAR later; sub-scene merges for whole sites later.

**Rejected from Grok:** FlowState on; never 5.7K60; 30–50k steps as "final" (the reference used 326k on this kitchen; use the formula); "5 min 360 ≈ 2 h" (this kitchen took ≈ 5 h at 1024); any purchase as a prerequisite.
