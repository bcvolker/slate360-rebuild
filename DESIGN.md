# Slate360 — Design Law

> This file is the single source of truth for all UI decisions.
> Every AI agent, every PR, every component must comply.
> Last updated: 2026-04-05

## Stack

- **Component library**: Shadcn UI (`new-york` style, RSC-first)
- **Styling**: Tailwind CSS with CSS variables from `globals.css`
- **Icons**: Lucide React (via Shadcn)
- **Fonts**: Geist Sans (body) + Geist Mono (code/status)
- **Dark mode**: `class` strategy via `next-themes`

## Aesthetic Direction

**Slate Industrial** — clean, dense, tool-like. Think Linear meets Vercel.
Calm neutral surfaces. Color used sparingly for status and brand accent.
No decoration. Every element earns its place.

Reference products: Linear, Vercel Dashboard, Raycast.

## Color

Use CSS variables from `globals.css`. Never hardcode hex in components.

| Token | Use |
|---|---|
| `--slate-orange` / `#FF4D00` | Primary brand accent. Max 5–10% of any screen surface. |
| `--slate-blue` / `#18181B` | Dark surface / text color. |
| `--background` / `--foreground` | Page background and default text. |
| `--muted` / `--muted-foreground` | Secondary surfaces and de-emphasized text. |
| `--card` / `--card-foreground` | Card backgrounds. |
| `--border` | All borders. Low-opacity in dark mode. |
| `--destructive` | Errors and destructive actions only. |
| `--status-*` | Status badges: open, review, approved, closed, overdue, draft. |
| `--module-*` | Tab/module accent dots (hub, design, content, tours, geo, market, slatedrop). |

### Rules
- No gradients on surfaces.
- No colored backgrounds on cards — use `bg-card` or `bg-muted`.
- Status colors via small dots or text, not colored card backgrounds.
- Dark mode border: `oklch(1 0 0 / 10%)` — low-opacity white, never solid gray.

## Typography

| Size | Tailwind | Use |
|---|---|---|
| 48px | `text-5xl` | Page hero (rare) |
| 30px | `text-3xl` | Page titles |
| 24px | `text-2xl` | Section headings |
| 20px | `text-xl` | Card titles |
| 16px | `text-base` | Body text |
| 14px | `text-sm` | Secondary text, table cells |
| 12px | `text-xs` | Captions, badges, timestamps |

### Rules
- Headings: `font-semibold` or `font-bold`. Negative letter-spacing (`tracking-tight`) for `text-2xl` and above.
- Body: `font-normal`. Default `leading-normal`.
- Monospace: `font-mono text-xs uppercase tracking-wider` for status labels and metadata tags.
- Tabular data: `tabular-nums` on all numeric columns.
- No `font-light` or `font-thin` in production UI.

## Spacing — 8px Grid

All spacing must land on 8px increments. The 4px half-step is allowed only for tight internal padding (icon gaps, badge padding).

| Token | Value | Tailwind | Use |
|---|---|---|---|
| `--space-1` | 4px | `p-1`, `gap-1` | Icon-to-label gap, badge padding |
| `--space-2` | 8px | `p-2`, `gap-2` | Tight internal padding |
| `--space-3` | 12px | `p-3`, `gap-3` | Default component padding |
| `--space-4` | 16px | `p-4`, `gap-4` | Card padding, between related items |
| `--space-6` | 24px | `p-6`, `gap-6` | Section padding, between groups |
| `--space-8` | 32px | `p-8`, `gap-8` | Page padding, large section gaps |

### Density tiers
- **Dashboard grids**: `gap-4` between cards, `p-4` inside cards.
- **Data tables**: `p-2 py-1.5` cells — compact density.
- **Forms**: `gap-4` between fields, `gap-6` between sections.
- **Settings pages**: `gap-8` between sections.
- **Modals/sheets**: `p-6` content area.

### Rules
- Related items: max `gap-2` (8px) apart.
- Unrelated groups: min `gap-6` (24px) apart.
- Page content: `max-w-7xl mx-auto px-4 md:px-6 lg:px-8`.
- Inner content (text blocks): `max-w-3xl` or `max-w-4xl`.

## Border Radius

| Element | Radius | Tailwind |
|---|---|---|
| Badges / chips | `4px` | `rounded-sm` |
| Buttons / inputs | `6px` | `rounded-md` |
| Cards / panels | `8px` | `rounded-lg` |
| Modals / sheets | `12px` | `rounded-xl` |
| Avatars / pills | full | `rounded-full` |

## Layout

- Sidebar: Shadcn `<SidebarProvider>` + `<Sidebar>` — collapsible, already configured.
- Content area: flex column, `min-h-screen`.
- Responsive: mobile-first. Use `sm:` / `md:` / `lg:` breakpoints.
- No horizontal scroll on any viewport.
- Tables: full-width with horizontal scroll wrapper on mobile (`overflow-x-auto`).

## Motion

| Context | Duration | Easing |
|---|---|---|
| Micro (hover, focus) | `100ms` | `ease-out` |
| Open/close (sheet, dropdown) | `150ms` | `ease-out` |
| Page transition | `200ms` | `ease-in-out` |
| Loading shimmer | `1.5s` | `linear` (loop) |

### Rules
- Always respect `prefers-reduced-motion`. Use Tailwind `motion-safe:` prefix.
- No bounce, spring, or overshoot easing.
- No entrance animations on page load — content appears immediately.
- Skeleton shimmer for loads > 200ms. No spinner unless interactive (button submit).
- Slide-in for sheets/drawers. Fade for modals. Scale-up for popovers.

## Components

### Mandatory Shadcn primitives
Use the installed Shadcn components (`components/ui/`) for ALL standard patterns:

`Button`, `Card`, `Dialog`, `Sheet`, `DropdownMenu`, `Table`, `Input`, `Label`,
`Select`, `Tabs`, `Badge`, `Tooltip`, `Separator`, `Skeleton`, `Avatar`,
`Command`, `Popover`, `Calendar`, `Checkbox`, `Switch`, `Textarea`, `Toast`

### Rules
- **Never** build a custom button, input, select, or dialog. Use Shadcn.
- **Never** install a competing component library (MUI, Chakra, Ant, Radix directly).
- One component per file. One hook per file.
- Server Components first. Add `"use client"` only when hooks or event handlers are needed.
- Props interface declared in the same file above the component.
- No prop drilling beyond 2 levels — use context or composition.

## Inline Styles

**Banned.** No `style={{}}` props except:
1. CSS custom property overrides for branding (`--brand-primary` etc in portal/share pages).
2. Dynamic `width`/`height` from runtime calculations (e.g., progress bars, canvas sizing).

For everything else: Tailwind classes only.

## Empty & Error States

- Empty state: centered icon + heading + description + optional CTA button.
- Error state: destructive `Alert` with message + retry button.
- Loading: `Skeleton` matching the layout of the loaded content.
- No mock data. No placeholder "lorem ipsum." Show the real empty state.

## Brand Application

- Slate Orange (`--slate-orange`) appears in: primary CTAs, active tab indicators, brand logo accent.
- Module accent colors (`--module-*`) appear ONLY as small dots/indicators next to module names.
- Org branding overrides (`--brand-primary`, `--brand-accent`, `--brand-font`) apply ONLY in portal/share/embed views, NOT in the main dashboard.

## Key Design Rules (Quick Reference)

1. Shadcn UI `new-york` style — no other component library.
2. Tailwind CSS variables — no hardcoded hex in components.
3. 8px grid spacing — all layout gaps and padding on 8px increments.
4. No inline styles — Tailwind classes only (two exceptions above).
5. No gradients, heavy shadows, or decorative elements.
6. Color is for meaning (status, accent) — not decoration.
7. Typography and spacing create hierarchy — not borders and boxes.
8. Server Components first. `"use client"` only when required.
9. One component per file. Max 300 lines.
10. `prefers-reduced-motion` always respected.

## Decisions Log

| Date | Decision | Rationale |
|---|---|---|
| 2025-03 | Shadcn `new-york` over `default` | Tighter density, fewer rounded corners, more professional for B2B SaaS |
| 2025-03 | Geist Sans/Mono | Clean geometric sans-serif, Vercel aesthetic, excellent tabular nums |
| 2025-03 | `#FF4D00` brand orange | High-contrast construction/AEC industry signal color |
| 2025-04 | `oklch` color space in globals.css | Future-proof, perceptually uniform, Shadcn v2 default |
| 2026-04 | 8px grid mandate | Prevents "AI slop" — inconsistent spacing that accumulates across generations |
| 2026-04 | No inline styles | Maintains Tailwind as single source of truth, enables dark mode consistency |
