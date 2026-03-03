# Slate360 — Architecture Readiness Actions (Prebuild)

This is the immediate execution checklist to keep upcoming module work unblocked and consistent.

## Priority 0 — Must Complete Before Major Module Builds

1. **Decompose oversized files (<300 lines rule)**
   - `components/dashboard/DashboardClient.tsx`
   - `components/dashboard/MarketClient.tsx`
   - `components/slatedrop/SlateDropClient.tsx`
   - `components/dashboard/LocationMap.tsx`

2. **Lock canonical route map for dashboard tabs**
   - Keep `/(dashboard)/tours` as canonical for 360 Tour Builder unless route migration is explicitly planned.
   - Document any aliasing strategy before implementing route duplicates.

3. **Normalize dashboard-tab uploads into canonical specs**
   - Convert each `dashboard-tabs/*.txt` spec to a corresponding `*.md` canonical file.
   - Keep raw uploads as archive/supplemental only.

4. **Standardize cross-module contracts**
   - Shared publish states: `draft | in_review | published | archived`
   - Shared job states: `queued | running | failed | canceled | complete`
   - Shared share-link policy: `passcode`, `expiresAt`, `revokedAt`, `auditLog`

## Priority 1 — High Leverage Foundations

1. **Analytics backend wiring**
   - Add report build/list/download APIs from `dashboard-tabs/analytics-reports/IMPLEMENTATION_PLAN.md`
   - Persist report metadata + generated artifacts (S3)

2. **Internal access admin UX in CEO tab**
   - Add staff grant/revoke workflow backed by `slate360_staff`
   - Add audit trail for grant changes

3. **Activity logging baseline**
   - Add/complete `project_activity_log` usage across Project Hub tool routes
   - Make analytics report sections rely on real activity/project data

4. **UI consistency layer**
   - Create missing shared components in `components/ui/` (`DataTable`, `EmptyState`, `StatusPill`, `ConfirmDialog`, `SlideOverPanel`)

## Priority 2 — Safety + Drift Prevention

1. **Context drift checks in every implementation session**
   - Follow `NEW_CHAT_HANDOFF_PROTOCOL.md`
   - Require canonical doc updates alongside route/gate/schema changes

2. **Internal-gate regression guard**
   - Add a lightweight test or lint check ensuring `/ceo`, `/market`, `/athlete360` gate by `hasInternalAccess`

3. **Analytics-definition regression guard**
   - Treat `dashboard-tabs/analytics-reports/IMPLEMENTATION_PLAN.md` as source of truth: report-builder first, dashboard charts optional and separate

## Done in this session

- Added canonical dashboard tab registry
- Added new-chat handoff protocol
- Updated project memory and Copilot instructions to include protocol + registry
- Updated dashboard/roadmap docs to match `hasInternalAccess` and analytics report-builder direction
