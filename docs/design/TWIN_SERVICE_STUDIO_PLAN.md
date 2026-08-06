# Twin Professional Service — Studio, Client Portal & Delivery Build Plan (LOCKED)

**Status:** LOCKED — authoritative execution plan for the twin professional-service offering.
**Date:** 2026-08-05 · **Owner:** Brian · **Authored from:** five-agent repo audit (worker,
schema, viewer/share, capture/upload, docs) reconciled with a 4-AI panel review.
**Relationship to other docs:** `TWIN360_WORKFLOW_REBUILD_SONNET5.md` §7 remains the live
*pipeline* ledger (quality runs, A/B verdicts). This doc owns the *service/product* build:
delivery fixes, operator studio, client portal, assistant, exports, pinned attachments.
`TWIN360_CAPTURE_SOP.md` remains the canonical field SOP. `TWIN360_PIPELINE_V2_*` remain the
pipeline architecture decisions. `TWIN_SERVICE_BUSINESS_CONTEXT.md` captures the service-first
repositioning context (why this plan matters commercially — no execution scheduled from it yet).
`TWIN_SERVICE_VIEWER_REFERENCE.md` preserves a reusable measurement/annotation/360-pin viewer
build prompt for later reference (not scheduled into a phase).

## PROGRESS TRACKER — update after every completed slice

**28 core slices across 8 phases (B4 is optional, not counted in the denominator).**

| Phase | Slices | Done | Status |
|---|---|---|---|
| A′ — Delivery unlock | A1, A2, A4 | 3/3 | ✅ COMPLETE — shipped, live on Vercel prod + TestFlight |
| B — Quality A/Bs | B1, B2, B3 (+B4 opt) | 2/3 | 🟨 B1 + B3 shipped (Fable: sharpness selection + verified 110×94 FOV, deployed); B2 = EXT-FIX shipped (memory + mesh_simplifier decimation + capped-res texture retry, deployed) — counts as done when the live rerun (job a2fbc907) completes |
| C — Depth supervision | C1, C2, C3 | 0/3 | ⬜ blocked on nothing new; awaits B/gate bandwidth |
| D — Version/history schema | D1, D2, D3 | 0/3 | ⬜ not started |
| F — Operator Twin Studio tab | F1, F2, F3, F4, F5 | 0/5 | ⬜ not started |
| G — Client portal | G1, G2, G3, G4, G5 | 0/5 | ⬜ not started |
| H — AI assistant | H1, H2, H3 | 0/3 | ⬜ not started (needs F3 for real geometry) |
| E — Polish | E1 (bake), E2 (cinematic capture+correction), E3 (camera-path playback) | 0/3 | ⬜ not started |
| **TOTAL** | **28 core** | **6/28** | **≈21%** |

**Verification runs in flight (2026-08-06, non-publishing — R7.5 visual gate = Brian):**
- Job `13934822` — B1 arm check, `trainProfile: visual` on capture `e5d42523` (baselines: vanilla 25.53, quality 22.74)
- Job `b1736f75` — B3 check, kitchen raw-`.insv` capture `f5f85030` on the new 360 path (baseline 17.22)
- Job `a2fbc907` — EXT-FIX check, exterior capture `b98d2165` (380 drone photos; 5 prior consecutive failures)

**Executor notes for what's done:** A1/A2/A4/B1 were all Sonnet-5-safe per §6 and executed on
Sonnet 5. B1's mechanism was verified live: dispatched a `trainProfile: visual` reprocess on
capture `e5d42523` via `scripts/ops/dispatch-twin-experiment.mjs` (job `13934822…`, non-
publishing) — result pending in `docs/design/TWIN360_WORKFLOW_REBUILD_SONNET5.md` §7 once
Brian reviews it. **Confirmed gap found in the process:** there is currently no UI to preview a
non-primary model version without publishing it (`TwinVersionsPanel` has no preview action) —
sharpens Phase D's scope. **B2 re-scoped** (see table) — blocked on live exterior-pipeline bugs,
not a simple dispatch.

**Fable-5 heads-up:** B3 (360 masking/lens-calibration/sharpness-selection — real worker.py
coordinate-math authoring, not dispatch) is the next slice that matches this doc's own "keep on
Opus/Fable-class" guidance (§6) — flag to Brian before starting it. Same applies to all of
Phase C (depth-loss trainer), the re-scoped B2's exterior-pipeline debugging, and any future
Modal worker math.

---

## 0. Ground rules (non-negotiable, inherited from the ledger)

1. **Vanilla COLMAP + splatfacto stays the promoted default.** The pose-prior arm A/B is
   **CLOSED — DO NOT PROMOTE** (18.26 vs vanilla 25.53). Revivable only as a research arm
   with a build-time-baked vocab tree + tuned prior weights.
2. **The 28.97 recipe is the hero SKU**: iPhone+LiDAR SOP walk, one ARSession, ≤2 min clips,
   `align_backend=colmap_vanilla`, `trainProfile` null/baseline, LiDAR poses present so
   metric scale + measured gravity land, A3 floater cull.
3. **Every pipeline change ships as an A/B arm; promotion requires the human R7.5 visual
   gate** (open the share link, look). Metrics-only promotion has shipped a regression before.
4. **License bans stand**: no CC-BY-NC weights (VGGT/DUSt3R/MASt3R/StreamVGGT), no
   Inria-dependency mesh tools, no ODM/AGPL, no Magic Leap SuperPoint. Verify every
   flag/version/license against upstream source — a GitHub badge is not a license audit.
5. **Accuracy language is locked**: estimating-grade, ±2–5 cm typical at room scale, never
   survey/permit-grade; verify fabrication-critical dimensions with a laser. No metric scale
   ⇒ no absolute numbers (ratios only). Every client-visible number carries this posture.
6. **Interior ‖ Exterior stays federated.** Drone photogrammetry is a separate deliverable
   (`photogrammetry_mesh` → GLB). Never silently merge; a future join is an explicit Sim3
   with a displayed residual (Phase 6 federation, months out, unpromised).
7. Repo conventions: additive migrations only; explicit-path staging (never `git add .`);
   tokens not hex; scoped-tsconfig typecheck; guard scripts before push; Modal web-image
   workers keep top-level imports to stdlib+modal.

## 1. Reuse inventory — screens are rebuilt, machinery is kept

The existing twin *screens* are superseded by this plan. The following are **kept as
components/APIs** and must not be rebuilt:

| Keep | Where | Feeds |
|---|---|---|
| Spark viewer core (orientation correction, walk mode, mobile safe areas, context-loss recovery, downsample) | `components/digital-twin/splat-viewer-core.tsx`, `splat-viewer-scene.tsx`, `splat-overview-navigation.tsx`, `splat-interior-navigation.tsx` | Studio + portal viewing surface |
| Share token system (atomic view-claim RPC, roles, rate limits, token-scoped streaming, publish gate) | `lib/digital-twin/share-token.ts`, `app/api/share/twin/[token]/**`, `app/share/twin/[token]/page.tsx` | Portal access layer |
| Model versioning + publish loop | `digital_twin_models`, `app/api/digital-twin/spaces/[spaceId]/models/route.ts`, `models/[modelId]/publish` | Historical documentation timeline |
| Editor internals (`edit_list` SDF ops) | `components/digital-twin/desktop/DesktopSplatEditor.tsx`, `lib/digital-twin/splat-edit-runtime.ts`, `edit-list-types.ts` | Studio Clean tab |
| Branding pattern | `digital_twin_share_tokens.branding_snapshot` (schema) + thermal implementation `app/share/thermal/[token]/page.tsx` | White-label re-share |
| SlateDrop bridge (every capture asset mirrored per-project) | `app/api/digital-twin/upload/complete/route.ts` → unified files/SlateDrop | Raw-data export |
| Dormant geometry engines — vector floor plan / DXF / SVG / areas; door/window subtraction | `workers/modal/twin-gaussian-splat/floorplan.py` (422 lines, tested), `openings.py` (277 lines, tested) — **currently unwired** | Plan tab, sqft, assistant tools |
| Desktop shell + workspace grammar | `components/dashboard-desktop/**` | Studio tab chrome |
| Orphaned desktop routes (editor/cinematic/progression) | `app/digital-twin/(shell)/twins/[id]/{editor,cinematic,progression}/page.tsx` (URL-only today) | Studio rooms |
| Native capture + resumable background upload | `ios/App/App/Plugins/LiDARCapture/**` | Field capture (untouched by this plan) |

## 2. Phase plan

“Prompt” = one build-and-push slice. Executor column: see §6 (Sonnet-5 delegation).

### Phase A′ — Delivery unlock (3–4 prompts) → **service can launch after this**

| Slice | Work | Files | Executor |
|---|---|---|---|
| A1 | Apply `edit_list` in the shared viewer core: thread through `SplatViewerCore` → `splat-viewer-scene.tsx` `onLoad` (call `applyEditListToMesh`), serve edit_list via the share manifest/model routes so `/share/twin/[token]`, mobile, cinematic and compare all show cleaned models | `components/digital-twin/splat-viewer-core.tsx`, `splat-viewer-scene.tsx`, `lib/digital-twin/splat-edit-runtime.ts`, `app/api/share/twin/[token]/manifest/route.ts` | Sonnet 5 |
| A2 | Render `TwinSceneOverlays` (pins + measurement lines) on the share stage; add a 3D distance label (drei `Html`/billboard); list measurements in the share sheet | `components/digital-twin/TwinShareAnnotateViewerStage.tsx`, `TwinSceneOverlays.tsx`, `TwinShareActivitySheet.tsx` | Sonnet 5 |
| A4 | Field bugs: `.gz` suffix defeats LiDAR chip regexes (`LIDAR_RE`/`LIDAR_POSES_RE`) so native LiDAR files mislabel as Phone; native uploader never sends `clientFingerprint` (triplicate fix gap) | `lib/digital-twin/twin-source-chip.ts:26-27`, `ios/App/App/Plugins/LiDARCapture/TwinUploader.swift` (+ TestFlight note) | Sonnet 5 (web) / careful review (Swift) |

(A3 share-management is folded into F4.)

### Phase B — Quality A/Bs on existing data (5–7 prompts, parallel; GPU runs + human visual gate)

| Slice | Work |
|---|---|
| B1 | Send `trainProfile` per-arm from `src/trigger/twin-gaussian-splat.ts`; run the P0c free-flag A/B (bilateral grid first) with the R7.5 visual gate |
| B2 | **RE-SCOPED 2026-08-06, was not actually dispatch-ready.** `texture_workspace()` (`workers/modal/photogrammetry/worker.py:333`, CPU-only, code-complete) targets a persistent Modal `Volume` (`/data`) — but the LIVE exterior pipeline (`twin.photogrammetry_mesh` → `product_worker.py`, the app Trigger actually calls) uses **ephemeral per-job `/tmp/exterior-job-{id}/` workspaces**, not that volume. There is currently no populated `/data` workspace to point `texture_workspace()` at. Separately (found while checking): **all 5 most recent real exterior jobs failed** — the two most recent on `colmap mesh_texturer` crashing (`Command failed (-6)`, SIGABRT) on `mesh_raw.ply`, matching the known Poisson-mesher-on-aerial-scenes fragility noted in the pipeline ledger (`delaunay_mesher` was supposed to be primary with Poisson as a trimmed fallback — worth checking whether that fix reached `product_worker.py` or only the research file). **B2 as originally scoped is blocked until the live exterior pipeline itself is debugged** — that's real worker.py-level troubleshooting, not a dispatch, and belongs with the other Fable-class pipeline work. + M0 memory profile |
| B3 | 360 trio: operator/nadir sector skip during unwrap → real reprojected mask via COLMAP `--ImageReader.mask_path`; per-unit lens calibration (replace ih_fov/iv_fov=190 approximation); route 360 frames through `extract_sharp_frames` instead of flat 0.5 fps |
| B4 (opt) | PLY-seed A/B arm on the vanilla path (patch `ply_file_path` into transforms.json post-`ns-process-data`; plumbing exists on the dormant bypass path) |

Executor: pipeline edits Opus/Fable-class; dispatch/eval mechanics Sonnet-able. Promotion = Brian.

### Phase C — Depth supervision (4–6 prompts, weeks; the long pole)

C1 finish Codemagic iOS build (xcodebuild exit 65, partially fixed) → TestFlight → real
`.s360depth` captures. C2 vendored gsplat trainer (`simple_trainer.py`), `init_type=lidar`,
`render_mode="RGB+ED"` depth loss, MCMC — as a `trainBackend` arm. C3 A/B + visual gate.
Executor: Opus/Fable-class only (coordinate conventions, loss design).

### Phase D — Version/history schema (2–3 prompts; **moved up** — G1 depends on it)

| Slice | Work |
|---|---|
| D1 | Additive migration: `digital_twin_models.version_label`, `notes`, `captured_at`, `parent_model_id`; pin/measurement lineage (`pin_series_id`, `corresponds_to_measurement_id`); change measurement/pin `model_id` FK from `ON DELETE CASCADE` → `SET NULL`; **`digital_twin_pin_attachments` table (§4)**. Brian applies via Supabase Management API. |
| D2 | Camera-synced progression compare (one control source driving both canvases) + surface the progression route in nav |
| D3 (later) | Progression video export (aligned cross-fade along a shared camera path) — the marketed progress artifact. Never promise volumetric diffing (research-grade). |

### Phase F — Operator Twin Studio tab (6–8 prompts)

A tabbed workspace inside the desktop dashboard shell (the locked D1 shape):
**Produce / Clean / Plan / Deliver**. Graphite Glass, Twin blue accent, no-scroll workspaces.

| Slice | Work | Notes |
|---|---|---|
| F1 | Studio shell + nav wiring + Produce board: spaces list, capture/job pipeline status (reuse `useTwinJobRealtime`), quality metrics per model, reprocess + A/B-arm dispatch controls | Wire the orphaned routes; delete `DesktopWorkspaceLinks.tsx` orphan |
| F2 | Clean tab: embed `DesktopSplatEditor`; fix editor-vs-viewer parity (same splat budget + `lod:false` as viewers); real splat raycast for op placement | Undo/redo + gizmos deferred to Phase E |
| F3 | Plan tab: wire `floorplan.py` + `openings.py` into the worker export stage (mount in `add_local_python_source`, emit SVG/DXF + areas JSON derivative); UI renders floor plan, floor sqft, gross/net wall areas with per-value confidence + locked disclaimer | Openings numbers ship only after tape-measure validation on ≥3 real LiDAR twins |
| F4 | Deliver tab (absorbs A3): share-link management (create with expiry/max-views, list, revoke), branding snapshot + org logo (copy thermal pattern), fix `max_views` per-asset-route bypass + `max_views=1` first-load bug, optionally wire dead `password_hash`; exports panel (§5) | |
| F5 | **Non-destructive clip trim at review**: per-video in/out points set on the Review & Sources screen (scrubber + thumbnails), stored as `trim_ranges` metadata on the asset (or job payload), applied by the worker as ffmpeg `-ss/-to` **at frame extraction** — the raw file is never re-encoded or modified (evidentiary rule). Applies to 360, drone and phone video alike. Worker: `extract_sharp_frames` / `extract_equirect_video_frames` gain a time-window param. | Replaces any client-side trimming; iPhone native clips keep the no-trim decision (trimming destroys solve overlap) but gain the same in/out metadata if a clip has junk head/tail |

### Phase G — Client portal (5–7 prompts)

Authenticated portal for client orgs (not just anonymous tokens), wrapping the share viewer.
Desktop = full-featured; mobile = lightweight (viewer + pins + history; no management).

| Slice | Work |
|---|---|
| G1 | Portal shell + model-history timeline (documentation view over `digital_twin_models` versions with D1 labels/notes/captured_at) + per-version open |
| G2 | Exports: raw capture assets (via SlateDrop bridge), `.spz`/`.ply`, floorplan SVG/DXF, areas JSON — role-gated (`download`), all token/auth-scoped streaming, never raw R2 URLs |
| G3 | Client-managed re-sharing with **their** branding: portal UI to mint share tokens with client `branding_snapshot` (logo/name), scoped to models shared with them |
| G4 | Mobile-light pass: navigation slimming; viewer is already mobile-tuned |
| G5 | Pinned attachments UX on portal + shares (§4 rendering/opening) |

### Phase H — AI assistant (3–4 prompts; after F3, which gives it geometry)

Server route → Claude API (Sonnet default, Haiku for cheap turns), **tool-calling only over
deterministic data** — never vision-guessing geometry:
tools = measurements CRUD/query, floorplan polygons + openings areas, model metadata/versions,
pins + attachments, quality-metrics explain; operator-only tools = reprocess/dispatch.
- H1: assistant API route + tool layer over existing endpoints; metering against org credits;
  hard guardrails (no absolute numbers when `metric_scale_applied=false`; locked disclaimer
  stamped by the tools, not the model).
- H2: Studio chat panel (full toolset, owner-gated).
- H3: Portal chat panel (scoped toolset: their models only, Q&A + export help; per-org toggle,
  rate-limited, credit-metered).

### Phase E — Polish (3–4 prompts, when core is boring)

Bake-to-SPZ job (D2 of the old plan: apply `edit_list` destructively → new model version via
Trigger→Modal); cinematic "capture current camera" keyframes + orientation correction in
`CinematicSplatViewport` + camera-path playback on shares; editor undo/gizmos.

**Totals:** ~30–38 prompts. Front-load: A′ (~4) = deliverable service · +F (~11–12) = operator
cockpit · +G/H (~21–23) = full vision. B runs in parallel throughout; C trails the iOS build.

## 3. Launch posture (sellable at each stage)

- **After A′**: interior twins from the hero recipe, human-reviewed (process → editor cleanup →
  publish → share). Sell: "interactive metric-ish walkthrough link, estimating-grade."
  360 = coverage booster (~17–21 PSNR until B3). Drone = separate exterior GLB deliverable.
- **After F**: full production cockpit — pipeline board, cleanup, floor plans/sqft, link + brand
  management.
- **After G/H**: client portal with history, exports, white-label re-share, assistant.
- Never promise: survey-grade accuracy, automatic volumetric progress, one fused
  interior+exterior model, unreviewed auto-shared results.

## 4. Pinned attachments (360 photos / documents / thermal images on model locations)

**Today:** `digital_twin_pins` = 3D `position` + `normal` + text (title/body/status/priority/
trade) + threaded comments; share-scoped pins link via `digital_twin_comments`. No files.

**Design (additive):**

```sql
create table digital_twin_pin_attachments (
  id uuid primary key default gen_random_uuid(),
  pin_id uuid not null references digital_twin_pins(id) on delete cascade,
  org_id uuid not null,
  kind text not null check (kind in
    ('document','image','panorama_360','thermal','link','proposal','invoice')),
  storage_key text,                  -- R2 object (uploaded via existing presign flow)
  unified_file_id uuid,              -- or reference an existing SlateDrop file
  external_url text,                 -- or a link (e.g., hosted proposal)
  title text, content_type text, file_size_bytes bigint,
  created_by uuid, share_token_id uuid,   -- provenance: who attached, via which link
  created_at timestamptz not null default now()
);
```

- **Attach flow (operator + portal):** pick a point in the viewer (existing splat raycast) →
  pin → "Attach" → upload new file (existing presign/multipart path, stored under the space's
  R2 prefix and mirrored to the project's SlateDrop folder — the persistence rule) or pick an
  existing SlateDrop file (proposal, invoice, thermal share PDF) or paste a link.
- **Rendering:** pin billboards get a kind glyph; tapping opens a sheet — documents/PDF in the
  file viewer, images inline, `panorama_360` in the existing Photo Sphere viewer, thermal via
  its token-gated share viewer.
- **History:** pins are space-scoped and never deleted with versions (D1 changes FK to
  SET NULL + adds `pin_series_id`), so a pin and its attachments persist across every model
  version — open v1's "needs work" pin from the v4 timeline, with `created_at`/author
  provenance. Attachments live in SlateDrop, so they are also part of the project's
  evidentiary file record.
- **Sharing:** share-link visibility follows the existing role model — `view` sees pins +
  attachments read-only, `annotate` can add pins and attach (rate-limited, share-token
  provenance stamped), portal users see everything on their models. Served via token-scoped
  streaming routes like every other share asset.
- **Build slots:** schema in D1 · viewer/attach UX in F1/F4 (operator) and G5 (portal/share).

## 5. Export matrix (what a designer gets)

| Format | Source | State | Use |
|---|---|---|---|
| `.spz` | live pipeline | ✅ today (`download` role) | Slate360/Spark viewing; compact splat |
| `.ply` (Gaussian splat) | `ns-export` artifact | near-free to expose | **Best designer handoff for splats** — imports to Blender (splat add-ons), CloudCompare, SuperSplat |
| Colored point cloud `.ply`/`.las` | splat centers / LiDAR scan track | scan track ✅ (LAS/Potree); splat-derived = small worker addition | Point-cloud reference in CAD-adjacent tools |
| Mesh `.glb` | exterior `photogrammetry_mesh` ✅; interior via Open3D TSDF (planned, Phase E/P4) | exterior today | The format design software actually wants; conceptual massing in Blender/SketchUp/Twinmotion |
| Floor plan `.svg`/`.dxf` + areas JSON | `floorplan.py`/`openings.py` | code-complete, unwired (F3) | **DXF opens in AutoCAD/Revit** — the most CAD-native artifact we produce |
| Raw capture assets | SlateDrop bridge | ✅ stored; G2 exposes | Re-processing elsewhere, evidentiary record |

**Honest positioning:** Gaussian splats are not BIM/IFC solids. A designer doing conceptual
changes gets: splat `.ply` (visual context) + mesh `.glb` (geometry to model against) +
floor-plan `.dxf` (2D CAD) + raw photos. Never promise a Revit-native model.

## 5b. Device ingest matrix & trimming rules

Ingest is file-based (Review & Sources "Files" accept-any picker or SlateDrop) — there is no
device pairing/WiFi ingest and none is planned. Classification is by **measured aspect ratio**
(2:1 ⇒ equirect) with `.insv`/`.insp` extension special-cased to dual-fisheye.

| Device | File to upload | Pre-export needed? | Status |
|---|---|---|---|
| Insta360 X4/X5 | **raw `.insv`** off the SD card (card reader / Files app), `.insp` stills | **None — raw preferred.** If using Studio anyway: stitched 2:1 equirect MP4, Direction Lock ON, horizon-leveling/tilt/vibration OFF, no AI object removal on structural surfaces | ✅ works today (kitchen twin) |
| DJI Osmo 360 | stitched 2:1 equirect MP4 export | Equirect export works today via aspect-ratio detection. **Raw dual-lens files: unverified — need one sample file** to confirm the container/stream layout before promising raw ingest (small probe/unwrap addition if needed, same pattern as `.insv`) | 🟨 equirect yes / raw TBD |
| Antigravity A1 (360 drone) | raw file preferred (Insta360 ecosystem — likely `.insv`-compatible), else equirect MP4 | Same as X4 if `.insv`; confirm with one sample file | 🟨 likely works / verify |
| DJI Mavic 3E (photogrammetry) | original JPG stills **with EXIF intact** (never strip metadata; GPS feeds COLMAP spatial matching, `.MRK` feeds RTK georef in E2) | None. Avoid video (rolling shutter); if forced, ~1/1000 s and extract sharp frames | ✅ stills today |
| iPhone (native capture) | nothing to export — auto-uploads | n/a | ✅ |

**Trimming rules:**
- Primary defense is capture discipline (start/stop at the space boundary, per SOP).
- Until F5 ships: trim before upload only with **stream-copy** tools (e.g., LosslessCut) —
  never vendor-app re-encoding exports.
- After F5: set in/out points at review; the worker extracts frames only inside the window;
  the raw file is preserved untouched.
- Why it matters: every extracted frame enters one COLMAP solve. Transit/junk footage wastes
  compute, causes mis-registrations and blob appendages, and drags PSNR; output-side filters
  remove far outliers but not well-connected junk geometry.

## 6. Executor model guidance (can Sonnet 5 build this?)

Yes, for most of it — this doc is written to be Sonnet-executable, matching the established
pattern (`TWIN360_WORKFLOW_REBUILD_SONNET5.md`, `SITEWALK360_SONNET_BUILD_PLAN.md`).

- **Sonnet 5 — safe to delegate:** A1, A2, A4(web), D1–D2, F1–F4 (UI/API assembly over
  existing routes), G1–G5, H2–H3, exports UI. These are well-scoped screen/API slices with
  named files, existing patterns to copy (thermal branding, share streaming), and gates.
- **Keep on Opus/Fable-class:** all of B and C (worker/pipeline edits, coordinate
  conventions, loss functions — this codebase has shipped three coordinate-convention bugs),
  Swift changes (A4 native, Phase E bake worker), H1 tool-layer guardrail design, and any
  promotion decision (which is Brian's anyway, via the visual gate).
- **Per-slice contract for the executor:** read this doc + the referenced files; typecheck via
  scoped tsconfig; run `guard:architecture` + `guard:design` + `guard:file-size-regression`;
  commit explicit paths; push per slice; never touch forbidden zones (entitlements, billing,
  Stripe, middleware, existing migrations); new migrations are prepared for Brian to apply.

## 7. Open items / risks

- `openings.py` net-wall numbers are unvalidated on real captures — tape-measure gate before
  selling paint takeoffs. RoomPlan measurement layer (see `ROOMPLAN_TWIN_LOCKED.md`) is the
  long-term upgrade for opening detection.
- Metric-scale recovery is run-to-run unstable (28.97 vs 26.77 on identical data) — a re-run
  can recover a skipped scale; instrumentation idea (residual distribution logging, retry on
  second-best correspondence set) remains open.
- Share hardening (`max_views` bypass) fixed in F4; billing correctness (charge from
  `input_asset_ids`, credit reservation, R2 orphan cleanup) still needs Brian's explicit
  authorization and is NOT in this plan's scope.
- Acceptance gates P0a-4/P0b-3/P0c-3 remain device-dependent (⛔) — close them during the
  first real service captures.
