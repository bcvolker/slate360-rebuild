# Dashboard expandable-workspace redesign — LOCKED

**Status:** LOCKED (2026-07-06), amended same day. Synthesized from 4 independent AI-panel
responses to the prompt in `docs/design/DASHBOARD_LAYOUT_CRITIQUE_AND_EXPANDABLE_REBUILD.md`,
cross-checked against Brian's explicit acceptance signals ("I prefer this response" on the
3rd and 4th responses) and against what already exists in code (`CustomizableWidgetBoard`,
`dashboard-tokens.ts`). This supersedes the layout-grammar section of the critique doc; the
critique doc's root-cause diagnosis still stands.

**Amendment (same day, two passes):** Brian flagged that the panel's 7-widget grid still let
"already-done" lists (projects, captures, deliverables, milestones) dominate the collapsed
view, and that KPI/stat tiles are low-value filler. Section 2b below locks the fix: those
four list-shaped widgets consolidate into **one tabbed Library widget** (one grid slot, tabs
inside it). On KPIs, the rule was refined on a second pass: small, clickable, actionable KPI
chips are fine as long as they stay out of the way — they live in a thin non-grid **Quick
Metrics strip** above the widget grid, not in dedicated stat tiles, and every chip deep-links
into the relevant expanded workspace. This changes sections 3-5 from the original synthesis;
read 2b before implementing.

## Why this synthesis, not just "pick the preferred response"

All four panel responses converged independently on the same widget *content* and the same
core interaction *idea* — that's a strong signal the content list and the two-state grammar
are right. They diverged on interaction mechanics and customization strictness. Where they
converged 3-of-4 or better, that's locked as-is below. Where they diverged, the decision and
reasoning is called out explicitly so this doesn't read as "we picked one AI's opinion."

## 1. What's locked from strong (3-4/4) consensus

**Kill the hero band.** Every response independently rejected the wide rectangular hero and
replaced it with a **squarish Featured/Active Project tile** showing a real visual snapshot
of the user's actual last work (twin render still / 360 pano frame / first Site Walk photo),
overlaid with name, status, and counts. Locked as-is.

**The widget set.** All four independently landed on the same seven sections:
Active/Featured Project, Needs Attention (Coordination), Recent Captures (walks + twins),
Deliverables in Flight, Usage & Credits, Map/Location, Upcoming Milestones. This is now a
well-validated content list — build against it, don't reinvent it.

**Two-state grammar.** Collapsed = compact operational tile (status + 1-2 quick actions,
fits inside the initial viewport, zero page scroll). Expanded = in-place panel with real
tools (filters, search, bulk actions, inline edit, quick-create), never just a longer list.
Locked.

**Locked/gated widgets stay visible, never hidden.** Dimmed content + explanation + upgrade
CTA, same tile footprint as unlocked peers. All four agreed; matches the existing
entitlements rule in CLAUDE.md ("visible-but-locked… never silently hide a Pro feature").

**Same grammar applies to every other dashboard tab** (Portfolio, Coordination/Inbox,
Calendar) — none of them should degrade back into "just a list." All four gave worked
examples; the pattern (collapsed operational sections → expanded panel with domain-specific
tools) is locked as the standing rule for any dashboard-shell tab, present or future.

## 2. Where the four responses disagreed — decision + reasoning

### Expand/collapse interaction pattern
Three of four (Grok's "IDE-style focus expansion," the first "locked" response's
"split-pane," and the final response's "focus panel + compressed rail") independently
converged on the same mechanic: **the expanded widget becomes the primary workspace; sibling
widgets compress into a slim rail (not pushed off-page, not hidden) so the user can switch
context in one click; the expanded panel scrolls internally; the dashboard page itself never
scrolls.** Only the second response (in-place accordion + "collapse all" button) proposed
plain push-down expansion, and it flagged push-down as the weaker option itself once minimal
scroll was the hard constraint.

**Decision: focus-panel + compact rail, locked.** This is also the direct implementation of
Brian's original wording — "no scrolling on the initial view, but if users expand a section
that should open up scrolling" maps exactly onto "the expanded panel gets its own internal
scroll region," not onto the whole page growing.

Mechanics locked:
- Expand widget → it grows to ~70-80% of the content width/height; siblings collapse to a
  narrow icon+label rail (not removed, not dimmed — one click switches focus to any of them).
- Only one widget is "focused" at a time. Switching focus swaps which widget is expanded and
  which are in the rail — no second expanded panel stacking.
- Escape / clicking a rail item's "close" collapses back to the full collapsed grid.
- Expanded-panel state (open filters, scroll position, selection) persists per widget while
  it's in the rail, so re-focusing it restores where the user left off.

### Customization strictness
Grok proposed a fully fixed, rules-engine-only layout (zero user reordering). The other
three proposed a **managed** middle ground: users may reorder widgets, hide optional
(non-required) ones, resize within a small set of predefined size classes, and pin a
featured project — but cannot freely drag-resize to arbitrary pixel dimensions or overlap
widgets.

**Decision: managed customization, locked** (matches 3/4, and matches what already exists —
`CustomizableWidgetBoard.tsx` already persists widget order/collapse to localStorage today,
so this is an extension of existing infrastructure, not new). Concretely:
- Users can: reorder widgets, hide optional widgets, resize among `small / medium / wide`
  size classes, pin one featured project, choose which widget opens focused by default.
- System controls: required widgets (Featured Project, Needs Attention) always render;
  tier-locked widgets always render (visible-locked); widgets snap to the size grid, no
  free-form drag-resize; no overlapping.
- Reason to reject fully-freeform: it breaks predictable support ("your dashboard looks
  different from ours"), breaks the no-scroll guarantee across arbitrary layouts, and makes
  onboarding new apps/widgets harder — the exact failure modes Grok itself warned about.
  Reason to reject fully-fixed: it throws away real value (letting a Site-Walk-heavy user
  demote Twin widgets they don't use yet) for no cost, since size-classing already contains
  the risk Grok was worried about.

### Grid mechanics
Minor divergence in column count (Grok: 3-column percentage layout; others: 12-column grid
with named cell spans). **Decision: 12-column grid, locked** — it's the format 3/4 responses
used AND it's what `CustomizableWidgetBoard.tsx` already implements
(`grid grid-cols-1 gap-3 lg:grid-cols-12`), so the new layout extends existing code instead
of replacing the grid system wholesale.

## 2b. Amendment — minimal KPIs, consolidated list widget (locked, supersedes parts of 3-5)

Two things the original 4-response synthesis under-weighted, corrected here:

**Problem 1 — list widgets were about to dominate again.** Four of the seven widgets
(Active Projects, Recent Captures, Deliverables in Flight, Upcoming Milestones) are all the
same shape: "here's a list of things that already happened or are already scheduled." Giving
each its own grid slot recreates the exact complaint this whole redesign started from — a
dashboard that's mostly about sorting through past/scheduled work instead of surfacing what
needs a decision right now.

**Fix — consolidate the four list-shaped widgets into one Library widget with internal
tabs.** One grid slot, `col-span-4 row-span-2` (roughly the height of two stacked single-row
widgets), containing a tab bar: **Projects | Captures | Deliverables | Milestones**. Each
tab shows a short, fixed-height scrollable list (not a growing card) — this is the "scrolling
section with different tabs for different lists" pattern that saves space instead of
stacking four separate list cards across the grid. Expanding the Library widget (via the
locked focus-panel/rail mechanic) opens the full per-domain workspace for whichever tab is
active — the same tool-rich expanded panels already specced per widget in section 5 below,
just reached through one shared entry point instead of four grid slots.

**Problem 2 — KPI tiles are vanity, not value.** A bare stat ("12 active projects," "45
captures," "8 deliverables") sitting in its own dedicated tile tells the user nothing they
can act on and burns grid space that a real widget could use. **Refined rule (2026-07-06,
second pass): KPIs are allowed, but only as small, clickable, out-of-the-way chips — never
as a dedicated tile taking a grid slot.** Concretely:
- **Quick Metrics strip:** one thin row (~32-40px tall) directly under the top control row,
  above the widget grid — not part of the 12-column grid itself, so it never competes with
  widgets for space. Contains a handful of small pill-shaped chips (e.g. `3 overdue` ·
  `2 need review` · `1 failed job` · `Storage 68%`).
- **Every chip is clickable and deep-links straight to the actionable view it summarizes** —
  clicking `2 need review` expands Library directly to the Captures tab, pre-filtered to
  "awaiting review"; clicking `3 overdue` expands Needs Attention pre-filtered to overdue.
  A KPI is never a dead-end display; it's a shortcut into the same expand-in-place workspace
  everything else uses.
- Chips only render when the count is nonzero/actionable — an all-clear state simply shows
  fewer or no chips, it never pads itself out with zero-value chips just to look busy.
- This replaces (not adds to) the per-widget stat clutter: Usage & Credits still collapses
  to one line inside its own tile (`68% storage · 340 credits left · Buy more`), but a
  duplicate/related chip can also live in the strip if it's urgent enough to warrant
  top-level visibility (e.g. storage genuinely near its cap) — the strip is for
  "needs-attention-right-now" signals pulled from across all widgets, not a second stats
  panel.
- The Library widget's own tab headers keep small actionable badges too (e.g. a "Captures"
  tab badge for items awaiting review) — same rule, just scoped to that widget's tabs
  instead of the global strip.

**Net effect on the collapsed grid:** still **5 grid slots** — Featured Project, Needs
Attention, Library (tabbed), Usage & Credits (one-line), Map/Location — plus one thin,
non-grid Quick Metrics strip above them that surfaces small clickable KPIs without eating
widget real estate.

## 3. Locked collapsed-grid layout (Dashboard Home)

Frame (1440-1920px desktop, matches existing `dashboard-tokens.ts`):
- Left nav rail: 72px collapsed / 220px expanded (existing).
- Top bar: 52-56px (existing).
- Content area: `flex-1 overflow-y-auto` becomes `flex-1 overflow-hidden` in collapsed
  state — the widget grid itself must fit without the page scrolling.

12-column grid, gap 12-16px — **updated per amendment 2b** (5 slots, not 7):

| Widget | Span (collapsed) | Notes |
|---|---|---|
| Featured/Active Project | `col-span-4 row-span-2` | Squarish, real snapshot, top-left anchor |
| Needs Attention | `col-span-4 row-span-1` | Top-center — action-required, largest non-hero priority |
| Map / Location | `col-span-4 row-span-1` | Top-right |
| Library (Projects/Captures/Deliverables/Milestones tabs) | `col-span-8 row-span-1` | Wide row, fixed-height scrollable tab content — replaces 4 separate list widgets |
| Usage & Credits | `col-span-4 row-span-1` | One-line, no stat grid |

This is a starting default, not pixel-final — implement it as data (widget registry
`defaultOrder` + `defaultSize`), not hardcoded JSX, so reordering/hiding/resizing work for
free.

## 4. Widget registry contract (merged from the two most detailed responses)

```ts
type DashboardWidgetId =
  | 'featured-project'
  | 'needs-attention'
  | 'library'          // consolidated tabbed widget — see LibraryTabId below
  | 'usage-credits'
  | 'map-location';

// Library's internal tabs — NOT separate grid widgets (amendment 2b consolidation)
type LibraryTabId = 'projects' | 'captures' | 'deliverables' | 'milestones';

type DashboardWidgetSize = 'small' | 'medium' | 'wide'; // grid-span size classes only

type DashboardWidgetScope = 'shared' | 'site-walk' | 'twin-360' | 'future-app';

type DashboardWidgetConfig = {
  id: DashboardWidgetId;
  title: string;
  scope: DashboardWidgetScope;
  accent: 'green' | 'blue' | 'neutral';
  minTier?: string;
  required?: boolean;      // always renders, cannot be hidden
  canHide?: boolean;
  canReorder?: boolean;
  defaultSize: DashboardWidgetSize;
  allowedSizes: DashboardWidgetSize[];
  defaultOrder: number;
  collapsed: React.ComponentType;
  expanded: React.ComponentType;
};

type DashboardLayoutPreference = {
  userId: string;
  widgetOrder: DashboardWidgetId[];
  hiddenWidgetIds: DashboardWidgetId[];
  widgetSizes: Record<DashboardWidgetId, DashboardWidgetSize>;
  featuredProjectId?: string;
  focusedWidgetId?: DashboardWidgetId | null; // drives the focus-panel/rail state
  libraryActiveTab?: LibraryTabId;            // which Library tab is showing/focused
};

// Quick Metrics strip — lives ABOVE the widget grid, not inside it (amendment 2b, pass 2).
// Each chip is a computed, ephemeral fact (not user-configured); it only renders when
// count > 0 and always resolves a deep link into the widget/tab/filter it summarizes.
type QuickMetricChip = {
  id: string;
  label: string;                 // e.g. "3 overdue", "Storage 68%"
  count?: number;                // omit for non-count chips like storage %
  severity: 'neutral' | 'attention' | 'urgent';
  deepLink: {
    widgetId: DashboardWidgetId;
    libraryTab?: LibraryTabId;   // when deepLink targets the Library widget
    filter?: string;             // pre-applied filter key inside the expanded panel
  };
};
```

Locked-widget rendering rule (all three states use the same tile footprint — never a
different size when locked):
- **Unlocked:** full collapsed tile + full expanded tools.
- **Locked:** same tile, dimmed content, short explanation of value, "Upgrade" CTA. Expand
  still works — the expanded panel shows a fuller preview + the same upgrade action, never a
  dead end.

## 5. Per-widget collapsed → expanded spec (condensed, updated per amendment 2b)

Full per-widget detail already exists across the four panel responses and agrees closely;
this is the merged, locked version, with the four list-shaped widgets folded into Library.

| Widget | Collapsed shows | Expanded adds (real tools) |
|---|---|---|
| Featured/Active Project | Real snapshot image, name/status overlay, 1-2 quick actions (Open workspace / New capture) — no bare counts | Activity timeline, quick-create (Site Walk / Twin capture / deliverable / invite collaborator), inline rename/status/assign, project health summary |
| Needs Attention | Urgent count (only if > 0) + 1-2 top snippets, source badges (Site Walk/Twin/shared) | Filter chips (assigned-to-me, client Q&A, failed jobs, review-required), list + detail split, inline reply, assign/resolve/escalate/retry actions, bulk mark-read |
| **Library** (tabbed, replaces Active Projects / Recent Captures / Deliverables / Milestones) | Tab bar (Projects/Captures/Deliverables/Milestones); active tab shows a fixed-height (~4-5 rows) scrollable compact list; tab badge shows only *actionable* counts (e.g. "Captures · 2 need review"), never a running total | Expanding opens the full workspace for whichever tab is active — same tool set as the four widgets below had individually: Projects → search/filter/bulk-archive/bulk-assign/inline-edit table; Captures → filterable work-queue with bulk retry/process/assign; Deliverables → status-filtered table with copy-link/revoke/extend/regenerate; Milestones → mini-calendar + agenda + quick-create/reschedule. Switching tabs while expanded keeps the same panel, swaps its content — no re-collapse needed. |
| Usage & Credits | **One line only**: `68% storage · 340 credits left · Buy more` — no rings, no stat grid | Usage-by-app/project breakdown, history chart, Stripe-linked buy-credits + upgrade-plan + manage-billing, locked-feature rows with upgrade CTA |
| Map / Location | Mini map, pin count only if it signals something (e.g. "2 sites need a site-visit") | Interactive Google Maps/3D Tiles, layer toggles (projects/captures/deliverables), markup tools, share-to-stakeholder with turn-by-turn link, per-pin inspector |

**Retired as standalone grid widgets (content preserved as Library tabs, not deleted):**
Active Projects, Recent Captures, Deliverables in Flight, Upcoming Milestones. Their
collapsed/expanded tool specs from the original synthesis are unchanged — they just live
inside Library's tab content instead of occupying four separate grid slots.

## 6. Generalizing to other dashboard tabs (locked pattern, not per-tab redesign yet)

Every dashboard-shell tab follows the identical collapsed-sections → expanded-focus-panel
rule, **plus the amendment 2b rules: consolidate same-shape list sections into one tabbed
widget instead of stacking several, and keep counts to only what's actionable.** Concrete
worked examples (from the panel, kept as reference — not yet built):

- **Portfolio:** collapsed sections = Active / Pinned / Needs Setup / Recently Updated /
  Archived / Templates. Expanded Active Projects = search/filter/bulk-assign/bulk-archive
  table, not a flat project list.
- **Coordination/Inbox:** collapsed sections = Assigned to Me / Client Q&A / Failed Jobs /
  Review Required / Mentions / Sent-Archive. Expanded Client Q&A = thread reader + inline
  reply + assign/resolve, not a flat message feed.
- **Calendar:** collapsed sections = Today / This Week / Overdue / Site Visits / Twin
  Captures / Report Deadlines. Expanded This Week = agenda/week view + quick-create +
  reschedule, not a flat event list.

## 7. Build order

1. Extend `CustomizableWidgetBoard` (don't replace) to add: focus-panel/rail expand state,
   per-widget `collapsed`/`expanded` component pair, the `DashboardWidgetConfig` registry.
2. Ship the Featured/Active Project widget first — it's the one flagged as broken in
   `DASHBOARD_VISION.md` (locked 2026-07-01, still unbuilt): resolve the real snapshot in
   `load-dashboard-home-data` (currently types `imageUrl` but never populates it).
3. Ship Needs Attention next (highest daily-use, action-required value).
4. Ship the Library widget with its four internal tabs (Projects/Captures/Deliverables/
   Milestones) — build the tab content once per domain, reusing the tool specs from the
   original per-widget breakdown, just mounted inside Library instead of four grid slots.
5. Ship Usage & Credits (one-line collapsed) and Map/Location.
6. Port Portfolio, Coordination/Inbox, Calendar onto the same registry + focus-panel
   mechanic, applying the same list-consolidation rule so none regress into stacked lists.
7. Typecheck the touched subsystem via scoped tsconfig, run `guard:design` +
   `guard:architecture`, push per verified phase.

## 8. Definition of done

- Dashboard Home fits the first viewport with zero page scroll.
- The old wide hero band is gone; Featured Project is squarish with a real snapshot.
- Every widget has a working expanded panel with real tools, not a longer list.
- Expanding a widget never scrolls the page — only the expanded panel scrolls internally.
- Locked/gated widgets are visible, dimmed, with an upgrade CTA — never hidden.
- **No standalone KPI/stat-grid tile exists anywhere; KPIs only appear as small clickable
  chips in the Quick Metrics strip (or a widget's own tab badges), every one deep-linking to
  its actionable view, none padded out with zero-value/vanity counts.**
- **The four list-shaped domains (projects/captures/deliverables/milestones) live inside one
  tabbed Library widget, not four separate grid slots — same rule applies to Portfolio,
  Coordination, and Calendar so none of them stack multiple same-shape lists either.**
- Portfolio, Coordination, Calendar use the identical collapsed/expanded grammar.
- A new app/widget can register into the layout via the widget config, no redesign needed.
