# Slate360 Phase 1 — Client Portal + Owner Operations Rebuild
## Canonical Master Build Plan

**Repository:** `bcvolker/slate360-rebuild`  
**Objective:** Contractor-ready Phase 1 web product using the existing backend, data, auth, project model, share system, and mature viewer logic while replacing the current AI-slop-heavy front end.

## Product outcome
Phase 1 is done when a contractor/client can:
1. log in,
2. see projects visually,
3. open a project and understand its latest state,
4. enter one unified spatial experience,
5. switch among only the deliverables available,
6. review items/questions,
7. find documents,
8. move through project history,
9. compare progress at a basic useful level,
10. securely share a project view/item/deliverable.

Phase 1 is done when the Slate360 operator can:
1. create/manage clients,
2. create/manage projects,
3. create/manage visits,
4. ingest/upload,
5. see processing state,
6. review QA,
7. author/pin content,
8. preview the exact client experience,
9. publish/revoke,
10. manage shares.

Not required for Phase 1:
- subscription billing
- self-service capture
- Site Walk App Store release
- Twin 360 App Store release
- full AI assistant
- Procore write-back
- Autodesk integration
- XR/Vision Pro
- full video editor

## Canonical information model
Client / Organization → Project → Visit / Scan → Deliverables → Spatial representations → Items / Documents / History / Shares

Spatial representations:
- Reality
- Geometry
- 360
- Plan
- Drone
- Thermal

Future capture producers (Site Walk, Twin 360, aerial upload, future LiDAR rigs, client upload) create visits/assets but are not top-level product navigation.

## Client information architecture
Top-level:
- Projects
- Account
Optional later:
- Shared with me

Project:
- Overview
- Explore
- Items
- Documents
- History

### Overview
Show project identity, latest state, latest visit, available experiences, open/recent items, and recent activity. No generic KPI dashboard.

### Explore
One unified spatial shell with only available representations:
Reality | Geometry | 360 | Plan | Drone | Thermal

Common shell owns project/date context, representation selection, fullscreen, share, items/documents toggles, reset/recenter, and help. Embedded viewers keep media-specific controls.

### Items
Use plain construction/project language. Every spatial item should jump to the related location/view when locator data exists.

### Documents
One canonical project document record should be searchable, attachable to items/locations/plans, and usable through project history.

### History
Visits are project dates/states, not separate apps.

## Visual project portfolio
Project cards must be image-first.

Hero priority:
1. approved/latest Reality still
2. latest 360 preview
3. aerial/drone still
4. plan thumbnail
5. selected project image
6. satellite fallback
7. neutral placeholder

Rules:
- imagery dominates
- no decorative icon tile
- no generic glass card
- no long filler description
- no fake metrics
- no "Work directory"
- minimum metadata needed to identify the job
- cards should feel closer to an architectural portfolio than SaaS tiles

## Owner/operator IA
Primary:
- Home
- Clients
- Projects
- Processing
- QA & Publish
- Shares

Secondary:
- Settings
- Account

Owner Home answers: **What needs my attention next?**
Use actionable queues, not widgets.

Operator workflow:
Client → Project → Visit → Ingest → Process → QA → Author → Preview → Publish → Share → Closeout

## Unified viewer strategy
Reuse competent existing engines instead of rebuilding:
- Gaussian/splat
- GLB/model
- Photo Sphere/360
- plan
- image/video/thermal
- share/token infrastructure

Required hardening:
- centering/framing
- stable navigation
- no weird redirects
- predictable back behavior
- good mobile behavior
- clear loading/error/empty states
- deep-linkable representation/visit/item where possible

## Compare / progress
Phase 1 baseline:
- choose two visits
- side-by-side compare
- clear date labels
- synchronized camera when a reliable shared world frame exists
- otherwise independent views with explicit labeling
- basic before/after compare for supported media

Later:
- swipe reveal
- fade/dissolve
- timeline scrub
- change highlighting
- geometry/BIM deviation

## Presentation / social clip strategy
Social media is commercially important.

Phase 1 should establish:
- saved camera view
- saved camera path
- keyframe
- duration
- easing
- representation
- visit/date
- optional title/branding

Lightweight Presentation Mode:
- hide UI/chrome
- auto-orbit
- move between saved views
- simple flythrough
- play/pause/restart
- 16:9 / 9:16 / 1:1 framing guides
- clean screen-recording workflow

Do NOT build a full video editor.

Future export:
- server/browser-rendered MP4/WebM
- logo/title/date/end card
- reusable camera paths
- render queue

## Search and AI readiness
Phase 1 search:
- document/file names
- item titles/content
- visit dates
- locations
- sheet numbers
- tags
- project metadata

Future assistant is project-aware and read-only first. No generic floating chatbot in Phase 1.

## Integration readiness
Reuse Google location/maps where valuable. Allow future external references for Procore/Autodesk without building the integration now.

## Visual design rules
Required:
- light professional shell
- warm white/off-white canvas
- graphite ink
- restrained blue/cobalt accent
- real project imagery
- thin neutral dividers
- clear hierarchy
- plain language
- compact but not cramped
- 44–48px touch targets where interactive

Forbidden unless explicitly approved:
- glassmorphism
- dark portal/dashboard shell
- decorative icon tiles
- configurable widget dashboard
- nested cards
- fake analytics
- arbitrary stats
- gradient app cards
- giant empty hero whitespace
- AI-generated helper paragraphs
- duplicate nav
- "Studio" proliferation
- empty/stub tabs

Dark immersive viewer canvas is allowed.

## Existing code classification
Every significant route/component must be tagged:
- KEEP BACKEND
- KEEP + HARDEN
- REBUILD FRONT END
- DEFER / HIDE
- RETIRE AFTER CUTOVER

## Development isolation
Suggested:
- worktree: `C:\s360-ui-vnext`
- branch: `feature/ui-vnext-phase1`

Do not touch reconstruction worktrees or trainer code. Do not clean repo before replacement exists.

## Slice plan
### Slice 0 — Repo audit + salvage map + route contract
Inventory routes, viewers, APIs/loaders, duplicated/legacy routes, salvage classifications, vNext route map, redirect plan. No user-facing implementation.

### Slice 1 — vNext foundation + shells
Light tokens, owner/client shells, responsive nav, typography, preview harnesses.

### Slice 2 — Client project portfolio
Visual project cards, media priority/fallback, search, loading/empty/error, responsive.

### Slice 3 — Client project overview
Visual project header, latest visit, available deliverables, recent/open items, recent activity, Explore entry.

### Slice 4 — Unified Explore viewer
Common shell, dynamic representation switcher, reused engines, centering/navigation fixes, deep links, presentation-mode skeleton.

### Slice 5 — Items + spatial linking
Item list/detail, comments/questions if permitted, stable locator abstraction across plan/Reality/Geometry/360/geospatial/date.

### Slice 6 — Documents + project search
Clean Documents UI over existing backend, search, deep links, spatial/document associations.

### Slice 7 — History + Compare
Visit timeline, prior visit opening, two-visit selection, baseline side-by-side compare.

### Slice 8 — Presentation / social clip foundation
Saved views, orbit/flythrough path, keyframe/path model, UI-free presentation mode, aspect-ratio guides, recording-friendly workflow.

### Slice 9 — Owner Home + Clients + Projects
Needs-attention queue, Clients, Projects, no widget board.

### Slice 10 — Processing + QA & Publish + preview-as-client
Processing state, QA queue, preview, accept/reject, author/pin, publish/revoke; no algorithm changes.

### Slice 11 — Sharing + permissions + final polish
Secure shares, expiry/revoke, exact view/item sharing, recipient rules, accessibility/mobile/error-state polish.

### Slice 12 — Cutover + cleanup
Canonical route switch, intentional redirects, dead UI removal, stale preview cleanup, duplicate component deletion, docs cleanup, AGENTS/CLAUDE/Cursor guidance updates, full tests, release checklist.

## Acceptance protocol
Cursor must return:
1. summary
2. exact files changed
3. tests/results
4. routes affected
5. screenshots
6. known limitations
7. explicit statement next slice was NOT started

Required screenshot widths:
- 1440 desktop
- laptop
- tablet
- phone

Reviewer result:
- APPROVED
- APPROVED WITH SMALL FIXES
- REVISE BEFORE NEXT SLICE

No next slice without explicit approval.

## Phase 1 release gate
Must have reliable auth, no redirect loops, correct permissions, visual project portfolio, clear project overview, stable Explore viewer, dynamic deliverables, Items, Documents/search, History, basic compare, sharing, owner processing/QA/publish, preview-as-client, usable mobile portal, no high-severity front-end bugs, no visible stale SaaS/app language, no dead/stub client tabs, passing typecheck/build/tests.

## Cleanup policy
Cleanup last. Before deleting any file, prove replacement exists, search imports/references, check route reachability/tests, and classify DELETE vs ARCHIVE.

Repo cleanup is also AI-agent hygiene: stale implementations and stale design docs cause future agents to resurrect obsolete patterns.

## Canonical precedence
This plan supersedes older documents only where they conflict on:
- current business model
- current portal/dashboard
- current navigation
- project-first architecture
- deliverable organization
- Phase 1 scope
- visual design direction

Older docs may still contain valid implementation history or backend facts.
