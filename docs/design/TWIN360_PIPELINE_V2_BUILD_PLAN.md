# Twin 360 — Pipeline V2 Master Build Plan

Status: **READY TO EXECUTE** (Phase 0 unblocked; Phases 1+ gated on §9 authorizations)
Date: 2026-07-25 · Owner: Sonnet 5 (execution) · Approver: Brian
Supersedes the sequencing in `TWIN360_PIPELINE_V2_DECISION.md`; that doc remains the source for
raw verified findings. Current-state reference: `docs/research/TWIN360_CURRENT_STATE_REPORT.md`.

**Goal:** highest-quality, metrically-accurate digital twins from cheap gear (iPhone + LiDAR,
360 cameras, consumer drones), processed fast in the cloud, exported as versatile deliverables.

---

## PART A — Research reconciliation (read before trusting any external research)

Four independent research passes were run (three external AI assistants + this repo's own
source-reading agents). They **conflict on load-bearing facts.** Adjudication below; where sources
disagree, the ruling is the one verified by reading upstream source/LICENSE files directly.

### A1. Confirmed corrections — external research contained errors

| Claim | Ruling | Evidence |
|---|---|---|
| "LightGlue is non-commercial / banned" | **FALSE — LightGlue is Apache-2.0**, code *and* matcher weights | LICENSE file read directly. The confusion is with **SuperGlue** (Magic Leap, non-commercial) and **SuperPoint weights** (Magic Leap, non-commercial). LightGlue ≠ SuperGlue. **Do not ban LightGlue.** |
| "Nerfstudio latest is 1.4.1" | **FALSE — latest release is 1.1.5 (2024-11-11)**, no release in ~20 months | PyPI JSON + GitHub releases page. 3 of 4 sources agree. There is no 1.4.x. |
| "DN-Splatter is MIT" | **FALSE — Apache-2.0** | LICENSE file read directly |
| "`pose_prior_mapper` landed in COLMAP 3.12.0" | **FALSE — 3.11.0** | Fetched `src/colmap/exe/colmap.cc` at each tag and grepped registered commands: absent at 3.10, present at 3.11.0. 3 of 4 sources agree. |
| "`--Mapper.use_prior_position` is the enabling flag" | **FALSE — no such CLI flag.** `pose_prior_mapper` sets it in code | `option_manager.cc` grep for "prior" returns only license boilerplate |

**Lesson for Sonnet 5: never accept a flag name or license from a research summary. Verify against
upstream source before writing it into the worker.**

### A2. Cross-source consensus (safe to build on)

- **COLMAP:** `pose_prior_mapper` = 3.11.0; gravity priors = 4.0.0; EXIF gravity extraction = 4.1.1;
  upstream latest 4.1.1 (2026-07-17). Debian bookworm 3.8-1 / trixie 3.10-2 — **both too old.**
- **Priors are position + gravity only.** No full-rotation/quaternion prior exists. Do not design
  around one.
- **Priors live in the `pose_priors` SQLite table**, written either automatically from EXIF GPS at
  `feature_extractor`, or programmatically via pycolmap `Database.write_pose_prior()`.
- **gsplat exposes differentiable depth natively** — `render_mode` ∈ {`"D"`, `"ED"`, `"RGB+D"`,
  `"RGB+ED"`}, depth in the last channel, gradients flow. **All four sources agree.** This is the
  sanctioned route to LiDAR depth supervision.
- **DN-Splatter is a dead end for us:** Apache-2.0 but pins `nerfstudio==1.1.3` + `gsplat==1.0.0`;
  incompatible with our gsplat 1.4.0 and dormant since Nov 2024.
- **Mesh license trap:** SuGaR, 2DGS, GOF, RaDe-GS all inherit the **Inria/MPII non-commercial
  Gaussian-Splatting license**. GS2Mesh's own code is Apache-2.0 but links the Inria library →
  combined work is still non-commercial. **All excluded.** Clean: `ns-export tsdf` (Apache-2.0),
  **Open3D (MIT)**.
- **`ns-export poisson` requires a normals-predicting model** (`nerfacto --predict-normals`); it
  does **not** work with vanilla splatfacto. Use `tsdf`, or Open3D.
- **Floor plan clean stack:** Open3D (MIT) + Shapely (BSD-3) + ezdxf (MIT). **SpatialLM weights are
  CC-BY-NC** (2 of 3 sources; treat as non-commercial). **CGAL is GPL/commercial** — excluded.
  RoomFormer code is MIT but checkpoint/training-data rights are uncertain — architecture only.
- **`--images-per-equirect` accepts exactly 8 or 14.**

### A3. Unresolved conflicts — resolve empirically, do not guess

1. **Matcher benchmark numbers disagree wildly across sources** (e.g. ScanNet-1500 AUC@5 for
   EfficientLoFTR reported as 19.2, ~33.5, and 58.4). Cause: different protocols (zero-shot vs
   in-domain training, RANSAC vs LO-RANSAC, resolution). **The absolute numbers are not
   comparable and must not be quoted to anyone.** What *is* consistent across all four sources is
   the **ordering**: dense/semi-dense (RoMa > EfficientLoFTR > LoFTR) beats sparse
   (ALIKED+LightGlue, XFeat) on textureless indoor, by a wide margin. Build on the ordering; measure
   our own numbers on our own captures.
2. **Runtime/VRAM tables also disagree.** The best-sourced set (ICCV 2025, RTX 3090):
   ALIKED+LG 51 ms / 1.63 GB · XFeat 71 ms / 0.64 GB · EfficientLoFTR 121 ms / 7.04 GB ·
   LoFTR-DS 296 ms / 6.97 GB · RoMa 1557 ms / 14.8 GB. **Treat as order-of-magnitude only** and
   re-measure on the A10G. Note EfficientLoFTR at 121 ms × 7.5k pairs ≈ 15 min is *affordable* at
   modest resolution — better than earlier estimates suggested.
3. **AGS-Mesh license is ambiguous** (Apache-2.0 within dn-splatter vs "no root license" standalone
   vs "research-only"). **Do not build on it** until legal review.
4. **Whether pycolmap on PyPI exposes the pose-prior write API and mapper** — one source cites
   pycolmap PR #3123 as exposing incremental-mapper pose-prior options. **Verify in Step P1a-1;
   this decides the cheapest route to a modern COLMAP.**
5. **DIM's `uv.lock` pins torch 2.7.1** while our worker runs torch 2.4.1. `pyproject.toml` leaves
   torch unpinned, so it may work — **verify before adopting DIM**, or use hloc instead.
6. Reported `--crop-bottom` inversion bug in some nerfstudio builds — test, don't assume.

---

## PART B — Target architecture

```
                    ┌─ iPhone (ARKit poses + LiDAR + video/stills)
  CAPTURE ──────────┼─ 360 camera (equirect stills/video)
                    └─ Drone (stills/video + EXIF GPS)
                                  │
  1. INGEST      sharpness frame selection · equirect unwrap + nadir mask · EXIF/pose extraction
  2. PAIRS       sequential window + pose-prior spatial pairs + retrieval loop closure
  3. MATCH       ALIKED+LightGlue → XFeat union → EfficientLoFTR rescue (failed pairs only)
  4. PRIORS      ARKit position+gravity → pose_priors table  |  drone EXIF GPS → auto-populated
  5. MAP         colmap pose_prior_mapper        [fallback: today's ns-process-data path]
  6. TRAIN       gsplat: init_type=lidar + depth loss + MCMC  [interim: splatfacto + free flags]
  7. CLEAN       SOR → percentile crop → cap → log-space scale bake → spike clamp   (UNCHANGED)
  8. EXPORT      SPZ v3 · PLY · Open3D TSDF mesh (GLB) · vector floor plan (SVG/DXF) · areas
```

**The unifying insight:** all three capture devices feed *the same* mapper. iPhone priors come from
ARKit; drone priors come free from EXIF GPS (COLMAP auto-populates `pose_priors` at
`feature_extractor`); 360 becomes perspective crops before SfM. One alignment backend, three input
classes. That is what makes cheap heterogeneous gear work.

**Why pose priors are the structural fix** (not just a quality tweak): they make metric scale and
gravity *native to the solve* instead of recovered afterward, which deletes two entire bug classes
— the run-to-run `residual_too_high` scale instability and the floor-PCA upside-down failures. The
old "bypass" arm failed (PSNR 9.5–14.7 vs 23.3) because it *replaced* COLMAP with raw poses, so a
bad frame→keyframe assignment became ground truth. Priors enter bundle adjustment as
**covariance-weighted residuals under a robust loss** — a bad prior gets down-weighted, not
believed. Different mechanism, different failure mode.

---

## PART C — Phased build plan

### Execution rules for Sonnet 5 (read first)

1. **Verify every flag against upstream source before writing it.** See §A1.
2. **Every pipeline change ships as an A/B arm**, never as a replacement. Today's behavior stays the
   default until an arm beats it on the benchmark set.
3. **R7.5 visual gate is mandatory.** Metrics are necessary but never sufficient — open the share
   link in a browser and compare visually before promoting any arm. A metrics-only pass has already
   shipped a regression once (the log-scale "giant blob" bug hid behind healthy-looking PSNR).
4. **Deploy discipline:** edited `workers/modal/**` → `cd workers/modal/twin-gaussian-splat && PYTHONIOENCODING=utf-8 python -m modal deploy worker.py`. Edited `src/trigger/**` → `PYTHONIOENCODING=utf-8 npx trigger.dev@latest deploy`. Both, if both changed.
5. **Never `git add .`** — stage explicit paths. Commit after each verified step so Brian gets a
   live deploy. Design-token rules and `guard:*` scripts still apply to any UI work.
6. **`worker.py` is already ~2,730 lines and will grow.** Before Phase 1, split it into a package
   (`worker.py` entry + `pipeline/{ingest,align,train,clean,export,callback}.py`). Do this in P0d.
7. **Benchmark set** (use for every arm): the PSNR-28.97 phone walk (regression guard), the car
   interior (hard case), the iPhone+X4 dual capture (360), a drone set if available.
8. When a step is blocked, **complete everything else in the phase and report the blocker** — do
   not stall the whole phase.

---

### PHASE 0 — Unblocked wins (no authorizations needed)

**P0a · Upload integrity** — *the biggest user-visible win in this plan*
- Files: `app/api/digital-twin/upload/**`, `lib/twin/**`, `src/trigger/twin-gaussian-splat.ts`
- Add SHA-256 content fingerprint at registration; make asset registration **idempotent** on
  `(capture_id, fingerprint)`; GC stale `uploading` rows (age-based, additive migration for the
  fingerprint column); **refuse job enqueue while any asset on the capture is not `ready`**.
- Root cause being fixed: one 262.9 MB video registered **3×** (two `ready`, one stuck `uploading`
  with NULL `storage_key`); the job then ran on an incomplete triplicate set and a ~1-min video
  took 25+ minutes to import.
- Accept: re-submitting the same file twice creates one asset row; a job cannot start with a
  pending asset; the dual-camera capture imports in <10 min.

**P0b · 360 detection + nadir masking**
- Replace the filename heuristic at `lib/twin/twin-review-media.ts:37` with **stream aspect ratio
  ≈2:1** (ffprobe for video, image dims for stills). GPano XMP is confirming-only — Insta360 Studio
  strips it on export.
- Ingest: unwrap equirect → perspective before SfM. Nadir/operator handling: **author the mask in
  equirectangular coordinates and reproject it with the same yaw/pitch/FOV/crop as the perspective
  cut (nearest-neighbor), then pass per-image masks to COLMAP via
  `--ImageReader.mask_path`** (convention: image `abc/012.jpg` → mask `abc/012.jpg.png`, black =
  excluded). Prefer this over blunt `--crop-bottom`, which also erases useful floor geometry.
- If using nerfstudio's converter instead: `--camera-type equirectangular --images-per-equirect
  {8|14}` (only those two values), `--crop-factor top bottom left right`.
- Accept: a real X4 file is detected without filename hints; operator/tripod does not appear in the
  model; floor geometry survives.

**P0c · Training free-flag arm** — *cheapest quality experiment available; run first*
- All confirmed present in `SplatfactoModelConfig` at the v1.1.5 tag:
  - `--pipeline.model.use-bilateral-grid True` ← **highest-value unused flag.** iPhone
    auto-exposure/WB drift across a walk is a primary floater source; the grid absorbs photometric
    variation instead of letting Gaussians bake it in as geometry.
  - `--pipeline.model.rasterize-mode antialiased`
  - `--pipeline.model.camera-optimizer.mode SO3xR3` ← **defaults to `off`**; our poses are handheld
  - `--pipeline.model.densify-grad-thresh 0.0005` (from 0.0008) for textureless-wall holes
  - `--pipeline.model.max-gauss-ratio 5.0` (from 10.0) to cut needle/spike artifacts on glass
- **Remove the no-op:** `--pipeline.model.cull-alpha-thresh 0.1` is the 1.1.5 default and changes
  nothing. The worker comment calling it an "explicit conservative cull" is wrong — fix the comment
  or raise the value to 0.15 deliberately.
- Accept: A/B vs current on all benchmarks; PSNR and visual floater count both improve or are
  neutral; no regression on the 28.97 capture.

**P0d · Pluggable backends + worker modularization**
- Split `worker.py` into a package (see rule 6). Introduce `ALIGN_BACKEND` ∈
  {`colmap_vanilla`, `colmap_pose_prior`, `colmap_learned_match`} and `TRAIN_BACKEND` ∈
  {`splatfacto`, `gsplat_lidar`}, selectable by env **and** job payload.
- Extend `scripts/ops/dispatch-twin-experiment.mjs` with `--align-backend` / `--train-backend`.
- Record the active backends in `quality_metrics` so every model row is self-describing.
- Accept: `colmap_vanilla` + `splatfacto` reproduces today's output byte-comparably in structure;
  new arms dispatch without a worker fork.

**P0e · Capture SOPs per device** — *zero code; this is what makes cheap gear work*

Practitioner consensus, not controlled studies — label as guidance, not guarantees. Publish as
in-app capture coaching + a short field doc.

| Device | SOP |
|---|---|
| **iPhone (LiDAR)** | 0.5–0.8 m/s, pause ~1 s at corners/doorways, 70–80% overlap, lock AE/WB, no HDR, all lights on, landscape. (Already documented — keep.) |
| **DJI Mini-class drone** | **Stills beat video** (rolling shutter is the quality killer on consumer drones — all three passes agree). ≥80% forward / 60–70% side (85/80 for best). Nadir grid **plus** oblique facade orbits at 30–45° — nadir alone reconstructs walls poorly. Low/mid/high orbit rings. Fast shutter, fixed WB. If shooting video: slow smooth flight, ~1/1000 s, highest bitrate, extract 1–3 sharp frames/s, reject turns and stationary redundancy. |
| **Antigravity A1 (360 drone)** | 8K/30 in daylight, 5.2K/60 when light is weak; shutter 1/2000 bright, 1/1000 overcast; EV −0.7, auto ISO, fixed WB; H.265 high bitrate. Low orbit ~1–1.5 m AGL close to walls, mid orbit ~2–3 m, roof snake, context spiral at ~2× building extent. 3–5 min clip, return near start for loop closure. **Hard limit: obstacle avoidance cannot be disabled → 5–7 m standoff, so close-detail facade work is out of reach. Exteriors only.** Note its 30–50% "adjacent lane" overlap figure is for continuous full-sphere video and is **not** comparable to still-photo overlap. |
| **Insta360 X4/X5 (indoor)** | 8K/30 daylight interiors, 5.7K/60 under artificial light; H.265 high bitrate; fixed WB. **Upload raw `.insv` where supported** — do not convert/rename. If exporting stitched MP4: **Direction Lock ON**, and **disable Horizon Leveling, Tilt Recovery, and Vibration Reduction** (stabilization warps equirect frames and injects geometric noise). 0.5–1 m standoff, 1–1.5 m/s walk, low/mid/high perimeter + diagonal centre pass + reverse mid pass, 2–4 min continuous loop. Mask the operator/nadir rather than blanket-cropping the floor. *(Unresolved conflict across sources: shutter 1/500 vs 1/800–1/1000, and sharpness Low vs High — test both on a benchmark capture.)* |
| **Drone exterior + phone interior bridge** | Capture a **continuous transition through an open doorway**: approach obliquely from several exterior positions, slow through the threshold, see both adjacent spaces in the transition frames, then loop the vestibule before branching inward. Open doors before capture and don't move them. Add ground-level exterior phone/360 passes overlapping the drone facade — this is the practical substitute for synthetic intermediate views. **Never bridge through glass** (reflection/transmission creates false geometry). Caveat: a peer-reviewed 360-bridge experiment measured **4–6× worse metric accuracy** than perspective imagery — use panorama bridges for *orientation*, not for measured geometry. No turnkey open-source aerial↔interior merge exists; expect separate registration plus Sim3 alignment on doorway control points. |

Accept: SOPs published; in-app coaching reflects them; each device has at least one benchmark
capture shot to SOP for the A/B set.

---

### PHASE 1 — Pose-prior-anchored alignment (the structural fix)

**P1a · Modern COLMAP in the Modal image** — *hard prerequisite; nothing else in Phase 1 works first*
- Routes in order of preference:
  1. **pycolmap from PyPI** — verify it exposes `Database.write_pose_prior()` / `PosePrior` **and**
     a reachable pose-prior mapper (one source cites pycolmap PR #3123). Cheapest if true.
  2. Debian **sid** package (4.0.4-4) — fast, but watch dependency conflicts against a stable base.
  3. **Build COLMAP 4.1.1 from source** in the image — most reliable; +15–30 min build, layer-cached.
- Target **4.1.1**, not 3.11 — 4.x is required for gravity priors (`PosePrior::gravity`, added 4.0.0)
  and `global_mapper`.
- Accept: `colmap pose_prior_mapper -h` and `colmap global_mapper -h` both succeed in the image;
  existing `colmap_vanilla` arm still passes the regression benchmark.

**P1b · Prior writer**
- Map ARKit keyframes → registered COLMAP images (reuse the existing frame↔keyframe time matcher,
  0.25 s tolerance). For each image write `position` (ARKit translation) + `position_covariance` +
  `gravity` into `pose_priors`.
- **Covariance must be driven by ARKit tracking state, not hardcoded.** Apple publishes no
  covariance and no enum→σ mapping exists in the literature — the table below is a **tuned
  starting point (INFERRED)**, derived from two independent research passes that both anchor on the
  Sensors 2022 VIO benchmark (~0.02 m/s ARKit relative drift). Tune on the benchmark walks.

  | `ARCamera.TrackingState` | Starting σ_xyz (m) |
  |---|---|
  | `.normal`, continuous walk | 0.03–0.08 |
  | `.limited(.insufficientFeatures)` | 0.3–1.0 |
  | `.limited(.excessiveMotion)` | 0.5–2.0 |
  | `.limited(.initializing)` / `.limited(.relocalizing)` | **omit the prior entirely** (relocalization can jump the world frame) |
  | First ~1 s after relocalization / interruption | 0.2–0.5, then tighten |

- **Drift-growth term (important):** ARKit position error is a random walk, so absolute positions
  late in a walk are wrong *relative to* early ones even while tracking stays `.normal`. Inflate
  σ ∝ √t (or √distance) from session start, or per-clip from the last loop closure. Without this,
  uniformly tight priors will fight true geometry on long walks.
- **iOS 26.4+ LiDAR drift regression — confirmed independently by two research passes**
  (Apple Developer Forums threads 827240, 833040): reproducible cumulative drift in
  `ARCamera.transform` on **LiDAR devices only**, accumulating with walking distance, absent when
  stationary, present on iPhone 14/15/16/17 Pro and iPad Pro, **no config workaround**, Apple
  investigating with no published fix timeline. Mitigation: detect `iOS ≥ 26.4 && hasLiDAR` and
  apply a global covariance inflation multiplier (start ×2–3); log it in `quality_metrics` so the
  multiplier can be retired when Apple ships a fix. **This regression strengthens the case for
  priors-with-robust-loss over any pose-trusting approach** — it is precisely why the old bypass
  arm could never work on current iOS.
- Drone path: nothing to write — COLMAP auto-populates `pose_priors` from EXIF GPS at
  `feature_extractor`. Verify this fires on the ASU dataset.
- Accept: `pose_priors` row count == registered image count (minus deliberately omitted
  relocalizing frames); covariance varies with tracking state and grows with walk length; a
  deliberately corrupted prior does not wreck the reconstruction.

**P1c · `pose_prior_mapper` arm**
```
colmap pose_prior_mapper \
  --database_path <db> --image_path <images> --output_path <existing dir> \
  --overwrite_priors_covariance 0 \
  --use_robust_loss_on_prior_position 1 \
  --prior_position_loss_scale <tune> \
  [--prior_position_std_x/y/z <only if overwriting covariance>]
```
- Flags are **unprefixed** (registered by `RunPosePriorMapper`, not `AddMapperOptions()`).
  `--output_path` must be an **existing** directory. Defaults for std_x/y/z are 1.0 m — far too
  loose for ARKit; either pass per-image covariance (preferred) or tighten these.
- Fallback: on failure, fall through to `colmap_vanilla` so a job never dies from this.
- Accept: **scale applied on 100% of runs** (kills the `residual_too_high` instability),
  `up_axis == Y_UP_MEASURED` on 100% of runs (kills PCA guessing), PSNR ≥ current on the
  regression capture, visual gate passed.

**P1d · `global_mapper` gravity arm (secondary experiment)**
- `colmap global_mapper --GlobalMapper.ra_use_gravity 1 --GlobalMapper.ra_use_stratified 1`
- Note: `RunGlobalMapper` does **not** call `AddMapperOptions()`, so **no position-prior flags
  apply** — gravity only, no metric scale. Value here is speed and global rotation consistency.
- Accept: measured wall-clock vs incremental; promote only if faster at equal quality.

---

### PHASE 2 — Learned matching

**P2a · ALIKED + LightGlue default arm**
- Integration layer: prefer **hloc (Apache-2.0)** over deep-image-matching — DIM's *default*
  pipeline uses Magic Leap SuperPoint and its README explicitly disclaims component licensing
  ("for the licence of individual local features and matchers please refer to the authors'
  original projects"); the wrapper's BSD-3 does not launder components. If DIM is used anyway, pin
  `--pipeline aliked+lightglue` explicitly and check its torch pin (lock file says 2.7.1 vs our
  2.4.1).
- **DIM unlinks and recreates `database.db`.** If used, run `--skip_reconstruction` first, inject
  priors second, then run `pose_prior_mapper` — priors written before DIM are lost.
- Pair selection: sequential window (k≈10) + **pose-prior spatial pairs** + retrieval loop closure
  (MegaLoc / NetVLAD / CosPlace / EigenPlaces, all MIT). **Never exhaustive.**
- Accept: ≥ vanilla SIFT registration rate on all benchmarks; matching wall-clock ≤ 15 min;
  peak VRAM ≤ 8 GB (must not contend with training).

**P2b · XFeat union + prior-based pair gating**
- Union XFeat (Apache-2.0) matches on frames where ALIKED yields few keypoints/inliers. Note
  `xfeat+lighterglue` is **master-only** in DIM, not in the 2.0.0 release.
- **Repetitive-structure gate:** reject any candidate pair whose matched relative pose disagrees
  with the ARKit prior beyond threshold (>1.5 m translation or >30° rotation after scale
  alignment). This is the top-recommended mitigation for corridor-collapse on identical
  doors/tiled floors, and it is free once priors exist.
- Accept: measurable gain on textureless benchmarks; zero corridor-collapse on the hard case.

**P2c · EfficientLoFTR rescue tier**
- Apache-2.0 (code and model card). Apply **only to pairs failing geometric verification**, at
  reduced resolution.
- **Watch the hidden cost:** semi-dense matchers emit per-pair coordinates with no global keypoint
  IDs; quantizing into a COLMAP database inflates it and can slow the mapper more than matching
  itself. Measure DB size and mapper time, not just match time.
- **Excluded:** RoMa (MIT code, but ~1557 ms/pair and ~14.8 GB — unaffordable), MASt3R/DUSt3R
  (CC-BY-NC), StreamVGGT (CC-BY-NC), SALAD retrieval (GPL-3).
- Accept: rescues ≥50% of previously-failed pairs; total job time still within budget.

---

### PHASE 3 — Training rebuild

**P3a · Vendor gsplat trainer; LiDAR init + MCMC**
- **Vendor** `examples/simple_trainer.py` into `workers/modal/twin-gaussian-splat/` and pin — it is
  an examples script with no API stability guarantee. Apache-2.0 permits this; add attribution.
- Gains: `init_type="lidar"` (direct LiDAR PLY seeding), `MCMCStrategy` (**already in our gsplat
  1.4.0** — no bump needed), `post_processing="bilateral_grid"`.
- What we lose from `ns-train`: dataparsers (we have COLMAP poses), `ns-viewer`, `ns-export`
  (write PLY ourselves), `ns-eval` (PSNR is trivial), camera optimizer.
- **If staying on nerfstudio instead:** `splatfacto-mcmc` is **main-branch only** (added Jan 2025,
  #3548) — requires a git install, and `ns-train splatfacto-mcmc` ≠ `--strategy mcmc` (the named
  method also sets `cull_alpha_thresh=0.005`, `stop_split_at=25000`). Flags are renamed:
  `--pipeline.model.max-gs-num`, `--mcmc-opacity-reg`, `--mcmc-scale-reg`, `--noise-lr`.
- Accept: parity or better vs P0c on all benchmarks before anything else changes.

**P3b · LiDAR depth supervision** — *the documented "biggest floater-killer"*
- Use gsplat's native differentiable depth: `rasterization(..., render_mode="RGB+ED")`, depth in
  the last channel, gradients flow. Write a custom loss (Huber or LogL1 on valid pixels only).
  **All four research sources independently confirm this path.** Do **not** adopt DN-Splatter.
- Start with the fused LiDAR PLY; per-frame depth is materially stronger (see P3d).
- Mask invalid/low-confidence depth; respect ARKit's 0.1–8.0 m valid range.
- Accept: measurable floater reduction (compare SOR removal counts and visual gate) at equal PSNR.

**P3c · gsplat 1.4.0 → 1.5.3**
- Buys SelectiveAdam (`visible_adam`, Taming-3DGS) and faster rasterization. Verify torch/CUDA
  compatibility before bumping; gsplat main requires torch ≥2.7, but the 1.5.3 **release** should
  work with our 2.4.1 — confirm against the wheel index.
- Accept: no quality regression; measured speedup.

**P3d · Capture-side: retain per-frame depth (native, needs TestFlight)**
- Today the plugin persists only a fused 2 cm-voxel PLY with **grey placeholder color** — not
  per-frame `sceneDepth`, and no per-point RGB. Both limit P3b's ceiling.
- **Format — adopt the de-facto standard** (StrayScanner / Polycam polyform both use it, confirmed
  by two research passes): depth as **lossless 16-bit PNG in millimetres** at the **native 256×192**
  (do NOT upscale on device), confidence as **8-bit PNG** with ARKit's three levels. Record3D's
  alternative is LZFSE-compressed float32 metres. **Keep depth lossless** — 8-bit quantization over
  the 5 m range is a ~2 cm step, which erases the very LiDAR precision we are trying to exploit.
  Bonus: nerfstudio ingests Polycam and Record3D layouts directly, so matching one gives a free
  ingestion path.
- **Storage impact — size this against the P0a upload work.** Estimates (arithmetic, not measured;
  both passes agree on order): depth+confidence as PNG ≈ **50–100 MB/min** on top of the existing
  ~32 MB/min HEVC. That is a **2–4× increase in upload volume**, so P0a's resumable/idempotent
  upload path is a hard prerequisite. Mitigation: persist depth at 10–15 Hz while RGB stays at
  30 fps (depth changes slowly relative to appearance).
- Also sample per-point RGB from the paired video frame to replace the grey placeholder.
- Accept: depth-supervised arm using per-frame depth beats the fused-PLY arm; upload of a 2-minute
  capture with depth still completes reliably on cellular.

---

### PHASE 4 — Deliverables (what makes it usable)

**P4a · Bake** — apply `edit_list` destructively server-side → new model version. Today's edits are
non-destructive overlays that never reach downloads ("the downloaded file still has the mess").

**P4b · Mesh export** — **Open3D 0.19.0 (MIT) `ScalableTSDFVolume` → Marching Cubes from posed
LiDAR/depth.** **Do not use SuGaR/2DGS/GOF/RaDe-GS/GS2Mesh** (Inria non-commercial).
`ns-export tsdf` (Apache-2.0) is an acceptable secondary; `ns-export poisson` will **not** work with
splatfacto (it needs a normals-predicting model such as `nerfacto --predict-normals`).

Verified parameters (both research passes agree):
```python
volume = o3d.pipelines.integration.ScalableTSDFVolume(
    voxel_length=0.012,        # iPhone-grade; tutorial default 4.0/512 = 7.8 mm is too fine
    sdf_trunc=0.04,            # ~2-4x voxel_length
    color_type=o3d.pipelines.integration.TSDFVolumeColorType.RGB8,
    volume_unit_resolution=16, depth_sampling_stride=4)
rgbd = o3d.geometry.RGBDImage.create_from_color_and_depth(
    color, depth, depth_scale=1000.0, depth_trunc=5.0, convert_rgb_to_intensity=False)
volume.integrate(rgbd, intrinsic, extrinsic)   # extrinsic = world-to-camera
mesh = volume.extract_triangle_mesh(); mesh.compute_vertex_normals()
```
- **`depth_scale` gotcha:** millimetre PNG depth (Polycam/StrayScanner style, and our P3d choice)
  → `depth_scale=1000.0`. Float32-metre depth (Record3D style) → `depth_scale=1.0`. Getting this
  wrong silently produces a mesh 1000× the wrong size.
- Filter confidence below `medium` before integrating; `depth_trunc=5.0` matches the LiDAR range.
- **Color:** `RGB8` gives per-vertex colors from Marching Cubes. **There is no built-in UV-atlas
  bake** — a textured mesh needs a separate xatlas unwrap + posed-image projection step. Scope
  vertex-color first; treat UV texturing as a follow-on.

**P4c · Vector 2D floor plan + areas** — Open3D RANSAC plane extraction → Shapely/GEOS topology →
**SVG with explicit physical viewport + DXF with `$INSUNITS=6` (meters)** via ezdxf (MIT).
Preserve raw metric coordinates end-to-end. Floor area by shoelace; wall area = L×H − openings.
Apply the locked **"Mark Gaps, Don't Fake Completion"** rule (captured = solid, uncaptured = amber
hatch, never fabricated) and the measured/estimated/inferred tier badges.

**P4d · Accuracy statements** — published iPhone-LiDAR studies (2024–2026) cluster at
**RMSE ≈ 0.042–0.053 m room-scale** (one façade study at 0.136 m), vs TLS at 0.014–0.045 m; error
grows with distance/scan size; glass and reflective surfaces dominate errors. **Defensible customer
language: "±2–5 cm typical at room scale; estimating-grade, not survey-grade; verify long diagonals,
openings, and fabrication-critical dimensions with a laser."** Never claim permit-grade.

**P4e · Exports + embed** — `.ply`, `.glb`, point cloud (LAS/LAZ via laspy, LAZ backend **lazrs
(Apache-2.0), not laszip (LGPL)**; PDAL BSD-3; E57 via libE57Format 3.3.0, BSL-1.0), keep `.spz`
v3 for the viewer. OpenUSD 26.03 ships `UsdVolParticleField3DGaussianSplat` + a PLY→USD script if
USD export is wanted later. `/embed/twin/{token}` with CSP `frame-ancestors` opened for that route
only.

**Upgrade `@playcanvas/splat-transform` 2.7.1 → 3.1.6 (MIT, released 2026-07-21).** Two research
passes confirm v3.x adds capabilities that directly simplify our pipeline:
- **`--filter-floaters`** and **`--filter-cluster` (GPU)** — could replace or reinforce the Python
  SOR stage; note `scripts/ops/clean-spz-floaters.mjs` already uses `--filter-floaters` while the
  worker does not.
- **`--decimate`** — could replace the Python 2M-splat cap.
- **`.glb` output with `KHR_gaussian_splatting`** — a deliverable format we currently lack.
- ⚠️ **Hazard: v3 defaults SPZ output to v4.** Spark reads **v3 only** — this is exactly the bug
  that produced the 2026-06 SPZ v4 crisis. **Keep `--spz-version 3` explicit** and re-run
  `scripts/ops/verify-twin-spz.mjs` across the fleet after upgrading. Treat the version bump as its
  own A/B arm with the verifier as the gate.

---

## PART D — Progress tracker

Legend: ⬜ not started · 🟨 partial · ✅ code complete & verified · ⛔ blocked on Brian · ⏭️ deferred (see note)

### Phase 0 — Unblocked (no authorization needed)
- ✅ **P0a-1** SHA-256 fingerprint column (additive migration) + idempotent asset registration
- ✅ **P0a-2** GC for stale `uploading` rows (function + cron wiring; activates on migration apply)
- ✅ **P0a-3** Refuse job enqueue while any asset not `ready`
- ⛔ **P0a-4** Verify: duplicate submit → one row; dual-camera import <10 min
- ✅ **P0b-1** Aspect-ratio (~2:1) 360 detection replacing filename heuristic
- ✅ **P0b-2** 360-video unwrap + pitch rings (nadir excluded geometrically; true mask reprojection deferred)
- ⛔ **P0b-3** Verify on real X4 file: no operator, floor preserved
- ✅ **P0c-1** Add bilateral grid + antialiased + camera optimizer + densify/ratio flags
- ✅ **P0c-2** Remove/correct the no-op `cull-alpha-thresh`
- ⛔ **P0c-3** A/B on all benchmarks + **visual gate**
- ⏭️ **P0d-1** Split `worker.py` into a pipeline package
- 🟨 **P0d-2** `ALIGN_BACKEND` / `TRAIN_BACKEND` selectors + payload plumbing
- ✅ **P0d-3** Experiment-harness arms + backend recorded in `quality_metrics`
- ✅ **P0e-1** Capture SOPs published (iPhone / Mini-class / A1 / X4-X5 / bridge)
- ⬜ **P0e-2** In-app capture coaching reflects the SOPs
- ⛔ **P0e-3** One SOP-compliant benchmark capture per device class
- ⛔ **P0e-4** Resolve the X4 shutter + sharpness conflict empirically


### Phase 0 execution notes (2026-07-25)

- **P0d-1 (split `worker.py`) is DEFERRED into Phase 1 — deliberately.** Phase 1 rebuilds the
  align stage, which is the largest block in that file. Splitting a 2,700-line module now and
  restructuring the same code weeks later is duplicated work and duplicated regression risk, and
  the split cannot be runtime-verified from the dev container. Do it as the first step of P1a,
  where the new structure is known.
- **P0d-2 is partial:** the `TRAIN_BACKEND`-equivalent selector shipped as `TRAIN_PROFILE`
  (env var + per-job `trainProfile` payload override). `ALIGN_BACKEND` lands with P1a, since
  there is no second alignment backend to select between until COLMAP ≥4.0 is in the image.
- **P0a-2 is wired:** `gc_stale_digital_twin_upload_assets()` is called from
  `app/api/ops/cron/recover-stale-twin-jobs`, non-fatally — a missing RPC (migration not yet
  applied) logs a warning instead of breaking stale-job recovery.
- **P0b-2 shipped the load-bearing half.** 360 VIDEO was previously matched by the generic
  video branch *before* the is360 check, so equirect clips were cut into flat frames and fed to
  COLMAP as pinhole imagery — the actual "360 produces garbage" mechanism. 360 video now unwraps
  to perspective views, and unwrap rings gained pitch diversity (0, +/-35 deg). Nadir is excluded
  geometrically by never sampling straight down; a true reprojected mask via COLMAP
  `--ImageReader.mask_path` remains a follow-on (needs ns-process-data mask plumbing verified).
- Items marked ⛔ require a benchmark capture, GPU spend, or an on-device check — they cannot be
  closed from the dev container.

### Phase 1 — Pose-prior alignment ⛔ *gated on Modal-image authorization*
- ⬜ **P1a-1** Verify pycolmap pose-prior API (decides route)
- ⬜ **P1a-2** COLMAP 4.1.1 in the image; both commands respond
- ⬜ **P1a-3** Regression: `colmap_vanilla` unchanged
- ⬜ **P1b-1** ARKit keyframe → image mapping
- ⬜ **P1b-2** Write position + covariance + gravity to `pose_priors`
- ⬜ **P1b-3** Tracking-state-driven covariance table (omit priors while relocalizing)
- ⬜ **P1b-4** √t drift-growth inflation from session start / last loop closure
- ⬜ **P1b-5** iOS ≥26.4 + LiDAR global covariance multiplier, logged in `quality_metrics`
- ⬜ **P1b-6** Verify drone EXIF-GPS auto-population
- ⬜ **P1c-1** `pose_prior_mapper` arm + vanilla fallback
- ⬜ **P1c-2** Tune `prior_position_loss_scale`
- ⬜ **P1c-3** Gate: scale 100%, `Y_UP_MEASURED` 100%, PSNR ≥ baseline, **visual gate**
- ⬜ **P1d-1** `global_mapper` gravity arm + speed measurement

### Phase 2 — Learned matching ⛔ *gated on P1a*
- ⬜ **P2a-1** hloc (or pinned DIM) in the image; weights cached at build
- ⬜ **P2a-2** ALIKED+LightGlue arm
- ⬜ **P2a-3** Pair selection: sequential + spatial + retrieval
- ⬜ **P2a-4** Gate: registration rate, ≤15 min, ≤8 GB VRAM, **visual gate**
- ⬜ **P2b-1** XFeat union on sparse-keypoint frames
- ⬜ **P2b-2** Prior-based pair gating (repetitive-structure fix)
- ⬜ **P2c-1** EfficientLoFTR rescue tier on failed pairs
- ⬜ **P2c-2** Measure DB inflation + mapper slowdown

### Phase 3 — Training ⛔ *gated on Modal-image authorization*
- ⬜ **P3a-1** Vendor + pin gsplat `simple_trainer.py` (attribution)
- ⬜ **P3a-2** `init_type="lidar"` + MCMC arm
- ⬜ **P3a-3** PLY export parity with `ns-export`; PSNR eval reimplemented
- ⬜ **P3a-4** Gate: parity or better, **visual gate**
- ⬜ **P3b-1** Custom depth loss via `render_mode="RGB+ED"`
- ⬜ **P3b-2** Depth validity/confidence masking
- ⬜ **P3b-3** Gate: floater reduction at equal PSNR
- ⬜ **P3c-1** gsplat → 1.5.3 + SelectiveAdam; measure speedup
- ⬜ **P3d-1** Native: persist per-frame depth + per-point RGB *(TestFlight cycle)*

### Phase 4 — Deliverables
- ⬜ **P4a-1** Bake endpoint + Modal stage → new model version
- ⬜ **P4b-1** Open3D TSDF mesh from posed LiDAR
- ⬜ **P4b-2** Color projection from camera poses
- ⬜ **P4b-3** GLB export + SlateDrop registration
- ⬜ **P4c-1** RANSAC wall extraction → Shapely topology
- ⬜ **P4c-2** SVG + DXF (`$INSUNITS=6`) writers, metric preserved
- ⬜ **P4c-3** Floor/wall areas with openings; tier badges; gap hatching
- ⬜ **P4c-4** Surface the floor plan in the UI *(currently generated but has zero UI consumers)*
- ⬜ **P4d-1** Accuracy copy + disclaimers per §P4d
- ⬜ **P4e-1** `.ply` / `.glb` / LAS / E57 exports
- ⬜ **P4e-2** splat-transform 2.7.1 → 3.1.6 *(keep `--spz-version 3`; re-verify fleet)*
- ⬜ **P4e-3** `/embed/twin/{token}` + scoped CSP

**"Complete Twin 360" definition of done:** Phases 0–4 green, on-device iPhone verified, with a
single share link delivering 3D twin + 2D plan + measurements + downloadable mesh, from any of the
three capture devices.

---

## PART F — Execution model (how this actually gets built)

### Two parallel tracks

Phase 4 does **not** depend on Phases 1–3. Mesh export, floor plans, bake, and file exports operate
on whatever model the pipeline produces, so they can proceed while the alignment/training work is
blocked on authorizations. Run two tracks:

```
  TRACK A (quality):      P0 ──> P1 ──> P2 ──> P3        [blocked on Modal-image auth]
                            │
  TRACK B (deliverables):  └──> P4                        [unblocked after P0d]
```

If §E authorizations are slow, Sonnet 5 works Track B and does not sit idle.

### Where Sonnet 5 can run unattended vs. where it must stop

| Work type | Autonomy | Notes |
|---|---|---|
| Code changes, migrations, refactors, backend wiring | **Full** | Standard build work |
| Modal/Trigger deploys | **Full**, from an environment with credentials | Not from the dev container (§E2) |
| Running an A/B experiment arm | **Full** | ~20–40 min GPU per arm |
| **Promoting an arm to default** | **STOP — human required** | R7.5 visual gate is mandatory and cannot be automated |
| Anything touching entitlements/billing/Stripe/middleware/existing migrations | **STOP** | Forbidden edit zones (read-only) |
| Native iOS changes (P3d) | **STOP after code** | Requires Codemagic → TestFlight → Brian's device |
| Final acceptance | **STOP** | On-device iPhone verification, Brian only |

**Practical consequence: this is a build-then-verify loop, not a straight-through run.** Each phase
ends at a human checkpoint. Sonnet 5 should batch work up to the next checkpoint, then report with
the evidence needed to make the call (metrics table + share links for visual comparison).

### Checkpoint cadence

| Checkpoint | Trigger | What Brian decides |
|---|---|---|
| **CP-1** | End of P0c | Promote the free-flag arm? (compare share links) |
| **CP-2** | End of Phase 0 | Authorize Modal image changes → unblocks Track A |
| **CP-3** | End of P1c | Promote pose-prior mapper? (scale/gravity 100%? visually better?) |
| **CP-4** | End of P2b | Promote learned matching? |
| **CP-5** | End of P3b | Promote gsplat trainer + depth loss? |
| **CP-6** | P3d scoping | Approve native capture change (TestFlight cycle)? |
| **CP-7** | End of P4 | Accept deliverables; on-device final acceptance |

---

## PART E — Authorizations still needed from Brian

1. **Benchmark capture IDs** (2–4 per §C rule 7) + **Modal GPU credit authorization** for A/B arms.
2. **Execution environment.** The dev container has no credentialed access to Modal/Supabase/
   Vercel/R2 — deploys and prod verification must run from `C:\s360`, or be handed over as commands.
3. **Modal image modification** (COLMAP 4.1.1, vendored gsplat trainer, gsplat bump). **Without
   this, only Phase 0 is reachable.**
4. Confirm non-commercial weights are permanently out of scope (assumed throughout).
5. Decision on **P3d** (per-frame depth retention) — native change, TestFlight cycle.
6. Processing-time ceiling: currently 7200 s. Phases 1–2 fit; the EfficientLoFTR rescue tier may
   need headroom.
