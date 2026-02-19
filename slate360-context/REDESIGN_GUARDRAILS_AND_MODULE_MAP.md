# Slate360 Redesign Guardrails + Module Map

This document is a **single source of truth** for redesign work. The goal is to improve UX (mobile-first) while **preserving all existing pathways/features** and **avoiding placeholders/mock data**.

## Non‑Negotiable Guardrails

### 1) Do not break routes, deep links, or tab entry points
- Dashboard tab routes live under `src/app/(dashboard)/*`.
- Avoid renaming/moving route folders unless you also provide redirects and update all links.

### 2) Keep entitlements gating consistent
- **Single source of truth:** `src/lib/entitlements.ts`.
- Do not fork/duplicate tier logic in pages/components.
- Pages commonly normalize `tier === 'free' || !tier ? 'trial' : tier`.

### 3) No reliance on mock Supabase behavior
- Server client: `src/lib/supabase/server.ts`.
- It returns a **mock client** when env vars are missing/placeholder.
- Redesign work must not silently “work” only because the mock client returns empty arrays.

**Rule:**
- Any “core workflow” UI must be driven by real API + DB data paths; if env is not configured, show a clear, user-facing “Not configured”/auth-required state instead of pretending data exists.

### 4) Preserve the dashboard shell + hydration safeguards
- Layout: `src/app/(dashboard)/layout.tsx`.
- Hydration guard: uses `isClient && _hasHydrated` before rendering persisted UI state.

**Rule:**
- Any redesign of navigation/sidebar must keep the hydration-safe pattern to avoid React hydration errors.

### 5) Jobs/credits: preserve semantics
- Processing jobs API: `src/app/api/jobs/route.ts`.
- Credit checks/reservations use Supabase RPCs (e.g. `get_credit_balance`, `record_credit_usage`).

**Rule:**
- Any redesign that triggers processing must keep:
  - membership/org checks
  - credit estimate + balance check
  - reservation/ledger update
  - job record creation

### 6) Mobile-first, but do not remove desktop capabilities
- Mobile should get a first-class UX without removing existing desktop workflows.
- If mobile cannot support a complex editor, provide a purposeful, functional mobile mode (not a broken editor).

## Canonical Workspaces (Dashboard Tabs)

Below is the current map of tab entry routes and primary gating patterns.

### Dashboard
- Entry: `src/app/(dashboard)/dashboard/page.tsx`
- Gating: `getEntitlements()`; uses `canAccessHub` to show hub-linked sections.
- Notes:
  - SlateDrop widget is intended to be visible across tiers (`canViewSlateDropWidget`).

### Project Hub
- Entry: `src/app/(dashboard)/project-hub/page.tsx`
- Gating: `entitlements.canAccessHub`
- Likely core APIs/tables (based on API inventory):
  - `src/app/api/projects/*`
  - `src/app/api/slatedrop/*`
  - Tables frequently referenced in APIs: `projects`, `project_files`, `file_folders`, `unified_files`, `project_history_events`.

### Design Studio
- Entry: `src/app/(dashboard)/design-studio/page.tsx`
- Behavior:
  - Mobile splits to `@/components/design-studio/mobile/MobileDesignStudio`.
  - Desktop uses `@/components/design/DesignStudioShell`.
- Design Studio APIs (confirmed by API tree and queries):
  - `src/app/api/design-studio/workspace/route.ts` (creates workspace + ensures folders)
  - `src/app/api/design-studio/projects/*`
  - `src/app/api/design-studio/versions/*`
  - `src/app/api/design-studio/print/route.ts` (print job creation/updates)
- Tables observed in APIs:
  - `design_studio_projects`, `design_studio_versions`, `print_jobs`, `organization_members`, `projects`, `profiles`, `file_folders`, `unified_files`, `project_files`.

### Content Studio
- Entry: `src/app/(dashboard)/content-studio/page.tsx`
- Gating: `entitlements.canAccessContent`
- Expect processing/exports to use jobs + credits primitives.

### 360 Tour Builder
- Entry: `src/app/(dashboard)/tour-builder/page.tsx`
- Gating: `entitlements.canAccessTourBuilder`

### Virtual Studio
- Entry: `src/app/(dashboard)/virtual-studio/page.tsx`
- Gating: `entitlements.canAccessVirtual`

### Geospatial & Robotics
- Entry: `src/app/(dashboard)/geospatial-robotics/page.tsx`
- Gating: `entitlements.canAccessGeospatial`

### Analytics & Reports
- Entry: `src/app/(dashboard)/analytics-reports/page.tsx`
- Gating: `entitlements.canAccessAnalytics`

### Enterprise / Admin areas
- Entry examples:
  - `src/app/(dashboard)/enterprise/admin/page.tsx`
  - `src/app/(dashboard)/enterprise/seats/page.tsx`
- Gating:
  - tier checks + entitlements role permissions

## 3D Print Lab (Required “Real” Scope)

This section captures the required future behavior so redesign work sets the correct shell without mock flows.

### Must support
- **Multi-printer prep**: prepare/queue jobs for multiple printers concurrently.
- **Auto-sectioning/splitting**: for printers with smaller build volumes.
- **Multiple connection methods** (setup wizard style):
  - LAN (OctoPrint or Moonraker/Klipper)
  - USB/serial (where feasible via a companion service)
  - Cloud connectors (vendor APIs, if present)
- **Broad file support**:
  - Inputs: STL, 3MF, OBJ (and internal GLB pipelines as needed)
  - Outputs: G-code export per printer profile
- **Real dispatch**:
  - “Send print job” must hit a real backend path that can queue/dispatch to the configured printer target.

### Current backend starting point
- Print job API: `src/app/api/design-studio/print/route.ts`
  - Creates `print_jobs` rows with time/material estimates.
  - Supports updates (includes fields like `gcode_key`, `slicer_config`).

### Redesign implication
- The UI shell should be built around:
  1) selecting model/file
  2) selecting printer target(s)
  3) slicing config per target
  4) creating print jobs (DB-backed)
  5) dispatching to a configured connector

## Redesign Implementation Approach (Safe Sequence)

1) **Preserve the shell**: keep `src/app/(dashboard)/layout.tsx` invariants.
2) **Refactor within tabs**: improve each tab’s internal layout without changing routes.
3) **API-first flows**: for any button that appears “primary,” ensure it calls a real API route and handles errors.
4) **Strict empty states**: if auth/org is missing or Supabase env is not configured, show a clear empty state.

## Known Risk Areas (Watchlist)

- Mock Supabase client can hide missing env configuration.
- Hydration mismatches if persisted UI state is used before `_hasHydrated`.
- Any redesign that renames route folders or changes query params can break deep links.

