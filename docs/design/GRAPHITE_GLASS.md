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
