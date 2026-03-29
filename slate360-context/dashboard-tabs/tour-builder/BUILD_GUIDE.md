# 360 Tour Builder — Build Guide

Last Updated: 2026-03-27
Status: Planning guide for MVP-lite

Use this file as the working memory and safe-build guide for the 360 Tour Builder before implementation starts.

## Ecosystem Context

This BUILD_GUIDE covers the core Tour Builder MVP (8 prompts). For the standalone app subscription system, Stripe setup, PWA delivery, and iOS/Android app store strategy, read:

- `slate360-context/apps/APP_ECOSYSTEM_GUIDE.md`

The Tour Builder is the **first priority app** in the ecosystem revenue-first launch order. Build it first, validate it as a standalone subscription, then use the same pattern for PunchWalk.

**Prerequisites before starting the 8-prompt sequence:**
- App Phase 1A (Stripe smoke test — verify checkout + webhook): see APP_ECOSYSTEM_GUIDE.md — **UNSTARTED**
- App Phase 1B (Create Tour Builder + PunchWalk Stripe products + price IDs): see APP_ECOSYSTEM_GUIDE.md — **UNSTARTED**
- App Phase 2A (`org_feature_flags` table migration): see APP_ECOSYSTEM_GUIDE.md — **UNSTARTED**
- App Phase 2B (Update `getEntitlements()` to merge app flags): see APP_ECOSYSTEM_GUIDE.md — **UNSTARTED**
- App Phase 2C (Stripe webhook writes `org_feature_flags` rows on subscription): see APP_ECOSYSTEM_GUIDE.md — **UNSTARTED**
- App Phase 2D (Middleware protects standalone app routes via entitlements): see APP_ECOSYSTEM_GUIDE.md — **UNSTARTED**

**⚠️ The 8-prompt Tour Builder MVP sequence is FROZEN until these foundation phases are complete.** The Tour Builder DB schema depends on `org_feature_flags` for subscription gating, and the standalone route requires entitlement middleware. Building the MVP before the foundation exists will create ungated routes and untestable billing flows.

**After the 8-prompt MVP is complete:**
- Add Tour Builder standalone route and subscription gating (~2 prompts)
- Wire into `/apps/tour-builder` landing page and checkout flow (~1 prompt)
- PWA + Capacitor wrapping shared with PunchWalk (see APP_ECOSYSTEM_GUIDE.md Phases 4–5)

**Estimated total prompts from zero to live in app stores (Tour Builder only):**
~3 (ecosystem foundation) + 8 (MVP) + 3 (standalone/subscription/app page) + 5 (shared PWA + Capacitor) = **~19 prompts**

## Purpose

This file consolidates the verified current state, MVP-lite target, safe-build strategy, implementation order, and planning placeholders for future research.

Primary goal for MVP-lite:
- Upload finished equirectangular 360 images
- Sequence scenes into a tour
- Add a PNG logo overlay with adjustable size and opacity
- Publish a clean viewer route for presentation and sharing
- Support Zoom screen sharing without dashboard UI getting in the way

## Verified Current State

Verified from project docs and current code:

- Dashboard route exists at `app/(dashboard)/tours/page.tsx`
- Dashboard shell exists at `components/dashboard/ToursShell.tsx`
- Marketing page exists at `app/features/360-tour-builder/page.tsx`
- Marketing page already demos Pannellum via CDN iframe
- Entitlement gate exists for tours access in the dashboard route
- Sidebar and QuickNav wiring already exist
- System folder auto-provisioning for `360-tour-builder` already exists

What does not exist yet:

- No tour database tables
- No scene/hotspot persistence
- No tours API routes
- No upload flow specialized for tours
- No builder UI beyond placeholder shell
- No public viewer route
- No publish/share workflow
- No logo/branding overlay implementation
- No presenter mode or popout workflow

## Source Docs To Trust First

Read in this order when starting a new chat for Tour Builder work:

1. `SLATE360_PROJECT_MEMORY.md`
2. `slate360-context/dashboard-tabs/tour-builder/START_HERE.md`
3. `slate360-context/dashboard-tabs/tour-builder/BUILD_GUIDE.md`
4. `slate360-context/dashboard-tabs/tour-builder/IMPLEMENTATION_PLAN.md`

Reference-only unless needed:

- `slate360-context/dashboard-tabs/tour-builder/raw-upload-1.txt`
- `slate360-context/dashboard-tabs/tour-builder/raw-upload-2.txt`
- `slate360-context/APP_ECOSYSTEM_EXECUTION_PLAN.md`
- `slate360-context/ONGOING_ISSUES.md`

## MVP-Lite Definition

MVP-lite intentionally excludes stitching pipelines, AI hotspots, VR export, MLS export, and advanced analytics.

MVP-lite includes:

1. Create a tour record
2. Upload finished equirectangular 360 panoramas (from any camera or drone that exports standard format)
3. Add multiple scenes to a tour
4. Reorder scenes with drag-and-drop
5. View scenes in a 360 viewer
6. Add a tour-level PNG logo overlay
7. Adjust logo size and opacity
8. Publish a clean viewer link
9. Use the clean viewer in fullscreen for Zoom screen sharing
10. Generate embed code (iframe snippet) for clients to embed on their own website
11. Save and resume — draft state persists so user can close and reopen from where they left off

Post-MVP-lite (Phase 2 of Tour Builder, after first subscribers):

- Google Maps / Street View publication
- Scene-level hotspot navigation
- Scene-level branding overrides
- Password/expiry share policies
- Analytics events (views per tour, scene dwell time)
- Popout/new-window presenter mode
- QR code generation for printed materials
- White-label custom domains

## Camera and File Format Compatibility

The Tour Builder must accept panoramas from the cameras and drones that construction, real estate, and architecture professionals actually use in the field. The upload pipeline validates and labels file source where possible, but does NOT stitch or convert — it accepts only already-finished equirectangular or dual-fisheye outputs.

### Supported Cameras and Their Output Formats

| Camera | Format | Notes |
|---|---|---|
| Ricoh Theta Z1, X, SC2 | `.jpg` equirectangular | Theta shoots equirectangular natively. No conversion needed. |
| Insta360 ONE X2, X3, RS | `.jpg` equirectangular (exported from app) | Raw `.insv` files are NOT equirectangular — user must export from Insta360 Studio first. |
| GoPro MAX | `.jpg` equirectangular (exported) | Raw `.360` files need export from GoPro Player. App should warn if `.360` file is uploaded. |
| DJI Osmo 360 | `.jpg` equirectangular | Shoots equirectangular natively from the DJI app. |
| DJI Sphere mode (Mini 4 Pro, Mini 3 Pro) | `.jpg` equirectangular stitched in-app | DJI Fly app exports a single equirectangular JPEG. Accept this. |
| DJI raw (.DNG) | ❌ NOT supported | DNG from DJI is a flat photo, NOT a 360 panorama. Reject with a clear error message. |
| DSLR/mirrorless manual panorama | `.jpg` equirectangular (from PTGui/Hugin) | Accept the finished equirectangular output. Stitching is the user's job. |
| Samsung Gear 360 (older) | `.jpg` equirectangular | Legacy camera, still widely used. Accept. |

### Upload Validation Logic

When a file is uploaded, check:
1. Is it a JPEG or PNG? (Accept)
2. Does it have an aspect ratio of approximately 2:1 (e.g., 5760×2880)? (It's likely equirectangular — accept)
3. Does it have XMP metadata marking it as panoramic (`ProjectionType = equirectangular`)? (Confirmed equirectangular)
4. Is it `.insv`, `.360`, or `.dng`? Reject with a user-friendly message explaining next steps:
   > "This looks like a raw camera file. Please export a finished panorama from [Insta360 Studio / GoPro Player / DJI Fly] first, then upload the JPEG."

### Mobile Upload Flow (Critical For Field Use)

Users in the field must be able to go from camera → phone → Tour Builder in under 2 minutes. Design the upload flow for this:

1. Camera exports JPEG to phone via Bluetooth or USB
2. User opens Tour Builder on phone (mobile browser or PWA)
3. Taps "Upload Scene" → phone photo library opens
4. Selects the panorama JPEG
5. Tour Builder uploads to S3 (existing presigned URL backbone)
6. Scene appears in the tour immediately

On mobile: drag-and-drop does not work. Use a prominent tap-to-upload button instead. The upload button must be at least 56px tall and immediately visible without scrolling.

### File Size Limits Per Tier (Profit Margin Control)

Data costs must be managed to maintain 90–95% gross margin. Set limits by subscription tier:

| Limit | Standalone ($49/mo) | Business Platform |
|---|---|---|
| Storage total | 5 GB | 20 GB |
| Max scenes per tour | 30 | 100 |
| Max tours | 20 | Unlimited |
| Max file size per panorama | 100 MB | 200 MB |
| Additional storage (upsell) | +5 GB for $9/mo | +20 GB for $29/mo |

Store quota usage in the DB. Show a storage meter in the builder UI. When a user approaches 80% of their limit, show a warning banner. Block uploads when over the limit with a clear upsell prompt.

AWS S3 storage cost reference: ~$0.023/GB/month. At 5 GB per subscriber: ~$0.12/subscriber/month — easily sub-1% of the $49 subscription price.

## Explicit Non-Goals For First Build

Do not include these in the first implementation pass:

- Auto-stitching or manual stitching workflows
- Hugin/queue/Lambda/Upstash infrastructure
- AI hotspot suggestions
- Advanced branding transitions or keyframes
- Deep integration with Content Studio, Design Studio, or Project Hub
- White-label custom domains
- PWA offline capture mode
- Multi-scene hotspot navigation editor
- Google Maps / Street View publication (Phase 2)

These features add complexity and risk without being required for the first usable outcome.

## Recommended Safe-Build Strategy

The module should be built as an additive island. Avoid changing shared systems unless there is a verified dependency that forces it.

### Isolation Rules

1. Keep all new implementation under the tours domain
2. Separate builder and viewer from day one
3. Keep branding state isolated from scene data
4. Treat stitching as a future extension, not a current dependency
5. Avoid editing large shared files unless wiring requires it

### Builder/Viewer Separation

Builder responsibilities:

- Authenticated editing UI
- Upload panoramas
- Reorder scenes
- Configure logo overlay
- Publish/unpublish state

Viewer responsibilities:

- Clean presentation UI
- Scene switching
- Fullscreen
- Optional future popout mode
- No edit controls

Reason:

- Keeps Zoom presentation clean
- Reduces risk of dashboard UI breakage
- Makes public/share routes easier later
- Makes future embed support straightforward

### Data Boundaries

Keep tour data small and explicit:

- Tour metadata
- Ordered scenes
- Branding config
- Publish/share metadata

Do not mix logo settings into individual scenes unless there is a real use case.

### Integration Discipline

Before wiring any new helper, component, route, or provider:

1. Confirm it is imported and actually used
2. Trace set -> read -> display end-to-end
3. Keep async writes sequentially awaited
4. Re-fetch server-backed data after writes when the UI depends on persisted state

These are recurring repo failure modes and must be checked every time.

---

## GitNexus Impact Analysis Protocol

**Use GitNexus before touching any shared file.** This catches unintended side effects before they happen. Run it at the start of any prompt that could ripple into other modules.

### When To Run GitNexus

Always run an impact check when:

- Adding or modifying anything in `lib/` (types, hooks, queries, utils)
- Adding a new entry to DashboardClient tab registry, sidebar, or QuickNav
- Changing any export from a shared component or provider
- Touching auth/entitlements/org context chains
- Changing shared API route structure

### How To Use GitNexus

At the start of a prompt, run an impact analysis on the file you plan to change:

```
mcp_gitnexus_impact — file: <path to the file you plan to edit>
```

This returns all files in the repo that depend on the changed file. Review the list before editing. If the impact list includes files outside the `tours` domain that are not the explicit wiring points listed below, stop and reassess.

To detect uncommitted drift at the end of a session:

```
mcp_gitnexus_detect_changes
```

To query the dependency graph for a specific symbol:

```
mcp_gitnexus_query — what imports or uses <SymbolName>
```

To inspect the repo graph before starting a large multi-file change:

```
mcp_gitnexus_context
```

### GitNexus Ground Rules

1. If impact analysis shows that a shared component would need to be modified, document why in a comment before editing it.
2. If an `mcp_gitnexus_impact` result returns more than 5 files outside the tours domain, escalate to the user before proceeding.
3. After completing a prompt, run `mcp_gitnexus_detect_changes` to confirm only the intended files changed.
4. Never skip impact analysis because "this is a small change." Small changes to shared files have caused most of the recurring regressions in this repo.

---

## Cross-Tab Isolation Rules

The tour builder MUST NOT cause regressions in other dashboard tabs. These rules are mandatory, not optional.

### Hard Do-Not-Touch List

During all tour builder implementation, do not edit these files unless there is a verified wiring requirement:

| File | Why It Is Risky |
|---|---|
| `components/dashboard/DashboardClient.tsx` | 2,800+ lines; tabbed orchestrator for all dashboard functionality |
| `components/slatedrop/SlateDropClient.tsx` | 2,030+ lines; large shared state monolith |
| `components/project-hub/ClientPage.tsx` | 834 lines; project hub orchestration |
| `lib/entitlements.ts` | Entitlement logic for all modules; change breaks gating everywhere |
| `middleware.ts` | Auth middleware; change can break all protected routes |
| `lib/server/api-auth.ts` | Shared auth wrapper; used by all API routes |
| `lib/server/api-response.ts` | Shared response helpers; used by all API routes |
| `app/layout.tsx` | Root layout; change breaks all pages |
| `components/dashboard/Sidebar.tsx` | Shared sidebar; wiring already done |
| `components/dashboard/QuickNav.tsx` | Shared QuickNav; wiring already done |

If it is genuinely necessary to edit one of these, run a GitNexus impact check first, read the entire file's state and JSX sections in the same read call, and confirm the change with the user before applying it.

### Explicit Wiring Points

The ONLY shared files that the tour builder requires touching. These should already be done:

1. `components/dashboard/DashboardClient.tsx` — add a `"tours"` tab entry (one-time wiring only)
2. `components/dashboard/Sidebar.tsx` — tours sidebar link already wired
3. `components/dashboard/QuickNav.tsx` — tours QuickNav entry already wired
4. `lib/entitlements.ts` — `canAccessTours` already added

No further edits to shared files are needed for the full MVP-lite implementation.

### Isolated Domain Files For Tours

All new code must live within these paths only:

```
app/(dashboard)/tours/                  ← existing server entry, only extend
app/tours/view/[token]/                 ← new clean viewer route
app/api/tours/                          ← all tour API routes
components/dashboard/tours/             ← all builder UI components
components/tours/viewer/                ← all viewer UI components
lib/types/tours.ts                      ← all tour TypeScript types
lib/tours/                              ← all tour business logic
lib/hooks/useTour*.ts                   ← all tour hooks
```

Nothing from the tour builder should be imported into other tabs' components or hooks. If a utility seems genuinely shared, confirm with the user before moving it to `lib/`.

### How To Verify Cross-Tab Isolation After Each Prompt

1. Run `mcp_gitnexus_detect_changes` and confirm only tours-domain files changed.
2. If DashboardClient or any shared file appears in the diff, verify it was an intended wiring point.
3. Run `get_errors` on ALL changed files, not just the new ones.
4. Run `npm run typecheck` to confirm no cross-module type errors.
5. Visually verify that the Sidebar and QuickNav still render (no import errors in shared components).

---

## Intra-Module Safety Rules

As the tour builder grows across multiple prompts, it must not regress its own prior functionality. These rules prevent internal breakage.

### Component Discipline Within Tours

- One component per file, one hook per file — mandatory even for small components.
- Max 300 lines per file. If a file approaches 250 lines, extract before adding more logic.
- Keep `TourBuilderClient.tsx` as an orchestrator only. State and side effects go in hooks.
- Keep the Pannellum viewer wrapper narrow: it receives a scene URL and emits events. Scene switching logic lives outside the wrapper.
- Never let branding/logo state leak into scene data structs.

### State And Data Flow Rules

- Builder hooks (`useTourBuilder`, `useTourScenes`, `useTourBranding`) are separate hooks — do not merge them.
- Persist first, then re-fetch — never read local optimistic state as the source of truth after a write.
- Scene reorder must persist to DB before the UI updates the canonical order.
- If tour status is `published`, the viewer must fetch fresh data — do not rely on builder state cached in memory.

### Viewer Route Independence

- `app/tours/view/[token]/page.tsx` is a completely independent route from the dashboard.
- It must fetch its own data using the token/slug only.
- It must never import components from `components/dashboard/tours/`.
- If any UI element is needed in both the builder and viewer, put it in `components/tours/shared/` — not in either domain-specific folder.

### Adding A New Prompt Mid-Build

If a new prompt adds capability that wasn't in the original 8-step sequence:

1. Re-read `BUILD_GUIDE.md` first to confirm the new work stays within the existing file structure plan.
2. Check `ONGOING_ISSUES.md` and `ops/bug-registry.json` for any tour-related bugs.
3. If new shared state or a new hook is needed, plan its boundaries before writing code.
4. Do not expand the scope of existing hooks — add new focused ones instead.
5. Update `START_HERE.md` and this BUILD_GUIDE if the prompt sequence changes.

### Pre-Prompt Self-Check (Run Before Every Implementation Prompt)

Before writing any code in a tour builder prompt, answer these:

- [ ] Have I read the current session handoff from `SLATE360_PROJECT_MEMORY.md`?
- [ ] Have I re-read the relevant section of `BUILD_GUIDE.md`?
- [ ] Do I know the current line count of every file I plan to edit?
- [ ] Have I run `mcp_gitnexus_impact` on any shared file I plan to modify?
- [ ] Do I know which files will contain the new code and which existing files I'm wiring into?
- [ ] Am I adding a new dependency on any file outside the tours domain? If yes — is it on the allowed wiring list?

---

## Proposed Data Model For MVP-Lite

Keep the first schema minimal. Additive tables are safer than overloading other modules.

### `project_tours`

Suggested fields:

- `id`
- `org_id`
- `project_id` nullable for first version if project attachment is deferred
- `created_by`
- `title`
- `description` nullable
- `status` (`draft` | `published`)
- `viewer_slug` or `share_token`
- `logo_asset_path` nullable
- `logo_width_percent` nullable
- `logo_opacity` nullable
- `logo_position` nullable
- `created_at`
- `updated_at`

### `tour_scenes`

Suggested fields:

- `id`
- `tour_id`
- `sort_order`
- `title`
- `panorama_path`
- `thumbnail_path` nullable
- `initial_yaw` nullable
- `initial_pitch` nullable
- `created_at`
- `updated_at`

### Deferred Tables

Not required for MVP-lite:

- `tour_hotspots`
- `tour_brand_presets`
- `tour_share_policies`
- `tour_events`

Those can be added later without disrupting the first release.

## Proposed File Structure

This structure keeps the module decomposed and avoids monolith creep.

```text
app/
  (dashboard)/tours/page.tsx
  tours/view/[token]/page.tsx
  api/tours/
    route.ts
    [tourId]/route.ts
    [tourId]/publish/route.ts
    [tourId]/scenes/route.ts
    [tourId]/branding/route.ts
    upload/route.ts

components/dashboard/tours/
  TourBuilderClient.tsx
  TourBuilderLayout.tsx
  TourSceneLibrary.tsx
  TourViewerCanvas.tsx
  TourBrandingPanel.tsx
  TourToolbar.tsx
  TourPublishPanel.tsx

components/tours/viewer/
  TourPresentationViewer.tsx
  TourSceneNavigator.tsx
  TourLogoOverlay.tsx

lib/types/
  tours.ts

lib/tours/
  constants.ts
  mappers.ts
  queries.ts
  validators.ts

lib/hooks/
  useTourBuilder.ts
  useTourScenes.ts
  useTourBranding.ts
```

## Viewer Technology Recommendation

Use Pannellum first.

Reason:

- Already present as a working demo on the marketing page
- Already referenced heavily in the archived specs
- Good fit for MVP-lite viewer and scene switching
- Lets the team defer any heavier experimentation until after core workflows work

Recommendation:

- Keep the first version simple: one viewer wrapper component with a narrow interface
- Avoid scattering Pannellum usage across many files
- Keep scene switching logic outside the raw viewer wrapper

## Zoom / Presentation Strategy

For the first release, do not depend on popout mode.

Implement this order:

1. Clean viewer route
2. Fullscreen support
3. Minimal scene navigation
4. Optional popout/new window later

Why this order:

- A clean viewer route is enough for screen sharing
- Fullscreen removes the dashboard chrome problem immediately
- Popout adds browser-state and window-management complexity
- A viewer route is reusable for sharing, previews, and future embeds

### MVP Presenter Requirements

- No dashboard sidebar
- No builder controls
- Scene next/previous or scene strip
- Fullscreen button
- Visible logo overlay
- Stable URL that can be shared and reopened

## Logo / Branding Scope

### MVP (Phase 1)

First version supports a tour-level PNG logo overlay only.

Required controls:

- Upload/select PNG logo
- Position preset: top-left, top-right, bottom-left, bottom-right
- Width or scale slider
- Opacity slider

Do not add freeform drag placement in the first build. Preset corners are safer, faster, and easier to persist.

Recommended defaults:

- Position: bottom-right
- Width: 18%
- Opacity: 0.8

### Phase 2 Branding Features (Post-MVP, after first subscribers)

These are competitive differentiators. No competitor does all of these well.

#### 1. Nadir / Tripod Cover

A circular image placed at the bottom of the equirectangular (the nadir — the spot where the tripod or drone is visible). This is one of the most-requested features in tour software. Users want to hide the tripod with their logo.

- Upload a PNG (ideally circular with transparency)
- Scale control (0–100% of nadir region)
- Applied server-side as a composited image OR client-side as a CSS overlay on the Pannellum viewer
- Client-side approach: Pannellum supports a `hotSpot` at yaw=0, pitch=-90 with a custom CSS class — simpler than image compositing
- Server-side approach: sharp.js compositing — add circular overlay at bottom of equirectangular before storage. More permanent, works in all viewers including embeds.
- Recommendation: Use sharp.js server-side for MVP Phase 2. Store both the original and composited version (so user can update the cover later without re-uploading the panorama).

#### 2. Text Overlays (Scene Labels)

Users need to label scenes with room names, measurements, callouts, or directional text.

- Add text at a fixed point in 3D space (yaw + pitch coordinates stored in DB)
- Text overlays render as Pannellum custom hotspots
- Properties: content, font size, color, background color with opacity, min/max visible pitch
- Phase 2 schema addition: `tour_scene_overlays` table: `id, scene_id, type (text|image|icon), yaw, pitch, content_json, visible`
- Use case: label doors ("Exit"), rooms ("Master Bedroom — 450 sq ft"), or inspection callouts ("Crack in drywall — see report")

#### 3. Default Viewing Angle (Initial Camera Position)

Without this, the viewer opens facing an arbitrary direction (usually east/yaw=0). Users preparing tours for presentations need to control the opening shot.

- `initial_yaw FLOAT DEFAULT 0` and `initial_pitch FLOAT DEFAULT 0` columns on `tour_scenes`
- `initial_fov FLOAT DEFAULT 100` — field of view (zoom level, 60–120° range)
- In the builder: a "Set Opening View" button that captures current viewer heading/pitch/FOV and saves it
- This is a 1-hour implementation once the schema is in place

#### 4. Keyframe / Intro Animation

A short animated camera move that plays when a scene loads. Creates a cinematic "reveal" effect — the camera slowly rotates or tilts into position from a starting point. Impresses clients in presentations.

- `intro_animation_json JSONB` on `tour_scenes` — stores keyframes: `[{yaw, pitch, fov, duration_ms}, ...]`
- Render using requestAnimationFrame in the viewer — interpolate from keyframe[0] to keyframe[1] at load
- Pannellum supports `setPitch()`, `setYaw()`, `setHfov()` programmatically — use these for animation
- Simple Phase 2 implementation: just two keyframes (start + end position, duration). Full keyframe editor is Phase 3.
- Phase 2 preset: "Slow reveal" — start slightly left of initial_yaw, animate to initial_yaw over 2 seconds

#### 5. Effects (Post-Phase 2, Phase 3)

- Vignette overlay (darkened edges, cinematic look)
- Blur/focus control (blur distant areas to draw attention to a point — useful for inspections)
- Day/night toggle (if multiple exposures of same scene are uploaded)
- These require substantial viewer modification. Do not build until Phase 3.

## Suggested Prompt Sequence

This is the recommended prompt order for a safe MVP-lite build.

### Phase 0 — App Ecosystem Foundation (MUST complete before Prompt 1)

These steps are executed using `APP_ECOSYSTEM_GUIDE.md`, not this BUILD_GUIDE. They establish the billing and entitlement infrastructure that Tour Builder depends on.

| Step | Ref | Status |
|---|---|---|
| 1A: Stripe smoke test (checkout + webhook + tier update) | APP_ECOSYSTEM_GUIDE.md §2 Phase 1A | ⬜ Unstarted |
| 1B: Create Tour Builder + PunchWalk Stripe products, set price ID env vars | APP_ECOSYSTEM_GUIDE.md §2 Phase 1B | ⬜ Unstarted |
| 2A: Create `org_feature_flags` table migration | APP_ECOSYSTEM_GUIDE.md §3 Phase 2A | ⬜ Unstarted |
| 2B: Update `getEntitlements()` to merge app flags | APP_ECOSYSTEM_GUIDE.md §3 Phase 2B | ⬜ Unstarted |
| 2C: Stripe webhook writes `org_feature_flags` on subscription | APP_ECOSYSTEM_GUIDE.md §3 Phase 2C | ⬜ Unstarted |
| 2D: Middleware protects standalone app routes via entitlements | APP_ECOSYSTEM_GUIDE.md §3 Phase 2D | ⬜ Unstarted |

**Exit criteria for Phase 0:** A test user can subscribe to a standalone app product via Stripe, the webhook persists the feature flag, `getEntitlements()` returns true for the app, and the middleware gates the route correctly.

**Estimated prompts:** ~3–5 (see APP_ECOSYSTEM_GUIDE.md for details).

### Prompt 1 — Types + Schema + Migration Plan

Deliver:

- `lib/types/tours.ts`
- Supabase migration for `project_tours` and `tour_scenes`
- Narrow schema only for MVP-lite

Exit criteria:

- Types compile
- Migration is additive and reversible

### Prompt 2 — Server Queries + CRUD API

Deliver:

- Tour create/list/update routes
- Scene create/list/update/delete/reorder support
- Shared query helpers

Exit criteria:

- Can create a tour and persist ordered scenes

### Prompt 3 — Upload Pipeline + Camera Format Validation

Deliver:

- Upload route for panoramas (`app/api/tours/[tourId]/scenes/upload/route.ts`)
- S3 path convention for tours: `tours/{orgId}/{tourId}/scenes/{sceneId}.jpg`
- File validation: check aspect ratio ~2:1 and XMP metadata for `ProjectionType=equirectangular`
- Rejection handler for `.insv`, `.360`, `.dng` with user-friendly messages
- Storage quota check before upload (compare org's used bytes vs tier limit)
- Mobile-friendly upload UI: tap-to-upload, no drag-only patterns
- Progress indicator for large panorama files

Exit criteria:

- User can upload a Ricoh Theta JPEG and it appears as a scene
- Uploading a `.dng` file shows a clear rejection message with next-step instructions
- Uploading when over quota shows a storage limit warning, not a generic error
- Upload UI is operable on a phone with one hand

### Prompt 4 — Builder Shell Layout

Deliver:

- Replace placeholder shell with decomposed builder layout
- Left scene panel, center viewer, right branding/publish panel
- Empty states

Exit criteria:

- Builder renders from real data with no placeholder-only experience

### Prompt 5 — Scene Ordering + Viewer Wiring

Deliver:

- Drag-and-drop scene ordering
- Viewer loads selected scene
- Initial scene state sync

Exit criteria:

- Reorder persists and selected scene displays correctly

### Prompt 6 — Logo Overlay Controls

Deliver:

- PNG logo upload/selection
- Size and opacity controls
- Position presets
- Viewer overlay component

Exit criteria:

- Logo changes persist and render in builder preview and viewer

### Prompt 7 — Publish + Embed Code + Clean Viewer Route

Deliver:

- Publish action
- Token or slug viewer route
- Minimal presentation controls
- Fullscreen support

Exit criteria:

- Tour opens in a clean route suitable for Zoom screen sharing

### Prompt 8 — Stabilization + Guardrails

Deliver:

- Typecheck fixes
- Empty/error states
- Smoke-test checklist
- Context doc updates

Exit criteria:

- First end-to-end flow works reliably

## Pre-Build Checklist

Before implementation starts:

1. Decide exact table names
2. Decide whether viewer uses token or slug
3. Decide whether logo asset uses a dedicated upload route or existing file infrastructure
4. Decide whether scenes are project-bound from day one or can exist without project attachment
5. Decide whether presentation mode needs scene thumbnails or just arrows in MVP-lite
6. Confirm which existing shared components should be reused for cards, panels, buttons, and dialogs
7. Confirm whether Pannellum will be installed as a package or wrapped from CDN for phase one

## Safe-Build Checklist For Every Prompt

Use this before AND after every implementation chat.

### Before Writing Code

1. Read `SLATE360_PROJECT_MEMORY.md` latest handoff and this `BUILD_GUIDE.md` first.
2. Check `ops/bug-registry.json` and `ONGOING_ISSUES.md` if ANY shared behavior is touched.
3. Check line counts (`wc -l <file>`) before editing any existing file — extract if ≥250 lines.
4. Run `mcp_gitnexus_impact` on every shared file you plan to modify.
5. Confirm the planned changes stay within the tours domain (or are on the explicit wiring list).

### While Writing Code

6. New file created → immediately confirm it is imported in the consuming file.
7. New hook created → immediately confirm it is called in the component that needs it.
8. New API route created → immediately smoke-test the endpoint.
9. Async chain (write → read → display) → confirm each step is `await`ed sequentially.

### After Writing Code

10. Run `get_errors` on ALL changed files — not just the new ones.
11. Run `npm run typecheck` when TypeScript behavior could be affected.
12. Run `mcp_gitnexus_detect_changes` to confirm only tours-domain files changed.
13. If any non-tours file changed, verify it is an explicit wiring point.
14. Trace the full data flow: value set → persisted to DB → re-fetched → rendered in UI.
15. Run `bash scripts/check-file-size.sh` if you touched app code.
16. Update `SLATE360_PROJECT_MEMORY.md` session handoff.
17. Update this `BUILD_GUIDE.md` and `START_HERE.md` if scope or sequence changed.

## Known Risks

### Risk 1: Builder turns into a monolith

Mitigation:

- One component per file
- One hook per file
- Keep Pannellum wrapper narrow
- Split builder panels from viewer

### Risk 2: Shared dashboard regressions

Mitigation:

- Keep work isolated to `tours` domain
- Avoid broad DashboardClient edits except explicit wiring points

### Risk 3: Upload flow gets tangled with future stitching work

Mitigation:

- Design uploads around already-finished panoramas only
- Put stitching behind future routes and separate fields

### Risk 4: Share route leaks builder UI

Mitigation:

- Build viewer route as a separate tree
- Do not reuse builder layout in presentation mode

### Risk 5: Branding settings become scene-specific accidentally

Mitigation:

- Keep first branding config tour-level only

## Research Intake Template

Use this section to add reference material and decisions before implementation.

### Competitive Landscape (Filled In)

| Platform | Price | Strengths | Weaknesses | Slate360 Advantage |
|---|---|---|---|---|
| Matterport | $69–$309+/mo | Dominant in real estate, very polished | Requires proprietary camera ($600–$4,000), no project management | No camera required; bundles with PM tools |
| Kuula | Free–$99/mo | Browser-based, simple, popular with photographers | No PM integration, no construction-specific features | Project Hub + SlateDrop integration |
| Roundme | Free–$24/mo | Very cheap, easy to use | Feature-poor, consumer-oriented | Business-grade, API-driven |
| 3DVista | $499 one-time | Very powerful, professional-grade | Desktop only, steep learning curve | Cloud-native, mobile upload |
| CloudPano | $49–$199/mo | Similar market position to Slate360 | No PM integration, no team features | Full platform integration |
| Google Street View | Free | On Google Maps = SEO | No branding, no client delivery workflow | Publish to Street View as a Phase 2 feature |

**Differentiator summary:** Only Slate360 combines 360 tour delivery + project management + file delivery (SlateDrop) in one subscription. No competitor bundles these.

### Reference Platforms

- Kuula.co — copy: simple scene list, quick publish to link, clean viewer UI
- CloudPano — copy: camera format guide for users, tiered storage meter UI
- Insta360 Studio app — study: how they handle format export UX (instructional UI pattern)
- Google Street View Publish — study: what metadata is required for future Phase 2 Maps integration

### Camera Format Research Notes

*(Confirm before Prompt 3)*

- Ricoh Theta Z1 output: 6720×3360 JPEG equirectangular (2:1) — confirm ✅
- Insta360 X3 output from Insta360 Studio: 6080×3040 JPEG equirectangular (2:1) — confirm ✅
- GoPro MAX output from GoPro Player: 5376×2688 JPEG equirectangular (2:1) — confirm ✅
- DJI Mini 4 Pro sphere mode from DJI Fly app: 8192×4096 JPEG equirectangular (2:1) — confirm ✅
- DJI DNG files: flat RAW, NOT equirectangular — reject with instructions ✅
- XMP detection field: `GPano:ProjectionType = equirectangular` (from Google photo sphere spec)
- Maximum practical file size: Ricoh Theta Z1 is ~8–15 MB per shot; DJI sphere can be ~20–40 MB
- 100 MB per-file limit is safe for MVP; revisit if users hit it

### Storage Tier Decisions

*(Confirm before Prompt 1 — affects DB schema)*

- Storage limit — standalone ($49/mo): **5 GB**
- Storage limit — platform business ($499/mo): **20 GB**
- Max scenes per tour — standalone: **30 scenes**
- Max tours — standalone: **20 tours**
- Upsell storage pack: **+5 GB for $9/mo**
- DB column tracking usage: `org_storage_used_bytes BIGINT DEFAULT 0` on `organizations` table
- S3 cost per subscriber at 5 GB cap: ~$0.12/month (sub-1% of $49 price — margin safe ✅)

### UI Requirements

- Required builder controls: scene list (drag-to-reorder), viewer pane, upload button, branding tab, publish button, embed code copy button, storage meter
- Required viewer controls: fullscreen button, scene navigation arrows (when multiple scenes)
- Must-have layout constraints: scene list on left, viewer on right on desktop; stacked (viewer top, scenes bottom) on mobile
- Mobile upload behavior: tap-open phone photo library (`<input type="file" accept="image/*" multiple>`); no drag-only patterns
- Storage meter: show in top-right of builder, e.g. "2.3 GB / 5 GB used (46%)" — yellow at 80%, red at 95%

### Workflow Requirements

- Create tour flow: dashboard → "New Tour" button → name input → enter builder
- Upload flow: tap/click "Add Scene" → file picker → validation → S3 upload → scene thumbnail appears
- Scene ordering: drag handles on desktop, up/down arrows on mobile (no drag on touch)
- Publish/share flow: "Publish" button → toggle public on → copy link → copy embed code
- Embed copy flow: one-click-copy of full `<iframe ...>` snippet; show preview with correct dimensions

### Backend Decisions

- Tables: `project_tours`, `tour_scenes`, `org_storage_usage` (new)
- Route pattern: `/api/tours/`, `/api/tours/[tourId]/scenes/`
- Storage path convention: `tours/{orgId}/{tourId}/scenes/{sceneId}.{ext}`
- Viewer auth model: published tours are public (no Slate360 login required for embedded viewer)
- Auto-save: every state change triggers a debounced PATCH to the DB (500ms debounce); no "Save" button

### Sharing / Presentation Decisions

- Viewer URL: `/v/[tourSlug]` (public) or `/view/[tourId]` (internal with auth)
- Public vs tokenized: published tours are fully public by default; password-protect is Phase 2
- Fullscreen: viewer has a native fullscreen button; `requestFullscreen()` on the viewer div
- Popout: "Open in new window" button opens `/v/[tourSlug]?mode=present` (Phase 2)
- Scene navigation: prev/next arrows in viewer when tour has multiple scenes; scene thumbnail strip below viewer

### Mobile Delivery Strategy (Confirmed)

- **Capacitor will use the hosted URL approach** — a full-screen WebView loading the live Next.js app from the Vercel deployment URL.
- PWA layer uses `@ducanh2912/next-pwa` for service worker + install prompt.
- Android target: API 34 (Android 14+).
- iOS target: requires active Apple Developer Program enrollment ($99/yr).
- Both iOS and Android Capacitor shells are thin wrappers; all logic lives in the web app.
- This strategy is shared with PunchWalk — a single Capacitor project wraps all standalone apps.

### Branding Decisions

- Logo upload: PNG only; stored in S3 alongside tour assets
- Position presets: top-left, top-right, bottom-left, bottom-right (four options)
- Size scale: 5%–25% of viewer width (slider)
- Opacity: 20%–100% (slider)

### Embeddable Viewer Decisions

*(Confirm before Prompt 7)*

- Iframe URL: `/v/[tourSlug]?embed=1` — suppress Slate360 nav chrome
- Default embed code: `<iframe src="https://slate360.ai/v/[slug]?embed=1" width="100%" height="600" frameborder="0" allowfullscreen></iframe>`
- Dimension presets: Widescreen (16:9), Standard (4:3), Square (1:1); user picks or enters custom
- Branding in embed: Slate360 "Powered by" watermark on standalone tier; removable on business+ tier
- Autoplay: yes, first scene loads immediately when embed page opens

### Google Maps / Street View (Phase 2 — Not MVP)

*(Research before Phase 2 begins — do not implement in MVP)*

- Google Street View Publish API accepts equirectangular JPEGs via REST API
- Required metadata: GPS coordinates (lat/lng), heading, pitch, roll (from EXIF or user input)
- Auth model: user must grant Google OAuth scope `https://www.googleapis.com/auth/streetviewpublish`
- Alternative: Google Maps Photos API (Business Profile) — targets local businesses, slightly different workflow
- Strategy: add "Publish to Google Maps" button in the publish panel (Phase 2); user connects Google account once
- Marketing angle: businesses WANT their properties on Google Maps — this is a viral growth feature

## Build Readiness Criteria

Start implementation only when these are decided:

1. MVP-lite scope is frozen
2. First-pass data model is approved (include storage quota columns)
3. Viewer route strategy is approved
4. Branding behavior is approved
5. Pannellum integration approach is approved
6. Storage tier limits are confirmed (fill in Research Intake Template below)
7. Embed iframe approach is approved (same-origin? CDN-hosted?)

## Definition Of Done For MVP-Lite

The first implementation is done when:

- A user can create a tour and reopen it from where they left off (auto-save/draft state)
- A user can upload a finished equirectangular JPEG from Ricoh Theta, Insta360, GoPro MAX, or DJI drone
- Uploading a raw camera file (.insv, .dng, .360) shows a clear rejection message with instructions
- A user can add multiple scenes and reorder them
- A user can add a PNG logo overlay and adjust size and opacity
- A user can publish a clean viewer link
- A user can copy an iframe embed code to paste on their client's website
- The embed viewer works without Slate360 auth (public, no login required)
- A user can open the viewer in fullscreen for Zoom screen sharing
- Storage quota is tracked and shown in the UI with a warning near the limit
- The implementation stays modular and additive without broad shared regressions

---

## Standalone App Delivery (Post-MVP Prompts 9–11)

After the 8-prompt MVP is complete and verified, add standalone subscription delivery.

### Prompt 9 — Standalone Route + Entitlement Gating

Deliver:
- `app/apps/tour-builder/page.tsx` — landing page with pricing and feature summary
- `app/apps/tour-builder/subscribe/page.tsx` — Stripe checkout trigger (reuses App Ecosystem foundation from APP_ECOSYSTEM_GUIDE.md Phase 3)
- Entitlement gating in `app/(dashboard)/tours/page.tsx`: redirect non-subscribers to `/apps/tour-builder`
- Platform tier users (`model+` or `business+`) retain access without extra subscription

Exit criteria:
- A trial user who navigates to `/tours` is redirected to the landing page.
- A user who subscribes to Tour Builder gets the `standalone_tour_builder` flag and lands in the builder.
- Business+ platform users are not blocked by the entitlement check.

### Prompt 10 — Post-Checkout Onboarding

Deliver:
- `app/apps/tour-builder/onboarding/page.tsx`
- First-time user experience: create your first tour prompt, sample panorama option
- "Add to Home Screen" install prompt shown after onboarding (reuses `components/pwa/InstallPrompt.tsx` when available)

Exit criteria:
- New subscriber lands on onboarding page after Stripe checkout.
- Onboarding guides user to create their first tour.
- Completing onboarding navigates to the builder.

### Prompt 11 — Stabilization + Context Docs

Deliver:
- Smoke-test checklist for all three access paths: platform user, standalone subscriber, unauthenticated visitor
- Update `APP_ECOSYSTEM_GUIDE.md` phase tracker
- Confirm no regressions in shared billing or auth flows
- Update this BUILD_GUIDE and `SLATE360_PROJECT_MEMORY.md` handoff

Exit criteria:
- All three access paths work correctly.
- No TypeScript errors.
- No broken billing or auth flows.

---

## Enterprise Tier — Tour Builder (Phase 3 / Post-Standalone)

The Enterprise tier unlocks Tour Builder for entire organizations — departments, companies, contractor networks, realtor offices. It is the path to the largest contracts and highest LTV customers.

### Who Buys Enterprise

| Buyer | Use Case | What They Pay For |
|---|---|---|
| Capital program departments | Share 360 progress tours in weekly OAC meetings | Multi-user org seats, meeting mode, project hierarchy |
| General contractor headquarters | Superintendents in the field, PMs in the office reviewing the same tour | Team access, no per-seat friction during meetings |
| Realtor offices | All agents under one subscription, each with their own tours | Per-agent quotas, office-level brand settings |
| Architecture firms | Design review, client walkthroughs in meetings | Meeting mode, branded viewer for client-facing shares |
| Commercial real estate | Property marketing, drone aerial tours, Google Maps presence | High storage limits, embed code for property websites |

### Enterprise Pricing

| Tier | Monthly | Annual | Included |
|---|---|---|---|
| Tour Builder Standalone | $49/mo | $490/yr | 1 user, 20 tours, 5 GB |
| Tour Builder Team | $149/mo | $1,490/yr | 5 seats, 100 tours, 25 GB, meeting mode |
| Tour Builder Enterprise | $499/mo | $4,990/yr | 25 seats, unlimited tours, 100 GB, white-label, priority support |
| Custom / Capital Programs | Contact us | — | Unlimited seats, custom storage, SLA, SSO |

**Revenue impact:** A single capital program department at $499/mo is worth more than 10 standalone subscribers. One enterprise sale to a realtor office of 30 agents at $149/mo is $1,790/year. These deals close through direct outreach, not app stores.

### Enterprise Feature Set

#### 1. Meeting Mode / Coordination Viewer

The core enterprise differentiator: a shared viewer that makes 360 tours useful in coordination meetings (OAC meetings, design reviews, client walkthroughs via Zoom or in-person).

**Behavior:**
- Host opens tour in "Meeting Mode" — gets a dedicated URL like `/v/[tourSlug]?mode=meeting&host=1`
- Attendees open the same URL without `host=1` — they see the same tour
- Host controls which scene is active — when host changes scene, all attendee views update (Supabase Realtime channel per meeting session)
- Host controls the active viewing direction (optional "follow me" mode — attendee camera tracks host camera)
- Simple "Raised hand" or "Take control" button for attendees to request presenter control
- No video/audio — this is a viewer sync tool, not a video conferencing replacement. Users run Zoom/Teams alongside it.

**Architecture:**
```
host browser  →  PATCH /api/tours/[tourId]/sessions/[sessionId]  →  DB update
                                                                        ↓
                                              Supabase Realtime broadcast
                                                                        ↓
all attendee browsers  ←  receive scene change event  ←  update viewer
```

**Schema for meeting sessions:**
```sql
CREATE TABLE tour_meeting_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tour_id UUID NOT NULL REFERENCES project_tours(id),
  host_user_id UUID NOT NULL,
  active_scene_id UUID REFERENCES tour_scenes(id),
  active_yaw FLOAT DEFAULT 0,
  active_pitch FLOAT DEFAULT 0,
  follow_mode BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '4 hours')
);
```

#### 2. Desktop Interface / Portal

Enterprise users need a clean desktop interface — simpler and more focused than the full dashboard. Think PowerPoint presenter view, not a builder.

**Route:** `/portal` — separate from the main dashboard, optimized for large screens

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│  [Logo]  Slate360 Tour Portal    [Org Name]  [Logout]│
├──────────────┬──────────────────────────────────────┤
│              │                                      │
│  Project     │   360 Viewer (large, full height)    │
│  List        │                                      │
│              │   ├─ Scene strip (bottom thumbnail   │
│  ├─ Project A│     row, scrollable)                 │
│  ├─ Project B│                                      │
│  ├─ Project C│   Meeting Mode button (top right)    │
│              │                                      │
└──────────────┴──────────────────────────────────────┘
```

**Features:**
- Login via existing Supabase auth (same session)
- Project list on left — click to expand project's tours
- Tour opens in large viewer pane on right
- Scene navigation: thumbnail strip at bottom (click to jump), prev/next keyboard arrows
- "Start Meeting" button appears for hosts — generates meeting session URL to share
- "Fullscreen" button for presentation mode
- No builder controls visible — read-only portal for viewers and meeting attendees

**Route:** `app/(portal)/portal/page.tsx` — separate layout from `(dashboard)` to keep clean
**Auth:** Reuse existing `withAuth()`, add portal entitlement check (`canAccessTeamPortal`)

#### 3. Team / Seat Management

- Org admin can invite team members to the tour portal
- Each seat has a role: `owner`, `builder` (can create/edit tours), `viewer` (view only, meeting attendance)
- Viewer seats are cheaper — enables "add your whole team as viewers" upsell
- Schema: extend `org_memberships` table with `portal_role ENUM('owner', 'builder', 'viewer')`

#### 4. White-Label Portal

- Enterprise tier: org can set custom logo, brand color, and subdomain alias for the portal
- `/portal` shows org logo instead of Slate360 logo
- Embed viewer removes "Powered by Slate360" watermark
- Custom subdomain (`tours.theircompany.com → slate360.ai/portal?org=xxx`) — Phase 4

#### 5. Bulk Licensing — Company Seat Purchase and Employee Download Flow

Enterprise customers (realtor offices, GC companies, capital program departments) need a way to buy a block of seats once and distribute access to employees — without requiring each employee to go through individual checkout.

**How it works:**

```
Company admin buys "Tour Builder Enterprise" or "Team" plan
  → Stripe checkout for the org (monthly or annual)
  → Org gets N seats set in org_feature_flags (e.g., seat_limit = 25)
  → Admin lands on the Enterprise Portal management page
  → Admin sees: "Your plan includes 25 seats. 3 used. 22 remaining."
  → Admin clicks "Invite Team Members" → sends invite emails
  → Each invite email contains a magic link: /portal/accept-invite?token=ABC
  → Employee clicks link → creates or links a Slate360 account → granted portal_role='viewer' or 'builder'
  → Employee can now access the portal without any individual payment
```

**Seat exhaustion UX:**
- When all seats are filled, new invites fail with: "You've used all 25 seats on your plan. Upgrade to add more."
- Upgrade CTA: contact form for Custom tier, or self-serve upgrade to next tier

**App store install for employees (Mobile):**
- For iOS/Android: employees download from App Store / Google Play using their own Apple/Google accounts
- They sign in with their Slate360 credentials (email + password, or Google OAuth)
- Entitlement check happens on login: if their account has a portal seat, they get full app access
- No app store redemption codes needed — the access is tied to the account, not the download

**Volume discount model:**
| Seats | Per-Seat Price | Monthly Total |
|---|---|---|
| 1 (standalone) | $49/seat | $49/mo |
| 5 (Team) | $30/seat | $149/mo |
| 25 (Enterprise) | $20/seat | $499/mo |
| 50+ (Custom) | Contact us | — |

**Schema additions for seat management:**
```sql
-- Extend org_feature_flags to track seat counts
ALTER TABLE org_feature_flags
  ADD COLUMN tour_builder_seat_limit INT DEFAULT 1,
  ADD COLUMN tour_builder_seats_used INT DEFAULT 0;

-- Invite tokens for employee onboarding
CREATE TABLE org_invite_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  email TEXT NOT NULL,
  portal_role TEXT NOT NULL DEFAULT 'viewer', -- 'builder' | 'viewer'
  token TEXT UNIQUE NOT NULL,
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  created_by UUID REFERENCES auth.users(id)
);
```

**Security notes:**
- Invite tokens must be single-use and expire
- Token must be validated server-side (not just client-side)
- On token acceptance, atomically increment `tour_builder_seats_used` and check it does not exceed `tour_builder_seat_limit`
- If seats are full when the invite is accepted, reject with a clear message

### Enterprise Prompt Sequence (Phase 3, after Prompts 9–11)

| Prompt | Task |
|---|---|---|
| E1 | Enterprise Stripe products + entitlements (`tour_builder_team`, `tour_builder_enterprise`) |
| E2 | Portal route + layout (`app/(portal)/portal/`) + project/tour navigation |
| E3 | Meeting mode: session table + Supabase Realtime scene sync |
| E4 | Team seat management: invite flow, role assignment, seat count enforcement |
| E5 | White-label branding: org logo in portal, embed watermark removal for enterprise |

**Group E Total: 5 prompts**
**Dependency:** Prompts 9–11 complete (standalone subscription working)

### Enterprise Go-To-Market

Enterprise does NOT sell through the app store. It sells through:

1. **Direct email to capital program offices** — county/city/state infrastructure departments, university facilities, hospital construction programs. They all have recurring OAC meetings where a 360 tour tool would be used every week.
2. **Realtor association outreach** — one email to a local NAR chapter or brokerage network, offer a 30-day team trial.
3. **GC company-wide deals** — if you have one GC superintendent already using standalone, pitch upgrading to a team plan for their company.
4. **Demo video specific to the use case** — show a Zoom OAC meeting with Meeting Mode running. That 90-second demo sells itself.

Target: 3 Enterprise contracts at $499/mo = $1,497/mo in addition to standalone subscribers. That closes the gap between the standalone subscriber ramp and the $7k/month goal significantly faster.
