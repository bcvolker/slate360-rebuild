# PunchWalk — Build Guide

Last Updated: 2026-03-27
Status: Planning guide. No implementation started.

Read this file before ANY PunchWalk implementation. This is the working memory and safe-build guide.

Read before starting a new chat:
1. `SLATE360_PROJECT_MEMORY.md`
2. `slate360-context/apps/APP_ECOSYSTEM_GUIDE.md` — Stripe, subscription, PWA prerequisites
3. This file
4. `slate360-context/ONGOING_ISSUES.md` if any active bugs are noted

---

## What PunchWalk Is

PunchWalk is a **mobile-first field capture app** for construction punch lists.

The core workflow:
1. A project superintendent or GC walks the site before handoff.
2. They open PunchWalk on their phone.
3. They tap "Add Item", take a photo, tag a location or room, assign to a contractor, set a due date.
4. The item is recorded in real-time.
5. Contractors get notified and can mark items resolved with a verification photo.
6. The GC can generate a punch list PDF and share it with ownership.

PunchWalk is NOT the same as the punch list view in Project Hub. Project Hub is the desktop PM tool for managing punch lists in a table. PunchWalk is the **field app** — designed for one-handed use on a phone, camera-first, works on a construction site where connection is spotty.

PunchWalk integrates deeply with Project Hub: items captured in the field show up in the Project Hub punch list tool and vice versa. They share the same `project_punch_items` table.

---

## Verified Current State

### What Already Exists (Can Be Reused)

| Resource | Location | Status |
|---|---|---|
| `project_punch_items` table | Supabase (tracked migration) | ✅ Live — field columns exist |
| Punch List tool page (desktop) | `app/(dashboard)/project-hub/[projectId]/punch-list/page.tsx` | ✅ Live (403 lines, needs extraction) |
| Project auth helpers | `lib/projects/access.ts` | ✅ Ready |
| S3 file upload backbone | `app/api/slatedrop/upload-url/route.ts`, `lib/s3.ts` | ✅ Ready |
| Project activity log | `lib/projects/activity-log.ts` | ✅ Ready |
| Auth backbone | `lib/server/org-context.ts`, `lib/server/api-auth.ts` | ✅ Ready |
| PWA manifest | `app/manifest.ts` | ✅ Exists (icons/SW missing) |

### What Does NOT Exist Yet

- No PunchWalk standalone route or app shell
- No mobile-optimized punch item create/edit form
- No camera-first capture flow (browser camera API)
- No photo-per-item attachment (Project Hub punch list has no photo per item yet)
- No QR code scan-to-open-item workflow
- No offline punch item queue (IndexedDB/Dexie)
- No PunchWalk API routes (will add to `app/api/punch-walk/`)
- No notifications to contractors
- No PWA service worker
- No Capacitor native app
- No standalone subscription or entitlement gate

### Two Deployment Contexts

PunchWalk runs in two contexts that MUST both work:

1. **Standalone mode** (`/punch-walk`) — accessed directly, without the dashboard. No sidebar, no dashboard chrome. Full-screen mobile-first layout. This is the app store version.

2. **Project Hub integration** — when a user is in project hub and opens the punch list tab, they get a link to "Open in PunchWalk" which opens the standalone mode pre-filtered to that project.

Data is always shared. The two contexts share the same tables and API routes.

---

## MVP-Lite Scope

### In Scope for MVP

1. Start a punch walk on a project
2. Add punch items with:
   - Title / description
   - Photo capture (browser camera or upload)
   - Room/location tag (freeform text)
   - Assignee (contractor name or org contact)
   - Due date
   - Priority (low / medium / high)
3. View the active punch item list for a project
4. Mark items resolved (with optional close-out photo)
5. Export punch list as PDF or share a read-only link
6. Notification to assignee (email via Resend — simple, not push)

### NOT In Scope for MVP

- QR code scan-to-open (Phase 2)
- Offline mode / IndexedDB queue (Phase 2 / PWA phase)
- Drawing / floor plan with pins (Phase 3)
- AIA compliance fields (Phase 3)
- Nested items or sub-items (Phase 3)
- App store wrapping (Phase B — after PWA)
- Push notifications to native device (Phase B)
- Two-way sync with Procore or other PM tools (not planned yet)

---

## Proposed Data Model

### `project_punch_items` (Already Exists — Extend Don't Recreate)

Current columns (confirmed in Project Hub code):
- `id`, `project_id`, `org_id`, `created_by`, `title`, `status`, `priority`, `due_date`, `assigned_to`, `created_at`, `updated_at`

**New columns needed for PunchWalk photo attachment** (additive migration):

```sql
ALTER TABLE project_punch_items
  ADD COLUMN photo_paths TEXT[] DEFAULT '{}',
  ADD COLUMN close_out_photo_path TEXT,
  ADD COLUMN location_label TEXT,
  ADD COLUMN resolved_at TIMESTAMPTZ,
  ADD COLUMN resolved_by UUID REFERENCES auth.users(id);
```

### `punch_walk_sessions` (New Table)

Tracks a single "walk" of a project — gives structure to a batch of items captured during one site visit.

```sql
CREATE TABLE punch_walk_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  org_id UUID NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  title TEXT,                         -- e.g., "Pre-handoff walk 2026-03-27"
  status TEXT NOT NULL DEFAULT 'active',  -- 'active' | 'complete'
  item_count INT DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE punch_walk_sessions ENABLE ROW LEVEL SECURITY;
-- RLS: org members can read/write their own org's sessions
```

---

## Proposed File Structure

Keep the module strictly isolated from other dashboard tabs.

```text
app/
  punch-walk/                          ← standalone route (no dashboard chrome)
    page.tsx                           ← project selector or recent walks
    [projectId]/
      page.tsx                         ← active punch list for project
      walk/page.tsx                    ← active walk mode (camera-first)
      walk/[sessionId]/page.tsx        ← specific walk session
  apps/
    punch-walk/
      page.tsx                         ← app landing page (marketing + subscribe)
      subscribe/page.tsx               ← Stripe checkout trigger
      onboarding/page.tsx              ← post-payment welcome
  api/
    punch-walk/
      route.ts                         ← list/create punch items
      [itemId]/
        route.ts                       ← get/update/delete item
        photo/route.ts                 ← upload photo to item
        resolve/route.ts               ← mark resolved

components/
  punch-walk/
    PunchWalkShell.tsx                 ← app shell (no dashboard sidebar)
    PunchWalkProjectSelector.tsx       ← project picker on entry
    PunchWalkActiveList.tsx            ← scrollable list of open items
    PunchWalkItemCard.tsx              ← single item card (summary view)
    PunchWalkItemForm.tsx              ← add/edit item form
    PunchWalkCameraCapture.tsx         ← camera + upload trigger
    PunchWalkPhotoStrip.tsx            ← horizontal scroll of item photos
    PunchWalkResolveForm.tsx           ← resolve item UI
    PunchWalkExportButton.tsx          ← PDF export trigger
    PunchWalkSessionHeader.tsx         ← current walk session header

lib/
  types/
    punch-walk.ts                      ← all PunchWalk TypeScript types
  hooks/
    usePunchWalk.ts                    ← item CRUD, session state
    usePunchWalkCamera.ts              ← camera API, photo upload state
    usePunchWalkOffline.ts             ← offline queue (Phase B)
  punch-walk/
    queries.ts                         ← Supabase query helpers
    session.ts                         ← session management helpers
    pdf-export.ts                      ← punch list PDF generation
    notifications.ts                   ← email notification helpers
```

---

## Safe-Build Strategy

### Core Rules

1. PunchWalk adds new API routes under `app/api/punch-walk/`. It does NOT modify existing punch list routes under `app/(dashboard)/project-hub/`.
2. Both surfaces (PunchWalk standalone + Project Hub punch list) share the same `project_punch_items` table. PunchWalk adds columns via additive migration — it does NOT change existing column behavior.
3. The camera capture component (`PunchWalkCameraCapture.tsx`) uses the existing S3 presigned upload backbone — it does NOT create a parallel upload system.
4. PunchWalk has its own app shell (`PunchWalkShell.tsx`) that is completely separate from `DashboardClient.tsx` and `DashboardTabShell.tsx`.

### GitNexus Protocol

Before touching any of these shared files, run `mcp_gitnexus_impact`:

| Shared file | Why it matters |
|---|---|
| `project_punch_items` table schema | Any additive column risks breaking Project Hub type inference |
| `lib/projects/access.ts` | Project access check used by all Project Hub routes |
| `lib/entitlements.ts` | Adding PunchWalk entitlement field |
| `middleware.ts` | Adding `/punch-walk` to protected routes |
| `app/api/slatedrop/upload-url/route.ts` | PunchWalk photo uploads reuse this |

After every prompt: `mcp_gitnexus_detect_changes` to confirm only PunchWalk files changed.

### Hard Do-Not-Touch List

Do not edit these unless there is a forced wiring requirement AND it has been GitNexus-checked:

| File | Why |
|---|---|
| `components/dashboard/DashboardClient.tsx` | Shared orchestrator — no PunchWalk code belongs here |
| `app/(dashboard)/project-hub/[projectId]/punch-list/page.tsx` | Existing desktop tool — only add a "→ Open in PunchWalk" link, nothing else |
| `app/api/slatedrop/*` | Use the upload backbone as-is, no modifications |
| `lib/server/org-context.ts` | Auth — do not modify |
| `lib/server/api-auth.ts` | Shared wrapper — do not modify |
| `middleware.ts` | Only ADD the `/punch-walk` route to the protected list |

### Mobile-First Rules

Every component in `components/punch-walk/` must be designed for a 390px wide screen first.

- Touch targets MUST be at least 44×44px.
- No hover-only interactions.
- Forms must be operable with one thumb (action buttons at the bottom of the screen).
- Camera control must be a large, centered, easily tappable button.
- Lists must be swipe-friendly (`draggable` not used — use tap targets for actions instead).
- All text must be legible at outdoor light levels (high contrast, minimum 16px body text).

---

## Proposed TypeScript Types

```typescript
// lib/types/punch-walk.ts

export type PunchItemStatus = 'open' | 'in-progress' | 'resolved' | 'overdue';
export type PunchItemPriority = 'low' | 'medium' | 'high';

export interface PunchItem {
  id: string;
  projectId: string;
  orgId: string;
  createdBy: string;
  title: string;
  description: string | null;
  status: PunchItemStatus;
  priority: PunchItemPriority;
  dueDate: string | null;
  assignedTo: string | null;        // contractor name or user_id
  locationLabel: string | null;     // "Room 101", "North stairwell", etc.
  photoPaths: string[];             // S3 keys
  closeOutPhotoPath: string | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PunchWalkSession {
  id: string;
  projectId: string;
  orgId: string;
  createdBy: string;
  title: string | null;
  status: 'active' | 'complete';
  itemCount: number;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PunchWalkItemCreate {
  projectId: string;
  sessionId?: string;
  title: string;
  description?: string;
  priority: PunchItemPriority;
  dueDate?: string;
  assignedTo?: string;
  locationLabel?: string;
}
```

---

## Prompt Sequence

### Phase A — Core Web App (8 prompts)

#### Prompt 1 — Types + Schema + Migration

Deliver:
- `lib/types/punch-walk.ts`
- `ALTER TABLE project_punch_items` migration (photo_paths, close_out_photo_path, location_label, resolved_at, resolved_by)
- `CREATE TABLE punch_walk_sessions` migration
- Verify migration is additive and does NOT break existing Project Hub punch list page

Exit criteria: Types compile. Migration applies cleanly. Existing punch list page still works.

#### Prompt 2 — PunchWalk API Routes

Deliver:
- `app/api/punch-walk/route.ts` — list items by project, create item
- `app/api/punch-walk/[itemId]/route.ts` — get, update, delete
- `app/api/punch-walk/[itemId]/resolve/route.ts` — mark resolved
- `app/api/punch-walk/sessions/route.ts` — create/list sessions

Exit criteria: Can create, list, and resolve punch items via API. Auth guard in place via `withProjectAuth()`.

#### Prompt 3 — PunchWalk App Shell + Project Selector

Deliver:
- `components/punch-walk/PunchWalkShell.tsx`
- `components/punch-walk/PunchWalkProjectSelector.tsx`
- `app/punch-walk/page.tsx` — server component, auth gate, renders project selector
- Middleware update: add `/punch-walk` to protected routes
- `lib/entitlements.ts` update: add `canAccessPunchWalk` field

Exit criteria: `/punch-walk` requires auth. Shows project list. No dashboard chrome visible.

#### Prompt 4 — Active Punch List View

Deliver:
- `components/punch-walk/PunchWalkActiveList.tsx`
- `components/punch-walk/PunchWalkItemCard.tsx`
- `app/punch-walk/[projectId]/page.tsx`
- `lib/hooks/usePunchWalk.ts` — item list fetch and real-time state

Exit criteria: Opening a project shows the live punch item list. Items display photo count, priority, status, assignee.

#### Prompt 5 — Add Item Form (No Camera Yet)

Deliver:
- `components/punch-walk/PunchWalkItemForm.tsx`
- Text/location/priority/assignee/due date fields
- Mobile-optimized layout (bottom-sheet or full-screen form)

Exit criteria: User can add a punch item with all metadata fields. Item appears in list immediately.

#### Prompt 6 — Camera Capture + Photo Upload

Deliver:
- `components/punch-walk/PunchWalkCameraCapture.tsx`
- `lib/hooks/usePunchWalkCamera.ts`
- `app/api/punch-walk/[itemId]/photo/route.ts`
- Reuses existing `upload-url` presigned upload backbone

Exit criteria: User can capture a photo with device camera OR select from photo library. Photo uploads to S3 and attaches to the punch item.

#### Prompt 7 — Resolve Flow + PDF Export

Deliver:
- `components/punch-walk/PunchWalkResolveForm.tsx`
- `lib/punch-walk/pdf-export.ts`
- `components/punch-walk/PunchWalkExportButton.tsx`

Exit criteria: User can mark an item resolved with an optional close-out photo. PDF export generates a punch list with item details and photos.

#### Prompt 8 — Stabilization + Project Hub Wiring

Deliver:
- "Open in PunchWalk" link on the Project Hub punch list page
- Empty state in PunchWalk with onboarding hint
- Error states for failed uploads and API errors
- `get_errors` + `typecheck` + smoke-test checklist
- Context doc updates

Exit criteria: End-to-end flow works from `/punch-walk`. Project Hub punch list shows items created in PunchWalk.

---

### Phase B — PWA + Offline (3 prompts, requires Phase 4 from APP_ECOSYSTEM_GUIDE.md)

#### Prompt B1 — Service Worker + Offline Cache

Deliver:
- Configure `@ducanh2912/next-pwa` in `next.config.ts`
- Cache punch item list for current project (network-first, fallback to cache)
- Do NOT cache photo upload routes

Exit criteria: Opening PunchWalk with no connection shows the last-cached punch item list. Upload gracefully fails with "you're offline, will retry" message.

#### Prompt B2 — Offline Item Queue

Deliver:
- `lib/hooks/usePunchWalkOffline.ts`
- IndexedDB queue using Dexie
- When online: auto-flush queued items to API
- Visual indicator: "X items pending sync"

Exit criteria: User can add punch items while offline. When connection restores, items sync to the server and appear in Project Hub.

#### Prompt B3 — PWA Install Prompt + App Shell Polish

Deliver:
- `components/pwa/InstallPrompt.tsx` (shared with Tour Builder)
- Show install prompt after first item is added in PunchWalk
- iOS meta tags for splash screen and icon
- App icon updates (192px, 512px)

Exit criteria: "Add to Home Screen" prompt appears on Android. iOS "Add to Home Screen" produces correct icon. Installed app opens in standalone mode.

---

### Phase C — Subscription + App Directory (2 prompts)

#### Prompt C1 — PunchWalk Landing Page + Stripe Checkout

Deliver:
- `app/apps/punch-walk/page.tsx` — landing page with screenshots, pricing, subscribe button
- `app/apps/punch-walk/subscribe/page.tsx` — triggers Stripe checkout for PunchWalk standalone

Exit criteria: New user can discover PunchWalk, subscribe, and get redirected into the app.

#### Prompt C2 — Onboarding + Entitlement Gating

Deliver:
- `app/apps/punch-walk/onboarding/page.tsx`
- `app/punch-walk/page.tsx` — redirect to subscribe if no entitlement
- Platform tier users with Project Hub access get PunchWalk access included

Exit criteria: Non-subscriber is redirected to the subscribe page. Subscriber lands in the app. Business/enterprise platform users can use PunchWalk without a separate subscription.

---

## Safe-Build Checklist For Every Prompt

### Before Writing Code

- [ ] Read `SLATE360_PROJECT_MEMORY.md` latest handoff.
- [ ] Read `APP_ECOSYSTEM_GUIDE.md` phase tracker — confirm prerequisites are done.
- [ ] Check `ops/bug-registry.json` for any active PunchWalk or Project Hub bugs.
- [ ] Run `wc -l` on every file you plan to edit. Plan extraction if ≥250 lines.
- [ ] Run `mcp_gitnexus_impact` on any shared file being touched.
- [ ] Identify which of the two contexts (standalone, Project Hub integrated) will be affected.

### Mobile Guard (Every Prompt)

Before submitting any PunchWalk UI code, answer:
- [ ] Does every interactive element have a touch target of at least 44×44px?
- [ ] Is the primary action reachable with one thumb (bottom of screen on mobile)?
- [ ] Does the form work when the keyboard is open (bottom sheet pattern)?
- [ ] Are all images using `loading="lazy"` and respecting mobile viewport?

### After Writing Code

- [ ] Run `get_errors` on ALL changed files.
- [ ] Run `npm run typecheck`.
- [ ] Run `mcp_gitnexus_detect_changes` — confirm only PunchWalk files changed.
- [ ] Confirm shared files were only modified if on the allowed wiring list.
- [ ] Verify the existing Project Hub punch list page renders correctly: no regressions.
- [ ] Run `bash scripts/check-file-size.sh`.
- [ ] Update `SLATE360_PROJECT_MEMORY.md` handoff.
- [ ] Update this BUILD_GUIDE phase tracker.

---

## Phase Completion Tracker

| Phase | Description | Status | Notes |
|---|---|---|---|
| Prerequisites | App Phase 2 (entitlements) + file_folders migration | ⬜ Not started | Must be done before PunchWalk |
| A1 | Types + schema migration | ⬜ Not started | — |
| A2 | API routes | ⬜ Not started | — |
| A3 | App shell + project selector | ⬜ Not started | — |
| A4 | Active punch list view | ⬜ Not started | — |
| A5 | Add item form | ⬜ Not started | — |
| A6 | Camera capture + photo upload | ⬜ Not started | — |
| A7 | Resolve flow + PDF export | ⬜ Not started | — |
| A8 | Stabilization + Project Hub wiring | ⬜ Not started | — |
| B1 | Service worker + offline cache | ⬜ Not started | Requires App Phase 4 (PWA) |
| B2 | Offline item queue | ⬜ Not started | — |
| B3 | PWA install prompt + app shell polish | ⬜ Not started | — |
| C1 | Landing page + Stripe checkout | ⬜ Not started | Requires App Phase 3 |
| C2 | Onboarding + entitlement gating | ⬜ Not started | — |

**Total estimated prompts to live on web with subscription: ~10 prompts (A1–A8 + C1 + C2)**
**Additional prompts for iOS/Android app stores: ~6 prompts (B1–B3 + Capacitor from APP_ECOSYSTEM_GUIDE.md)**

---

## Known Risks

### Risk 1: `project_punch_items` schema alteration breaks Project Hub

Mitigation: The migration ONLY adds nullable columns. Existing queries and forms are unaffected. Verify the Project Hub punch list page after migration by running it and checking for TypeScript errors.

### Risk 2: Camera API not available in all contexts (iOS Safari, Capacitor WebView)

Mitigation: Always provide a file upload fallback alongside the camera trigger. Use `<input type="file" accept="image/*" capture="environment">` as the primary mobile-friendly approach — this triggers the native camera on iOS and Android without extra APIs.

### Risk 3: Photo upload size / S3 costs

Mitigation: Before uploading, client-side-resize photos to max 1920px and compress to JPEG 80% using a canvas resize step. This reduces S3 costs and upload time on spotty site connections.

### Risk 4: Offline queue items lost if user clears browser storage

Mitigation: Show a "syncing" indicator prominently. Never auto-clear IndexedDB until items are confirmed saved to the server. Log sync failures to `project_activity_log`.

### Risk 5: PunchWalk and Project Hub punch list page get out of sync

Mitigation: They share the same table. The only divergence risk is if PunchWalk writes to columns that the Project Hub TypeScript types don't know about. Fix: update the shared `PunchItem` type in `lib/types/punch-walk.ts` and import it in both places.

### Risk 6: PDF export times out on Vercel

Mitigation: Use a lightweight PDF library (`@react-pdf/renderer` or `pdf-lib`) that generates the PDF client-side if the item count is small, or generates server-side in a background job if the list is large.

---

## Research Intake Template

Fill this in before implementation starts.

### Reference Apps / Patterns

- App name:
- What to copy:
- What to avoid:

### UI Layout Requirements

- Walk mode layout (camera trigger position):
- Item list layout (mobile scroll behavior):
- Status indicator approach:
- Photo thumbnail size and grid:

### Contractor Notification Method

- Email only (Resend) in MVP? Y/N:
- Require contractor to have a Slate360 account? Y/N:
- Use `org_contacts` email field for contractor emails? Y/N:

### Export Format

- PDF only in MVP? Y/N:
- Include photos in PDF? Y/N:
- CSV export needed? Y/N:

### Entitlement Decision

- PunchWalk included with which platform tiers (business+? model+?):
- Standalone price confirmed: $19/mo Y/N:
- Annual price confirmed: $190/yr Y/N:

---

## Enterprise Tier — PunchWalk

PunchWalk's enterprise path mirrors Tour Builder's. The buyer is different — GC companies, construction management firms, and capital program departments — but the seat model, portal, and bulk licensing mechanics are identical.

### Who Buys PunchWalk Enterprise

| Buyer | Use Case | What They Pay For |
|---|---|---|
| General contractor companies | All supers use PunchWalk on their projects | Org-wide license, no per-user friction |
| Construction management firms | 10–50 project managers in the field and office | Team seats, shared project access |
| Capital program departments | Owners rep teams managing multiple active projects | Centralized punch list visibility, PDF reporting |
| Real estate developers | Multiple property managers running punch lists across portfolio | Portfolio-level access, CSV/PDF export |
| Facility management companies | Ongoing punch lists for facilities maintenance | Recurring subscription, high renewal rate |

### Enterprise Pricing

| Tier | Monthly | Annual | Included |
|---|---|---|---|
| PunchWalk Standalone | $39/mo | $390/yr | 1 user, 10 projects, unlimited items |
| PunchWalk Team | $99/mo | $990/yr | 5 seats, 50 projects, shared access |
| PunchWalk Enterprise | $299/mo | $2,990/yr | 25 seats, unlimited projects, PDF + CSV export, org-level reporting |
| Custom | Contact us | — | Unlimited seats, SSO, SLA, API access |

**Revenue impact:** One GC company with 15 superintendents at $299/mo = $3,588/year from a single PunchWalk sale. Three enterprise PunchWalk contracts = $897/mo added to the blended revenue target.

### Enterprise Feature Set

#### 1. Shared Project Access

In standalone mode, projects are visible only to the user who created them. In Team/Enterprise mode:
- All seats under the org can see and contribute to all org projects
- Role-based access: `builder` (can create items, take photos, resolve items), `viewer` (read-only, can export)
- Project-level permissions: future Phase 4 feature, not required for first enterprise release

#### 2. Org-Level Dashboard / Portal

A read-only overview of all open punch items across all projects — for a PM or owner's rep to monitor field progress from the office:

```
┌─────────────────────────────────────────────────────┐
│  PunchWalk Portal        [Org Name]       [Logout]  │
├──────────────┬──────────────────────────────────────┤
│              │  Open Items: 47   Resolved: 123      │
│  Projects    │  ─────────────────────────────────── │
│              │  Project A   12 open  / 3 critical   │
│  ├─ Proj A   │  Project B    8 open  / 1 critical   │
│  ├─ Proj B   │  Project C   27 open  / 0 critical   │
│  ├─ Proj C   │                                      │
│              │  [Export All Open — PDF]              │
└──────────────┴──────────────────────────────────────┘
```

**Route:** `/portal/punch-walk` — reuses the same portal layout as Tour Builder portal
**Auth:** Same portal entitlement check (`canAccessTeamPortal` — shared across both apps)

#### 3. Bulk Licensing / Seat Management

Identical to Tour Builder enterprise seats:

```
Company admin buys PunchWalk Team or Enterprise
  → Stripe checkout for the org
  → org_feature_flags gets punch_walk_seat_limit = N
  → Admin invites employees via email
  → Employees accept invite, link their account
  → Employee opens PunchWalk (web or iOS/Android app)
  → Entitlement check on login — if they have a seat, they're in
  → No individual payment required from employees
```

**App store install for employees:**
- Employees download PunchWalk from App Store / Google Play with their own account
- Sign in with Slate360 credentials
- Seat entitlement is account-bound — app works immediately after login

**Schema (shared with Tour Builder seat model):**
```sql
-- Add to org_feature_flags
ALTER TABLE org_feature_flags
  ADD COLUMN punch_walk_seat_limit INT DEFAULT 1,
  ADD COLUMN punch_walk_seats_used INT DEFAULT 0;

-- Uses the same org_invite_tokens table from Tour Builder
-- Just set portal_role for PunchWalk access
```

#### 4. Org-Level PDF / CSV Export (Enterprise Only)

- "Export all open items across org" — generates a zip of per-project PDFs
- CSV export for import into Procore, Autodesk Construction Cloud, or Excel
- Column format: Project, Trade, Description, Location, Priority, Assigned To, Due Date, Status, Photo URL
- Enterprise only — standalone tier gets per-project PDF only

### Enterprise Prompt Sequence (Phase 3, after PunchWalk Prompts A1–A8 + C1–C2)

| Prompt | Task |
|---|---|
| PW-E1 | PunchWalk Team + Enterprise Stripe products + seat flags |
| PW-E2 | Portal overview dashboard (`/portal/punch-walk`) + project roll-up stats |
| PW-E3 | Shared project access (org-scoped queries, role enforcement) |
| PW-E4 | Org-level CSV export + multi-project PDF zip |

**PunchWalk Enterprise Total: 4 prompts**
**Dependency:** PunchWalk standalone subscription working (C1 + C2)

**Note:** PW-E1 can be combined with Tour Builder E1 — they use the same seat management infrastructure.

### PunchWalk Enterprise Go-To-Market

PunchWalk enterprise sells the same way as Tour Builder enterprise — direct outreach, not app store discovery:

1. **GC company pitch:** "Every superintendent on your jobs gets PunchWalk — one bill, your logo on the export, no apps to buy." Walk them through one demo on a phone.
2. **Construction associations:** AGC, ABC, NAIOP local chapter meetings. These are where field tech decisions get made.
3. **Procore integration hook (Phase 4):** GCs already pay for Procore. A lightweight PunchWalk-to-Procore export makes it a no-brainer add-on, not a replacement.
4. **Capital programs:** Same buyer as Tour Builder enterprise. They likely want both — one enterprise deal covers both apps.
