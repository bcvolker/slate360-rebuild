# Slate360 vNext — UI Design Rules

Canonical for Phase 1 slices after Slice 1. These rules describe **the system as implemented**, not aspirations.

Scope: `[data-s360-vnext]` only (`components/vnext/vnext-tokens.css`). Do not migrate legacy Graphite Glass surfaces onto these tokens until Slice 12.

---

## Logo

- Asset: `/uploads/slate360-logo-cobalt-v3.svg`
- Why: official dark-on-light wordmark for a warm light canvas. The reversed white mark is for dark marketing/app chrome. `LogoProvider` / `SlateIcon` were not used because they apply a teal gradient to “360”.
- Sizing: 28px tall on laptop/desktop (`h-7`); 24px on phone (`h-6`); max width capped so it does not collide with nav.
- Do not redraw, recolor, or add a gradient overlay.

---

## Color tokens

Defined on `[data-s360-vnext]`:

| Token | Role | Value |
|---|---|---|
| `--vnext-canvas` | Application canvas | `#f4f1ea` warm off-white |
| `--vnext-surface` | Header, sidebar, elevated panels | `#fbfaf6` |
| `--vnext-ink` | Primary text | `#1f1e1b` graphite |
| `--vnext-ink-secondary` | Nav default, supporting text | `#4b4944` |
| `--vnext-ink-muted` | Notes, section labels | `#6d6a64` |
| `--vnext-line` | Borders / dividers | `#ddd8ce` |
| `--vnext-accent` | Interaction accent | `#2c5aa0` restrained cobalt |
| `--vnext-accent-hover` | Accent hover | `#244b86` |
| `--vnext-accent-soft` | Active nav wash | 12% accent mixed into surface |
| `--vnext-focus` | Focus ring | same as accent |
| `--vnext-danger` | Destructive | `#b42318` |
| `--vnext-warning` | Warning (not amber) | `#8a5a10` |
| `--vnext-success` | Success | `#17663a` |
| `--vnext-disabled` | Disabled | `#a39f97` |

Components consume `var(--vnext-*)` only. Do not sprinkle hex in TSX.

Do not use teal `#00E699` as the vNext interaction system.

---

## Typography

- Family: inherited Geist (`--font-geist-sans`) via `--vnext-font`.
- Page title: `1.25rem`, semibold, tight tracking. Not marketing-hero size.
- Nav / body: `0.9375rem`.
- Meta / notes: `0.8125rem`, muted ink.
- Line height: 1.45.
- Do not use all-caps nav. Do not use 48–72px application headings.

---

## Spacing, radius, elevation

- Header height: `3.5rem` plus safe-area top.
- Sidebar width: `13.75rem`.
- Page padding: `1.25rem`.
- Content max width: `42rem` for Slice 1 scaffold pages.
- Radius: `0.375rem` if a control later needs a corner. Nav is not pill-shaped.
- Shadow: `0 1px 2px` at 7% ink, used only on the owner mobile drawer.
- Dividers: 1px `--vnext-line`. No glass, no gradients.

---

## Touch and layout

- Primary interactive controls: `min-height: 2.75rem` (44px).
- No horizontal page scroll. Root uses `overflow-x-hidden` and `min-w-0`.
- Safe area: header `padding-top: env(safe-area-inset-top)`; main `padding-bottom: env(safe-area-inset-bottom)`.
- Focus: 2px cobalt outline, 2px offset.

Breakpoints used:

| Viewport | Behavior |
|---|---|
| 390px phone | Client: header + text nav. Owner: header, current section label, Menu drawer |
| 768px tablet | Same as phone for owner (drawer). Client header with compact-to-full logo at `md` |
| 1024px+ / 1280 laptop / 1440 desktop | Owner persistent left sidebar; client header with full wordmark |

---

## Shell structure

### Client

Top application bar: logo left, **Projects** and **Account** right. No other primary items.

### Owner

- Desktop (`lg+`): left sidebar with **Home, Clients, Projects, Processing, QA & Publish, Shares**, then quiet **Settings** and **Account**.
- Below `lg`: top bar with logo, current section label, and a **Menu** text button opening a labeled drawer. Not a six-icon bottom bar.

Active nav: cobalt underline (header) or 2px left bar + soft wash (sidebar/drawer). `aria-current="page"`.

---

## Content-width behavior

Slice 1 pages are a title, one muted sentence, and a bounded empty region showing where future content will sit. The region is not a hero and not a dashboard.

---

## Icon, badge, card policy

- Slice 1 navigation is **text labels only**. Do not invent icons to look like an app.
- No status pills, no badges, no nested cards, no metric chips.
- Future cards (Slice 2+) should be image-first project records, not glass tiles.

---

## Prohibited patterns

Glassmorphism, dark SaaS chrome, decorative gradients, icon tiles, widget boards, fake analytics/KPIs, giant headings, giant blank heroes, nested cards, upgrade/billing/seats/plan labels, Coming Soon product modules, Command Center, Studio proliferation, teal interaction accents, marketing slogans in the app.

---

## Viewer exception

Dark immersive canvases are allowed later **inside** Reality / Geometry / 360 / thermal viewers. They are not the application shell.

---

## Auth vs preview

| Route prefix | Auth |
|---|---|
| `/vnext/*` | Existing Supabase session + beta approval (`requireVnextSession`) |
| `/vnext/ops/*` | Same, plus `canAccessOperationsConsole` (CEO-only today, matching current ops console) |
| `/preview/vnext/*` | Unauthenticated visual fixtures. Banner states they are not product screens. Same shell components, forced pathnames. |

Middleware is not used for these trees and must not be edited for Slice 1.

---

## Mobile behavior

- Client destinations stay visible as text in the header.
- Owner uses a full-label drawer, not an overcrowded icon bar.
- Menu / Close are words, not unlabeled glyphs.
