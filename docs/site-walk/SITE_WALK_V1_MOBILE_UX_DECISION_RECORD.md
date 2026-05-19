# Site Walk V1 Mobile UX Decision Record

Date: 2026-05-13
Status: Locked planning direction for the next Site Walk UI phase
Scope: Site Walk mobile workspace, Plan Walk, Quick Walk, active capture, plan tools, markup, attachments, and the first design-token foundation.

## Current state

The live Plan Walk loop is partially functional and must be preserved:

- Plan opens on mobile through server-rasterized plan imagery.
- Pan and zoom work.
- Long press opens capture.
- Plan-linked capture can be created.
- Saved plan pins can be opened.

The next phase is not a backend rewrite. It is a mobile UX architecture cleanup so Site Walk behaves like a native field app instead of a stack of web panels.

## Non-negotiables

- Do not remove the working Plan Walk path.
- Do not reintroduce browser-side construction-PDF rendering on mobile.
- Do not disturb Trigger.dev rasterization.
- Do not change Supabase schema as part of UI cleanup unless a later approved slice explicitly requires it.
- Do not start an app-wide redesign in one pass.
- Do not add mock, filler, demo, beta/test, Coming Soon, or placeholder authenticated-shell content.
- Do not hide or delete existing user data.

---

## 1. Site Walk Home / Workspace becomes a command center

The Site Walk home/workspace should become a compact command center for field work, not a marketing page or a long scrolling content page.

It should include:

- Resume Active Walk
- Start New Walk
- Recent Walks
- Issues / Open Items
- Needs Review
- Draft Deliverables
- Unsynced Items
- Project / Field Project shortcuts

Rules:

- Remove app install banners inside authenticated app surfaces.
- Remove duplicate top Site Walk navigation when it duplicates the platform bottom nav.
- Recent Walks must be a contained scroll panel above bottom nav.
- The page itself should not scroll under bottom nav.
- Walk rows need a three-dot menu with:
  - Rename
  - Duplicate Walk
  - Link / Change Project
  - Create Deliverable
  - Archive
  - Delete
- Delete must require a second confirmation.

## 2. Capture header uses a consistent task header

Plan-linked capture must show action and context. Avoid vague labels like `PLAN-LINKED` when the user needs to know where they are and what to do next.

Preferred labels:

- `Stop 2 · From Plan`
- `Stop 2 · Plan Location`

Header should include:

- Back to Plan
- Stop number
- Save/sync status when available
- More menu
- Exit Walk as secondary/destructive, not primary

Rules:

- Exit Walk must not replace Back to Plan.
- Back to Plan is the primary navigation affordance during plan-linked capture.
- Quick Walk and Plan Walk should use the same task-header component with different context copy.

## 3. Stop navigation needs a horizontal strip

Use a compact horizontal stop strip:

`Stop 1 | Stop 2 | Stop 3 | + Stop`

It may live:

- under the task header, or
- inside the lower drawer.

Rules:

- It must not waste vertical space.
- It should support current stop highlighting.
- It should make it clear that the user is building a sequence of stops, not isolated uploads.

## 4. Plan viewer must maximize the plan

The plan is the workspace. The UI must not crowd it.

Plan viewer must support:

- Full available plan canvas
- Compact top sheet bar
- Page forward/back
- Sheet thumbnail rail
- Sheet/page search
- Search results drawer
- Layer/pin overlay toggles
- Clean plan / show pins toggle
- Portrait and landscape layouts

Portrait layout:

- Compact top bar
- Large plan canvas
- Collapsible bottom sheet/tools/page rail

Landscape layout:

- Plan canvas plus side drawer/tool inspector if useful

Rules:

- The plan should remain usable with one hand on a phone.
- Full-plan pan/zoom remains the priority over persistent chrome.
- Plan controls must collapse predictably.

## 5. Plan tools use bottom drawer with tabs

Use a plan tools bottom drawer with tabs:

- Sheets
- Search
- Pins
- Layers

Collapsed state:

- `Sheets · 1/24`

Expanded state:

- Thumbnails
- Search
- Pins list
- Layer toggles

Rules:

- Keep sheet navigation, search, pin list, and layer controls available without covering the plan by default.
- Search results should live inside the drawer, not as floating overlapping cards.
- Pin/clean-view toggles should be easy to reach but not permanent visual clutter.

## 6. Markup tools become compact and contextual

Markup should feel like a photo/plan annotation rail, not a large form panel.

Row 1:

- Select
- Pen
- Rectangle
- Circle
- Arrow
- Text
- Undo
- Redo

Row 2:

- Colors
- Stroke sizes
- Delete only when relevant

Rules:

- Remove long instructional text.
- No giant square markup block.
- No toolbar covering photo or plan.
- Touch targets must be at least 44px.
- Destructive delete should appear only when a selected markup item exists.

## 7. Save button wording becomes state-specific

Use explicit save labels based on workflow state.

For Plan Walk:

- `Save Stop & Return to Plan`

For Quick Walk:

- `Save Stop & Continue`

Rules:

- Avoid vague `Details & Save` language.
- The action should say what will happen after save.
- Save copy should align with the current stop context.

## 8. Attachments move into the details sheet

Attachments belong with details, not as independent covered modals or hidden toolbar actions.

Details sheet tabs:

- Details
- Attachments
- Markup

Attachments should support:

- Photos
- Documents
- Other photos
- Future 360 photos
- Future videos

Rules:

- No attach-file modal should be covered by toolbar/action rail.
- Attachment previews must stay within safe-area constraints.
- Attachment state should use the same capture/save/offline path as the rest of Site Walk when possible.

## 9. Quick Walk and Plan Walk share the same capture system

Shared system:

- `CaptureShell`
- Stop preview card
- Details Sheet
- Attachment system
- Markup tools
- Metadata path
- Offline path

Plan Walk adds:

- Back to Plan
- Plan sheet context
- Plan pin
- Plan coordinates

Rules:

- Do not build a second plan-only capture stack.
- Quick Walk and Plan Walk should feel like the same app with extra plan context, not two unrelated modes.

## 10. Pin movement rules

Draft pin:

- Draggable before save.

Saved pin:

- Locked by default.
- Movable only through explicit Edit Location / Move Pin mode.

Reason:

- This prevents accidental pin movement while panning plans.

## 11. Before/After and Ghost

For the foundational version, Before / After mode must exist or be clearly planned.

Ghost overlay rules:

- Ghost overlay appears only during guided recapture.
- Ghost should not be a large always-visible control.

User flow:

1. Open saved stop.
2. Tap Add After Photo.
3. Camera opens with ghost overlay of original photo.
4. User aligns and captures.
5. Save as After.
6. Deliverables can show Before / After.

## 12. Color direction

Move away from harsh black/orange.

Use:

- Premium graphite/slate base
- Softer panels
- Amber as restrained primary accent
- Muted teal/smoke as secondary accent
- Warm off-white text
- Lighter neutral workspaces where plans/photos need clarity

Rules:

- Site Walk plan/photo workspaces may use clearer neutral canvas framing.
- Authenticated app shell should still feel premium and consistent.
- Do not recolor the whole app in one pass.

## 13. Design system direction

Start with:

- CSS variable tokens
- Hardcoded color audit script

Then migrate components in slices.

First migration target:

- Site Walk capture/plan UI only.

Later migration targets:

- Shell
- Auth
- Homepage
- Email/share surfaces

Rules:

- Token work starts as planning and audit first.
- Do not perform broad color replacement until the token plan and first Site Walk slice are approved.
