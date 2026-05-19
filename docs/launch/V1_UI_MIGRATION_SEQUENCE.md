# V1 UI Migration Sequence

Last Updated: 2026-05-14
Status: Planning document. No code changes.

## Purpose

Safest migration order from old production UI to V1 UI, preserving all behavior.

## Principle

Each step replaces visual chrome while keeping the exact same data loading, API calls, and navigation. No backend changes. No new tables. No new API routes. Only import swaps and component wrapping.

---

## Step 1: Wire V1 preview to read-only real data

**Goal:** V1 preview shows real sessions, projects, and deliverables.

**Files:**
- `app/site-walk-v1-preview/page.tsx` — convert to server component, import loadHubData()
- Pass real projects, walks, summary to V1 components

**Dependencies:** loadHubData() from app/site-walk/page.tsx
**Do not touch:** API routes, Supabase queries, capture, plans
**Acceptance:** Open /site-walk-v1-preview → see real worksite names, walk counts, deliverable counts
**Rollback:** Revert page.tsx to static preview

---

## Step 2: Replace production Home

**Goal:** /site-walk renders V1 shell with real data.

**Files:**
- `app/site-walk/page.tsx` — keep loadHubData(), replace SiteWalkHub import with V1Shell + V1ActionGrid + V1ListPanel
- `app/site-walk/layout.tsx` — may need to adjust shell wrapping

**Dependencies:** Step 1 proven working
**Do not touch:** loadHubData() queries, API routes, capture routes
**Acceptance:** Open /site-walk on mobile → V1 action grid, 5-tab nav, real session data in work panel
**Rollback:** Restore SiteWalkHub import

---

## Step 3: Replace Worksites/Walks page

**Goal:** /site-walk/walks renders V1 WorksiteV1Row with real data.

**Files:**
- `app/site-walk/(act-2-inputs)/walks/page.tsx` — keep loadWalks(), replace card UI with V1 rows
- May need to import WorksiteV1Row, WalkV1Row

**Dependencies:** Step 2
**Do not touch:** loadWalks() queries, thumbnail presign logic
**Acceptance:** Open Worksites tab → real worksite rows with walk counts, actions work
**Rollback:** Restore original walks page.tsx

---

## Step 4: Wire SlateDrop surface

**Goal:** V1 SlateDrop tab navigates to or embeds existing SlateDrop.

**Files:**
- `app/site-walk-v1-preview/page.tsx` or production route — SlateDrop tab links to /slatedrop
- OR: embed SlateDropClient inline for project-scoped view

**Dependencies:** SlateDrop routes already functional
**Do not touch:** SlateDropClient internals, upload/download logic
**Acceptance:** SlateDrop tab → folder list with real files, upload works
**Rollback:** Remove link/embed

---

## Step 5: Wire Coordination surface

**Goal:** V1 Coordination tab navigates to existing coordination routes.

**Files:**
- Coordination tab links to /coordination/inbox (already functional)
- OR: embed InboxTabs + ContactsClient + CalendarClient

**Dependencies:** Coordination routes already functional
**Do not touch:** Coordination API routes, assignment/comment logic
**Acceptance:** Coordination tab → inbox items, contacts, calendar all work
**Rollback:** Remove link/embed

---

## Step 6: Wire Deliverables surface

**Goal:** V1 Deliverables tab shows real deliverables with creation flow.

**Files:**
- Replace /site-walk/deliverables page UI with V1 layout
- Build DeliverableCreationForm that calls POST /api/site-walk/deliverables
- Wire share/export buttons to existing API

**Dependencies:** Deliverable API routes all functional
**Do not touch:** API contracts, PDF export logic, share token generation
**Acceptance:** Create deliverable → appears in list → share link works → PDF exports
**Rollback:** Restore original deliverables page

---

## Step 7: Wrap Plan Workspace in V1 chrome

**Goal:** Plan workspace uses V1 header/tools bar around existing PlanViewerLeaflet.

**Files:**
- `app/site-walk/(act-2-inputs)/capture/` layout or island — wrap PlanViewerLeaflet with V1 header and tools bar
- Build PlanSheetPicker component using existing plan sheet data
- Keep all Leaflet logic untouched

**Dependencies:** Steps 2–3 (V1 shell serves as parent)
**Do not touch:** PlanViewerLeaflet.tsx, PlanViewerLeafletEvents.tsx, CaptureContext.tsx, pin creation logic, plan image loading
**Acceptance:** Open plan → V1 header shows worksite/walk name, sheet picker works, pan/zoom works, long-press creates pin, saved pins open
**Rollback:** Remove V1 wrapper, restore original capture layout

---

## Step 8: Wrap Capture Workspace in V1 chrome

**Goal:** Capture workspace uses V1 header around existing capture components.

**Files:**
- Replace SharedCaptureTaskHeader styling with V1 header
- Keep CaptureDataBottomSheet, CameraViewfinder, all capture logic untouched
- Ensure Details/Attachments/Markup tabs still work

**Dependencies:** Step 7 (plan chrome done)
**Do not touch:** CaptureContext, CaptureItemForm, CameraViewfinder, save flow, upload logic
**Acceptance:** Quick capture works, plan-linked capture works, markup works, save returns to plan
**Rollback:** Restore original capture header

---

## Step 9: Implement saved pin move/delete

**Goal:** Users can move and delete saved pins.

**Files:**
- `PlanViewerLeaflet.tsx` — add move mode for saved pins (explicit toggle, drag, confirm)
- `PlanQuickActionMenu.tsx` — add Move and Delete actions
- Wire to PATCH /api/site-walk/pins/[id] (move) and DELETE /api/site-walk/pins/[id] (delete)

**Dependencies:** Step 7 (plan chrome stable)
**Do not touch:** Draft pin creation, pin-to-item linking, plan image loading
**Acceptance:** Tap saved pin → menu shows Move/Delete → move works → delete with confirmation works
**Rollback:** Remove move/delete handlers, restore disabled menu

---

## Step 10: Build foundational deliverable creation

**Goal:** Users can create a deliverable from a walk with a simple form.

**Files:**
- New DeliverableCreationForm component
- Replace /site-walk/deliverables/new redirect with real form
- Form: select walk → pick type → create → navigate to edit/share

**Dependencies:** Step 6 (deliverables wired)
**Do not touch:** Deliverable API, PDF export, share logic
**Acceptance:** Create deliverable from walk → appears in list → can share
**Rollback:** Restore redirect stub

---

## Step 11: App-store visible-surface cleanup

**Goal:** No filler, no "Coming Soon," no dead surfaces in authenticated app.

**Files:**
- Remove "Coming Soon" from DashboardMyAccount.tsx and PunchListForm.tsx
- Add middleware redirects for /virtual-studio and /geospatial → /dashboard
- Remove /site-walk/more route or redirect to home
- Replace /site-walk/reports → /site-walk/deliverables
- Add minimal /support or /help route
- Ensure all bottom nav tabs render real content

**Dependencies:** Steps 1–10 complete
**Do not touch:** Public marketing pages (Coming Soon is OK there)
**Acceptance:** Navigate every authenticated route → no placeholder text, no dead buttons, no "Coming Soon"
**Rollback:** Revert individual file changes
