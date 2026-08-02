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

---

## 7. LOCKED 2026-08-01 — implementation drop verified & merged; PHASED EXECUTION BRIEFS

### 7.0 What changed on 2026-08-01 (verified, not assumed)

Another AI session implemented and DEPLOYED the core of tracks A/B/C/D but did not
commit. The local session (merge-and-deploy owner) verified every claim against
the working tree and live endpoints, ran the gates, and committed the drop:

- **Exterior product worker LIVE**: `workers/modal/photogrammetry/product_worker.py`
  at `https://bcvolker--reconstruct-exterior.modal.run` (401 without
  `x-dispatch-token` — verified). Pinned COLMAP image, GPU SIFT, GPS spatial +
  sequential guided matching, GPU BA, dense fusion, texturing → **GLB primary**,
  plus orthomosaic, local DEM, QC JSON stored beside it. Georef is explicitly
  `UNREGISTERED` until CRS/GCP lands (Phase 2).
- **`photogrammetry_mesh` job type is REAL**: `src/trigger/twin-photogrammetry.ts`
  (task `twin.photogrammetry_mesh`), dispatched by `app/api/digital-twin/jobs/route.ts`
  (`job_type: "photogrammetry_mesh"`, `output_format: "glb"`). Trigger version
  `20260801.1` deployed. `MODAL_PHOTOGRAMMETRY_ENDPOINT` set in Vercel prod.
- **Interior pose-prior arm WIRED**: gaussian worker installs `pycolmap==4.1.1`,
  accepts `alignBackend: "colmap_vanilla" | "colmap_pose_prior"`, adapts COLMAP
  poses via `image.cam_from_world()` into Nerfstudio transforms, falls back to
  vanilla on failure. Vanilla remains default until the Phase 3 gate passes.
  Synthetic A/B: median camera-center error 4.95 m → 0.059 m (mechanism only).
- **Ingest truth fixed**: `.insv`/`.insp`/`.s360depth` explicit; equirect probe on
  all selected files with the measured hint AUTHORITATIVE; 360 flag + capture ID
  survive single AND multipart uploads (the capture-ID threading bug from the
  external review is fixed); duplicate LiDAR pose/PLY/depth assets fail loudly
  (TWIN-002 closed).
- **Native depth evidence**: ARKit capture retains optional per-frame depth +
  confidence + paired RGB in versioned `S360DEPTH1` stream; worker validates and
  reports `qualityMetrics.depthEvidence`. NOT yet used for training (Phase 3b).
  Needs a Codemagic/TestFlight build to reach Brian's phone.
- **Share viewer honesty**: `TwinQualityBadge.tsx` surfaces
  VERIFIED / ESTIMATED / LOW CONFIDENCE / UNREGISTERED from delivered QC.
- Tests green: review-media 4/4 + badge 4/4 (vitest), depth-evidence pass,
  pose-priors 28/28, guard:architecture pass, production build pass.

### 7.1 Corrections adopted from the 2026-08-01 external reviews

1. **E1/E2 gate split** (replaces the single "E1 parity" gate): **E1 =
   reconstruction correctness** — sparse+dense registration rate, reprojection
   error, repeatability across reruns on the ASU/DJI set. **E2 = delivery** —
   textured mesh quality, orthomosaic/DEM correctness, CRS/LAS export, QC report,
   viewer tabs. Never claim "DroneDeploy parity" from E1 alone.
2. **B2 fallback gate**: pose-prior promotes to default only on 3/3 reruns with
   scale applied + Y_UP_MEASURED + PSNR ≥ baseline + visual pass. INTERIM
   acceptance (2/3 + visual) allows continued A/B but NOT promotion.
3. **Provenance in quality_metrics**: every job must record the COLMAP image
   tag/git SHA and pycolmap/gsplat/nerfstudio wheel versions so reruns are
   attributable. (Phase 1 adds this if missing.)
4. **ffprobe stays out of the Vercel request path**: server-side probe fallback
   runs in the worker (Modal) or Trigger task, never in a Next.js route.
5. **`gps_priors.py` is phone/block georeferencing ONLY**; drone EXIF GPS is
   consumed by COLMAP's spatial matcher directly. Do not cross-wire.
6. **Explicit `source_role` routing**: GPS-bearing files are routed by the user's
   declared source (drone picker / phone / 360), never silently classified as
   drone because GPS exists.
7. **Bounded prompts**: remaining work is 6 phases (below), each sized to one
   AI session, each with its own gate. No open-ended "keep improving" prompts.

### 7.2 ORIGINAL SOURCE RETRIEVAL — reprocessing old uploads (answering "how do we access the data from before submission")

**Every file Brian ever uploaded for a twin is still in the pipeline.** Nothing
needs re-uploading. Verified in prod 2026-08-01:

| capture_id | date | contents | size |
|---|---|---|---|
| `04fada9b-c678-47d9-bc38-10572e920bcc` | 2026-07-08 | Insta360 X4 import (2 video rows — pre-dedup duplicate pair, pick distinct fingerprints) | 525.7 MB |
| `8eb0367a-63ee-49d0-bde4-8757978cd0c4` | 2026-07-08 | phone walk: video + lidar_poses + ply_lidar + panorama_360 | 318.8 MB |
| `e5d42523-4a94-4ed8-b7bb-ab9b4c395ad1` | 2026-07-04 | A/B test capture (video + LiDAR + poses; own vanilla baseline PSNR 25.53 — NOT the 28.97 scene) | 128.3 MB |
| `245ec1ca-f90f-4c41-8691-460e6820ce08` | 2026-07-02 | video + LiDAR + poses | 41.1 MB |
| `98ea6046-e3a5-45ac-b5c5-9cf9ff3945e6` | 2026-07-01 | video + LiDAR + poses | 38.9 MB |
| `c4367891-7c24-4990-9d56-a5cd63b4ffe9` | 2026-06-30 | video + LiDAR + poses | 23.3 MB |

**Where the bytes live**: each row in `digital_twin_capture_assets` has a
`storage_key` — an object path in Cloudflare R2 bucket `slate360-storage`
(org/space/capture-scoped). The DB row is the index; R2 holds the bytes. DB
deletes do NOT remove blobs. Raw retention default is KEEP (`retainRaw=true`);
only an explicit opt-out at submit lets the callback delete raw sources.

**How to list what a capture contains** (from the local machine):
```sql
select id, asset_kind, file_name, file_size_bytes, storage_key, status
from digital_twin_capture_assets
where capture_id = '<CAPTURE_ID>' and deleted_at is null;
```
via `SUPABASE_TELEMETRY_DISABLED=1 npx supabase db query --linked -f <file.sql>`.

**How to REPROCESS a capture through the improved pipeline** (three routes, all
read the same original assets — no re-upload):
1. **Product API** — `POST /api/digital-twin/jobs` with
   `{ capture_id, job_type: "gaussian_splat" | "photogrammetry_mesh", quality,
   align_backend? }`. This is what the app's Process button calls; enforces
   entitlements/credits and the all-assets-ready gate.
2. **User-facing reprocess routes** —
   `app/api/digital-twin/models/[modelId]/reprocess` and
   `captures/[id]/reprocess` (Slice 0/1 work, shipped).
3. **Ops script (experiments, bypasses billing)** —
   `node scripts/ops/dispatch-twin-experiment.mjs --capture-id <ID>
   [--align-backend colmap_pose_prior] [--train-profile ...] [--publish]`,
   which POSTs directly to the Modal endpoint with the dispatch token. Jobs run
   detached on Modal; poll `digital_twin_processing_jobs` by id. R7.5 visual
   gate applies before any publish.

### 7.3 PHASED EXECUTION BRIEFS (each = one prompt to one AI platform)

Working rule unchanged: web/remote sessions on branches; LOCAL session is the
sole merge + deploy point. Every phase brief below is self-contained.

**PHASE 1 — Acceptance runs on real data (local session; needs backend access).**
Objective: turn the deployed pipeline from "code-verified" to "output-verified."
Steps: (a) ASU/DJI exterior set → submit as `photogrammetry_mesh` via
`POST /api/digital-twin/jobs` (or ops dispatch); require callback + GLB + ortho +
DEM + QC JSON in R2 under the job model prefix; record E1 metrics (registered
images ≥95%, reprojection <1.5 px, rerun repeatability) into the doc; compare
against the DroneDeploy reference visually. (b) Interior A/B: rerun capture
`e5d42523` once `colmap_vanilla`, 3× `colmap_pose_prior` via the ops script with
`--align-backend`; gate per §7.1(2). (c) 360: reprocess capture `04fada9b` (X4
import — use the deduped asset) and verify .insv detection → perspective
extraction → registration → viewer output. (d) Add provenance fields §7.1(3) to
`quality_metrics` if absent. Every publish passes the R7.5 browser screenshot
gate; Brian's eyes are final. Deliverable: metrics table appended here.

**PHASE 2 — Exterior E2 delivery (any session, branch).** Objective: make
exterior outputs client-grade. Steps: CRS handling + optional GCP/checkpoint
ingest in `product_worker.py` (lifts georef from UNREGISTERED per measured
checkpoint RMSE); GeoTIFF ortho + LAS point export; surface ortho/DEM/QC as
first-class tabs in the share viewer (`app/share/twin/[token]`) next to the 3D
view; walkthrough tab = the existing splat/GLB viewer with guided waypoints.
Gate: E2 checklist — mesh visual pass, ortho georef within stated RMSE, LAS opens
in CloudCompare, QC JSON rendered in viewer. Local session deploys Modal after merge.

**PHASE 3 — Interior promotion + depth supervision (local for deploys).**
3a: if Phase 1(b) gate passes 3/3, flip `colmap_pose_prior` to default in the
jobs route + Trigger payload; keep vanilla as automatic fallback. 3b: consume
`S360DEPTH1` per-frame depth evidence as depth supervision in splatfacto training
(worker already validates the stream; wire it into the dataparser + depth loss);
gate = PSNR/visual improvement vs the 28.97 baseline on a NEW TestFlight capture.
Blocked on: Codemagic build cut (Brian) so the phone actually records the stream.

**PHASE 4 — M1 unified mobile Review & Sources screen (web session, branch).**
The submit/upload UI is still the old slop (Brian verbatim: "files over eight
megabytes are resumable multi port upload…" must die). Build the one-decision
Review screen per §2 M1: source list with per-file classification chips
(phone/360/drone/LiDAR — user-correctable, feeds `source_role`), credit estimate,
single Process CTA, no auto-process, upload progress integrated. Graphite Glass
tokens only; ground-up rebuild, keep nothing. Gate: bug-hunter pass + Brian
on-device.

**PHASE 5 — Studio: crop/edit/publish (D1-D4, web session, branch).** Desktop
editor: crop box, recenter, upright, delete-splats brush, then bake (worker
crop/recenter/scale params already exist — expose them), export (spz/ply/GLB),
square-footage from floor plan. Publish = share token + walkthrough tab. Gate:
edit → bake → share round-trip on a real model.

**PHASE 6 — Multi-source federation (LAST; do not start until 1-5 stable).**
Combine phone + 360 + drone + LiDAR of the same site into one scene (register
360-extracted perspectives and drone set into a common COLMAP model, merge splat
+ mesh). Months-scale; never promised to users until proven on Brian's own site
captures.

**Deploy matrix (unchanged, load-bearing):** `workers/modal/**` →
`PYTHONIOENCODING=utf-8 python -m modal deploy <worker>.py` from its dir ·
`src/trigger/**` → `PYTHONIOENCODING=utf-8 npx trigger.dev@4.4.6 deploy` (CLI
pinned; @latest refuses the SDK) · app code → git push (Vercel) · iOS Swift →
Codemagic TestFlight (Brian cuts) · migrations BEFORE Vercel push.

### 7.4 LOCKED 2026-08-01 (second pass) — corrections, test data, and delegation

**Corrections adopted (external verifier round 2, all claims re-verified locally):**
1. **The drone is a DJI MAVIC 3 ENTERPRISE with RTK** (not a Mini 5 Pro). Each
   mission folder carries a `.MRK` RTK positioning/timestamp file — survey-grade
   antenna positions. Phase 2 must parse MRK: it is the path from UNREGISTERED →
   VERIFIED georef (measured checkpoint RMSE), no GCP targets required.
2. **Test data locations (on Brian's machine):**
   - `C:\ASU-Survey\DJI_202607150603_0015` — 380 JPG + MRK (mission 015)
   - `C:\ASU-Survey\DJI_202607150618_0016` — 407 JPG + MRK (mission 016)
   - `C:\ASU-Survey\DJI_202607150603_015` / `..._016` — duplicate copies, ignore
   - `C:\ASU-Survey` root also holds `_D.JPG` singles, 102MEDIA/103MEDIA, Extra/, Low/
   - `C:\Users\bcvol\OneDrive\Desktop\Sun Deck` — THERMAL only; out of twin scope
     (belongs to Thermal Studio).
3. **Per-phase commits from now on**: the 2026-08-01 drop was one 38-file commit;
   future phases commit per-slice so regressions bisect cleanly.
4. **Honesty line for Phase 1**: the exterior worker is code-verified, NOT
   output-verified — the first real `photogrammetry_mesh` dispatch on the Mavic
   set is the moment of truth; budget a day for real-data bugs and report them
   rather than silently patching the worker.
5. **ODM concern CLOSED**: `src/trigger/twin-photogrammetry.ts` references only
   `MODAL_PHOTOGRAMMETRY_ENDPOINT`; zero odm_runner references (grep-verified).
6. **Provenance**: record the COLMAP image tag AND git SHA plus
   pycolmap/gsplat/nerfstudio wheel versions in `quality_metrics` (a pinned tag
   can be silently rebuilt; the SHA is the reproducibility key).

**Delegation model (locked):** the LOCAL session remains sole merge + deploy +
gate owner and makes all promotion decisions. Other AI platforms execute phases
on branches (or, for the acceptance runner, dispatch-only ops under guardrails:
no main commits, no deploys, no env changes, no default flips, results to
`docs/ops/PHASE1_ACCEPTANCE_REPORT.md`). GPU dispatches cost real money — the
acceptance runner is capped at 2 exterior + 4 interior + 1 360 runs without
explicit approval. Copy-paste phase prompts are maintained in chat by the local
session; this section records the assignment map:

| Phase | What it accomplishes | Owner |
|---|---|---|
| 1 — Acceptance runs | Turns "code-verified" into "output-verified": real Mavic 3E dispatch (E1 metrics), pose-prior A/B ×3 on the 28.97 capture, X4 360 reprocess; metrics table + R7.5 screenshots | Verifier AI (local access) under guardrails, or local session |
| 2 — Exterior delivery (E2) | MRK/RTK georef + checkpoint RMSE, GeoTIFF/LAS export, ortho/DEM/QC + walkthrough tabs in share viewer | Any AI, branch `claude/e2-exterior-delivery` |
| 3 — Interior promotion + depth | Flip pose-prior default IF 3/3 gate passes (local decision); wire S360DEPTH1 depth supervision into training | LOCAL only (deploys + promotion) |
| 4 — M1 mobile Review & Sources | Ground-up one-decision submit flow; kills upload slop; source_role chips; credit estimate; no auto-process | Any AI, branch `claude/m1-review-sources` |
| 5 — Studio crop/edit/publish | Desktop crop/recenter/upright/delete → bake → export → share round-trip | Any AI, branch, after Phase 1 |
| 6 — Federation | Multi-source single scene | LAST; not started |

### 7.5 LOCKED 2026-08-02 — Phase 1 first pass: verdict, fixes shipped, reruns in flight

**Phase 1 report (docs/ops/PHASE1_ACCEPTANCE_REPORT.md, merged 7fff842d) verified
accurate.** It did its job: found 3 real blockers on real data. All fixed and
deployed by the local session same-day:

1. **Pose-prior SIGABRT (all 3 runs)** — COLMAP 3.11 loop detection downloads a
   FAISS vocab tree from GitHub at runtime; container CA rejects TLS → native
   abort kills the process before the vanilla fallback can run. FIX: loop
   detection OFF in align_backends.py (sequential+spatial matching unchanged);
   re-enable only with a build-time-baked tree. Gaussian worker redeployed.
2. **Exterior jobs stale-killed while alive (both runs)** — recovery RPC keyed on
   `started_at`, so ANY job >45 min was failed mid-run; the first Mavic run was
   legitimately deep in dense reconstruction. FIX: migration
   `20260802100000_stale_twin_jobs_activity_aware.sql` (applied to prod) makes
   staleness activity-based; product worker now heartbeats the progress route
   every 60 s from a signed background thread with stage boundaries mapped onto
   the existing stage vocabulary; progress route bumps updated_at. Product
   worker redeployed.
3. **PSNR 25.53 vs 28.97 is likely CONFIG DRIFT, not regression** — the 28.97
   reference (model `923bd3f6-551e`, Jul 8) predates the `trainProfile` flag
   (profile null); the acceptance rerun used `--train-profile baseline`. A
   vanilla run at `--train-profile quality` is in flight to close the question.
4. **X4 .insv acceptance is impossible with retained data** — capture `04fada9b`
   holds app-exported MP4s (generic `video` kind, no equirect hint; predates the
   probe). The Gaussian run succeeded (21.9 PSNR, 167/167) but proves nothing
   about the .insv chain. BLOCKED ON BRIAN: supply an original `.insv` straight
   from the X4 and upload through the current app flow.

**Rerun matrix dispatched 2026-08-02 (all detached on Modal):** exterior
`4388feb8` on existing capture `b98d2165` (381 assets incl. MRK — no re-upload;
heartbeats + activity-staleness now protect it) · pose-prior A/B ×3 at
standard/standard/baseline (`ce26b5d5`, `a19fa656`, `d93458e6`) — valid against
the completed vanilla-baseline run (25.53) · draft-config smoke ×3 (crash-fix
validation only) · vanilla @ quality-profile probe (`a2fc0a03`).

**Phase 2 branch status:** built on `claude/e2-exterior-delivery` (5 commits,
modular worker split, MRK/CRS/RMSE, GeoTIFF/LAS, viewer tabs; local gates pass).
NOT merged: it refactors the exterior worker that is only now being
output-verified. Merge order: exterior rerun completes → E1 metrics recorded →
local session reviews + merges Phase 2 → deploys → E2 acceptance on the same
capture. One-variable-at-a-time.

**Remaining prompt budget:** Phase 3b depth-supervised training (1 prompt, after
Brian's TestFlight build) · Phase 4 M1 mobile rebuild (1 prompt, already
written, can start NOW) · Phase 5 studio (1–2 prompts, after Phase 1 closes) ·
Phase 2 review/merge/deploy + Phase 3a promotion decision are local-session
tasks, no prompts. Federation excluded from near-term budget. **Total: 3–4
prompts to a fully working pipeline + rebuilt flow.**

### 7.6 LOCKED 2026-08-02 — three-auditor adversarial round: triage, fixes shipped, corrected facts

Three independent audits (all claims re-verified locally before action).
**FIXED + DEPLOYED same day (commit of this section):**
1. Late `completed` callback can no longer resurrect a `failed` job (409 in
   `lib/twin/job-callback.ts`) — the #1 consensus critical; it would have
   charged credits + inserted a model for a run the user was told failed.
2. `outputKey` must live under the job's own org prefix (callback scope check).
3. Both Modal endpoints now FAIL CLOSED — dispatch token required
   unconditionally, no longer dependent on `MODAL_DISPATCH_AUTH_REQUIRED`
   staying set (verified live: 401 without token on both).
4. Gaussian worker: whole-job 60 s liveness heartbeat thread (align/export had
   silent gaps longer than the 45-min activity window).
5. Pose-prior HONESTY: the arm asserted `scaleFactor=1.0` + a fabricated
   measured up-vector; real `recover_metric_scale` now runs on both backends —
   an honest skip beats a fake pass.
6. Trigger tasks: `markJobFailed`/`failJob` now also fail the capture (was
   stuck `processing` forever).
7. Migration `20260802130000` (applied): stale recovery also fails `queued`
   jobs never claimed within the threshold.
8. GC cron override 180→720 min (was able to sweep a live upload on site LTE).
9. Reprocess helper gained the P0a pending-uploads gate.
10. Progress heartbeat body now carries `jobId`; route rejects mismatches
    (replay binding). Quality badge now reads the worker's actual
    `scaleFactor` field (why good models showed LOW CONFIDENCE).

**CORRECTED FACTS (measurement, not code):** the 28.97 reference model
(`923bd3f6-551e`) belongs to capture `8eb0367a` (Jul 8 phone walk), NOT
`e5d42523` (Jul 4) — the "PSNR regression" was a cross-scene comparison and is
retired. `e5d42523`'s own vanilla baseline is 25.53 (standard/baseline). The
`quality` train profile scored WORSE (22.74) than `baseline` (25.53) on the
same capture — profile tuning is a Phase 3 question. Live proof of fixes:
exterior rerun passed the old 45-min death line still processing at 45%; all 3
pose-prior smokes completed with zero SIGABRTs.

**DEFERRED BACKLOG (verified real, scheduled, not blocking):**
- Billing correctness (charge from `input_asset_ids` + persisted quality, not
  worker-reported lists; credit reservation) — touches billing logic, needs
  Brian's explicit authorization like Package C. HIGH priority next slice.
- Share hardening: `max_views` enforced per-asset-route via session grant (both
  bypassable today AND breaks first load at max_views=1); GLB presigned-URL
  lifecycle. One scoped slice.
- Duplicate-job TOCTOU unique index — DESIGN NEEDED: a naive partial unique on
  active capture_id would break the ops A/B flow (parallel experiment runs on
  one capture). Likely: app-level advisory lock exempting service-role ops.
- Native Swift batch (next Codemagic build): client fingerprint on native
  uploads, captureId in failure payloads, apiBase origin allowlist.
- Worker-image hardening: bake `@playcanvas/splat-transform` + COLMAP vocab
  tree into images (no runtime npm/network); pin remaining wheels.
- Exterior reprocess routing (`createReconstructionJob` hardcodes
  gaussian/spz) — folds into Phase 2 merge.
- Upload edge cases: single-upload HeadObject verification, multipart-init
  compensating aborts, sortOrder collision, part-level resume, drone-video
  rejection message, web lidar_poses.json classification, derivative-key
  cleanup on model delete, publish pointer transaction, R2-cleanup lease.
- `lidar_prior_asset_id` honored-or-dropped decision.
