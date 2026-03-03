# Dashboard Home — Implementation Plan

## Purpose
Create a role-aware command center that routes users into module workspaces quickly, with consistent customization and usage visibility.

## Current State
- Route exists and is functional.
- Large component decomposition is still pending.

## Source Coverage
Derived from uploaded `raw-upload.txt` plus canonical dashboard/roadmap docs.

## MVP Scope
1. Session bootstrap (user, org, tier, entitlements, usage).
2. Workspace cards with entitlement-aware routing.
3. Notifications/activity/credits/storage overview.
4. Layout customization via `../CUSTOMIZATION_SYSTEM.md`.

## Data Contracts
- `DashboardSession`
- `WorkspaceTile`
- `UsageMetrics`
- `ActivityItem`

## API Plan
- `GET /api/dashboard/session` (single bootstrap payload)
- Reuse existing widget routes for detailed sections.

## Customization Requirements
- Movable dashboard cards/widgets.
- Expand/collapse sections.
- Saved presets: `simple`, `standard`, `advanced`, `custom`.
- Persist with `layoutprefs-dashboard-home-{userId}`.

## Dependencies
- `DashboardClient` decomposition.
- Shared UI primitives from Phase 0 (`DataTable`, `EmptyState`, `StatusPill`).

## Definition of Done
- Fast initial render from one bootstrap request.
- Layout changes persist.
- Entitlements correctly gate workspace links.
