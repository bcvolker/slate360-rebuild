# Slate360 vNext — UI Design Rules

Canonical for Phase 1 slices after Slice 1. These rules describe **the system as implemented**, not aspirations.

Scope: `[data-s360-vnext]` only (`components/vnext/vnext-tokens.css`). Do not migrate legacy Graphite Glass surfaces onto these tokens until Slice 12.

---

## Logo

Chosen source is the **current homepage lockup**, not a historical SVG.

| Piece | Source |
|---|---|
| Icon | `SlateIcon` in `components/shared/SlateIcon.tsx` — same emblem as `HomeNavLight` / `HomeFooterLight` |
| Wordmark | Text `SLATE` + `360`, `font-semibold tracking-[0.13em]` |
| `SLATE` color | `--vnext-ink` |
| `360` color | `--vnext-brand-360` → `--mkt-brand-green` (`#0C7A52` in `app/globals.css`) — since the 2026-09-18 palette correction below, this is also the vNext interaction accent |

Application wrapper: `components/vnext/VnextLogo.tsx`.

Why this mark:

- The live homepage (`app/(public)/page.tsx` → `HomeNavLight`) is the approved current identity.
- `slate360-logo-cobalt-v3.svg` was rejected: its “360” is amber `#F59E0B`.
- `Slate360Logo` / `LogoProvider` was not used: it paints “360” with a teal-to-blue gradient and marketing header scale.

Not copied from the homepage: header layout, 78px bar, 40px icon, nav links, or CTA.

Sizing (application chrome, not marketing):

- Default (client bar): icon `h-7` (28px), wordmark 15px / 16.5px from `md`.
- Compact (owner bar, shares space with a section label): icon `h-6` (24px), wordmark 13.5px / 14.5px from `md`.

Do not redraw or add a gradient overlay to the logo. Brand green on “360” and the vNext interaction accent are now the **same** deep green (see the palette correction below) — that is intentional, not a regression.

---

## Color tokens

**Palette corrected 2026-09-18** after Brian reviewed rendered Slice 3 screens and rejected the original beige/tan canvas and cobalt accent as off-brand, washed out, and barren. The decision:

- The **current marketing homepage** (`--mkt-*` tokens in `app/globals.css`) is now the vNext **visual / brand color** reference. vNext canvas, surface, ink, and line tokens lift the homepage's values directly (via `var(--mkt-*, <fallback>)` so vNext tracks the homepage if it ever changes).
- The homepage's **layout** is explicitly *not* adopted — no marketing hero sizing, oversized spacing, animations, or marketing type scale. vNext stays working software; only the color family moved.
- The interaction accent changed from cobalt (`#2c5aa0`) to Slate360's deep homepage green (`--mkt-brand-green`, `#0C7A52`). This unifies client and owner vNext onto **one** accent system — there is no longer a cobalt-for-owner / green-for-logo split.
- Use green sparingly: active navigation, the primary action, useful links, focus rings, small availability markers. Never large green panels/fills.

Defined on `[data-s360-vnext]`:

| Token | Role | Old value (rejected) | Current value |
|---|---|---|---|
| `--vnext-canvas` | Application canvas | `#f4f1ea` warm off-white (read as tan) | `var(--mkt-canvas)` → `#FAFAF8` near-white |
| `--vnext-surface` | Header, sidebar, elevated panels, cards | `#fbfaf6` (read as cream) | `#FFFFFF` true white |
| `--vnext-ink` | Primary text | `#1f1e1b` graphite | `var(--mkt-ink)` → `#1A2433` graphite-navy |
| `--vnext-ink-secondary` | Nav default, supporting text | `#4b4944` | `color-mix(in srgb, var(--vnext-ink) 70%, var(--vnext-ink-muted) 30%)` — derived, stays inside the homepage ink/muted family |
| `--vnext-ink-muted` | Notes, section labels | `#6d6a64` | `var(--mkt-ink-muted)` → `#5B6B80` |
| `--vnext-line` | Borders / dividers | `#ddd8ce` | `var(--mkt-line)` → `#E2E4E0` |
| `--vnext-accent` | Interaction accent | `#2c5aa0` cobalt | `var(--mkt-brand-green)` → `#0C7A52` |
| `--vnext-accent-hover` | Accent hover | `#244b86` | `color-mix(in srgb, var(--vnext-accent) 85%, black)` |
| `--vnext-accent-soft` | Active nav wash | 12% accent mixed into surface | 8% accent mixed into surface (green needed a lighter wash than cobalt did to stay restrained on true white) |
| `--vnext-brand-360` | Logo “360” | `var(--mkt-brand-green)` | unchanged — now equals `--vnext-accent` too (intentional) |
| `--vnext-focus` | Focus ring | same as accent | same as accent |
| `--vnext-danger` / `--vnext-warning` / `--vnext-success` / `--vnext-disabled` | Semantic states | unchanged | unchanged — not part of this correction |

Components consume `var(--vnext-*)` only. Do not sprinkle hex in TSX.

Do not use teal `#00E699` as the vNext **interaction** system. The logo emblem may retain its existing `SlateIcon` paints because that is the approved brand asset. Do not reintroduce a second, competing primary-interaction color (e.g. blue) alongside the green — one accent, everywhere in vNext.

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

- Primary interactive controls: `min-height` and `min-width` `2.75rem` (44px).
- No horizontal page scroll. Root uses `overflow-x-hidden` and `min-w-0`.
- Safe area: header `padding-top: env(safe-area-inset-top)`; main `padding-bottom: env(safe-area-inset-bottom)`.
- Focus: 2px accent (green) outline, 2px offset.

Breakpoints used:

| Viewport | Behavior |
|---|---|
| 390px phone | Client: header + text nav. Owner: header, current section label, Menu drawer |
| 768px tablet | Same as phone for owner (drawer). Client header with default lockup scaling at `md` |
| 1024px+ / 1280 laptop / 1440 desktop | Owner persistent left sidebar; client header with default lockup |

---

## Shell structure

### Client

Top application bar: logo left, **Projects** and **Account** right. No other primary items. Logo home destination is `/vnext/projects`.

### Owner

- Desktop (`lg+`): left sidebar with **Home, Clients, Projects, Processing, QA & Publish, Shares**, then quiet **Settings** and **Account**.
- Below `lg`: top bar with compact logo, current section label, and a **Menu** text button opening a labeled dialog drawer. Not a six-icon bottom bar.
- Logo home destination is `/vnext/ops`.

Active nav: accent (green) underline (header) or 2px left bar + soft wash (sidebar/drawer). `aria-current="page"`. Owner Home is exact-match only.

### Owner Menu drawer

Production-quality modal, not a decorative overlay:

- Escape, backdrop click, Close, and choosing a destination all close it.
- `aria-expanded` / `aria-controls` / `aria-haspopup="dialog"` on Menu.
- Dialog name is **Menu**.
- Focus moves into the dialog on open and is trapped while open.
- Focus returns to Menu on close.
- Background is `inert` and page overflow is locked while open.
- Touch targets remain ≥44px.

---

## Content-width behavior

Slice 1 remaining scaffold pages stay a title, one muted sentence, and a bounded empty region.

The client project portfolio (`/vnext/projects`) uses a wider measure (`72rem`) so image-first records can sit in one / two / three columns by viewport. It is not a dashboard widget board.

The project Overview (`/vnext/projects/[projectId]`) uses the same `72rem` measure (`.vnext-portfolio`), not the narrower `42rem` scaffold width, so a populated project record can occupy the screen at 1280/1440 instead of stacking narrowly with dead space beside it.

---

## Content density (added after the Slice 3 correction)

A **large purposeless blank field is a visual-quality failure**, exactly like fake content is. Brian's Slice 3 review rejected a barren desktop composition (hero pinned to a narrow column, information trickling down a tall pale field) as strongly as the design rules already reject invented metrics.

- Real content should create density and hierarchy: group related real facts into one bounded surface (a compact two-up "latest visit / available" strip, a two-column recent-items/recent-documents grid) instead of one fact per full-width row separated by large vertical gaps.
- When there is genuinely little or no real data, say so once, plainly, in a single compact surface (e.g. "No documented visits or published project records are available yet.") — do not leave a large empty canvas and do not invent sample content to fill it.
- A primary action (like Explore) must only render when it leads somewhere real. Do not show a CTA — enabled or disabled — that has nothing behind it.
- Audit vertical rhythm for repeated large gaps (e.g. `mt-8` between every section) — prefer a consistent, moderate rhythm (`mt-6`) and let bounded surfaces (thin border + white fill) carry visual weight instead of whitespace.

---

## Icon, badge, card policy

- Slice 1 navigation is **text labels only**, except the brand lockup. Do not invent nav icons.
- No status pills, no badges, no nested cards, no metric chips.
- Future cards (Slice 2+) should be image-first project records, not glass tiles.

---

## Prohibited patterns

Glassmorphism, dark SaaS chrome, decorative gradients, icon tiles, widget boards, fake analytics/KPIs, giant headings, giant blank heroes, nested cards, upgrade/billing/seats/plan labels, Coming Soon product modules, Command Center, Studio proliferation, teal **interaction** accents, marketing slogans in the app.

---

## Viewer exception

Dark immersive canvases are allowed **inside** Reality / Geometry / 360 / thermal viewers. They are not the application shell. Built in Slice 4
(`components/vnext/explore/VnextExploreViewerStage.tsx`): the viewer stage background is
`var(--graphite-canvas)` for those four representations only; Plan stays on the light `--vnext-*`
surface tokens (it's a document, not an immersive environment). Everything surrounding the stage —
the representation selector, source picker, header, help — stays on the light vNext system; only the
stage itself goes dark.

**Representation selector** is a restrained underlined tab row (`VnextRepresentationSelector.tsx`),
never an app-launcher grid of tiles/cards, and never renders at all when there is only one available
representation (nothing to choose between). It never renders a Drone entry, not even disabled —
`VNEXT_EXPLORE_REPRESENTATIONS` (`lib/vnext/explore-types.ts`) omits Drone from its type entirely, so
this isn't a runtime filter that could be forgotten later.

**Fullscreen.** One shared hook, `components/vnext/explore/use-vnext-fullscreen.ts`
(`useVnextFullscreen`), backs every vNext fullscreen control. Before Slice 4 the app had two
independent ad hoc fullscreen implementations (`components/digital-twin/MeshTwinViewer.tsx`,
`components/digital-twin/TwinViewerCanvasShell.tsx`) that could drift; new vNext viewer surfaces
should reuse this hook rather than adding a third.

---

## Auth vs preview

| Route prefix | Auth |
|---|---|
| `/vnext/*` | Existing Supabase session + beta approval (`requireVnextSession`). Each page passes its own path so login `redirectTo` matches the requested route. |
| `/vnext/ops/*` | Same, plus `canAccessOperationsConsole` (`requireVnextOwner` with the page path). |
| `/preview/vnext/*` | Unauthenticated visual fixtures. Banner states they are not product screens. Same shell components, forced pathnames. `/preview/vnext/owner-menu` opens the owner drawer for review. |

Middleware is not used for these trees and must not be edited for Slice 1.

---

## Mobile behavior

- Client destinations stay visible as text in the header.
- Owner uses a full-label drawer, not an overcrowded icon bar.
- Menu / Close are words, not unlabeled glyphs.

---

## Interaction QA (standing rule)

Every slice that creates or changes an interactive control must add or update automated coverage **in the same slice**. Rendering is not completion.

Applies to: links, buttons, dropdowns, overflow menus, dialogs, drawers, tabs, toggles, forms, search, filters, viewer controls, contextual menus, rename/edit/delete/copy, share, upload, save/publish.

Suite location: `e2e/vnext/` (Playwright) plus `lib/vnext/*.test.ts` for nav/unit contracts. Run `npm run test:vnext`.

Each Cursor completion report must include **Interaction Coverage**:

- controls added/changed
- automated test covering each control
- routes tested
- auth roles tested where applicable
- console/page/request errors observed
- known untested behavior

Unexpected `console.error`, `pageerror`, failed requests, and undocumented 4xx/5xx fail the suite.

---

## Contextual actions (future slices — do not implement in Slice 1)

**Actions belong with the object they act on. Account is not a dumping ground for project/content management.**

Canonical inventory (planning only): `docs/vnext/ENTITY_ACTION_SETTINGS_MATRIX.md`.

When a later slice builds an entity surface, evaluate only actions the backend actually supports and the current user may perform, such as:

- Rename
- Edit
- Duplicate / Copy
- Move
- Archive
- Delete
- Restore where supported
- Share / Copy link
- Download
- Publish / Unpublish or Revoke where appropriate

Do not add every action to every entity.

Placement:

- project actions → project management
- document/file actions → Documents
- item actions → Items
- visit/scan actions → visit/operator workflow
- share actions → Shares
- saved camera view/path actions → Presentation/Explore

Destructive actions must:

- be visually differentiated without flooding the UI with red
- require confirmation when consequences are significant
- state what will be deleted/affected
- not sit beside the most common constructive action
- use soft-delete/archive/restore when that is what the backend already does

---

## Account / Settings (future — do not implement in Slice 1)

Do not invent settings that do not persist. Canonical inventory:

`docs/vnext/ENTITY_ACTION_SETTINGS_MATRIX.md`

### User account (evaluate)

- name / profile / contact details
- authentication / security
- password or sign-in management where supported
- session / sign-out
- notification preferences if supported
- personal preferences only if genuinely useful
- profile image only if actually persisted

### Organization/admin settings (authorized roles only)

- organization/company information
- branding / client-facing identity where supported
- member / access management where appropriate
- project defaults where supported

Do not expose subscriptions, pricing plans, seat upsells, or app marketplace settings unless the Phase 1 plan is later changed explicitly.
