# ChatGPT Fact-Finding Handoff — Slate360

Date: 2026-05-12
Repository: `bcvolker/slate360-rebuild`
Branch audited: `main`
HEAD audited: `fc1cb7e1fb3da6f0379be253f974da1ed2b76ae0`
Scope: fact-finding only. No app behavior changes, refactors, migrations, dependency changes, commits, or pushes were performed during this documentation pass.

## 1. Executive Current-State Summary

Slate360 is a Next.js 15 / React 19 / TypeScript SaaS platform backed by Supabase, Cloudflare R2/S3-compatible storage, Vercel, and Trigger.dev. The immediate product goal is a safe Foundational/App Store release with a complete Slate360 app shell and Site Walk as the only fully visible/usable app.

The highest-priority technical blocker is no longer plan PDF rasterization. Trigger.dev server-side rasterization is confirmed working in production after commit `fc1cb7e`. Plans can now be converted to server-generated WebP images and opened through the mobile Leaflet plan viewer. The remaining release blocker is the Site Walk plan long-press/pin/capture loop: long press or draw-pin should open capture/data, persist a numbered plan pin/finding/stop, attach photo/note/metadata/details, and return to a trustworthy plan state.

Current readiness by area:

- Plan rasterization: fixed and production-verified.
- Plan viewing: mobile architecture is now correct in principle: Leaflet + WebP, no browser PDF rendering on mobile.
- Plan pin/capture persistence: still blocked; likely ID/lifecycle mismatch between optimistic local pins and persisted UUID pins.
- Shell/App Store mode: exists and mostly hides unfinished modules, but direct routes and filler content still need final audit/hardening.
- Approval gate: implemented through profile/account status and middleware; operations approval UX is partial.
- SlateDrop: strong backend/file backbone; several UI surfaces are partial or design-only.
- Deliverables/reports: schema/API/public viewer pieces exist; builder/share/send workflow is partial.
- PWA/App Store: manifest exists; current service worker is a kill switch with no offline behavior; no Capacitor config found.

## 2. Latest Git, Deployment, Trigger, and Validation Status

### Git

Commands run:

- `git branch --show-current`
- `git rev-parse HEAD`
- `git status --short`
- `git log --oneline -10`
- follow-up `git status --short && git rev-parse HEAD && git rev-parse origin/main`

Observed results:

- Branch: `main`
- HEAD: `fc1cb7e1fb3da6f0379be253f974da1ed2b76ae0`
- `origin/main`: `fc1cb7e1fb3da6f0379be253f974da1ed2b76ae0`
- Working tree was clean before these two handoff docs were created.
- Most recent commit: `fc1cb7e fix(site-walk): stabilize Trigger plan rasterization`

Recent commits:

1. `fc1cb7e fix(site-walk): stabilize Trigger plan rasterization`
2. `0a30d0d fix(site-walk): repair Trigger dispatch and surface plan conversion failures`
3. `0b43f0c fix(site-walk): surface plan uploads and rescue stale plan raster jobs`
4. `840cc3b fix: restore plan uploader UI, fix 404 nav, add Generate Mobile View for old plans`
5. `67e018b fix: trap Vercel→Trigger dispatch errors to database`
6. `e547981 fix: hard revert client pdf rendering, enforce trigger architecture, fix capture loop`
7. `81bd284 fix(site-walk): browser-side PDF rendering, RLS policies, safe Trigger.dev guard`
8. `4eb5fb6 fix: resolve BUG-081 hub overflow and BUG-080 toolbar gating`
9. `d7cc481 fix(site-walk): remove canary banner, debug badge, force cache nuke, mobile plan processing state`
10. `dd51c1c chore: enable supabase realtime for plan sheets`

### Trigger.dev

- Project: `proj_ydquoejbfqidzbjioyno`
- Task: `plan.rasterize`
- Latest verified worker version: `20260512.15`
- Production run confirmed successful before this audit: `run_cmp2qvnvg3hs30iodbk44x6y1`
- Confirmed effect: a `site_walk_plan_sheets.rasterized_key` was populated for a production plan sheet.

Conclusion: Trigger rasterization is confirmed working in production. Older plan sets without raster output may still require manual retry/backfill through the existing Generate Mobile View route.

### Vercel

Vercel deployment list was accessible enough to show URLs. Latest listed URL during audit:

- `https://slate360-rebuild-x342dhs85-slate360.vercel.app`

A detailed inspect attempt produced no useful status output. Exact latest Vercel deployment state is therefore partially unknown from this audit. Main branch is pushed; Vercel normally auto-deploys from `main`.

### Validation Commands

`npm run typecheck`

- Result: passed.
- Output: `tsc --noEmit` completed successfully.

`npm run build`

- Result: passed with warnings.
- Warnings observed:
  - Sentry warning about deprecated `sentry.client.config.ts` setup.
  - `instrumentation.ts` top-level await/async target warning.
  - Webpack cache string-size performance warnings.
  - ESLint plugin warning.
- Static pages generated: `86/86`.
- Build route list still includes many non-Site-Walk surfaces and hidden/blocked route risks.

`npm run verify:release`

- Result: failed/blocked.
- Blocking bug: `BUG-079 (critical, open): Plan Viewer + capture flow architecturally broken on mobile — 7 commits failed`.

`bash scripts/check-file-size.sh || true`

- Result: failed on pre-existing oversized files.
- Oversized files reported:
  - `app/api/dashboard/widgets/route.ts` — 345 lines
  - `components/calendar/CalendarWidget.tsx` — 466 lines
  - `app/_color-audit/page.tsx` — 387 lines
  - `components/dashboard/DashboardWidgetRenderer.tsx` — 547 lines
  - `components/dashboard/LocationMap.tsx` — 1892 lines
  - `app/dev/capture-picker-proof/page.tsx` — 319 lines
  - `components/marketing-homepage.tsx` — 1164 lines
  - `components/project-hub/ObservationsClient.tsx` — 335 lines
  - `components/project-hub/ProjectDashboardGrid.tsx` — 534 lines
  - `components/project-hub/WizardLocationPicker.tsx` — 412 lines
  - `components/settings/AccountSettingsClient.tsx` — 547 lines
  - `app/site-walk/(act-2-inputs)/capture/_components/CaptureClientIsland.tsx` — 305 lines
  - `components/ui/sidebar.tsx` — 726 lines
  - `components/widgets/WidgetBodies.tsx` — 475 lines

`npm run guard:architecture`

- Result: passed.
- Output: no forbidden import-direction or API auth-pattern violations found.

`npm run guard:file-size-regression`

- Result: failed.
- New over-threshold files reported:
  - `app/dev/capture-picker-proof/page.tsx: 319`
  - `app/site-walk/(act-2-inputs)/capture/_components/CaptureClientIsland.tsx: 305`
  - `components/settings/AccountSettingsClient.tsx: 547`

## 3. Authoritative Planning and Memory Files

Current authoritative or important files found:

- `SLATE360_PROJECT_MEMORY.md` — required startup memory; latest handoff confirms Trigger PDF rasterizer fix.
- `SLATE360_MASTER_BUILD_PLAN.md` — single source for overall product architecture.
- `docs/SITE_WALK_MASTER_ARCHITECTURE.md` — current Site Walk architecture reference.
- `slate360-context/ONGOING_ISSUES.md` — current active bugs and bug history.
- `ops/bug-registry.json` — machine-readable bug registry; release gate uses it.
- `docs/SLATE360_PRODUCT_DOCTRINE.md` — locked product doctrine.
- `docs/SLATEDROP_ARCHITECTURE.md` — locked SlateDrop architecture.
- `docs/APP_STORE_AND_OFFLINE_STRATEGY.md` — locked App Store/offline strategy.
- `docs/ENTITLEMENTS_AND_PROJECT_MODEL.md` — locked entitlements/project model.
- `.github/copilot-instructions.md` — current Copilot/project working rules.

Missing from current root paths but found archived:

- `docs/COMPLETION_AUDIT.md` — archived at `_archived_context/docs/COMPLETION_AUDIT.md`.
- `slate360-context/DESIGN_SYSTEM.md` — archived at `_archived_context/slate360-context/DESIGN_SYSTEM.md`.
- `docs/site-walk/SITE_WALK_V1_3_ACT_WORKFLOW_PLAN.md` — archived at `_archived_context/docs/site-walk/SITE_WALK_V1_3_ACT_WORKFLOW_PLAN.md`.

Missing:

- `AGENTS.md` — not found.

Stale/historical files:

- `CRITICAL_FAILURE_REPORT_MAY.md` is now partially superseded. It predates the final Trigger rasterization fix and should not be treated as authoritative for the current rasterization state.
- `SECOND_OPINION_DOSSIER.md` is historical; some questions there are now answered by the server-side rasterization fix.
- `patch_memory.js` contains stale/conflicting text seen in grep output about `@napi-rs/canvas` being removed in favor of standard `canvas`; current code uses `@napi-rs/canvas` and Trigger verifies it.

## 4. Product Doctrine and App Store Scope

The current product doctrine is Foundational Release first:

- Ship a polished Slate360 shell.
- Make Site Walk the only fully visible/usable app for V1/App Store exposure.
- Hide unfinished apps rather than showing Coming Soon/filler/demo states.
- Preserve backend and route code if needed, but do not expose unfinished features in user-facing V1 surfaces.
- Avoid “vibe-coded” filler, fake data, dead CTAs, or beta/test/demo wording in release-facing UI.

`lib/app-store-mode.ts` currently defines:

```ts
export const APP_STORE_MODE = process.env.NEXT_PUBLIC_APP_STORE_MODE !== "false";

export function shouldHideInAppStoreMode(comingSoon?: boolean) {
  return APP_STORE_MODE && Boolean(comingSoon);
}
```

This hides only things marked `comingSoon`. It does not automatically hide compiled/direct routes or unfinished surfaces that are not marked correctly.

## 5. Organization, Leadership, Collaboration, and Approval Model

Verified architectural facts:

- Core organization model exists through `organizations` and `organization_members`.
- `organization_members.role` supports roles including owner/admin/member/viewer.
- `resolveServerOrgContext()` derives:
  - `orgId`
  - `orgName`
  - `tier`
  - `role`
  - `isAdmin`
  - `isViewer`
  - `canEditOrg`
  - internal access flags
  - beta approval flags
  - enterprise-style permissions
- Internal operations access is separate from subscription entitlements.
- Approval gate exists in `middleware.ts` through `profiles.account_status`, `profiles.is_app_reviewer`, and owner bypass.
- Unapproved users on protected routes are redirected to `/pending-verification`.

Important code behavior:

- `resolveServerOrgContext()` sorts memberships by role rank and picks the highest-rank membership.
- Viewer role is explicitly read-only: `isViewer` and `canEditOrg` are derived server-side.
- `middleware.ts` protects dashboard/projects/slatedrop/project-hub/site-walk/account/coordination/settings/apps/operations routes.
- `middleware.ts` redirects legacy `/ceo` to `/operations-console`.

Readiness assessment:

- Enterprise org model: strong foundation.
- Project collaborator model: mostly present via project member/invite patterns, but end-to-end cross-org collaboration UX was not fully validated in this pass.
- ASU leadership/read-only oversight: schema model supports viewer role, but dedicated leadership/exec viewing UI appears partial or unknown.
- Approval gate: server path is present; operations console approval UX is partial and needs end-to-end smoke testing.

## 6. SlateDrop Backbone

SlateDrop is the shared file backbone. Audited findings:

- SlateDrop routes and APIs exist under `app/slatedrop` and `app/api/slatedrop`.
- Canonical folders should be `project_folders`; legacy `file_folders` should not be used for new folder writes.
- `lib/slatedrop/storage.ts` builds keys like `orgs/{namespace}/{folderId}/{timestamp}_{safeName}`.
- Site Walk photo captures are bridged to SlateDrop through `lib/site-walk/slatedrop-bridge.ts`.
- `bridgePhotoToSlateDrop()` resolves the project Photos folder, inserts `slatedrop_uploads`, links `site_walk_items.file_id`, and tracks storage.
- `bridgePdfToSlateDrop()` exists for deliverable PDFs and resolves the Deliverables folder.

Partial/unknown:

- Recents/Shared/Requests UI was reported as design-only or not fully wired in prior audit output.
- Plan rasterized WebP files are stored in R2 and referenced by `site_walk_plan_sheets.rasterized_key`, but are not necessarily surfaced as SlateDrop files.
- Deliverable export-to-SlateDrop is supported by helper code, but the end-to-end user flow was not validated.

## 7. Site Walk Workflow Map

Major Site Walk surfaces and expected flow:

1. `/site-walk` — app landing/home.
2. `/site-walk/setup` — project/session setup and plan upload.
3. `/site-walk/capture` — active capture surface.
4. `/site-walk/walks` and walk detail routes — review sessions/stops.
5. `/site-walk/deliverables` — report/deliverable surfaces.
6. `/site-walk/slatedrop` — Site Walk-related file view.

Important architecture:

- Capture routes run full-bleed in `AppShell`; no global shell chrome during active capture.
- Mobile plan viewing should use Leaflet/WebP only.
- Browser-side PDF rendering on mobile is intentionally forbidden due to WebKit/canvas memory crash risk.
- Plan upload dispatches Trigger rasterization and produces `site_walk_plan_sheets` rows with `rasterized_key`, `rasterized_width`, and `rasterized_height`.

## 8. Critical Plan Long-Press / Pin / Capture Trace

This is the current release blocker.

### Current mobile plan renderer path

`components/site-walk/capture/PlanViewer.tsx` chooses mobile behavior:

```ts
const hasRasterized = planSheets.length > 0 && planSheets.some((s) => s.rasterized_key != null);
const usingLeaflet = isMobile && hasRasterized;
```

Mobile without rasterized sheets shows processing/generate/upload states. Mobile with rasterized sheets uses `PlanViewerLeaflet`.

### Leaflet plan pin path

`components/site-walk/capture/PlanViewerLeaflet.tsx` handles pin creation in draw mode with Leaflet map click:

```ts
const newPin: PlanViewerPin = {
  id: Math.random().toString(36).slice(2),
  x_pct: xPct,
  y_pct: yPct,
  session_id: sessionId,
  label: String(pins.length + 1).padStart(2, "0"),
  amber: true,
  item_id: null,
};
setPins((current) => [...current, newPin]);
setQuickMenu({ pinId: newPin.id, xPct, yPct });
```

### PDF/fallback plan pin path

`components/site-walk/capture/planViewerModel.ts` builds optimistic pins with non-UUID local IDs:

```ts
return { id: Math.random().toString(36).slice(2), x_pct: xPct, y_pct: yPct, session_id: sessionId, label: String(count).padStart(2, "0"), amber: true, item_id: null };
```

`components/site-walk/capture/PlanViewerPdf.tsx` then passes this random ID into the quick menu:

```ts
setPins((current) => [...current, nextPin]);
setActivePinId(nextPin.id);
setQuickMenu({ pinId: nextPin.id, xPct: nextPin.x_pct, yPct: nextPin.y_pct });
```

### Quick action → capture context path

`components/site-walk/capture/PlanQuickActionMenu.tsx` passes the pin target into capture context:

```ts
const target = { pinId, planSheetId, xPct, yPct };
captureCtx.setPlanTarget(target);
if (input) captureCtx.requestCapture(input, "plan_pin");
```

The context now has a synchronous picker mechanism, but `PlanQuickActionMenu` still uses `requestCapture()`, which falls back to effect-based behavior if the sync ref is unavailable.

### Upload → attach pin path

`lib/hooks/useCaptureUpload.ts` creates the capture item and then attaches it to a pin:

```ts
const savedPinId = target.pinId && isUuid(target.pinId) ? target.pinId : null;
if (savedPinId) {
  await fetch(`/api/site-walk/pins/${encodeURIComponent(savedPinId)}`, { method: "PATCH", ... });
  return;
}
await fetch("/api/site-walk/pins", { method: "POST", body: JSON.stringify({ plan_sheet_id: target.planSheetId, item_id: itemId, ... }) });
```

Likely blocker:

- The plan viewer creates an optimistic pin with a random non-UUID ID.
- The capture upload path rejects that ID as unsaved.
- It creates a new server pin through `POST /api/site-walk/pins` instead of updating the optimistic pin.
- The UI may retain or display the optimistic local pin while the persisted UUID pin is separate.
- This can produce orphaned optimistic state, duplicate pins, wrong numbering, or apparent failure after returning to the plan.

Additional possible failure points:

- `usePlanGestures()` says long-press works in both pan and draw mode, while UI hint says pan navigates and draw pins. This mismatch may confuse diagnostics.
- iOS/Safari user activation may be lost if file input opening occurs outside the original click/tap call stack.
- Pin labels are UI-derived from `pins.length + 1`, while server inserts may store `pin_number` as null and label as `Plan-linked capture` in the POST fallback.
- Coordinate merging after refetch relies on proximity and fetched state behavior; this needs direct verification.

Minimum next fix direction for ChatGPT planning:

1. Decide whether draft pins should be persisted immediately on plan tap/long-press, returning a real UUID before capture begins, or whether no local pin should be displayed until item+pin POST completes.
2. Make one ID lifecycle authoritative: either `client_pin_id` maps local-to-server, or the UI always uses persisted UUIDs.
3. Make numbering server-backed and stable, not derived only from local array length.
4. Ensure camera/file picker opens synchronously from the quick action button on iOS.
5. After item+pin save, refetch or realtime-update pins before navigating/displaying success.

## 9. Trigger Rasterization Audit

Current files:

- `src/trigger/rasterize.ts`
- `trigger.config.ts`
- `lib/types/pdfjs-worker.d.ts`
- `package.json`
- `package-lock.json`

Important current behavior:

- Trigger task ID: `plan.rasterize`.
- Loads plan PDF from R2/S3 via signed URL.
- Dynamically imports `@napi-rs/canvas`.
- Shims `process.getBuiltinModule`.
- Installs `DOMMatrix`, `Path2D`, and `ImageData` on `globalThis`.
- Dynamically imports `pdfjs-dist/legacy/build/pdf.mjs`.
- Dynamically imports/registers `pdfjs-dist/legacy/build/pdf.worker.mjs`.
- Renders pages with PDF.js into canvas.
- Converts raw canvas image data to WebP with Sharp.
- Writes WebP to R2/S3.
- Updates `site_walk_plan_sheets.rasterized_key`, `rasterized_width`, and `rasterized_height`.
- Marks `plan_raster_jobs` completed or failed.

Important excerpt from `trigger.config.ts`:

```ts
extensions: [
  additionalPackages({ packages: ["@napi-rs/canvas"] }),
  syncEnvVars(() => pickTriggerEnv()),
],
```

Known code-quality caveat:

- `src/trigger/rasterize.ts` still contains local `any` usage in `NodeCanvasFactory.reset`, `renderContext`, and catch handling. This predates/comes from the emergency fix and violates the repo’s no-`any` rule. Do not refactor it during the fact-finding task, but include it in a later cleanup plan if touching the file.

## 10. App Shell, Layout, and Navigation

Canonical shell files:

- `components/dashboard/AppShell.tsx`
- `components/dashboard/command-center/DashboardSidebar.tsx`
- `components/dashboard/command-center/DashboardTopBar.tsx`
- `components/shared/MobileTopBar.tsx`
- `components/shared/MobileBottomNav.tsx`
- `components/shared/MobileInstallStrip.tsx`

Important shell behavior:

- Active capture surfaces are full-bleed:
  - `/site-walk/capture`
  - `/site-walk/walks/active/:id`
- Mobile bottom nav switches between platform nav and Site Walk nav based on pathname.
- Platform mobile nav currently includes Home, Projects, SlateDrop, Coordination, Account.
- Site Walk mobile nav includes Home, Walks, Deliverables, More.
- Dashboard sidebar currently shows Dashboard, Projects, SlateDrop, Account, and Operations Console when authorized.
- Apps grid currently exposes only Site Walk as an app tile.

Risk:

- Routes can still compile/exist even if hidden from nav. Middleware blocks several placeholder routes but a full direct-route audit is still needed before App Store submission.

## 11. Design System and Theme Token Audit

Current known design direction:

- Dark glass + amber style.
- Shared components like `GlassCard` are expected.
- App shell uses dark backgrounds and amber active states.

Findings:

- `slate360-context/DESIGN_SYSTEM.md` is missing from the current path but has an archived copy.
- Hardcoded colors remain in several shell/Site Walk/SlateDrop files, for example `#0B0F15`, `#f59e0b`, and inline Leaflet marker HTML colors.
- This is not necessarily a release blocker if visually consistent, but it is a maintenance/design-token debt.

## 12. Vibe-Coded / Filler / Hidden App Audit

Findings from the read-only audit:

- App Store mode exists and apps grid exposes only Site Walk.
- Middleware blocks direct user access to several hidden/placeholder modules:
  - `/tours`
  - `/design-studio`
  - `/content-studio`
  - `/geospatial`
  - `/virtual-studio`
  - `/analytics`
  - `/tour-builder`
- Some routes still build and appear in the Next.js route list, including hidden or non-V1 surfaces.
- Placeholder/Coming Soon-style routes or text were reported in hidden modules and some account/project surfaces.
- Geospatial and Virtual Studio appear placeholder/ComingSoon and should remain hidden or be removed from V1 exposure.

Recommended planning rule:

- For V1, hide or redirect unfinished modules at the route/middleware layer and remove user-facing Coming Soon/filler content from App Store-exposed surfaces.

## 13. Approval Gate and Operations Console

Server-side facts:

- `middleware.ts` redirects unapproved users from protected routes to `/pending-verification`.
- Bypasses include owner email and `profiles.is_app_reviewer`.
- `resolveServerOrgContext()` derives `canAccessOperationsConsole` from owner/staff status rather than entitlements.
- Dashboard sidebar only shows Operations Console if `hasOperationsConsoleAccess` is true.

Partial/unknown:

- Full Operations Console approval workflow was not end-to-end tested in this audit.
- Whether all pending-user edge cases are App Store-review-safe is unknown.

## 14. Realtime, Notifications, Feedback, and Coordination

Findings from read-only audit/subagents:

- Realtime hooks exist for Site Walk items/pins and plan sheets.
- `lib/hooks/usePlanSheetsRealtime.ts` was previously introduced so rasterized sheets can appear without full refresh.
- Internal comments schema/API/UI are partial.
- Coordination inbox is a placeholder/partial experience.
- Notifications are mostly missing or not production-complete.
- SMS was not found in this audit.

Release implication:

- Realtime plan updates are important to Site Walk V1.
- Broader notifications/coordination should not be over-promised in V1 App Store surfaces unless completed.

## 15. Deliverables, Reports, Sharing, and Read Receipts

Findings:

- Deliverables schema/API/public viewer/email pieces exist.
- `bridgePdfToSlateDrop()` exists to place generated PDFs into the project Deliverables folder.
- Report builder/block-editor workflow appears scaffolded or partial.
- Share/send audit and read receipt UI appear incomplete.

V1 recommendation:

- Define a minimum deliverable flow only if required for the App Store build: e.g., generate simple report from saved Site Walk stops, save PDF to SlateDrop, open/share link.
- Otherwise hide incomplete report-builder affordances from release-facing UI.

## 16. Backend, Supabase, Storage, and Entitlements

Backend foundations:

- Supabase clients exist for browser/server/admin usage.
- API auth wrappers and response helpers exist and should be used.
- Org context resolver exists and is central to access decisions.
- RLS/migrations appear broad, but this audit did not run migrations or DB schema introspection.
- Storage helper stack supports R2/S3.

Entitlements:

- `lib/entitlements.ts` defines current tiers: `trial`, `standard`, `business`, `enterprise`.
- Legacy `creator` and `model` map to `standard`.
- Operations Console is intentionally not an entitlement; it is internal/staff gated.
- Standalone app access comes from org feature flags, including `standalone_punchwalk` for Site Walk.

Storage:

- SlateDrop storage keys are namespace/folder based.
- Site Walk captures can bridge into SlateDrop Photos folders.
- Plan raster images are stored separately as rasterized keys on plan sheet rows.

Unknowns:

- Exact production RLS coverage was not revalidated in this pass.
- Exact Supabase realtime publication membership was not revalidated in this pass.
- Local `.env.local` values were not printed or exposed.

## 17. PWA, Capacitor, and App Store Readiness

Findings:

- `app/manifest.ts` exists.
- `app/sw.ts` is an emergency kill-switch service worker that clears caches, not an offline-capable PWA service worker.
- No Capacitor config was found in the audit.
- Mobile shell uses safe-area-aware bottom nav and install strip.
- App Store mode is implemented but only hides flagged `comingSoon` items.

App Store readiness risks:

- Need to ensure all App Store-visible surfaces avoid unfinished modules, dead buttons, debug text, mock data, and Coming Soon language.
- Need real on-device iOS testing for plan pin/capture flow and file/camera user activation.
- Offline behavior should not be marketed if service worker remains a kill switch.

## 18. Build/Test/Guardrail Status

Current status:

- TypeScript: passing.
- Production build: passing with warnings.
- Release verification: blocked by BUG-079.
- Architecture guard: passing.
- File-size guard: failing on existing oversized files.
- File-size regression guard: failing on three files.

Implication:

- The next implementation plan should not start with broad refactors. It should fix the Site Walk pin/capture blocker in small slices, while avoiding growing existing over-limit files.
- If touching `CaptureClientIsland.tsx`, extract first or keep changes minimal enough to satisfy the repo rule.

## 19. Prioritized File List

See companion file: `docs/CHATGPT_FACT_FINDING_FILE_LIST.txt`.

## 20. Recommended Next Build Plan

Recommended order for ChatGPT to turn into safe Copilot/Codex prompts:

1. Write a diagnostic-first plan for Site Walk plan pin/capture persistence.
   - Trace `PlanViewerLeaflet` → `PlanQuickActionMenu` → `CaptureContext` → `useCaptureFileHandler` → `useCaptureUpload` → `/api/site-walk/items` → `/api/site-walk/pins` → returned UI state.
   - Add temporary logs only if needed and remove before release.
2. Fix pin identity lifecycle.
   - Prefer one of two designs:
     - Persist draft pin immediately and use server UUID for capture attach; or
     - Do not create a displayed local pin until item+pin save succeeds.
   - If preserving optimistic UI, use `client_pin_id` to reconcile local and server pins.
3. Fix pin numbering/labels.
   - Server should assign stable `pin_number` or label consistently.
   - UI should display server numbering after refetch/realtime.
4. Fix iOS picker activation.
   - Ensure camera/upload input opens synchronously inside the quick action button handler.
   - Avoid effect-deferred `.click()` for the plan-pin capture path.
5. Confirm save-and-return.
   - After photo/note/details save, refetch or wait for realtime pin/item update before showing success/returning to plan.
6. App Store exposure pass.
   - Confirm Site Walk-only app tile behavior.
   - Confirm hidden routes redirect.
   - Remove/replace Coming Soon/filler/debug text from visible surfaces.
7. Approval gate smoke test.
   - Test approved, pending, app reviewer, owner/staff, and normal invited user paths.
8. Deliverables minimum viable flow decision.
   - Either finish a minimal Site Walk report/share flow or hide unfinished report-builder UI.
9. PWA/App Store decision.
   - Decide whether V1 ships with kill-switch SW/no offline or invests in tested offline caching.
10. Guardrail cleanup as needed.
   - Do not refactor everything; only extract files touched by the blocker if needed.

## 21. Appendix — Short Key Code Excerpts

### Mobile viewer gate

From `components/site-walk/capture/PlanViewer.tsx`:

```ts
const hasRasterized = planSheets.length > 0 && planSheets.some((s) => s.rasterized_key != null);
const usingLeaflet = isMobile && hasRasterized;
```

### Leaflet optimistic pin creation

From `components/site-walk/capture/PlanViewerLeaflet.tsx`:

```ts
const newPin: PlanViewerPin = {
  id: Math.random().toString(36).slice(2),
  x_pct: xPct,
  y_pct: yPct,
  session_id: sessionId,
  label: String(pins.length + 1).padStart(2, "0"),
  amber: true,
  item_id: null,
};
```

### Quick action target

From `components/site-walk/capture/PlanQuickActionMenu.tsx`:

```ts
const target = { pinId, planSheetId, xPct, yPct };
captureCtx.setPlanTarget(target);
if (input) captureCtx.requestCapture(input, "plan_pin");
```

### Attach logic branch

From `lib/hooks/useCaptureUpload.ts`:

```ts
const savedPinId = target.pinId && isUuid(target.pinId) ? target.pinId : null;
```

### Pin API accepts saved UUIDs

From `app/api/site-walk/pins/[id]/route.ts`:

```ts
const { id } = await ctx.params;
if (!isUuid(id)) return badRequest("Pin id must be a saved UUID");
```

### Trigger canvas runtime

From `src/trigger/rasterize.ts`:

```ts
const importedCanvas = await import("@napi-rs/canvas") as CanvasRuntimeImport;
canvasRuntime = typeof importedCanvas.createCanvas === "function"
  ? importedCanvas
  : importedCanvas.default ?? null;
```

### Trigger build package inclusion

From `trigger.config.ts`:

```ts
additionalPackages({ packages: ["@napi-rs/canvas"] }),
```

### Service worker kill switch

From `app/sw.ts`:

```ts
await clearAllCaches();
await self.clients.claim();
await notifyClients("SLATE360_SW_KILL_RELOAD");
await self.registration.unregister();
```

## 22. Unknowns and Verification Needed

Unknown or not fully verified in this pass:

- Exact latest Vercel deployment status beyond URL listing.
- Full production DB schema/RLS state after latest migrations.
- Supabase realtime publication membership for all relevant tables.
- Actual iOS hardware behavior for quick action → camera/upload picker.
- Whether all App Store-visible routes are clean under `NEXT_PUBLIC_APP_STORE_MODE`.
- Full Operations Console approval path.
- Full ASU leadership viewer/cross-org collaborator UX.
- Full SlateDrop Recents/Shared/Requests production wiring.
- Full deliverable/report/share/read-receipt flow.

Most important factual conclusion: Trigger rasterization is working; BUG-079 remains the release blocker because the plan pin/capture/data persistence workflow is not yet reliable.
