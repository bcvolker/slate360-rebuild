# External Audit Prompt V3 — "Why is our twin garbage and Matterport's isn't?"

Self-contained. Copy everything below the line to other AI platforms. Written 2026-08-21.
Attach: the AOB205 screenshots, the Matterport viewer screenshots, and the live link
https://www.slate360.ai/share/twin/aob205west939dc155bd66bb

---

ROLE: Principal 3D reconstruction engineer. Diagnose a specific, reproducible failure and
tell us how to reach Matterport-class output. Be blunt. No code access needed — all evidence
is below. Do not recommend abandoning self-hosting or switching to a SaaS reconstructor.

# 0. The business context

A one-person construction-documentation company sells interactive digital twins of interiors
and exteriors to contractors and institutions (ASU, GCs). Deliverables are branded web links
clients can re-share. Positioning: "workflow tool," estimating-grade, never survey-grade.
Self-hosted only, license-clean OSS only (AGPL is disqualifying — an AGPL segmenter is
already flagged for removal). Stack: Modal GPU workers · Trigger.dev · Cloudflare R2 ·
Supabase · Next.js/Vercel · Capacitor iOS with a native Swift ARKit plugin.

# 1. THE FAILURE (diagnose this first)

## Input
Room AOB205, an ASU classroom, ~41'-3" × 29'-8" (~1,225 sq ft), 30 computer workstations.
Captured with an Insta360 X4:
- **20 × 360° stills**, 5888×2944 equirectangular, ~13 MB each, shot from ~20 standing
  positions around the room over 13 minutes, consistent morning lighting, tripod-free
  (handheld on a selfie stick), operator mostly out of frame.
- **2 × 360° walking video passes** (.insv, 3.2 GB + 1.6 GB), one high pass one low pass,
  recorded immediately after the stills.

## What we ran
The **stills only** (20 files → 320 perspective views). Pipeline:
1. Each equirect still unwrapped by ffmpeg `v360` into **16 perspective views**: rings at
   pitch 0°/±35°, explicit 110°×94° FOV, 1600×1200. Nadir/zenith excluded by ring geometry.
2. Person-segmentation masking over every view (operator found in only 1 of 320).
3. COLMAP via nerfstudio `ns-process-data`, exhaustive/sequential matching.
4. nerfstudio **splatfacto 1.1.5**, "baseline" profile, **45,000 iterations**
   (we deliberately chose the high tier for a leadership deliverable).
5. Export to SPZ with opacity-tier filtering, floater crop, spike clamp.

## Reported metrics — ALL GREEN
- **trainPsnr 29.68** — the highest this pipeline has ever produced (previous best 28.97,
  from an iPhone+LiDAR capture that looked genuinely good).
- 268 / 320 views registered (84%).
- 556,066 splats, 12.2 MB SPZ.
- Automated ready-gates: `psnrGate: pass`, `splatCountGate: pass`, `fileSizeGate: pass`,
  `explosionSuspected: false`, `failed: false`.
- `scaleSkipped: "no_lidar_poses"` (expected — no metric anchor in this run).

## What it actually looks like (see screenshots)
**Unusable.** From one angle there is a recognizable classroom — ceiling, light fixtures,
rows of desks — but it is wrapped in an enormous cloud of white needle/spike splats, and
punctured by large **solid black polygonal shapes** (dozens of them, some covering a third
of the viewport). Orbiting outward, the model resolves into a spherical blob of white spiky
noise with black polygons through it. There is no walkable interior. A client would see
garbage.

## The question we need answered precisely
**Why did PSNR 29.68 coexist with a geometrically worthless model, and what specifically
caused it?**

Our own working hypothesis — confirm, refute, or refine it:
- 16 views per still all share **one optical centre**. 20 stills = only **20 distinct
  camera positions**, and each station's 16 views are pure rotations of each other with
  **zero baseline**. Rotation-only view sets are **degenerate for triangulation**.
- COLMAP can happily register rotation-only views (it solves rotation fine) while depth
  stays almost unconstrained, producing a near-degenerate sparse model.
- splatfacto then has enormous freedom: it can place giant/needle gaussians near each
  training camera that reproduce that station's pixels almost exactly. **PSNR is computed
  on training views**, so overfitting to 20 stations scores *higher* the worse the geometry
  gets. 45,000 iterations amplified this rather than fixing it.
- The black polygons are probably huge low-opacity-but-dark gaussians surviving the
  opacity-tier filter; the white needles are classic anisotropic floaters that our
  scale-cap and SOR crop failed to remove.

Specifically, tell us:
1. Is the zero-baseline/rotation-only diagnosis correct? If not, what is?
2. Was choosing 45k iterations actively harmful here, and why?
3. Would the **walking video passes** (continuous translation ⇒ real parallax) have been
   the correct input all along? We are running that experiment now.
4. What per-station capture pattern would make 360 stills work at all — e.g. must every
   station be paired with a second offset shot to create a stereo baseline?

# 2. THE TARGET (Matterport) — what we must match

From the reference screenshots of a Matterport tour, the client-facing feature set is:
- **Walk mode** — teleport between capture stations with smooth transitions, plus free look.
- **Dollhouse view** — the entire space as a clean 3D object you can orbit, with the roof
  removed and walls intact.
- **Floor plan view** — true top-down, per-floor.
- **Floor selector** — "Floor 1 / Floor 2 / Floor 3" switcher for multi-storey.
- **Measurement tool** — "Add Measurement", click-to-click in 3D, persisted, labelled.
- **Clean geometry** — no floaters, no spikes, no black polygons, walls flat, sharp edges.
- **Automatic cropping** — the model contains only the building; nothing outside it.
- Share, settings, help, fullscreen, guided-tour playback.

**Crucial technical point we want validated:** Matterport's quality does not come from
clever photogrammetry. The Pro2/Pro3 cameras carry an **active depth sensor** and capture
**structured panorama + depth at each stationary station**. They fuse per-station depth into
a mesh, then texture it. So their "20 stations in a room" workflow works *because every
station has metric depth*, which is exactly what our stills-only run lacked. Confirm or
correct this, and say what it implies for a 360-camera-only pipeline.

# 3. OUR PIPELINE (full current state)

## Reconstruction
- **Ingest:** phone video → sharpness-scored frame selection (variance-of-Laplacian, 2 fps
  candidates, best-per-2s bucket). 360 `.insv` → dual lens streams hstacked to dual-fisheye
  → sharpest-per-bucket → `v360` unwrap (16 views/still, 8 views/video frame).
- **Operator masking (promoted):** YOLOv8s-seg person segmentation, masked pixels excluded
  from the training loss via nerfstudio per-frame `mask_path`. **View culling was tested and
  rejected** — it fragmented COLMAP's sequential match chain (registration 91→55, PSNR
  25.30→22.5 across two replicates). Masks-only held registration at 91 with PSNR 25.58.
  (Ultralytics is AGPL-3.0 and must be replaced — already scheduled.)
- **Alignment:** vanilla COLMAP. A **pose-prior arm** (ARKit positions + gravity as
  covariance-weighted priors in pycolmap) was A/B'd and **closed**: 18.26 vs 25.53. An
  **ARKit-bypass** path (skip COLMAP, use ARKit poses directly) is **demoted**: 14.7 vs 25.5.
- **Metric scale:** recovered post-hoc by comparing the COLMAP trajectory against the ARKit
  trajectory (median pairwise-segment ratio) + measured-gravity orientation. No ARKit/LiDAR
  ⇒ **no scale at all**. Known instability: the same hero capture produced **28.97 with
  scale applied** and **26.77 with `scaleSkipped=residual_too_high`** on a re-run.
- **Training:** splatfacto 1.1.5. "baseline" promoted. "quality" arm (bilateral grid,
  antialiased raster, denser densification) measured 22.74; "visual" arm (adds SO3xR3 camera
  refinement) 21.41 — both closed, and visual is additionally **non-metric** (camera deltas
  are never written back, so the splat frame diverges from the pose solution).
- **Export:** SPZ, 500k splats desktop / 150k mobile via deterministic stride downsample,
  opacity-tier filter, floater crop, metric-aware spike clamp, vector floor plan + openings
  (net wall area minus doors/windows) → SVG/DXF.

## Exterior
Drone photos → COLMAP → mesh decimated to 1.5M faces → texture (8192 px cap) → ~98 MB GLB +
orthomosaic. Melting on thin/vertical structure. Alignment cache gives 18-min re-runs.

## Delivery (already built)
Operator studio (Produce/Clean/Plan/Deliver) with version history, a splat editor with crop
boxes, floor-plan tab, share-token management. Client links: token-gated, branded, view
limits, **orbit mode** (drag/zoom/double-click-retarget) and **walk mode** (click-to-move
glide + WASD, ground-plane, bounds-clamped). Camera-synced progression compare across
versions. Pin attachments schema live (document/image/panorama_360/thermal/link/proposal/
invoice) with authoring UI pending. Edits bake into the downloadable file so a client's
download matches the cleaned view.

## Evidence from other captures
- Kitchen (360 `.insv` video only): 17.22 → 25.30 (sharpness selection) → 25.58 (masking).
- **Hero: iPhone + LiDAR, one ARSession, ≤2 min clips, slow closed loop → 28.97 and
  visually good.** This is our only genuinely good interior model.
- Car exterior orbit (phone video, no LiDAR): 158/161 registered, 23.31, visually coherent.
- AOB205 stills: 29.68 and visually worthless (above).

## Roadmap already locked (trust-first, after two prior audits)
1. E1 bake — DONE.
2. **VALID-1 + GATE-1** — per-job QC (Umeyama on trajectories, half-scene scale
   cross-check, residual-vs-distance drift profile, model-vs-own-reference) + hard gating:
   no poses/PLY or skipped scale ⇒ ship as UNSCALED with measurement UI hidden.
3. MASK-2 — replace the AGPL segmenter.
4. Phase C — LiDAR depth supervision via a vendored gsplat trainer (splatfacto 1.1.5 cannot
   do depth loss).
5. MEAS-1 — collision mesh; picks/measures raycast the mesh, never the splat.
6. FUSE — cross-source fusion, last.

# 4. Third-party research the operator collected — filter it for us

Say plainly which of these is useful, which is noise, and which is dangerous:
- **YUTO MMS (York University)** — tilted 32-beam LiDAR + 6-lens panoramic camera + RTK
  GPS/INS, LiDAR points RGB-colorised from the nearest panoramic frame. Argues tilted LiDAR
  sweeps more vertical structure and that most SLAM benchmarks don't test this.
- **3DGS × VPS** — converting a metric splat into a visual-positioning format so a single
  phone photo can be auto-localised and pinned into the 3D space (demoed with XGRIDS scans).
- **Insta360 X6 "Spatial Capture"** — the app turns 360 video into a Gaussian splat
  on-device; reportedly supports X4/X5 in select modes; **not available in the US** at
  launch. Export formats undocumented.
- **FreeGaussian (freegaussian.ai)** — free cloud 360→splat with a shareable viewer. Free
  tier **retains a licence to the uploaded footage** (we consider this disqualifying for
  client site data — confirm).
- **RealityCapture / RealityScan** — no native equirect support; Epic ships a `pano2views`
  browser tool that converts 360s into six+ overlapping cube faces with XMP calibration,
  after which RC aligns them normally. Then FBX → Unreal + Nanite.
- **Suggested additions:** RTK/GPS as SfM pose priors or post-hoc georeferencing; LiDAR for
  dense gaussian initialisation and depth supervision; IMU; surveyed control points; loop
  closure across sessions.

Note: our pose-prior and ARKit-bypass arms **already lost measured A/Bs**, so "add pose
priors" as generic advice is not actionable — say specifically what would be different.

# 5. What we must be able to do

- Produce a **client-grade walkable interior twin from a 360 camera alone** (Insta360 X4,
  operator walking with a selfie stick). This is the core product.
- **Optionally add iPhone video + LiDAR** to the same room to improve accuracy and unlock
  measurement. We verified we can register heterogeneous assets under one capture so one
  COLMAP solve consumes phone frames + 360 views + LiDAR together.
- Also ingest **360 drone video** (DJI Avata 360) for exteriors and high angles.
- Scale without LiDAR when necessary: we hold an architectural drawing for AOB205 giving
  41'-3½" × 29'-8¼", usable as a single scale reference.

# 6. Deliver these answers

1. **Root cause** of the AOB205 failure, at the level of "this specific stage, this specific
   property." Confirm/refute the zero-baseline hypothesis.
2. **The metric problem.** PSNR on training views clearly cannot gate 3D quality. What
   *automatable* metric or check would have caught this before a human looked? Candidates
   we're considering: held-out-view PSNR/LPIPS, gaussian anisotropy/scale distribution
   statistics, opacity-weighted spatial extent vs sparse-point bounding box, count of
   gaussians outside the sparse hull, per-view depth consistency. Rank them by
   (detection power) / (implementation cost) and give thresholds if you can.
3. **Minimum viable path to Matterport-class quality from 360-only capture** — capture SOP
   (stations vs walking, spacing, height, baseline, overlap, exposure, loop closure) plus
   pipeline changes. Be specific about what produces clean walls and no floaters.
4. **What Matterport actually does** (depth sensor, per-station fusion, mesh+texture rather
   than splats) and which parts we can replicate without their hardware. Is a **mesh** the
   right representation for the walkable/dollhouse/floor-plan product even if we keep splats
   for photoreal look?
5. **Dollhouse + floor-plan + floor-selector**: what do they require geometrically, and can
   we derive them from what we already produce?
6. **Cleanup**: what actually removes floaters, needles, and black-polygon gaussians —
   automatically, not by hand? Name concrete filters/thresholds or OSS tools (license-clean).
7. **The iPhone LiDAR addition**: exactly how should it be fused for maximum benefit —
   dense initialisation, depth supervision, both? What gain should we expect?
8. **Prioritised plan** (max 10 items) ranked by impact-per-cost, each with a binary
   acceptance test. Say explicitly what to STOP doing.

Do not flatter. If our architecture is wrong for this product, say so and say what breaks.
