# One pipeline, two products — review, shared architecture, and roadmap

Status: **DECISION** · 2026-07-27 · Supersedes the sequencing in `TWIN360_METHOD_AND_ACCURACY.md` §4.
Reviews two external technical responses; folds the accepted items into a single plan that serves
**both** the Slate360 dashboard and the Twin 360 app from one pipeline.

---

## PART 1 — Review of the two responses

The first response is the strongest external input this project has received. It found a real
contradiction inside our own code, and several of its corrections were against claims *we* made.
Rulings below; each ACCEPT is either already implemented or now tracked.

### 1.1 Accepted — and it caught a live bug

| Finding | Ruling | Status |
|---|---|---|
| **"LiDAR is more than an anchor."** Photogrammetry and LiDAR are both geometry sensors; the constraint graph is the authority | **Correct — our framing under-sold LiDAR.** Drywall has no photogrammetric texture and a clean LiDAR return; a textured facade is the reverse | Method statement rewritten with a confidence-weighted fusion rule, including an explicit *"uncertain, not invented"* state |
| **"Guaranteed to agree" is not guaranteed — check the camera optimizer** | **Correct, and it exposed a genuine contradiction in our code.** Our `quality` training profile set `camera-optimizer.mode=SO3xR3`, which moves the cameras during splat training. Those deltas are never written back, so the splat sits in a different frame from the mesh with no record of the offset. Our "better quality" arm was silently our "non-metric" arm | **FIXED.** `quality` now freezes cameras; pose refinement moved to a separate `visual` profile that stamps `metricAuthority: false`. The flag is stated explicitly in both directions rather than trusting a library default. 24/24 tests |
| **Accuracy should be a per-capture QC system, not a published table** | **Correct, and the single best product idea in either response.** Published phone-LiDAR ranges vary from centimetres to decimetres with scene and trajectory; quoting a range is a promise we can't keep | QC report card specified; four-state status vocabulary replaces bare numbers |
| **"σ shouldn't move" bakes the expected result into the experiment** | **Correct.** Higher MVS resolution can improve plane scatter through better correspondence localisation | Prediction softened to "may respond less strongly"; all metrics scored independently |
| **Arm A/B must use literally the same mesh (SHA-256), not equivalent settings** | **Correct experimental hygiene** | Added as a hard precondition on the texture arm |
| **Sim(3) is 7 DOF; 4 DOF only *after* verifying scale and gravity** | **Correct — our phrasing was sloppy.** We wrote "the join is 4-DOF, not 7-DOF" as if automatic | Replaced with diagnostic-first: estimate full Sim(3), inspect scale/roll/pitch, constrain to 4-DOF only within thresholds, else SE(3) or reject |
| **"Unlocated but correct" → "locally metric, unregistered"** | **Correct, and safety-relevant** in a product where someone measures from the model | Vocabulary changed |
| **The splat→mesh licensing claim was too broad** | **Correct.** The rule is about the *dependency graph*, not the technique. gsplat is independent Apache-2.0 | Rule restated; 3DGS-to-PC and FastGS flagged as badge-clean / dependency-dirty |
| **√N over-weighting is an approximation, not an exact result** | **Correct** | Wording corrected; it holds for duplicated independent equal-covariance observations |
| **GNSS fixes should be first-class objects with a `fix_id`**, referenced by frames | **Correct and better modelled** than de-duplicating after the fact | Tracked (P5a-2b); the current collapse-on-read is the interim |
| **AprilTag control tags for loop closure and doorway bridges** | **Correct, and the highest-ROI new idea here.** BSD-licensed, free to print, and aimed exactly at the failure we identified (drift over long walks; doorway bridges that photogrammetry can't hold) | New Phase 6 |
| **Don't call NeRF "superseded"** | **Fair.** Out of the production path ≠ obsolete | Wording changed; asset model stores a representation type so a fourth is a row, not a migration |
| **No hard "LiDAR is dark past 5 m" constant** | **Correct** — drive it from the confidence map | Wording changed |
| **Automated licence/SBOM scanning of the actual Modal image (ORT)** | **Correct.** We have already hit AGPL (ODM, OpenMVS), non-commercial weights, and now badge-vs-graph traps. This should be CI, not vigilance | New P5e-1 |
| **COG and COPC, not just GeoTIFF and LAS** | **Correct and nearly free** — same GDAL/PDAL call with a different driver, and both stream over HTTP, which is what our viewer needs | Folded into P5a-3/P5a-4 |
| **KISS-Matcher (MIT) into the registration bake-off** | **Accepted** | Added |
| **RTAB-Map as an independent SLAM benchmark, not production** | **Accepted** — a free external baseline for our own trajectory work | Added |

### 1.2 Accepted with a change

**DN-Splatter.** The response recommends it as a near-drop-in for iPhone RGB-D depth-supervised
splats. The *technique* is exactly right and we should take it. The *package* is not adoptable:
our build plan already established it pins `nerfstudio==1.1.3` + `gsplat==1.0.0` against our
gsplat 1.4.0, and it has been dormant since Nov 2024. So:

> **Adopt DN-Splatter as a reference implementation for the depth and normal losses, not as a
> dependency.** gsplat exposes differentiable depth natively (`render_mode="RGB+ED"`), which is
> the sanctioned route. Never install its `sugar-coarse` or Inria-2DGS branches.

**GTSAM as the site-level constraint graph.** Architecturally right, and the direction we are
already heading — but it is a large lift, and today we have exactly two constraint types. The
commitment that costs nothing now and preserves the option: **design the block/constraint schema
so a factor-graph solver can consume it**, and revisit when we have four or more constraint types
(GNSS + AprilTag + loop closure + block registration + survey control). Tracked as P6c-1, design
only. COLMAP keeps photogrammetric bundle adjustment either way.

### 1.3 Rejected

| Claim (2nd response) | Ruling |
|---|---|
| "CGAL via Open3D for higher-quality surface reconstruction" | **Rejected — CGAL is GPL/commercial-dual.** Already excluded in the build plan. Open3D does not bundle it |
| "pymeshlab … GPL for the library but usable carefully" | **Too loose to act on.** Server-side GPL use without distribution is arguably fine, but "carefully" is not a licence position. Excluded pending the ORT audit that P5e-1 adds |
| "community colmap-dense helpers that reduce peak memory" | Too vague to action. The M0 memory profile answers this with our own numbers |

---

## PART 2 — One pipeline, both products

The dashboard and the Twin 360 app are **not two pipelines**. They are two front doors to the same
processing spine, and keeping it that way is what makes the economics work.

```
   SLATE360 DASHBOARD                        TWIN 360 APP
   (desktop: upload + author)                (phone: capture)
   drone stills/video, 360 media,            ARKit + LiDAR walk,
   E57, existing scans, GCPs                 360 stills, ground stills
            │                                        │
            └──────────────┬─────────────────────────┘
                           ▼
                   INGEST  (one path)
        fingerprint · projection detect · frame select · EXIF/pose extract
                           ▼
              SITE CONSTRAINT GRAPH  (the spatial authority)
        ARKit trajectory · GNSS fixes · gravity · loop closures ·
        AprilTags · block registration · survey control
                           ▼
                 ONE AUTHORITATIVE POSE SOLUTION
              site_frame_id · pose_solution_hash · CRS · units
                           ▼
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
  PHOTOGRAMMETRY      LiDAR / RGB-D        SPLATTING
  COLMAP MVS          metric surfaces      visual fidelity
        └──────────────────┼──────────────────┘
                           ▼
                    DERIVED PRODUCTS
   COG ortho · COPC/LAZ cloud · GLB mesh · SPZ splat · DXF/SVG plan ·
   floor + net wall areas · measurements · QC report card
                           ▼
        ┌──────────────────┴──────────────────┐
        ▼                                     ▼
   VIEWER (desktop + mobile, one share link)  DELIVERABLES
```

**What the shared spine buys us**, concretely: one Modal image to maintain, one set of quality
arms to evaluate, one QC report card definition, and — the important one — **a drone flight and a
phone walk of the same building land in the same coordinate frame automatically**, because they
entered the same constraint graph rather than two pipelines that later have to be reconciled.

### The identity that makes "they agree" true

Every derived product carries the same immutable stamp, and CI asserts it:

```
site_frame_id · pose_solution_id · pose_solution_hash · CRS · units · origin ·
transform · pipeline git SHA · Docker image digest · parameter hash
```

Plus an automated invariant test: **the same physical point must land at the same site coordinate
in the mesh, the point cloud, the splat, the LAS, the GeoTIFF and the viewer.** Without that test,
"they agree because they came from one solve" is an assumption — and we just proved it can be
false, because the camera optimizer was quietly breaking it.

---

## PART 3 — What ships, in order

Each phase ends at a human checkpoint. Nothing is promoted to default without a visual gate.

### Phase A — Truth and reproducibility *(do first; mostly cheap)*
- ⬜ **A1** Commit the untracked ASU scripts. *Blocking, and it is on you — see Part 5*
- ⬜ **A2** Pin the COLMAP image tag + record digest in every run's manifest *(logging done)*
- ⬜ **A3** **Arm B: native-resolution texture, same mesh SHA-256.** CPU only, no GPU. *Highest information per pound of any item here*
- ⬜ **A4** COG ortho + LAZ/COPC point cloud with real CRS *(prerequisite to any DD scoring)*
- ⬜ **A5** Per-run provenance manifest (git SHA, image digest, parameter hash)
- ✅ **A6** `metricAuthority` separation — pose refinement can no longer hide inside "quality"
- ✅ **A7** Net wall areas: openings detected, occlusions and scan gaps refused, unaccounted area reported

### Phase B — Geometry quality
- ⬜ **B1** M0 memory profile *(before assuming an A100 is needed)*
- ⬜ **B2** MVS ladder 1600 / 2400 / 3200 with native texture throughout
- ⬜ **B3** Mesh bake-off: Poisson / Delaunay / Delaunay→Poisson / advancing-front
- ⬜ **B4** Raw `sceneDepth` + `confidenceMap` persistence *(native; TestFlight)*
- ⬜ **B5** Confidence-weighted photogrammetry/LiDAR fusion, with an explicit *uncertain* state
- ⬜ **B6** Depth-supervised splat training via gsplat `render_mode="RGB+ED"` *(DN-Splatter losses, not the package)*

### Phase C — Registration and the site graph
- ⬜ **C1** Diagnostic Sim(3) → thresholded 4-DOF join, residual stored and shown
- ⬜ **C2** Registration bake-off: TEASER++ vs KISS-Matcher coarse, small_gicp fine, on 20 deliberately ugly pairs
- ⬜ **C3** GNSS fixes as first-class objects with `fix_id`
- ⬜ **C4** RTAB-Map as an external trajectory benchmark
- ⬜ **C5** GTSAM schema design *(design only; build when ≥4 constraint types exist)*

### Phase D — AprilTag control tags *(highest-ROI new capability)*
- ⬜ **D1** Detect `tagStandard41h12` in capture frames; store observations
- ⬜ **D2** Unsurveyed tags → strong loop-closure and cross-session correspondences
- ⬜ **D3** Surveyed tags → true control points, upgrading status to `VERIFIED`
- ⬜ **D4** Doorway-bridge workflow: the same tag seen from outside and inside joins the blocks
- ⬜ **D5** Printable tag sheets from the dashboard. **Optional — never required for normal capture**

### Phase E — Deliverables and QC
- ⬜ **E1** QC report card computed per capture; four-state status vocabulary
- ⬜ **E2** Floor plan surfaced in the UI *(generated today with zero UI consumers)*
- ✅ **E3** Floor areas, gross and **net** wall areas with openings *(module + 37 tests)*
- ⬜ **E4** Destructive bake so edits reach the downloaded file
- ⬜ **E5** Mesh / PLY / GLB / E57 / DXF exports
- ⬜ **E6** Splat 3D Tiles tileset authored in-house *(py3dtiles cannot tile splats)*
- ⬜ **E7** ORT licence/SBOM gate in CI against the real Modal image
- ⬜ **E8** `/embed/twin/{token}` + scoped CSP

### Phase F — Object detection *(you asked for it; scoping it honestly)*
Not near-term, and it should not distort the phases above. But the groundwork is nearly free:

- ⬜ **F1** Persist per-keyframe RGB with its pose *(already available; just retained)*
- ⬜ **F2** 2D detection on keyframes, permissive weights only. **Licence-check the weights, not
  just the code** — this is the same trap as splat→mesh, and most popular detector weights carry
  restrictive terms
- ⬜ **F3** Back-project 2D detections into the site frame; cluster across views so one fixture
  seen from six frames counts once
- ⬜ **F4** Counts and schedules per room, from the floor plan's room polygons *(which E3 already
  produces)*

The reason to do it this way round: **counting is a 3D clustering problem, not a detection
problem.** Detection is commodity; "did I see 12 fixtures or the same 2 fixtures six times" is the
part that needs our pose graph — which is exactly what the rest of this plan builds.

---

## PART 4 — Prompt for the other AI platforms

Paste this verbatim. It asks for the things I cannot verify from this container.

```
RESEARCH REQUEST — Slate360 / Twin 360 reconstruction pipeline
Answer only what you can source. For every claim, give the primary source (repo file, release
tag, docs page, paper) and the date you verified it. Mark anything you are inferring as
INFERRED. If sources disagree, say so rather than picking one. Do not summarise marketing pages.

1. LICENCE DEPENDENCY GRAPHS (highest priority)
   For each: top-level licence, the licence of every dependency it requires AT RUNTIME, and
   whether a commercial cloud SaaS can ship it. Read the install instructions, not just the
   LICENSE file.
     - gsplat (nerfstudio-project)
     - nerfstudio / splatfacto
     - DN-Splatter (maturk) — including which optional paths pull in Inria 3DGS or SuGaR
     - 3DGS-to-PC
     - FastGS
     - KISS-Matcher (MIT-SPARK)
     - TEASER++
     - small_gicp
     - RTAB-Map (specifically: which build flags avoid OpenCV non-free)
     - Open3D, PDAL, GDAL, laspy, pyproj, ezdxf, Shapely
   Flag any that is AGPL, non-commercial, research-only, or whose weights differ in licence
   from its code.

2. APRILTAG FOR CONSTRUCTION CAPTURE
   - Current recommended family for a phone camera at 1-6 m: tagStandard41h12 vs alternatives.
   - Physical tag size needed for reliable detection at 2 m, 5 m, 10 m on an iPhone wide lens.
   - Pose-estimation accuracy achievable, and how it degrades with viewing angle and motion blur.
   - Published uses of visual fiducials to correct drift in phone/mobile LiDAR scans — cite
     specific studies with their measured before/after drift figures.
   - Any permissively-licensed Swift/iOS or Python detector implementations.

3. iPhone LiDAR ACCURACY — MEASURED, NOT MARKETED
   Published studies (2023-2026) that compare iPhone/iPad LiDAR against terrestrial laser
   scanning or total-station reference. For each: device, app/pipeline used, scene type, scan
   length, whether loops were closed, and the ACTUAL reported error distribution. I specifically
   want the spread and the failure cases, not headline averages.

4. COLMAP DENSE MEMORY
   - What actually dominates peak memory in patch_match_stereo: image count, image resolution,
     window size, cache_size, or number of source views per reference image?
   - Which flags reduce peak memory with the least quality cost?
   - Is there a documented resolution/memory scaling relationship?
   - Confirm the exact behaviour of image_undistorter --max_image_size, and whether camera IDs,
     image IDs and the sparse model are preserved unchanged across two undistort runs at
     different resolutions. (We need two workspaces from ONE sparse model to be strictly
     comparable.)

5. COLMAP DOCKER TAGS
   Which tags exist on the colmap/colmap Docker Hub repo, and which corresponds to upstream
   4.1.1? We must pin rather than track :latest.

6. GTSAM FOR A MULTI-SESSION SITE GRAPH
   - Current stable release and its Python packaging story.
   - Worked examples combining GNSS factors + relative pose factors + fiducial observations.
   - Whether anyone has published COLMAP-plus-GTSAM architectures, and what they reported.

7. OBJECT DETECTION WEIGHTS THAT ARE COMMERCIALLY USABLE
   Detector families whose CODE AND WEIGHTS both permit commercial use, suitable for indoor
   building elements (light fixtures, outlets, sprinkler heads, diffusers, signage). Be explicit
   about weight licences — many popular detectors are AGPL or non-commercial even when the code
   looks permissive.

8. SPLAT 3D TILES
   Current state of authoring Gaussian-splat 3D Tiles tilesets: what CesiumJS consumes, what the
   spec requires, and which open-source tools can WRITE such a tileset today (we believe
   py3dtiles cannot — confirm or correct).

Return findings as a table with a Confidence column. Say plainly where you found nothing.
```

---

## PART 5 — What I need from you, step by step

Short version: **GitHub is already working — I have been pushing all session.** The gap is the
*runtime* backends and a set of files that only exist on your machine.

### 5.1 What I already have — no action needed
- **Git / GitHub push access.** Every commit this session is already on
  `claude/dronedeploy-reconstruction-analysis-py2toz`. Nothing is required from you for code to
  reach GitHub.
- The full repository, and the ability to run Python tests locally in this container.

### 5.2 What I do NOT have, and why credentials would not fix it
This session runs in a **cloud container, not your Windows machine at `C:\s360`**. The network
policy refuses the connection *before* authentication — the proxy returns **HTTP 403 on CONNECT**
for `*.supabase.co`, `api.supabase.com` and `api.modal.com`. **Pasting keys here would expose them
and still grant no access.** Please don't.

### 5.3 Step by step — what to actually do

**Step 1 — get the untracked ASU code into GitHub.** *(Blocking. Only you can do this.)*
On your machine at `C:\s360`:
```powershell
git checkout claude/dronedeploy-reconstruction-analysis-py2toz
git pull origin claude/dronedeploy-reconstruction-analysis-py2toz
mkdir workers\modal\photogrammetry\asu-tools
copy C:\ASU-Survey\tools\*.py workers\modal\photogrammetry\asu-tools\
copy georef_app.py workers\modal\photogrammetry\
copy patch_ortho.py workers\modal\photogrammetry\
copy stats_app.py workers\modal\photogrammetry\
git add workers/modal/photogrammetry/asu-tools workers/modal/photogrammetry/georef_app.py workers/modal/photogrammetry/patch_ortho.py workers/modal/photogrammetry/stats_app.py
git commit -m "chore(asu): commit the untracked mesh and scoring scripts"
git push origin claude/dronedeploy-reconstruction-analysis-py2toz
```
*Why it blocks everything:* the ASU mesh and every published measurement came from code that is
not in version control. Until it is, the DroneDeploy comparison is not reproducible and I cannot
review what produced the current numbers.

**Step 2 — run Arm B.** Costs CPU minutes, no GPU. From `C:\s360` after pulling:
```powershell
cd workers\modal\photogrammetry
$env:PYTHONIOENCODING="utf-8"
python -m modal deploy worker.py
python -m modal run worker.py::texture_workspace
```
Then re-texture the **existing** mesh against `/data/work/texture/images` instead of
`/data/work/dense/images` — same mesh file, same cameras, nothing re-solved. Send me both
renders. This is the cheapest experiment in the plan and may explain most of the quality gap.

**Step 3 — apply the pending migration.** `supabase/migrations/20260725120000_twin_asset_dedup.sql`
is written and waiting. From `C:\s360`:
```powershell
$env:SUPABASE_TELEMETRY_DISABLED="1"
npx supabase db query --linked -f supabase/migrations/20260725120000_twin_asset_dedup.sql
```
This activates the duplicate-upload fix and the stale-upload GC, both of which are code-complete.

**Step 4 — paste the Part 4 prompt to the other platforms** and send the replies back.

**Step 5 — decide on Modal image changes.** Phases B and C need COLMAP 4.1.1 and a vendored
gsplat trainer in the Modal image. Say yes and Track A unblocks; say not yet and I keep working
Phase A and E, which need neither.

**Nothing else is required from you.** If you would rather I do steps 1–3 myself, the only way is
to run a session from `C:\s360` where the CLIs are already authenticated — the credentials are
fine, it is the network path from this container that is closed.
