# Research Request — aligning 360 video to a LiDAR mesh, with no fixed rig

*Give this to several AI platforms. We want independent opinions and current research.*

---

You are advising a production reality-capture pipeline for construction documentation. We
have a specific, well-characterised problem that we have not solved, and we want the most
current research, open-source projects, and public GitHub repositories that could solve it —
including anything released very recently.

## What we have, precisely

### A. iPhone Pro LiDAR capture — working and validated

A single continuous ARKit session. Per keyframe we store:

- **Depth**: 256×192 `uint16` millimetre depth map, plus a 256×192 `uint8` confidence map
- **Colour**: a full-resolution **1920×1440 JPEG**
- **Pose**: `transform_4x4`, camera-to-world, **column-major**, ARKit convention — **+Y up,
  gravity-aligned, camera looks down its own −Z**
- **Intrinsics**: pinhole `{fx, fy, cx, cy}` at RGB resolution
- Timestamp in ARSession time
- Separately: an accumulated ARKit LiDAR point cloud (PLY), and **full-rate RGB video**

Keyframes are distance-based: recorded every 8 cm of travel or 8° of rotation.

**This half works.** Most recent capture (387 keyframes, 231 s, one room):

| check | result |
|---|---|
| Mesh diagonal vs LiDAR ground truth | ratio **1.09** |
| Storey height vs the 9 ft building standard | **2.806 m = 9.2 ft, 2.4% error** |
| Fusion residual to raw LiDAR | median **26.8 mm**, p95 171 mm |
| Floor area, from floor triangles | **29.42 m² = 316.7 sq ft** |
| Vertices textured from iPhone stills | **76,051 of 121,347 — 37.3% untextured** |

Geometry via **TSDF volumetric fusion** (Open3D), 12 mm voxels. Texturing is projective
per-vertex sampling with raycast occlusion testing.

### B. Insta360 X4 360 video — captured, unusable

Equirectangular video of the same space. Raw `.insv` files, 4 GB, containing a proprietary
metadata trailer (verified present; IMU content not yet parsed).

**What we do NOT have, and this is the whole problem:**

- **No camera poses.** The 360 records images and nothing about where it was.
- **No shared clock** with the ARKit session — separate devices, separate starts.
- **No fixed rig.** ← *This constraint changed and is critical.*

## The constraint that rules out the obvious answer

We previously considered rigidly mounting the phone and 360 camera together, solving the
fixed offset once, and reusing it. **This is not viable for us.**

The mount is a selfie stick that retracts and re-extends, with a screw-on adapter. The
geometric relationship between the two cameras is **different on every capture** and cannot
be measured reliably. Sometimes the two devices will not be mounted together at all — the
operator may walk the LiDAR scan and shoot 360 separately, or use a 360 drone with no phone
involved.

**Any solution that depends on a known, repeatable rig geometry is unusable.** Assume the
360 camera could be anywhere relative to the phone, on any given job.

We note one weaker property that may still help: when both devices *are* carried together on
one pole during a single walk, the offset is constant **within that capture**, even though it
differs between captures. A method that solves one unknown offset per capture is acceptable.
A method requiring a factory-calibrated rig is not.

## What we need

**Two separate capabilities.**

### Problem 1 — Fuse 360 video into an existing LiDAR mesh

Place each 360 frame's optical centre in the same coordinate frame as the ARKit poses, so
our existing projective texturer can paint the 360's higher-resolution imagery onto surfaces
the phone camera saw poorly — ceilings, upper walls, anything at a grazing angle.

**Texture-grade accuracy is sufficient: roughly 5–15 cm pose error.** We are painting
existing triangles, not creating geometry.

### Problem 2 — Build a usable twin from 360 video ALONE

Many jobs will have only 360 footage: a 360 drone, a site where the phone was not used, or
imagery from a client. We need to produce something valuable from that with no depth sensor
and no poses.

We understand this cannot be a *measurable* twin without a scale reference. We want to know
what the honest best product is, and what the current state of the art can actually deliver.

## Hard constraints — these decide the answer

1. **Licensing.** This is a commercial SaaS.
   - **AGPL is banned outright** — the network clause reaches a hosted service.
   - **Non-commercial licences are banned, including model weights.** Several strong recent
     methods ship permissive *code* with **non-commercial weights** — please check both,
     separately, from the actual repository, and state what you found.
   - GPL tolerated only as a standalone subprocess binary, never linked.
   - MIT / BSD / Apache-2.0 are fine.
2. **Runs unattended** on a cloud CPU/GPU worker. **Hard ceiling 2 hours per job.**
3. **Must fail loudly rather than align wrongly.** A 360 frame placed 30 cm off paints a
   kitchen cabinet onto the wall behind it, and nobody looking at the result can tell it is
   wrong. Every recommendation needs a concrete rejection criterion — a number we can gate on.
4. **Our dominant real-world case is painted, low-texture interior walls** — kitchens,
   classrooms, new-construction drywall. Feature matching is weakest exactly there.
5. Python 3.10; we currently use numpy, Open3D, Pillow. We can add dependencies with clean
   licences.

## Research questions

Please answer each explicitly, and prefer current sources over recollection.

### On Problem 1 — 360 into an existing mesh

1. **What is the current best practice** for registering a 360 camera into an existing posed,
   metric reconstruction from a *different* device, with **no rig calibration**? Name specific
   methods and repositories.
2. **What has been released recently** — the last 12–18 months — that changes this? We are
   interested in learned feature matching and pose-free reconstruction. For each: **licence of
   the code, and separately the licence of the pretrained weights.**
3. Is it better to match equirectangular imagery natively, or to unwrap to perspective views
   first? What do the current tools actually support?
4. Both captures are gravity-aligned. How best to exploit that, and does constraining to
   yaw-plus-translation help as much as we assume?
5. **What is the concrete rejection criterion** for your recommended method? We want a number.
6. What specifically fails on painted low-texture walls, and is there a method robust there?

### On Problem 2 — 360-only

7. What is the **realistic best deliverable** from 360 video alone, with no depth sensor?
   Navigable tour, photogrammetric mesh, Gaussian splat, something newer?
8. What is the current state of the art for **geometry from equirectangular video**, and how
   good is it honestly? Note: we previously attempted structure-from-motion on interior
   imagery and it collapsed catastrophically — producing a 3.23 m model of a 13.71 m room
   while reporting excellent internal quality scores. We are wary.
9. **Monocular and panoramic depth estimation** has advanced quickly. Can a learned depth
   model produce usable interior geometry from 360 video? What accuracy, and what licences?
10. How would scale be recovered without a depth sensor — a known object, a printed marker,
    a measured dimension, camera height, something else?

### On physical aids — please be concrete

11. **AprilTags or similar fiducial markers.** We understand these are printed squares that a
    camera can locate precisely in 3D. Would placing several in a room before scanning solve
    the alignment problem for both cases? What tag family, printed size, how many, where
    placed, and what accuracy would result? What is the best commercially-licensed detector,
    and does it work on equirectangular imagery?
12. **Could a tag of known printed size serve as an independent accuracy check** — verifying
    the model's scale with no tape measure?
13. **What other inexpensive physical aids** could help? Printed ground control, a folding
    ruler left in frame, a known-size object, a cheap GNSS receiver, retroreflective markers,
    a laser distance meter reading captured in frame? We are open to anything that costs
    little and travels in a bag.
14. **Outside-the-box options.** Is there an approach we have not considered — a different
    capture procedure, a cheap piece of hardware, a hybrid method, or a recent technique that
    sidesteps the problem rather than solving it?

### Sources

15. Please name **specific open-source projects and public GitHub repositories** worth
    examining, for solutions or inspiration. Include the licence, when it was last updated,
    and how mature it is. We would rather adopt something proven than write it.

## Deliverable

1. A comparison of realistic options for **each** problem — how each works, what it needs, how
   it fails, expected accuracy, compute cost against our 2-hour ceiling, and **verified
   licence**.
2. **A clear primary recommendation for each**, with a fallback.
3. The rejection criterion for each recommendation, as a number.
4. Specific repositories worth using, with licence and maturity.
5. A concrete answer on physical markers: worth it or not, and exactly what to buy or print.
6. **An explicit list of what you are unsure about.** We would much rather have a flagged
   uncertainty than a confident wrong answer — we have already shipped two confident wrong
   answers in this pipeline and caught them only by measuring.

Prose is fine; code is not needed. Cite repositories and papers with dates, and say plainly
when something you remember may be out of date.
