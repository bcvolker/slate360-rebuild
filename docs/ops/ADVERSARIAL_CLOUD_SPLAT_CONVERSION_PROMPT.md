# Hostile review — cloud Gaussian “super program” conversion plan

You are reviewing Slate360 for a non-coder CEO (Brian). Do not take this chat’s word. Open the repo at `C:\s360` (or the GitHub `main` that Vercel deploys). Measure what is actually wired. Rank. Write a conversion plan. **Do not start cloud jobs. Do not spend Modal/Trigger money. Do not stop local HQ train `91b7d4bd`. Do not start AirVis.**

Goal: once the **desktop Splat Lab recipe is good enough**, port it to the **existing cloud GPU pipeline** so large / parallel jobs can run without tying up Brian’s PC. He will keep using the desktop program to perfect quality. Cloud is for later scale, not for tonight.

## What he needs the other AI to do

1. Audit the **current cloud processing pipeline** (Trigger.dev → Modal → R2 → share viewer) against the **desktop Gaussian pipeline** we are iterating in Splat Lab.
2. Say what must change to run the **same Gaussian walk-through product** in the cloud, with mixed cameras (360 + phone stills + drone stills), LiDAR, GPS/RTK, and multiple jobs at once.
3. Give a **phased conversion / build plan** (no vibe architecture). Name files. Name what already exists vs what is a stub.
4. Call out **cost, RAM, and timeout** traps so we do not light money on fire copying the backyard OOM onto A10G.
5. Challenge this prompt. If desktop Lab already has a mixed-camera path the Modal worker lacks, say so. If the Modal worker already has LiDAR/GPS the Lab lacks, say so. Do not invent a third pipeline.

## Non-negotiables

- Local splat-lab remains the quality lab until Brian says cloud is on.
- Photogrammetry (mesh / ortho / DEM) stays a **separate product**. Do not replace it with Gaussians. Do not run ODM on a 360 walk “because we have a photogrammetry worker.”
- Twin 360 guest share (`/share/twin/[token]`) is the delivery surface. Kitchen example: `https://www.slate360.ai/share/twin/vjBRRORnHFflyz5sOgxNT0lyEv1Cd_JO`
- File-size gate: new UI files under 300 lines. No hardcoded brand hex in app chrome. No `git add .`.
- Additive DB only. Do not edit existing migrations.

## What is actually in the repo (re-verify)

### Desktop quality lab (what we are perfecting now)

| Piece | Path | Role |
|---|---|---|
| Runner | `workers/local/splat-lab/run.py` + `pipeline.py` | frames → mask → SfM → 16-view train set → `ns-train splatfacto` → ply/spz |
| Mixed cameras | `lib/splat-lab/capture-sources.ts`, `workers/local/splat-lab/sources.py`, `stages/sfm.py` `_run_mixed` | OPENCV pinhole + EQUIRECTANGULAR in **one** COLMAP DB |
| Train knobs being proven on backyard HQ `91b7d4bd` | `stages/train.py`, `ns_train_wrap.py` | 1280 px, densify 0.0002, split to 85%, bilateral grid, uint8 CPU cache, skip `pin_memory`, scale-regularization queued for **next** spawn |
| LiDAR / RTK on Lab | `SplatLabConfig.use_lidar` / `use_rtk` | **Flags only.** Drop zone keeps `.las/.laz` and says fusion is not wired |
| Viewer | `components/splat-lab/SplatLabWalkViewer.tsx`, `SplatWalkBar.tsx`, `components/digital-twin/splat-viewer-core.tsx` | Walk / Dollhouse / Plan, Normal steps + Leap ahead (~10 ft), Spark SPZ |
| Guest preview | `/preview/backyard-splat` | Local: `/api/splat-lab/jobs/8fb02e4e/model?crop=yard2`. Production: `/preview/backyard.spz` until HQ is swapped |

First backyard export `8fb02e4e` is the starved model (~317k gaussians). HQ `91b7d4bd` is the recovery train. Do not judge commercial quality on the first export.

### Cloud — Gaussian (already exists, interior Twin 360)

| Piece | Path | Role |
|---|---|---|
| Trigger task | `src/trigger/twin-gaussian-splat.ts` id `twin.gaussian_splat` | Reads `digital_twin_processing_jobs` + capture assets, POSTs to `MODAL_TWIN_ENDPOINT` |
| Modal worker | `workers/modal/twin-gaussian-splat/worker.py` app `slate360-twin-gaussian-splat` | A10G, 7200s cap. COLMAP + splatfacto + SPZ. Accepts photos/video/`panorama_360`/`drone_*`, `lidarPosesKey`, `lidarPlyKey`, `lidarDepthKey` |
| LiDAR seed | same worker ~line 1168 / 1320 | ARKit poses bypass or COLMAP; can seed splatfacto from LiDAR ply |
| GPS | `workers/modal/twin-gaussian-splat/gps_priors.py` | Collapses phone GNSS duplicates; pins the block to Earth, not local shape |
| 360 | `equirect_frames.py`, `is360Flags` on the Trigger payload | Projection-aware (equirect vs dual-fisheye). Mixed pinhole+equirect **in one COLMAP** is the Lab path — prove whether the Modal worker actually runs two camera models or still treats 360 as “all flags true” |
| Callback | `POST ${SITE_URL}/api/digital-twin/jobs/callback` | Writes SPZ to R2, share token / studio |
| Timeout / GPU | A10G 24 GB, `MAX_DURATION_SECONDS = 7200` | Backyard HQ is 7712×1280 views and already blew **64 GB system RAM** on float32 cache. Copying Lab settings blindly will OOM or hit 2h kill |

### Cloud — photogrammetry / maps (separate)

| Piece | Path | Role |
|---|---|---|
| Trigger | `src/trigger/twin-photogrammetry.ts` id `twin.photogrammetry_mesh` | Drone **stills** only (`drone_photo` / `photo`), ≥3 images |
| Modal | `workers/modal/photogrammetry/worker.py` | COLMAP sparse+dense, ODM-class ortho/DEM. Explicitly “Gaussian-splat **input**” downstream, not the walk-through trainer |
| Product | ortho, DEM, textured mesh/GLB | Contractor map / survey. Keep it |

### Cloud — thermal (unrelated, CEO-only)

`workers/modal/thermal-analysis/` via `thermal.process`. Do not fold thermal into the splat worker.

### Ingest contract the Lab just wrote (Twin app must adopt later)

`lib/splat-lab/capture-sources.ts`: `images/pinhole` (OPENCV) + `images/equirect` (EQUIRECTANGULAR), `mixed: true`. Twin 360 / regular splat must use this **same folder layout** when mixed ingest is promoted after backyard HQ.

## Honest gaps to confirm (do not skip)

1. **Modal mixed cameras.** Lab can put OPENCV + EQUIRECTANGULAR in one SfM. Does `worker.py` do that, or does `is360Flags` force every asset down one path? If the latter, that is the #1 cloud conversion item for “X4 on a stick + iPhone stills + LiDAR.”
2. **Splat-lab LiDAR.** Cloud Twin worker already consumes LiDAR ply/poses/depth. Lab does not. Conversion is **not** “add LiDAR to Modal”; it is “stop dropping LiDAR on the desktop” *and* “make mixed 360+pinhole land on Modal.”
3. **Train recipe drift.** Lab HQ: 1280, densify 0.0002, split 85%, bilateral, uint8 cache, scale-reg next. Modal worker has its own densify/bilateral/stop-split (~57%). Diff `stages/train.py` vs `worker.py` train argv. The cloud “super program” is **one recipe**, not two forever.
4. **RAM.** Modal A10G has 24 GB VRAM and far less host RAM than Brian’s WSL 64 GB. The float32 cache OOM will happen in the cloud unless uint8 / stream-from-disk / drop +45° views / lower view count is in the worker **before** any paid backyard-scale job.
5. **Splat cap.** Lab prints a cap and splatfacto ignores it. Modal comments say the same (AF3). MCMC `splatfacto-mcmc` is the planned enforcer. Not on either path as the default today.
6. **Multi-job.** Modal already scales by spawning containers. Trigger `maxDuration` on `twin.gaussian_splat` is **120 seconds** — that is dispatch only; the GPU run is async. Confirm a second job does not queue behind a 2h A10G if Modal concurrency is 1. Parallel jobs = parallel **dollars**.
7. **Share vs Lab preview.** Production guest walk-through is `/share/twin/[token]`, not `/preview/backyard-splat`. Cloud conversion must emit the same SPZ + optional `geometry.glb` + `walk.json` the Kitchen share already consumes.
8. **Resume / crash.** Desktop died on cache, wrong resume step, Next.js watchdog, PC sleep. Cloud dies on 7200s, OOM, callback HMAC, missing `GPU_WORKER_SECRET_KEY`. Different failure mode; still need a **remainder-based resume** from R2 checkpoints, which Lab only just grew.

## Capture kit Brian will test (campus room, tonight, desktop — not cloud)

- Insta360 X4 overhead on a selfie stick (equirect video or stills).
- iPhone on the same stick, Twin 360 app: stills + LiDAR + ARKit poses.
- Operator + phone sit in the 360 nadir; Lab already has `nadir_deg` + people mask.
- Process on the **desktop** after `91b7d4bd` frees the GPU. Cloud conversion must make this same drop work on Modal later: one job, mixed cameras, LiDAR for metric mesh/measure/collision, splat for appearance.

## What “super program in the cloud” is **not**

- Not a new Modal app from scratch.
- Not running ODM photogrammetry on 360 video and calling it a twin.
- Not AirVis.
- Not training on Vercel.
- Not enabling paid Modal runs until the desktop recipe (resolution, densify, mixed ingest, crop) is locked.

## Deliverable from you

Write:

**A. Current-state map** — two columns: cloud vs desktop, for ingest, SfM, train, export, viewer, sensors. Cite files. Mark live / stub / missing.

**B. Conversion plan, phased**

| Phase | When | What | Do not |
|---|---|---|---|
| 0 | now | Desktop HQ + campus mixed capture. Freeze recipe. | Spend Modal |
| 1 | recipe locked | Port mixed COLMAP + uint8 cache + densify/split/bilateral/scale-reg into `twin-gaussian-splat/worker.py`. Share one config module or a checked-in argv table so Lab and Modal cannot drift. | Fork a third trainer |
| 2 | after 1 proven on a small kitchen + one outdoor | Wire Lab `use_lidar` to the same LiDAR seed/TSDF the Modal worker already has. Twin app writes `images/pinhole` + `images/equirect` using `capture-sources.ts`. | Silent first-asset-only LiDAR (worker already refuses multi-clip) |
| 3 | scale | MCMC cap 3–4M, 1920 with dropped up-views or image streaming, checkpoint to R2, Modal concurrency >1, cost estimate per 1k views / per hour A10G vs A100 | Overnight unpaid jobs |
| 4 | products | Photogrammetry worker remains maps. Optional: feed its sparse as a prior into the splat worker for aerial+ground, do not merge the two UIs |

**C. Cost / risk** — A10G-hour ballpark for (i) kitchen-scale iPhone clip, (ii) backyard-scale 7k views, (iii) two jobs at once. What kills a run (RAM, 7200s, callback). How resume should work.

**D. Kill-shots** — ranked list of code changes with file paths, each one sentence, in the order you would actually merge them.

If you disagree with Phase 1–4, replace them with a better order and say why against this repo.
