# Digital Twin Pipeline — Technical Reference & Research Brief

*2026-08-23 · Written to be handed to a research platform. Assumes no repo access.*

---

## Part 1 — What a digital twin pipeline has to do

A digital twin of a building is four separate things that people often conflate. Each needs a
different sensor and a different algorithm, and confusing them is the most common way these
projects fail.

| layer | question it answers | what produces it |
|---|---|---|
| **Geometry** | Where are the surfaces? How big is the room? | A depth sensor. Measurement lives here. |
| **Appearance** | What does it look like? | Cameras. Adds no dimensional information. |
| **Position** | Where was each camera standing? | Pose tracking (VIO/SLAM) or structure-from-motion. |
| **Semantics** | Which surface is a wall, a door, a floor? | Plane fitting and detection on the geometry. |

**The governing rule we arrived at the hard way:** when a metric depth sensor is available,
**depth is the geometry**, and every camera is a texture source. Photogrammetry is not used to
build interior geometry.

That ruling came from a measured failure. Structure-from-motion on the same kitchen collapsed
to a **3.23 m** model of a room the LiDAR measured at **13.71 m** — it registered one small
connected component and silently dropped the rest, while reporting the highest quality score
we had ever recorded. Depth fusion of the identical capture produced **14.12 m**. The lesson:
photogrammetry fails by producing something confident and wrong; depth fusion cannot fail that
way, because each depth frame contributes independently with no matching chain to break.

---

## Part 2 — Our architecture

```
CAPTURE                     PROCESSING                        DELIVERY
─────────                   ──────────                        ────────
iPhone LiDAR depth ───┐
iPhone poses (ARKit) ─┼──► TSDF fusion ──► metric mesh ──┬──► dollhouse + ceiling states
iPhone RGB stills ────┤     (geometry)      (authority)  ├──► floor plan + area take-off
                      │                                  ├──► walk navigation + stations
iPhone video ─────────┼──► projective ────► vertex ──────┤
360 video (2 heights)─┘    texturing        colour       ├──► measurement
                            (appearance)                 └──► accuracy report (QC)
Thermal ──────────────────► pinned in place
Drone / RTK ──────────────► exterior + absolute position
```

**Layer separation is deliberate.** The mesh is never modified by a camera. A camera can only
paint the surfaces the depth sensor measured. Where no camera saw a surface, it stays neutral
grey and is counted — never guessed at, because a smeared wrong colour is worse than an honest
gap.

---

## Part 3 — Stage by stage: what runs, on what, producing what

### Stage 0 — Capture (iOS, Swift, ARKit)

Native iOS app. ARKit session provides `sceneDepth`, camera pose, and camera intrinsics.

**Per keyframe it writes:**
- 256×192 `uint16` millimetre depth map
- 256×192 `uint8` ARKit confidence map (0 low, 1 medium, 2 high)
- Full-resolution **1920×1440 JPEG** from the rear camera
- `transform_4x4` camera-to-world, **column-major**, ARKit convention: **+Y up,
  gravity-aligned, camera looks down its own −Z**
- Pinhole intrinsics `{fx, fy, cx, cy}` at RGB resolution
- Timestamp in ARSession time

Also writes an accumulated LiDAR point cloud PLY, used later as independent ground truth.

**Keyframe selection — recently changed and important.** It was a flat 0.5 s interval, which
kept one frame in thirty and produced a depth sample only every ~31 cm on a slow walk. It is
now **distance-based**: record when the camera has moved ≥ 8 cm or turned ≥ 8°, with a 0.1 s
rate ceiling and a 2 s floor. Roughly 3× the depth density, and data now scales with ground
covered rather than time spent — which matters on large commercial sites.

### Stage 1 — TSDF fusion (Python, Open3D)

**Truncated Signed Distance Function** volumetric integration. Each posed depth frame is
integrated into a voxel volume storing, per voxel, the signed distance to the nearest surface.
The surface is then extracted where that distance crosses zero (marching cubes).

- Voxel size **12 mm**, SDF truncation **40 mm**, depth truncation **5 m**
- Confidence floor: medium and high accepted
- ARKit → OpenCV extrinsic conversion: `inv(cam_to_world @ diag(1,−1,−1,1))`
- Colour integrated per voxel from the JPEG (decoded, resampled to the depth grid)
- Stray components dropped below 2% of the largest

**Output:** ~2.3 M vertex triangle mesh, metric, gravity-aligned.

*Why TSDF rather than point-cloud meshing:* it averages many noisy observations of the same
surface into one estimate, and it is robust to individual bad frames.

### Stage 2 — Coverage gate (Python, numpy)

Compares the fused mesh's extent against the independent LiDAR point cloud. Ratio below 0.45
fails the job. This is the gate that would have caught the photogrammetry collapse — it scored
0.24.

### Stage 3 — Dollhouse post-processing (Python, Open3D)

- **RANSAC plane segmentation** to find floor and ceiling. Deliberately *not* "the two largest
  planes" — a countertop can out-vote a partly-occluded floor. The lowest qualifying
  horizontal plane is the floor, the highest is the ceiling, and they are only accepted as a
  pair if ≥ 1.8 m apart.
- **Manhattan wall snapping** — vertical planes are snapped to a four-axis grid, but a vertex
  only moves if the correction is under 4 cm. Straightens waviness; never drags geometry.
- **Ceiling identified but not removed.** Reports the cut height so the viewer can render
  open / closed / plenum states. Deleting it at processing time would make two of the three
  states impossible.
- **Decimation** to 250 k triangles — a mobile GPU budget.

### Stage 4 — Projective texturing (Python, Open3D + numpy + Pillow)

The TSDF's per-voxel colour is only as sharp as the depth grid. This stage re-samples the
surface from the **full-resolution** images.

Per frame: project every vertex, **z-buffer test against the mesh itself** (via Open3D's
raycasting) so a far wall is not painted through a near one, weight by viewing angle and
distance, bilinear sample, accumulate. Vertices no camera saw stay neutral grey and are
counted.

### Stage 5 — Floor plan and take-off (Python, Open3D + numpy)

- Horizontal slice at 1.2 m (above furniture, below wall cabinets)
- 2-D RANSAC line fitting, **split at gaps > 35 cm** so two walls either side of a doorway are
  two segments, not one
- Corner extension — sequential RANSAC gives each corner to whichever wall is fitted first, so
  walls measure short by a point spacing at each end; endpoints extend to their true
  intersection, bounded
- Opening detection via an occupancy grid on each wall plane
- **Floor area is measured from the mesh's floor triangles, not from a reconstructed polygon.**
  On a real capture the walls do not close into a loop, and polygon reconstruction latched onto
  a spurious small loop and reported 0.012 m² for a 305 sq ft room.

### Stage 6 — Accuracy reporting (Python, Open3D)

Two checks that answer different questions:
- **Fusion residual** — distance from each raw LiDAR return to the fused mesh. Validates that
  integration did not warp the surface. Does *not* validate absolute scale.
- **Standard dimension check** — measured storey height and verified door widths against
  real-world building standards. Nothing in the pipeline knows a ceiling is 9 ft, so agreement
  is genuine external evidence.

### Stage 7 — Walk stations (Python, numpy)

Trajectory sampled at 1.5 m spacing, in capture order, horizontal distance only. Floors
clustered from elevations. Produces the navigation positions the viewer moves between.

### Stage 8 — Viewer (TypeScript, React, three.js)

Matterport-style: click the floor to walk to the nearest station, drag to look, wheel or pinch
to zoom as **field of view** rather than a dolly (moving off a station would put the viewer
where no imagery exists). Modes: inside / dollhouse / floor plan, with three ceiling states.

---

## Part 4 — Software stack

| component | role | licence |
|---|---|---|
| **ARKit** (iOS) | Depth, pose, intrinsics | Apple platform |
| **Open3D** 0.18 | TSDF, RANSAC, raycasting, mesh IO | **MIT** |
| **numpy** | All numerical work | **BSD** |
| **Pillow** | JPEG decode | **HPND** |
| **Modal** | Serverless CPU/GPU compute | commercial |
| **Trigger.dev** | Job orchestration | commercial |
| **Cloudflare R2** | Object storage | commercial |
| **Supabase** (Postgres) | Database | commercial/OSS |
| **Next.js / React / three.js** | Web app and viewer | MIT |
| **COLMAP / pycolmap** | Structure-from-motion — *for 360 alignment, not yet wired* | **BSD-3-Clause** |
| **nerfstudio / gsplat** | Gaussian splatting — exterior/appearance path | Apache-2.0 |

**Licence policy — this is a hard constraint on any recommendation:**
- **AGPL is banned outright.** The network clause reaches a hosted service. This excludes
  Ultralytics/YOLO and OpenMVS.
- **Non-commercial licences are banned**, including model weights. Several strong recent
  methods ship permissive *code* with **non-commercial weights** — DUSt3R, MASt3R, CUT3R,
  Fast3R, and the default VGGT checkpoint. Code licence and weights licence must be checked
  separately, every time.
- **GPL tolerated only as a standalone subprocess binary**, never linked.
- MIT / BSD / Apache-2.0 are fine.
- Note: **SuperPoint ships inside the LightGlue repository** under a non-commercial licence, so
  it is one config line away from being used by accident.

---

## Part 5 — Current state, measured

Validated on one real capture (kitchen + dining, iPhone LiDAR + 360 at two heights):

| check | result |
|---|---|
| Mesh diagonal vs LiDAR ground truth | **14.12 m vs 13.71 m** (ratio 1.03) |
| Storey height vs the 9 ft standard | **2.781 m = 9.12 ft — 1.4% error** |
| Fusion residual to raw LiDAR | median **23.4 mm**, p95 173 mm |
| Floor plane, two independent derivations | **8 mm apart** |
| Floor area from floor triangles | **28.35 m² = 305 sq ft** |
| Vertices textured | **115,308 of 134,461 (85.8%)**, mean 14.6 views each |
| Walk stations | 10, one floor |
| Processing time, measurable deliverable | 3–6 min, CPU only |
| Processing cost | **$0.05–0.15** |
| Tests | **201 passing** |

**Two recent fixes, both our bugs rather than capture problems** — worth knowing because they
illustrate the failure mode:
- Depth was hard-throttled to 2 Hz (fixed to distance-based, ~3× density).
- Back-facing normals left 26.7% of the mesh untextured. TSDF normals come back inconsistently
  oriented, and the code scored anything back-facing at zero. Using the absolute dot product
  took it to 14.2%.

---

## Part 6 — Equipment, and what each device contributes

| device | contributes | pipeline status |
|---|---|---|
| **iPhone 16 Pro Max** | LiDAR depth (**geometry**), poses, RGB stills, RGB video | Depth/stills/poses used. **Video frames not yet used.** |
| **Insta360 X4** | 360 video, two heights — high-resolution texture on ceilings and upper walls | Unwrapping built. **Alignment unsolved — not yet fused.** |
| **DJI Avata 360** | 360 aerial video, exterior and elevated | Not integrated |
| **DJI Mavic 3 Enterprise (RTK)** | Grid photogrammetry stills with **absolute earth position** | Not integrated. **Strategically the most significant unused asset** — the route to georeferencing. |
| **DJI Mini 4 Pro / Mini 5 Pro** | Additional aerial stills/video | Not integrated |
| **Thermal camera** | Temperature imagery, pinned into the twin | Separate working path; not fused into the mesh |

**Multi-device requirement.** The architecture must accept different 360 bodies, different
manufacturers, multiple iPhone generations, and drones — without a new method per sensor. The
intended design is **one localization core plus per-device adapters**, where each adapter
answers: what projection model, was the imagery stabilised (which rewrites orientation), what
time base, what intrinsics, and what position/orientation priors exist.

---

## Part 7 — AprilTags, explained

Brian has asked what these are. This section is deliberately from first principles.

**What they are.** An AprilTag is a printed black-and-white square marker, visually similar to
a chunky QR code but far simpler — typically a 6×6 grid of black and white cells inside a
black border. They were developed at the University of Michigan for robotics.

**What makes them different from a QR code.** A QR code carries data. An AprilTag carries an
**ID and a precise geometry**. Because the detector knows the tag's exact square shape and its
printed size, it can compute the camera's **full 3D position and orientation relative to that
tag** from a single image — to within a few millimetres at close range. A QR code cannot do
that reliably.

**Why they solve our hardest problem.** Aligning a 360 camera to the LiDAR mesh requires
matching visual features between images. On painted drywall — kitchens, classrooms, new
construction — there are almost no features to match. A flat white wall looks identical
everywhere, and every matching algorithm fails there. **An AprilTag does not care.** It is
unmistakable, detectable from a wide range of angles and distances, and gives an exact 3D
answer rather than a probabilistic one.

**How they would be used in practice:**
1. Print three or more tags on ordinary A4/Letter paper. Cost: pennies.
2. Tape them to different walls, at different heights, before scanning. They must be flat and
   fully visible.
3. Scan normally. Both the phone and the 360 camera see the tags.
4. Processing detects each tag in both captures, computes its 3D position in each, and uses
   those shared points to lock the two into one coordinate frame.
5. Remove the tags. They are not in the delivered model — or they can be masked out.

**Practical parameters worth researching:** tag family (`tag36h11` is the common robust
choice), printed size versus detection distance (rule of thumb: detectable to roughly 10–20×
the tag's width, so a 20 cm tag works across a normal room), how many are needed, optimal
placement, and whether they can double as a **scale check** — a tag of known printed size
measured in the model is an independent accuracy verification that costs nothing.

**Licence:** the AprilTag C library is BSD-2-Clause; the common Python bindings are MIT. Both
are commercially usable.

**Adjacent idea worth researching:** the same trick outdoors. Printed ground control markers
placed before a drone flight, with one surveyed or RTK-measured position, would georeference
an entire site without a survey crew.

---

## Part 8 — What is still missing

| item | difficulty | why it matters |
|---|---|---|
| **360 alignment** — placing 360 frames in the LiDAR coordinate frame | **hard** — unsolved | The 360 footage is the highest-resolution texture available and is entirely unused |
| **iPhone video frames as texture** | **easy, high value** | Those frames exist in every capture ever taken; improves existing data with no re-scan |
| Multi-room / building scale (session graph) | medium | Everything is validated on ONE room. ARKit drifts over long walks. |
| Georeferencing (`site_frame`) | easy now, expensive later | Absolute position; Google 3D Tiles context; ties interior to exterior |
| Zone splitting wired into jobs | easy — written and tested | Large sites exceed a 2 h job ceiling |
| Scan-to-scan registration wired in | easy — written and tested | Progression comparison; pins surviving re-scans |
| Model crop / polish tooling | medium | Nothing ships to a client without it |
| Drone and exterior integration | medium | Whole-site deliverables |
| AGPL dependency removal | medium | Licence hygiene |

**Known sensor limits that no software fixes:** glass and mirrors (LiDAR sees through or past
them), anything beyond ~5 m with nothing between, and survey-grade precision — this is
estimating-grade documentation, and a laser governs where a legal dimension is required.

---

## Part 9 — Research questions

This is what we would most like investigated. Please verify licences from the actual
repositories, treat code and weights licences as separate questions, and flag uncertainty
rather than guessing.

### A. 360-to-mesh alignment (the blocking problem)

1. Current best practice for registering a 360 camera into an **existing posed metric
   reconstruction from a different device**? Name specific methods and repositories.
2. What has been released in the last 12–18 months that changes this? For each: **licence of
   the code, and separately the licence of the pretrained weights.**
3. Is equirect-native matching better than unwrapping to overlapping perspective views?
4. Both captures are gravity-aligned. How best to exploit that (reducing to yaw + translation),
   and which methods accept the constraint?
5. What concrete, measurable rejection criterion tells us an alignment is **wrong**? We need a
   number to gate on. A confidently-wrong alignment paints a cabinet onto the wall behind it
   and nobody can tell by looking.
6. What fails specifically on **painted, low-texture interior walls** — our dominant real case?

### B. AprilTags and physical markers

7. Optimal tag family, printed size, count, and placement for a room-scale interior scan.
8. Can a tag of known size serve as an independent **accuracy check**? How accurate?
9. Best commercially-licensed detector for both perspective and equirectangular imagery.
10. Outdoor equivalent: printed ground control with RTK, for georeferencing a site.

### C. Accuracy and detail

11. Beyond capture technique, what most improves TSDF geometry quality? Our measured
    experiments: **filtering to high-confidence depth made results worse** (p95 residual
    tripled); halving voxel size gained only ~9%. The residual sits at ~2 voxels regardless,
    i.e. resolution-limited.
12. Are there better fusion approaches than plain TSDF for consumer LiDAR — probabilistic,
    learning-based, or surfel-based — with commercially usable licences?
13. How should multiple captures of the same space be combined to improve geometry rather than
    just compared?
14. What is realistically achievable in accuracy with this sensor class, and where is the hard
    ceiling?

### D. Navigation and usability

15. What makes a walkthrough viewer genuinely usable for construction professionals on a phone
    on site — as opposed to impressive in a demo?
16. Best-practice interaction for measurement in a 3D viewer on a touch device.
17. How should multi-floor navigation work when stairs are a transition rather than a floor?
18. What do Matterport, Multivista and comparable products get **wrong**, that a focused
    competitor could exploit?

### E. Use cases and market

19. Which building-industry use cases are **underserved** by existing reality-capture products?
20. Where is a measurable twin worth more than a photographic tour, and how is that difference
    articulated to a buyer?
21. What deliverable formats do architects, engineers, and facility managers actually want —
    and can they be exported from this data?
22. What documentation requirements are becoming standard in construction contracts, insurance,
    or handover, that this could satisfy?

---

## Part 10 — Constraints any recommendation must respect

1. **Licence gate**: AGPL banned outright; non-commercial weights banned; GPL only as a
   subprocess. Verify from the repository.
2. **2-hour hard ceiling** per processing job.
3. **Runs unattended** on cloud CPU/GPU.
4. **Must fail loudly rather than align wrongly.** Leaving a wall grey is always preferable to
   smearing it. Every recommendation needs a rejection criterion.
5. **Multi-device by design.** No method that only works for one camera model.
6. **Texture-grade accuracy is sufficient** for the 360 work — roughly 5–15 cm pose error is
   fine, because it paints existing triangles rather than creating geometry.
7. **Client-facing output never names equipment.** Accuracy is stated as verified or
   estimated; what produced it is never mentioned.
