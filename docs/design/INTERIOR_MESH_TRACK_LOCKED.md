# Interior Mesh Track — LOCKED (2026-08-21)

Adjudicates three external audits of "walking 360 video → clean interior mesh". Where they
disagreed, the ruling and its reason are recorded here.

## License finding — corrected, NOT an emergency

One audit claimed the shipped photogrammetry worker "is NOT clean" because
`colmap delaunay_mesher` links CGAL, whose algorithm packages are GPL-3+. The CGAL/GPL
dependency is **real and confirmed** ([COLMAP #752](https://github.com/colmap/colmap/issues/752),
[CGAL license](https://github.com/CGAL/cgal/wiki/License)). The conclusion is overstated:

- We **run COLMAP as a server-side tool** and do not distribute it. GPL obligations attach to
  *distributing* the covered work or a derivative of it — not to artifacts a GPL tool produces.
  This is the GCC case: compiling proprietary code with a GPL compiler does not infect the
  binary.
- **AGPL is the one that reaches us**, because §13 extends obligations to users interacting
  with the software *over a network*. That is exactly why ODM, OpenMVS and Ultralytics YOLO
  are banned here, and plain GPL is a different question.
- Invoking a separate binary via subprocess is arm's-length use, not linking.

**Ruling:** no violation, no emergency, no rollback of the exterior worker. We still move
interiors to Open3D TSDF (MIT) — for the technical reasons below, not licensing. Keep the
AGPL ban absolute; treat GPL-as-a-server-side-tool as acceptable but not preferred.

## Mesher: three-way disagreement, resolved

| audit | proposed | ruling |
|---|---|---|
| A | Open3D Screened Poisson (rooms are watertight) | rejected as primary |
| B | COLMAP Delaunay primary, Poisson fallback | rejected for interiors |
| C | **Open3D TSDF + marching cubes** | **ADOPTED** |

Reasoning: Delaunay is built for open scenes and is why the *exterior* worker uses it —
correct there, wrong indoors. Poisson closes surfaces, so it balloons doorways and window
openings into solid walls. TSDF integrates depth maps into a bounded volume and **leaves
honest holes where no depth exists**, which is the truthful result for drywall, glass and
glossy floors. It also unifies both arms: the same TSDF consumes PatchMatch depth (360-only)
or ARKit depth (LiDAR upcharge), so there is one mesher, not two.

**Interior = TSDF. Exterior stays Delaunay/graph-cut.** That is not an inconsistency; open
aerial scenes and bounded rooms are different geometry problems.

## Unanimous across all three (high confidence)

1. **Masks must be applied at FOUR stages** for a mesh: SfM feature extraction
   (`--ImageReader.mask_path`), PatchMatch dense (undistorted masks), fusion, and texturing.
   Our splat path masks **only the nerfstudio training loss** — COLMAP has always seen the
   operator. Splats tolerated that; MVS will reconstruct him as a trailing ghost wall.
2. **`--PatchMatchStereo.min_triangulation_angle 3`** — one flag, excludes the zero-baseline
   intra-frame pairs from stereo. Ship this before the rig if the rig slips.
3. **Camera rig** via `colmap rig_configurator` + `rig.json` after feature extraction (NOT
   `--ImageReader.single_camera_per_folder`). Moderate SfM gain; large MVS gain — it stops
   PatchMatch treating two faces of the same sphere as a stereo pair.
4. **Do not run interiors through `ns-process-data`** — no mask path, no rig. Interior SfM
   uses the COLMAP CLI, same pinned image as the photogrammetry worker.
5. **Never inpaint before reconstruction** (invented texture becomes invented geometry).
   Fill the floor hole under the operator with the **fitted floor plane**. Inpainting is
   allowed at texture time only, on frozen geometry.
6. **High-held is the product default.** Operator, hand and pole sit at/below nadir, which
   the ±35° ring geometry already excludes. Low-held puts the torso in the prime 0° ring.
7. **Stills help texture and pose, not geometry.** ~1 every 3–5 m, taken *while walking the
   route*, mixed into the same SfM solve. Never a station grid — that is the AOB205 failure.
8. **Face budget ~250–400k per room**, not the exterior's 1.5M.
9. **Mask, don't cull.** Dropping operator-heavy frames fragments the sequential chain
   (measured: registration 91 → 55). Cull only frames that are mostly operator.

## MASK-2 — model choice corrected

Two audits proposed **MediaPipe Selfie Segmentation**. The third correctly rejected it: it is
trained on face-on portrait subjects under ~2 m and will miss a walking operator seen from
the side or behind in a 360 crop, and it cannot mask the pole. **Do not ship it.**

Adopted: **Mask R-CNN** (torchvision BSD / Detectron2 Apache-2.0) for full-body instance
masks, optionally **SAM 2** (Apache-2.0) prompted from the first detection and tracked across
the walk to kill per-frame flicker. Pole handled geometrically (nadir disk masked on the
equirect before unwrap) plus a wider person dilation (20–40 px, up from today's 12).

Also flagged and banned: **RobustVideoMatting is GPL-3.0** (relicensed 2021) — do not adopt.

## Exterior + drone (DJI Avata 360)

Unchanged from the locked EXT-SPLAT direction, and consistent with the above:
- Exterior walkthrough product = **splat** from ground 360 walk + drone 360 orbits.
- Exterior mesh/ortho = **Delaunay** path on the drone photogrammetry worker (open scene).
- Avata 360 video enters through the **same 360 ingest** as the X4. Expect the known
  aerial–ground weakness: different GSD and weak overlap between a ground walk and a
  high orbit, so pair passes at intermediate heights rather than jumping ground → roofline.
- Grid/mapping stills stay hard-split onto the mesh/ortho track; they must never route into
  a splat job.

## Build slices (in order)

- **M1** COLMAP CLI interior SfM: masks at feature extraction + `rig.json` + sequential
  matcher with loop detection. Acceptance: AOB205 walking video solves with one 6-DOF pose
  per timestamp; registration ≥ the 573/784 baseline.
- **M2** PatchMatch with undistorted masks + `min_triangulation_angle 3`; dump geometric
  depth. Acceptance: no operator-shaped geometry in the fused cloud.
- **M3** Open3D TSDF (voxel 0.02, sdf_trunc 0.06, depth_trunc 8.0) → marching cubes →
  largest component. Acceptance: room-shaped mesh, holes where drywall/glass gave no depth.
- **M4** Floor/ceiling RANSAC, Manhattan wall snap, planar hole fill, floor-plane cap under
  the operator, dollhouse clip, decimate to ~250k. Acceptance: dollhouse view with flat walls.
- **M5** Texture via `mesh_texturer` on masked views, stills preferred. Acceptance: no ghost
  operator in the atlas.
- **M6** LiDAR arm: swap PatchMatch depth for ARKit depth in the same TSDF (voxel 0.012,
  sdf_trunc 0.04, depth_trunc 5.0). Acceptance: metric mesh, measurement unlocked.
- **M7** MASK-2 (Mask R-CNN/SAM 2), delete Ultralytics. Acceptance: no AGPL in the SBOM.

Splat remains the photoreal orbit layer. Walk mode teleports between the original 360
photospheres. Measurement raycasts the mesh (MEAS-1), never the splat.
