# 360 Tour Builder — Build Guide

Last Updated: 2026-03-27
Status: Planning guide for MVP-lite

Use this file as the working memory and safe-build guide for the 360 Tour Builder before implementation starts.

## Ecosystem Context

This BUILD_GUIDE covers the core Tour Builder MVP (8 prompts). For the standalone app subscription system, Stripe setup, PWA delivery, and iOS/Android app store strategy, read:

- `slate360-context/apps/APP_ECOSYSTEM_GUIDE.md`

The Tour Builder is the **first priority app** in the ecosystem revenue-first launch order. Build it first, validate it as a standalone subscription, then use the same pattern for PunchWalk.

**Prerequisites before starting the 8-prompt sequence:**
- App Phase 1 (Stripe smoke test + Tour Builder product created): see APP_ECOSYSTEM_GUIDE.md
- App Phase 2 (`org_feature_flags` + entitlement merge): see APP_ECOSYSTEM_GUIDE.md

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

MVP-lite intentionally excludes stitching, AI, VR export, Google Street View export, MLS export, and advanced analytics.

MVP-lite includes only:

1. Create a tour record
2. Upload existing finished 360 panoramas
3. Add multiple scenes to a tour
4. Reorder scenes with drag-and-drop
5. View scenes in a 360 viewer
6. Add a tour-level PNG logo overlay
7. Adjust logo size and opacity
8. Publish a clean viewer link
9. Use the clean viewer in fullscreen for Zoom screen sharing

Optional after MVP-lite:

- Popout/new-window presenter mode
- Scene-level branding overrides
- Hotspot authoring
- Password/expiry share policies
- Embed code builder
- Analytics events

## Explicit Non-Goals For First Build

Do not include these in the first implementation pass:

- Auto-stitching or manual stitching workflows
- Hugin/queue/Lambda/Upstash infrastructure
- AI hotspot suggestions
- Advanced branding transitions or keyframes
- Deep integration with Geospatial, Content, Design, or Project Hub
- White-label custom domains
- PWA capture mode
- Multi-scene hotspot navigation editor

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

First version should support only a tour-level PNG overlay.

Required controls:

- Upload/select PNG
- Position preset: top-left, top-right, bottom-left, bottom-right
- Width or scale slider
- Opacity slider

Do not add freeform drag placement in the first build. Preset corners are safer, faster, and easier to persist.

Recommended defaults:

- Position: bottom-right
- Width: 18%
- Opacity: 0.8

## Suggested Prompt Sequence

This is the recommended prompt order for a safe MVP-lite build.

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

### Prompt 3 — Upload Pipeline For Existing Panoramas

Deliver:

- Upload route for panoramas
- S3 path convention for tours
- Panorama metadata handling only as needed

Exit criteria:

- User can upload finished panoramas without touching stitching logic

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

### Prompt 7 — Publish + Clean Viewer Route

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

Use this section to add reference material before implementation.

### Reference Platforms

- Platform name:
- Link or screenshot source:
- What is worth copying:
- What should be avoided:

### UI Requirements

- Required builder controls:
- Required viewer controls:
- Must-have layout constraints:
- Mobile behavior expectations:

### Workflow Requirements

- Create tour flow:
- Upload flow:
- Scene ordering behavior:
- Publish/share flow:

### Backend Decisions

- Table names:
- Route patterns:
- Storage path convention:
- Viewer auth model:

### Sharing / Presentation Decisions

- Viewer URL pattern:
- Public vs tokenized access:
- Fullscreen behavior:
- Popout requirement:
- Scene navigation UI:

### Branding Decisions

- Logo upload source:
- Position presets:
- Size scale range:
- Opacity range:

## Build Readiness Criteria

Start implementation only when these are decided:

1. MVP-lite scope is frozen
2. First-pass data model is approved
3. Viewer route strategy is approved
4. Branding behavior is approved
5. Pannellum integration approach is approved

## Definition Of Done For MVP-Lite

The first implementation is done when:

- A user can create a tour
- A user can upload finished 360 panoramas
- A user can reorder scenes
- A user can save and reopen the tour
- A user can add a PNG logo and adjust size and opacity
- A user can publish a clean viewer link
- A user can open the viewer in fullscreen and present it cleanly in Zoom
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
