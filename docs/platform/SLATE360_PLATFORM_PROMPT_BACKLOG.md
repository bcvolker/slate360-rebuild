# Slate360 Platform — Prompt Backlog

Last Updated: 2026-04-13

## Do Now (Safe, No Dependencies)

### P-P1: Fix TIER_MAP — Make Trial Gating Real
- Update `TIER_MAP` in `lib/entitlements.ts` so trial tier has app booleans set to `false`
- This makes nav gating functional without touching any other code
- **Why now:** P1 business gap — trial users see everything, no subscription protection

### P-P2: Extract Project Hub Monoliths (Batch 1)
- Start with the 3 worst offenders:
  - `management/page.tsx` (931 lines)
  - `photos/page.tsx` (599 lines)
  - `submittals/page.tsx` (579 lines)
- Extract into component + page pattern (page < 100 lines, logic in components)
- **Why now:** Non-negotiable #1 rule violation, 9 files over limit

### P-P3: Clean Up Admin Email Vars
- Audit all 4 admin email vars (`CEO_EMAIL`, `PRIMARY_CEO_EMAIL`, `PLATFORM_ADMIN_EMAILS`, `SLATE360_PLATFORM_ADMINS`)
- Determine which are actually used and consolidate
- **Why now:** Confusion risk, potential security issue

## After Gating Hardening

### P-P4: Make Sidebars Entitlements-Aware
- Pass entitlements to `DashboardSidebar` and `AppSidebar`
- Show/hide app links based on subscription
- Add "upgrade" badge or lock icon for inaccessible apps
- **Why now:** After TIER_MAP is fixed, sidebars need to reflect reality

### P-P5: Wire Entitlements Through WalledGardenDashboard
- `WalledGardenDashboard` currently does not pass entitlements to children
- Add entitlements prop threading or context provider
- **Why now:** Children need subscription state for conditional rendering

### P-P6: Extract Project Hub Monoliths (Batch 2)
- Remaining 6 oversized files:
  - `schedule/page.tsx` (465 lines)
  - `drawings/page.tsx` (448 lines)
  - `budget/page.tsx` (421 lines)
  - `punch-list/page.tsx` (403 lines)
  - `daily-logs/page.tsx` (358 lines)
  - `rfis/page.tsx` (339 lines)

## After Billing Fully Unified

### P-P7: Dashboard Widget Gating
- Widgets should respect subscription level
- Free/trial: limited widget set
- Paid: full widget access
- Check `DashboardWidgetRenderer` for gating hooks

### P-P8: Remove Demo Data From Production
- Audit `lib/dashboard/demo-data.ts`
- If used in production UI, replace with real data fetching
- If unused, delete

## After Dashboard Rewrite

### P-P9: E2E Test Expansion
- Currently 4 Playwright specs (`auth`, `maps-diag`, `mobile-smoke`, `route-health`)
- Add: dashboard load, project CRUD, billing flow, module navigation
- Target: one spec per critical user journey

### P-P10: PWA Offline Integration
- `lib/offline-queue.ts` exists but not integrated
- Add service worker for offline support
- Queue offline actions for sync

### P-P11: Notification System
- `project_notifications` table exists
- Build real-time notification UI
- In-app bell icon + notification drawer

## Future / Roadmap

### P-P12: Third-Party Integration Activation
- Procore, Autodesk, DocuSign, Adobe Sign credentials all present
- Build integration flows for each
- Priority: Procore (construction industry standard)

### P-P13: Real-Time Collaboration
- WebSocket support for live editing
- Presence indicators (who's viewing what)
- Cursor sharing in editors

### P-P14: White-Label / Multi-Tenant
- Org branding infrastructure exists (`lib/server/branding.ts`)
- Expand: custom domains, branded login pages, email templates
