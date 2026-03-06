# CEO Command Center — Implementation Plan

## Purpose
Internal executive operations surface for business health, feature controls, strategic actions, and **internal staff access management** (Market Robot, Athlete360, CEO tab grants).

## Current State (Updated 2026-03-06)
- Route `/ceo` exists with `hasInternalAccess` gate.
- **3-tab UI** implemented: Overview, Staff & Access, Controls.
- **Staff access management fully operational:** Grant, revoke, update scope per-user via `slate360_staff` table.
- **`resolveServerOrgContext()`** now queries `slate360_staff` for `isSlateStaff` (previously hardcoded `false`).
- **`hasInternalAccess = isSlateCeo || isSlateStaff`** — staff granted access can see CEO/Market/Athlete360 tabs.
- Platform overview fetches real org + user counts from Supabase.
- Business health metrics still mock (pending Stripe aggregation pipeline).

## Source Coverage
Derived from uploaded `raw-upload.txt`, internal access model, and roadmap.

## Access Gate (Canonical)
- Gate by `hasInternalAccess` only.
- Never gate via subscription entitlements.

## MVP Scope
1. ✅ Revenue/cost overview cards (mock metrics + real platform counts).
2. ⚠️ Operational action feed (stub — pending).
3. ⚠️ Feature-flag control panel (stub — pending).
4. ✅ Staff access management for internal tabs (`slate360_staff`).

## Implemented Components
| File | Purpose |
|---|---|
| `app/(dashboard)/ceo/page.tsx` | Server page with `hasInternalAccess` gate |
| `components/dashboard/CeoCommandCenterClient.tsx` | 3-tab orchestrator (Overview, Staff, Controls) |
| `components/dashboard/ceo/CeoPlatformOverview.tsx` | Real platform metrics via `/api/ceo/overview` |
| `components/dashboard/ceo/CeoStaffPanel.tsx` | Staff list + revoke + scope toggle |
| `components/dashboard/ceo/CeoStaffAddForm.tsx` | Grant access form (email, name, scope, notes) |
| `lib/hooks/useCeoStaff.ts` | Client hook for staff CRUD operations |

## API Routes
| Route | Method | Purpose |
|---|---|---|
| `GET /api/ceo/overview` | GET | Platform metrics (org count, users, tier breakdown, staff count) |
| `GET /api/ceo/staff` | GET | List all staff grants |
| `POST /api/ceo/staff` | POST | Grant access (with reactivation support) |
| `PATCH /api/ceo/staff/[staffId]` | PATCH | Update scope/name/notes |
| `DELETE /api/ceo/staff/[staffId]` | DELETE | Soft-revoke access |

## Database
| Table | Purpose |
|---|---|
| `slate360_staff` | Internal staff email grants with `access_scope`, `revoked_at` soft-delete |

Migration: `supabase/migrations/20260306_slate360_staff.sql`

## Data Contracts
- `CeoOverview`, `BusinessMetric`, `ActionItem`, `FeatureFlag`, `StaffAccessGrant` (StaffMember type in `useCeoStaff.ts`).

## Customization Requirements
- Movable executive dashboard cards.
- Expandable analysis and action panes.
- Saved executive layout presets.

## Dependencies
- ✅ Staff table (`slate360_staff`) — created.
- ⚠️ Audit logging — pending.
- ⚠️ Metrics aggregation pipelines (Stripe → real MRR/churn) — pending.

## Definition of Done
- ✅ Internal access grants can be managed safely (grant/revoke/scope).
- ✅ `resolveServerOrgContext()` queries `slate360_staff` for `isSlateStaff`.
- ⚠️ Executive actions are operational and auditable — pending audit logging.
- ⚠️ Layout customization persists — pending shared customization integration.
