# Slate360 pipeline — where we are and what happens next

Status: **LIVE TRACKER** · 2026-07-27 · The one page to read before picking up work.
Branch: `claude/dronedeploy-reconstruction-analysis-py2toz` (merged up to `origin/main`).

Detail lives in `PIPELINE_V3_REVIEW_AND_ROADMAP.md` (phases),
`TWIN360_METHOD_AND_ACCURACY.md` (method), `VIEWER_MEASUREMENT_AND_COMPETITIVE_PARITY.md`
(deliverable→feature dependencies), `TWIN360_PIPELINE_V2_BUILD_PLAN.md` (the original tracker).

---

## 1. Done and verified (code complete, tests passing)

| What | Evidence |
|---|---|
| Pose-prior writer: ARKit → COLMAP `pose_priors`, covariance from tracking state, √t drift growth | 28/28, incl. real COLMAP 4.1.1 round-trip |
| Pose-prior benefit measured | median camera-centre error **3.92 m → 0.062 m** on synthetic weak sequences |
| Selectable align backends via pycolmap | `align_backends.py` |
| 360 handling: equirect vs dual-fisheye detection, 360-video unwrap before SfM, pitch rings | real 8192×4096 fixture |
| Upload integrity: content fingerprint, idempotent registration, jobs refuse to start mid-upload | code complete; **needs the migration applied** |
| Vector floor plans, commercial plates (multi-room, columns, partitions) | 9/9 + 5/5, <1% area error |
| **Net wall area** — openings detected, occlusions/scan gaps refused, unaccounted area reported | **37/37** |
| **`metricAuthority`** — pose refinement can no longer hide inside the "quality" arm | **24/24** |
| GPS priors — repeated fixes collapsed, covariance inflated by age | **19/19** |
| `texture_workspace()` — native-resolution undistort, decoupled from the dense memory cap | code complete |
| poses.json **v5** — `gps.fixTime`/`gps.age`; both depth semantics requested | code complete *(TestFlight)* |

**Nothing above is switched on by default.** Every quality change is an A/B arm; today's
behaviour stays default until a side-by-side comparison wins.

---

## 2. The four things blocking everything else

| # | Blocker | Who | Unblocks |
|---|---|---|---|
| **B1** | Untracked ASU scripts not in git (`georef_app.py`, `patch_ortho.py`, `stats_app.py`, `C:\ASU-Survey\tools\*`) | **Brian** | Any reproducible DroneDeploy comparison. The mesh and every published measurement came from code not in version control |
| **B2** | Migration `20260725120000_twin_asset_dedup.sql` not applied | **Brian** | Duplicate-upload fix + stale-upload GC, both code-complete |
| **B3** | Modal image cannot be changed (COLMAP 4.1.1, vendored gsplat trainer) | **Brian's call** | Phases B and C entirely |
| **B4** | This session has no backend egress (403 at the proxy) | **Brian** — teleport | Me running B1–B3 myself |

**B4 is the meta-blocker.** Resolve it and B1–B3 become things I do rather than things I ask for.

---

## 3. Next steps, in the order I would do them

### Step 1 — Teleport this session *(5 minutes, unblocks the rest)*
```powershell
cd C:\s360
claude --teleport
```
Brings this branch **and this conversation** to the machine that already holds the credentials.
The other AI's runbook is correct that the secrets are on that machine; it is also correct that
they must not be copied elsewhere. Teleporting is the option that needs neither.

### Step 2 — Commit the ASU scripts *(10 minutes, mine after Step 1)*
Exact commands in `PIPELINE_V3_REVIEW_AND_ROADMAP.md` §5.3.

### Step 3 — Apply the migration *(1 command)*
```powershell
$env:SUPABASE_TELEMETRY_DISABLED="1"
npx supabase db query --linked -f supabase/migrations/20260725120000_twin_asset_dedup.sql
```

### Step 4 — **Arm B: native-resolution texture** *(CPU only, no GPU spend)*
The cheapest experiment in the plan and possibly most of the quality gap. Precondition, which is
what makes the result trustworthy: **the same mesh file, verified by SHA-256, textured twice** —
once from the 1600 px dense workspace, once from the new native-resolution texture workspace.
Nothing re-solved, no camera changes.
```powershell
cd workers\modal\photogrammetry
$env:PYTHONIOENCODING="utf-8"
python -m modal deploy worker.py
python -m modal run worker.py::texture_workspace
```
Then re-texture against `/data/work/texture/images` and compare renders side by side.

### Step 5 — **DSM/DTM raster export** *(the highest-leverage single addition)*
One raster written from the fused cloud with GDAL. It unlocks, in one step: **volume, cut/fill,
elevation layer, contours, and elevation profiles** — five competitive features off one artifact.
Ships alongside the COG ortho and LAZ/COPC writers, which are the same GDAL/PDAL work.

### Step 6 — **Collision mesh beside every splat**
Turns the viewer's approximate splat picks into real measurement without changing what renders.
Small change, large credibility gain.

### Step 7 — Reprocess the existing benchmark captures
No new fieldwork needed — the best-ever phone walk, the car interior, the iPhone+X4 dual capture
and the ASU drone set all already exist. `scripts/ops/list-twin-benchmarks.mjs` ranks them;
`scripts/ops/dispatch-twin-experiment.mjs` reprocesses one through a chosen arm without touching
the live model.

---

## 4. Phase board

```
  PHASE A  Truth & reproducibility      ████████░░░░  ASU scripts, COLMAP pin, Arm B,
                                                      COG+LAZ+DSM, provenance manifest
                                                      ✅ metricAuthority  ✅ net wall areas

  PHASE B  Geometry quality             ░░░░░░░░░░░░  memory profile, MVS ladder, mesh
                                                      bake-off, raw depth + confidence,
                                                      confidence-weighted fusion, depth-
                                                      supervised splats     [needs B3]

  PHASE C  Registration & site graph    ░░░░░░░░░░░░  Sim(3) diagnostic join, registration
                                                      bake-off, GNSS fix objects, RTAB-Map
                                                      benchmark, GTSAM schema   [needs B3]

  PHASE D  AprilTag control tags        ░░░░░░░░░░░░  loop closure, doorway bridges,
                                                      optional surveyed control

  PHASE E  Deliverables & QC            ██░░░░░░░░░░  QC report card, floor plan UI,
                                                      ✅ net areas, bake, exports,
                                                      splat 3D Tiles, ORT licence gate,
                                                      measurement store + report

  PHASE F  Object detection             ░░░░░░░░░░░░  counting is a 3D clustering problem,
                                                      not a detection problem — needs the
                                                      pose graph the rest of this builds
```

**Definition of done:** one share link delivering a 3D twin + 2D plan + measurements +
downloadable mesh, from any capture device, exterior and interior joined with a stated anchoring
residual, and a per-capture QC card instead of a marketing accuracy claim.

---

## 5. Standing decisions (do not relitigate without new evidence)

- **Method:** photogrammetry and LiDAR are both geometry sensors, fused by confidence; the
  constraint graph is the spatial authority; Gaussian splatting is presentation. NeRF is out of
  the production path.
- **Splats are never the measurement basis.** Measurement raycasts geometry.
- **Licence rule:** reject any path whose *executable dependency graph* contains Inria 3DGS.
  A GitHub licence badge is not a licence audit.
- **Accuracy is measured per capture, never quoted from a table.** Four states: `VERIFIED` /
  `ESTIMATED` / `LOW CONFIDENCE` / `UNREGISTERED`.
- **No arm is promoted to default without a human visual gate.**
- **Never paste secrets into a web session** — exposed in the transcript *and* non-functional,
  because the egress policy blocks the connection before authentication.
