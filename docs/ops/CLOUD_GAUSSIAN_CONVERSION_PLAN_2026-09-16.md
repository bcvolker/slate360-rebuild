# Cloud Gaussian conversion plan (2026-09-16)

**Written by:** desktop Claude session, `C:\s360`, branch `feature/splat-lab`, after code audits of both pipelines.
**Answers:** the "cloud super program" hostile prompt, plus Brian's questions on multi-sensor ingest, deliverables, cost, and reliability.
**Rules honoured:** nothing was run in the cloud, no Modal or Trigger spend, no AirVis. HQ train `91b7d4bd` finished 2026-09-16 ~13:08 local and was **not** published.

The cloud files audited are byte-identical on `origin/main`. The desktop lab files that matter for this plan (`sources.py`, `pinhole_views.py`, `capture-sources.ts`, the new `train.py`) are uncommitted.

---

## A. Current-state map

| Area | Cloud (`workers/modal/twin-gaussian-splat/worker.py`, `src/trigger/twin-gaussian-splat.ts`) | Desktop lab (`workers/local/splat-lab/**`) |
|---|---|---|
| Ingest kinds | photo, video, panorama_360, drone_photo, drone_video, plus LiDAR poses / ply / depth sidecars (`twin-gaussian-splat.ts:103-109`). One LiDAR clip only; a second is refused (`:110-116`). **Live** | One folder or one video per job. `.las/.laz/.e57`, `.mrk/.pos` accepted by the drop zone then ignored by every stage (`file-detect.ts:45-60`, `frames.py:64`). `.insp` not recognised. **Stub** |
| 360 handling | Equirect and dual-fisheye reprojected by ffmpeg into 16 flat views per still, 8 per video frame at 0.5 fps, then treated as pinhole (`worker.py:1962-2047`). COLMAP never sees a spherical camera. **Live, lossy** | Native `EQUIRECTANGULAR` COLMAP on the panoramas, then 16 warped training views at 1280 px (`sfm.py:75-116`, `views.py`). **Live, the better path** |
| Mixed cameras in one SfM | Everything lands in one image folder and one `ns-process-data` run; no per-asset camera model, no `single_camera` control (`worker.py:2140-2212`, `3415-3433`). **Partly live, wrong** | `_run_mixed`: one database, OPENCV group + EQUIRECTANGULAR group, one matcher, one mapper, merged `transforms.json` (`sfm.py:262-317`, `views.py:181-188`). **Written, never run, not reachable from the UI**, and it double-registers a plain 360 job (`sfm.py:69`) |
| LiDAR | ARKit pose bypass of COLMAP, LiDAR PLY seeds splatfacto init, depth feeds a CPU TSDF interior mesh, metric scale recovered from ARKit vs COLMAP trajectories (`worker.py:1149-1337`, `1506-1544`, `3274-3330`). Default strategy still runs COLMAP first (`:200`). **Live** | `use_lidar` flag only (`config.py:129`). **Stub** |
| GPS / RTK | `gps_priors.py` exists but is not mounted in the image and not imported (`worker.py:282-291`). `model_aligner` exists only in the photogrammetry worker. **Dead** | `use_rtk` flag only. **Stub** |
| Matching | sequential or exhaustive via `ns-process-data`, CPU only, unpinned Debian COLMAP (`worker.py:217`, `:529-533`) | COLMAP 4.1 CUDA, sequential plus loop closure for walks, vocab tree for unordered sets (`sfm.py:86`, `:390-404`) |
| People and operator | YOLOv8-seg masks (`worker.py:276-279`). No nadir band | RTMDet ONNX masks plus a 40° nadir band (`rtmdet.py`, `config.py:154`, `views.py:202`). Detector still squashes the equirect to 640² |
| Train recipe | splatfacto, 15k to 45k steps, stop-split 57 percent, cull-alpha 0.1, densify default or 0.0005, bilateral on `visual` only, scale-reg on, max-gauss-ratio 5, antialiased on `visual`, camera optimiser SO3xR3 on `visual`, no image cache flags (`worker.py:431-513`, `1737-1743`) | splatfacto via `ns_train_wrap.py`, 25k to 50k steps auto, stop-split 85 percent, cull-alpha 0.001, cull-scale 0.15, densify 0.0002, bilateral per job, scale-reg on, uint8 CPU cache, pin_memory patched out, SH 3 (`train.py:100-140`) |
| Splat cap / MCMC | Cap enforced after export by cropping the PLY (`:2477-2479`). No MCMC | Cap computed and printed, never passed. `strategy: mcmc` accepted and ignored (`config.py:112-114`, `:152`) |
| Checkpoints and resume | None. Train wrapped in a 3600 s heartbeat inside a 7200 s container; a timeout loses everything and posts no failure callback (`worker.py:60-62`, `3527-3536`) | Checkpoint every 750 steps, resume with remainder-based iterations, 20 auto-restarts, worker-written `live-status.json` and `train-heartbeat` (`train.py:24`, `:106`, `:174`). Checkpoint picked by mtime, not step (`:259-261`) |
| Export | ns-export, crop and recenter and cap, opacity ladder, splat-transform 2.7.1 `--spz-version 3`, manifest, floorplan PNG/SVG/DXF, cameras JSON, interior mesh keys to R2 (`:306`, `:3560-3733`). No poster. No `geometry.glb` or `walk.json` writer even though the share viewer reads them | ns-export, `--spz-version 3`, no floater filter in the pipeline. Crop lives in a one-off script with hard-coded paths (`tmp/splat-lab/_crop-yard.py`) |
| Viewer | `/share/twin/[token]`: splat, mesh, LiDAR, photos, manifest-driven framing and edit list. **Live delivery surface** | `/preview/backyard-splat` walk bar (Walk, Dollhouse, Plan, step size). Local only |
| Cost and concurrency | A10G only, unbounded `spawn` per POST, no cost log, no `memory=` set, Trigger dispatch 120 s (`worker.py:63`, `:3877-3881`, `:4310`) | One GPU, one job |

Two corrections to the prompt. First, the cloud worker does not run two camera models; it flattens 360 into pinhole tiles before COLMAP, which is the lossier of the two designs. Second, the desktop lab does write its own status file and heartbeat now; the Node process is no longer the only witness.

---

## B. Conversion plan

| Phase | When | What | Do not |
|---|---|---|---|
| 0 | now | Finish HQ backyard, run the campus mixed capture on the desktop, freeze the recipe as a checked-in table (`workers/local/splat-lab/recipe.py`: resolution, densify, stop-split, cull, bilateral, scale-reg, nadir, cache type, steps formula). Fix the two desktop bugs that will otherwise be ported: checkpoint by step number, and the mixed-group double registration. Make `_run_mixed` reachable from the drop zone via `capture-sources.ts` | Spend Modal |
| 1 | recipe locked | Port to the cloud worker in this order: pinned COLMAP 4.1 image with CUDA (the photogrammetry worker already pins a COLMAP image, reuse it), native `EQUIRECTANGULAR` SfM and the 16-view warp from `sfm.py` and `views.py`, `_run_mixed` groups, `recipe.py` imported by both `train.py` and `worker.py` so the argv cannot drift, uint8 cache and the pin_memory patch, checkpoint every 750 steps to R2 and remainder resume, `memory=` set explicitly, a failure callback on timeout | Fork a third trainer; keep the ffmpeg v360 tile path as a fallback only |
| 2 | after one kitchen and one outdoor job pass on the cloud | Bring LiDAR the other way: wire desktop `use_lidar` to the worker's pose bypass, PLY seed, TSDF mesh and metric-scale code, moved into a shared `workers/common/lidar/` package. Twin 360 app writes `images/pinhole` and `images/equirect` plus `lidar/` using `capture-sources.ts`. Mount `gps_priors.py` and add `model_aligner` for drone EXIF and RTK so outdoor jobs are metric without LiDAR | Silent first-asset-only LiDAR; keep the refusal explicit until multi-clip is designed |
| 3 | scale | MCMC strategy with a real cap of 3 to 4M, 1920 px views with the four up-tilted views dropped or images streamed from a Volume, A100 option for jobs above 5k views, per-job GPU-second and dollar log in the callback, `max_containers` cap so a bad day cannot spawn twenty A10Gs | Overnight unpaid jobs; jobs with no cost ceiling |
| 4 | products | Photogrammetry worker stays the map engine. Add one bridge: its aligned sparse model becomes a pose prior for the splat worker on aerial plus ground jobs, and its DEM feeds measurement. Worker writes poster, `geometry.glb` from the TSDF or LiDAR mesh, `walk.json` from the camera path, so the share viewer gets collision and stations without a second tool | Merge the two UIs; run photogrammetry on 360 walks |

Why this order and not the prompt's: the prompt puts LiDAR in phase 2 as "wire the flag". The real gap in phase 1 is that the cloud cannot do native 360 at all, and native 360 is where every desktop quality gain came from. Porting the recipe without porting the spherical SfM would reproduce the cloud's current softness at higher cost.

---

## C. Cost, RAM, timeouts, resume

Modal list prices, verify before quoting: A10G about $1.10 per hour, A100 40 GB about $2.10, H100 about $3.95. CPU-only containers are cents per hour.

| Job | Stages | A10G hours | Dollars | Trap |
|---|---|---|---|---|
| Kitchen-scale phone clip, 800 to 1,500 views | SfM 10 min, train 30k steps at about 0.15 s, export | 1.5 to 2 | 2 to 3 | Fine today |
| Backyard-scale 360 walk, 7,712 views at 1280 | SfM 40 min CPU, views 15 min CPU, train 50k steps at about 0.30 s on A10G, export | 5 to 6 | 6 to 8 | Exceeds the 7200 s cap by itself. Host RAM for the uint8 cache is 38 GB; with no `memory=` set the container is killed. Do not run this shape on the cloud until phase 1 lands checkpoints and memory |
| Two backyard jobs at once | as above, two containers | 10 to 12 | 12 to 16 | Nothing limits concurrency today, so ten jobs is ten containers and ten bills |

Cheaper by design: run frames, masks, SfM and views on CPU containers and hand the GPU only the train. That alone cuts the backyard bill by roughly a third. Reject bad captures before training using the quality gate the desktop already computes. Keep PLYs in cold storage and never retrain what only needs a recrop.

What kills a cloud run today: the 7200 s cap, host RAM, a callback HMAC or missing worker secret, and the 3600 s inner heartbeat. Resume must be: checkpoint every 750 steps to R2 under the job key, a resume payload that names the checkpoint step, iterations as remainder, and an idempotent callback keyed by job id so a retried container cannot double-bill.

---

## D. Kill-shots, in merge order

1. `workers/local/splat-lab/ns_train_wrap.py` clamp `pause_refine_after_reset` to 250 so walks with thousands of views can densify (HQ `91b7d4bd` never split).
2. `workers/local/splat-lab/stages/train.py:259` pick the checkpoint with the highest step, not the newest file.
3. `workers/local/splat-lab/stages/sfm.py:69` only call `discover_groups` when the job is mixed, so a plain 360 job is not registered twice.
4. `lib/splat-lab/capture-sources.ts` plus `components/splat-lab/DropZone.tsx` write `images/pinhole` and `images/equirect` and pass `--mixed` to `run.py`, making `_run_mixed` a real feature.
5. New `workers/local/splat-lab/recipe.py` holding the frozen argv table, imported by `train.py`; copy it verbatim into `workers/modal/twin-gaussian-splat/` and import it in `build_train_args`.
6. `workers/modal/twin-gaussian-splat/worker.py:212-235` pin COLMAP 4.1 with CUDA using the photogrammetry worker's image pattern; delete the apt COLMAP.
7. Port `sfm.py` native equirect and `views.py` warp into the worker behind the existing `is360Flags`, keeping the ffmpeg tile path as fallback.
8. `worker.py:3875-3881` set `memory=` and add `--steps-per-save 750` plus checkpoint upload to R2 and a resume input.
9. `worker.py:60-62` post a failure callback on timeout and on OOM so the job row never stays "processing" forever.
10. Mount `gps_priors.py` and add `model_aligner` on drone EXIF and RTK; write `metric_scale` from it when no LiDAR.
11. Shared `workers/common/lidar/` extracted from `worker.py:1149-1337` and `3274-3330`, imported by both pipelines.
12. Worker writes poster JPEG, `geometry.glb`, and `walk.json` next to the SPZ; the share viewer already reads all three.
13. `workers/local/splat-lab/stages/export.py` promote the crop script into a stage with the camera hull, height slab, opacity and scale filters, default on for 360 walks.
14. MCMC strategy plus enforced cap in `recipe.py`; delete the printed-only cap. **After** item 1 proves splatfacto densify actually grows; MCMC is how you cap at 3–4M, not how you unstick a frozen seed.
15. Per-job GPU seconds and dollars logged in the callback payload; `max_containers` on the Modal function.

---

## E. Sensor mixing, in plain language

What works after phase 1 and 2: one job folder with 360 video or stills, phone stills, drone stills, an iPhone LiDAR clip, and drone GPS. COLMAP solves all cameras together because they overlap, LiDAR or GPS gives the metres, the splat gives the look, and the LiDAR or TSDF mesh gives collision and measurement. Capture rules that make it work: 60 percent overlap between every source, locked white balance and exposure per camera, the 360 on a vertical stick above the head, drone nadir plus one oblique orbit, and stills instead of video whenever the subject is static.

Colour between cameras: the bilateral grid learns a per-image correction and handles most of it. What it cannot fix is a log-profile drone file next to an auto-exposed phone with no overlap. Add a pre-SfM histogram match stage for stills, and never try to recolour a baked splat in the viewer.

Floaters: opacity and scale culls at train, the crop stage, the nadir band, people masks, and the share viewer's edit list. Nothing else is needed until those five are on by default.

---

## F. Deliverables worth money from the same capture

Already possible from a 360 walk plus phone LiDAR, in the order I would sell them:
1. **Pre-cover record.** Walk every room the day before drywall, insulation, or slab pour. The splat plus pins is the only proof of what is inside the wall. Contractors pay for this because it ends disputes.
2. **Progress timeline.** Same rooms every two weeks, aligned to one base model, with a slider. The epoch selector and per-epoch measurements already exist on the mesh path.
3. **Punch list and closeout package.** Pins with photos, status, and responsible sub, exported to the PDF generator that exists for Site Walk.
4. **As-built versus drawing overlay.** Pin the 360 or splat on the plan sheet, the tour builder already does the pin; add measure against the drawing scale.
5. **Owner handover twin.** Equipment tagged with pins holding O&M docs and warranty dates, kept for the access term the business plan already prices.
6. **Insurance and claim evidence.** The capture-time hashes already exist. Sell the sealed record as a product line to owners, not only contractors.

From drone plus ground, later phases:
7. Weekly orthomosaic with stockpile volumes and cut and fill from the DEM, which the photogrammetry worker already produces.
8. Roof and facade condition reports from the oblique orbit, with thermal as the add-on already priced.
9. Site logistics plan on the ortho for crane, laydown, and traffic.
10. Leasing and marketing walkthroughs from the same splat, sold to the developer, not the GC.
11. Remote inspection views for fire marshal or owner's rep sign-off, which saves them a site visit.
12. Accessibility and clearance audits using the measurement tool once LiDAR scale is standard.

---

## G. Advice on quality, speed, cost, and stability

- One recipe file, both pipelines import it, and every model's manifest records which recipe version made it. Drift is how you get two products.
- Stills for static scenes, video for cadence. The X4 still is 1.6 times the linear resolution of an 8K video frame with no compression.
- Reject bad captures before the GPU touches them. The quality gate exists; make it refuse, not warn.
- CPU stages on CPU containers, GPU only for train and export. Checkpoint to R2. Never let a job run without a cost ceiling.
- MCMC with a cap gives predictable VRAM and predictable bills. Unbounded densification gives neither.
- Keep the PLY forever, recrop for free, retrain only when the recipe changes.
- Fix the desktop machine before trusting it with overnight jobs: five kernel crashes in four days is a hardware fault, not software.
- Pin every binary. The cloud worker currently installs whatever COLMAP Debian ships that day.

---

## H. Gaps found on second review (2026-09-16, after the outside AI concurred)

Add these to the phases above. D is merge order; this table is the second-pass gap list (15–27).

| # | Phase | Gap | Why it matters for cost or reliability |
|---|---|---|---|
| 15 | 0 | **Stage cache keyed by input hash and recipe version.** Frames, masks, SfM and views are reused when only the train recipe changes; train is reused when only the crop changes. | Today a recipe tweak re-runs 40 minutes of SfM. This is the single largest cost saver after the GPU split. |
| 16 | 0 | **Gates that refuse, not warn:** sharpness and exposure gate before SfM (exists as `quality.json`, advisory only), registration gate after SfM (below 90 percent of frames registered stops the job), and a 3,000-step low-resolution smoke train that renders three views for the operator before the full run. | A bad capture must cost cents, not $6. The smoke train catches wrong orientation, missing masks and exposure drift in ten minutes. |
| 17 | 0 | **Sharpest-frame selection and duplicate drop** in the frames stage (pick the sharpest of each 0.5 s window, drop near-identical frames when the operator stands still). | Fewer, better views: less RAM, shorter train, sharper model. The AirVis manifest shows 25 sharpness candidates per sample; ours takes fixed timestamps. |
| 18 | 0 | **Golden set regression.** Kitchen, backyard and stadium captures with fixed cameras; every recipe change renders the same views and reports PSNR and a matched screenshot pair before merge. | Prevents the silent quality regressions that have happened three times this week. |
| 27 | 0 | **Clamp `pause_refine_after_reset`.** Splatfacto sets it to `n_images + 100`. gsplat only densifies when `step % 3000 >= pause`. Jobs with more than ~2,900 views never split. | HQ and the first backyard both froze at 383,657 gaussians for every TensorBoard step. Cap unused. MCMC is not the first fix — splatfacto densify never ran. |
| 19 | 1 | **Raise the Modal timeout** to what the job shape needs (Modal allows up to 24 h) and keep checkpoints for crash safety, not as a substitute for the timeout. | A 7,712-view job cannot fit in 2 h on A10G no matter what. |
| 20 | 1 | **Right-size the GPU per job**: L4 or A10G for under 2,000 views, A10G for mid, A100 for over 5,000 views at 1920 px. The dispatcher picks from the view count. | A100 costs twice as much per hour and finishes twice as fast; on big jobs it is the same money with no timeout risk. |
| 21 | 1 | **Upload path for multi-gigabyte captures**: multipart resumable upload from the operator dashboard to R2, content hash as the object key so the same capture is never stored or processed twice. | An 8K walk is 6 GB. A failed browser upload today means starting over. |
| 22 | 1 | **Alerting.** Failure callback also sends an email or SMS to the operator with the stage, the error and the dollars spent so far. | Silent failures are the desktop's worst habit; the cloud must not inherit it. |
| 23 | 1 | **Job table fields (additive migration):** recipe version, checkpoint key and step, GPU seconds, estimated and actual dollars, stage timings. The manifest carries recipe version too. | Without these you cannot bill, cannot calibrate the estimate, and cannot prove which recipe made which model. |
| 24 | 2 | **Retention policy:** raw captures, SfM database and PLY kept in R2 for the access term; SPZ and manifest kept indefinitely. R2 has no egress fees, so archive is cheap and reprocessing stays free. | "Free reprocessing forever" is only true if the inputs are kept. |
| 25 | 3 | **Operator cost preview before Run:** estimated GPU hours and dollars from view count and recipe, with a per-job ceiling the run cannot exceed. | Nobody should learn the price of a job from the invoice. |
| 26 | 4 | **Model size gate for delivery:** SPZ over about 60 MB gets a decimated mobile variant and a poster; the share viewer picks by device. | A 300 MB splat is a beautiful model nobody on a phone can open. |

Reliability verdict, stated plainly. The cloud path will be more reliable than the desktop once phase 1 lands, because it has no kernel crashes, no sleep, no shared GPU and no Next.js process in the loop. The cost of a restart is then bounded by the checkpoint cadence: 750 steps is about two and a half minutes of A10G time. The four things that would still drive up fees are training bad captures, unbounded parallel containers, jobs that outrun their timeout, and re-running SfM for train-only changes. Items 16, 14, 19 and 15 close those in that order.

Do not treat that verdict as true **today**. Today a cloud run that hits two hours loses the weights and never fails the job row. Phase 1 is the difference.

---

## I. Adjustments to section H (same day, after review)

Keep all twelve items. Change how a few of them are built so they do not create new cost or block overnight desktop runs.

| # | Keep | Adjustment |
|---|---|---|
| 15 Stage cache | Yes | Hash **extracted frames + recipe**, not the 8K file (hashing a 6 GB MOV on every Run is its own bill). Desktop already skips frames/mask when outputs exist (`pipeline.py`); the real gap is SfM/views/train. Phase 0 = do not wipe those folders. Content-addressed cloud cache is phase 1. |
| 16 Refuse gates | Yes | **80% registered = hard fail**, 90% = warn. Outdoor mixed jobs will not always hit 90%. Smoke train: auto-continue if gates pass — do not wait for a human if the operator is away. Pause-for-review is a **cloud dashboard** state, not a desktop overnight halt. |
| 17 Sharpest frame | Yes | Pick the sharpest of **3–5** candidates per sample, not AirVis's 25. Twenty-five 8K Laplacian scores per half-second will make the frames stage more expensive than the savings. |
| 18 Golden set | Yes | Kitchen + **first backyard crop** `8fb02e4e` yard2. HQ `91b7d4bd` is not accepted (same skeleton, softer walk). Stadium stays out until an oblique retrain. Score = holdout PSNR **and** SSIM vs a checked-in screenshot; a human still glances at the pair. |
| 19 Timeout | Yes | Timeout = `min(needed × 1.2, cost_ceiling_hours)`, not a blanket 24 h. A 24 h A10G job is ~$26. Checkpoints are crash safety; the ceiling is the bill. |
| 20 GPU pick | Later | Default **A10G** until one kitchen clip is timed on L4 and A100. "Twice the card, twice as fast, same money" is a guess. L4 may not hold a 1280 uint8 cache. Do not put L4 in the dispatcher before that measurement. |
| 21 Uploads | Yes | Twin already uploads to R2. Multipart resumable is for the operator dashboard when cloud is on. Content-hash keys must allow a genuine recapture of the same site (hash the bytes, not the project). |
| 22 Alerts | Yes | **Email first** (Resend is already in the app). SMS is extra vendor work — not a phase 1 blocker. |
| 23 Job fields | Yes | Additive migration only. Store **GPU seconds + recipe version + a versioned $/s table**. Do not write a dollar amount as the source of truth until Modal's usage API is wired. |
| 24 Retention | Yes, with a bill | R2 has no egress; **storage is not free** (~$0.015/GB-month). Policy: raw capture for the access term, SfM + PLY 90 days after delivery, SPZ + manifest kept. Not "keep every 6 GB walk forever." |
| 25 Cost preview | Yes | Same price table as billing. Ceiling is a **hard kill in the worker**, not a UI label. |
| 26 Mobile variant | Split | Spark already downsamples at load (`MOBILE_MAX_SPLATS`). Ship a **poster** in phase 4. A second decimated SPZ only if phones OOM **during decode** of the full file before downsample. 60 MB is a decode warning, not an automatic second train. |
| 27 Densify pause | Yes, now | Already patched in `ns_train_wrap.py`. Next backyard run is a 3k smoke on cached 1280 views; `gaussian_count` must rise above 383,657 before another 50k. Port the same clamp with the recipe into the cloud worker. |

Phase 0 on the desktop this week stays: campus mixed capture, `recipe.py`, checkpoint-by-step, mixed-path reachable, densify-pause clamp (item 27), do not spend Modal. Do **not** freeze the recipe on HQ. Items 15–18 start as Lab behavior (reuse stages, refuse-not-warn, sharper frames, kitchen + first-backyard golden). Items 19–23 land with the cloud port. 24–26 with products.

**First paid cloud job** remains a small kitchen clip, not a 7,712-view backyard, and not until the recipe is frozen **and** phase 1 checkpoints + timeout + memory are in the worker.

---

## J. HQ backyard result (2026-09-16, after 50k steps)

Do not treat HQ as the quality upgrade. Do not copy it over `public/preview/backyard.spz`.

| Job | Views | Steps | TensorBoard `gaussian_count` | Export splats | Cropped yard SPZ | Visual |
|---|---|---|---|---|---|---|
| First `8fb02e4e` | 7,712 @ 1024 | 74,750 (resume bug) | **383,657 frozen** | 317,349 | 3.8 MB / ~218–227k | Accepted guest crop |
| HQ `91b7d4bd` | 7,712 @ 1280 | 49,999 from 0 | **383,657 frozen** | 298,396 | 4.3 MB / 228,148 | Softer dollhouse, smeared walk |

`densify_grad_thresh=0.0002` and `stop_split_at=42500` were in `config.yml`. They did not matter. Root cause: splatfacto sets `pause_refine_after_reset = n_images + refine_every` (7,812 on this walk). gsplat densifies only when `step % reset_every >= pause`, and `reset_every` is 3,000, so the comparison is never true. The 3.8M cap was unused because **no gaussian was ever split**.

What this changes in the plan:

1. Kill-shot **27** (pause clamp in `ns_train_wrap.py`) before any recipe freeze or MCMC (item 13). MCMC is still how you get a predictable 3–4M cap; splatfacto has to densify at all first.
2. Item 16's 3,000-step smoke train would have caught this in ten minutes. Run it on the next backyard retrain: `gaussian_count` must rise above the COLMAP seed before spending another 50k.
3. CPU-stage cache (item 15) is how the next retrain stays cheap: reuse SfM + 1280 views, train only, with the pause clamp on.
4. Reliability of the cloud vs desktop is unchanged. Quality of the cloud will copy this bug if the worker uses stock splatfacto on walks with thousands of views.

Phone / GitHub: keep the first yard2 SPZ. HQ stays local for diagnosis. A retrain that actually grows gaussians is the publication gate.
