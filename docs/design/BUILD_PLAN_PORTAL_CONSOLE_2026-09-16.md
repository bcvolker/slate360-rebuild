# Build plan — client portal + owner console (from 2026-09-16 evening)

Status: **PLAN — for Brian's record; execution starts tonight in this order.**
Branch `feature/dashboard-portal-alignment-2026-09` (PR #34). Companion docs:
[CLIENT_PORTAL_AND_OWNER_CONSOLE_SYNTHESIS_2026-09-16.md](./CLIENT_PORTAL_AND_OWNER_CONSOLE_SYNTHESIS_2026-09-16.md),
[CLIENT_PROJECT_PACKAGE_2026-09.md](./CLIENT_PROJECT_PACKAGE_2026-09.md),
[CLIENT_ACCOUNT_HOME_2026-09.md](./CLIENT_ACCOUNT_HOME_2026-09.md).

## 0. Rules every slice is judged against

Brian, 2026-09-16: *users are busy; they will not read; things must be extremely intuitive.*

1. **Three-second test.** A superintendent on a phone understands any screen in three seconds
   without reading a paragraph. If a screen needs a sentence of explanation, the screen is wrong.
2. **One primary action per screen.** One green button. Everything else is quiet.
3. **Progressive disclosure.** Options (access code, expiry, labels) hide behind "Options" until
   wanted. Defaults are safe: view-only, no expiry, no code.
4. **No text walls.** Helper copy is one line or none. Labels over paragraphs. Numbers over prose.
5. **Only what exists.** No empty tiles, no "coming soon," no product names (Twin 360, Site Walk,
   Splat, Map, Thermal never appear client-side).
6. **Light system, everywhere.** Homepage palette (`--mkt-canvas` / `--mkt-surface` / `--mkt-ink` /
   `--mkt-ink-muted` / `--mkt-line`, one accent `--mkt-accent`), serif display only where the
   homepage uses it, sans for UI. No dark Graphite surfaces remain in anything a client or Brian
   sees day to day.
7. **Phone first.** Every slice is checked at 375 px and 768 px before "done." Bottom sheets, not
   side panels. 48–72 px targets. No horizontal page scroll (carousels may scroll).
8. **Latest logo.** Icon tile + "SLATE" in `--mkt-ink` + "360" in `--mkt-accent` — exactly what
   the homepage nav renders. Nothing else.

## 1. Slice: brand + chrome alignment (small, first — it's visible everywhere)

**Problem found:** the dashboard sidebar and the external-portal shell still render `SlateLogo` →
`Slate360Logo variant="dark"`: "SLATE" in white (invisible on the light canvas) and "360" as a
hardcoded teal→blue gradient. The homepage nav (`main`, `home-nav-light.tsx`) renders
`SlateIcon` + `SLATE` (`--mkt-ink`) + `360` (`--mkt-accent`).

Build:
- Add `components/shared/Slate360LogoLight.tsx` — the homepage nav's logo markup as a shared
  component (icon tile + ink SLATE + accent 360, sizes sm/md). Tokens only, no hex.
- Use it in `DashboardDesktopSidebar`, `DashboardDesktopTopBar` (if a mark is shown), the client
  portal header, and `ExternalPortalShell`. Leave the dark mobile app shells (Site Walk / Twin
  native) alone — out of scope and still dark by design.
- Sweep the light shell for leftover dark classes: `CreateSheet` (opened from "+ Create"),
  `CommandPalette`, dashboard sub-pages that still use `--graphite-*` (`DashboardProjectsRail`,
  `DashboardDomainWorkspace`, Site Walks / Twins / Twin Studio lists). Reskin or hide from the
  light nav — no page a client or Brian lands on should flash dark.
- Done when: screenshots of `/client-home`, project page, dashboard home at 1440 and 375 show the
  homepage logo and no dark surfaces; `guard:design` passes.

## 2. Slice: simplify the share dialog (Brian's feedback on the first cut)

Current dialog has a title, a kicker, a two-line explanation, three fields, a button, a URL box
and a list — too much at once. Target:

```
Share Walkthrough · Sep 15                                      ×
[ Create link ]                         ← the only thing above the fold
Options ▸  (access code · expires)      ← collapsed by default
──────────────────────────────────────
https://…/w/abc123            [Copy]    ← appears after create, large, tappable
Owner's rep · 3 views · code            [Turn off]
```

- One line of helper copy max, and only if needed: "View only. They can ask questions."
- Label defaults to "<project> — <chapter>"; editable inside Options, not up front.
- Created link is the hero: full-width, 48 px, single Copy button, "Copied" state.
- Active links: one compact row each — label, views, code/expiry glyphs, Turn off. No headings.
- Phone: bottom sheet with a drag handle; desktop: centered dialog ≤ 480 px.
- Done when: create → copy is two taps; 375 px shows Create link without scrolling.

## 3. Slice: same simplicity pass on the package page and client home

- Section labels shorter ("Scans" → keep; "Documents" → keep; drop "ALL PROJECTS" kicker on
  client-home in favor of a plain row).
- Chapter cards: title only on the poster; no kind glyph text.
- Questions block: hide entirely when zero questions **and** no walkthrough to ask on.
- Empty state text: one sentence.
- Done when: every screen passes the three-second test on a phone screenshot.

## 4. Slice 1b: contractor-controlled links for tours, 3D, and whole visits

- Apply the drafted `supabase/migrations/20260901120000_spatial_project_shares.sql`
  (project-scoped token + grants) — additive; Brian applies via the Management API.
- Share manager gains scope: this chapter / this visit / whole project. Tours and 3D cards get
  the Share button only once their recipient views honor the project-share grants.
- Recipient page for a project-scoped link = the same package layout, read-only, limited to the
  scope, with "call out a spot" + "ask a question."
- Done when: a tour link with an access code opens read-only on a phone; revoking kills it.

## 5. Slice: per-visit "What changed" + visit PDF

- On the project page, each scan gets a one-screen summary: what was captured, what's new since
  the previous scan (counts only: chapters, documents, questions opened/closed), open items.
- "Download visit report" → PDF from the same data (reuse the existing report generator path).
- "Forward summary" = copy-to-clipboard text block (no email plumbing yet).
- Done when: a two-visit fixture renders a factual diff with zero prose.

## 6. Slice: owner console (Brian's production line) + Publish

- Replace `DashboardHomeContent` for CEO with a **work queue**: visits by state — Captured →
  Processing → Authoring → Ready → Published. Row = project · date · what was captured · blocker.
- Per-visit workspace: deliverable rows with the one tool each needs (crop → Splat, start/restrict
  view + plan pins → Tours, spaces/waypoints/operator keyframes → Walkthrough, ortho/DSM → Map)
  and a **Publish** panel (choose chapters, "preview as client" renders the exact package page).
- Publishing writes `project_chapters` (contract in CLIENT_PROJECT_PACKAGE §3; migration applied
  at this slice). Loader unions explicit chapters with derived ones.
- **Clients**: create a client login (org + admin membership + `standalone_spatial_walkthrough`
  flag on — required for sharing to work), logo/colors, their projects.
- Nav: Home · Projects · Clients · Produce · Publish · Settings. Thermal stays CEO-only, unlisted.
- Done when: Brian can create a client, create a project, mark a visit published, and see it
  appear on that client's package page — in one sitting, on the light shell.

## 7. Later (in order): locations + trade → documents as references + folder templates → search
→ closeout generator + owner handover. Each gets its own doc when it starts.

## 8. Gates for every push

Scoped `tsc` via a temp tsconfig · `check-design-guardrails` · `check-architecture-guardrails` ·
`check-file-size-regression` (300-line new-file rule; note `WalkthroughStudio.tsx` already fails
this on the base branch — not ours) · desktop + phone screenshots via `/preview/*` harnesses, with
the caveat recorded when a harness hardcodes the desktop sidebar.

## 9. Tonight's session

1 (brand/chrome) → 2 (share dialog) → 3 (simplicity pass) → 1b (scoped links) as time allows.
Push after each with screenshots in the commit body or PR comment.
