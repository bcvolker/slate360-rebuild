# Dashboard layout critique + expandable-section rebuild plan

**Status:** diagnosis + proposal, not yet locked. Written 2026-07-06 in response to Brian
flagging the dashboard as "unusable" — dominated by lists/cards, a rectangular main canvas
that offers no value, and tabs that are each just a single list instead of multifaceted
workspaces. Includes a ready-to-paste prompt for the multi-AI design panel.

## 1. What's actually built today (verified in code, not docs)

`app/(dashboard)/dashboard/page.tsx` → `DashboardHomeContent.tsx` renders **exactly 5
static cards** in a 12-col grid via `CustomizableWidgetBoard`:

| Widget | Span | What it actually is |
|---|---|---|
| "Continue where you left off" | 8 cols | One image + link to last project |
| "At a glance" | 4 cols | 3 stat numbers |
| "Recent Projects · N" | 4 cols | Flat `<div>` list, 8 `RowLink` rows, no grid, no tools |
| "Recent Site Walks · N" | 4 cols | Same flat list pattern |
| "Digital Twins · N" | 4 cols | Same flat list pattern |

The main content region (`dashboard-tokens.ts`: `flex-1 overflow-y-auto p-4 lg:p-6`) is a
**single scrollable column** — there is no internal sectioning, no splitter, no dedicated
"canvas" for doing work. Everything, including the "hero," is a card that links *out* to
another page. Nothing on the dashboard lets you *do* anything in place.

Other dashboard tabs (Coordination Inbox, Portfolio, per memory notes on the Jun–Jul
rebuild) follow the identical pattern: kill the fake KPI cards, replace with **one feed / one
list**. That's a real improvement over fake data, but it repeats the same root mistake —
"the tab = a list" instead of "the tab = a workspace with a list as one of several tools."

## 2. Why this happened (root cause, not just symptom)

1. **The only reusable dashboard scaffold ever built is a tile/list renderer.** The original
   code scaffold (Dashbord3.txt → `WorkspaceTile[]` + a grid of cards) shipped almost
   unchanged. Every subsequent "rebuild" (Coordination Inbox, Portfolio) reused the same
   mental model — a typed array + `.map()` into rows — because that's the only pattern in
   the codebase that already works. It's the path of least resistance, not a design choice.
2. **"Kill the fake cards" got solved by "replace with a feed," not "replace with a
   workspace."** Memory shows the Jun–Jul rebuilds explicitly targeted removing fake
   RFI/Submittal/Budget stat cards — correctly — but the fix each time was "one real feed"
   rather than "a section with the real feed **plus** the tools that act on it." Removing
   the lie (fake KPIs) without replacing it with density (actionable tools) leaves you with
   an accurate but empty list.
3. **The one part of the direction that *did* explicitly ban this — `DASHBOARD_VISION.md`
   (CEO-locked 2026-07-01) — was never implemented.** That doc already says, verbatim:
   > "do NOT build a long horizontal rectangular hero band — it's a useless waste of space"
   > "Use **expandable sections** that also contain **tools** ... minimal scrolling"

   `DashboardHomeContent.tsx` still ships the literal thing this doc rejected five days
   earlier: a wide hero band and flat list cards with zero expand behavior. The lock
   happened; the build never caught up to it. **This is the single clearest signal that the
   fix isn't "invent a new direction," it's "finally build the one that's already locked."**
4. **`CustomizableWidgetBoard` only supports whole-widget collapse, not section expansion.**
   The existing collapse chevron (`CustomizableWidgetBoard.tsx:214`) hides an entire widget's
   body — it's a "hide this card" control, not a "this card grows into a workspace" control.
   There is no component in the codebase today that does what you're asking for: collapsed
   = compact preview row, expanded = a scrollable panel with real tools inside it. That
   component has to be built; nothing today does it.
5. **`DESKTOP_DASHBOARD_FULL_SCOPE.md`'s own proposed widget grid falls into the same trap.**
   Its widgets (Active Projects, Needs Attention, Recent Captures, Deliverables in Flight,
   Storage & Credits, Milestones, Client Activity) are the right *content* — but its own
   ASCII layout renders them as fixed-height 2-up cards with no expand state. Good widget
   list, same flat-card execution problem repeated.

**Bottom line:** nobody designed this to be list-heavy on purpose. It's what happens when
(a) the only reusable pattern in the repo is "typed array → rows," (b) "remove fake data"
got solved with "replace with a real feed" instead of "replace with a real workspace," and
(c) the one document that already banned rectangular hero bands and flat lists was locked
but never built against.

## 3. Proposed fix: one interaction law, applied to every dashboard tab

### The law
- **Collapsed state (default, no scroll):** every section on the dashboard (and every tab
  inside it) renders as a **compact tile** — enough to show status at a glance (count,
  latest item, a small preview), sized so that ~4–6 tiles fit in the viewport with **zero
  page scroll**. This is the "no scrolling on the initial view" requirement.
- **Expanded state (user-initiated):** clicking a section's expand affordance grows it
  **in place** into a full panel that:
  - Gets its own internal scroll region (the *section* scrolls, not the whole page).
  - Contains the actual tools for that domain, not just a longer list. E.g. Projects
    expanded ≠ "more project rows" — it's project rows **plus** filter/sort, bulk actions,
    quick-create, and inline status editing.
  - Pushes other sections down/collapses siblings optionally (accordion-style) so the page
    never becomes an unbounded double-scroll mess.
- **No bare cards, no bare lists, anywhere.** A section is either a compact-tile preview of
  a workspace or the expanded workspace itself — never a dead rectangle whose only job is
  "here are 8 rows, click one to leave the dashboard."
- **This is a shell-level component, not a per-tab hack.** Build one `ExpandableWorkspaceSection`
  primitive once (compact tile ↔ expanded panel, shared animation/scroll/accordion logic),
  then every tab (Home, Portfolio, Coordination, SlateDrop entry, Calendar, etc.) composes
  it with different content. This directly satisfies "each tab needs to be multifaceted, no
  extra pages" — expansion happens on the same screen, not a route change.

### Applying it to the widget list that's already been scoped
Reuse the 7 widgets from `DESKTOP_DASHBOARD_FULL_SCOPE.md` (the content is right) but give
every one a collapsed/expanded pair instead of a fixed card:

| Section | Collapsed tile shows | Expanded panel adds |
|---|---|---|
| Active Projects | count + featured project snapshot (per `DASHBOARD_VISION.md`'s squarish hero) | Full project grid, filters, per-project quick actions, "make primary" |
| Needs Attention | unread count + top 1 item | Full inbox, act/respond/delegate inline, priority filters |
| Recent Captures | last capture thumbnail + count | Walk/twin grid, review/submit/share actions, processing status |
| Deliverables in Flight | in-flight count | Draft→shared pipeline, edit/send/follow-up inline |
| Usage & Credits | storage/credit pill meters | Full usage breakdown + "buy more tokens" (Stripe-linked, per `DASHBOARD_VISION.md`) |
| Map / Location | mini static map | Interactive Google Maps/3D Tiles widget, markup, send-to-stakeholder |
| Upcoming Milestones | next event | Week/agenda view, reschedule inline |

### What this fixes about "the main canvas is a useless rectangle"
Today the "Continue where you left off" hero is a passive image + link (`DashboardHomeContent.tsx:59-100`).
Per the already-locked `DASHBOARD_VISION.md`, it should be a **squarish** tile (not a wide
band) showing a real snapshot of the last work, with the *rest* of the freed-up horizontal
space going to the compact tiles for the other sections — not one section eating 60-100%
of the fold with no interaction beyond "click to leave."

## 4. Prompt for the multi-AI design panel

Paste the block below as-is to the other platforms (Grok/ChatGPT/Gemini) per the usual
workflow (their proposals get relayed back and locked into a doc before building).

---

> **Slate360 desktop dashboard — expandable-section layout redesign**
>
> Slate360 is a construction field-documentation SaaS (Graphite Glass dark design system —
> canvas `#0B0F15`, glass panels, backdrop-blur, one accent color per surface used only on
> interactive states, no cards-as-decoration, no amber, no glow, no rounded-full). The
> desktop dashboard is the management home for a user's projects across two apps (Site Walk —
> photo/360/voice field documentation, accent green; Twin 360 — LiDAR/Gaussian-splat digital
> twin capture, accent blue) plus shared infrastructure (SlateDrop file system, contacts,
> calendar, deliverables, coordination/inbox).
>
> **The current dashboard is broken by a lists-and-cards problem:** the main content area is
> a single scrollable column of static rectangular cards — one wide "hero" card that's just
> an image + a link, and several cards that are nothing but a flat list of 8 rows (Recent
> Projects, Recent Site Walks, Digital Twins) with no way to act on anything without leaving
> the dashboard. Every other tab inside the dashboard (Portfolio, Coordination/Inbox,
> Calendar) has the same problem — each is basically one giant list, not a real workspace.
>
> **The locked design intent (do not violate) is:**
> - No long horizontal rectangular "hero band" — it wastes space. The hero/featured-project
>   tile should be **squarish**, showing a real visual snapshot of the user's most recent
>   work (twin render still, 360 pano frame, or first walk photo), with project name/status
>   overlaid, and tapping it enters that project's workspace.
> - The dashboard (and every tab inside it) should use **expandable sections that contain
>   real tools**, not just longer lists. Collapsed = a compact tile (status at a glance, fits
>   in the initial viewport with **no page scroll**). Expanded = an in-place panel with its
>   own internal scroll, containing actual working tools for that domain (filters, bulk
>   actions, inline edit, quick-create) — not just "here are more rows."
> - No section should ever be a bare card whose only job is "click through to a different
>   page." No new full pages for things that should be an expand-in-place panel.
> - Widget system must be scalable — new apps/subscriptions and new widgets slot in without
>   a redesign, and locked/gated widgets for lower tiers show as visible-but-locked with an
>   upgrade affordance, never hidden.
> - Known widget content to build sections around (reuse, don't reinvent): Active Projects,
>   Needs Attention (coordination inbox), Recent Captures (walks + twins awaiting
>   processing/review), Deliverables in Flight, Usage & Credits (with a "buy more" action
>   tied to Stripe), Map/Location (Google Maps/3D Tiles, markup, share-to-stakeholder,
>   turn-by-turn for recipients), Upcoming Milestones/Calendar.
> - Tier-gating is real: subscribers to different apps (Site Walk / Twin 360, more later) and
>   tiers (trial/creator/model/business/enterprise-equivalent) see different widget sets and
>   different locked/unlocked states, but the *layout grammar* (compact tile ↔ expandable
>   panel) must be identical for everyone.
>
> **What I need from you:**
> 1. A concrete section/grid layout for the dashboard home — what sits where in the
>    collapsed (no-scroll) initial view, sized realistically for a 1440–1920px desktop
>    viewport with a persistent left nav rail and thin top bar.
> 2. For 5-7 of the widget types above: what the collapsed tile shows vs. what the expanded
>    panel contains (be specific about the *tools*, not just "shows more items").
> 3. The interaction pattern for expand/collapse — does expanding one section push others
>    down, collapse siblings (accordion), or use a modal/overlay/split-pane approach? Trade-
>    offs of each, given the "minimal scrolling" constraint.
> 4. How this same expand-in-place grammar should generalize to the *other* dashboard tabs
>    (Portfolio/project list, Coordination/Inbox, Calendar) so none of them degrade back into
>    "just a list" — give at least one worked example per tab.
> 5. Where widgets get their density from real customization (drag to reorder, resize,
>    show/hide) vs. a fixed system layout — recommend one and justify it against a
>    scalable-widget-system requirement (new apps/widgets must slot in without a redesign).
>
> Do not propose "hero carousels," 3D thumbnails, holographic modes, or other novelty/gimmick
> visual effects — this is a working professional tool, not a marketing site. Optimize for
> information density done cleanly, not spectacle.

---

## 5. Suggested build order (once a direction is picked from the panel)

1. Build the `ExpandableWorkspaceSection` primitive (compact tile / expanded panel, shared
   scroll + accordion behavior) as a shell-level component — this is the one piece of new
   infrastructure everything else depends on.
2. Rebuild the dashboard home on it first (highest visibility, smallest widget count: the 7
   from `DESKTOP_DASHBOARD_FULL_SCOPE.md`), including finally shipping the squarish
   hero/snapshot resolution that `DASHBOARD_VISION.md` already locked and flagged as
   unimplemented (`load-dashboard-home-data` types `imageUrl` but never populates it).
3. Port Portfolio, Coordination/Inbox, and Calendar onto the same primitive so no tab
   regresses to a bare list once the pattern exists.
4. Typecheck the touched subsystem via a scoped tsconfig, run `guard:design` +
   `guard:architecture`, push per phase per the usual verifiable-slice workflow.
