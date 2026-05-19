# Slate360 V1 Design Token Plan

Date: 2026-05-13
Status: Planning only — do not implement until approved
Scope: Design-token direction for Slate360 V1, with first migration limited to Site Walk capture/plan surfaces.

## Goal

Move Slate360 away from harsh black/orange surfaces toward a premium graphite/slate native-app visual system while preserving strong field contrast and readability.

This is not an app-wide repaint plan. Token migration must happen in controlled slices, starting with Site Walk capture and plan workspace.

## Direction

- Background: deep graphite, not pure black.
- Surfaces: slate/charcoal with subtle blue-gray.
- Cards: slightly raised graphite.
- Accent: restrained amber/gold.
- Secondary: muted teal/smoke.
- Text: warm off-white.
- Plan/photo workspace: less black, more neutral canvas framing for clarity.

## Proposed CSS variables

Example values are placeholders for implementation review.

| Token | Example | Intended use |
|---|---:|---|
| `--s360-bg` | `#11161D` | App base background; deep graphite, not pure black |
| `--s360-bg-soft` | `#171D26` | Softer page background and shell gradients |
| `--s360-surface` | `#1C2430` | Primary panels and drawers |
| `--s360-surface-raised` | `#243041` | Raised sheets, menus, active panels |
| `--s360-card` | `#202A38` | Standard cards |
| `--s360-card-muted` | `#18212C` | Muted cards, inactive containers |
| `--s360-border` | `rgba(226, 232, 240, 0.16)` | Primary borders |
| `--s360-border-soft` | `rgba(226, 232, 240, 0.08)` | Hairline/soft borders |
| `--s360-text` | `#F6F0E8` | Warm off-white primary text |
| `--s360-text-muted` | `#B8C0CA` | Secondary text |
| `--s360-text-subtle` | `#8792A0` | Helper/subtle text |
| `--s360-accent` | `#D99A2B` | Restrained amber primary action |
| `--s360-accent-soft` | `rgba(217, 154, 43, 0.14)` | Amber soft background |
| `--s360-accent-strong` | `#F0B84A` | High-emphasis amber affordance |
| `--s360-secondary` | `#6EA7A0` | Muted teal/smoke secondary accent |
| `--s360-secondary-soft` | `rgba(110, 167, 160, 0.14)` | Soft teal panels/badges |
| `--s360-success` | `#5FBF88` | Success/synced/complete |
| `--s360-warning` | `#E2B84E` | Warning/pending/needs review |
| `--s360-danger` | `#E06B6B` | Destructive/error states |
| `--s360-plan-canvas` | `#D8D2C4` | Neutral plan workspace frame/canvas |
| `--s360-photo-canvas` | `#141A22` | Photo workspace frame/canvas |

## Component mapping

### App shell

- Background: `--s360-bg`
- Top/bottom nav: `--s360-surface`
- Active nav: `--s360-accent-soft` + `--s360-accent`
- Divider lines: `--s360-border-soft`

### Site Walk Home

- Page background: `--s360-bg-soft`
- Command cards: `--s360-card`
- Recent Walks panel: `--s360-surface`
- Status badges:
  - complete/synced: `--s360-success`
  - needs review/pending: `--s360-warning`
  - failed/destructive: `--s360-danger`

### CaptureShell

- Header: `--s360-surface`
- Back to Plan / primary action: `--s360-accent`
- Exit/destructive: `--s360-danger` with soft background
- Stop strip: `--s360-card-muted`
- Details sheet: `--s360-surface-raised`

### Plan viewer

- Plan frame: `--s360-plan-canvas`
- Plan top bar: `--s360-surface` with high opacity
- Plan drawer: `--s360-surface-raised`
- Active sheet/page: `--s360-accent-soft`
- Pins: restrained amber/current-user and muted slate/others

### Photo / markup workspace

- Photo frame: `--s360-photo-canvas`
- Markup rail: `--s360-surface-raised`
- Selected tool: `--s360-accent-soft`
- Selection handles: `--s360-secondary`
- Delete selected: `--s360-danger`

### Details / Attachments / Markup sheet

- Sheet background: `--s360-surface-raised`
- Form controls: `--s360-card-muted`
- Inputs text: `--s360-text`
- Tabs active: `--s360-accent-soft`
- Attachments preview surface: `--s360-card`

## Likely hardcoded color files

First audit should look for hardcoded Tailwind color classes and hex/rgb values in:

- `app/globals.css`
- `components/shared/GlassCard.tsx`
- `components/shared/MobileBottomNav.tsx`
- `components/shared/MobileTopBar.tsx`
- `components/dashboard/AppShell.tsx`
- `app/site-walk/page.tsx`
- `app/site-walk/(act-2-inputs)/capture/_components/CaptureClientIsland.tsx`
- `components/site-walk/capture/VisualCaptureView.tsx`
- `components/site-walk/capture/CameraViewfinder.tsx`
- `components/site-walk/capture/CaptureDataBottomSheet.tsx`
- `components/site-walk/capture/PlanViewerLeaflet.tsx`
- `components/site-walk/capture/PlanToolbar.tsx`
- `components/site-walk/capture/PlanQuickActionMenu.tsx`
- `components/site-walk/capture/UnifiedVectorToolbar.tsx`
- `components/site-walk/capture/PendingUploadPreviewModal.tsx`
- public/auth surfaces later: `app/login/page.tsx`, `app/signup/page.tsx`, `components/marketing-homepage.tsx`

## Hardcoded color audit script direction

Add a read-only script in a later approved slice that reports:

- Hex colors: `#[0-9A-Fa-f]{3,8}`
- `rgb()` / `rgba()` literals
- Tailwind hardcoded palette classes such as:
  - `bg-black`
  - `bg-slate-*`
  - `bg-zinc-*`
  - `text-orange-*`
  - `text-amber-*`
  - `border-white/*`
- Inline style color values

The audit should report counts by file and not modify files.

## First migration slice

Only target Site Walk capture/plan surfaces first:

1. Add tokens to `app/globals.css`.
2. Update Site Walk capture/plan components to consume tokens through Tailwind arbitrary values or utility classes.
3. Validate on mobile Plan Walk and Quick Walk.
4. Do not touch public homepage, auth, billing, email, or hidden apps in this first token slice.

## Later migration slices

1. App shell / mobile nav.
2. Site Walk Home command center.
3. SlateDrop file browser surfaces.
4. Auth/pending verification surfaces.
5. Public homepage and marketing surfaces.
6. Email/share/deliverable viewer surfaces.

## Risks

- Broad color migration can create invisible text.
- Replacing all amber at once can remove important primary-action affordances.
- Plan/photo workspaces need different contrast than dashboard cards.
- Public marketing and authenticated app surfaces should align, but not at the cost of breaking field usability.

## Acceptance criteria for first token slice

- Site Walk capture and plan surfaces use the new `--s360-*` tokens for primary backgrounds, panels, borders, text, and accents.
- No functional behavior changes.
- Plan and photo workspaces are more readable on phones.
- `npm run typecheck` passes.
- `npm run build` passes.
- Hardcoded color audit output is documented before and after the slice.
