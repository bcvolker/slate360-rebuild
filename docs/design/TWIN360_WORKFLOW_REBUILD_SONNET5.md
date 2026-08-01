# Twin 360 — Workflow & UI Rebuild Plan (Sonnet-5 executable)

Status: **locked 2026-07-08** after Brian's dual-camera field test (iPhone + Insta360 X4)
exposed the remaining workflow failures. Companion to `TWIN360_MASTER_BUILD_PLAN.md`
(the full vision); THIS doc is the near-term execution plan, written so Sonnet 5 (or any
AI with repo access) can build each slice independently, in order, with acceptance gates.

---

## 0. Ground truth from the 2026-07-08 field test (verified in prod DB, not assumed)

**The pipeline is now GOOD. The workflow/UI is the product's weakest layer.**

| Evidence | Value |
|---|---|
| Phone+LiDAR walk (capture `8eb0367a`, model `923bd3f6`) | **PSNR 28.97 — best ever**, metric scale APPLIED, measured orientation, A3 removed ~19.7K floaters. Published on space `6050d57d`. |
| Same capture, second run (model `20057b10`) | PSNR 26.77 but `scaleSkipped=residual_too_high` — scale recovery varies run-to-run on the same data (see §4 P3). |
| Camera-roll import (capture `04fada9b`) | **BUG: the same 262.9MB video was registered 3× as separate asset rows** (two `ready` with different timestamped keys, one stuck `uploading` with NULL storage_key). Job ran on the incomplete triplicate set. Root cause class: each submit attempt re-registers assets; no dedup, no stale-row cleanup, no all-assets-ready gate before enqueue. |
| Brian's experience | 25+ min to import one ~1-min video (3× upload of 263MB ≈ the whole delay); capture appeared to auto-process, blocking him from adding X4 footage; upload screen full of jargon/desktop patterns. |

**UI slop confirmed at exact locations (delete these, don't patch):**
- `TwinUploadPanel.tsx:211` — "Files over 8 MB use resumable multipart upload to R2." (internal jargon in UI)
- `TwinUploadPanel.tsx:214-230` — drag-and-drop zone rendered on phones
- `TwinUploadPanel.tsx:194`, `TwinCapturePicker.tsx:111`, `CreateTwinSpaceForm.tsx:95` — "Twin workspace" / "Create twin workspace" concept exposed to users (meaningless label; users think in projects and scans)
- Space picker shows "Quick Scan — Jul 8" in a dropdown (internal auto-titles as choices)

**Design law (Brian, standing):** reimagine, never patch. Delete old components/pills/
buttons wholesale; keep only *functions*, re-presented. Graphite Glass tokens; one accent
(`--twin360-blue`) on interactive states only; 48–64px targets; no jargon, ever.

---

## 1. Expert analysis — the "easiest system for the most accurate, best-looking results"

### 1.1 The one structural insight
Accuracy is already handled by opinionated pipeline defaults (colmap-first, metric scale,
measured orientation, auto-crop, SOR). **The user should make exactly ONE decision in the
entire flow: "process now, or add more sources first?"** Everything else (quality tier,
format, workspace, naming) is a default with an optional override. Today the flow asks
users to understand workspaces, tiers, formats, and upload mechanics — that's why it
reads as slop even where it functions.

### 1.2 The app/desktop split (locked)
| | **App (phone/tablet)** | **Desktop** |
|---|---|---|
| Role | Capture + collect sources + one process decision + view/share | The studio: everything destructive/precise |
| Gets | Native capture, add-from-camera-roll/Files/SlateDrop, credit estimate, Process button, status, review gate, viewer, share, reprocess | All of the app's viewing PLUS crop/erase/slice/level with **bake**, measurements/area, floor plan, exports (PLY/GLB), progression, cinematic, embeds, branding |
| Never gets | Drag-drop zones, precision editing, format pickers, batch ops | (n/a — superset) |

### 1.3 The canonical mobile flow (what M1/M2 build)
```
CAPTURE (native ARKit, exists)                IMPORT (camera roll / Files / SlateDrop)
        └──────────────┬──────────────────────────────┘
                       ▼
        ┌─ REVIEW & SOURCES (one screen) ─────────────┐
        │ your clips + LiDAR, auto-listed             │
        │ [+ Add sources]  (roll / files / SlateDrop) │   ← the window Brian needed
        │ est. credits shown live                     │
        │ ────────────────────────────────            │
        │ [ Process twin ]   [ Save for later ]       │   ← NOTHING auto-processes
        └─────────────────────────────────────────────┘
                       ▼
        STATUS (leave anytime; push on done) → REVIEW GATE → publish / reprocess / share
```
Project targeting: inherited from entry point (project scan) or defaulted (quick scan →
auto space, attachable to a project later). **No "workspace" picker anywhere.**

---

## 2. Slice order for Sonnet 5 (each = one session, gates per slice)

Standing gates for EVERY slice: scoped-tsconfig typecheck (bare `tsc` OOMs — see
CLAUDE.md), `guard:architecture`, `guard:design`, `guard:file-size-regression`
(new files < 300 lines — split components), explicit-path commits, push after verify.
Never edit entitlements/billing/Stripe/middleware/existing migrations. UI = Graphite
Glass tokens only. Worker changes ⇒ redeploy Modal; `src/trigger/**` ⇒ redeploy Trigger.

### M1 — Kill auto-process; unified "Review & Sources" screen  ⟵ START HERE
**Problem:** native capture hands off to a submit funnel that can start processing
without an add-sources window; importing lands in a *different*, jargon-filled screen.
**Build:** ONE post-capture/post-import screen (rebuild of `TwinCaptureReviewScreen` +
`TwinSubmitStepSources`, deleting `TwinUploadPanel` as a user surface): sources list
(clips/LiDAR/imports as clean rows with size + thumbnail), `+ Add sources` (Photos /
Files / SlateDrop pickers — **no drag-drop on mobile**), live credit estimate, two
buttons: **Process twin** / **Save for later**. Quality tier = "Standard" default with a
small "High" toggle (Pro-gated, exists). Verify the native iOS handoff
(`/digital-twin/capture/submit?captureId=`) routes HERE and cannot enqueue without a tap.
**Files:** `components/digital-twin/TwinCaptureReviewScreen.tsx`,
`components/digital-twin/submit/*`, `components/digital-twin/TwinUploadPanel.tsx`
(delete/absorb), `app/digital-twin/(shell)/upload/page.tsx` + `capture/submit/page.tsx`
(route to the unified screen), `TwinCapturePicker.tsx` + `CreateTwinSpaceForm.tsx`
(delete "workspace" concept from user copy).
**Acceptance:** fresh capture → screen shows clips+LiDAR → add a camera-roll video →
estimate updates → nothing processes until "Process twin" → job created with ALL assets.
Grep-verify zero hits for "workspace"/"multipart"/"R2" in user-visible twin strings.

### M2 — Upload integrity: dedup + all-ready gate + stale cleanup (the 3×-upload bug)
**Problem (verified):** re-registration per attempt created 3 asset rows for one video;
job enqueued while one row was still `uploading`.
**Build:** (a) client sends a per-file content fingerprint (name+size+lastModified hash)
with asset registration; server (`app/api/digital-twin/**` asset-registration route)
returns the EXISTING row instead of inserting when fingerprint matches an asset already
on the capture (idempotent registration, mirrors `client_item_id` convention). (b) On
submit-screen mount, garbage-collect `uploading` rows older than N hours with no
completed parts. (c) `createReconstructionJob` + the jobs route must refuse to enqueue
while any asset on the capture is `uploading` (clear message: "Still uploading — N of M
done"). (d) Resume, don't restart: if the SAME fingerprint is mid-upload, reattach to its
multipart session (the on-disk part-ETag resume engine already exists in the uploader).
**Acceptance:** import the same video twice → ONE asset row; kill the app mid-upload and
re-import → resumes, no new row; Process disabled until every row `ready`. This alone
turns Brian's 25 min into ~8 (one 263MB upload instead of three).

### M3 — Status & review-gate polish on the unified flow
Wire the existing realtime status + Slice-1 review gate into the M1 screen's post-process
state (leave-anytime + push on completion already exist). Failed state keeps "Try again"
(capture-level reprocess route, exists). Small slice — mostly wiring + copy.

### D1 — Twin Studio shell (desktop)
Rebuild `/digital-twin/twins/[id]/editor` into a tabbed studio (no-scroll workspace
rule): **Clean** (existing crop/erase/slice/transform overlays + layers) · **Measure**
(existing point-to-point; area tool comes in D4) · **Plan** (surface the already-generated
`floorplan.png` — API exists, zero UI consumers today) · **Deliver** (share roles, embed
placeholder, exports placeholder). Keep `DesktopSplatViewport` (works); delete the loose
link-card page around it. Route/nav label: **Twin 360 Studio**.

### D2 — Bake (destructive apply) — the flagship desktop capability
`POST /api/digital-twin/models/{id}/bake` → Trigger → Modal: worker job downloads the
model's PLY-equivalent source, applies the saved `edit_list` (crop boxes/erase spheres/
slice planes as geometric filters over splat positions), re-runs the export tail (SOR →
spike clamp → spz + manifest + floorplan), creates a NEW model version (never mutates;
Slice-0 versions/publish flow presents it). Studio gets "Apply edits to file" with
credit estimate. **Modal redeploy required.** Unit-test the geometric filters against
synthetic PLYs (the R7 test pattern in git history).

### D3 — Level & center (manual upright) + saved-view
Studio control: drag-to-rotate gizmo (or axis sliders) writing a correction quaternion to
the manifest (viewer already consumes `correction_quaternion`); "Set opening view" writes
`initial_camera` (viewer already consumes it). Fixes any residual tilt/upside-down case
without reprocessing.

### D4 — Exports + area measurement (the architect/proposal features)
(a) Server-side PLY + GLB export (worker has the PLY mid-artifacts; GLB via a mesh-from-
splats pass is v2 — ship PLY first, label honestly). Download from Studio → Deliver +
optional share-role gating (route exists for spz). (b) Area tool: polygon-on-floor-plane
→ square footage via metric scale; saved named dimensions (kitchen W, garage opening)
exportable CSV. Wall area = same tool on a vertical plane (doors/windows subtracted as
negative polygons) — ship floor first.

### P1 — 360-video ingest (unlocks the X4)
Worker: detect equirect video (aspect ~2:1 of the stream — NEVER filename), then per
extracted frame run the EXISTING equirect unwrap (~8–12 perspective views, shared optical
center) before COLMAP. Honest credit cost (more frames). Also fix 360 *photo* detection
to aspect-ratio (the filename heuristic at `twin-review-media.ts:37` is a proven false-
negative machine). **Until P1 ships, the UI must label 360 videos "360 support coming
soon" rather than silently producing garbage** (M1 includes this guard using the same
aspect probe client-side via a `<video>` metadata load).

### P2 — Multi-source merge (the dual-camera differentiator)
One job from N captures in the same space: job route accepts `capture_ids[]`, worker
downloads all sources, timestamps align clips (frame-time matching machinery exists),
COLMAP solves jointly. UI: Review & Sources screen on a space with other unprocessed
captures offers "Include sources from: [phone walk Jul 8] ☑". Requires P1 for 360 inputs
to help rather than hurt.

### P3 — Scale-recovery stability (small, data-driven)
Same capture produced `scaleFactor` applied (28.97 run) and `residual_too_high` (26.77
run). Instrument: log the residual distribution per run; if variance is COLMAP-seed
noise, retry scale fit on the second-best correspondence set before skipping. Keep the
honest skip as fallback.

**Recommended order: M1 → M2 → M3 → D1 → D2 → P1 → D3 → D4 → P2 → P3.**
(M-track first: it unblocks Brian's daily field testing; D2 before P1 because "clean the
model I already have" beats "add more sources" for immediate deliverable value.)

---

## 3. Per-slice prompt template for Sonnet 5

> You are working in C:\s360 (Slate360). Read CLAUDE.md fully, then
> docs/design/TWIN360_WORKFLOW_REBUILD_SONNET5.md — you are building slice ⟨ID⟩.
> Re-verify the doc's claims against current code before editing (files move).
> Brian's design law: REIMAGINE, never patch — delete listed slop components
> wholesale; keep only functions. Graphite Glass tokens only; no jargon in UI copy.
> Declare your file footprint first. Build the slice. Run the standing gates
> (scoped tsconfig typecheck, guard:architecture, guard:design,
> guard:file-size-regression). Commit with explicit paths, push to main.
> If the slice touches workers/modal/** redeploy Modal; src/trigger/** redeploy
> Trigger (see CLAUDE.md for exact commands). Report: what you deleted, what you
> built, gate results, and what Brian must verify on-device.

---

## 4. What Brian verifies on-device after each M-slice
- M1: capture → add a roll video → process only on tap. No jargon anywhere.
- M2: double-import the same video → one row; mid-upload kill + retry → resume.
- Now: **open "Quick Scan — Jul 8" in the app — model `923bd3f6`, PSNR 28.97, is the
  best twin the pipeline has produced. This is the visual-quality baseline.**

---

## 5. LOCKED ADDENDUM 2026-07-28 — external adversarial review, verified & adopted

Two external reviews landed; every load-bearing claim below was **verified against code
in this repo** before adoption (grep-confirmed at the cited locations).

### 5.1 The strategic correction (changes this plan's priorities)

**"COLMAP 4.1.1 is the single gate" was WRONG. There are TWO independent gates:**

1. **EXTERIOR (DroneDeploy parity) is unblocked TODAY — it is a wiring problem.**
   The product worker solves SfM with `ns-process-data --no-gpu --num-downscales 2`
   (CPU SIFT, capped pyramid, no GPS use — verified worker.py:2605-2611) while the
   research worker (`workers/modal/photogrammetry/worker.py:88-123`) already runs the
   DroneDeploy-class config **proven on 917 DJI photos**: GPU SIFT @ max_image_size
   3200 → `spatial_matcher` (GPS-guided) + `sequential_matcher --overlap 20` with
   `guided_matching 1` → `mapper --Mapper.ba_use_gpu 1`, plus `align()` GPS/ENU
   georeferencing with residuals, native-res `texture_workspace()`, true-ortho
   `ortho_hires`. **None of it is dispatchable from the product.** "Overlapping drone
   photos = unusable model" is caused by the nerfed product config, not by COLMAP.
2. **INTERIOR (run-to-run determinism) is gated on pose priors** (pose_prior_mapper →
   pycolmap 4.1.1 image layer). Scale recovery is post-hoc and non-deterministic
   (same capture: 28.97 w/ scale vs 26.77 `residual_too_high`).

Sequence them **in parallel**, not serially.

### 5.2 New slice E-track (EXTERIOR productization) — inserted ahead of P2

- **E0 (day, do first):**
  (a) **Pin the COLMAP image tag** — `photogrammetry/worker.py:24` uses
  `colmap/colmap:latest`; a silent upstream bump invalidates every A/B run
  (the worker's own `_log_colmap_version` warns about this). Pin before ANY GPU spend.
  (b) **Do NOT rehabilitate ODM.** An uncommitted +27-line diff on `odm_runner.py`
  is re-investing in it; ODM is AGPL-3.0 (fatal for SaaS per
  UNIFIED_SITE_MODEL_ARCHITECTURE §6b) AND technically failed on ASU (degenerate
  36KB mesh, 37 CPU-hours). Park the diff; benchmark-only forever.
  (c) **TWIN-002 one-liner:** `src/trigger/twin-gaussian-splat.ts:80-81` uses
  `.find()` for `lidar_poses`/`ply_lidar` — first-match-only, silent data loss the
  moment multi-clip LiDAR uploads as separate rows. `.filter()` + worker-side merge
  (worker must accept arrays; not literally one line — small slice).
- **E1 (week): `ALIGN_BACKEND=colmap_drone`** — port the research `sparse()` config
  into the product worker as a selectable backend; auto-route when `asset_kind` is
  `drone_*` or EXIF GPS detected (never leave drone jobs on the nerfed default);
  pass `alignBackend` through the Trigger payload; record in `quality_metrics`.
  **Gate:** a real DJI set through the PRODUCT flow registers ≥95% of images +
  R7.5 visual comparison vs DroneDeploy on identical data.
- **E2 (week): GPS georef + export writers** — wire `gps_priors.py` (done, 19/19
  tests, unwired) into the drone solve; GeoTIFF via GDAL (explicit EPSG), LAS/LAZ
  via PDAL (license-clean per §6b); textured mesh + true-ortho into R2 derivatives
  + structured QC report (GSD, reprojection error, registration %, georef residual).
- **Cheap experiments BEFORE any GPU ladder:** Arm B native-res texturing (CPU-only,
  code-complete `texture_workspace()`) and M0 memory profile. Only if B leaves a
  visual gap does the 2400/3200 resolution ladder get GPU money.

### 5.3 Interior additions (adopted)

- **Start the per-frame depth TestFlight cycle NOW, in parallel** — the long pole.
  iOS capture persists only a fused 2cm-voxel grey PLY (verified voxelSize=0.02);
  per-frame depth (16-bit PNG mm @ native 256×192) + confidence + per-point RGB
  (Polycam/StrayScanner de-facto format) is what raises the ceiling on depth
  supervision, the biggest floater-killer. Native change → Codemagic → TestFlight.
- Pose-prior integration (pycolmap 4.1.1 layer + `colmap_pose_prior` backend with
  vanilla fallback) remains the interior fix; gate = scale applied on 100% of runs,
  Y_UP_MEASURED 100%, PSNR ≥ baseline on the 28.97 capture, visual gate.

### 5.4 Shared-spine additions (adopted from both reviews)

- **U1 site-frame schema NOW** (small additive migration: project site origin +
  blocks registry w/ Sim3 + residual) — a column today vs a migration after 100
  prod models. Federation itself stays Phase 5; **never fuse before each track is
  independently reliable** ("more data is not monotonically better").
- **Share viewer:** floor-plan tab (PNG generated, zero UI consumers today) + the
  four-state accuracy vocabulary on every capture: VERIFIED / ESTIMATED /
  LOW CONFIDENCE / UNREGISTERED — measurements must carry honest confidence.
- **Definition of done for one share link:** visual twin + measurement geometry +
  2D plan + downloadable derivatives + per-capture accuracy status.

### 5.5 Revised order of execution

E0 (day) → **E1 colmap_drone** (week) ∥ **per-frame-depth native change** (starts
same day, TestFlight-gated) → Arm B + M0 (days, CPU) → M1-M3 mobile flow (UX, as
planned) → interior pose priors (needs image upgrade) → E2 exports/QC → D1-D4
studio → U1 schema (any time, small) → P1 360-video → P2 federation last.

### 5.6 Third-round review corrections (verified 2026-07-28, late)

- **INTERIOR IS CLOSER THAN THE TRACKER SHOWS.** `align_backends.py` exposes
  `run_alignment(backend="colmap_vanilla"|"colmap_pose_prior")` with covariance-
  weighted ARKit priors — code-complete, with an off/on A/B test harness
  (`test_pose_prior_benefit.py`, median camera-centre error comparison). But
  `worker.py` has ZERO references to it and its image has no pycolmap. **The precise
  interior gate is: add `pycolmap==4.1.1` to the gpu_image pip-install
  (worker.py:~153-200), import + call `run_alignment()` in the align stage with
  `colmap_vanilla` fallback, R7.5 visual gate. ~1-2 weeks, not multi-week.**
- **Exterior productization = a SEPARATE worker/task contract** (adopted from
  review 1): build product dispatch around `workers/modal/photogrammetry/worker.py`
  as its own Trigger task + job_type, do NOT couple mesh/ortho/CRS into the 2,700-
  line splat worker. Route by explicit `source_role`/`asset_kind` + validated
  metadata — never silently classify every GPS-bearing file as drone imagery.
- **Ingest truth-gaps confirmed still open:** 360-hint flag is NOT propagated
  through `useMultipartTwinUpload` to the worker; `.insv` missing from
  `upload-helpers.ts` (only `.insp` at line 54); no server-side ffprobe fallback.
  Also: `jobs/route.ts` ADVERTISES `photogrammetry_mesh`/`lidar_fusion` job types
  with no worker behind them — reject until real (becomes the exterior task's
  job_type when E1 lands).
- ASU tools: ALREADY committed (a6334dc1) — review's reproducibility ask satisfied.
- Native capture format: prototype the per-frame depth package + validate on
  TestFlight BEFORE locking the exact file format (versioned capture package).
- Honest confidence map adopted: exterior parity HIGH ~2wk · interior determinism
  MED-HIGH ~1-2wk post-image-change · interior TOP visual quality gated on the
  TestFlight depth cycle (long pole, runs in background) · 360 verify ~days on a
  real X4 file · federation LAST, months, never promised until both tracks stable.

## 6. TWO-WEEK PARALLEL EXECUTION PLAN (multi-AI, ~12 prompts)

Constraint: 1-2 weeks, multiple AI platforms available. The working tree collision
rule: web/remote sessions work on BRANCHES; the LOCAL machine session is the only
merge + deploy point (migrations → merge → Vercel/Modal/Trigger), as proven by the
dronedeploy-branch flow. Tracks run in parallel:

| Track | Owner | Prompts | Contents |
|---|---|---|---|
| **A. Exterior parity** | local session (deploys) | 3 | A1=E0 day-fixes (pin tag, TWIN-002 .find→.filter+worker merge, reject unbacked job_types, park ODM) · A2=E1 exterior Trigger task + product dispatch from photogrammetry worker (job_type=photogrammetry_mesh, source_role routing, derivatives→R2, callback) · A3=E2 georef + GeoTIFF/LAS + QC report |
| **B. Interior determinism** | local session (Modal deploy) | 2 | B1=pycolmap 4.1.1 image + wire run_alignment(colmap_pose_prior) w/ vanilla fallback · B2=A/B on the 28.97 capture ×3 reruns (gate: scale applied 3/3, Y_UP_MEASURED 3/3, PSNR≥baseline, visual) |
| **C. iOS depth (long pole — START DAY 1)** | any session writes Swift; Brian: Codemagic + TestFlight | 1-2 | C1=per-frame depth(16-bit mm PNG native res)+confidence+per-point RGB, versioned package format · TestFlight verify on Brian's phone |
| **D. Mobile flow + viewer** | web session(s), on branches | 3-4 | D1=M1 unified Review&Sources (kill auto-process + slop) · D2=360 ingest truth (hint propagation, .insv, ffprobe fallback) + verify real X4 file end-to-end · D3=floor-plan tab + 4-state accuracy badge · (D4=M3 polish if time) |
| **E. Cheap experiments** | local, CPU-only | 1 | Arm B native-res texture + M0 memory profile on ASU set (decides if any GPU ladder is ever needed) |

**Total: ~11-13 prompts.** Week 1: A1+A2, B1, C1 code, D1, E. Week 2: A3, B2 gate,
D2+D3, C TestFlight verify, integration + Brian's on-device field test of everything.
**In 2 weeks (high confidence):** drone photos → DroneDeploy-class model in-product;
interior scale deterministic; 360 X4 verified; unified mobile flow; floor plan +
accuracy badges in shares. **Explicitly NOT in 2 weeks:** federation (P2), depth-
supervised interior ceiling (TestFlight cycle continues), GLB mesh export.
**Brian's 3 unblocks, all needed DAY 1:** (1) authorize the pycolmap image change,
(2) cut the Codemagic build when C1's Swift lands, (3) confirm his DJI Mini 5 Pro
set is uploaded for the E1 gate.
