# Slate360 Phase 1 — Review and Approval Protocol

## Inputs required from Cursor after each slice
- branch/worktree
- commit SHA or dirty diff status
- exact files changed
- tests run
- routes affected
- screenshots (repository paths **and**, for visual slices, the rendered images attached in the Cursor response when the interface permits)
- **Interaction Coverage** (required for any slice that adds or changes a control)
- known limitations
- confirmation next slice was not started

## Standing interaction QA rule

A control is not complete because it renders.

Any slice that creates or modifies links, buttons, dropdowns, overflow menus, dialogs, drawers, tabs, toggles, forms, search, filters, viewer controls, contextual menus, or rename/edit/delete/copy/share/upload/save/publish actions must add or update automated tests in the same slice.

Canonical suite: `e2e/vnext/` and `lib/vnext/*.test.ts`. Command: `npm run test:vnext`.

Access-contract (mocked server context, no secrets): `lib/vnext/access.test.ts`.  
Production route-guard: `lib/vnext/route-guard.test.ts`.

Interaction Coverage must list:

- controls added/changed
- automated test covering each control
- routes tested
- auth roles tested where applicable
- console/page/request errors observed
- known untested behavior

Unexpected console errors, page errors, failed requests, and undocumented HTTP 4xx/5xx fail the slice.

Do not implement tests for controls that do not yet exist. When a later slice adds a control, that slice must satisfy the standing regression contract below.

## Test harness stabilization (2026-09-18)

`npm run test:vnext` must pass as a whole suite, not just per-test in isolation — this is the
permanent regression gate. It runs against `next dev`, and the suite must not fail merely because
Next development mode is lazily compiling a route on its first request.

Two dev-server-only mechanisms keep this deterministic:

- `e2e/vnext/global-setup.ts` — prewarms every route the suite visits (including auth-redirect
  targets) via a real page load before any numbered test runs, then re-verifies `/vnext`'s full
  redirect chain settles stably. Extend its `WARM_ROUTES` list when a new spec visits a route it
  doesn't already cover.
- `next.config.ts`'s `onDemandEntries` (`maxInactiveAge`/`pagesBufferLength`) — keeps every warmed
  route compiled for the suite's full multi-minute duration; Next's 60s default eviction was
  recompiling routes mid-run, and each recompile could push an HMR reload to an unrelated
  already-open page. Ignored entirely by `next build`/`next start`.

`attachRuntimeHealth` (`e2e/vnext/helpers.ts`) additionally retries once, with a settle pause, on a
`goto()` that hits a bare Next dev-server 500 or its own error overlay — both observed as rare,
transient, non-application dev-mode artifacts on routes global-setup already proved healthy — and
rolls the failed attempt's own recorded errors back so a fully-recovered page doesn't fail
`assertClean()` over an attempt the test never actually saw. `ALLOWED_PAGEERROR` narrowly allow-lists
two confirmed Next-internal messages (an HMR JSON-parse artifact; a stale service-worker
update-check tied to each dev-server restart's new build id) — not a broad ignore, and any other
page error still fails the suite.

## Standing regression contract

Future vNext tests must progressively cover the following **when the relevant control or route exists** in that slice:

### Navigation and persistence
- visible links have valid destinations
- buttons perform their declared action
- dropdown/overflow menus open and close
- dialogs/drawers open and close correctly
- browser Back works
- browser Forward works
- refresh preserves persisted state where expected
- direct deep links work
- no accidental navigation into legacy product routes (`/dashboard`, `/app`, `/site-walk`, `/twin`, `/thermal-studio`, `/operations-console`, `/portal`, `/tours`, `/slatedrop` as product homes)

### Permissions
- permission failures are correct (login with exact `redirectTo`, `/pending-verification`, owner `notFound`)
- unauthorized controls are not rendered
- disabled controls explain or correctly prevent action
- authenticated access matrix: beta-approved org user; unauthenticated; authenticated but not beta approved; CEO/`canAccessOperationsConsole`; ordinary member; staff without operations-console access

### Entity actions (when added — see `docs/vnext/ENTITY_ACTION_SETTINGS_MATRIX.md`)
- destructive actions require appropriate confirmation
- destructive action result is verified
- rename/edit changes persist after reload
- duplicate/copy creates the correct new object
- move changes the correct parent/location
- archive/delete/restore semantics are verified (hard vs soft)
- sharing produces the correct destination/token

### States and errors
- loading/empty/error states render
- console errors fail tests
- uncaught page errors fail tests
- unexpected request failures fail tests
- unexpected 4xx/5xx fail tests

### Layout
- required mobile touch targets remain ≥44px
- no horizontal overflow

### Slice 1 baseline (already required)
- unauthenticated `/vnext*` Playwright coverage with preserved `redirectTo`
- vitest access decisions for the role matrix above (mocked context; no repo secrets)
- filesystem route-guard over `app/vnext/**/page.tsx`

Preview routes under `/preview/vnext/*` are fixtures only. They must not satisfy or weaken production auth or the route-guard.

## vNext production route-guard

Auth is performed by individual vNext pages, not only a shared layout. `lib/vnext/route-guard.test.ts` inspects production `app/vnext/**/page.tsx` and fails if a newly added user-facing page is publicly accessible.

Approved protection:

- `VnextClientRoutePage`
- `VnextOwnerRoutePage`
- `requireVnextSession`
- `requireVnextOwner`
- explicitly allowlisted redirect-only `/vnext` (`app/vnext/page.tsx` → `/vnext/projects`)

`/preview/vnext/*` is a separate tree and is not an approved production protection mechanism.

A future agent must not be able to add `app/vnext/.../page.tsx` and leave it public.

## GitHub review
Check:
- only expected areas changed
- no reconstruction/trainer changes
- no accidental backend/schema drift
- no obsolete route resurrection
- no duplicated logic when existing backend could be reused
- no dead imports
- no hidden navigation entries
- no new unapproved tabs/cards/metrics
- permissions/auth retained
- useful behavior not silently dropped
- no middleware change unless a later slice explicitly requires it
- entity actions match `docs/vnext/ENTITY_ACTION_SETTINGS_MATRIX.md` (do not invent backend)

## Visual review evidence

Required screenshot widths:

- 1440
- 1280
- 768
- 390

Commit screenshots to the repository (`docs/vnext/screenshots/...`).

For visual slices, also attach the **real rendered screenshots** directly in the Cursor response when the interface permits, in addition to repository paths.

Screenshots are review evidence. They must show the implemented UI, not mockups or unrelated surfaces.

For UI slices also review:
- image-first project presentation
- no giant blank areas
- no glassmorphism
- no dark SaaS shell outside immersive viewer
- no decorative icon tiles
- no nested-card clutter
- no fake stats
- no unnecessary badges
- no generic AI copy
- no tiny controls
- no duplicate nav
- no weird scroll traps
- no layout dead zones
- no cryptic labels
- project content remains the focus

## Interaction review
Check:
- browser back/forward
- refresh
- direct deep link
- loading
- no-data
- unauthorized
- network/error
- mobile touch
- keyboard/mouse where applicable
- fullscreen exit
- reset/recenter
- representation switching
- visit switching
- item/document deep links
- contextual actions persist and confirm as specified in the regression contract

## Approval states
### APPROVED
No blocking issues. Next slice may begin only after Brian explicitly sends approval.

### APPROVED WITH SMALL FIXES
Small corrections only; Cursor applies them and returns proof.

### REVISE BEFORE NEXT SLICE
Blocking architecture, UX, route, permission, bug, or visual-quality issue.

## Approval template
APPROVED FOR NEXT SLICE.

The current slice is accepted subject only to the notes below.

Do not revisit or redesign approved screens unless a later dependency requires it.
Do not begin any work beyond the next approved slice.
Continue to follow the canonical Phase 1 plan and UI rules.

At completion, provide:
- changed files
- tests
- screenshots (git paths + Cursor attachments when permitted)
- known limitations
- confirmation you did not begin the subsequent slice.

[Specific notes]

## Revision template
REVISE CURRENT SLICE BEFORE PROCEEDING.

Do not begin the next slice.

Fix only:
1. ...
2. ...
3. ...

Return:
- exact changed files
- before/after screenshots
- tests run
- confirmation the next slice was not started.
