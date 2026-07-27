# Unified site model — aerial + ground + interior in one twin

Status: **PROPOSED** · 2026-07-27
Relates to: `TWIN360_PIPELINE_V2_BUILD_PLAN.md` (phone/interior splats),
`workers/modal/photogrammetry/` (drone ortho/LAS/mesh), `TWIN360_CAPTURE_SOP.md`.

**The requirement:** a user plans and flies a drone mission, uploads it, and gets a
georeferenced base model of the site. They then walk the same site with Twin 360 for
ground-level LiDAR detail and full interiors. Optionally a 360 drone fills the low-altitude
band. All of it has to end up as **one navigable twin**, not three disconnected deliverables.

---

## 1. The two real problems

**a. Coordinate frames.** Drone photogrammetry is absolute and georeferenced (GPS → State
Plane / WGS84). ARKit is a local metric frame with an arbitrary origin, gravity-aligned but
with no idea where on Earth it is. Nothing combines until both live in one frame.

**b. Different output types.** The drone path produces surfaces — mesh, orthomosaic, LAS. The
Twin path produces a radiance field — Gaussian splats. These are not interchangeable
representations, and converting either into the other loses what makes it good.

---

## 2. The architecture: one site frame, federated captures

Adopt a **site frame** — a local ENU (east/north/up) Cartesian frame anchored to a published
geodetic origin for the site, stored on the project. Everything registers into it. Latitude,
longitude and a State Plane CRS are recorded so exports can be reprojected, but the working
frame is metric and local, which avoids float precision problems.

```
  DRONE (GPS EXIF)      ─► COLMAP, priors as WGS84 ────► georeferenced sparse+dense
                                                          └─► defines the SITE FRAME
  360 DRONE (GPS)       ─► equirect unwrap ─► same solve ─► fills the 5-30 m band
  PHONE (ARKit + LiDAR) ─► COLMAP, priors as CARTESIAN ──► locally metric reconstruction
                                                          └─► Sim3-anchored INTO the site frame
```

**Why federated rather than one giant joint solve.** A single COLMAP problem over drone +
phone + 360 imagery is the theoretically cleanest answer and the wrong engineering choice
here: the aerial↔ground viewpoint gap is a documented hard case, image counts explode, one
bad source poisons everything, and re-walking one room would mean re-solving the whole site.
Users capture at different times with different devices; the model must accept increments.

**What makes it work:** both sources already use the *same* prior mechanism, verified against
pycolmap 4.1.1 —

- `PosePriorCoordinateSystem.WGS84` for drone GPS (COLMAP georeferences the solve itself)
- `PosePriorCoordinateSystem.CARTESIAN` for ARKit positions (already built, `pose_priors.py`)
- `align_reconstruction_to_locations(recon, image_names, locations, ...) -> Sim3d` is the
  anchoring primitive that lifts a local reconstruction into the site frame

So the unified model needs no new alignment machinery. It needs a **registration step** and a
**scene graph**.

---

## 3. Anchoring ground captures into the site frame

Three mechanisms, in order of reliability. Implement 1 and 3 first; 2 is the quality path.

1. **Coarse GPS seed.** The phone's own GPS (already captured in `poses.json` v4) places the
   walk within ~3–5 m and fixes rotation about gravity to within a few degrees. Not accurate
   enough to ship, entirely adequate as an initial guess for step 2 and as a fallback anchor
   when nothing else is available.

2. **Shared-view registration (the quality path).** Ask for a short **exterior establishing
   pass** at the start of every ground walk: 10–20 seconds of the building facade from
   outside, the same facade the drone photographed. Those frames match against the aerial
   reconstruction, and `align_reconstruction_to_locations` solves the Sim3. This is the same
   "doorway bridge" idea already in the capture SOP, promoted from advice to a pipeline step.

3. **Manual anchor (always available).** Two-point placement in the desktop editor: click a
   corner on the aerial model, click the same corner on the ground capture. Solves position,
   heading and scale-check in seconds. Every automatic method needs this backstop, and it also
   serves the case where a client only wants the interior.

**Scale is the subtle one.** The drone model's scale comes from GPS baselines; the phone's from
LiDAR and ARKit. Both are metric and should agree to ~1%. **Disagreement beyond that is a
signal, not something to silently average away** — surface it as a QC warning, since it usually
means the drone GPS was poor or the walk drifted.

---

## 4. Where the 360 drone fits

It occupies the band neither of the others covers well: **5–30 m, looking sideways.** Nadir
aerial sees roofs, ground walk sees eye level, and facades between are exactly what falls
apart. A 360 drone flying slow orbits at mid height fills it, and one clip carries every
direction at once so coverage per minute is high.

Two constraints from the hardware research, both already in the SOP: the Antigravity A1's
obstacle avoidance **cannot be disabled**, forcing a 5–7 m standoff — so it is a mid-band and
context tool, never close facade detail. And its output is equirect video, which must go
through the projection-aware unwrap already built (`detect_projection` → `v360 input=equirect`
or `dfisheye`), not the flat-video path.

---

## 5. Representation: keep both, layer them

Do **not** convert splats to mesh or mesh to splats. Each is best at what it does. The viewer
already renders meshes, point clouds, 3D Tiles and splats, so a composite scene is a scene-graph
problem, not a rendering one.

| Layer | Source | Representation | Role |
|---|---|---|---|
| Terrain / ortho | Drone | GeoTIFF + DSM | Ground plane, site context, measurement base |
| Site shell | Drone | Textured mesh (GLB) | Always-loaded LOD0; the thing you see at site scale |
| Facade detail | 360 drone / drone obliques | Splat or mesh | Streamed when the camera approaches a facade |
| Ground detail | Twin 360 phone | Splat + LiDAR cloud | Streamed on approach; metric measurement |
| Interiors | Twin 360 phone | Splat per space | Entered through a door portal; loaded on entry |
| Plans / areas | Derived from LiDAR | SVG/DXF + areas | The 2D deliverable (`floorplan.py`) |

**Level of detail is the natural fit, not a bolt-on.** Site mesh at distance, splats when close,
interiors only once entered. That is how the model stays viewable on a phone: the aerial shell
is cheap, and the expensive splats load one region at a time. Existing render budgets (150k
splats mobile / 500k desktop) apply per loaded region rather than per site.

---

## 6. Honest risks

- **Aerial↔ground registration is the hard part**, and the published literature is not
  reassuring: a peer-reviewed experiment bridging perspective blocks with 360 imagery measured
  **4–6× worse metric accuracy** than perspective imagery. Hence: automatic where it works,
  manual anchor always available, and never present a bridged measurement as survey-grade.
- **Appearance mismatch.** Drone at midday, walk at dusk, different white balance. Layers will
  not colour-match. Mitigate with the bilateral-grid exposure handling per capture; accept
  visible seams between layers.
- **Scale disagreement** between GPS-derived and LiDAR-derived metres. Surface it, never hide it.
- **Data volume.** A site mesh plus a dozen interior splats plus a LAS cloud is hundreds of MB.
  LOD streaming is required, not optional.
- **Two separately-evolving workers.** The drone pipeline and the splat pipeline are different
  code with different failure modes. The site frame and the anchor step are the only shared
  contract; keep it narrow and versioned.

---

## 7. Sequencing

This slots into the existing plan rather than replacing it.

| Step | Depends on | Notes |
|---|---|---|
| **U1** Site frame on the project (geodetic origin + CRS + ENU transform) | — | Small, additive schema; unblocks everything else |
| **U2** Drone GPS → WGS84 pose priors in the drone worker | Phase 1 prior work (built) | Same module, different coordinate system |
| **U3** Manual two-point anchor in the desktop editor | U1 | The backstop; ship before automatic |
| **U4** Exterior establishing pass in the ground capture flow | SOP | Capture-side; enables U5 |
| **U5** Automatic Sim3 registration via shared views | U2, U4 | `align_reconstruction_to_locations` |
| **U6** Scene graph + LOD streaming in the viewer | U1 | The largest piece of work; viewer-side |
| **U7** Scale-agreement QC between sources | U5 | Cheap, high value |

**U1–U3 are worth doing early** — a manually-anchored composite is genuinely useful and proves
the scene graph before the hard registration problem is solved.
