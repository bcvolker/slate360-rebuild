# Slate360 Splat — AirVis parity build plan (for Sonnet 5)

Written 2026-09-12 by Claude Fable 5.1 after reading AirVis Studio 1.11's own job output for the
kitchen (`C:\Users\Brian PC\Documents\AirVis\kitchen_AirVisStudio`), Brian's screenshots of the
AirVis UI, and the current Splat Lab code on branch `feature/splat-lab`. Everything in this file is
a fact taken from a file on disk or a screenshot, unless marked *assumption*.

The goal is one desktop program, "Slate360 Splat", that a non-coder can double-click and use
exactly like AirVis Studio: same cards, same buttons, same options, same live numbers, same
outputs. Only colours, fonts, naming and the Slate360 logo differ. "Slate360 Splat Lab" is the
same program with experimental knobs (LiDAR, RTK, alternative trainers) turned on.

---

## 0. Rules for whoever builds this (read before touching anything)

- Work only on branch `feature/splat-lab` in `C:\s360`. Never rebase, merge or force-push `main`.
- Stage explicit paths. Never `git add .`. Never commit `.env.local`, `tmp/`, `workers/local/splat-lab/models/*.onnx`, or any video/frames.
- Do not edit: entitlements, billing, Stripe, middleware, existing migrations, anything under `app/(dashboard)/splat-lab` (the CEO-gated hosted route stays as it is).
- Every new `.ts`/`.tsx` file must be under 300 lines (guard:file-size-regression). Split components instead of growing them.
- Colours are tokens only: `var(--graphite-canvas)`, `var(--graphite-primary)`, `var(--twin360-blue)`, `var(--graphite-muted)`, `var(--graphite-text-header)`, `var(--graphite-text-body)`. No hex, no amber, no glow, no `rounded-full` (guard:design).
- The desktop route is `app/splat-lab-desktop/**`. It has **no login** on purpose; the only gate is the localhost Host check in `app/splat-lab-desktop/layout.tsx`. Keep it that way.
- Typecheck with a scoped tsconfig (bare `tsc` OOM-crashes). Example: a temp `tsconfig.splatlab.json` extending `./tsconfig.json` with `include: ["app/splat-lab-desktop/**/*", "app/api/splat-lab/**/*", "components/splat-lab/**/*", "lib/splat-lab/**/*"]` and `incremental: false`.
- Python for the pipeline runs inside WSL Ubuntu-22.04 with `/home/rian_/slate360-engines/nerfstudio/.venv/bin/python`. COLMAP 4.1.0 CUDA is at `/home/rian_/slate360-engines/colmap-4.1.0/bin`. Never pass `$VAR` inside an inline `wsl -lc '...'` string (paths get mangled); write a `.sh` file and run it.
- Two uncommitted working-tree edits already exist (`workers/local/splat-lab/stages/frames.py`, `stages/mask.py`: "reuse existing frames/masks if present"). They are correct and wanted; keep them and commit them with Phase 2.
- There is a live job on disk at `tmp/splat-lab/kitchen-proven` (see §2.4). Do not delete its `images/`, `masks/` or `sfm/faces/` folders; they are reusable inputs.

---

## 1. Ground truth: what AirVis actually did on the kitchen

Source files: `airvisstudio-workspace.json`, `splats/0/airvisstudio-splat.json`, `splats/splat-trainer.log`
("Resolved trainer configuration"), `Extracted/splat-training-views/airvisstudio-splat-training-views.json`,
`SFM/splat-cube-faces/airvisstudio-splat-cube-faces.json`.

| Item | AirVis value | Where it came from |
|---|---|---|
| Input | `highpass.mp4` + `lowpass.mp4` (X4, stitched 7680×3840 equirect) | workspace.json `inputPaths` |
| Frame rate | 4 fps → **815 panoramas** | `sphericalFramesPerSecond`, cube-faces json |
| Sharpest-frame pick | 25 candidates per bucket | `sharpnessCandidateCount` |
| Prepared pano resolution | 7680×3840 kept for SfM (`sfm-panoramas-7680/`) | Extracted folder names |
| People mask | RTMDet instance seg, used in SfM **and** training (`maskInSfM: true`, `alpha.masked=13040`) | workspace.json, trainer log |
| SfM camera model | **native EQUIRECTANGULAR**, one pose per pano, panorama loop closure | `sphericalSfmMode: nativeEquirectangular` |
| SfM matching | sequential, overlap 4, vocab-tree retrieval, **not exhaustive** | `sphericalSequentialMatchingOverlap: 4`, `useExhaustiveMatching: false` |
| SfM result | 815/815 registered, **416,273 points** | splat json `inputPointCount`, screenshot |
| SfM timings | extraction 1210 s, features 2475 s, matching **434 s**, mapping 752 s | manifests (previous session) |
| Training views | **16 virtual pinhole views per pano**, 90° FOV, max 1280 px each → **13,040 views** | training-views json `layout: canonical16-fov90-max1280-v1` |
| Trainer | VkSplat fork (Vulkan), **MCMC** strategy, preset `safe` | trainer log |
| Training image size | **`image.max_resolution=1024`** (UI "Image Size 1024"; options 768 / 1024 / 1920 / Max) | trainer log, screenshot |
| Steps | **326,000** = views 13,040 × 50 ÷ imagesPerStep 2, floor 25,000 | splat json `stepResolution` |
| Splat cap | **6,520,000** = views × 500 ("SceneTarget"); GPU-safe limit 17.4 M | splat json `splatCapResolution` |
| Final splat count | 6,519,997 (at cap) | splat json |
| SH | degree 3, interval 10,866 | trainer log |
| Losses | L1 + SSIM 0.2, background 0.5 grey + noise 0.5, opacity reg 0.01, scale reg 0.01 | trainer log |
| MCMC schedule | refine 5,433 → 271,666 every 1,086; growth 1.05; min opacity 0.005; noise 80→0.8 | trainer log |
| Bilateral grid | **off** | trainer log |
| Black point boost | on | splat json |
| **Low-quality capture preset** | **`lowQualityCapture: true`** → trainer `--low-quality` "fixed 0.2" scene-scale preset | splat json `settings.lowQualityCapture`, CLI help in AirVis-EVERYTHING.md |
| Runtime | ≈5 h total, ≈4 h training, RTX 3090 | manifests, screenshot |
| Output | `model.ply` (standard 3DGS PLY, 1.54 GB) + `model.rad` (LOD); SPZ/SOG optional; collision "none" | splat json |

**The single most important line above is `lowQualityCapture: true`.** AirVis's own quality
classifier flagged Brian's kitchen footage as low quality before training and switched to a
degraded preset. Measured on the 815 panoramas AirVis trained on (`exposure-stats.py`, previous
session): mean luma **59.5 / 255**, **23.4 %** of pixels in deep shadow (< 30), Laplacian
sharpness variance ≈ 100 at 1920 px wide. The room was shot at night under warm ceiling lights
(see `Extracted/sfm-panoramas-7680/v01-highpass-f000200.jpg`). No trainer setting recovers detail
that the sensor never recorded.

---

## 2. Diagnosis: what is wrong today

### 2.1 Desktop shortcuts and icon (already fixed, one item left for Brian)

- Desktop now has exactly two shortcuts: `Slate360 Splat.lnk` → `wscript.exe launch-proven.vbs` and `Slate360 Splat Lab.lnk` → `wscript.exe launch-lab.vbs`. The stale `Slate360 Splat Lab (Lab).lnk` was deleted 2026-09-12.
- Both point at `C:\s360\scripts\splat-lab\slate360-splat-lab.ico` (16/32/48/256 px frames). The 256 px frame is the hexagonal teal Slate360 "S" on canvas; verified by decoding the ICO.
- The "additional thing on the icon" is **Windows' shortcut-arrow overlay** (the `Shell Icons\29` registry value is absent, so the default arrow is drawn on every `.lnk`). Options, both Brian's call because they change system settings: (a) pin the two shortcuts to the taskbar or Start (no arrow there), or (b) set `HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Shell Icons` value `29` to a blank icon and restart Explorer. Claude must not change (b) without an explicit yes.
- Icon cache was refreshed (`ie4uinit -show`). If the desktop still shows an old picture, sign out / in once.

### 2.2 Pipeline blocker Brian screenshotted ("SfM blocked · py360convert / numpy / pillow not installed")

- Root cause: the 360 split deps were not in the nerfstudio venv when the job ran. They were installed at 00:58 on 2026-09-12 (`py360convert 1.0.4`, `numpy 1.26.4`, `pillow 12.3.0`) and verified importable. **Fixed.**
- Add a startup self-check so this can never show as a mid-run block again (Phase 2, `doctor` stage).

### 2.3 The pipeline design does not match AirVis and cannot finish in reasonable time

1. **Exhaustive matching over 9,768 face images.** `stages/sfm.py::_run_colmap` hard-codes `--matching-method exhaustive`. With HQ mode the kitchen becomes 814 panos × 12 views = **9,768 images → 47.7 million pairs**. As of 11:07 on 2026-09-12 that matcher (`colmap exhaustive_matcher`, WSL pid 956) had run 67 min and written a 3.8 GB `database.db` with no end in sight. AirVis matched the same walk in 434 s. This must become sequential matching with loop detection (§4.2).
2. **SfM runs on all training views instead of on panoramas.** AirVis registers 815 panoramas once and *derives* the 16 training views from each pano pose. Splat Lab registers every synthetic view independently (no shared-centre constraint), which is slower, drifts more, and makes the "816 cameras" number meaningless in the SfM viewer.
3. **Wrong camera model for synthetic views.** ns-process-data uses OPENCV (distortion) for faces that are perfectly pinhole. Use PINHOLE with the known focal length (`f = W/2` for 90° FOV) and shared intrinsics.
4. **No 16-view training set, no per-view masks in training.** Training uses the 12 SfM faces at `camera-res-scale-factor`. AirVis trains on 16 canonical views with the RTMDet mask applied as alpha (`alpha.masked=13040`). nerfstudio's dataparser supports `mask_path` per frame in `transforms.json` (checked: `nerfstudio_dataparser.py:171`), so masks can be used today.
5. **Training options don't exist as AirVis exposes them.** AirVis: Image Size 768 / 1024 / 1920 / Max, Steps Test / Medium / High / Auto (auto = views×50/imagesPerStep, floor 25k), Splat limit Auto (views×500, GPU-capped) or number, SH 0–3, Outputs PLY / SPZ / SOG, Collision none/…, GPU auto, RAM estimate. Splat Lab has `resolutionLimit` (a number), `quality` (fixed 5k/30k/100k/300k), `maxSplatsMillions` (not enforced: nerfstudio 1.1.5 splatfacto has no splat cap flag), `preset` (four names that map to nothing).
6. **MCMC is not available in the installed trainer.** nerfstudio 1.1.5 splatfacto exposes no `strategy`/`max-gs-num` flag (checked `ns-train splatfacto --help`). gsplat 1.5.3 *is* installed and ships `strategy.MCMCStrategy`, and `/home/rian_/slate360-engines/gsplat/examples/simple_trainer.py` supports `mcmc --strategy.cap-max N`. Phase 3 chooses one.
7. **Live telemetry never updates.** `stages/train.py::STEP_RE` expects tqdm-style `N / M … it/s`; ns-train prints a local-writer table instead. `GAUSS_RE` looks for "num gaussians" which ns-train never prints. So Iter / Splats / it/s / ETA stay "—".
8. **Cancel does not stop the job.** `lib/splat-lab/job-store.ts::cancelJob` sends SIGTERM to `wsl.exe` only; the Linux `run.py` → `ns-process-data` → `colmap` chain keeps running (this is why the matcher above is still alive after the UI was closed). Cancel must `pkill` inside WSL by job id.
9. **No per-stage rerun, no stage sub-steps, no timings per sub-step.** AirVis shows Feature Extraction / Feature Matching / Sparse Model as separate rows, each with elapsed time and a Rerun button, and "Run All" at the top.
10. **No workspace concept.** AirVis has a named workspace folder per capture (`kitchen_AirVisStudio/`) holding inputs, Extracted/, SFM/, splats/N/. Splat Lab has anonymous 8-character job ids under `tmp/splat-lab/`.

### 2.4 State of the machine right now

- WSL processes alive (started ≈08:30): `run.py --job-id kitchen-proven` (pid 436), `ns-process-data` (634), `colmap exhaustive_matcher` (955/956). **Cancel these before any new run** with the command in §4.7 (the UI Cancel button will not do it until item 8 is fixed).
- `tmp/splat-lab/kitchen-proven/` already has 814 frames, 814 RTMDet masks (people found in 526), 9,768 split faces, and a 3.8 GB COLMAP database with features extracted. The frames, masks and faces are reusable; the database should be rebuilt with the new matcher.
- GPU idle apart from the matcher (802 MiB used).

### 2.5 UI mismatch (Brian: "a weird bizarre interpretation")

Current `SplatLabPanel` = header + one Input card with a path box + "Run" + a Capture Guide list + a
grid of raw knobs + a two-column Pipeline / Preview area. AirVis (from Brian's screenshots) is a
top-to-bottom **job board**: Workspace → Input → Run All → Prepare Images → Reconstruction → Splat
Generation → View / Publish, with each stage a card that has its own status, elapsed time, options
popover and action buttons. The knobs are hidden behind gear icons per stage, never shown as a wall.
§3 specifies the replacement screen by screen.

---

## 3. Target UI — card by card (match AirVis, Slate360 skin)

Layout: single column, max width 1120 px, 16 px gaps, cards `rounded-xl border border-white/10
bg-white/[0.04] backdrop-blur p-4`. Mono uppercase 10 px labels for card titles. Accent
`var(--twin360-blue)` for interactive states only. Page background `var(--graphite-canvas)`.

### 3.1 Title bar
- Left: Slate360 logo (`Slate360Logo variant="dark"`), product name "Slate360 Splat" (or "Slate360 Splat Lab"), version tag from `package.json`.
- Right: **Settings** gear (opens §3.9), GPU chip ("RTX 3090 · 24 GB"), engine health dot (green when `doctor` passed).

### 3.2 Workspace card
- Fields: Workspace name (text), Workspace folder (path, default `C:\Users\Brian PC\Slate360Jobs\<name>`), Open folder button, Recent workspaces dropdown (last 10 from `tmp/splat-lab/workspaces.json`).
- Creating a workspace creates `<folder>/{input,extracted,sfm,splats,exports}`.

### 3.3 Input card
- Drop zone + "Browse…" (server-side directory picker is not possible from a browser; use a text path plus a `/api/splat-lab/fs/list` endpoint that lists a folder so the user can click through folders in a mini file browser).
- Accepts: one or more 360 videos (.mp4/.mov), a folder of stills, a phone capture folder (Lab only: with `depth/` + `arkit.json`).
- Shows detected kind: "360 video · 7680×3840 · 2 files · 3 min 24 s" (probe with ffprobe in WSL).
- Toggles exactly as AirVis "Prepare Images" popover: Spherical mode **Native / Rig** (see §4.2 for what each does), Frame rate 2/3/4/5, Image size Auto/4K/6K/8K, Max duration, Precompute faces, Mask people (default on).

### 3.4 Run All button row
- Primary button **Run All**; secondary **Cancel** (enabled while anything runs); status text "Idle / Preparing / Reconstructing / Training / Done".
- Run All = frames → mask → sfm.features → sfm.matching → sfm.mapping → views → train → export, skipping stages whose outputs already exist and whose settings fingerprint is unchanged (AirVis's `sfmFingerprint`/`settingsFingerprint` idea).

### 3.5 Prepare Images card
- Row: status dot · "Prepare Images" · "814 frames @ 4 fps · 526 with people" · elapsed · **Rerun** · gear.
- Thumbnail strip of 8 evenly spaced frames with the mask overlaid in accent colour at 30 % (proves masking worked; AirVis shows this in its Extracted view).

### 3.6 Reconstruction card (SfM)
- Sub-rows, each with status, detail and elapsed: **Feature Extraction** ("814 panos · 32k features max"), **Feature Matching** ("sequential overlap 4 + loop closure"), **Sparse Model** ("815 / 815 registered · 416,273 points").
- Buttons: **View SfM** (opens the existing `SfmViewer` full-width, not in the preview pane), **Rerun**, gear (SfM options: mode Native/Rig, max features 8k/16k/32k, matching overlap, loop closure on/off, high precision).
- Summary chips under the rows: registered %, points, mean reprojection error, elapsed total.

### 3.7 Splat Generation card
- Steps preset segmented control **Test / Medium / High / Auto** with the resolved number shown ("Auto · 326,000 steps") using the AirVis formula (§4.4).
- Options popover (gear): **Image size 768 / 1024 / 1920 / Max**, SH 0–3, Splat limit Auto / number (show the auto value and the GPU-safe cap), Outputs PLY / SPZ / SOG checkboxes, Collision none / mesh (Lab only), GPU auto / device, Strategy default / MCMC (Lab only until Phase 3 promotes it), Bilateral grid on/off, estimated VRAM.
- Live row while training: **Iteration 12,340 / 326,000 · Splats 1.84 M · 22.5 it/s · ETA 3 h 51 m · Elapsed 0 h 09 m**, progress bar, **Cancel**, **Live View** (iframe of nerfstudio viewer :7007), **Export** (enabled at completion).
- Completed row: output path, file size, splat count, "Open in viewer".

### 3.8 View / Publish card
- Embedded `SplatViewerCore` at 16:9, full-screen button.
- **Export** (PLY/SPZ/SOG to `<workspace>/exports/`), **Publish to portal** (existing `PublishToPortal`, still needs the hosted login: keep it but label it "Publish to Slate360 (requires sign-in)").
- Compare mode: pick a second model (e.g. AirVis `model.ply`) and toggle A/B in the same viewer. This is how "is it better than AirVis" is judged.

### 3.9 Settings modal
- Engine paths (WSL distro, python venv, COLMAP bin, ffmpeg), GPU selection, default workspace root, default fps, theme (Graphite only for now), "Run doctor" button showing each dependency with a version and a green/red dot.

### 3.10 Job history rail (right side on wide screens, collapsible)
- List of workspaces/jobs with status, date, splat count; click to load.

### 3.11 Lab differences
- Same screen plus a **Lab sources** card (Phone LiDAR, RTK/GPS priors) and the experimental options in popovers marked "Lab". Nothing else differs.

### 3.12 Component file plan (each < 300 lines)
```
components/splat-lab/
  SplatLabPanel.tsx        shell: state, polling, Run All, layout of the cards
  TitleBar.tsx             logo, version, settings, GPU chip
  WorkspaceCard.tsx
  InputCard.tsx            + PathBrowser.tsx (mini file browser)
  StageCard.tsx            generic card: title, status, elapsed, Rerun, gear slot
  PrepareImagesCard.tsx    uses StageCard + FrameStrip.tsx
  ReconstructionCard.tsx   uses StageCard ×3 sub-rows + SfmSummary
  SplatGenerationCard.tsx  steps control, options popover (SplatOptions.tsx), LiveRow.tsx
  ViewPublishCard.tsx      viewer, export, compare
  SettingsModal.tsx
  JobHistoryRail.tsx
  SfmViewer.tsx, LiveViewHud.tsx, PublishToPortal.tsx, HelpTooltip.tsx (keep)
lib/splat-lab/
  clones.ts, job-types.ts, job-store.ts, job-runner.ts, wsl.ts, publish-export.ts (keep, extend)
  steps.ts                 auto-steps + auto-cap formulas (pure functions, unit-tested)
  fingerprint.ts           settings/sfm fingerprints for skip-if-unchanged
```

---

## 4. Target pipeline — what each stage must do

All stages keep emitting one JSON line per event to stdout (`pipeline.py::emit`). Add sub-stage
names `sfm.features`, `sfm.matching`, `sfm.mapping`, and a new `views` stage. Every record carries
`elapsed_s`. Add `--from-stage <name>` to `run.py` so the UI Rerun buttons work, and a
`--workspace <dir>` argument replacing `--output/--job-id`.

### 4.1 frames (keep) + mask (keep)
- Keep ffmpeg extraction at N fps. Add AirVis's sharpest-of-25 pick: extract at 25× the target rate is too slow; instead extract at target fps ± 2 neighbours (3 candidates) and keep the highest Laplacian variance. Record the chosen timestamps in `extracted/frames.json`.
- Masks: keep RTMDet on the equirect frame. Also write the dilated mask (24 px at 7680 wide) — AirVis dilates.

### 4.2 sfm — register **panoramas**, not training views
Two modes, both through COLMAP 4.1.0 CLI directly (drop `ns-process-data` for 360; keep it for flat stills):

- **Rig** (default, proven with COLMAP): split each pano into **6 cube faces at 1536 px** (front/right/back/left/up/down, 90°, PINHOLE, `f = 768`). Feature extraction with the warped mask as `--ImageReader.mask_path` (COLMAP skips masked pixels). Register with COLMAP's **rig** support: `colmap rig_configurator` with a rig JSON declaring 6 cameras with fixed relative rotations (identity, yaw ±90°, 180°, pitch ±90°) and zero baseline, then `sequential_matcher --SequentialMatching.overlap 4 --SequentialMatching.loop_detection 1 --SequentialMatching.vocab_tree_path /home/rian_/.local/share/nerfstudio/vocab_tree.fbow` (file exists), then `mapper` with `--Mapper.ba_refine_sensor_from_rig 0`. Pairs ≈ 814 × 6 × (4 × 6 + loop candidates) ≈ 150 k, minutes not days. Faces are grouped per pano by naming `pano-%05d-<face>.jpg` so COLMAP's rig configurator can associate them (`rig_configurator --image_names` pattern; see `colmap rig_configurator --help`).
- **Native** (Lab only, experiment): COLMAP 4.1.0's camera model list should be checked for a spherical/equirect model (`colmap feature_extractor --help | grep -i camera_model`). If absent, Native is greyed out with tooltip "needs a COLMAP build with spherical cameras".
- Output: `sfm/sparse/0` (bin), `sfm/preview.json` (existing `sfm_preview.py`, but cameras must be **panorama** centres = rig frame poses, so the viewer shows 815 cameras, not 4,884), `sfm/points.ply`, and `sfm/stats.json` = `{registered, total, points, mean_reproj_px, elapsed: {features, matching, mapping}}`.
- Time budget for the kitchen: ≤ 30 min total on the 3090. Acceptance in §6.

### 4.3 views — build the training set (new stage, mirrors AirVis "splat-training-views")
- For every registered pano: render **16 canonical 90° pinhole views** (AirVis `canonical16-fov90`): 8 yaws × pitch 0 at 45° steps, 4 yaws × pitch +45°, 4 yaws × pitch −45°. Skip nothing; the mask handles the operator.
- Pose of view = pano pose composed with the view's fixed rotation. Verify once with a reprojection check: project `sfm/points.ply` into a generated view and assert ≥ 60 % of projected points land on edges within 3 px (write `tests/test_views_reprojection.py`; this is the proof the rotation convention of `py360convert.e2p(u_deg, v_deg)` was translated correctly).
- Resolution comes from the **Image size** option: 768 / 1024 / 1920 / Max (Max = pano width / 4 = 1920 for 7680 input, so "Max" and "1920" coincide for X4 8K; for 5.7K input Max = 1440).
- Write `views/transforms.json` (nerfstudio format: `camera_model: OPENCV`, `fl_x = fl_y = W/2`, `cx = cy = W/2`, per-frame `file_path`, `mask_path`, `transform_matrix`, plus `ply_file_path: "../sfm/points.ply"` so training initialises from SfM points exactly as AirVis does (`splats.initial=416273`)).
- Masks are warped from the equirect mask with the same `e2p` call and saved as 1-channel PNG (white = keep).

### 4.4 train — AirVis parity numbers
- **Auto steps** = `views × 50 / images_per_step`, floor 25,000 (AirVis: 13,040 × 50 / 2 = 326,000). Test = 5,000, Medium = 30,000, High = 100,000. Show the resolved number in the UI before starting.
- **Auto splat cap** = `views × 500` capped by GPU-safe limit (AirVis: 6,520,000; safe 17.4 M on a 24 GB card). Number option overrides.
- **Image size** applies to §4.3, not `camera-res-scale-factor`.
- **SH degree** 0–3, `sh-degree-interval = auto_steps / 30` (AirVis 10,866 for 326k).
- Trainer, Phase 2 (today's installed nerfstudio 1.1.5): `ns-train splatfacto --data views/ --max-num-iterations N --pipeline.model.sh-degree K --pipeline.model.use-bilateral-grid <opt> --pipeline.datamanager.masks-on-gpu True --logging.local-writer.enable True --logging.steps-per-log 50 --vis viewer+tensorboard --viewer.quit-on-train-completion True`. Densification: keep default strategy; set `--pipeline.model.stop-split-at` to 60 % of steps and `--pipeline.model.cull-alpha-thresh 0.005` (AirVis min opacity 0.005). The splat cap cannot be enforced in 1.1.5; report it as "not enforced" in the UI until Phase 3.
- Trainer, Phase 3 (parity): MCMC via gsplat's `simple_trainer.py mcmc --strategy.cap-max <cap> --sh-degree 3 --data-dir <colmap-style dataset>`; needs the views written in COLMAP layout too (images/ + sparse/0 with the 16-view pinhole cameras) and mask support (simple_trainer has none → add an alpha-mask multiply in its loss, ~20 lines). Promote to Proven only after the §6 A/B shows it wins.
- **Telemetry**: parse the local-writer lines (`Step (% Done)  ...  Train Iter (time)  ETA (time)`; regex on `^\s*(\d+)\s+\(([\d.]+)%\)` for step, `ETA` column for remaining), and read `gaussian_count` from the TensorBoard event file under `train/**/events.out.tfevents*` every 10 s with `tensorboard.backend.event_processing.event_accumulator.EventAccumulator` (tensorboard 2.20 is in the venv). Emit `{"stage":"train","iteration","steps","splats","it_s","eta_s","elapsed_s"}` at most once per 2 s.
- Auto-detect **low-quality capture** the way AirVis does, but tell the user instead of silently degrading: compute mean luma, deep-shadow fraction and Laplacian variance on 24 sampled frames in `frames`; if luma < 70 or shadow > 20 % or sharpness < 150, show a yellow (token `--graphite-muted`, not amber) banner "Capture is dim / soft: expect a soft model. Re-shoot with lights on and 1/250 s" and store the numbers in `extracted/quality.json`.

### 4.5 export
- Keep `ns-export gaussian-splat` → `splats/N/model.ply`; then splat-transform → `.spz` and (Outputs option) `.sog`. Write `splats/N/slate360-splat.json` with the same fields AirVis writes (`iterations`, `splatCount`, `inputPointCount`, `stepResolution`, `splatCapResolution`, settings) so the two products can be compared line by line.

### 4.6 doctor (new, runs at app start and from Settings)
- Checks, each with version and path: ffmpeg, python venv, `import py360convert, numpy, PIL, onnxruntime, gsplat, nerfstudio, tensorboard`, `colmap --version`, vocab tree file, CUDA visible (`torch.cuda.is_available()`), free disk on the workspace drive. Writes `tmp/splat-lab/doctor.json`; the title-bar dot reads it.

### 4.7 cancel (fix now, Phase 1)
- `cancelJob` must run `wsl.exe -d Ubuntu-22.04 -- bash -lc 'pkill -TERM -f "run.py .*--job-id <id>"; sleep 1; pkill -KILL -f "splat-lab/<id>/"'` and only then mark the job cancelled. Verify with `ps -eo pid,args | grep <id>` returning nothing.
- One-off cleanup of the orphaned kitchen run before starting Phase 2 (Brian or Sonnet runs it):
  ```bash
  wsl -d Ubuntu-22.04 -- bash -lc 'pkill -TERM -f "job-id kitchen-proven"; sleep 2; pkill -KILL -f "kitchen-proven/sfm"; ps -eo pid,args | grep -c "kitchen-proven"'
  ```

---

## 5. Build order (phases; commit and typecheck after each)

**Phase 1 — stop the bleeding (½ day)**
1. Fix cancel (§4.7). 2. Replace exhaustive matching with sequential + loop closure even in the current face-based flow (`--matching-method sequential` is not enough because nerfstudio doesn't expose overlap; call COLMAP directly). 3. Fix telemetry parsing (§4.4). 4. Add `doctor`. 5. Commit the two uncommitted reuse edits. 6. Kill the orphaned run.

**Phase 2 — pipeline parity (2–3 days)**
`views` stage, rig SfM, AirVis auto formulas, Image size option, `slate360-splat.json`, low-quality banner, workspace folders, `--from-stage`.

**Phase 3 — UI parity (2–3 days)**
All cards in §3 on `/splat-lab-desktop` (Proven) and `/splat-lab-desktop/lab`. Delete `SplatLabKnobs.tsx` wall-of-knobs; its HELP strings move into the popovers. Keep every file < 300 lines.

**Phase 4 — trainer parity (research, Lab first)**
MCMC via gsplat with cap; bilateral grid A/B; promote to Proven only on a §6 win.

---

## 6. Acceptance — nothing is "done" without these

1. **Screenshots side by side.** For each AirVis screenshot Brian supplied (Prepare Images popover, SFM options, SfM viewer, Splat options, training progress, completed job) produce the Slate360 Splat equivalent at the same window size and put both in `docs/ops/splat-lab-parity/<name>-{airvis,slate360}.png`. Same cards, same controls, same numbers displayed.
2. **Kitchen SfM** on `C:\Users\Brian PC\Desktop\9.10 kitchen high and low pass`: ≥ 805 / 815 panos registered, ≥ 300 k points, matching ≤ 15 min, whole SfM ≤ 30 min. Numbers into `sfm/stats.json`.
3. **Training telemetry** visibly updates Iteration / Splats / it/s / ETA within 60 s of start.
4. **Cancel** kills every WSL process for the job within 5 s (verified with `ps`).
5. **Auto formulas**: with 13,040 views the UI shows "326,000 steps" and "6,520,000 splats" before training (unit test in `lib/splat-lab/steps.test.ts`).
6. **A/B in one viewer.** Load AirVis `model.ply` (pack to SPZ with splat-transform; 1.5 GB PLY → ≈ 250 MB SPZ) and the Slate360 model into the same `SplatViewerCore`; capture four matched screenshots (on-path, off-path, ceiling, plan) for each. This is the only quality claim allowed. No PSNR-only claims.
7. Guards: scoped typecheck clean, `npm run guard:design`, `npm run guard:architecture`, `npm run guard:file-size-regression` all pass.
8. Double-click test: from a cold machine (no dev server), `Slate360 Splat.lnk` opens the UI within 90 s and shows the doctor dot green.

---

## 7. What to tell users about capture (goes in the Capture guide + the low-quality banner)

From the kitchen evidence and current 360-splat guidance (Splatware, Real Horizons, Niantic
Scaniverse 360 guide, Tommy Lahitte's best-practices), the capture-side changes that matter more
than any trainer setting:

- **Light the room.** Every lamp on, blinds open, daytime. Target mean luma ≥ 100/255 and < 5 % deep shadow. The kitchen was 59/255 and 23 %.
- **Lock exposure** (manual: 1/250–1/500 s, ISO auto capped 800, fixed WB) so brightness does not drift between frames; AirVis had to compensate with black-point boost.
- **Slow.** 0.3–0.5 m/s, no pivots; at 4 fps that gives ≈ 10 cm between panoramas.
- **Two heights, closed loops, 0.7–1 m from surfaces**, and a third pass over anything with fine detail (cabinet fronts, appliances).
- **Clean both lenses** before every walk (one smudge blurs a quarter of the sphere).
- **Highest resolution** (8K 30 fps on X4), stitched equirect export, no FlowState/horizon lock.
- Keep the operator under the camera; keep "Mask people" on.

---

## 8. Open questions for Brian (do not block on these)

- Shortcut arrow: taskbar pin, or registry change (needs his yes).
- Should AirVis be re-run on the same kitchen at Image size 1920 / Max to measure how much of its softness is the 1024 training size? (Recommended: yes, ≈ 6–8 h, gives a second ground-truth point for §6.6.)
- Native equirect SfM in COLMAP 4.1: check camera-model list first; if absent it stays Lab-only.
