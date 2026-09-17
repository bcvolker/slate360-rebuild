# Payne Hall 213 — overnight runbook (2026-09-16)

Goal by morning: a phone link the move team can walk (Gaussian splat of room 213) with MOVE / STAY
markers, plus Brooke's target layout and the sticky-note photos. Gavin's crew arrives in the morning.

Two audiences. **Part 1** is what to paste to the outside AI so its "targeted desktop prompt" starts
from facts. **Part 2** is what Cursor runs on this desktop, in order. Everything below was verified on
the machine tonight (branch `feature/splat-lab`, RTX 3090, WSL Ubuntu-22.04 at a 64 GB ceiling).

---

## Part 1 — brief for the outside AI (paste as-is)

**What went wrong on the backyard HQ run, and the fix status.** Splatfacto passes
`pause_refine_after_reset = n_images + 100` to gsplat's `DefaultStrategy`
(`nerfstudio/models/splatfacto.py:327` in the Lab venv). gsplat densifies only when
`step % 3000 >= pause`; with 7,712 views the pause is 7,812 and the test is never true, so no gaussian
ever split. Both backyard trains sat at the COLMAP seed (383,657) for every logged step. The 3.8M cap,
the 1280 px views, densify 0.0002 and 50k steps were all irrelevant because densify never ran.
**Fix is already in** `workers/local/splat-lab/ns_train_wrap.py` (`_PAUSE_CAP = 250`, wraps
`DefaultStrategy.__init__`), and `stages/train.py` launches every train through that wrapper. It has
**not yet been proven on a train**. The first thing tonight's run proves is that `gaussian_count`
rises above the SfM seed by step ~3,000.

**Decisions for tonight — do not re-open these.**
1. Start the 360 job **now**, from the Insta360 export alone. Do not wait for the phone data; it has not
   landed on the PC (no `Documents\Captures`, nothing but the 360 files in `Desktop\Payne Hall Test`).
2. Splat Lab (`/splat-lab`, "proven" clone, native EQUIRECTANGULAR SfM, 16 pinhole views per panorama)
   is the only local path that has the pause clamp. Capture Studio (Brush) is a different trainer and
   does not share the GPU tonight.
3. Recipe: fps **1.0**, image size auto (8K), views **1280**, nadir cover **40°**, remove people **on**,
   bilateral grid **on**, SH 3, features 16384, sequential+loop matching (automatic above 200 frames),
   **30,000 steps** from scratch, splat cap auto (views × 500 ≈ 3.0M). Why 1 fps: 266 s + 109 s of walk
   → ~375 panoramas → ~6,000 views → ~37 GB image cache. 2 fps would be ~12,000 views and does not fit
   under the 64 GB WSL ceiling (HQ backyard used 48 GB at 7,712 views). Why 30k: the standard splatfacto
   schedule with splitting active; 50k bought nothing last night because nothing split.
4. Gate at step 3,000: `Train Metrics Dict/gaussian_count` in TensorBoard must exceed `sfm/stats.json`
   `points`. If it does not, stop and read `ns-train.log`; do not let it run to 30k.
5. Acceptance is matched screenshots at fixed viewpoints (walk stations, dollhouse), never PSNR alone.
6. Markers are placed **by hand** from the sticky-note photos and Brooke's plan. No CV table detection.
7. Deliver on the phone the same way the backyard shipped: SPZ v3 in `public/preview/`, a `/preview/...`
   page on `SplatLabWalkViewer`, pushed to a `preview/*` branch for a Vercel preview URL.

**Do not propose tonight:** MCMC, DN-Splatter or any depth loss (tested 2026-09-11, made the walk view
worse), registering the 360 to the phone (`sfm.py` supports one camera model per job; no mixed ingest
exists), exhaustive matching, 2 fps at 1280, Modal spend, stabilization-on exports, or the ".insv raw
path". The 360 layout is **16** views at ±45° (not 12).

**Inputs on disk (`C:\Users\Brian PC\Desktop\Payne Hall Test`, 28 GB):**

| File | What | Use |
|---|---|---|
| `paynehallstabilizationoff.mp4` | clip 003, 7680×3840 HEVC, 266.6 s, 7,991 frames | **train input** |
| `paynehallstabilizationoff2.mp4` | clip 004, 7680×3840, 109.4 s, 3,278 frames | **train input** |
| `paynehallstabilizationon2.mp4`, `paynehall213stabilized.mp4` | same clips, FlowState on, 8K | fallback only |
| `VID_*.insv`, `LRV_*.lrv` | raw dual-fisheye + proxies | keep, never feed to the Lab |

`stages/frames.py` extracts **every** video in an input folder and treats `.insv` as video, so the job
input must be a folder holding only the two stab-off files.

**Expected clock (from launch):** frames ~15 min, mask ~3 min, SfM ~20 min (backyard: 482 panos in
24 min), views ~2 h (CPU, py360convert from 8K), train 30k at ~4.6 it/s ≈ 2–2.5 h once splitting is
on, export 1 min. About 5–5.5 h end to end. PC has bugchecked five times in four days; checkpoints
land every 750 steps and `train.py` auto-restarts up to 20 times. A dead Next process loses stdout
progress but not the run.

---

## Part 2 — Cursor, on this desktop, in order

### 0. Machine hygiene (2 min)
- Close Insta360 Studio (`quick-look.exe` is on the GPU). Nothing else may use the GPU tonight; the
  Lab has no GPU lock.
- Do not touch `tmp/splat-lab/8fb02e4e` or `91b7d4bd` (golden backyard + HQ diagnosis).
- Keep the dev server up all night; the watchdog resume needs it.

### 1. Stage a clean input folder (1 min, PowerShell)
```powershell
$src = "C:\Users\Brian PC\Desktop\Payne Hall Test"
$in  = "$src\lab-input-staboff"
New-Item -ItemType Directory -Force $in | Out-Null
cmd /c mklink /H "$in\payne213_003_staboff.mp4" "$src\paynehallstabilizationoff.mp4"
cmd /c mklink /H "$in\payne213_004_staboff.mp4" "$src\paynehallstabilizationoff2.mp4"
Get-ChildItem $in
```
Hard links cost no disk. The folder must list exactly those two files.

### 2. Start the dev server and launch the job (2 min)
```powershell
npm run dev
```
Then, in a second shell, launch by API (avoids mis-clicking knobs in the panel):
```powershell
$body = @{
  input = "C:\Users\Brian PC\Desktop\Payne Hall Test\lab-input-staboff"
  workspaceName = "payne-213"; clone = "proven"; is360 = $true
  fps = 1.0; imageSize = "auto"; sphericalMode = "native"; maxFeatures = 16384
  viewImageSize = "1280"; nadirDeg = 40; removePeople = $true
  shDegree = 3; useBilateralGrid = $true; imagesPerStep = 2
  trainingSteps = 30000; quality = "auto"; maxSplatsMillions = 0; strategy = "default"
} | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:3000/api/splat-lab/run -ContentType "application/json" -Body $body
```
Note the returned job id. Job dir: `C:\s360\tmp\splat-lab\<id>`. Watch `live-status.json` there or the
panel at `http://127.0.0.1:3000/splat-lab`.

### 3. Gates while it runs
- **After frames:** `images/` should hold ~375 JPGs. `quality.json`: luma ≥ 70, sharpness ≥ 150. Softer
  than that means the walk was too fast or the room too dark; the run still proceeds, but say so.
- **After SfM:** `sfm/stats.json` → `registered / total` ≥ 0.9 (hard fail below 0.8). Note `points`;
  that is the seed count the train must beat.
- **After views:** `views/images/` ≈ 16 × registered panos; `views/masks/` present (nadir + people).
- **Train, step ~3,000 (about 10 min in):** read the last `gaussian_count`:
```bash
wsl -e bash -lc '/home/rian_/slate360-engines/nerfstudio/.venv/bin/python - <<EOF
from pathlib import Path
from tensorboard.backend.event_processing.event_accumulator import EventAccumulator
import glob
ev = sorted(glob.glob("/mnt/c/s360/tmp/splat-lab/JOBID/train/**/events.out.tfevents*", recursive=True))[-1]
acc = EventAccumulator(str(Path(ev).parent), size_guidance={"scalars": 0}); acc.Reload()
s = acc.Scalars("Train Metrics Dict/gaussian_count"); print(s[0].step, int(s[0].value), "->", s[-1].step, int(s[-1].value))
EOF'
```
  Rising above the seed = clamp works, let it run. Flat = stop the job. Kill the pipeline `run.py`
  process in WSL **first**, then `ns-train` (killing only `ns-train` trips the 20× auto-restart), then
  check `ns-train.log` for the `ns_train_wrap` import.
- **If the PC crashes:** restart the dev server and `POST /api/splat-lab/jobs/<id>/rerun` with
  `{"fromStage":"auto"}`. It resumes from the last stage output or checkpoint.

### 4. Export and inspect (10 min)
`export/output.ply` and `output.spz` (splat-transform `--spz-version 3`, Spark-readable). Open
`/splat-lab` → the job → View, take screenshots at four fixed spots: door, whiteboard wall, back row,
overhead dollhouse. Windows will leak floaters outside the walls; if they distract, crop by bounds the
way the backyard yard crop did (`tmp/splat-lab/_yard-stats.py` pattern) and re-run splat-transform.
Full-room SPZ is expected at 30–80 MB; phones downsample at load (`MOBILE_MAX_SPLATS` 1.0M), so no
second decimated file unless a phone fails to decode.

### 5. Ship the phone link (20 min)
Clone the backyard pattern exactly:
- `public/preview/payne-213.spz` ← the export (or crop).
- `app/preview/payne-213-splat/page.tsx` ← copy of `app/preview/backyard-splat/page.tsx` with
  `PUBLIC_SRC = "/preview/payne-213.spz"`.
- Branch `preview/payne-213-phone`, commit those two files only, push → Vercel preview URL
  (backyard precedent: `preview/backyard-phone` → `slate360-rebuild-git-preview-backyard-phone-slate360.vercel.app/preview/backyard-splat`).

### 6. MOVE / STAY markers (builds while the train runs; needs no GPU)
Reuse the stadium pin mechanism (`components/splat-lab/StadiumSplatPins.tsx`: `StadiumPinTracker`
inside the Canvas, `StadiumPinHud` outside). A pin is `{ fx, fy, name }` = fraction across the model's
footprint (X, Z). Build against `backyard.spz` first, swap `src` when Payne exports.
- `public/preview/payne-213-items.json`: 13 MOVE (10 tables "Sun Dvl" → Sun Devil Hall, 2 light
  fixtures, 1 small whiteboard) + 18 STAY tables. Fields: `id`, `action` (MOVE|STAY), `kind`,
  `label`, `destination`, `fx`, `fy`, `photo`, `note` ("blue sticky Sun Dvl" / "yellow sticky STAY"),
  `done`.
- Place `fx, fy` by eye from Brooke's plan against the dollhouse view; Brian confirms in the morning.
- HUD: title "Payne Hall 213 — Furniture Move", counts line, MOVE pins shown by default, STAY toggle,
  tap → photo + note, a "Plan" button that opens Brooke's layout image. Accent
  `var(--twin360-blue)` for MOVE, neutral for STAY; tokens only, no hex.
- Photos: the four sticky-note photos Brian sent, under `public/preview/payne-213/`.

### 7. Phone capture (when it lands; not a gate)
Transfer by USB: Apple Devices app → File Sharing → Slate360 → drag `Captures/<walk>` to the PC.
Do not rename anything. Inventory only tonight (frame count, `lidar_poses.json` version, depth stream
present). Its Brush/TSDF job (`C:\s360-studio\scripts\local-splat\studio\engine\run-job.ps1 -Mode phone`)
runs **after** the Lab train releases the GPU. It is the Geometry layer for later, not tomorrow's link.

### 8. Fallback if the splat fails QA at 7 AM
Still ship one link: the stitched 360 as a tour (`components/tours/TourPanoViewer.tsx`), Brooke's plan,
the item list with photos. Tabs only appear when the layer exists.

---

## Record (fill in as it runs)

| Field | Value |
|---|---|
| Job id | `cecc2763` (launched 2026-09-16 21:36 local, stab-off 003+004, fps 1, 1280, 30k, pause cap 250 → 24 densify events in 0..3000) |
| Frames / registered / seed points | |
| gaussian_count @3k / @30k | |
| Export splats / SPZ MB | |
| Preview URL | |

---

## Part 3 — phone / LiDAR track (added 22:00 PDT, Claude desktop session)

**Status at 22:00.** Lab job `cecc2763` launched by Cursor with the Part 2 recipe (376 frames, masks
376/376 nadir 40°, sequential+loop matching 101 s, mapping running). The pause clamp proves itself at
train step ~3,000.

**Where the phone data actually is.** Two uploads exist for the same walk:
- In-app capture `ddf04085-1031-4b1f-ad33-edc4ca174ceb` ("Quick Scans · Sep 16, 2:01 PM", space
  `2dd778d4-…`): LiDAR sidecars all **ready** (poses 0.4 MB, point cloud 35 MB, depth stream 180 MB,
  bundle) but photos stalled at 126 ready / 195 uploading since 14:25. Not usable for the pull-by-ID path.
- SlateDrop / `unified_files` under `orgs/c5538bfd…/674bfe46-…/`: **496 stills** (`twin_photo_NNN 2.jpg`,
  2.0 GB) + the same four sidecars with a ` 2` suffix. `folder_id` null, so the SlateDrop UI may hide
  them. This set is complete and is what tonight uses.

**What is chained (no action needed):**
1. `C:\Users\Brian PC\Slate360Jobs\payne-213-phone-capture\` — the 496 stills + `lidar_poses.json.gz`,
   `lidar_capture.ply.gz`, `lidar_depth.s360depth`, `capture_bundle.json`, downloaded from R2 with
   the ` 2` suffix stripped so the Studio recognises a phone capture folder. Log:
   `payne-213-phone-capture.pull.log` (ends with `DONE downloaded`).
2. `payne-213-phone-chain.ps1` (running hidden, log `payne-213-phone-chain.log`) waits for `cecc2763`
   to reach a terminal state (export exists / status not running), or **03:30** at the latest, then runs
   Capture Studio phone mode: `run-job.ps1 -Mode phone -Name Payne-213-phone-0916 -Quality final -Ingest`
   → job dir `Slate360Jobs\payne-213-phone`. Stages: cameras (COLMAP on 496 stills, ~30 min) → Brush
   30k at 2560 (~60–80 min) → walk aligned to the LiDAR frame (metric) → **TSDF mesh from the depth
   stream** (~15–20 min, CPU) → pack (full SPZ + 800k phone SPZ) → share (publishes into the phone's
   twin; link in `share.json`). Kitchen precedent 2026-09-10: 782 stills took 2 h 37 min end to end.
3. Expected: Lab export ~02:30, phone twin published ~04:30–05:00.

**Morning check (Brian or Cursor):**
- `Slate360Jobs\payne-213-phone-chain.log` last line: `SHARE {...shareUrl...}` = done. Open the link on
  the phone: Reality (Brush splat), Geometry (LiDAR TSDF mesh), Dollhouse/Plan from the mesh.
- `C:\s360\tmp\splat-lab\cecc2763\export\output.spz` = the 360 model; Part 2 steps 4–6 publish it.
- If the chain log says `deadline reached` while the Lab was still training, both shared the GPU for a
  while; slower, not broken.

**Tell Cursor:** the phone job is chained by the desktop Claude session; do not start a second Studio or
pull job on this capture tonight. Do not kill `powershell` processes. Cursor's morning job is Part 2
steps 4–6 (publish the 360 SPZ, MOVE/STAY pins) plus verifying the phone share link.

---

## Part 4 — why jobs stall overnight, and what now keeps them alive (22:50 PDT)

**Diagnosis, verified on the live process tree, not inferred.** The Lab runner is spawned by the
Next dev server: `wsl.exe … bash -lc 'python run.py …'` with **stdout piped into Node** and a pty
on Next's wsl.exe relay (`ps` showed `tty pts/0`, parent `/init`). Two consequences:
1. When Next wedges or is restarted, the pipe closes and `run.py` dies with `BrokenPipeError` on
   its next progress line. Cursor's `detached: true` does not change this: `stdio` is still
   `pipe`, and the pty still belongs to Next's relay (SIGHUP on relay exit). That is the whole
   "it stopped and nobody knew" pattern.
2. `live-status.json` is only patched by the runner while it lives, so a dead runner leaves the
   file frozen at "running". The `database.db-shm` heartbeat Cursor removed was a second, separate
   false positive.

Answers to the outside AI's questions:
- (a) Next's 4–6 GB: not root-caused tonight and no longer on the critical path; the job must not
  depend on Next at all.
- (b) Process tree: `setsid nohup` inside WSL does **not** survive (tested: killed when the wsl.exe
  session ended). A **hidden standalone `wsl.exe` relay started by PowerShell** does survive the
  launcher exiting (tested twice). That is the mechanism now in use.
- (c) Heartbeat: the relay's bash keeps `run.py` as a child and writes an epoch stamp to
  `tmp/splat-lab/cecc2763/_alive.txt` every 10 s while it lives. The babysitter reads the stamp's
  content (not mtime, not pgrep through wsl.exe, both of which mis-read under a hidden window).
- (d) Mapper-only resume: `stages/sfm.py` now reuses matches when `live-status.json` recorded
  `sfm.matching` done and the database holds pairs for every image (`_matching_done`). Features
  already resumed via the image count. Sub-step records are also written to `live-status.json`
  directly by the SfM stage now, so they survive a dead Next.
- (e) Yes: the watchdog lives outside Next. `Slate360Jobs\payne-213-lab-babysit.ps1` (hidden
  PowerShell, log `payne-213-lab-babysit.log`) relaunches from the inferred stage after 6 stale
  polls (3 min), up to 25 times, and exits when `export/output.spz` exists.

Code hardening (committed on `feature/splat-lab`):
- `workers/local/splat-lab/run.py`: stdout wrapped so a closed pipe redirects to `<job>/run.log`
  instead of raising; SIGHUP ignored.
- `workers/local/splat-lab/stages/sfm.py`: `_emit` never raises on a closed pipe and patches
  `live-status.json`; `_matching_done` skips matching on resume.

Tonight's sequence: mapper finished 22:25 (376/376, model in `sfm/sparse/0`); views started under
Next; babysitter took the job over at 22:39 (kill + relaunch from `views`, which resumes per image);
views 150/376 at 22:45 (~4 min per 50 panoramas → done ~23:05); then train 30k, export.
Earlier babysitter versions (22:27–22:36) mis-read pgrep output through wsl.exe under a hidden
window and kill-looped the job three times; each restart resumed views without loss. v3 no longer
reads pgrep for liveness.

**Cursor must not:** restart, rerun, pause or "resume" job cecc2763 from the Lab UI or API tonight,
nor kill `wsl.exe`/`powershell.exe` processes. Next can be restarted freely now; the job does not
depend on it. Status: `tmp/splat-lab/cecc2763/run.log` (runner output), `live-status.json`
(stages), `_alive.txt` (heartbeat), `Slate360Jobs\payne-213-lab-babysit.log` (restarts).

---

## Part 5 — the two-camera question (23:05 PDT)

**Correction to "mixing 360 + phone stills is not built."** It is built, end to end, and nobody has
ever run it:
- `workers/local/splat-lab/sources.py` (**untracked**) — `discover_groups` finds `images/equirect/`
  and `images/pinhole/` and tags them EQUIRECTANGULAR / OPENCV.
- `stages/sfm.py` `_run_mixed` — one COLMAP mapper, features extracted per group with that group's
  camera model, unordered (vocab-tree) matching across both sets, images staged into `sfm/images_all`.
- `stages/views.py` (**89 uncommitted lines**) — warps only the EQUIRECTANGULAR cameras into 16
  pinhole views, falls back to `images/equirect/<name>` for the source file, then appends the phone
  stills through `pinhole_views.py` into the same `transforms.json`.

So the training set would be one merged pinhole set with per-image intrinsics, which is ordinary
nerfstudio. The capability is real. It is unproven, which is a different statement.

**Why it is still not tonight, and may not be the quality win it sounds like.** Measured:

| Source | Trained at | Angular resolution |
|---|---|---|
| X4 8K equirect → 16 views | 1280 px / 90° | 14 px per degree |
| iPhone still (4032×3024) | 2560 px / ~68° | 38 px per degree |

The phone is about 2.7× sharper per degree (4× at native). Three consequences:
1. **The blurrier majority wins.** 6,016 pano views vs 491 stills share one photometric loss. Where
   both see a surface, the optimum is a compromise weighted by view count, and it sits near the 360's
   blur. You do not get the sharp source's detail by adding the soft one.
2. **Mixed resolution is a known 3DGS failure mode.** It is what Mip-Splatting exists to fix; stock
   splatfacto has no such filter, so the expected artifact is aliasing and surface erosion.
3. **Exposure mismatch.** X4 at a fixed fast shutter vs iPhone auto-exposure gives two brightnesses
   for the same wall. The bilateral grid absorbs some of that per image, not a whole camera offset.

Also: the phone stills have **EXIF stripped** (no focal length), so COLMAP must solve the phone
intrinsics with no prior. Workable, less robust.

**The multi-camera strategy is right; the fusion point is the coordinate frame, not the loss.** Two
models registered into one metric frame give: the phone's sharpness where it looked closely, the
360's complete walkable coverage, the LiDAR's metric scale and mesh for plan/dollhouse, and one pin
that appears in all of them. That is the deliverable Brian described. A single blended model is a
research experiment, not the way to get there.

**Staged so the experiment is one command tomorrow** (hard links, no new disk, no GPU used):
`C:\Users\Brian PC\Slate360Jobs\payne-213-mixed-input\images\` with `equirect\` (376 panos, reused
from cecc2763 — no re-extraction) and `pinhole\` (491 stills). To run it **after** the GPU is free:
```bash
mkdir -p /mnt/c/s360/tmp/splat-lab/payne213mix
cp -rl "/mnt/c/Users/Brian PC/Slate360Jobs/payne-213-mixed-input/images" /mnt/c/s360/tmp/splat-lab/payne213mix/
cd /mnt/c/s360/workers/local/splat-lab && <env line from the babysitter> \
  python run.py --input /dev/null --output /mnt/c/s360/tmp/splat-lab --job-id payne213mix \
  --is360 --from-stage sfm --spherical-mode native --view-image-size 1280 --training-steps 3000 ...
```
Judge it at SfM, not at the end: `sfm/stats.json` must show **both** groups registered in one model.
If the phone stills do not register against the panoramas, cross-camera matching failed and the whole
idea stops there for this capture. That answer costs about an hour of CPU and no training time. Run
the 3,000-step smoke first; do not spend 30k on it.

**Unrelated finding tonight:** the views stage segfaulted once (`run.py exited rc=139`, 22:42:49, no
Python traceback — a native crash in the image path). The babysitter relaunched it 3 minutes later
and views resumed from where it was. That is the second distinct stall cause, and the babysitter
absorbs it: it does not need to know why the runner died.
