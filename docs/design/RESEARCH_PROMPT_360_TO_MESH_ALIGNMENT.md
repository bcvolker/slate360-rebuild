# Research Prompt — placing 360 video into a LiDAR mesh's coordinate frame

Give this to several AI platforms. It is a **research and recommendation** request, not a
coding task. We want independent opinions, current as of today, including anything released
recently that we may not know about.

---

You are advising a production reality-capture pipeline for construction documentation. We
have a specific, well-characterised alignment problem. Please research it thoroughly,
compare the real options, verify licences yourself rather than trusting our summary, and
give a clear recommendation with reasoning.

## What we already have, precisely

### A. iPhone Pro LiDAR capture — working and validated

A single continuous ARKit session walking one interior room (a kitchen and dining area).
Per frame we store:

- **Depth**: 256×192 `uint16` millimetres, plus a 256×192 `uint8` ARKit confidence map.
- **Colour**: a full-resolution **1920×1440 JPEG** from the phone's rear camera, one per
  depth frame.
- **Pose**: `transform_4x4`, camera-to-world, **column-major**, ARKit convention —
  **+Y up, gravity-aligned, camera looks down its own −Z**.
- **Intrinsics**: pinhole `{fx, fy, cx, cy}` at RGB resolution.
- A separate ARKit **LiDAR point cloud PLY**.

This capture is 123 posed frames. Downstream it is fully working:

- **TSDF fusion** (Open3D, 12 mm voxels, 40 mm SDF truncation) produces a metric,
  gravity-aligned triangle mesh: **2.34 M vertices raw**, decimated to 250 k triangles /
  ~129 k vertices for delivery.
- **Validated dimensionally**: mesh diagonal **14.12 m** against a LiDAR ground-truth
  diagonal of **13.71 m** (ratio 1.03). Detected storey height **2.781 m = 9.12 ft**
  against the 9 ft building standard — **1.4 % error**, from an external reference nothing
  in our pipeline knows about.
- **Fusion residual**: mesh sits a median **23.4 mm** from the raw LiDAR returns
  (p95 173 mm), which is ~2 voxels — resolution-limited, not error-limited.
- **Projective texturing already works** from the iPhone JPEGs: occlusion-tested via
  raycasting, weighted by viewing angle and distance. It currently colours **94,807 of
  129,398 vertices from a mean of 13.3 views each**. The remaining ~34,591 vertices stay
  neutral grey because no phone camera saw them.
- **10 walk stations** derived from the pose trajectory at 1.5 m spacing, for
  Matterport-style navigation.

### B. Insta360 X4 360 video — captured, and currently unusable

The **same room, same visit**, walked separately from the phone. Two passes: one with the
camera on a pole **above head height**, one **lower**. Standard **equirectangular** video.

What we do **not** have, and this is the entire problem:

- **No camera poses.**
- **No shared clock** with the ARKit session. The two captures were started independently.
- **Different routes.** The phone walk, the high 360 walk and the low 360 walk are three
  different paths through the room, not the same path recorded three times.
- The **operator is visible** in every 360 frame (holding the pole).

We do not currently know what telemetry the X4 writes into its files — see research
question 4.

## The problem

The 360 camera saw far more of the room, at higher resolution, than the phone did —
particularly **upper walls and ceiling**, which the phone's LiDAR (~5 m range, aimed
forward while walking) barely grazed. Those 34,591 grey vertices are largely surfaces the
X4 photographed well.

**To use that footage we must know where each 360 frame's optical centre was, expressed in
the same coordinate frame as the ARKit poses.** Once we have that, our existing projective
texturer consumes the frames directly — we already unwrap equirect to six 90° cube faces
with a verified convention, and that part is tested and working.

So the question is narrow and specific: **how do we recover metric 6-DOF (or, exploiting
gravity, 4-DOF) poses for 360 frames, in the ARKit frame, reliably enough for texturing?**

## Constraints that decide the answer

1. **Licensing is a hard gate.** This is a commercial SaaS.
   - **AGPL is banned outright** at any distance — the network clause reaches a hosted
     service. This rules out Ultralytics/YOLO and OpenMVS for us.
   - **Non-commercial licences (CC BY-NC, research-only) are banned** for anything in the
     production path. Please check this carefully for any model weights you propose — several
     recent, very capable methods ship permissive *code* with **non-commercial weights**, which
     is a trap.
   - **GPL is tolerated only as a standalone binary invoked as a subprocess**, never linked.
   - MIT / BSD / Apache-2.0 are fine.
   - **Please verify each licence yourself from the actual repository**, including the
     weights, and state what you found. Do not rely on our summary — in particular we have
     conflicting information about COLMAP's licence (we have seen it described as both
     BSD-3-Clause and GPL-3.0) and would like that settled definitively, because it
     materially changes what we can build.
2. **Runs unattended** on a cloud CPU/GPU worker (Modal). **Hard ceiling 2 hours per job.**
3. **Must fail loudly rather than align wrongly.** A 360 frame placed 30 cm off paints a
   kitchen cabinet onto the wall behind it, and nobody looking at the result can tell it is
   wrong. We would far rather leave a wall grey than smear it. Any recommendation must come
   with a rejection criterion.
4. **Texture-grade accuracy is sufficient** — we estimate ~5–15 cm pose error is usable,
   because we are painting existing triangles, not creating geometry. We are not trying to
   improve the mesh with the 360 data.
5. Some manual input is acceptable **if you argue it is the honest price**. If so, specify
   exactly what a non-technical operator clicks, how many times, and how long it takes.
6. Python 3.10 environment. Preference for `numpy` / `open3d` / `PIL`, but we can add
   dependencies if the licence is clean and the win is real.

## What we have already considered

Please critique these and tell us if we are wrong:

- **COLMAP with the phone cameras locked at known ARKit poses**, registering unwrapped 360
  cube faces against them via `image_registrator`. This is our current front-runner. Main
  worry: painted drywall may not yield enough features for cross-device matching between a
  90° cube face from an X4 and a 1920×1440 iPhone frame — different sensors, different
  exposure, different time of day within the visit.
- **Direct mesh-to-image alignment** — render the mesh from a hypothesised pose and optimise
  photometric or edge agreement. We believe this needs a good initialisation and will snap
  to the wrong doorway without one, and our mesh's current vertex colour is too coarse to be
  a good photometric target.
- **Independent 360 SfM, then a similarity transform onto the ARKit trajectory.** We are
  sceptical: with no shared clock and three *different* routes, trajectory-shape matching in
  a rectangular room seems likely to produce a confident one-doorway offset.
- **Manual tie points** — operator clicks three corresponding corners. Our fallback.

## Research questions

Please answer each explicitly.

1. **What is the current best practice**, as of now, for registering a 360/equirectangular
   camera into an existing posed, metric reconstruction from a *different* device? Name
   specific methods and specific repositories.

2. **What has been released recently** — say the last 12–18 months — that changes this
   problem? We are specifically interested in learned feature matching and pose-free
   reconstruction (for example the DUSt3R / MASt3R / VGGT line of work, and modern matchers
   such as LightGlue, ALIKED, XFeat, RoMa, and whatever has superseded them). For each:
   **what is the licence of the code, and separately what is the licence of the pretrained
   weights?** This distinction has caught us before.

3. **Is equirect-native matching better than cube-face matching?** We currently unwrap to six
   90° faces so we can reuse a pinhole texturer. Are there matchers or SfM front-ends that
   handle spherical imagery directly and would do better, and does the cube-face seam cost us
   matches near face boundaries?

4. **What telemetry does an Insta360 X4 actually write?** We believe these cameras record
   IMU (gyroscope and accelerometer) data in the file. If so:
   - What is the format, and what open-source tooling reads it (licence?)
   - Does it give us reliable **gravity alignment and relative orientation**, which would
     reduce the problem from 6-DOF to **yaw plus 3-DOF translation**?
   - Can frame-to-frame IMU integration give a usable scale-free trajectory to seed SfM?
   - Is there any timestamp in the file that could be reconciled with an ARKit session
     started separately (wall-clock, GPS time, anything)?

5. **How should we exploit gravity?** Both captures are gravity-aligned. Which of the methods
   you recommend can be constrained to 4-DOF (yaw + translation), and does constraining help
   robustness as much as we assume?

6. **What is the right rejection criterion?** For your recommended method, what concrete
   measurable tells us an alignment is wrong — inlier counts, reprojection error, a
   photometric consistency check against the already-textured iPhone vertices, something
   else? We want a number we can gate on, not a vibe.

7. **Is there an entirely different framing we are missing?** For example: should we instead
   run one joint reconstruction over phone frames and 360 faces together, rather than
   registering one into the other? Or use the 360 footage only for a texture atlas computed
   in a separate pass? Or capture differently next time to make this trivial — and if so,
   what exactly should the operator do?

8. **What would you expect to fail on painted, low-texture interior walls**, which is our
   dominant real-world case (kitchens, classrooms, new-construction drywall)? Is there a
   method that is specifically robust there?

## Deliverable

Please give us:

1. A comparison of the realistic options — how each works, what it needs, how it fails,
   expected accuracy, compute cost against our 2-hour ceiling, and **verified licence**.
2. **A clear primary recommendation** and why, plus a fallback for when it fails.
3. The rejection criterion for the recommendation, as a number.
4. Any recent repositories worth using, with licence and a note on maturity.
5. An explicit list of **what you are unsure about**. We would much rather have a flagged
   uncertainty than a confident wrong answer — we have been burned by exactly that in this
   pipeline already, twice.

Prose is fine; we do not need code in this response. If you cite papers or repositories,
please link them and say when they were published or last updated. If something you
remember may be out of date, say so.
