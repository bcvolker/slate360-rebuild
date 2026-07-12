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
