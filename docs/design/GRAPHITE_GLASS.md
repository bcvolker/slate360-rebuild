# Graphite Glass — Canonical Design System (June 2026)

**This document supersedes `docs/SLATE360_GRAPHITE_GLASS_DESIGN_SYSTEM.md` wherever the two
disagree — in particular, amber is NO LONGER an approved shell color anywhere in
authenticated product surfaces.** The older doc's layout-geometry rules (§11–12) remain valid.

Every new chat/agent working on UI must read this file before making visual changes.

## 1. The verified template (source of truth)

Commits `7a8b2ad3..c3bd1ca5` unified all three mobile app homes (`/app`, Site Walk,
Digital Twin) onto one shared, screenshot-verified rendering path. These are canonical:

| Piece | File | Role |
|---|---|---|
| Token sheet | `components/studio-ui/app-home-tokens.ts` (`appHomeTokens`) | All home-shell geometry + glass surface classes |
| Hero/launcher | `components/studio-ui/MobileAppHubHeroCard.tsx` | Primary app launcher tile |
| Quick actions | `components/studio-ui/MobileAppHomeQuickActions.tsx` | 2-col quick-action grid |
| Portal card | SlateDrop portal card (home fill) | Storage ring + folder chips |
| Accent scoping | `[data-mobile-route]` CSS vars in `app/globals.css` | Per-app accent without per-app components |

A new app home = compose these components + one `[data-mobile-route="<app>"]` CSS-var block.
Do **not** fork the components or re-declare their class strings.

**Scope limit:** this template is for *home/hub navigation surfaces*. Capture canvases,
3D viewers, wizards, and data tables do NOT adopt the home template wholesale — they adopt
the *primitives* (glass surface, section label, icon chip, hairline border, accent vars)
and the color rules below.

## 2. Color system

Dark canvas is sacred: `--graphite-canvas: #0B0F15`.

| Token | Value | Use |
|---|---|---|
| `--graphite-primary` | `#00E699` | Site Walk + `/app` platform accent (field green/teal) |
| `--twin360-blue` | `#3D8EFF` | Digital Twin accent |
| `--graphite-text-header` | `#FFFFFF` | Headings |
| `--graphite-text-body` | `#F8FAFC` | Body text |
| `--graphite-muted` | `#A3AED0` | Secondary text, section labels |
| `--mobile-shell-accent` | per-route | Generic accent — components consume this, never a raw color |

Per-app accents are set ONLY via `[data-mobile-route="..."]` blocks in `globals.css`.
Components must reference `--mobile-shell-accent` / `--mobile-*` vars, never hardcoded hex.

### Banned in authenticated product surfaces
- **Amber / copper / orange accents** (`amber-*`, `orange-*`, `#F59E0B`, `#D97706`, etc.).
  Amber is the marker of legacy AI-generated placeholder UI. Surfaces still wearing it are
  presumed low-value: the default treatment is **reachability audit → delete or quarantine**,
  not restyle. Restyle only live, reachable screens in the Site Walk authenticated flow.
- **Decorative glow** (`shadow-*-glow`, large colored box-shadows) outside the token-defined
  `--mobile-app-card-glow-*` hover states.
- **`rounded-full` pill buttons** outside token-defined chips (e.g. `slateDropOpenPill`).
- **Raw hex colors in component files.** New colors go into `globals.css` vars or
  `app-home-tokens.ts` first, then get consumed.

Status colors stay semantic: `red-400` destructive, `emerald-400` success. Use
`--graphite-muted`-toned chips for "warning"-class info instead of amber.

## 3. Enforcement

`npm run guard:design` (`scripts/ops/check-design-guardrails.mjs`) fails on amber classes,
amber hex values, and glow utilities in scanned production paths. Allow-listed paths live in
`ops/design-allowlist.json` (token files, audit tooling, archived/quarantined trees, and
legacy zones pending their kill pass — the allow-list must only shrink over time).

Run it with the standard gates: `npm run typecheck:changed`, `npm run build`,
`npm run guard:architecture`, `npm run guard:design`.

## 4. Release-scope rule (from AGENTS.md)

Site Walk is the only visible app for the first store release. Style rollout priority is:
authenticated mobile Site Walk surfaces first; SlateDrop UI next; dashboard, auth, emails,
and public marketing are deferred phases and must not leak unfinished work into live
navigation.

## 5. Surface inventory (keep current — update when a slice ships)

- **On-template:** `/app` home, Site Walk home, Digital Twin home (commits above).
- **Current-gen but pre-template chrome:** capture-v2 screens (Site Walk + Twin capture).
- **Legacy amber zones (deletion-first candidates):** V1 capture stack
  (`app/site-walk/(act-1|act-2|act-3)*`, `components/site-walk/capture/*`),
  `components/dashboard-v2*`, `components/slatedrop/*` UI, old proof/dev pages.

## 6. Token source of truth (consume these — never hardcode)

`app/globals.css` `:root` is the **single authoritative token sheet**. Everything
else (`lib/design-system/tokens.ts`, the per-surface `*-tokens.ts` files) must
*reference* these vars, not redefine values.

- **Brand accent (white-label aware):** `var(--primary)` / `var(--ring)` — these
  fall back through `var(--brand-primary, var(--graphite-primary))`, so an org's
  brand color overrides them automatically. Use `--primary` for any CTA/active/
  focus accent that should follow white-label.
- **Fixed product accents:** `var(--graphite-primary)` (#00E699 field green —
  Site Walk / platform) and `var(--twin360-blue)` (#3D8EFF — Digital Twin).
- **Surfaces/text:** `--graphite-canvas`, `--graphite-text-header/-body`,
  `--graphite-muted`; translucency via `color-mix(in srgb, var(--token) N%, transparent)`.
- **Geometry:** `--radius` (0.75rem) + computed scale; shadows `--app-shadow-card`
  / `--app-shadow-elevated`; card shadow `--mobile-app-card-shadow`. Do not invent
  new radii/shadows in component files.
- **Never** put a raw color hex, `rgba(...)` brand color, or `amber-*`/`orange-*`
  Tailwind class in a component. New colors go into `globals.css` first, then get
  consumed as a var.

## 7. Desktop layout pattern (all dashboard pages)

The chrome (`DashboardDesktopShell` / `StudioAppShell`) already provides a
fill-height, internally-scrolling content area. Pages must **fill it, not grow it**:

- Use `DashboardTabShell` with **`fill`** (fills content height, full width, no
  page-level vertical scroll, no side gaps). The legacy non-fill/`min-h-screen`/
  `max-w-[1440px]` path is deprecated.
- When a tab has more than fits, paginate with **`components/shared/SubTabs.tsx`**
  ("tabs within a tab") — never a long vertical scroll.
- For landing/aggregation surfaces, use **`components/dashboard-desktop/CustomizableWidgetBoard.tsx`**:
  drag-to-reorder, resize (col span), collapse/expand, persisted per board. Widgets
  tile a 12-col grid so the board fills width with no gaps.

### Tab / nav active-state archetypes (two — pick by surface, don't invent a third)

All active-states are tinted with **`--graphite-primary`** (teal) — never a
hardcoded hex, never amber/orange. There are exactly two shapes:

1. **Nav-pill** (persistent navigation: left sidebar, project-detail rail) —
   `bg 12%` + `ring-1 ring-inset 24%`. Tokens live in
   `components/dashboard-desktop/dashboard-tokens.ts` and
   `components/projects/project-detail-tokens.ts`.
2. **Sub-tab** (in-content segmented tabs: `SubTabs`, `DashboardDomainWorkspace`) —
   `bg 14%`, no ring. **Single source of truth:** `subTabButtonClass(selected)`
   exported from `components/shared/SubTabs.tsx`. Consume it — do not re-inline the
   class string (that's how the 12/14 values drift).

The Operations Console (`components/ops/console/ops-console-tokens.ts`) keeps a
distinct `border-b-2` underline pattern for its dense 9-tab admin bar — a
deliberate, documented exception, not a target to "unify".

## 8. Enforcement

`npm run guard:design` (`scripts/ops/check-design-guardrails.mjs`) fails the build
on new off-system usage, gated by only-shrink ratchets in `ops/design-allowlist.json`:
`legacyAmberFiles` (amber classes/hex/**rgba**), `legacyBrandHexFiles` (hardcoded
brand-color hex in components — use `var(--primary)` etc.), `legacyOrangeFiles`.
A new file matching any pattern fails immediately. After cleaning files, run
`node scripts/ops/check-design-guardrails.mjs --update` to shrink the lists (they
may never grow). Run alongside `typecheck:changed`, `build`, `guard:architecture`.
