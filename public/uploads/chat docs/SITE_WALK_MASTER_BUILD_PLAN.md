# Site Walk Master Build Plan

**Last Updated:** 2026-05-31  
**Status:** Active source-of-truth for Site Walk V2 development  
**Strategy:** Quarantine → Replace → Redirect → Delete later

---

## Product Goal

Site Walk is the field documentation, coordination, and deliverables app inside Slate360.

**The core workflow is:**
Walk the site → capture stops → add context → review stops → create deliverables → share/save

**The app must be:**
- Mobile-first
- App-store-ready
- Easy enough for field users with minimal training
- Usable in bright outdoor conditions
- Thumb-friendly
- Offline-tolerant
- Fast to start
- Not dependent on plans/PDFs unless the user chooses a plan-based walk
- Powerful enough to create branded deliverables
- Connected to SlateDrop as the file spine
- Compatible with future Digital Twin, 360, and advanced deliverables

## Core Product Rule

Site Walk must be valuable on its own, but become more powerful when bundled with other Slate360 apps later.

**For now:**
- Site Walk is active.
- Digital Twin is visible/locked/preparing.
- Other apps are not shown in the app-store version.
- Do not show incomplete apps.
- Do not show “Coming Soon.”
- Do not leave dead buttons.
- Do not route users to legacy screens from the mobile shell.

## Current Strategic Issue

The app is still a hybrid:
- `/app` is mostly fixed.
- `/site-walk` home has a newer 2×2 action grid.
- But old pages still appear when clicking into setup, walks, capture, deliverables, and some exit flows.
- `/site-walk/setup` is still a legacy setup workbook.
- `/site-walk/walks` is still a legacy page.
- `/site-walk/capture` is still V1 capture.
- Capture V2 exists but is direct URL / flag-gated.
- Deliverables is still sparse.
- Worksites is not yet a full workflow.

**So the build strategy should be:**
**Quarantine → Replace → Redirect → Delete later**

**Do not delete legacy pages yet.**

## The Correct Site Walk Information Architecture

### Global Slate360 Shell

The Slate360 shell contains apps and global tools.

**`/app`**
The Slate360 app shell should show:

**Your Apps**
- Site Walk — active
- Digital Twin — locked/preparing

**Quick Actions**
- Create
- SlateDrop
- Search
- Deliverables

**Bottom nav**
- Home
- Projects
- SlateDrop
- Coordination
- Account

Site Walk itself has its own internal bottom nav.

### Site Walk Internal Shell

**`/site-walk`**
This is the Site Walk app home.

**Header**
Should show:
- Back to Slate360
- Site Walk
- Field capture & deliverables
- Optional sync/offline status

**Primary action grid**
A 2×2 compact grid:

1. **Quick Walk**
   - Start capturing now
   - No worksite required
   - No plan required
   - Opens capture immediately

2. **New Worksite**
   - Create field project
   - Opens new mobile-first worksite creation flow
   - Should not open old `/site-walk/setup`

3. **Walk from Worksite**
   - Use saved context
   - Opens in-shell worksite picker
   - Should not route to old `/site-walk/walks`

4. **Review & Deliver**
   - Reports and outputs
   - Opens in-shell deliverables/review area
   - Should not route to old standalone deliverables page if mobile-quarantined

**Lower contained panel**
Tabs:
- Recent
- Worksites
- Shared
- Needs Review

The panel should:
- Fill remaining height above bottom nav
- Internally scroll
- Expand/collapse reliably
- Not create body/page scroll
- Not leave large blank gaps

### Site Walk Bottom Nav

Inside Site Walk:
- Home
- Worksites
- SlateDrop
- Coordination
- Deliverables

## Screen-by-Screen App Map

### 1. Site Walk Home

**Route:** `/site-walk`

**Purpose:** Main command screen for the Site Walk app.

**Visible sections:**
- Header
- Action grid
- Recent/Worksites/Shared/Needs Review contained panel
- Bottom nav

**Primary actions:**
- Quick Walk
- New Worksite
- Walk from Worksite
- Review & Deliver

**No legacy pages should open from this screen.**

### 2. Quick Walk

**Purpose:** Fastest possible capture workflow.

User does not need:
- A worksite
- A project
- A plan
- A setup workbook

**Flow:**
1. User taps Quick Walk
2. App creates a walk/session
3. App opens capture
4. User captures stops
5. User reviews stops
6. User may assign the walk to a worksite later
7. User can create deliverables from the walk

**Important:** Quick Walk should not force plan upload or project setup.

### 3. New Worksite

**Purpose:** Create a lightweight Site Walk field project/worksite.

This replaces the old setup workbook.

**New Worksite screen or sheet**

**Fields:**
- Worksite name
- Location/address optional
- Client/company optional
- Description/scope optional
- Default walk type optional
- Contacts optional later
- Plan optional later

**Buttons:**
- Create & Start Walk
- Create Only
- Cancel

After creation, show options:
- Start Walk
- Add Plan
- Add Contacts
- Open Worksite

**Important:** Do not force plan upload.

### 4. Walk from Worksite

**Purpose:** Start a walk from an existing worksite.

**Worksite picker**
Fields/features:
- Search worksites
- List worksites
- Show last activity
- Show number of walks
- Show open items
- Tap row to open action sheet

**Row actions:**
- Start Walk
- Open Worksite
- View Walks
- View Deliverables

**Walk setup from worksite**

**Fields:**
- Walk title
- Walk type/template:
  - General progress
  - Punch list
  - QA/QC
  - Safety
  - Pre-install
  - Closeout
  - Custom
- Plan:
  - No plan
  - Select existing plan
  - Upload plan
- Team/collaborators optional

**Buttons:**
- Start Capture
- Save Draft
- Back

### 5. Worksite Detail

**Purpose:** A persistent container for all work related to that location/project.

**Tabs:**
- Overview
- Walks
- Stops
- Plans
- Files
- Contacts
- Deliverables

**Overview**
Shows:
- Worksite name
- Address/location
- Client/company
- Active walks
- Open issues
- Last activity
- Recent deliverables

**Buttons:**
- Start Walk
- Add Plan
- Add Contact
- Create Deliverable

**Walks tab**
Shows:
- In-progress walks
- Completed walks
- Collaborator-submitted walks
- Walks needing review

**Actions:**
- Resume
- Review
- Create deliverable
- Archive
- Delete

**Stops tab**
Shows all stops across the worksite.

**Filters:**
- All
- Open
- Assigned
- High priority
- Needs details
- Unsynced
- With attachments
- With markup

**Plans tab**
Shows uploaded plans.

**Future features:**
- Plan-based pinning
- Sheet selector
- Plan layers
- Plan-linked stops

**Files tab**
Shows SlateDrop worksite folder.

**Folders:**
- Walks
- Photos
- Attachments
- Plans
- Deliverables
- Shared Links

**Contacts tab**
Shows project/worksite contacts.

**Fields:**
- Name
- Company
- Role
- Email
- Phone
- Notes

**Deliverables tab**
Shows deliverables generated from this worksite.

### 6. Capture Screen

**Purpose:** Capture field stops.

**Current state:**
- V1 capture is active by normal routing.
- Capture V2 exists by direct URL.
- Do not enable Capture V2 globally until ready.

**Final desired capture flow:**

**Empty capture state**
Shows:
- Title: Capture field proof
- Take Photo
- Camera Roll
- Optional voice/text note

**After capture**
Shows:
- Photo preview
- Stop number
- Detail drawer
- Filmstrip
- Sync status

**Capture top bar**
Shows:
- Site Walk / back
- Stop number
- Walk title
- End / Review

**Capture detail drawer**

**Tabs:**
1. Details
2. Attachments
3. Markup

**Details tab**

**Fields:**
- Title
- Field note
- Status
- Priority
- Category
- Trade
- Location/room/area
- Assignee
- Due date

**Smart chips:**
- Safety
- Progress
- Issue
- Completed
- Needs Review
- Electrical
- Mechanical
- Drywall

**Buttons:**
- Save Details
- Save & Next Stop
- Finish Walk & Review

**Attachments tab**

**Options:**
- Camera
- Camera Roll
- SlateDrop file
- Voice note
- PDF/file attachment

**Buttons:**
- Add Attachment
- Remove
- Save

**Markup tab**

**Tools:**
- Select
- Pen
- Rectangle
- Circle
- Arrow
- Text
- Color
- Stroke width
- Undo
- Redo
- Delete

**Buttons:**
- Save Markup
- Reset
- Finish Walk & Review

**Filmstrip**
Shows captured stops:
- Thumbnail
- Stop number
- Sync state
- Missing info warning

**Actions:**
- Tap stop to edit
- Long press / menu:
  - Duplicate
  - Delete
  - Move/reorder
  - Mark complete
  - Add attachment
  - Create task

### 7. Walk Review / Stops List

**This is critical.**

This is the screen where every stop in a walk is listed before deliverables.

**Route concept:**
`/site-walk/walks/[sessionId]/review`
or current Capture V2 summary route:
`/site-walk/capture-v2/summary?session=<SESSION_ID>`

**Header**
Shows:
- Walk title
- Worksite/project
- Date/time
- Sync status
- Item count

**Buttons:**
- Continue Capture
- Finish Walk
- Create Deliverable
- More

**Summary cards**

**Stats:**
- Total stops
- Stops needing notes
- Open issues
- Assigned items
- Unsynced items
- Photos/files count

**Filters**
- All
- Needs Details
- Open
- High Priority
- Assigned
- Unsynced
- With Attachments
- With Markup

**Search**
Search:
- Title
- Notes
- Trade
- Room/location
- Assignee

**Stop cards**

Each stop card shows:
- Thumbnail
- Stop number
- Title
- Note preview
- Status
- Priority
- Trade/category
- Assignee
- Due date
- Sync badge
- Attachment count
- Markup indicator

**Tap card:**
- Opens stop detail editor

**Swipe/menu actions:**
- Edit
- Add note
- Add attachment
- Mark complete
- Assign
- Duplicate
- Delete
- Move to another walk/worksite
- Create task
- Include/exclude from deliverable

**Bulk actions:**
- Select multiple stops
- Assign
- Change status
- Change priority
- Include in deliverable
- Export selected
- Delete selected

### 8. Stop Detail Editor

Opened from the Walk Review / Stops List.

**Tabs:**
- Details
- Photo / Markup
- Attachments
- Activity

**Buttons:**
- Save
- Previous Stop
- Next Stop
- Back to Review
- Include in Deliverable

### 9. Deliverables

Deliverables are generated from walks/stops.

**Deliverables home**

**Tabs:**
- Drafts
- Ready
- Shared
- Templates

Cards show:
- Deliverable name
- Type
- Source walk/worksite
- Last edited
- Shared status

**Buttons:**
- Create Deliverable
- Open Draft
- Share
- Duplicate

**Create Deliverable flow**

**Step 1 — Choose type:**
- Punch list
- Field report
- Progress report
- Inspection report
- Proposal / estimate support
- Photo log
- Issue report

**Step 2 — Choose source:**
- Current walk
- Multiple walks
- Worksite
- Selected stops only

**Step 3 — Select stops:**
- All
- Filtered
- Manual

**Step 4 — Organize:**
- By location
- By trade
- By priority
- By status
- Custom order

**Step 5 — Branding:**
- Company logo
- Colors
- Header/footer
- Client info
- Prepared by

**Step 6 — Preview:**
- Mobile preview
- PDF preview
- Web link preview

**Step 7 — Share/save:**
- Save to SlateDrop
- Email link
- Text link
- Download PDF
- Copy share link

### SlateDrop Relationship

SlateDrop is the file spine.

Site Walk files should eventually be organized as:

```
SlateDrop
  Site Walk
    Quick Walks
    Worksites
      [Worksite Name]
        Walks
        Photos
        Attachments
        Plans
        Deliverables
        Shared Links
```

**Rules:**
- Every captured photo saves to SlateDrop
- Every attachment saves to SlateDrop
- Every markup saves to SlateDrop
- Every deliverable saves to SlateDrop
- If a user upgrades subscription, old worksite/field project data must not be lost

### Subscription / Role Model

**Lower Site Walk tier:**
- Create field projects/worksites
- Quick walks
- Basic capture
- Basic deliverables
- Basic SlateDrop access

**Higher Site Walk tier:**
- Full project management
- Schedules
- Budgets
- RFIs
- Submittals
- Collaborators
- Project folder structure
- Executive/organization visibility
- More advanced deliverables

**Collaborator role:**
- Limited app access
- Can contribute to assigned walks
- Can capture assigned observations
- Can submit back to subscriber
- Should not have full account/admin access

**Executive viewer:**
- Read-only high-level view
- Can see what users are doing across projects
- Helpful for ASU leadership testing

## Guardrails for Every Build Prompt

- Do not stage/commit API routes unless explicitly asked.
- Do not stage/commit migrations unless explicitly asked.
- Do not enable `NEXT_PUBLIC_CAPTURE_V2`.
- Do not delete legacy pages until replacements are proven.
- Do not create fake buttons.
- Do not use `href="#"`.
- Do not show "Coming Soon" in authenticated app UI.
- Do not route mobile users to legacy `/site-walk/walks`.
- Do not route New Worksite to old setup once replacement exists.
- Use real data when possible.
- Use honest empty states.
- Keep mobile layout within viewport.
- Use internal scrolling panels, not full-page scroll.
- Run:
  - `npm run typecheck`
  - `npm run build`
- Return:
  - Files changed
  - Validation results
  - Commit hash
  - Risks
  - Phone test URL

## Master Prompt 1 — Full Audit and Strategy Reset

**Use this first in a fresh Composer/Cursor chat.**

You are my Principal Full-Stack Mobile App Architect for Slate360.

Treat this as a fresh source-of-truth handoff. Do not rely on prior chat memory.

**Project**
Slate360 is an app-first/mobile-first platform for the built environment.

The current app-store-focused build should include:
- Slate360 app shell
- Site Walk app
- Digital Twin visible as locked/preparing until built
- No 360 Tours, Design Studio, or Content Studio in this app-store build

Site Walk is the first functional app.

**Current strategic problem**
The Site Walk app still feels like a hybrid of new shell and old legacy pages.

We are no longer trying to patch legacy pages forever. The strategy is:

1. Quarantine old legacy pages from active mobile flows.
2. Build/route to new mobile-first Site Walk screens.
3. Redirect/bypass old routes from mobile users where safe.
4. Keep legacy pages temporarily only as fallbacks.
5. Delete/archive old pages only after grep proves nothing active depends on them.

**Do not delete old pages yet.**

**Already completed work to verify**
Composer previously worked on:
1. `/app` command center:
   - Site Walk tile
   - Digital Twin locked/preparing tile
   - Quick Actions: Create, SlateDrop, Search, Deliverables
   - Bottom nav: Home, Projects, SlateDrop, Coordination, Account
2. Site Walk home:
   - 2×2 action grid:
     - Quick Walk
     - New Worksite
     - Walk from Worksite
     - Review & Deliver
3. Site Walk route quarantine:
   - Attempted to keep active mobile shell links away from `/site-walk/walks`
   - Old `/site-walk/walks` still exists
   - Capture exit paths may still use legacy routes
4. Capture V2:
   - Exists behind direct URL only
   - Do not enable `NEXT_PUBLIC_CAPTURE_V2`
   - Normal Quick Walk still routes to V1 capture

**Immediate problem**
Old pages still appear after clicking around.

Examples:
- New Worksite still opens old `/site-walk/setup`.
- Direct `/site-walk/walks` still opens old UI.
- V1 capture still shows old UI.
- Deliverables is sparse.
- Worksites lacks a complete detail flow.
- Site Walk home may have a layout gap above the bottom nav.
- Some capture exit paths may still send users to old pages.

**Desired Site Walk workflow**
Site Walk should support:
1. Site Walk Home
2. Quick Walk
3. New Worksite
4. Walk from Worksite
5. Worksite detail
6. Capture
7. Walk Review / Stops List
8. Stop Detail Editor
9. Deliverables
10. SlateDrop integration
11. Coordination/collaboration
12. Future plan-based walks

**Audit before coding**
Do not code yet.

Inspect the repo and return:
1. Current local HEAD.
2. Current origin/main HEAD if available.
3. Modified/untracked files.
4. Whether Phase 2A and 2B commits are present.
5. Exact active route/component for:
   - `/site-walk`
   - Quick Walk
   - New Worksite
   - Walk from Worksite
   - Review & Deliver
   - Worksites bottom nav
   - Deliverables bottom nav
   - Recent walk row
   - Worksite row
   - Capture exit
6. Which actions still route to old pages.
7. Which old pages are still reachable only by direct URL.
8. Which old pages are still reachable from normal app clicks.
9. Which files/components are the new mobile-first source of truth.
10. Which legacy files should be bypassed.
11. Whether any Composer commits should be reverted.
12. Whether the best strategy is:
   - Continue patching current V1 shell,
   - Create a new clean Site Walk source-of-truth component,
   - Add new routes and redirect `/site-walk` to them,
   - Use a feature flag,
   - Middleware-quarantine old routes.
13. First safest coding step.

**Do not delete old pages yet**
Before any deletion, prove:
- No imports depend on them
- No routes link to them
- No capture exit path uses them
- No middleware expects them
- No email/deep links use them

**Return**
Return a detailed audit report and the first recommended coding prompt.

## Master Prompt 2 — Implement New Source-of-Truth Route Map

**Use this after the audit confirms the next safe step.**

Composer, implement the new Site Walk mobile source-of-truth route map.

Do not enable `NEXT_PUBLIC_CAPTURE_V2`.
Do not delete legacy pages.
Do not modify API routes.
Do not modify migrations.
Do not commit docs or ops scripts.
Do not touch BUG-079 or plan viewer.
Do not stage unrelated files.

**Goal**
Make the active Site Walk app-shell buttons open the new mobile-first Site Walk screens instead of legacy pages.

**Required route behavior**

**`/site-walk`**
Must render the new mobile-first Site Walk home:
- Header: Site Walk / Field capture & deliverables
- 2×2 action grid:
  - Quick Walk
  - New Worksite
  - Walk from Worksite
  - Review & Deliver
- Contained panel:
  - Recent
  - Worksites
  - Shared
  - Needs Review
- Bottom nav:
  - Home
  - Worksites
  - SlateDrop
  - Coordination
  - Deliverables

**Quick Walk**
Behavior:
- Create walk/session using existing safe session creation path.
- Route to current V1 capture while `NEXT_PUBLIC_CAPTURE_V2=false`.
- Do not force worksite/project/plan setup.

**New Worksite**
Do not open old `/site-walk/setup`.
Create a new mobile-first worksite creation screen or sheet.

**Fields:**
- Worksite name
- Location/address optional
- Client/company optional
- Description optional

**Buttons:**
- Create & Start Walk
- Create Only
- Cancel

After create:
- If Create & Start Walk: create worksite then start walk
- If Create Only: return to Worksites tab or open worksite detail

Use existing backend/API only if safe. If no safe create API exists, stop and report. Do not fake saving.

**Walk from Worksite**
Do not route to `/site-walk/walks`.
Open in-shell Worksites picker/list.

User can:
- Select worksite
- Start walk
- Open worksite detail

**Review & Deliver**
Open in-shell Deliverables tab.
Do not route to `/site-walk/deliverables` if mobile-quarantined.

**Worksites tab**
Must be an in-shell mobile view, not old `/site-walk/walks`.

Show:
- All Worksites
- New Worksite
- Worksite rows
- Each row:
  - Name
  - Walk count
  - Last activity
  - Menu

Tap row:
- Open new worksite detail if implemented
- Otherwise open a safe in-shell action sheet
- Do not go to `/site-walk/walks`

**Deliverables tab**
Show honest current state:
- Drafts
- Ready
- Shared
- Templates if implemented
- Empty state if none

Buttons:
- From Walk
- Open Recent Walks
- No fake generation
- No Coming Soon

**Recent / Needs Review**
Rows should not route to old `/site-walk/walks`.

Recent walk row should route to:
- Capture if in progress
- Walk review/stops list if complete and implemented
- Otherwise safe capture/review route that exists

**Layout requirements**
- Mobile-first
- 100dvh app screen
- No body scroll
- Internal scrolling panels
- Bottom nav stable
- No huge gaps
- No tall stretched action cards
- No old orange desktop-style pages
- No `href="#"`
- No Coming Soon

**Validation**
Run:
- `npm run typecheck`
- `npm run build`

Grep edited files for:
- `href="#"`
- Coming Soon
- coming soon
- `/site-walk/walks`

Any remaining `/site-walk/walks` references must be classified.

**Commit**
If validation passes, commit only intended files as:
`fix(site-walk): route app shell to mobile-first screens`

**Return:**
1. Files changed
2. Route map before/after
3. Buttons and destinations
4. Legacy routes still reachable and why
5. Validation results
6. Commit hash
7. Remaining risks
8. Phone test URL

## Master Prompt 3 — Full Build Sequence

**Use this as the step-by-step execution plan after the route map is stable.**

Composer, use this as the Site Walk build sequence. Do not build all steps at once. Execute only the step I explicitly approve.

**Global guardrails**
- Do not enable `NEXT_PUBLIC_CAPTURE_V2` unless explicitly approved.
- Do not delete legacy pages until explicitly approved.
- Do not commit API routes unless explicitly approved.
- Do not commit migrations unless explicitly approved.
- Do not use `href="#"`.
- Do not show Coming Soon.
- Do not create fake buttons.
- Do not route users to old `/site-walk/walks` from the mobile shell.
- Run `npm run typecheck` and `npm run build` for every slice.
- Commit each slice separately.

### Phase A — Route Quarantine and Layout Stabilization

**A1.** Confirm `/site-walk` home is the new mobile source of truth.

**A2.** Fix bottom gap by making the contained panel fill remaining height.

**A3.** Remove all active mobile links to `/site-walk/walks`.

**A4.** Add middleware or mobile redirect for `/site-walk/walks` only after confirming no active flow depends on it.

**A5.** Keep legacy pages as fallback until replacement screens exist.

### Phase B — New Worksite Replacement

Build a mobile-first New Worksite sheet/screen.

**Fields:**
- Worksite name
- Location/address optional
- Client/company optional
- Description optional

**Buttons:**
- Create & Start Walk
- Create Only
- Cancel

Do not use old `/site-walk/setup` for New Worksite.

If safe API exists, wire it.
If no safe API exists, stop and report what API is needed.

### Phase C — Walk from Worksite Flow

Build in-shell worksite picker.

**Features:**
- Search
- Worksite rows
- Start walk
- Open worksite
- New worksite

Do not route to `/site-walk/walks`.

### Phase D — Worksite Detail

Build worksite detail with tabs:
- Overview
- Walks
- Stops
- Plans
- Files
- Contacts
- Deliverables

Use real data where available.
Use honest empty states where not.

### Phase E — Walk Review / Stops List

Build a mobile-first walk review screen.

Show:
- Walk title
- Worksite/project
- Date
- Sync status
- Total stops
- Stops needing details
- Unsynced items
- Photos/files count

**Stop cards** show:
- Thumbnail
- Stop number
- Title
- Notes preview
- Status
- Priority
- Category/trade
- Assignee
- Due date
- Sync state
- Attachment count
- Markup indicator

**Actions:**
- Edit
- Add note
- Add attachment
- Mark complete
- Assign
- Duplicate
- Delete
- Include/exclude from deliverable
- Create task

### Phase F — Deliverables Foundation

Build deliverables home:

**Tabs:**
- Drafts
- Ready
- Shared
- Templates

**Create flow:**
1. Choose type
2. Choose source
3. Select stops
4. Organize
5. Branding
6. Preview
7. Share/save

Do not fake PDF generation. If backend generation is not ready, build only real draft/selection UI and honest save states.

### Phase G — Capture V2 Integration

Only after Site Walk route map is stable:
- Add owner-only/tester-only Capture V2 entry
- Do not flip global flag
- Test capture → detail drawer → filmstrip → summary
- Then decide when to route Quick Walk to Capture V2

### Phase H — Plan-Based Walks / BUG-079

Do not patch React-PDF endlessly.

Use a mobile-safe plan approach:
- Server-rasterized plan tiles/images
- Mobile pan/zoom layer
- Pin capture
- Pin list
- Plan-linked stops

Build this as its own controlled slice.

### Phase I — Legacy Deletion

Only after:
- No active links to legacy routes
- No imports
- No capture exits
- No middleware dependencies
- No email/deep links
- Replacement screens verified

Then archive or delete old pages.

**For each phase**

**Return:**
1. Files changed
2. UX behavior
3. Routes changed
4. Validation results
5. Commit hash
6. Risks
7. Phone test URL

## Recommended Immediate Path

I would do this now:

1. Ask the assistant to audit current route state with **Master Prompt 1**.
2. Then choose one of two directions:
   - If current V1 shell can be salvaged: run the source-of-truth route map prompt.
   - If current shell is too tangled: create a new clean Site Walk source-of-truth component and make `/site-walk` render that.
3. Fix New Worksite next, because that is the most obviously wrong legacy screen.
4. Fix Walk Review / Stops List after that, because it is the bridge between capture and deliverables.
5. Only then resume Capture V2 and plan-viewer work.

**The most important principle is this:**

Every visible Site Walk button must open a new mobile-first screen, an in-shell tab, or a real working route. If it opens old `/site-walk/setup`, old `/site-walk/walks`, or an old orange legacy screen, that button is not done.

---

**End of Site Walk Master Build Plan**

*This document is the single source of truth for all Site Walk V2 development decisions, prompts, and guardrails.*
