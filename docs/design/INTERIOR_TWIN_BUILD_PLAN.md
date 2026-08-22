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

### The ruling is now confirmed, not predicted (M3, 2026-08-22)

Same kitchen walk, run through the finished TSDF track:

| source | extent | diagonal | COVERAGE-1 |
|---|---|---|---|
| ARKit LiDAR cloud (ground truth) | 9.56 × 2.83 × 9.40 m | 13.71 m | reference |
| **TSDF mesh** | **8.08 × 3.09 × 11.16 m** | **14.12 m** | **PASS (1.03)** |
| SfM + splat, same room | 1.67 × 1.95 × 1.96 m | 3.23 m | FAIL (0.24) |

123 depth/pose pairs integrated → 3,430,334 triangles. Floor plane −0.545 m, ceiling
2.251 m: a **2.80 m storey**, i.e. a real room rather than the ~2 m fragment SfM collapsed
to. Dollhouse cut removed 1,003,619 triangles, 8 wall planes snapped (grid 64.6°),
decimated to 250k for the mobile budget. Photogrammetry was never going to recover this.

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
| **M3** | Wire into the job; run the kitchen capture end to end | **DONE + VALIDATED** (`713104dc`) | **mesh 14.12 m vs LiDAR 13.71 m — ratio 1.03, COVERAGE-1 PASS** |
| **M4** | Dollhouse post: floor/ceiling RANSAC, Manhattan wall snap, decimate to ~250k | **DONE (code)** (`7d40ceb7`) | 12 tests; 7 Open3D-gated ones run on Modal with M3. Planar hole fill deferred to M7 |
| **M5** | Floor plan + area take-off on the MESH | **RUNNING on real data** | kitchen: floor **28.35 m2 / 305 sq ft** from 61,412 floor triangles, perimeter 32.8 m, net wall 86.6 m2. Still needs tape validation on one real wall |
| **M6a** | Navigation logic + control bar — click-to-move, three modes, floor selector | **DONE (code)** (`7d40ceb7`) | 26 tests; all four gates pass |
| **M6b-data** | Walk stations + floors derived from poses, server-side | **DONE + VALIDATED** | kitchen: **10 stations, 1 floor at -0.537 m** (cross-checks RANSAC floor -0.545 m to 8 mm); 24 tests |
| **M6b-view** | Mesh viewer component consuming stations + dollhouse GLB | next | click-to-move works on the kitchen twin on a real phone |
| **ACC-1** | Accuracy evidence with no tape measure | **DONE + VALIDATED** | ceiling 9.12 ft vs 9 ft standard (1.4%); fusion residual median 23.4 mm; 12 tests |
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

## Accuracy — what we can and cannot claim

Measured on the kitchen, with no tape measure involved:

| check | result | what it proves |
|---|---|---|
| Storey height vs standard | 2.781 m = **9.12 ft** vs the 9 ft standard, 38 mm out (**1.4%**) | **absolute scale** — nothing in the pipeline knows ceilings come in 8/9/10 ft, so agreement is external evidence |
| Fusion residual to LiDAR | median **23.4 mm**, p95 173 mm, 52% within 25 mm | **fusion fidelity** — 123 depth frames integrated without warp or drift |
| Floor plane cross-check | RANSAC -0.545 m vs trajectory-inferred -0.537 m (**8 mm**) | two independent paths agree |

The residual is ~2 voxels at the 12 mm TSDF voxel size: **resolution-limited, not
error-limited.** Finer voxels would improve it at a memory and time cost.

**The operator never measures anything.** The LiDAR is the instrument; a tape is only ever
an engineering spot-check of our own code. Client-facing wording stays estimating-grade
with a laser governing, and a test asserts the summary never says certified, compliant,
guaranteed or exact.

## Capture SOP (interior, iPhone + 360)

1. **iPhone + LiDAR first**, one continuous ARSession. **Record at least one video clip** —
   depth only accumulates while recording. 0.5–0.8 m/s, pause ~1 s at corners, mid-height,
   AE/WB locked, close the loop back through the start. Keep walls within ~5 m (sensor range).
2. **360 walk second**, same visit, camera high on the pole, two heights, slow, loop closed.
3. Optional 360 stills every 3–5 m **while walking the route** — texture and pose anchors,
   never a station grid (that is the AOB205 zero-baseline failure).
4. Scale reference when no LiDAR: one tape-measured wall, or an architectural drawing.

## Progress

With M3 validated on real data: **~60%** of the interior twin track.

The jump from 45% is not bookkeeping. Every geometry slice was written but unproven, and
the whole architecture rested on an untested claim. That claim is now measured and correct,
so the remaining work is ordinary engineering rather than a bet.

| band | slices | state |
|---|---|---|
| Geometry | G0 · M1 · M2 · M3 · M4 | **done and validated on a real capture** |
| Client surfaces | M5 (running) · M6b | M5 produces numbers on real data; needs tape check. M6b next |
| Hard remainder | M7 · M8 (code) · REG-1 (code) · MASK-2 | M8 + REG-1 code landed and tested, not yet wired |

**What is now sellable:** a metric mesh and a dollhouse of a real room, produced CPU-only in
minutes. What is missing before a client sees it is M5 (numbers on the geometry) and M6b
(a viewer wired to it) — both small, both unblocked.

## Product architecture — what the twin becomes

Locked here so it is not re-litigated. None of this is scheduled; it is the shape the
geometry work is deliberately making possible.

### Measuring a floor: why the mesh beats the polygon

The kitchen exposed this. Reconstructing a floor polygon from wall segments gave
**0.012 m2**; summing the mesh's own floor triangles gave **28.35 m2 (305 sq ft)**. On a
real capture the walls simply do not close into a loop — doorways, furniture occlusion and
honest sensor holes fragment them, and the greedy chain then latches onto a small spurious
loop. Ranking loops by area instead of vertex count is still correct and is kept, but the
floor triangles are a DIRECT measurement of the same quantity and need no reassembly.
`floor_area_source` records which number was used, so a client-facing figure is never
silently a fallback.

The take-off shows the same discipline working: 86.6 m2 net wall with **56.1 m2 flagged
unverified**. That large unverified fraction is the honest signal that the capture had
gaps — not a defect. Those voids are never subtracted from the number a contractor bids off.

### Cropping

Two different operations that must not be conflated:

- **Automatic** — the ceiling cut (M4) and COVERAGE-1 (G0). No user involvement.
- **Manual** — the box/lasso crop that already exists in `lib/digital-twin/splat-edit-runtime.ts`,
  applied as a *non-destructive edit list* on the stored model. That distinction is the whole
  design: the client's crop is a saved view, the master model is never cut. Same mechanism
  extends to a per-floor crop and a per-room crop with no new storage model.

The blob problem was never solved by cropping. It was solved by replacing the geometry
source. Cropping is a presentation tool, not a repair tool.

### Floors and levels

Floors come out of the geometry, not out of a form: M4's RANSAC returns floor and ceiling
planes per storey, and station Y clusters around them. `FloorInfo[]` is populated from that,
with the operator able to rename "Level 2" to "Mezzanine".

**Dropdown, not icons.** Icons work for 3–4 floors and fall apart at 12; a dropdown is
uniform at any building height, and it is what Matterport settled on. The control bar
already renders it only when `floors.length > 1`, so a single-storey house shows no floor UI
at all. Vertical movement is by *selecting a floor*, never by flying — stairwell imagery is
usually the worst in a capture.

### Mobile

Designed for the phone first, because that is where a superintendent opens a link on a job
site. Concretely: 44 px minimum targets, `env(safe-area-inset-bottom)` respected, mode labels
collapse to icons under `sm`, and the whole interaction model is one-finger (tap to move,
drag to look) with no gesture requiring two hands. The 250k-triangle decimation target in M4
is a mobile GPU budget, not an aesthetic one.

### Twin-as-focal-point project management

This is the actual product thesis: the twin is not a deliverable filed in a folder, it is the
*index* into the project. The pieces already in the codebase:

- **Pin attachment kinds** already include `document`, `image`, `panorama_360`, `thermal`,
  `link`, and `proposal`/`invoice`. Invoices, RFIs, submittals and POs are new *types* on an
  existing schema — not a new subsystem. That is the cheapest item on this whole list.
- **Version history and progression compare** already exist for models.
- **SlateDrop** already auto-provisions per-project folders, so a pinned submittal is a real
  file in the project's file system, not an orphan blob.

What is missing is the *spatial* half: a pin's position must survive re-scanning. A pin
dropped on a wall in the March scan has to still be on that wall in the June scan. That
needs scan-to-scan registration — which the TSDF mesh makes tractable (align geometry to
geometry) and which photogrammetry never would have.

### Progression and historical access

Scans of the same site become a **timeline on one space**, not four unrelated models. Given
registration, the client gets a date slider and a side-by-side compare. This is the single
highest-value feature for the service business — a contractor paying for monthly scans is
buying the *diff*, not the model.

### Overlays for in-wall / floor / ceiling detail

An overlay is a second geometry layer registered to the twin and toggled per-discipline
(structural, mechanical, electrical, plumbing). The mechanism is the same one the pin
positions need. The value case is obvious and correct: the pre-drywall scan *is* the
as-built record of what is inside the wall, and it is worth more after drywall than before.

### Comparison against permitted drawings

Brian's scenario — contractor uploads the permitted set, scan two months in, check that
everything is in the correct place and complete — is the killer application, and it is also
the hardest thing on this page. It requires:

1. A metrically correct scan. **This is what the depth-first pivot buys.** Comparison against
   drawings is meaningless on a model with a 24% coverage ratio, which is exactly why this
   was not attempted on the splat pipeline.
2. Drawing-to-twin alignment — 2D plan georeferenced into the twin's coordinate frame.
   Semi-automatic at best; assume the operator picks 3 corresponding points.
3. Deviation measurement and tolerance thresholds.

**Liability line, non-negotiable:** the output is *"this wall is 90 mm from where the drawing
places it"* — a measurement with a stated method and tolerance. It is never *"this is
non-compliant"* or *"this passes inspection."* Brian is not the Engineer of Record and the
deliverable must not read as though he is. Same rule already locked for thermal reports.

### Clash detection

Deliberately last. Real clash detection is a BIM-model-versus-BIM-model operation; what a
scan supports is **as-built versus design-intent**, which is a different and more defensible
claim. Worth building only after registration, overlays, and drawing comparison exist — it is
a consequence of them, not a separate feature.

## Standing rules

- **Never publish on train PSNR.** It is an overfit meter; it rose as coverage collapsed.
- **Never read the scale residual as coverage.** It is a local-consistency check.
- Every model passes COVERAGE-1 before a link is minted; a failing job charges nothing.
- Client-facing numbers only when scale is anchored, labelled estimating-grade, laser governs.
- Interior = TSDF. Exterior = Delaunay. AGPL banned; GPL tolerated only as a server-side tool.
