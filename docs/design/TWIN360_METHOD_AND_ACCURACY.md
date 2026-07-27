# Twin 360 — the method, the device matrix, and what accuracy to expect

Status: **DECISION** · 2026-07-27
Answers three questions directly: *what method*, *how do the devices combine*, *how accurate*.
Companions: `TWIN360_PIPELINE_V2_BUILD_PLAN.md` (execution), `UNIFIED_SITE_MODEL_ARCHITECTURE.md`
(how blocks join), `ASU_HEADTOHEAD_TEST_PLAN.md` (the drone benchmark).

Evidence grades used throughout:
**[A]** measured in this repo · **[B]** published literature, consistent across sources, not
re-verified here · **[C]** engineering estimate / target, unproven.

---

## PART 0 — Review of the two external responses

They are the most useful external input received so far, because most of it is *checkable*, and
checking it found a real bug in our own code. Rulings:

| Claim | Ruling | Action |
|---|---|---|
| My "quantisation floor" argument for the 1600 px cap is wrong — PatchMatch estimates disparity to **sub-pixel** precision, so image GSD does not set a hard depth-accuracy floor | **Correct. My reasoning was wrong.** | Restated below. The 1600 px hypothesis survives on different grounds |
| `mesh_texturer` reads the **undistorted dense workspace**, so a 1600 px geometry run silently also means a 1600 px *texture* source | **Correct, and verified** — `worker.py` downstream stages read `{WORK}/dense/images` | **Fixed.** New `texture_workspace()` undistorts at native resolution on CPU, no GPU, no stereo |
| The image is pinned to `colmap/colmap:latest` — not reproducible | **Correct** | Version now logged at every stage; tag pinning is a required follow-up (verify the tag exists before changing it) |
| `gps` keyframe blocks carry no `CLLocation.timestamp`, so one fix repeated across many keyframes is indistinguishable from many independent fixes | **Correct, and verified in the Swift** | **Fixed.** poses.json v5 adds `gps.fixTime`/`gps.age`; `gps_priors.py` collapses repeats (19/19 tests) |
| Prefer raw `sceneDepth` over `smoothedSceneDepth` for geometry | **Plausible, not proven** — smoothing is temporal and biases depth edges, but it also suppresses real noise | Made an **A/B arm**, not a blind switch: both semantics now requested so the comparison needs no second TestFlight cycle |
| COLMAP's own docs say the native `EQUIRECTANGULAR` camera model is *faster but less accurate* than perspective views | **Correct** | Confirms the existing unwrap-to-perspective choice. **Do not** switch to the native model |
| Measure the actual memory bottleneck before assuming an A100 is needed | **Correct, and cheap** | Added as the first step of the resolution ladder |
| py3dtiles cannot tile Gaussian splats yet | **Correct** | Affects the LOD plan; Cesium consumes splat 3D Tiles but we must author the tileset ourselves |
| DroneDeploy is a **reference**, not ground truth | **Correct, and important** | Scoring language changed: "parity with DD" is the goal, "measured against control points" is the claim |
| ARKit gives a 6-DOF prior COLMAP can consume | **Already known to be false** | `pose_priors` is position + gravity only. No change; already recorded in the build plan §A2 |

### The one correction that matters most, restated properly

I previously argued that a 3.6 cm effective GSD imposes a floor above DroneDeploy's 0.93 cm
vertical scatter. **That inference was wrong.** Stereo matching interpolates the correlation peak
to a fraction of a pixel, and fusion averages many views, so sub-GSD precision on a large flat
surface is entirely normal — a plane fit across thousands of points can beat the sampling interval
by a wide margin.

What downscaling actually costs is **recoverable spatial frequency, not precision on flat ground**:

- Fine geometry — expansion joints, curb noses, railing members, small height steps, edges of
  slabs — is smaller than the correlation window at 1600 px and gets averaged into its
  surroundings. It does not come back.
- Matching fails more often on weakly-textured surfaces, so the reconstruction has *holes* where
  it should have points, and fusion then has fewer views to average.
- Because texturing read the same workspace, **appearance was downscaled too** — which is the
  better explanation of "soft/mushy at native zoom" than any geometric argument.

So the hypothesis stands, but it now predicts something *specific and separable*: flat-surface σ
should be roughly comparable at 1600 and at native, while **edge sharpness, thin-feature recovery,
and hole area should improve markedly**. That is a much stronger experiment than "raise resolution
and see if it looks better", and it is why the arms below split geometry from texture.

---

## PART 1 — The method

> **REVISED 2026-07-27 (v2).** The first version of this section said *"photogrammetry is the
> geometry, LiDAR is the anchor."* That under-sells LiDAR and an external review was right to
> push back. On a painted drywall wall photogrammetry has almost nothing to match on while
> LiDAR returns a clean surface; on a richly textured facade the opposite holds. Demoting one to
> "anchor" throws away real geometric evidence. Corrected statement below.

**Photogrammetry and LiDAR are both geometry sensors. The site constraint graph is the spatial
authority. Gaussian splatting is the photorealistic presentation layer. NeRF is out of the
production path.** One authoritative solve, several representations derived from it.

Which sensor wins is decided per surface, by confidence, not by policy:

| Visual texture | LiDAR confidence | Result |
|---|---|---|
| strong | weak / out of range | photogrammetry dominates |
| weak (drywall, painted steel) | strong | **LiDAR dominates** |
| strong | strong | both constrain the surface; disagreement is a QC signal |
| weak | weak | **marked uncertain — never invented** |

That last row is a product decision as much as a technical one: a twin that says "I don't know"
about a surface is worth more than one that quietly interpolates across it, because someone is
going to take a measurement off it.

This is why `sceneDepth` + `confidenceMap` retention matters (P5d-1) and is not bookkeeping —
without per-point confidence the fusion rule above cannot be evaluated at all.

```
        capture (any device)
              │
      ONE POSE GRAPH  ── COLMAP SfM, with ARKit / EXIF-GPS priors ──┐
              │                                                     │
      ┌───────┴────────┐                                            │
   MVS depth+fusion   Gaussian splat training  ◄── same cameras, same scale, same gravity
      │                    │
   point cloud          .spz
   mesh · ortho · DSM   photoreal walkthrough
   LAS · DXF · areas    orbit / dollhouse
      │                    │
   MEASURED FROM        LOOKED AT
```

### Why each choice

**NeRF — out of the production path, not "superseded".** Slow to train, slow to render, no direct
surface to export, and nothing in our product needs an implicit radiance field that splats do not
do better and faster today. So: **no development effort, no evaluation, not in the MVP.** But
"superseded" was the wrong word — radiance fields remain active research and some use cases still
favour them. The practical commitment is narrower and cheaper to keep: **the asset model stores a
representation type**, so adding a fourth representation later is a row, not a migration.

**Gaussian splatting — kept, but as the viewing layer only.** It is the best available answer for
"walk a client through this space on a phone in a browser": high visual fidelity, real-time on
mobile, small files (`.spz`), no baked lighting artefacts. But a splat is a cloud of anisotropic
blobs, **not a surface**. Two consequences we must not paper over:
1. Measuring on splats means measuring on blob centres — fine for a rough tape measure, wrong as
   a deliverable's basis.
2. Every good splat→mesh method (SuGaR, 2DGS, GOF, RaDe-GS) inherits the **Inria non-commercial
   licence** and is therefore unusable for us. There is no clean high-quality splat-to-mesh route.
   That alone disqualifies splats as the geometric source of truth.

**Photogrammetry (SfM + MVS) — the backbone.** Depth maps → fused point cloud → mesh → ortho/DSM.
Everything a client can *use* comes from here: LAS/LAZ, GeoTIFF, OBJ/GLB, DXF floor plans, areas,
volumes, measurements. It is also the only representation directly comparable to DroneDeploy, and
the only one their design tools open. Licence-clean throughout (COLMAP BSD, Open3D MIT, PDAL/GDAL
permissive).

**LiDAR — a geometry sensor in its own right.** iPhone LiDAR contributes **metric scale**
(deletes the `residual_too_high` bug class), **gravity** (deletes the upside-down failures), and
**surface geometry where photogrammetry has nothing to match on** — white walls, painted drywall,
glass frames. It is coarse (~256×192) and its useful range is short, so it does not replace
photogrammetry; the two are fused by confidence.

On range: **do not encode a hard cut-off.** Earlier drafts of this doc said "LiDAR is dark past
~5 m", which is a useful field heuristic and a bad implementation. The pipeline should treat
distant depth as low-confidence **because the confidence map says so**, not because a constant in
our code says so — the effective range varies with surface, angle, and ambient IR.

**A correction on splat→mesh licensing.** An earlier version of this doc said "every good
splat→mesh method inherits the Inria non-commercial licence." **Too broad.** The accurate rule:

> Reject any path whose **executable dependency graph** contains the Inria implementation.
> Evaluate permissively-licensed training and depth-to-surface routes on their own merits.

gsplat is an independent Apache-2.0 implementation and is the backend Splatfacto already uses.
Rendering depth from a splat and running Open3D TSDF on it touches no Inria code. Two specific
traps to avoid, both of which look clean from the badge alone: **3DGS-to-PC** (Apache-2.0 badge,
but its own install instructions require the original Gaussian Splatting repo) and **FastGS**
(MIT badge, but its README defers to upstream 3DGS licences). **A GitHub licence badge is not a
licence audit** — which is why automated SBOM scanning of the actual Modal image is now a
tracked item (P5e-1), not a good intention.

**"Or something different?"** — the two candidates worth naming and rejecting for now:
- **Feed-forward reconstruction (DUSt3R / MASt3R / VGGT class).** Genuinely impressive, and the
  right long-term watch item. Rejected today purely on licence: the released weights are CC-BY-NC.
  Revisit if a permissively-licensed model of equivalent quality appears.
- **RoomPlan (Apple).** Already integrated conceptually (`ROOMPLAN_TWIN_INTEGRATION.md`). It gives
  a clean parametric box-and-opening model instantly, and is excellent for a *schematic* floor
  plan — but it snaps to idealised planes and discards real geometry, so it cannot be the twin.
  Best use: a **sanity check** on our extracted floor plan, and a fast preview while processing.

### What this means in one sentence

Clients get **one link** with two views of the same site: a splat they walk through, and a mesh
they measure — guaranteed to agree because they came from one pose graph.

---

## PART 2 — The device matrix

Every device feeds the **same mapper**. What differs is which priors it supplies and which part of
the building it can actually see.

| Device | Contributes | Sees | Priors it supplies | Where it fails |
|---|---|---|---|---|
| **Drone stills** (DJI Mini class) | Geometry + appearance, roof and upper facade | Roof, site, upper storeys | EXIF GPS → auto-populated `pose_priors` **[A]** | Ground-level detail under canopy/overhang; vertical facade from nadir-only flights |
| **Drone oblique passes** | Facade geometry | Facade above ~5 m | Same EXIF GPS | Requires a deliberate orbit; most "mapping" missions are nadir-only |
| **360 drone video** (A1 class) | Low-altitude context, facade fill | Everything at flight height | EXIF GPS if present, else pose from SfM | Obstacle avoidance forces 5–7 m standoff → **context, not detail** |
| **iPhone ARKit + LiDAR** | Interior geometry, ground-level facade, metric scale, gravity | Interiors, ground floor, anything within ~5 m | ARKit position + gravity + GPS fixes **[A]** | LiDAR is dark past ~5 m — upper facade has no depth return |
| **360 camera** (Insta360 X4/X5) | Fast interior coverage, complete solid angle | Whole rooms in one shot | None natively; pose from SfM | Lower per-pixel resolution after unwrap; operator visible; dual-fisheye needs the right unwrap |
| **Ground stills** (phone/DSLR) | High-detail patches | Whatever you point at | EXIF GPS if enabled | Slow; no automatic coverage guarantee |

**The single most important line in this table:** the drone cannot see the ground plane properly
and the phone cannot see the upper facade at all. Neither device alone produces a complete
exterior. That is the whole argument for combining them.

### External-only twin

```
drone nadir grid  +  drone oblique orbit  [+ 360 drone at low altitude for context]
        └── optional: phone walk-around at ground level for entry/plinth detail
```
One block, one solve, georeferenced by EXIF GPS. Products: mesh, ortho, DSM, LAS, measurements.
This is the ASU path, and it is the one closest to working today.

### External + internal twin

**This is federated, and saying otherwise would be dishonest.** Interior and exterior share almost
no visual overlap — the only place they see the same thing is a doorway, and a doorway is a poor
photogrammetric bridge (small overlap, huge exposure change, often a mirror or glass nearby).

```
   EXTERIOR BLOCK ────┐
   (drone, GPS-anchored, defines the site frame)
                      │  Sim3 anchoring at doorway bridges + shared GPS + gravity
   INTERIOR BLOCKS ───┘
   (phone LiDAR walks, one per floor / per wing, metric and gravity-aligned natively)
```

Mechanics are specified in `UNIFIED_SITE_MODEL_ARCHITECTURE.md`. The commitments that matter:
1. **Blocks are never silently merged.** Each keeps its own solve; the join is an explicit Sim3
   with a **measured residual** that is stored and shown.
2. **Gravity and metric scale are shared from the start**, so the join is a 4-DOF problem
   (translation + heading), not a full 7-DOF one. This is much better conditioned.
3. **The exterior block owns the site frame** because it is the one with GPS.
4. If the doorway bridge fails, the interior still delivers as a standalone metric twin with a
   floor plan. It degrades to "unlocated but correct", never to "wrong".

---

## PART 3 — Accuracy: what to expect, honestly

**Headline: estimating-grade / as-built documentation-grade. Not survey-grade.** No configuration
of this pipeline replaces a total station, and none of the numbers below should be quoted as a
survey. That framing goes in the UI (P4d-1), not just in a document.

### Exterior, drone, no ground control

| Measure | Expectation | Grade |
|---|---|---|
| Absolute horizontal position on Earth | **~0.4–1.0 m** (measured: 0.43 m median, p90 higher) | **[A]** |
| Absolute vertical | 2–3× the horizontal figure | **[B]** |
| **Relative** measurement inside the model (wall length, bay spacing) | **2–5 cm** at ~1 cm GSD, once dense runs at native resolution | **[C]** |
| Relative measurement today (1600 px dense) | Materially worse on anything fine; flat surfaces largely unaffected | **[C]** |
| With 4–5 surveyed GCPs or an RTK drone | Absolute drops to **2–5 cm**; relative largely unchanged | **[B]** |

The important asymmetry: **relative accuracy is good and absolute accuracy is poor** without
control. Clients measuring inside the model get useful numbers; clients overlaying it on a
cadastral map without GCPs will see it sitting half a metre off. Say so up front.

### Interior, iPhone LiDAR + video walkthrough

This is the question that was asked most directly, so here is the full answer.

| Scale | Expectation | Grade | Why |
|---|---|---|---|
| Single depth sample, <2 m | **~1 cm** | **[B]** | Sensor spec territory; consistent across published evaluations |
| A dimension inside one room (door width, ceiling height, wall run <5 m) | **1–3 cm** | **[B]** | LiDAR range accuracy + fusion across many frames |
| Whole-room dimensions | **2–5 cm**, i.e. roughly **0.5–1%** | **[B]/[C]** | Published room-scale studies cluster in the low percent; our target is the tight end because we add SfM and pose priors, which bare scanning apps do not |
| **Across a whole floor plate (50–100 m of walking)** | **10 cm to >1 m** without loop closure; **3–8 cm** with it | **[C]** | **This is the real limit.** ARKit drift accumulates with path length |
| Floor-plan area, loop-closed capture | **<1–2%** | **[C]** | Plan extraction itself is sub-1% accurate on correct geometry **[A]** — the error is inherited from the walk, not added by the algorithm |
| Ground-level exterior, phone, **above the first storey** | **Poor — 10 cm to metres** | **[C]** | No LiDAR return past ~5 m and a grazing camera angle. Use the drone |

**The dominant error term is drift over distance, not sensor precision.** A 3 cm sensor walked in a
120 m open loop can finish a metre from where it started. Everything that fights this is worth more
than any solver tuning:

1. **Close the loop.** Return to your starting point and re-observe it. This is the single highest-
   leverage thing an operator does, and it is free. **[A]** — the mechanism is exactly what the
   pose-prior measurement showed: median camera-centre error 3.92 m → 0.062 m once positions
   entered the solve as weighted evidence.
2. **Cross-link rooms.** Re-enter spaces from a second doorway so the graph has more than one path
   between any two rooms.
3. **Keep clips continuous.** Every stop-and-restart is a place drift can hide.
4. **Don't walk fast.** Motion blur removes the features that loop closure needs.

These are capture-SOP items, already written up in `TWIN360_CAPTURE_SOP.md`. **Roughly 80% of final
accuracy is decided while the shutter is running**, and no amount of pipeline work recovers a
blurry, open-ended, single-pass walk.

### What to put in front of a client — measure it, don't quote it

**The table above is documentation, not a product claim, and it must not be marketed.** Published
ranges for phone LiDAR vary enormously with scene, trajectory, app and processing — the same
device produces centimetre results in one room and decimetre results down a corridor. Quoting
"2–5 cm" to an owner is a promise we cannot keep on a capture we have not seen.

**Replace the claim with a measurement.** Every finished twin carries a QC report card computed
from that specific capture:

```
  TWIN 360 — QUALITY REPORT                    Capture 4821 · 2026-07-27
  ──────────────────────────────────────────────────────────────────────
  Measurement status            VERIFIED LOCAL
  Local metric confidence       HIGH
  Loop closure residual         2.8 cm       (closed, 3 loops)
  Control point RMSE            —            (no control points used)
  LiDAR vs photogrammetry       1.9 cm       (median, 41k paired points)
  LiDAR coverage                63%
  Block registration residual   4.1 cm       (interior -> site)
  Global position confidence    LOW          (consumer GPS, no GCPs)
  Wall area unaccounted         3.2 m2       (2 walls partly occluded)
```

Every field is computable from data we already have, and each one fails for a different reason —
which is exactly what makes the card useful rather than decorative.

**Status vocabulary** (one of four, never a number on its own):

| Status | Meaning |
|---|---|
| `VERIFIED` | Independent check data agrees — control points, or a closed loop with a measured residual |
| `ESTIMATED` | Internally consistent, no independent check |
| `LOW CONFIDENCE` | Known problems: poor coverage, open loop, large drift, weak registration |
| `UNREGISTERED` | Locally metric, but not placed in the site frame |

Note the fourth: an earlier draft called this state *"unlocated but correct"*. **"Correct" is the
wrong word** and an external review was right to flag it — a long unclosed interior walk can be
internally distorted while still being roughly metric. The honest label is **"locally metric,
unregistered"**, and it ships with the drift estimate that justifies it.

Client-facing language, then, is conditional rather than absolute:
- ✅ "This capture measured a 2.8 cm loop closure residual; measurements over a room are reliable
  to that order."
- ✅ "Areas on this floor are reported ±X%, with 3.2 m² of wall unverified."
- ❌ Never "survey accurate", "±1 cm", or any figure detached from the capture that produced it.

---

## PART 4 — Build plan changes

Everything below is **additive** to `TWIN360_PIPELINE_V2_BUILD_PLAN.md` Phases 0–4. Nothing already
planned is cancelled.

### 4.1 Done in this pass

| Item | Status |
|---|---|
| `texture_workspace()` — native-resolution undistort on CPU, decoupling texture from dense geometry resolution | ✅ code complete |
| `dense(workspace=…)` — ladder arms no longer overwrite each other; effective-GSD ratio logged | ✅ code complete |
| COLMAP build logged at every stage (reproducibility) | ✅ code complete |
| poses.json **v5**: `gps.fixTime` + `gps.age` | ✅ code complete *(native → TestFlight)* |
| Both depth semantics requested, so raw-vs-smoothed is an A/B arm not a build cycle | ✅ code complete *(native → TestFlight)* |
| `gps_priors.py` — collapse repeated fixes, age-inflate covariance, floor implausible accuracy | ✅ 19/19 tests pass |

### 4.2 New experiment — geometry vs texture resolution (**replaces the plain ladder**)

Run in this order; **stop early if an arm settles it.**

| Arm | Dense geometry | Texture source | Question it answers |
|---|---|---|---|
| **M0** | *(none — profile only)* | — | Where does the memory actually go? Measure before buying an A100 |
| **A** | 1600 | 1600 *(today)* | Control |
| **B** | 1600 | **native** | **Was "mushy" a texture problem all along?** Cheapest arm. CPU only |
| **C** | 2400 | native | Does geometry resolution matter once texture is fixed? |
| **D** | 3200 | native | Diminishing returns check |

**B is the arm to run first.** It costs CPU minutes, no GPU, and if it closes most of the visual
gap then the expensive resolution ladder is a much smaller question than it looked.

Report per arm: flat-surface plane-fit σ · **edge acutance on matched crops** · **hole area** ·
points/m² · wall clock · peak memory. Prediction on record: **σ moves little, acutance and hole
area move a lot.** If σ moves instead, the model above is wrong and needs revisiting.

### 4.3 New experiment — mesh backend

Poisson is currently doing two jobs badly: filling unobserved volume with invented surface (the
floating islands already documented) and smoothing real detail. Arms:

| Arm | Method | Expected trade |
|---|---|---|
| **P** | Poisson *(today)* | Watertight, invents geometry, smooths |
| **D1** | Delaunay (`colmap delaunay_mesher`) | Faithful to observations, leaves holes |
| **D2** | Delaunay → light Poisson fill | Detail where observed, closure where not |
| **AF** | Advancing front (Open3D, MIT) | Good on open surfaces, fragile on noise |

Score on **hole area** and **invented-surface area** (surface far from any fused point) together —
either alone is gameable.

### 4.4 Phase 5 — cross-device site assembly *(new)*

Design exists in `UNIFIED_SITE_MODEL_ARCHITECTURE.md`; this is its tracker.

- ⬜ **P5a-1** Site frame: one ENU origin per project, persisted, all blocks referenced to it
- ⬜ **P5a-2** GPS priors into the solve via `gps_priors.py` *(module done; wiring not)*
- ⬜ **P5a-3** GeoTIFF + world file writers (GDAL/pyproj, explicit EPSG — never hand-rolled)
- ⬜ **P5a-4** LAS/LAZ writer with CRS tagging
- ⬜ **P5b-1** Block registry: capture → block → Sim3 → site, with stored residual
- ⬜ **P5b-2** Doorway-bridge anchoring (4-DOF: translation + heading, gravity and scale shared)
- ⬜ **P5b-3** Anchoring residual surfaced in the UI; degrade to "unlocated but correct" on failure
- ⬜ **P5c-1** LOD layering: drone shell → ground detail → interior blocks
- ⬜ **P5c-2** Splat 3D Tiles tileset authored in-house *(py3dtiles cannot do this)*
- ⬜ **P5d-1** Per-point LiDAR confidence persisted, not just thresholded at capture
  *(needed by P3b-2 depth masking; currently discarded)*

### 4.5 Priority order

1. **Arm B** (native texture) — cheapest, highest information, no GPU. *Do this first.*
2. **M0** memory profile — decides whether the GPU spend is even needed.
3. **P5a-3 / P5a-4** (GeoTIFF, LAS) — prerequisite to *any* head-to-head scoring.
4. **Arms C/D** — only if B leaves a gap.
5. **Mesh arms** — after resolution is settled, or they confound each other.
6. **Phase 1 pose priors on a real capture** — still the biggest interior win, still blocked on the
   Modal image.

### 4.6 Still blocked (unchanged)

- Modal image authorization → Phases 1–3 and every GPU arm above.
- Untracked ASU code (`georef_app.py`, `patch_ortho.py`, `stats_app.py`, `C:\ASU-Survey\tools\*`)
  → the mesh and every published measurement came from code not in version control.
- Backend access from this session (proxy 403 on Supabase/Modal) → an operator must launch runs.
