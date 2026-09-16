# CEO Dashboard + Client Portal — Audit (2026-09-11/15)

Branch: `feature/dashboard-portal-alignment-2026-09`, based on `feature/aob205-spatial-experience-v3`.
Companion doc: [DASHBOARD_PORTAL_DESIGN_ALIGNMENT.md](./DASHBOARD_PORTAL_DESIGN_ALIGNMENT.md) (token
decision — needs Brian's sign-off before any reskinning starts, per
`WEB_OVERHAUL_LAPTOP_KICKOFF_PROMPT_2026-09-11.md`).

Grounding: `docs/business/BUSINESS_PLAN.md` v4.1 (2026-08-23) states plainly — *"Operator dashboard:
does not exist (highest-priority internal build)"* and *"Client portal: partially exists but
fragmented across three share systems."* This audit independently confirms both statements against
the actual code.

Legend: **CURRENT** = what exists · **GOOD** = working/solid · **PROBLEM** = concrete gap · **KEEP**
/ **CHANGE** = verdict for the rebuild.

---

## 1. CEO dashboard home + nav

**CURRENT:** Production route `app/(dashboard)/dashboard/page.tsx` renders `CreatorHome.tsx` — a
flat, single-column page: header + Create button, a responsive grid of up to 6 project cards, a
"Needs attention" list, a horizontal-scroll "Recent deliverables" strip. No hero/featured-project
treatment, no widget grid, no Quick Metrics strip.

The more advanced pattern locked in `docs/design/DASHBOARD_EXPANDABLE_WORKSPACE_LOCKED.md` (5-slot
widget grid, Quick Metrics strip, focus-panel+rail expand interaction) **is partially built as
`DashboardHomeContent`/`CustomizableWidgetBoard`/`QuickMetricsStrip`, but wired only into
`app/preview/dashboard-look/page.tsx`** — a static-mock-data preview route. It has never been
connected to the real `/dashboard` route. Even that inert version is missing 2 of the 5 locked
widgets (Usage & Credits, Map/Location) and has no focus-panel/rail mechanic — only
collapse/resize/reorder.

Nav (`dashboard-nav-config.ts`): 14 items, 6 of them `ceoOnly` (Twin Studio, Thermal, Thermal
Studio V2, 360° Tours, Design Studio, Content Studio) — a CEO's real nav is much longer than a
regular org user's.

**PROBLEM:** The shipping dashboard is the flat pre-lock version; the locked redesign exists as
dead code behind a preview route. Two token systems now compete as the design target (Graphite
Glass dark vs. the newer `--mkt-*` light direction, see the alignment doc) — the locked layout doc
predates that direction and never addressed it.

**CHANGE.** Per [[slate360-dashboard-overhaul-not-incremental]] (Brian's explicit preference),
rebuild rather than patch — but the *data/entity model* the locked doc identified (Featured
Project, Needs Attention, Library, Usage & Credits, Map) is still the right set of "what a CEO
actually needs to see," confirm with Brian rather than re-deriving from scratch. The 6-of-14
`ceoOnly` nav split is a real constraint any new IA has to design around, not paper over.

## 2. Clients / Projects list + detail

**CURRENT:** No "Clients" entity/screen exists anywhere — searched repo-wide, every hit is either
multi-tenant visibility plumbing (`ClientSurfaceProvider`) or the client-facing viewer app, not a
CRM. **Projects** is real and solid: `app/(dashboard)/projects/page.tsx` branches desktop/mobile,
detail routes cover deliverables/documents/items/people/photos/plans/punch-list/slatedrop/
team/twins/walks/walkthroughs. Creation is a 3-step wizard (`CreateProjectWizard.tsx`) posting to
`POST /api/projects/create`, reachable only from `/projects` (the dashboard home's own "+ Create"
sheet only offers app-artifacts — Site Walk, Twin, Thermal, etc. — not a new project). Deliverable
attachment happens via `ProjectDeliverablesTab` (`app/(dashboard)/projects/[projectId]/deliverables`),
gated on the project having at least one walk.

**GOOD:** Empty states are real everywhere checked (dashed-border "Create your first project" copy,
icon, no broken/blank renders).

**PROBLEM:** No Clients entity means Brian's stated core loop — "create a project for a customer,
scan it, they see deliverables in their portal" — has no explicit customer/client record backing
it; a project is presumably associated with an org/contact informally. This is worth a real design
decision (does Slate360 need a lightweight Clients table, or is "project = engagement" sufficient
forever?) rather than silently bolting one on.

**CHANGE:** wire dashboard-home project creation directly into the Create sheet (currently a real
gap — you can only start a project from `/projects`, not from the dashboard home you land on).
**KEEP:** the wizard, the per-project detail tabs, and the deliverables-from-walk flow — all sound.

## 3. Visits / captures

**CURRENT:** No cross-module "Visits" or "Captures" aggregation screen exists. Site Walk captures
live inside the Site Walk module itself; nothing rolls them up at the dashboard level. The locked
layout doc's answer (a tabbed Library widget with a Captures tab) is unbuilt outside the inert
preview route.

**PROBLEM.** Directly blocks Brian's stated need to "track everything" and see visit history across
a project/client at a glance from the dashboard, and blocks the portal's own History tab having a
symmetric internal-side view.

**CHANGE:** build this — likely as part of the Library widget, matching the already-locked intent.

## 4. Client portal — Overview

**CURRENT:** `app/(public)/portal/[token]/page.tsx` → `AecPortalLanding`. Every rail is genuinely
conditional (`data.x.length ? <Rail/> : null`) — no empty/placeholder modules render.

**GOOD:** matches the "never show an empty rail for something not purchased" rule in practice.

**PROBLEM:** The locked rulebook's own gating module, `lib/spatial-experience/capabilities.ts`
(`isClientVisible`, `resolveProjectCapabilities`, `layoutStateGates` A–E), is dead code — only
imported by its own test file. Production computes similar-but-separately-implemented gating inline
in `lib/spatial-walkthrough/client-portal-load.ts`, which does not obviously reproduce the Twin rule
as specified (`qaStatus === accepted && humanReviewAccepted === true`) from one shared, tested
function. The locked A–E adaptive states are therefore **not verified against what actually ships.**

**CHANGE:** wire the real loader through `capabilities.ts` (or retire `capabilities.ts` and move its
logic + tests into the loader) so there is one tested source of truth for gating — this is a
correctness/trust issue, not a visual one, and should happen regardless of the token decision.

## 5. Client portal — Reality

**CURRENT:** Pure link-out to Walkthrough (`/w/{token}`), 3D Twin (`/share/twin/{token}`), 360
station tour. No embedded video viewer.

**GOOD:** correctly spatial-only, no PDF-as-image, no fabricated raster.

**PROBLEM:** none specific to Reality beyond the shared video-viewer gap (see #10).

**KEEP** as link-out architecture; visual polish is the `feature/aob205-ux-polish-v3` session's lane.

## 6. Client portal — Plan

**CURRENT:** Static copy + a hardcoded "raster unavailable" message that renders **unconditionally**
— `plan/page.tsx` never actually checks `data.planHref`/raster-ready state to decide between an
overlay and the "unavailable" message.

**PROBLEM:** the raster-ready branch described in the rulebook doesn't exist in code — even a
project with a working plan raster shows the same "unavailable" copy. This is a functional bug, not
a styling one — flag for the AOB205/portal session via `docs/design/LAPTOP_REQUESTS.md` since it's
squarely inside their locked-IA file, or confirm ownership before touching it.

## 7. Client portal — History

**CURRENT:** `PortalHistoryRail` — horizontal scroll of capture cards, poster + formatted date +
"Visit" label, deep-links to the walkthrough.

**GOOD:** dates and visit cards exist and work, matching "make dates and what existed at each
capture obvious."

**PROBLEM:** `compareAvailable` is computed (`clips.length > 1`) but **read nowhere in the UI** — a
fully dead boolean, not even a partial "Compare dates" affordance despite Brian's stated interest in
that direction. Also no empty-state guard if `data.history` is empty (renders a blank scroll
container rather than hiding the section/showing a state).

**CHANGE (future, not now):** per Brian's own scoping note in the kickoff — design toward Compare
Dates but don't build the heavy comparison internals yet. **Fix now:** hide/empty-state the zero-
history case; it's a one-line conditional, not a design decision.

## 8. Client portal — Documents

**CURRENT:** Flat grid, thumbnail + title + kind + filter chips + spatial-reference link. Real list,
not a placeholder.

**GOOD:** matches "must look intentional" for populated projects.

**PROBLEM:** no revision or date field exists anywhere in the data model (`PortalLandingData.documents`
is `{id, title, kind, href, thumbUrl, locatorHref?}` — 2 of the 4 fields the handoff spec calls for
are simply not modeled yet). Zero-document case renders heading + filter row + an empty grid, not a
hidden section or empty-state message.

**CHANGE:** add `revision`/`updatedAt` to the document model (additive migration territory — draft
for Brian, don't apply) and a real empty state. Directly relevant to Brian's stated wish that clients
access invoices/proposals via a normal flat list, not just via model-pins — the flat list exists,
it just needs the missing metadata fields and a non-blank empty case.

## 9. Client portal — Items/Questions

**CURRENT:** List + detail pages with rich "open from every surface" locators (Walkthrough/Plan/
Station/Twin), falling back to "`{label}` not on this visit" when absent.

**GOOD:** copy discipline is excellent — zero occurrences of "Create RFI" anywhere in the repo, "Ask
a Question" used consistently in the walkthrough viewer's ask flow and its copy module
(`lib/spatial-experience/questions.ts`).

**PROBLEM:** the actual **ask-a-question form** (with locator-attach) only exists inside the
`/w/[token]` walkthrough viewer — the portal's own `items`/`item/[id]` pages are **read-only**, no
input/submit anywhere. A client on the portal's Items tab cannot ask a question without leaving to
the walkthrough. There are also now **three separate Q&A implementations** across the codebase
(`AskAboutThis.tsx` for `/w`, `DeliverableQnA.tsx` for `/share/deliverable`, `CommentThread.tsx` for
legacy `/view`) — none of which is the one reachable from the locked portal's Items page.

**CHANGE:** surface the existing `AskAboutThis` ask-flow (or a thin wrapper around the same
`lib/spatial-experience/questions.ts` module) directly on the portal Items pages, rather than
building a fourth implementation. This is a real functional gap in what's supposed to be the
locked, "done" IA — flag to the AOB205/UX-polish session before touching, since Items is inside
their locked files.

## 10. Share experience (`/share/**`, `/view/[token]`, `/w/[token]`)

**CURRENT:** `/w/[token]` is the actual walkthrough viewer engine the portal wraps — not a
competitor. `/view/[token]` is a **legacy single-deliverable review flow** (own `TokenStatePage`
empty state, own `ViewerClient`/`PublicItemStage`/`CommentThread` — including the only place a
generic video/scrubbable-video viewer (`PublicItemStage`'s `case "video"`) is actually wired in).
`/share/[token]` is an unrelated generic SlateDrop file-share (presigned download, password-
gateable). `/share/twin`, `/share/thermal`, `/share/deliverable` are per-deliverable-type share
viewers the portal links out to.

**PROBLEM:** this is the literal "fragmented across three share systems" the business plan flags.
Concretely: (a) a working video viewer exists but only in the legacy `/view` route, not in the
locked portal — directly blocks Brian's stated need for "scrubbable 360 video or regular video" in
the portal; (b) three independent Q&A widgets (see #9) instead of one.

**CHANGE (larger, sequenced):** decide whether `/view/[token]` gets folded into `/portal/[token]`
(bringing its video-viewer capability with it) or stays as a deliberately-separate legacy path —
this is a real architecture decision, not a style one, and should be scoped as its own slice rather
than done opportunistically. Don't start this without confirming scope — it's larger than "audit and
polish."

## 11. Mobile layouts

**CURRENT (dashboard):** Genuinely distinct chrome — `app/(dashboard)/layout.tsx` picks
`StudioAppShell` (mobile) vs `DashboardDesktopShell` (desktop) via server-side device detection;
`/projects` goes further and swaps entire components (`MobileProjectsClient` vs
`ProjectsClientPage`), not just responsive CSS. The dashboard **home** content itself
(`CreatorHome`) is shared/responsive rather than device-bespoke — a gap relative to how `/projects`
already does it.

**CURRENT (portal):** No device-conditional component swap at all — only Tailwind responsive
classes. No `Sheet`/`Drawer`/bottom-nav pattern exists inside `components/external-portal/**` (those
patterns exist elsewhere in the codebase, e.g. Site Walk capture, but aren't used in the portal).
Tap targets are disciplined via a consistent `min-h-12` (48px) convention throughout.

**PROBLEM:** the portal's "adaptive layout" is, today, just squeezed breakpoints on identical DOM —
not the bottom-sheet/priority-reorder mobile experience the kickoff plan calls for.

**CHANGE:** portal mobile treatment is real, scoped work (Step 7 of the kickoff plan already
specifies the priority order and bottom-sheet expectation) — flag to/coordinate with the UX-polish
session since it's inside their locked files; dashboard mobile is this sprint's own territory once
the dashboard rebuild starts.

## 12. Empty / sparse-project states

**GOOD (dashboard):** every list-producing screen checked (dashboard home, Projects/All,
Projects/Portfolio) has a deliberate, non-broken empty state.

**PROBLEM (portal):** History and Documents both render a blank container rather than a hidden
section or message when empty — inconsistent with the dashboard side, and inconsistent with the
portal's own Overview page (which does hide correctly). Small, mechanical fixes once ownership
inside the AOB205 track is confirmed.

---

## Cross-cutting findings worth calling out directly

- **The locked capability-gating module (`capabilities.ts`) being dead code is the single biggest
  correctness risk** in the portal — it means the adaptive-states contract everyone is designing
  against isn't actually what's running in production. Worth fixing before any visual reskinning,
  since reskinning components whose gating logic isn't trustworthy just polishes the wrong surface.
- **Three Q&A implementations and (with `/view` vs `/portal`) two overlapping share systems** is
  real fragmentation debt matching the business plan's own diagnosis — not something to fix
  incidentally; it needs its own small design decision (probably: `/portal` is the future, `/view`
  and the standalone Q&A widgets get consolidated into it over time) before more feature work piles
  onto the fragmented state.
- **No Clients entity** — worth a deliberate yes/no from Brian, not an assumption either way, since
  it shapes how "create a project for a customer" is modeled going forward.
