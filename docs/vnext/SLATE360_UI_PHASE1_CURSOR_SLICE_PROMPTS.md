# Slate360 Phase 1 — Cursor Slice Prompt Pack

Use **one prompt at a time**.

Global rules:
- Repo: `bcvolker/slate360-rebuild`
- Work only in dedicated vNext worktree/branch.
- Do not touch reconstruction/trainer code.
- Preserve backend/data contracts.
- Do not preserve old UI merely because it exists.
- Do not invent unapproved tabs/cards/metrics/copy.
- Light professional design; no dark/glass SaaS shell outside immersive viewers.
- Generate screenshots for UI slices.
- End each slice with a completion report and WAIT FOR APPROVAL.
- Do not start the next slice.

## Slice 0 — Audit + salvage map

Read `SLATE360_UI_PHASE1_MASTER_BUILD_PLAN.md` first.

Do not implement user-facing UI.

Create/use the dedicated vNext branch/worktree without touching reconstruction work.

Audit and produce:
1. authenticated owner/client route inventory
2. project-route inventory
3. public/share/token route inventory
4. mature viewer inventory
5. data loaders/APIs used by projects, visits, deliverables, files, items/questions, sharing
6. route problems: weird redirects, duplicated routes, legacy groups, blank/stub routes
7. salvage table: KEEP BACKEND / KEEP + HARDEN / REBUILD FRONT END / DEFER-HIDE / RETIRE
8. proposed canonical vNext route tree
9. proposed legacy redirect map
10. list of viewer/components to reuse behind new shells

Write:
`docs/vnext/ROUTE_AND_COMPONENT_SALVAGE_MAP.md`
`docs/vnext/PHASE1_IMPLEMENTATION_STATUS.md`

Do not delete anything. Do not alter production routes.

Return branch/worktree, commit/status, files created, major findings, conflicts/risks, and confirmation Slice 1 was NOT started.

STOP AND WAIT FOR APPROVAL.

## Slice 1 — vNext foundation + shells

Proceed only if Slice 0 is approved.

Implement parallel light vNext foundation:
- owner/client shells
- light warm canvas
- graphite text
- restrained cobalt accent *(superseded 2026-09-18 — now Slate360's deep green `#0C7A52`; see `docs/vnext/UI_DESIGN_RULES.md`)*
- no glassmorphism
- no dark app shell
- no decorative icon tiles
- simple nav
- responsive desktop/tablet/phone
- centralized tokens
- locked typography/spacing
- preview routes/fixtures allowed
- current production routes untouched

Client nav: Projects, Account
Owner nav: Home, Clients, Projects, Processing, QA & Publish, Shares, quiet Settings/Account

Create/update `docs/vnext/UI_DESIGN_RULES.md` and status doc.

Provide 1440/laptop/tablet/phone screenshots.

STOP AND WAIT FOR APPROVAL.

## Slice 2 — Client project portfolio

Proceed only if Slice 1 is approved.

Build visual Projects surface using real existing data contracts.

Hero priority:
1. Reality still
2. 360 preview
3. aerial still
4. plan thumbnail
5. project image
6. satellite fallback
7. neutral placeholder

No icon tiles, glass cards, fake metrics, filler descriptions, or Portfolio subtab.
Show project name, concise context, latest visit if available, and only real deliverable indicators.
Include search/loading/empty/error/mobile.

STOP AND WAIT FOR APPROVAL.

## Slice 3 — Client project overview

Proceed only if Slice 2 is approved.

Build Overview to answer:
- what project is this?
- latest documented state?
- latest visit?
- what can I open?
- open/recent items?
- what changed recently?

Required: visual header/hero, latest visit, Explore action, actual available deliverables, recent/open items, recent activity if real.

Project nav target: Overview / Explore / Items / Documents / History

No KPI strip. No old Site Walk/Twin app framing. Avoid giant blank space.

STOP AND WAIT FOR APPROVAL.

## Slice 4 — Unified Explore viewer

Proceed only if Slice 3 is approved.

Build one Explore shell hosting existing viewer engines.

Dynamic representations:
Reality / Geometry / 360 / Plan / Drone / Thermal

Only show what exists.

Common shell: project, visit/date, representation, fullscreen, share, items, documents, reset/recenter, help, presentation-mode entry, loading/error.

Harden centering/framing, weird reroutes, browser back, deep links, mobile controls.
Do not force all media to share identical controls.

Provide screenshots + short interaction recording.

STOP AND WAIT FOR APPROVAL.

## Slice 5 — Items + spatial linking

Proceed only if Slice 4 is approved.

Build Items with plain language and existing useful backends.

Required:
- list/detail
- comments/questions where allowed
- jump to exact spatial context
- locator abstraction for plan XY, Reality XYZ, Geometry XYZ, pano station/yaw/pitch, geospatial coordinate, visit/date

Do not build RFI workflow unless already directly supported.
Default to "Ask a question."

STOP AND WAIT FOR APPROVAL.

## Slice 6 — Documents + search

Proceed only if Slice 5 is approved.

Build clean Documents and project Search using existing file backend.

Required:
- project documents
- folders where useful
- search
- permission-aware open/download
- document-item/location links where supported
- good empty/error/loading/mobile
- no standalone SlateDrop app in client UI

Search file names, items, dates, locations, sheet numbers/tags when available and deep-link where possible.

STOP AND WAIT FOR APPROVAL.

## Slice 7 — History + Compare

Proceed only if Slice 6 is approved.

Build History around project visits/dates.

Required:
- visit timeline
- prior visit opening
- selected-date clarity
- two-visit selection
- side-by-side compare
- synchronized camera only when reliable shared world frame exists
- otherwise independent views clearly labeled
- basic before/after supported media

Do not claim automated change detection unless validated.

STOP AND WAIT FOR APPROVAL.

## Slice 8 — Presentation / social clip foundation

Proceed only if Slice 7 is approved.

Build lightweight presentation layer, not a full video editor.

Concepts:
- saved camera view
- simple camera path
- keyframe
- duration
- easing
- representation
- visit/date
- optional title/branding

UX:
- Presentation mode hides UI
- auto-orbit
- simple flythrough
- play/pause/restart
- save/reuse path
- 16:9 / 9:16 / 1:1 framing guides
- clean screen-recording workflow

If reliable browser capture/export is already feasible, prototype/document it. Otherwise stop at deterministic animation + clean recording mode and recommend later export architecture.

STOP AND WAIT FOR APPROVAL.

## Slice 9 — Owner Home + Clients + Projects

Proceed only if Slice 8 is approved.

Build owner Home, Clients, Projects.

Home asks: "What needs my attention next?"

No widget board.

Only real actionable states: processing failed, ready for QA, ready to publish, client question, share issue, missing setup.
Use concise rows/lists and visual recent projects.

STOP AND WAIT FOR APPROVAL.

## Slice 10 — Processing + QA & Publish

Proceed only if Slice 9 is approved.

Build operator processing/QA/publishing surfaces over existing contracts.

Do NOT change reconstruction algorithms.

Required:
- visit/source identity
- processing state
- failure reason/log link where appropriate
- safe retry/reprocess only if already supported
- QA queue
- representation preview
- accept/reject
- author/pin
- preview-as-client
- publish/revoke
- published state

STOP AND WAIT FOR APPROVAL.

## Slice 11 — Sharing + permissions + polish

Proceed only if Slice 10 is approved.

Unify sharing:
- project
- representation/deliverable
- item/location
- expiry
- revoke
- recipient/token rules
- view tracking if existing
- clean public/shared experience
- mobile
- accessibility
- consistent loading/error/empty

STOP AND WAIT FOR APPROVAL.

## Slice 12 — Cutover + repo cleanup

Proceed only after every prior slice is approved.

First create `docs/vnext/REPO_CLEANUP_INVENTORY.md` classifying every candidate KEEP / REDIRECT / DELETE / ARCHIVE / UPDATE DOC.

Then:
- switch canonical routes
- intentional legacy redirects
- remove dead/stub/duplicate front-end routes
- remove obsolete preview harnesses
- remove unreferenced duplicate components
- archive/delete stale conflicting UI/business docs
- update AGENTS.md / CLAUDE.md / Cursor rules
- search for stale nav labels/routes
- run full typecheck/build/tests
- verify no dead imports
- verify share links
- verify owner/client auth routing
- create `docs/vnext/PHASE1_RELEASE_CHECKLIST.md`

Do not deploy/merge final cutover until Brian reviews cleanup inventory and release checklist.

STOP AND WAIT FOR APPROVAL.
