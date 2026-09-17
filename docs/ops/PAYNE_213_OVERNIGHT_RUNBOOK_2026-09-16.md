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
| Job id | |
| Frames / registered / seed points | |
| gaussian_count @3k / @30k | |
| Export splats / SPZ MB | |
| Preview URL | |
