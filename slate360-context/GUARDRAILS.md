# Slate360 — Code Guardrails & Refactoring Rules

**Last Updated:** 2026-03-03
**Context Maintenance:** Update this file when new guardrails are established, known violations are fixed, or DB tables are added.
**Cross-reference:** See `FUTURE_FEATURES.md` for the full phased build roadmap (Phases 0–7).

---

## 1. Hard Rules (Never Break These)

### Rule 0: Source of Truth References
Before modifying any file, check:
- `lib/entitlements.ts` for tier/feature gating
- `lib/server/api-auth.ts` for auth patterns
- `lib/types/api.ts` for route context types
- `SLATE360_PROJECT_MEMORY.md` for project-wide rules

### Rule 1: No Inventing Database Columns
Never reference a column that doesn't exist in production. Known tables and their verified columns are listed in `slate360-context/BACKEND.md` §8.

### Rule 2: No Duplicate Supabase Clients
Use exactly ONE client pattern per context:
```typescript
// Browser: createClient() from lib/supabase/client
// Server: createServerSupabaseClient() from lib/supabase/server
// Admin: createAdminClient() from lib/supabase/admin
```

### Rule 3: No New Folder Creation Code Paths
All folder provisioning goes through `lib/slatedrop/provisioning.ts` and `POST /api/slatedrop/provision`. Do not create new folder creation logic.

### Rule 4: No New Entitlement System
All tier checks use `getEntitlements(tier)` or `getEntitlements(tier, { isSlateCeo })` from `lib/entitlements.ts`. Never inline tier comparisons. The CEO override (`isSlateCeo`) returns enterprise entitlements regardless of DB tier.

### Rule 4b: CEO Tab Is Not A Tier Feature
The CEO Command Center (`/ceo`), Market Robot (`/market`), and Athlete360 (`/athlete360`) are Slate360-internal platform-admin routes. **Never gate these via `getEntitlements()`**. They are gated solely by `isSlateCeo` (and future `slate360_staff` employee grants). No subscription tier — including enterprise — gives access to these tabs. `canAccessCeo` does not exist in the `Entitlements` interface.

### Rule 5: No Orphan API Routes
Every API route must use `withAuth()` or `withProjectAuth()`. No raw Supabase queries without auth checking.

### Rule 6: Don't Break Existing Routes
Before modifying any route handler, verify it still returns the expected shape. Check for callers with grep.

### Rule 7: Preserve Hydration Guard
Never remove `isClient && _hasHydrated` from `app/(dashboard)/layout.tsx`.

### Rule 8: Preserve Credit Consumption Order
`consume_credits(org_id, amount)` must always consume monthly first, then purchased. Never change this.

### Rule 9: Mobile-First
All new UI must work on mobile viewports. Test at 375px width minimum.

### Rule 10: Standalone Routes Share Auth
Standalone app routes (e.g., `/design-studio`, `/tour-builder`) must use the same `withAuth()` / `withProjectAuth()` middleware as dashboard routes. Never create a parallel auth system for standalone apps.

### Rule 11: Feature Flags via `org_feature_flags` Table
When standalone app subscriptions are implemented (Phase 3), gating MUST use the merged entitlements pattern (`getEntitlements(tier, featureFlags)`). Never hardcode standalone access checks.

### Rule 12: PWA Manifest Must Match Entitlements
When PWA infrastructure is added (Phase 3), the service worker and manifest must respect the user’s active entitlements. Offline-cached routes must not include modules the user hasn’t subscribed to.

### Rule 13: No Standalone Routes Without SlateDrop Access
All standalone apps that handle files must use SlateDrop as the file backbone. Never create a parallel file management system for a standalone app.

### Rule 14: New Dashboard Tabs Use DashboardTabShell
All new dashboard tab pages MUST use `DashboardTabShell` from `components/shared/DashboardTabShell.tsx`. This standardizes header, spacing, nav, and theme. All shell components must accept and pass `isCeo` prop. Legacy tabs (DashboardClient, Project Hub, SlateDrop, Market) will be migrated during Phase 0B decomposition. Analytics and CEO have been migrated to DashboardTabShell (2026-03-04).

---

## 2. Refactoring Priorities

### Files Exceeding 300-Line Limit (As of 2026-03-02)

**Components (8 files over limit):**
| File | Lines | Action |
|---|---|---|
| `MarketClient.tsx` | 3,006 | Decompose into ~8 files |
| `DashboardClient.tsx` | 2,915 | Decompose into ~10 files |
| `SlateDropClient.tsx` | 2,030 | Decompose into ~7 files |
| `LocationMap.tsx` | 1,568 | Decompose into ~5 files |
| `ProjectDashboardGrid.tsx` | 524 | Extract widget renderers |
| `WidgetBodies.tsx` | 475 | Extract per-widget body files |
| `WizardLocationPicker.tsx` | 390 | Extract map/search sub-components |
| `ProjectFileExplorer.tsx` | 363 | Extract list/grid views |

**Pages (9 files over limit):**
| File | Lines | Action |
|---|---|---|
| `management/page.tsx` | 930 | Extract contract/report/stakeholder components |
| `project-hub/page.tsx` | 834 | Extract card grid, wizard, filters |
| `photos/page.tsx` | 593 | Extract gallery, upload, report components |
| `submittals/page.tsx` | 564 | Extract table, form, status components |
| `schedule/page.tsx` | 451 | Extract timeline, form components |
| `drawings/page.tsx` | 442 | Extract viewer, annotation components |
| `budget/page.tsx` | 407 | Extract table, chart, form components |
| `punch-list/page.tsx` | 388 | Extract table, form components |
| `daily-logs/page.tsx` | 343 | Extract log entry, list components |
| `rfis/page.tsx` | 324 | Extract table, form components |

### Missing Shared Infrastructure
| Target | Current Count | Goal |
|---|---|---|
| `components/ui/` components | 1 (tooltip) | 15+ (Modal, ConfirmDialog, DataTable, FormField, etc.) |
| `lib/hooks/` custom hooks | 1 (useProjectProfile) | 10+ (useProjectData, useTableState, etc.) |
| Shared type files | 1 (api.ts) | 5+ (project, slatedrop, market, account) |

---

## 3. Dependency Cleanup

| Issue | Action |
|---|---|
| Recharts + Chart.js both present | Pick one (recommend Recharts — React-native) |
| 7 Web3 packages always loaded | Lazy-load via `next/dynamic` on market pages only |
| PDF packages | Lazy-load on report-generation pages only |

---

## 4. Safe Refactoring Sequence

When decomposing a monolith file:
1. **Create the new component file** with extracted code
2. **Import it** in the original file
3. **Verify** with `get_errors` — no TypeScript errors
4. **Test** the page still renders
5. **Repeat** until original file is under 300 lines
6. **Update** the relevant `slate360-context/` blueprint

### Never Do During Refactoring
- Change data shapes or API contracts
- Rename routes
- Alter auth logic
- Modify database queries
- Add new features (refactor and feature work are separate)

---

## 5. Testing Targets

| Layer | Tool | Priority Targets |
|---|---|---|
| E2E | Playwright | Project CRUD, SlateDrop upload, auth flow |
| Integration | Vitest | `withAuth()`, `withProjectAuth()`, credit RPCs |
| Component | Vitest + Testing Library | Shared UI components (Modal, DataTable) |
| Unit | Vitest | `lib/` utilities, entitlements, billing |

Existing: `e2e/mobile-smoke.spec.ts` (1 Playwright spec). No unit/component tests.

---

## 6. Context Maintenance Checklist

When fixing tech debt, update this file if:
- [ ] An over-limit file is decomposed (remove from the table)
- [ ] A new shared component/hook is created (update goal counts)
- [ ] A dependency is consolidated or removed
- [ ] A new guardrail is needed
- [ ] A new DB table is discovered
- [ ] Standalone app routing patterns are established
- [ ] PWA infrastructure rules change
