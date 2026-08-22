# Sensor Fusion Architecture — LOCKED 2026-08-22

How any camera's imagery gets into a metric twin. Synthesised from four independent
research responses that converged, plus what was verified locally.

## The ruling

**This is a localization problem, not a reconstruction problem.** The LiDAR mesh is the
authority. Every other sensor is a *texture source* whose cameras must be located inside the
already-metric frame. Nothing else re-derives geometry.

All four responses independently rejected the alternative (solve the 360 separately, then fit
a similarity transform onto the ARKit trajectory). In a rectangular room with three different
walk routes and no shared clock, trajectory-shape matching produces a confident one-doorway
offset that scores well. That failure is invisible to every metric except a photometric check.

## Settled facts

| claim | verdict | how |
|---|---|---|
| **COLMAP licence** | **BSD-3-Clause, NOT GPL** | All four responses verified from `COPYING.txt` / `doc/license.rst`. The GPL story is real but historical — *optional* deps (LSD/AGPL, Graclus/PBA/GPL) contaminated some built binaries, never the source. LSD became optional in PR #2578. |
| Consequence | **Link `pycolmap` directly** | No subprocess boundary needed. Audit the shipped wheel's bundled deps once. |
| GLOMAP | BSD-3, merged into COLMAP | Usable. |
| X4 writes IMU | **Claimed by all four; NOT yet verified on our files** | See below. |

I previously told Brian COLMAP was GPL, repeating one platform's claim. That was wrong, and
it made the design harder than it needed to be.

### What was verified locally on Brian's actual kitchen capture

Three `.insv` files, 898 MB–1.49 GB, `C:\Users\bcvol\OneDrive\Desktop\House Walk\`.

- **Trailer magic present** — `8db42d694ccc418790edff439fe026bf`, stored as an **ASCII
  string** in the last 32 bytes, not as raw bytes. A raw-byte search finds nothing; this cost
  one wrong conclusion before the tail was dumped.
- **Maker notes present** — the string `Insta360 X4` appears in the trailer region.
- **IMU content NOT confirmed.** The `uint32` preceding the magic (11,501,788) was read as a
  trailer length; scanning that region for 56-byte IMU records found **21 gravity-magnitude
  float64 values in 11.5 MB**, which is noise. Either that length means something else or the
  records are laid out differently. X4 changed the trailer layout from X3: registries are no
  longer contiguous and must be read through an index table.

**Do not design the gravity constraint around IMU until `telemetry-parser`
(MIT OR Apache-2.0) confirms a populated `0x0300` registry on these files.** It is a Rust
crate with a Python wheel; the Modal image needs a Rust toolchain. That is the next concrete
task and it is ~1 hour.

## Licence gate — decided, do not revisit per-feature

**Usable** (code and weights both permissive, verified by multiple responses):
`pycolmap`/COLMAP BSD-3 · GLOMAP BSD-3 · hloc Apache-2.0 · **ALIKED BSD-3** ·
**LightGlue Apache-2.0** · DISK Apache-2.0 · XFeat Apache-2.0 · RoMa MIT (+DINOv2 Apache) ·
telemetry-parser MIT/Apache · AprilTag BSD-2 · Open3D MIT · MediaPipe Apache-2.0.

**Banned from the production path:**
`SuperPoint`/`SuperGlue` (Magic Leap non-commercial — **and it ships inside the LightGlue
repo, so it is one config line away from being used by accident**) · DUSt3R / MASt3R /
CUT3R / Fast3R (CC BY-NC-SA) · VGGT default `VGGT-1B` weights (CC BY-NC) · π³ (permissive
code, NC weights) · OpenMVS (AGPL) · Ultralytics/YOLO (AGPL) · EDM / IM360 (no licence file,
Matterport3D-trained).

**The trap, stated once:** several strong 2025–26 methods ship *permissive code with
non-commercial weights*. Check both, every time. `MapAnything` is the notable exception —
Apache-2.0 code with a genuinely Apache-2.0 checkpoint (`facebook/map-anything-apache`)
alongside its NC sibling. Worth an experiment, not a foundation.

## The pipeline

```
LiDAR capture ──► TSDF mesh (metric, gravity-aligned)   ◄── AUTHORITY, never modified
     │                    │
     │ posed RGB          ├──► phone-textured vertices (working: 94,807 / 129,398)
     ▼                    │
COLMAP model with ARKit poses and intrinsics HELD FIXED
     │  (point_triangulator — no free bundle adjustment, no drift)
     ▼
sparse 3D landmarks, natively in the ARKit frame
     ▲
     │ 2D–3D matches
     │
other camera ──► keyframes ──► OVERLAPPING perspective views ──► ALIKED + LightGlue
                                                                       │
                                                          gravity-constrained PnP
                                                                       │
                                                            ┌──────────┴──────────┐
                                                       rejection battery      accepted pose
                                                            │                      │
                                                        stays grey        ──► existing cube-face
                                                                               unwrap + texturer
```

**Matching and texturing use different representations, and this matters.** Six hard 90° cube
faces are correct for texturing (already built and tested) and *wrong* for matching — a
feature straddling a face boundary is extracted twice, badly, or not at all. Matching uses
8–12 **overlapping** views (~110° FOV) sharing one optical centre.

## Multi-device: one core, per-device prior adapters

Brian's requirement — different cameras, brands, 360 drones, newer LiDAR iPhones — is an
architectural constraint, not a later port. **Do not grow a method per sensor.**

| device | geometry source | pose prior adapter | texture path |
|---|---|---|---|
| iPhone Pro + LiDAR | TSDF (authority) | ARKit, native | its own RGB |
| Insta360 X4 / X5 | none — never remesh from 360 | IMU gravity + relative rotation | cube unwrap → texturer |
| Any 360 camera | none | gravity from IMU, or from the mesh floor plane | same |
| Phone without LiDAR | none, unless a mesh already exists | SfM, or ARKit if present | same |
| 360 drone (Avata etc.) | exterior photogrammetry mesh | GPS + IMU from telemetry-parser | same |

Everything below the adapter is shared: overlapping-view rendering, ALIKED+LightGlue,
gravity-constrained PnP, the rejection battery, the texturer. **A new camera is a new adapter
answering one question: how do we get gravity (and optionally position) for this sensor?**

## Exploiting what we know — cheaper than better matchers

Constraints beat descriptors on low-texture walls. In order of leverage:

1. **Gravity → 4-DOF.** Both captures are gravity-aligned. Solve yaw + translation only.
   Rectify each view by gravity *before* matching — that removes two axes of appearance
   variation and raises match rates, not just optimiser convenience.
2. **Pole height → effectively 3-DOF.** The X4 sits on a pole of known length and the mesh
   has a detected floor at −0.537 m and a validated 2.781 m storey. Camera `z ≈ floor + pole
   length ± a few cm`. Only one response spotted this and it is nearly free.
3. **Temporal continuity.** Video gives strong neighbour priors. An isolated "successful"
   localization that disagrees with its neighbours is precisely the one-doorway failure.

## Rejection battery — grey is success

Numbers are **starting points to calibrate**, not constants. The four responses disagreed
(30 vs 40 vs 50 inliers; 2 px vs 8 px; NCC 0.6 vs ΔE 15 vs 28) which is itself the signal:
fit them on the kitchen by holding out 10% of iPhone views and measuring same-camera residual,
then set the gate above that distribution's p95.

Per keyframe — **all** must pass:
- ≥ 30 PnP inliers, inlier ratio ≥ 0.25
- median reprojection ≤ 2 px at 1024 px face resolution
- inliers spread over ≥ 60° azimuth and ≥ 2 views (not one painting)
- gravity disagreement ≤ 3°
- solved `z` within ±15 cm of floor + pole length
- position within ~0.5 m of the track interpolated from accepted neighbours
- **photometric cross-check**: render the already-textured region from the solved pose,
  require NCC ≥ 0.6 on ≥ 200 overlapping vertices

Job level: ≥ 60% of keyframes accepted **and** forming a connected track, **and** grey-vertex
count measurably reduced. Otherwise deliver phone-only texture and fail loudly.

**The photometric check is the one that matters.** RANSAC inliers cannot catch a confident
wrong pose on flat drywall; comparing against geometry we already trust can. A pose 30 cm off
fails instantly on cabinet edges.

Unverified frames may paint **grey vertices only** — never overwrite iPhone colour.

## Capture SOP — the highest-leverage change

Every response independently concluded the procedure beats the algorithm. For the kitchen
already shot we must solve the hard problem; for everything after:

1. **Co-mounted calibration lap.** Strap phone and 360 rigidly together, walk a small loop at
   the start. That is a hand-eye (AX=XB) solve — afterwards the whole 360 walk chains onto the
   ARKit frame through a rig transform. Ten seconds of operator time.
2. **Sync gesture.** A sharp pole rotation or tap with both recording. Gyro cross-correlation
   aligns the clocks retroactively.
3. **Three printed AprilTags** on the walls (BSD-2 detector). Directly solves the drywall case:
   tags do not care about texture. For a documentation product, "stick three tags up before
   walking" is an honest professional procedure.
4. Same route, both passes. Pause at corners and doorways. Keep raw `.insv` — export may strip
   the telemetry trailer.

Best end state: phone rigidly mounted below the 360 on the same pole, lever arm measured. Then
fusion is an offset application, not a registration. That is how Matterport-class kits actually
work — known rig, not clever SfM.

## Honest expectations

- Texture-grade only: **5–15 cm** pose error. We are painting existing triangles, not creating
  geometry.
- On this kitchen (three routes, no sync, painted walls) expect **partial success** — ceiling
  and upper walls may register while flat side walls fail. That is the correct outcome.
- **Never bake the low 360 pass** until real person segmentation lands: on a low pass the
  operator is in the upward view, and the geometric nadir mask cannot catch it.
- Glass, mirrors, and anything past ~5 m with no triangles stay grey regardless. The fix there
  is a second slow LiDAR pass, not more 360 code.
