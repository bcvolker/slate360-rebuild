# Adversarial Review Prompt — sensor fusion architecture for a multi-device reality-capture platform

Give this to several AI platforms. **We are asking you to attack this design, not confirm
it.** It was synthesised from four earlier research responses that largely agreed with one
another, and we are aware that convergence between four models is not evidence of
correctness. Assume something in here is wrong and find it.

---

You are reviewing the architecture of a production construction-documentation platform. Tell
us where it breaks, what it will cost us later, and what we should do instead. Praise is
worthless to us; specific objections are valuable.

## Part 1 — What exists today, measured

A single interior room (kitchen + dining) captured with an iPhone Pro, LiDAR enabled, one
continuous ARKit session.

- **Depth stream**: 123 frames. Each frame is a 256×192 `uint16` millimetre depth map, a
  256×192 `uint8` ARKit confidence map, and a **full-resolution 1920×1440 JPEG**.
- **Poses**: `transform_4x4` camera-to-world, column-major, ARKit convention — **+Y up,
  gravity-aligned, camera looks down its own −Z**. Pinhole `{fx, fy, cx, cy}` at RGB
  resolution.
- **TSDF fusion** (Open3D, 12 mm voxel, 40 mm SDF truncation) → metric gravity-aligned mesh,
  2.34 M vertices raw, decimated to 250 k triangles.

Validated numbers, all measured, none estimated:

| check | result |
|---|---|
| Mesh diagonal vs LiDAR ground truth | **14.12 m vs 13.71 m** (ratio 1.03) |
| Storey height vs the 9 ft building standard | **2.781 m = 9.12 ft — 1.4 % error** |
| Fusion residual, mesh to raw LiDAR returns | median **23.4 mm**, p95 173 mm |
| Floor plane, two independent derivations | RANSAC −0.545 m vs trajectory −0.537 m (**8 mm apart**) |
| Floor area, measured from floor triangles | **28.35 m² = 305 sq ft** |
| Projective texturing from the iPhone JPEGs | **94,807 of 129,398 vertices**, mean 13.3 views each |

The remaining ~34,591 vertices are neutral grey — surfaces no phone camera saw. Largely
ceiling and upper walls, because the LiDAR is ~5 m range and aimed forward while walking.

Also captured, and **currently unused**: Insta360 X4 equirectangular video of the same room,
same visit — two passes (pole above head height, and lower). **No poses, no shared clock with
the ARKit session, three different walk routes, operator visible in frame.**

## Part 2 — The architecture we have locked. Attack it.

### Ruling 1 — "This is a localization problem, not a reconstruction problem."
The LiDAR mesh is the authority and is never modified. Every other sensor is a **texture
source** whose cameras must be located inside the already-metric frame.

### Ruling 2 — Localize into a locked map; never independent SfM plus a similarity fit.
Build a COLMAP model from the iPhone frames with **ARKit poses and intrinsics held fixed**
(point triangulation only, no free bundle adjustment), producing sparse 3D landmarks natively
in the ARKit frame. Localize other cameras against those landmarks by 2D–3D PnP.

We rejected: reconstruct the 360 independently, then fit a similarity transform onto the
ARKit trajectory. Reason — three different routes, no shared clock, rectangular room; we
expect a confident one-doorway offset that scores well.

### Ruling 3 — Different representations for matching and texturing.
Matching uses **8–12 overlapping perspective views** (~110° FOV) sharing one optical centre.
Texturing uses six hard 90° cube faces (already built and tested). Rationale: a feature
straddling a cube-face boundary is extracted twice, badly, or not at all.

### Ruling 4 — Constraints over descriptors.
1. Gravity → 4-DOF (yaw + translation), with views gravity-rectified *before* matching.
2. **Pole-height prior** — the 360 sits at known height above a floor the mesh has located,
   so `z` is bounded, collapsing toward yaw + x,y.
3. Temporal continuity from video as a neighbour prior.

### Ruling 5 — Rejection battery; grey is a successful outcome.
Per keyframe, all must pass: ≥30 PnP inliers and ≥0.25 inlier ratio; median reprojection
≤2 px at 1024 px; inliers spread over ≥60° azimuth and ≥2 views; gravity disagreement ≤3°;
solved `z` within ±15 cm of floor + pole length; position within ~0.5 m of the track
interpolated from accepted neighbours; and a **photometric cross-check** — render the
already-textured region from the solved pose, require NCC ≥0.6 over ≥200 overlapping
vertices. Job level: ≥60 % of keyframes accepted and forming a connected track.

We believe the **photometric check is the only gate that can catch a confident wrong pose on
flat drywall**, because RANSAC inliers cannot.

### Ruling 6 — Licence gate.
Usable: COLMAP/pycolmap BSD-3, GLOMAP BSD-3, hloc Apache-2.0, ALIKED BSD-3, LightGlue
Apache-2.0, DISK/XFeat Apache-2.0, RoMa MIT, telemetry-parser MIT/Apache, AprilTag BSD-2,
Open3D MIT, MediaPipe Apache-2.0.
Banned: SuperPoint/SuperGlue (non-commercial, and it ships *inside* the LightGlue repo),
DUSt3R/MASt3R/CUT3R/Fast3R (CC BY-NC-SA), VGGT default weights (CC BY-NC), OpenMVS (AGPL),
Ultralytics/YOLO (AGPL).

### Ruling 7 — One localization core, per-device prior adapters.
A new sensor answers exactly one question: *how do we get gravity (and optionally position)
for this device?* Everything below that is shared.

## Part 3 — Questions we most want attacked

Please engage with these specifically rather than summarising the design back to us.

1. **Is "texture only, never geometry" leaving real value on the table?** The 360 footage saw
   ceiling and upper walls the LiDAR never reached. We currently leave those triangles absent
   and paint nothing. Should multi-view stereo from the 360 frames *add* geometry where LiDAR
   has none — and if so, how do we avoid a hybrid mesh whose measurements are trustworthy in
   some regions and not others? Our instinct is that a client cannot be handed a model where
   accuracy silently varies by region, but tell us if we are wrong.

2. **Is locking the ARKit poses actually correct?** ARKit drifts. Over 123 frames in one room
   it is clearly fine — we measured 1.4 % on storey height. Over a 6,000-frame walk through a
   whole building it may not be. At what scale does "the mesh is the authority" stop being
   true, and what should replace it — loop closure, drift-aware bundle adjustment with soft
   pose priors instead of hard locks, or something else? Where exactly is the crossover?

3. **Does the one-core-plus-adapters abstraction actually hold**, or is it wishful? Name the
   device or scenario that breaks it. We would rather discover the leak now than after we
   have written five adapters against it.

4. **Is the photometric cross-check load-bearing or is it theatre?** The iPhone JPEGs and the
   X4 frames differ in white balance, exposure, lens, and stitching. A *correct* pose will
   still show colour disagreement. Is NCC on luminance genuinely robust to that, is there a
   better invariant (gradient orientation, mutual information, edge alignment), and what
   happens on a wall that is genuinely a single flat colour where NCC is undefined or
   meaningless?

5. **Where does the rejection battery fail closed when it should fail open, or vice versa?**
   We would rather leave a wall grey than smear it — but a system that rejects 90 % of frames
   is also a failed product. Is ≥60 % keyframe acceptance a sane job-level gate, and what is
   the realistic pass rate on painted drywall?

6. **What breaks when we leave one room?** Everything above is designed and validated on a
   single room. Multi-room, multi-floor, corridors, stairwells: what in this architecture
   silently stops working, and what would you change *now* to avoid a rewrite?

## Part 4 — Device compatibility. This is a hard requirement, not a nice-to-have.

The platform must work across devices we do not control and have not all bought yet. Assume
every one of these will be used, and tell us where the architecture forces per-device special
cases we have not anticipated.

**360 cameras** — Insta360 X4 today, but also X5 and future bodies, and other manufacturers
entirely (Ricoh Theta, Qoocam, GoPro Max and successors). They differ in: equirect resolution
and projection details, stitching behaviour and near-field parallax, whether IMU telemetry is
written at all and in what proprietary format, horizon-levelling and stabilisation that may
silently rewrite orientation, and export paths that can strip metadata.

**iPhones with LiDAR** — multiple generations, differing in depth resolution, LiDAR range and
accuracy, camera intrinsics, and ARKit version behaviour. Newer models may change depth
confidence semantics or pose quality. We must not hard-code a single device's characteristics.

**360 drones** — for elevated exterior capture where LiDAR cannot reach. These carry IMU and
usually GPS, and their own stabilisation quirks.

**An RTK-capable drone (not 360)** — flies **autonomous grid missions** capturing ordinary
stills with **RTK-grade absolute positioning**. See Part 5, because we think this may matter
more than it first appears.

Specific questions:
- What is the **minimum device-specific information** a new camera must supply for the core to
  work — and is our claim that it is only "how do we get gravity" actually true?
- Which of these differences genuinely require per-device code, and which can be *measured*
  from the data itself (for example, recovering gravity from the mesh's own floor plane rather
  than from an IMU we may not be able to parse)?
- Is there an existing open standard or interchange format we should adopt for posed imagery
  rather than inventing our own frame dict?

## Part 5 — RTK drone, georeferencing, and Google 3D Tiles

We own an RTK drone that flies autonomous grid missions and returns ordinary photos with
RTK-grade absolute position. It is **not** a 360 drone. Our interior pipeline is **TSDF from
LiDAR depth, not photogrammetry**, so the operator's instinct was that RTK stills "may or may
not be helpful."

We suspect that instinct undersells it, and we want your view. Our reasoning:

- RTK gives **absolute earth coordinates**. Our entire twin currently lives in an arbitrary
  ARKit origin. Georeferencing is exactly what would let us place a model correctly into
  **Google Photorealistic 3D Tiles** for surrounding context — a feature we want, though not
  immediately.
- Exterior geometry is a different problem from interiors and photogrammetry *is* the right
  tool there. The RTK grid mission is a conventional, well-understood photogrammetry input.
- If the exterior block is georeferenced, and the interior mesh is registered to the exterior
  at doorways, then **the interior inherits absolute coordinates** without ever needing GPS
  indoors.

Questions:
1. Is that chain sound, or does error accumulate unacceptably across it? What accuracy would
   survive from RTK exterior through a doorway registration to an interior wall?
2. **Should the whole system be georeferenced from the start** rather than living in an
   arbitrary ARKit origin and being geo-anchored later? What do we lose by deferring this? Is
   retrofitting georeferencing onto an established pipeline a known trap?
3. What is the correct coordinate handling for a platform that must hold both a
   centimetre-scale interior and an earth-referenced exterior — ECEF, a local ENU tangent
   plane, something else? Where do people get this wrong?
4. For **Google Photorealistic 3D Tiles** specifically: what does it actually require to place
   a custom model correctly, what accuracy does it deliver, what are its licensing and
   attribution terms for a commercial product, and are there open alternatives worth
   considering (Cesium ion, and anything newer)?
5. Does the RTK drone have a role in the *interior* pipeline at all — for instance flying the
   building exterior to give a global frame that constrains interior drift across many rooms?

## Part 6 — What we want back

1. **The strongest objection you can make to Rulings 1–7**, ranked by how much it would cost
   us to discover late.
2. Anything in the licence gate that is wrong, out of date, or missing. Verify from the
   repositories rather than from memory, and treat code licence and *weights* licence as
   separate questions.
3. A concrete answer on device compatibility: what actually has to be per-device.
4. Your view on the RTK / georeferencing question in Part 5 — this is the part of our thinking
   that is least developed.
5. **An explicit list of what you are unsure about.** We would much rather have a flagged
   uncertainty than a confident wrong answer; we have already shipped two confident wrong
   answers in this pipeline and caught them only by measuring.

Prose is fine, code is not needed. Cite repositories and papers with dates where relevant, and
say plainly when something you remember may be out of date.
