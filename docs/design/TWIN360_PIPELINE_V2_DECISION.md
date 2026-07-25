# Twin 360 — Reconstruction Pipeline V2 (Decision Doc)

Status: **PROPOSED** — awaiting Brian's authorization on the gated items in §8.
Date: 2026-07-25. Supersedes nothing; extends `TWIN_QUALITY_ROADMAP.md` and `TWIN360_MASTER_BUILD_PLAN.md`.

Source of truth for the current pipeline: `docs/research/TWIN360_CURRENT_STATE_REPORT.md`.
Competitive reference: `docs/research/DRONEDEPLOY_RECONSTRUCTION_ANALYSIS.md`.

All findings below were verified by reading source/LICENSE files directly unless marked
**[NV]** (not verified) or **[I]** (inferred). Flag spellings marked **[C]** were read from
upstream source, not guessed.

---

## 1. The core diagnosis

The current worker **discards the ARKit poses** (`ALIGNMENT_STRATEGY = "colmap_first"`), solves
unposed with COLMAP, then tries to *recover* metric scale and gravity afterward with heuristics
that are known-fragile:

- Q1 scale recovery skips with `residual_too_high` **run-to-run on identical data** (observed:
  the same capture produced PSNR 28.97 with scale applied, then 26.77 with scale skipped).
- Q2/floor-PCA up-axis guessing produced the upside-down class of bugs; now confidence-gated,
  which means it frequently returns `UNKNOWN` and applies no correction at all.

The old "bypass" arm failed (PSNR 9.48–14.74 vs COLMAP's 23.3) because it **replaced** COLMAP
with raw ARKit poses — every frame got a nearest-keyframe pose assignment, and a wrong assignment
became ground truth with no mechanism to reject it.

**There is a third path neither arm tried: pose priors *inside* the SfM problem.** COLMAP's
`pose_prior_mapper` reads per-image position priors (with covariance) from the database and enters
them as weighted residuals in bundle adjustment, with an optional robust loss. COLMAP still does
its own matching and triangulation — the priors constrain the solve rather than dictating it.

Why this is the right shape for Twin 360:
- **A mis-assigned prior gets down-weighted by the robust loss instead of becoming truth.** This is
  precisely the failure mode that killed the bypass arm.
- **Scale becomes native, not recovered** — deletes the Q1 run-to-run instability entirely.
- **Gravity becomes native, not guessed** — deletes the up-axis bug class.
- It matches the strongest lever identified in the DroneDeploy teardown: pose-prior-anchored SfM,
  not post-hoc alignment.

---

## 2. Blocking finding: our COLMAP is too old

**[C]** `pose_prior_mapper` was introduced in **COLMAP 3.11.0**. `global_mapper` (merged GLOMAP)
requires **COLMAP 4.0.0**. Current upstream is **4.1.1**.

**[C]** Debian apt versions:

| Suite | COLMAP version | `pose_prior_mapper` | `global_mapper` |
|---|---|---|---|
| bookworm | 3.8-1 | no | no |
| trixie | 3.10-2 | no | no |
| sid | 4.0.4-4 | yes | yes |

Our Modal image does `apt_install(... "colmap" ...)` on `debian_slim` → **we have 3.8 or 3.10 and
cannot run any of this today.** This is the single hardest prerequisite in the plan.

Options, in order of preference:
1. **`pycolmap` from PyPI** — tracks upstream closely, pip-installable, and is what
   deep-image-matching already uses internally. Cheapest if it exposes the pose-prior API. **[NV]
   — must verify `pycolmap.Database` / `PosePrior` availability and that the mapper is reachable.**
2. **Pull `colmap` from Debian sid** into the image (4.0.4-4) — fast, but mixing sid into a
   stable base risks dependency conflicts.
3. **Build COLMAP ≥4.0 from source** in the Modal image — reliable, adds ~15–30 min to image
   builds (one-time, layer-cached).

### What priors COLMAP actually accepts

**[C]** `src/colmap/geometry/pose_prior.h`: `PosePrior` carries `position` (Vector3d),
`position_covariance` (Matrix3d), `coordinate_system`, and `gravity` (Vector3d, 4.x-era).
**Position + gravity only — there is no full-rotation/quaternion prior.**

So our ARKit c2w *rotation* cannot be supplied as a prior; only its gravity component. That is
still exactly what we need — position fixes scale and drift, gravity fixes the up-axis.

**[C]** Priors live in a dedicated SQLite table, not columns on `images`:
```sql
CREATE TABLE pose_priors (image_id INTEGER PRIMARY KEY NOT NULL,
  position BLOB, coordinate_system INTEGER NOT NULL, position_covariance BLOB, ...)
```
Write them via `pycolmap` rather than hand-packing Eigen BLOBs. **[I]**

### Exact command and flags **[C]**

`pose_prior_mapper` is a **separate top-level command**, and its prior flags are **unprefixed**
(they are registered by `RunPosePriorMapper`, not by `AddMapperOptions()`):

```
colmap pose_prior_mapper \
  --database_path <db> --image_path <images> --output_path <existing dir> \
  --prior_position_std_x 0.05 --prior_position_std_y 0.05 --prior_position_std_z 0.05 \
  --use_robust_loss_on_prior_position 1 \
  --prior_position_loss_scale <scale> \
  [--Mapper.* ...]
```

**Corrections to commonly-guessed spellings [C]:** `--Mapper.use_prior_position` **does not
exist** — `use_prior_position` is set to `true` in code by the command itself. Likewise the real
flags are `--use_robust_loss_on_prior_position` and `--prior_position_loss_scale`, *not*
`--Mapper.`-prefixed. Default of `prior_position_loss_scale` is **[NV]**.

`std_x/y/z` should be driven by ARKit tracking quality per keyframe, not hardcoded — tight where
tracking is `.normal`, loose after an interruption/relocalization.

### `global_mapper` (merged GLOMAP) — gravity yes, position no

**[C]** `RunGlobalMapper` does **not** call `AddMapperOptions()`, so no position-prior flags apply.
But **`--GlobalMapper.ra_use_gravity`** (with `--GlobalMapper.ra_use_stratified`) makes rotation
averaging consume `PosePrior::gravity`. Useful as a fast, gravity-correct arm; it will **not**
give metric scale. Treat as a secondary experiment, not the primary.

---

## 3. Matching: tiered, all commercially clean

**[C] License-verified allowlist:** ALIKED (BSD-3), DISK (Apache-2.0), XFeat (Apache-2.0),
LightGlue code+weights (Apache-2.0), LoFTR (Apache-2.0), EfficientLoFTR (Apache-2.0), RoMa (MIT),
hloc (Apache-2.0), NetVLAD / CosPlace / EigenPlaces / MegaLoc (all MIT), DINOv2 (Apache-2.0).

**Hard exclusions:** Magic Leap SuperPoint weights (non-commercial, and the license claims
ownership of derivatives), MASt3R/DUSt3R (CC BY-NC-SA), StreamVGGT (CC BY-NC), SALAD retrieval
(GPL-3.0).

**Trap [C]:** deep-image-matching's *default* pipeline is `superpoint+lightglue` using the Magic
Leap weights, and its README explicitly disclaims component licensing ("for the licence of
individual local features and matchers please refer to the authors' original projects"). The
wrapper's BSD-3 does not launder the components. We must pin `aliked+lightglue` explicitly.

**Trap [C]:** the MIT SuperPoint re-implementation (rpautrat) ships re-trained weights that are
*not* bit-identical to Magic Leap's, while LightGlue's `superpoint_lightglue` weights were trained
against Magic Leap descriptors. Expect a descriptor-distribution mismatch. **Avoid this pairing.**

### Evidence

- **ScanNet-1500 indoor pose AUC@5** (semi-dense vs sparse): EfficientLoFTR **58.4** vs
  SuperPoint+LightGlue **49.9**. An ~8.5-point gap in exactly our failure regime (textureless
  drywall). Snippet-sourced from the EfficientLoFTR CVPR 2024 paper.
- **ScanNet-1500 AUC@5** (sparse, NN matching): XFeat **16.7** > SuperPoint 12.5 > ALIKE 9.8 >
  ORB 9.0. The XFeat paper attributes its indoor edge to a larger receptive field and notes DISK
  and ALIKE "show signs of bias towards landmark datasets." Snippet-sourced.
- **IMC 2024**: 1st place and 4th place solutions both ran **ALIKED + LightGlue**. This is the
  community's production default.

### Compute budget (~500 images @1600px, ~7.5k pairs, one A10G shared with training)

| Config | Match time | Peak VRAM | Verdict |
|---|---|---|---|
| ALIKED + LightGlue | ~5–10 min | ~4–6 GB | **Default.** Leaves >90 min for training |
| XFeat + LighterGlue | ~2–4 min | ~2–3 GB | **Union tier** — nearly free |
| DISK + LightGlue | ~15–25 min | ~8–10 GB | Dominated by ALIKED |
| EfficientLoFTR @1600px | ~60–140 min | ~10–16 GB | **Blows the budget alone** — subset only |
| RoMa v2 (MIT) | ~15–25 min est. | ~11 GB @1280 | Spike candidate, unproven here |

**Hidden cost [C-adjacent]:** semi-dense matchers emit per-pair coordinates with no global keypoint
IDs; quantizing them into a COLMAP database inflates it substantially and can slow the mapper more
than the matching itself. Budget for this before adopting the rescue tier.

### Decision

1. **Default:** ALIKED + LightGlue @1600px, ~4096 keypoints.
2. **Union:** XFeat + LighterGlue on frames where ALIKED yields few keypoints/inliers.
3. **Rescue:** EfficientLoFTR at reduced resolution, only on pairs that fail geometric verification.
4. **Pair selection:** sequential window (k≈10) + **ARKit-pose spatial pairs** + retrieval loop
   closure (MegaLoc/NetVLAD, both MIT). Never exhaustive.
5. **Repetitive-structure gate:** reject any candidate pair whose matched relative pose disagrees
   with the ARKit prior beyond threshold (e.g. >1.5 m translation or >30° rotation after scale
   alignment). This is free given priors and is the top-recommended mitigation for the
   corridor-collapse failure on identical doors/tiled floors.

### Integration note **[C]**

deep-image-matching **unlinks and recreates `database.db`** before writing. If we inject pose
priors into that database, we must run DIM with `--skip_reconstruction` first, inject priors
second, then run `colmap pose_prior_mapper` ourselves. Priors written before DIM runs are lost.

hloc (Apache-2.0) is the cleaner integration layer if we want retrieval + matching without DIM's
licensing ambiguity. **[NV]** DIM's torch/python pins (README says py3.9; we're on 3.10) and
whether its pinned pycolmap exposes the pose-prior API.

---

## 4. Training: free wins now, structural fork later

### 4a. Free wins on the CURRENT pin (nerfstudio 1.1.5, gsplat 1.4.0) — no new code

**[C]** all fields confirmed present in `SplatfactoModelConfig` at the v1.1.5 tag. CLI spellings
are tyro-standard underscore→dash **[I]**, consistent with flags we already use successfully.

| Change | Flag | Why |
|---|---|---|
| **Bilateral grid** | `--pipeline.model.use-bilateral-grid True` | **Highest-value unused flag.** iPhone auto-exposure/WB drift across a walk is a primary floater source; the grid absorbs per-image photometric variation instead of letting Gaussians bake it in as geometry. Our capture SOP already tells users to lock exposure *because* of this — this fixes it in the solver. |
| Antialiasing | `--pipeline.model.rasterize-mode antialiased` | Mip-splatting-style; helps thin structure |
| Camera optimizer | `--pipeline.model.camera-optimizer.mode SO3xR3` | **Defaults to `off`.** Our COLMAP poses from a handheld walk are not exact |
| Densification | `--pipeline.model.densify-grad-thresh 0.0005` (from 0.0008) | Fills textureless-wall holes (splatfacto-big uses this value) |
| Anisotropy cap | `--pipeline.model.max-gauss-ratio 5.0` (from 10.0) | Cuts needle/spike artifacts on glass; only active because we already set `use-scale-regularization True` |
| SH cap (experiment) | `--pipeline.model.sh-degree 2` (from 3) | High SH lets a floater memorize view-dependent color |

**Correction to the current command [C]:** `--pipeline.model.cull-alpha-thresh 0.1` is a **no-op —
0.1 is the 1.1.5 default.** The worker comment calling it an "explicit conservative cull" is wrong.
Raising to 0.15 would actually cull.

**Not available in 1.1.5 [C]:** opacity regularization (main-branch, MCMC-gated) and near/far
culling (`near_plane`/`far_plane` are hardcoded in `get_outputs`, no config field).

### 4b. Version reality **[C]**

- **nerfstudio latest release = 1.1.5, Nov 11 2024 — no release in ~20 months.** We are already on
  the newest release. Everything newer is main-branch-only.
- **gsplat latest = 1.5.3, Jul 2025**; we are on 1.4.0 (Oct 2024), 4 releases behind.
- **`splatfacto-mcmc` is NOT in 1.1.5** — added on main Jan 3 2025 ("Finalize MCMC strategy",
  #3548). Using it requires installing nerfstudio from git.
- **[C]** `ns-train splatfacto-mcmc` ≠ `ns-train splatfacto --pipeline.model.strategy mcmc`. The
  named method also sets `cull_alpha_thresh=0.005` and `stop_split_at=25000`; the bare strategy
  flag leaves `cull_alpha_thresh=0.1`, which passes the wrong `min_opacity` to MCMC. **Use the
  named method.**
- **[C]** MCMC flags are nerfstudio-renamed: `--pipeline.model.max-gs-num` (not `cap_max`),
  `--pipeline.model.mcmc-opacity-reg`, `--pipeline.model.mcmc-scale-reg`, `--pipeline.model.noise-lr`.

### 4c. LiDAR depth supervision — the structural fork

**[C] splatfacto has no depth loss, in 1.1.5 or on main.** `output_depth_during_training` renders
depth for the viewer; no loss consumes it. Issue #3345 requesting it is open and unanswered since
Aug 2024. So `--pipeline.model.use-depth-loss` does not exist in splatfacto.

**[C] DN-Splatter is not viable for us:** Apache-2.0 (fine), but pins `nerfstudio==1.1.3` and
`gsplat==1.0.0` — adopting it means downgrading gsplat 1.4.0 → 1.0.0, forfeiting the strategy
interface and any MCMC path. Dormant since Nov 2024. It also wants dense per-frame depth maps, not
a fused point cloud.

**[C] gsplat's own `examples/simple_trainer.py` already has everything we need**, in a package we
already ship:
- `init_type: "sfm" | "random" | "lidar"` — direct support for our LiDAR PLY seed
- `depth_loss: bool` + `depth_lambda` (default 1e-2) — the depth supervision splatfacto lacks
- `MCMCStrategy` **already present in gsplat 1.4.0** (`cap_max`, `noise_lr`, `refine_*`,
  `min_opacity=0.005`) — no version bump needed for MCMC at the gsplat layer
- `post_processing="bilateral_grid"`
- `visible_adam` (SelectiveAdam, Taming-3DGS) — speed/memory win, requires gsplat ≥1.5.0

**What we'd lose by leaving `ns-train`:** nerfstudio dataparsers (we already have COLMAP poses),
`ns-viewer`, `ns-export` (we'd write PLY ourselves), `ns-eval` (PSNR is trivial to compute), the
camera optimizer, and the `--pipeline.model.*` CLI surface the worker currently shells out.

**Risk:** `simple_trainer.py` is an `examples/` script with no API stability guarantee. Mitigation:
**vendor it** into `workers/modal/twin-gaussian-splat/` and pin, rather than importing from the
installed package. Apache-2.0 permits this; add attribution.

### Open capture-side question

Our capture persists a **fused, voxel-deduped PLY** (2 cm grid, grey placeholder color) —
**not per-frame `sceneDepth`**. Depth-supervised training is materially stronger with per-frame
depth. Retaining per-frame depth (even downsampled/compressed) is a capture-side change worth
scoping alongside this work. Note this also interacts with the known "no per-point RGB" gap.

---

## 5. 360 ingest **[C]**

nerfstudio 1.1.5 handles equirect by **cutting to perspective before COLMAP ever runs**:
`generate_planar_projections_from_equirectangular(...)` then rewrites `camera_type = "perspective"`.

- `--camera-type equirectangular` — valid.
- `--images-per-equirect` — **`Literal[8, 14]` only.** Any other value is rejected. (Our worker's
  current custom path cuts 12 views via ffmpeg `v360`, which is fine standalone but is *not* a
  valid value for this flag.)
- Output resolution is square, side = `sqrt(H·W / N)` measured off the first image — a 5760×2880
  equirect at N=8 → 1440×1440; at N=14 → ~1088×1088.
- `--crop-bottom FLOAT` (shorthand for `--crop-factor 0 N 0 0`) — **this is the nadir mask** for
  removing the operator/tripod. Cropping is applied *inside* the projection generation.
- **Equirectangular is incompatible with `eval_data`** — it raises outright.

Detection must switch from the filename heuristic to **stream aspect ratio ≈2:1**, with GPano XMP
as confirming-only (Insta360 Studio strips it on export).

---

## 6. Target architecture (V2 worker)

```
1. Ingest        sharpness frame selection (keep) + equirect unwrap w/ nadir crop (new)
2. Pairs         sequential window + ARKit-pose spatial pairs + retrieval loop closure
3. Match         ALIKED+LightGlue → XFeat union → EfficientLoFTR rescue
4. Priors        write ARKit position (+covariance from tracking state) + gravity → pose_priors
5. Map           colmap pose_prior_mapper   [fallback: standard mapper = today's behavior]
6. Train         gsplat trainer: init_type=lidar, depth_loss, MCMC, bilateral grid
                 [interim: splatfacto + §4a free flags]
7. Clean         SOR + percentile crop + cap + log-space scale bake + spike clamp (KEEP AS-IS)
8. Export        SPZ v3 (keep) + PLY + mesh + floorplan
```

Stages 7 and 8 are already good and should not be touched in this work. Stage 5's fallback path
means the refactor is safe: if priors are unavailable or the mapper fails, we land exactly where we
are today.

**Implementation requirement:** refactor the align and train stages into **pluggable backends**
selected by env + job payload (`colmap_vanilla` | `colmap_pose_prior` | `colmap_learned_match`,
and `splatfacto` | `gsplat_lidar`), so every change below is an A/B arm in the existing
`dispatch-twin-experiment.mjs` harness rather than a fork. Today's behavior remains the default
arm until an experiment beats it.

---

## 7. Phased plan

**Success gate for every phase: the existing R7.5 rule — metrics are necessary but not
sufficient; a share link must be opened in a browser and visually compared before an arm is
promoted.** Benchmarks: the PSNR-28.97 walk (regression guard), the car interior (hard case), the
iPhone+X4 dual capture (360), and a drone set if available.

| Phase | Work | Effort | Risk | Gated on |
|---|---|---|---|---|
| **0a** | Upload integrity (slice M2): content fingerprint → idempotent registration, GC stale `uploading` rows, refuse enqueue while any asset pending | 3–5 d | Low | — |
| **0b** | 360 detection by aspect ratio; nadir crop | 1–2 d | Low | — |
| **0c** | Training free-flag arm (§4a) + remove the no-op `cull-alpha-thresh` | 1 d | Very low | Benchmark IDs |
| **0d** | Pluggable align/train backends + experiment-harness arms | 3–4 d | Low | — |
| **1a** | COLMAP ≥4.0 in the Modal image (pycolmap → sid → source, in that order) | 2–4 d | **Medium** — image build time, dependency risk | Verify pycolmap pose-prior API |
| **1b** | Prior writer: ARKit keyframes → `pose_priors` table, covariance from tracking state | 3–5 d | Medium | 1a |
| **1c** | `pose_prior_mapper` arm + A/B | 3–5 d | Medium | 1b, GPU budget |
| **2a** | Learned matching arm (ALIKED+LightGlue via hloc or DIM w/ explicit pipeline pin) | 5–7 d | Medium — image size, weight caching | 1a |
| **2b** | XFeat union + pose-prior pair gating | 3–4 d | Low | 2a |
| **2c** | EfficientLoFTR rescue tier | 3–5 d | Medium — DB blowup | 2b |
| **3a** | Vendor gsplat `simple_trainer.py`; `init_type=lidar` + MCMC arm | 5–8 d | Medium — leaves ns-train surface | 0d |
| **3b** | Depth-loss arm (fused PLY first; per-frame depth if capture changes) | 5–8 d | Medium | 3a |
| **3c** | gsplat 1.4.0 → 1.5.3 (SelectiveAdam, faster raster) | 2–3 d | Low-Med | 3a |
| **4** | Deliverables: bake, PLY/GLB export, vector floor plan + areas, embed | ~4 wk | Medium | Separate research round (§9) |

**Recommended order:** 0a–0d in parallel where possible → 1a → 1b/1c → 2a/2b → 3a/3b → 2c → 4.
Phase 0c is the cheapest possible quality experiment and should run first regardless.

---

## 8. What is needed from Brian

**Blocking:**
1. **Benchmark capture IDs** (2–4, per §7) and **authorization to spend Modal GPU credits** on
   experiment arms.
2. **Execution environment.** The dev session runs in a remote container with no credentialed
   access to Modal/Supabase/Vercel/R2. Deploys and prod verification must run from `C:\s360` or be
   handed over as commands.
3. **Authorization to modify the Modal image pins** — specifically COLMAP ≥4.0 and (for Phase 3)
   vendoring gsplat's trainer / bumping gsplat. Without this, Phases 1–3 are blocked and only
   Phase 0 is reachable.

**Non-blocking but wanted:**
4. Confirmation that non-commercial weights are permanently out of scope (assumed yes throughout).
5. Decision on **retaining per-frame ARKit depth** at capture time (§4c) — affects Phase 3b's
   ceiling and is a native-app change requiring a TestFlight cycle.
6. Processing-time tolerance: current ceiling is 7200 s. Learned matching + pose-prior mapping fits
   comfortably; the EfficientLoFTR rescue tier does not without a raise.

---

## 9. Known unknowns (deliberately not guessed)

- Default value of `--prior_position_loss_scale` **[NV]**.
- Whether `pycolmap` on PyPI exposes the pose-prior write API and the `pose_prior_mapper`
  entry point **[NV]** — decides Phase 1a's cheapest route.
- deep-image-matching's torch/python pins and its pycolmap version **[NV]**.
- Which COLMAP release added `PosePrior::gravity` (present in 4.x struct, absent from the 3.11.0
  table DDL) **[NV]**.
- MCMC quality delta vs default densification on indoor scenes — no benchmark retrieved **[NV]**;
  the mechanism (recycling dead low-opacity Gaussians into under-reconstructed regions) is
  structurally right for our symptoms, but treat as prior, not measurement.
- **Phase 4 deliverables research not yet done:** splat→mesh options and licenses, LiDAR→mesh
  with color projection, point-cloud→vector floor plan (Open3D/Shapely/CGAL/RoomFormer/SpatialLM
  licenses), export libraries (E57/LAS/DXF/USD), and defensible accuracy figures for iPhone-LiDAR
  room measurement. This gates Phase 4 scoping only.
