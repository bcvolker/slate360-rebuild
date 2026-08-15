# External Audit Prompt — Twin 360 Pipeline (self-contained, no repo access needed)

Copy everything below the line to an external AI platform. It describes the entire system and
its evidence so the auditor needs no research and no code access. Written 2026-08-15.

---

ROLE: You are an independent reconstruction-pipeline auditor. Audit the following
production system for correctness, ordering mistakes, missing failure modes, and risks.
You have NO code access — everything you need is stated here. Do not recommend switching
vendors/stacks wholesale; judge the system as designed and tell us where it is wrong.

## The business

Slate360 sells professional reality-capture documentation of commercial construction sites
(warehouses, data centers, academic/medical/office). The operator captures on site; a cloud
pipeline produces interactive digital twins; clients receive branded, token-gated web
walkthrough links they can re-share. Positioning is "workflow tool," estimating-grade
measurements (±2–5 cm room scale) ONLY when LiDAR anchors scale — never survey-grade claims.

## Capture sources

1. iPhone (native ARKit capture app): H.265 video clips + per-frame poses JSON (v6, now
   including per-photo pose keyframes for timed stills) + LiDAR point cloud (gzipped PLY) +
   depth sidecar. Uploads via background-URLSession resumable multipart (recently hardened:
   parallel PUTs, 5 retries + re-sign, on-disk manifests resuming across relaunches;
   registration order video → LiDAR/poses sidecars → photos; per-asset failure isolation).
2. Insta360 X4: raw dual-stream .insv 360 video (also 360 stills), copied from SD card.
3. DJI Mavic 3E: drone photo missions (GPS EXIF), 360 drone video planned.

## Cloud pipeline (self-hosted: Trigger.dev orchestration → Modal GPU workers → R2 storage → Supabase)

INTERIOR (Gaussian splat track), stages in order:
- Ingest: phone video → sharpness-scored frame selection (variance-of-Laplacian,
  candidates at 2 fps, best-per-2s-bucket). 360 video → both lens streams hstacked to
  dual-fisheye, candidates 2 fps, sharpest per 2 s bucket, then each kept frame unwrapped
  via ffmpeg v360 to perspective views: rings at pitch 0/±35°, explicit 110°×94° FOV,
  1600×1200 (16 views per 360 still, 8 per video frame). Nadir/zenith excluded by ring
  geometry (operator pole).
- Operator masking (NEW, A/B-promoted): YOLOv8s-seg person segmentation (conf 0.35,
  12 px dilation) over every extracted view; masked pixels excluded from training loss via
  nerfstudio per-frame mask_path (all-or-nothing rule satisfied with white fill masks).
  View CULLING (discarding operator-dominated views) was tested and REJECTED: it fragmented
  COLMAP's sequential match chain (registration 91 → 55/56 in two replicates, PSNR
  25.30 → 22.5). Masks-only: registration 91 = baseline, PSNR 25.58 vs 25.30 baseline.
- Alignment: vanilla COLMAP via nerfstudio ns-process-data (sequential matching for video).
  A pose-prior arm (ARKit positions + gravity as covariance-weighted priors in pycolmap)
  was A/B'd and CLOSED: 18.26 PSNR vs 25.53 vanilla on real data. An ARKit-bypass path
  (skip COLMAP entirely, use ARKit poses) exists but is not the default
  (bypass 14.7 vs COLMAP 25.5 on the same capture — nearest-keyframe assignment error).
- Metric scale: recovered by comparing COLMAP trajectory vs ARKit trajectory
  (median pairwise-segment ratio, tolerance-matched by timestamp); measured gravity
  orientation applied. Without LiDAR/ARKit data, models have NO absolute scale and we
  refuse measurement claims.
- Training: nerfstudio splatfacto 1.1.5, "baseline" profile promoted (scale regularization,
  cull-alpha 0.1, stop-split at 57% iters). "quality" arm (bilateral grid, antialiased
  rasterization, denser densification) measured 22.74; "visual" arm (adds SO3xR3 camera
  refinement) 21.41 — both CLOSED on evidence; visual is additionally flagged non-metric
  (camera deltas not written back → splat frame diverges from pose solution).
- Export: SPZ (capped 500k splats desktop / 150k mobile via deterministic stride
  downsample), floater crop, edit_list (user crop boxes) applied in all viewers,
  vector floor plan + openings (net wall areas minus doors/windows) → SVG/DXF.

EXTERIOR (photogrammetry mesh track): drone photos → COLMAP → dense mesh (decimated to
1.5M faces) → texture (native-res attempt with capped-3200 retry, 8192 px cap for WebGL)
→ GLB ~98 MB + orthomosaic. Alignment cache (tar of sparse model keyed by capture+quality,
excludes dense/stereo) verified: rerun 18 min vs 5.5 h cold. First exterior model completed
2026-08-06. Melting on thin/vertical structure acknowledged — plan is EXT-SPLAT: sell splat
walkthroughs (ground 360 walk + 360 stills + drone orbits at 2–3 heights through the SAME
360 ingest above) as the exterior walkthrough product; mesh/ortho stays the measurement
product; DroneDeploy/RealityCapture output can be imported as a model version (planned).

DELIVERY: Twin Studio (operator cockpit: Produce/Clean/Plan/Deliver tabs — version history
with quality metrics per arm, splat editor with crop boxes, floor-plan tab, share-token
management). Client share links: token-gated, branding snapshot at mint, view limits,
orbit mode (drag/zoom/double-click-retarget) + walk mode (click-to-move glide + WASD,
ground-plane, bounds-clamped). Version history with camera-synced progression compare.
Pin system with attachment types: document/image/panorama_360/thermal/link/proposal/invoice
(schema live; authoring UI planned).

## Measured evidence (all on real captures)

- Kitchen (360 .insv only): 17.22 (flat frame grid) → 25.30 (sharpness selection) →
  25.58 with operator masking (registration 91 both).
- Hero recipe (iPhone+LiDAR, one session, ≤2 min clips, slow closed loop): 28.97 PSNR —
  best ever; promoted as the capture SOP for interiors.
- Car test (phone video orbit, no LiDAR): 158/161 views registered, 23.31.
- Exterior: first complete mesh (98 MB GLB); iteration 18 min via alignment cache.
- Caveat we record ourselves: masked-eval PSNR scores kept pixels only; cross-arm PSNR
  comparisons are paired with a human visual gate before promotion.

## Known gaps and planned order (audit this ordering)

1. Phase C: LiDAR depth supervision in splat training (depth loss from capture LiDAR).
2. FUSE: cross-capture fusion — one COLMAP model over iPhone frames + 360 views, LiDAR
   anchoring scale; 360 fills occlusions; gated on registration rate + PSNR + hole
   coverage vs iPhone-only baseline of the same walk. (Today: one capture per job.)
3. MEAS-1: collision mesh beside every splat (raycast picks/measures on hidden mesh;
   splat = look layer, mesh = measure layer).
4. E1: bake edit_list into exported artifacts so downloads match the cleaned share view.
5. VALID-1 (adopted from OVR's July 2026 accuracy-note methodology): post-job diagnostics —
   Umeyama similarity on trajectories (never free-scale ICP on curves), scaled ICP on dense
   surfaces, half-scene independent scale cross-check, residual-vs-distance-from-centre
   drift profile, model-vs-own-metric-reference test; JSON report per job.
6. Multi-level walk (stairs/floor selector) and doorway "portal pins" linking federated
   exterior↔interior models (interiors and exteriors stay separate models by design).
7. Committed after quality work: 100% rebuild of the desktop dashboard/listing UI.

## Constraints

Self-hosted only (no third-party reconstruction SaaS; a free service retaining a license
to client footage is disqualified). License-clean OSS only (no CC-BY-NC weights/models).
Stack stays: Modal GPU + Trigger.dev + Cloudflare R2 + Supabase + Next.js/Vercel.
One operator (non-programmer CEO) + AI engineers; changes must be A/B-verifiable.

## Your audit tasks

1. Verdict each promotion/closure decision above against its stated evidence: vanilla
   COLMAP over pose-priors; baseline profile over quality/visual; masks-only over culling;
   ARKit-bypass demotion. Flag any conclusion the evidence does not support.
2. List failure modes we have NOT addressed for large repetitive commercial interiors
   (racks, ceiling grids, glass, low texture) and which planned item (if any) covers each.
3. Critique the build order (C → FUSE → MEAS-1 → E1 → VALID-1). Would you reorder? Why?
4. Critique the capture SOP: interior = 360 video loop high+low laps + 360 stills per key
   room + separate iPhone+LiDAR chest-height pass; exterior = drone crosshatch + 45° orbit
   + ground 360 walk. What's missing or wrong for the stated site types?
5. Risk-check the accuracy language (estimating-grade ±2–5 cm with LiDAR anchor; no claims
   without scale anchor; federated interior/exterior) for a paid contractor deliverable.
6. Name any current (≤ Aug 2026) open-source component that would beat a listed stage at
   LOW integration cost on this stack, with license. Ignore research demos and generative
   world models. If nothing clears the bar for a stage, say so explicitly.
7. Rank your corrections by (impact on sellable quality) / (engineering cost), max 10 items,
   each with the concrete acceptance test that would prove it worked.

Do not flatter. If something above is architecturally wrong, say it plainly and say what
breaks because of it.
