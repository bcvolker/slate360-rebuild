# Interior Twin Build Plan — depth-first (LOCKED 2026-08-22)

The plan of record for producing Matterport-class interior twins. Supersedes the
splat-first assumption. Every item has an acceptance test; nothing is "done" until it passes.

## Why the architecture changed

Photogrammetry was the load-bearing geometry stage, and it collapsed. Measured, on a
kitchen+dining walk:

| source | extent | diagonal |
|---|---|---|
| ARKit LiDAR cloud (ground truth) | 9.56 × 2.83 × 9.40 m | **13.71 m** |
| SfM + splat model of the same room | 1.67 × 1.95 × 1.96 m | **3.23 m** |
| TSDF unprojection of the same depth (10% sample) | 6.01 × 2.80 × 8.74 m | **10.97 m** |

COLMAP registered one ~2 m connected component and dropped the rest of the walk. Train PSNR
was **32.65** — the highest ever recorded — precisely because a small overfit scene is the
easiest thing to fit. The metric-scale check reported a healthy 4% residual because that
residual asks whether 88 cameras are a similarity of 88 ARKit poses: a LOCAL consistency
question, silent about coverage.

**Ruling: when metric depth exists, depth IS the geometry.** TSDF cannot fail this way —
each depth frame contributes independently, with no matching chain to break.

## Layer model

| layer | source | serves |
|---|---|---|
| **Geometry** | TSDF from ARKit depth + poses (Open3D, MIT) | dollhouse · floor plan · floor selector · walk collision · measurement |
| **Appearance** | 360 / phone imagery — splat overlay or mesh texture | photoreal walkthrough |
| **Walk positions** | original panoramas at registered poses | Matterport-style station-to-station navigation |

Exterior stays on the existing Delaunay/photogrammetry path — open aerial scenes and bounded
rooms are different problems, and Delaunay is correct there.

## Status

| # | Slice | State | Acceptance test |
|---|---|---|---|
| **G0** | COVERAGE-1 gate — model must span the scanned space | **DONE** (`2832877b`) | kitchen collapse (ratio 0.24) fails; 5 tests |
| **M1** | S360DEPTH1 parser + pose pairing + intrinsic/extrinsic math | **DONE** (`3153e0f8`) | 123 records paired 1:1; unprojection reproduces 10.97 m; 9 tests |
| **M2** | TSDF integration → mesh, component filtering | **DONE** (code) | needs a real run on Modal (Open3D not installable locally) |
| **M3** | Wire into the job; run the kitchen capture end to end | **NEXT** | mesh extent ≥ 0.7 × LiDAR extent; passes COVERAGE-1 |
| **M4** | Dollhouse post: floor/ceiling RANSAC, Manhattan wall snap, planar hole fill, decimate to ~250k | not started | ceiling cut yields a top-down view with flat walls |
| **M5** | Floor plan + area take-off surfaced client-side (existing `floorplan.py` / `openings.py` run on the MESH, not the splat) | not started | net wall area within 5% of tape on one real wall |
| **M6** | **Viewer rebuild — Matterport-style navigation** | not started | click-to-move between positions; dollhouse/floor-plan/inside modes; floor selector; measurement on mesh |
| **M7** | Appearance layer: texture the mesh and/or align the splat to mesh geometry | not started | no ghost operator; walls read as surfaces not fuzz |
| **M8** | Zone splitting for large buildings (>~1,500 views exceeds the 2 h job ceiling) | not started | a warehouse processes as N zones stitched in one frame |
| **MASK-2** | Replace AGPL Ultralytics with Mask R-CNN / SAM 2 | not started | no AGPL in the image SBOM |

## Measured processing times (real jobs, this week)

| capture | views | wall clock |
|---|---|---|
| iPhone + LiDAR kitchen | 137 | 19 min |
| phone video (car) | 195 | 22 min |
| single 360 video | 784 | 60 min |
| three 360 videos (3.4 GB) | 816 | 68 min |
| 20 × 360 stills @ 45k iters | 320 | 85 min |

Pattern: ~15 min fixed overhead + 3–4 s/view. **Hard ceiling: 2 h per job**
(`MAX_DURATION_SECONDS = 7200`) ⇒ roughly 1,500–2,000 views. Large sites must be zoned (M8).

**Two-speed delivery** the depth-first split unlocks: the TSDF mesh (measurement, floor plan,
dollhouse) is CPU-only and returns in **minutes**; the photoreal layer finishes in **hours**.
Sell the measurable deliverable same-day, the walkthrough overnight.

## Capture SOP (interior, iPhone + 360)

1. **iPhone + LiDAR first**, one continuous ARSession. **Record at least one video clip** —
   depth only accumulates while recording. 0.5–0.8 m/s, pause ~1 s at corners, mid-height,
   AE/WB locked, close the loop back through the start. Keep walls within ~5 m (sensor range).
2. **360 walk second**, same visit, camera high on the pole, two heights, slow, loop closed.
3. Optional 360 stills every 3–5 m **while walking the route** — texture and pose anchors,
   never a station grid (that is the AOB205 zero-baseline failure).
4. Scale reference when no LiDAR: one tape-measured wall, or an architectural drawing.

## Standing rules

- **Never publish on train PSNR.** It is an overfit meter; it rose as coverage collapsed.
- **Never read the scale residual as coverage.** It is a local-consistency check.
- Every model passes COVERAGE-1 before a link is minted; a failing job charges nothing.
- Client-facing numbers only when scale is anchored, labelled estimating-grade, laser governs.
- Interior = TSDF. Exterior = Delaunay. AGPL banned; GPL tolerated only as a server-side tool.
