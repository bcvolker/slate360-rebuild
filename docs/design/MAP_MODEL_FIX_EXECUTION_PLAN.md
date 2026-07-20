# Map & Model Fix — Complete Execution Plan

**Purpose:** Step-by-step instructions any AI agent can execute without prior context.  
**Source:** Kimi K3 analysis (2026-07-19) + Slate360 codebase audit.  
**Scope:** All three tracks — Site Walk plan maps, Digital Twin 3D models, ASU ortho/georef.

> **AUDITED 2026-07-19:** This document was checked against the current repository after
> the original Kimi pass. The status labels and execution gates below are authoritative.
> Do not reimplement items marked `CODE PRESENT`, do not reapply `patch_ortho.py`, and do
> not create the obsolete `(session_id, client_pin_id)` index proposed by the first draft.
> A phase is complete only after its acceptance evidence is recorded here.

## AI execution contract

Before editing any phase:

1. Run `git status --short` and preserve all pre-existing user changes.
2. Read every file named by that phase; line numbers are hints, not stable identifiers.
3. Confirm the claimed bug still exists. If current code contradicts the plan, update this
   document before editing production code.
4. Keep backend/persistence changes separate from UI redesigns.
5. Never edit existing migrations. Prepare a new additive migration only when the current
   schema was positively checked and a migration is genuinely missing.
6. Record one of these states for each item: `NEEDS CODE`, `CODE PRESENT / NEEDS TEST`,
   `DEPLOYMENT UNKNOWN`, `VERIFIED`, or `OBSOLETE`.
7. Do not mark mobile work complete without physical-iPhone evidence.
8. Confirm the active capture fork before editing. Production defaults to Capture V2
   (`/site-walk/capture-v2`); legacy V1 (`/site-walk/capture`) remains a rollback path.
   V2 files take precedence unless the task explicitly hardens the rollback path.

---

## Before you start

### Fix Kimi / Moonshot API key (optional but recommended)

If `node .tmp/try-kimi.mjs` returns HTTP 401, check `.env.local`:

```env
MOONSHOT_API_KEY=sk-...   # must start with sk- ONCE — not sk-sk-
MOONSHOT_CHAT_MODEL=kimi-k3
```

Re-run Kimi analysis after fixing:

```powershell
node mcp/kimi-k3/analyze.mjs --focus map_and_models
```

### Deploy rules (memorize)

| Changed path | Redeploy |
|--------------|----------|
| `app/`, `components/`, `lib/` (Next.js) | Git push → Vercel |
| `src/trigger/**` | `PYTHONIOENCODING=utf-8 npx trigger.dev@latest deploy` |
| `workers/modal/**` | `PYTHONIOENCODING=utf-8 python -m modal deploy <worker>.py` |
| `ios/**` | Codemagic TestFlight rebuild |
| Supabase SQL | Brian applies via Management API (additive migrations only) |

### Validation before every push

```powershell
npm run typecheck:changed -- <touched-paths>
npm run build
npm run guard:architecture
npm run guard:design
npm run guard:file-size-regression
```

---

## Issue inventory (all items this plan addresses)

| ID | Track | Priority | Status in code |
|----|-------|----------|----------------|
| BUG-079 | Site Walk plans | P0 | NEEDS CODE — hydration race + no completion refresh |
| BUG-080 | Site Walk capture | P0 | CODE CHANGED — old `captureReady` path no longer exists; regression test required |
| BUG-081 | Site Walk hub | P1 | LIKELY CODE PRESENT — unified MobileShell needs device proof |
| BUG-083 | PWA cache | P0 | NEEDS CODE + IPHONE TEST — production `/sw.js` is still a Vercel cache HIT |
| BUG-086 | Site Walk mobile UX | P2 | Open — coordinated cleanup |
| Plan pin Gap B | Site Walk pins | P0 | PARTIAL — DB index/backfill + PATCH exist; UI fallbacks remain |
| Rasterize polling | Site Walk plans | P0 | REALTIME PRESENT — polling only as measured fallback |
| TWIN-001 | Native capture | P0 | CODE PRESENT — one `ARSession`, per-clip writers; needs TestFlight proof |
| TWIN-002 | Twin pipeline | P0 | NEEDS DATA-CONTRACT AUDIT before code — Trigger still uses `.find()` |
| TWIN-003 | Native capture | P0 | PARTIAL — cap exists but default is 240s and no 68s warning |
| TWIN-004 | Native capture | P0 | PARTIAL — serious warning/critical save exist; no 24fps/system-pressure handling |
| TWIN viewer manifest | Twin viewer | P0 | CODE PRESENT / DEPLOYMENT UNKNOWN |
| TWIN viewer steps 4–6 | Twin viewer | P1 | NEEDS CODE AFTER PHASE 5 — steps 1–3 exist; sphere framing/showcase-field work does not |
| `georef` column empty | Twin map alignment | P1 | Always `{}` in DB |
| ASU ortho patch | ASU survey | P1 | VERIFIED IN CODE + ASU plan says shipped; patch script is obsolete |
| ASU ODM runner | ASU survey | P2 | Optional post-deadline experiment; not a product blocker |
| ASU georef check | ASU survey | P2 | Diagnostic utility only; hardcoded legacy path must be updated before use |
| BUG-021 | Location views | P2 | In progress |

---

## PHASE 0 — PWA cache runtime acceptance (BUG-083) — VERIFY FIRST

**Why first:** iOS standalone PWAs cache the app bundle independently. Until this ships, no Site Walk fix reaches installed devices.

**Audited status: `NEEDS CODE + IPHONE TEST`.** `next.config.ts` already creates a
per-build ID and serves `/sw.js` with no-store headers. `SWRegistrar.tsx` already versions
the registration URL, clears registrations/caches on build change, and reloads. `app/sw.ts`
is an emergency kill-switch that clears caches, claims clients, notifies them, and unregisters.
However, the 2026-07-19 production response at commit
`d8a1241cb9607a439b0cc0948dfa650d59236197` returned:

```text
Cache-Control: public, max-age=0, must-revalidate
X-Vercel-Cache: HIT
Age: 1109
```

The broad `/:path(...)` header rule is overriding the earlier `/sw.js` rule. Fix that
precedence before device testing. Do not add a second version checker.

### Step 0.1 — Verify build ID wiring

- [x] **Code present:** `NEXT_PUBLIC_BUILD_ID`, Vercel commit SHA fallback, and
  `/sw.js?v=${buildId}` registration with `updateViaCache: "none"`.
- [ ] **File:** `next.config.ts`
- [ ] Exclude `sw.js` (and preferably `manifest.webmanifest`) from the broad
  `/:path((?!_next/static|_next/image|favicon).*)` rule, or otherwise ensure the
  dedicated `/sw.js` rule wins after all matching rules are applied.
- [ ] Deploy, then verify:
  ```powershell
  curl.exe -sS -I "https://www.slate360.ai/sw.js?verify=<new-build-id>"
  ```
- [ ] Required response: `Cache-Control: no-cache, no-store, must-revalidate`;
  no positive `Age`; no stale `X-Vercel-Cache: HIT`.

### Step 0.2 — Cache-Control on app shell

- [x] `/sw.js` no-store headers exist in source, but are overridden in production.
- [x] Non-static routes, including the manifest, use `max-age=0, must-revalidate`.
- [ ] Recheck `/manifest.webmanifest` after changing rule precedence.

### Step 0.3 — In-app version mismatch prompt

- [x] Superseded by `SWRegistrar` build-ID comparison and reload.
- [ ] Add user-facing update UI only if iPhone testing proves the automatic reload loops,
  fails, or produces an unacceptable interruption.

### Step 0.4 — Verify

- [ ] Install PWA on iPhone → deploy new version → force-close → reopen
- [ ] Current five-tab platform nav renders; deprecated Site Walk module nav does not return
- [ ] Capture V2/Leaflet bundle is active and `/api/deploy-info` reports the expected commit

**Commands:** `git push origin main`  
**Depends on:** Nothing  
**Blocks:** All Phase 1 mobile verification

---

## PHASE 1 — Site Walk plan maps (BUG-079 + rasterize polling)

**Audited status: `LEGACY V1 NEEDS HYDRATION FIX; V2 REALTIME PRESENT`.** Capture V2
renders Leaflet directly and receives live sheet updates through
`lib/hooks/usePlanSheetsRealtime.ts`. The React-PDF hydration race is real only in the
legacy rollback path. Do not add unconditional polling to both capture stacks.

### Step 1.1 — Fix mobile hydration race (BUG-079)

**Root cause:** `components/site-walk/capture/PlanViewer.tsx` — `useIsMobile()` returns `false` on first render → `PlanViewerPdf` mounts briefly on phone → crash.

- [ ] **Files to edit:**
  - `hooks/use-mobile.ts` — add a new resolved-state API while preserving the existing
    boolean `useIsMobile()` API for other callers
  - `components/site-walk/capture/PlanViewer.tsx` — gate all viewers until mobile state is resolved

- [ ] **Exact change in `PlanViewer.tsx`:**
  ```tsx
  const { isMobile, resolved } = useMobileViewport(); // new API; legacy hook remains boolean
  if (!resolved) return <PlanViewerSkeleton />; // neutral loading, NOT PlanViewerPdf
  const usingLeaflet = isMobile && hasRasterized;
  // Never render PlanViewerPdf when isMobile === true
  ```

- [ ] **Do NOT:** Render `PlanViewerPdf` while `isMobile` is unknown

- [ ] **Deploy:** Vercel only

- [ ] **Verify:** Physical iPhone with real PDF plan → no crash, Leaflet loads when `rasterized_key` exists
- [ ] This hardens legacy rollback; production V2 acceptance remains the release gate.

### Step 1.2 — Add rasterization completion polling

**Original claim:** `PlanViewer.tsx` checks `plan_raster_jobs` once.
**Current reality:** both capture paths receive `site_walk_plan_sheets` updates through
Supabase Realtime, and Trigger writes the rasterized sheet fields. Polling is a fallback
for blocked websockets/offline recovery, not the primary completion mechanism.

- [ ] **Files to edit:**
  - `components/site-walk/capture/PlanViewer.tsx`

- [ ] First verify Realtime publication/auth and run the device test. Only if the plan remains
  stuck after the worker completes, add this fallback:
  - Extract one `refreshRasterState()` that reads the latest job and fetches:
    - `GET /api/site-walk/plan-sets?project_id=...`
    - Merge response into local plan sets / sheets **by `id`**, with the fetched row winning
      over stale props. Do not concatenate duplicate rows.
  - While `jobStatus ∈ {queued, processing}` **and Realtime has failed or timed out**,
    schedule the next refresh after ~4s.
    Use a self-scheduling timeout or guard against overlapping interval requests.
    - Stop polling when any sheet has `rasterized_key != null`
    - Stop on failed/stale/unmount and abort in-flight requests
  - Restart polling after `handleRetryRasterization()` succeeds
  - Keep the existing authenticated GET route; do not query storage directly from the client

- [ ] **Backend note:** `src/trigger/rasterize.ts` already writes `processing_status: ready` + raster keys — no Trigger change needed unless that task is broken

- [ ] **Deploy:** Vercel only

- [ ] **Verify:** Upload plan on mobile → tap Generate → spinner → Leaflet appears without manual refresh

### Step 1.3 — Close BUG-079 in registry

- [ ] **File:** `ops/bug-registry.json` — set BUG-079 status `fixed` after iPhone verification
- [ ] **File:** `ONGOING_ISSUES.md` — update S360-059 if applicable

**Depends on:** Phase 0 (for device verification)  
**Blocks:** Plan walk acceptance testing

---

## PHASE 2 — Site Walk capture markup (BUG-080)

**Audited status: `V2 LIKELY FIXED / LEGACY V1 STILL SERVER-GATED`.** The old
`captureReady` expression does not exist. Capture V2 creates an optimistic
`activePreview` before persistence. The legacy bottom sheet still disables its vector
toolbar from a server-hydrated item. Do not reintroduce readiness logic into
`VisualCaptureView`.

### Step 2.1 — Regression verification

- [ ] Test camera capture and camera-roll upload with network throttled/offline.
- [ ] Confirm `activePreview` renders immediately and markup controls work before the saved
  item refetch finishes.
- [ ] Confirm markup callbacks have a valid item ID; if the preview uses a temporary ID,
  queue markup until the persisted ID is returned rather than inventing another readiness flag.
- [ ] If production V2 fails, trace `useCaptureFileHandler` → optimistic preview →
  `NoPlansCaptureCanvas` markup rail.
- [ ] If legacy rollback must be fixed, update `CaptureDataBottomSheet.tsx` /
  `CaptureSheetUtilityPanel.tsx` to gate on preview/client identity rather than server `item`.
- [ ] Only edit the path that reproduces the failure.

---

## PHASE 3 — Plan pin lifecycle (Gap B + DB constraint)

**Audited status: `PARTIAL`.** The PATCH route already accepts `{x_pct, y_pct}`.
Existing migrations already create `uniq_sw_pins_client_pin_id` on
`(org_id, created_by, client_pin_id)` and backfill legacy null IDs. Do not create a
second `(session_id, client_pin_id)` index without a demonstrated data-model requirement.

### Step 3.1 — Remove dangerous pin ID fallbacks

**Root cause:** `client_pin_id ?? pin.id` causes duplicate pins when server UUID replaces client ID.

- [ ] **Files to edit:**
  - `components/site-walk/capture/PlanViewerLeaflet.tsx` (lines ~231, ~280)
  - `components/capture-v2/plan-canvas/useWithPlansPinCapture.ts` (line ~145)
  - `components/site-walk/capture/PlanViewerPdf.tsx` (if still used on desktop)

- [ ] **Exact change:** First tighten the mapped `PlanViewerPin` contract so
  `client_pin_id` is always a string (server rows are backfilled; local rows mint at creation).
  Then replace UI fallback keys/targets with the non-null client ID. Fail visibly in development
  if a malformed row appears; do not silently create a second identity.

- [ ] **Deploy:** Vercel

### Step 3.2 — Verify PATCH pin route exists

- [x] `app/api/site-walk/pins/[id]/route.ts` validates and accepts `{x_pct, y_pct}`.
- [x] `usePlanViewerLeafletPins.ts` calls PATCH and reverts the optimistic move on failure.
- [ ] Security regression test: a user cannot move a pin outside their organization.

### Step 3.3 — DB unique constraint (additive migration)

- [x] Existing migration:
  `20260427092000_site_walk_offline_capture_idempotency.sql`.
- [x] Existing legacy backfill:
  `20260613160000_site_walk_pin_client_id_backfill.sql`.
- [ ] Check production migration history before assuming these migrations were applied.
- [ ] **Do not add another index unless production inspection proves the existing one absent
  or the idempotency scope incorrect.**

- [ ] **Verify:** Offline pin drop → flush → exactly one pin, same `client_pin_id` (proof test in `PLAN_PIN_ID_LIFECYCLE.md`)

**Depends on:** Phase 1 (plan viewer stable)  
**Deploy:** Vercel + Supabase migration

---

## PHASE 4 — Site Walk hub & mobile UX (BUG-081, BUG-086)

### Step 4.1 — Hub list overflow (BUG-081)

**Audited status: `LIKELY CODE PRESENT / NEEDS DEVICE TEST`.** The hub now runs inside
`MobileShell`/`MobilePlatformShell` with a bounded viewport and scroll region; the old
unbounded `SiteWalkShell` diagnosis is stale.

- [ ] Verify the expanded Recent Walks dock on the smallest supported iPhone.
- [ ] Confirm the last row remains visible above the safe-area bottom navigation.
- [ ] If it passes, update BUG-081 rather than applying the old one-line shell fix.

### Step 4.2 — Mobile UX cleanup (BUG-086) — P2, multi-step

Follow decision record referenced in bug registry. Do NOT mix with backend fixes.

- [ ] **Read first:** `docs/design/SLATE360_V1_DESIGN_TOKEN_PLAN.md`
- [ ] **Deliverables checklist (from BUG-086 verification):**
  - [ ] Site Walk Home = command center, no duplicate module nav
  - [ ] Walk rows: Rename, Duplicate, Link Project, Create Deliverable, Archive, Delete
  - [ ] Shared CaptureShell for Quick Walk + Plan Walk
  - [ ] Plan viewer: bottom tools drawer (Sheets, Search, Pins, Layers)
  - [ ] Markup: 44px targets, compact, no content overlap
  - [ ] Draft pins draggable; saved pins locked unless Edit Location mode
  - [ ] Before/After guided recapture; Ghost only during alignment

**Depends on:** Phases 1–3 stable  
**Priority:** P2 — do after P0 map/capture fixes

---

## PHASE 5 — Digital Twin Modal worker deploy (TWIN viewer manifest)

**Audited status: `CODE PRESENT / DEPLOYED APP LIKELY STALE`.** The worker computes and uploads
the sibling manifest. Authenticated/share manifest routes, manifest fetch, correction quaternion,
PCA fallback, and manifest-first overview framing are present. The callback does not need to
persist `manifestKey` because routes derive it from the `.spz` storage key.
Modal authentication is available (`bcvolker`) and `modal app list` shows the twin app
deployed. Repository history places major worker changes after the old twin app deployment,
so inspect app history and expect to redeploy before the verification reprocess.

### Step 5.1 — Deploy twin Gaussian splat worker

**Do not assume it is undeployed. Prove the running revision first.**

- [ ] **Commands:**
  ```powershell
  cd workers/modal/twin-gaussian-splat
  PYTHONIOENCODING=utf-8 python -m modal profile current   # expect: bcvolker
  PYTHONIOENCODING=utf-8 python -m modal deploy worker.py
  ```

- [ ] **Verify endpoint:** `MODAL_TWIN_ENDPOINT` in `.env.local` matches deployed URL label `reconstruct`
- [ ] Inspect a newly completed model's sibling `.manifest.json` in R2. If present and its
  schema includes bounds/quaternion/camera, the worker path is already live.
- [ ] Deploy only if runtime evidence shows the worker is stale.

### Step 5.2 — Redeploy Trigger (if endpoint changed)

- [ ] **Commands:**
  ```powershell
  PYTHONIOENCODING=utf-8 npx trigger.dev@latest deploy
  ```

- [ ] **Why:** Trigger reads `MODAL_TWIN_ENDPOINT` at deploy time from `.env.local`

### Step 5.3 — Reprocess one verification twin

- [ ] Trigger reprocess on an existing capture via app UI or API
- [ ] **Verify callback writes:** `model.spz` + `.manifest.json` sibling in R2
- [ ] **Verify viewer:** `components/digital-twin/SplatViewer.tsx` loads manifest, splat centered/upright

### Step 5.4 — Legacy twin PCA fallback

- [ ] Load a twin processed BEFORE manifest deploy
- [x] Fallback implementation exists in `lib/digital-twin/splat-pca-orientation.ts`.
- [ ] Verify it corrects a known legacy twin without rotating a known-good model.

**Depends on:** Nothing (can parallel Phase 1)  
**Blocks:** Phase 7 viewer work

---

## PHASE 6 — Multi-clip LiDAR dispatch (TWIN-002)

**Audited status: `NEEDS CONTRACT AUDIT BEFORE CODE`.** Trigger uses `.find()`, but the
current native capture appears to export one accumulated PLY and one poses JSON for all clips
in a single ARSession, plus multiple videos. In that current shape, `.find()` is not itself
dropping per-clip LiDAR. Do not invent array payloads until real capture rows prove multiple
`ply_lidar`/`lidar_poses` assets exist per job.

### Step 6.0 — Establish the real asset contract

- [ ] Query one single-clip and one multi-clip capture's `digital_twin_capture_assets`
  rows (IDs, kinds, metadata, storage keys).
- [ ] Record whether native upload produces:
  - one accumulated PLY + one poses JSON + N videos (current Swift design), or
  - N PLY/poses pairs with session/segment metadata.
- [ ] If the first shape is confirmed, keep singular worker fields and change the task ledger:
  TWIN-002 is obsolete for native captures.
- [ ] If the second shape exists, add explicit `arSessionId`, `segmentIndex`, and pairing metadata
  to the asset query/payload before changing `.find()` to `.filter()`.

### Step 6.1 — Trigger: pass arrays not singletons

- [ ] **File:** `src/trigger/twin-gaussian-splat.ts`
- [ ] **Change lines ~80–81:**
  ```typescript
  // BEFORE:
  const posesAsset = allReadyAssets.find((row) => row.asset_kind === "lidar_poses");
  const plyAsset = allReadyAssets.find((row) => row.asset_kind === "ply_lidar");

  // AFTER:
  const posesAssets = allReadyAssets.filter((row) => row.asset_kind === "lidar_poses");
  const plyAssets = allReadyAssets.filter((row) => row.asset_kind === "ply_lidar");
  ```
- [ ] **Conditional on Step 6.0 proving arrays are needed:** pass paired segment records,
  not two uncorrelated string arrays. Keep singular fields during rollout.

### Step 6.2 — Modal worker: merge same-session clips

- [ ] **File:** `workers/modal/twin-gaussian-splat/worker.py`
- [ ] **Logic:**
  - Accept array keys
  - Merge PLY/poses only when same `arSessionId`
  - Else: single-best + log `lidar_merge_mode`
  - Keep backward compat with singular `lidarPosesKey`/`lidarPlyKey`

### Step 6.3 — Deploy order (critical)

1. [ ] Deploy Modal worker first (accepts both shapes)
2. [ ] Deploy Trigger second
3. [ ] Reprocess multi-clip capture
4. [ ] Verify logs show all clips received, not just first

**Depends on:** Phase 5 (worker deploy infrastructure proven)  
**Blocks:** Multi-clip twin quality

---

## PHASE 7 — Native iOS capture (TWIN-001, TWIN-003, TWIN-004)

**Track:** Native Swift — requires TestFlight, NOT Vercel.

### Step 7.1 — TWIN-001: Single ARSession segment model

- [x] `TwinARKitCaptureViewController` keeps one `ARSession` and rolls a writer per clip.
- [x] Poses JSON includes per-clip index/video/start/duration in one shared session.
- [ ] TestFlight proof: capture 3 clips, verify continuous world frame and all videos in upload.
- [ ] Add explicit session identifiers only if Step 6.0 shows the server cannot pair assets safely.
- [ ] **Read:** `docs/design/LIDAR_NATIVE_CAPTURE_BUILD_PLAN.md`

### Step 7.2 — TWIN-003: Clip cap

- [x] Per-clip auto-finalization exists in `TwinARKitCaptureViewController`.
- [ ] Change the production/default cap from 240s to the approved 120s.
- [ ] Add a one-time soft warning near 68–90s.
- [ ] Verify auto-finalization keeps the ARSession alive and preserves the segment.

### Step 7.3 — TWIN-004: Thermal governor

- [x] `.serious` warning and `.critical` save/finalize exist.
- [ ] Add actual 24fps throttling at `.serious` (current code continues ~30fps).
- [ ] Add `systemPressureState` handling or document why ARKit does not expose a safe control path.
- [ ] Verify configuration does not enable unused plane detection/reconstruction.

### Step 7.4 — TestFlight

- [ ] Codemagic build → TestFlight → Brian iPhone verification

**Depends on:** Phase 6 for end-to-end multi-clip quality  
**Priority:** P0 for TestFlight release

---

## PHASE 8 — Twin viewer improvements (TWIN_VIEWER_FIX steps 4–6)

**Audited status: `STEPS 1–3 PRESENT; STEPS 4–6 NEED CODE`.** Do not rebuild the
manifest/PCA/group orientation path. The current viewer awaits the manifest, applies its
quaternion to a parent group, falls back to PCA, and uses manifest camera/bounds. The
specified bounding-sphere fallback and showcase/field product modes remain unfinished.

### Step 8.1 — Bounding-sphere framing

- [x] Manifest-first overview-home framing exists.
- [ ] Verify current worker core bounds/camera against known interior and exterior models.
- [ ] Do not blindly change client fallback from 2–98 to 1–99; the worker and viewer must use
  a documented common contract, and worker-baked framing is authoritative for new models.

### Step 8.2 — Controls cluster + showcase/field modes

- [ ] **Read:** `docs/specs/TWIN_VIEWER_FIX.md` sections 4–6
- [ ] Compare the old spec with current `TwinViewerControlsOverlay`, overview/walk navigation,
  authenticated viewer, share viewer, and desktop viewport.
- [ ] Implement only acceptance criteria that are still absent.
- [ ] Verify via the approved preview harness and one real SPZ model.

### Step 8.3 — Populate `georef` column (P1)

- [ ] **Files:** `lib/twin/job-callback.ts`, worker callback schema, native poses export
- [ ] Native GPS currently lives in `lidar_poses.json` keyframes and is not reliably copied
  into capture metadata. Choose one authoritative flow:
  - worker derives georef from poses and returns it in the signed callback, or
  - callback reads the trusted poses asset from R2 and derives it server-side.
- [ ] Validate coordinates/accuracy/heading before writing `digital_twin_models.georef`;
  do not populate it from absent or placeholder capture metadata.
- [ ] **Migration:** Additive column already exists — no schema change needed

**Depends on:** Phase 5 manifest path proven

---

## PHASE 9 — ASU ortho / georef / ODM (Track 3)

**Context:** CEO thermal survey — Modal app `slate360-photogrammetry`, volume `asu-rgb-flights`. Separate from Site Walk and Twin app UI.

### Step 9.1 — Confirm shipped ortho quality pass (do not reapply)

- [x] **Already applied. Do not run `patch_ortho.py` again**; its anchor targets the old
  implementation and should fail.
- [x] `worker.py` contains TOP-N, DEM fill, RGB fill and median filtering.
- [x] `ASU_DELIVERY_PLAN.md` records v3 at 0.04% deck void and shipped viewer assets.
- [ ] Preserve `patch_ortho.py` only as historical evidence or archive it after approval.

### Step 9.2 — ODM runner fix (post-deadline benchmark)

- [ ] **File:** `workers/modal/photogrammetry/odm_runner.py` (modified, uncommitted)
- [ ] **Fix:** Use `/usr/bin/python3` with `/usr/bin` first on PATH (Modal `add_python` shadows ODM deps)
- [x] Modal lists `slate360-odm` and later ODM-related apps as deployed; deployment
  existence alone does not prove a successful output or that the local uncommitted fix is live.
- [ ] **Deploy only after the working-tree PATH fix is reviewed/committed:**
  ```powershell
  PYTHONIOENCODING=utf-8 python -m modal deploy odm_runner.py
  ```
- [ ] Run `odm_runner.py::diag` first. Benchmark at 2 cm before attempting the prior
  1 cm/high-quality configuration, which exceeded the 23-hour deadline.
- [ ] **Run benchmark:**
  ```powershell
  PYTHONIOENCODING=utf-8 python -m modal run --detach odm_runner.py::run_odm
  ```
- [ ] **Note:** ODM is an optional post-deadline experiment, not a fix required for the
  already-shipped ASU viewer. Run only with a defined product question, timeout budget,
  output acceptance gate, and cleanup plan.

### Step 9.3 — Georef validation utility

- [ ] **File:** `workers/modal/photogrammetry/georef_app.py` (untracked)
- [ ] **Deploy:**
  ```powershell
  PYTHONIOENCODING=utf-8 python -m modal deploy georef_app.py
  ```
- [ ] **Run:**
  ```powershell
  PYTHONIOENCODING=utf-8 python -m modal run georef_app.py::georef
  ```
- [ ] Update the utility to accept an explicit NPZ path. Its hardcoded
  `/data/work/ortho/dem.npz` is older than the shipped `dem_v3.npz` / true-ortho path.
- [ ] Validate GSD, origin, shape, finite coverage, and the formal tie-point RMSE—not merely
  that the file can be opened.

### Step 9.4 — COLMAP stats utility

- [ ] **File:** `workers/modal/photogrammetry/stats_app.py`
- [ ] **Deploy + run** `colmap model_analyzer` on sparse model for QA

### Step 9.5 — Wire thermal overlay map (if not already)

**OBSOLETE / WRONG SURFACE.** `ThermalTwinOverlayMap.tsx` is the private Thermal Studio
GPS-pin MVP, not the ASU ENU ortho/thermal wipe viewer.

- [ ] Keep ASU acceptance in `C:\ASU-Survey\viewer\` and its generated deliverable.
- [ ] Remaining delivery checks: host the share link, Brian's wipe eye-pass, and formal
  tie-point RMSE.
- [ ] Treat splat/OpenMVS/ODM as post-deadline 3D upgrades, not prerequisites for the
  already-shipped ortho/thermal/report deliverable.

**Depends on:** Modal credentials on deploy machine  
**Priority:** P1 for ASU delivery; does not block Site Walk app store release

---

## PHASE 10 — Location consistency (BUG-021) — P2

- [ ] **Files:** Shared `LocationDisplay` component, `resolveProjectLocation` helper
- [ ] **Verify:** Dashboard, Project Hub, wizard all render same location format
- [ ] **grep:** `grep -r resolveProjectLocation components/ lib/`

---

## Master ship order

```
Phase 0  PWA runtime acceptance  → inspect prod + physical iPhone; code already present
Phase 1  V2 realtime/device gate → legacy hydration fix; polling only if Realtime fails
Phase 2  Markup regression test  → V2 likely fixed; legacy sheet only if rollback supported
Phase 3  Pin UI contract cleanup → Vercel; DB migration only if production proves missing
Phase 5  Twin runtime audit      → deploy Modal/Trigger only if stale
Phase 6  Asset-contract audit    → then decide whether TWIN-002 still exists
Phase 7  Remaining native gaps   → TestFlight (001 present; finish 003/004)
Phase 8  Viewer steps 4–6        → preserve existing steps 1–3; add remaining modes/framing
Phase 9  ASU acceptance/optional → host/QC remaining; ortho shipped; ODM optional
Phase 4  Hub/mobile UX cleanup   → Vercel (P2, after P0 stable)
Phase 10 Location consistency    → Vercel (P2)
```

---

## Verification matrix (agent checklist)

| Phase | Test | Pass criteria |
|-------|------|---------------|
| 0 | iOS PWA reload | New build ID, 4-tab nav, no Plans tab |
| 1 | Mobile plan PDF | No crash; Leaflet after rasterize |
| 1 | Rasterize poll | Auto-transition without manual refresh |
| 2 | Capture markup | Tools visible before server fetch |
| 3 | Offline pin | One pin after flush, no duplicates |
| 5 | Twin reprocess | `.manifest.json` in R2, viewer centered |
| 6 | Multi-clip | All LiDAR assets in worker logs |
| 7 | TestFlight | 120s cap, thermal throttle, single ARSession |
| 9 | ASU ortho | Deck void < 1%, georef origin logged |

---

## For AI agents — execution protocol

1. **Read this plan top to bottom** before editing any file.
2. **Execute one phase at a time** in ship order unless explicitly parallelized above.
3. **Never `git add .`** — stage explicit paths only.
4. **Never edit:** entitlements, billing, Stripe, middleware, existing migrations.
5. **Keep UI files under 300 lines** — extract if approaching 250.
6. **After each phase:** run Tier A validation. Commit and push only when explicitly requested
   in the active chat; use explicit paths and never `git add .`.
7. **iPhone verification is final acceptance** for Site Walk phases — sandbox cannot substitute.
8. **Re-run Kimi analysis** after major phases:
   ```powershell
   node mcp/kimi-k3/analyze.mjs --focus map
   node mcp/kimi-k3/analyze.mjs --focus model
   ```

---

## Re-run full Kimi K3 analysis (when API key fixed)

```powershell
# Fix MOONSHOT_API_KEY in .env.local first (remove sk-sk- double prefix)
node .tmp/try-kimi.mjs "Reply KIMI_OK"

# Full exhaustive plan refresh
node mcp/kimi-k3/analyze.mjs --focus map_and_models --question "Re-validate this execution plan against current code and list any gaps"

# Or in Cursor Agent (after MCP restart):
# "Use analyze_map_and_models to verify Phase N is complete"
```

---

*Generated 2026-07-19. Repository-audited 2026-07-19 against current Site Walk,
Digital Twin, native iOS, Modal photogrammetry, migrations, and PWA code. Update this
document with runtime/device evidence as phases complete.*
