# Slate360 — Design System & Color Token Map

**Last Updated:** 2026-05-04
**Status:** ACTIVE — canonical source of truth for color, typography, and component patterns.
**Supersedes:** The outdated token table in `UI_CONSISTENCY.md` (which still listed `#D4AF37` gold — that color is RETIRED).

> **Read this before touching any visual code.** This doc tells you where colors live, how they propagate, and exactly what to edit when a brand color changes.

---

## 1. The Brand

| Token | Value | Meaning |
|---|---|---|
| **Amber (primary)** | `#F59E0B` | amber-500 — all shell CTAs, active states, icon spots, FABs |
| **Amber hover** | `#D97706` | amber-600 — hover on amber elements |
| **Amber strong** | `#B45309` | amber-700 — field high-contrast mode (future) |
| **Amber on dark** | `#FCD34D` | amber-300 — readable amber for dark card surfaces |
| **Amber soft bg** | `rgba(245,158,11,0.10)` | amber tint for hover washes on dark glass |
| **Amber glow** | `rgba(245,158,11,0.14)` | subtle glow shadow |
| **Amber glow strong** | `rgba(245,158,11,0.35)` | FAB / primary button glow |
| **Canvas (dark)** | `#0B0F15` | shell base canvas (permanently dark — header, sidebar, auth bg) |
| **Card (dark)** | `#151A23` | dark card surface |
| **Card (light)** | `#FFFFFF` | authenticated page card surface (light mode shell) |
| **Page (light)** | `#F8FAFC` | slate-50 — authenticated page background |

**Retired colors (do not use):**
- `#3B82F6` (cobalt-500) — predecessor primary. Still in 136+ files. Replace when touching.
- `#2563EB` (cobalt-600) — former hover. Replace with `#D97706`.
- `#D4AF37` (gold/champagne) — old brand. Still in Supabase auth email templates only.

---

## 2. The 5-Layer Color System

Color in Slate360 exists in **5 independent layers**. A color change ONLY propagates if you touch the right layer. Touching one layer does NOT automatically update others.

```
Layer 1: CSS Variables  ──── app/globals.css ──────────────── controls shadcn + auth pages
Layer 2: Tailwind TSX  ───── 136+ .tsx files ──────────────── inline class/style hardcodes
Layer 3: Email Theme   ───── lib/email-theme.ts ────────────── controls all Resend transactional emails
Layer 4: Supabase Auth ───── Supabase Dashboard (NOT in code) ─ signup/reset email templates
Layer 5: Logo SVGs     ───── public/uploads/*.svg ─────────── raw image files + 2 component wrappers
```

### How to Change the Brand Color in the Future

**To change the primary action color everywhere (one edit per layer):**

1. **`app/globals.css`** — change `--primary: var(--brand-primary, #F59E0B)` → new color everywhere shadcn + auth inherits.
2. **`lib/email-theme.ts`** — change `primary: "#F59E0B"` → all 4 transactional email types update.
3. **`components/shared/SlateLogo.tsx`** → `LOGO_SRC` constant → all 8+ dark-bg logo sites update.
4. **`components/shared/SlateLogoOnLight.tsx`** → `LOGO_SRC` constant → all light-bg logo sites update.
5. **Supabase Dashboard** → Auth → Email Templates → find/replace old hex → saves immediately.
6. **Grep for old hex** across TSX files → batch replace.

---

## 3. Layer 1 — CSS Variables (`app/globals.css`)

**Single file — Tailwind v4 (no tailwind.config.ts).**

### Critical shadcn tokens (affect ALL shadcn primitives site-wide)

```css
/* In :root block */
--primary: var(--brand-primary, #F59E0B);   /* amber — controls Button/default, Checkbox, Radio */
--primary-hover: #D97706;                   /* amber-600 */
--ring: var(--brand-primary, #F59E0B);      /* amber — focus rings on ALL interactive elements */
--primary-foreground: #FFFFFF;              /* white text on amber buttons */
```

Setting `--brand-primary` on `<body>` (or any ancestor) overrides the fallback. This is how white-label orgs would customize without touching the file.

### Auth page utilities (defined as `@utility` blocks — scope: login/signup/forgot/reset)

| Class | Correct value | Was |
|---|---|---|
| `.auth-btn-primary` bg | `#D97706` | `#2563EB` (cobalt) |
| `.auth-btn-primary:hover` bg | `#F59E0B` | `#3B82F6` (cobalt) |
| `.auth-btn-primary` box-shadow | amber rgba | cobalt rgba |
| `.auth-input:focus` border | `#F59E0B` | `#60A5FA` (cobalt) |
| `.auth-input` `--tw-ring-color` | `rgba(245,158,11,0.32)` | cobalt rgba |
| `.auth-link` color | `#F59E0B` | `var(--color-cobalt)` |
| `.auth-card .text-cobalt` | `#FCD34D` | `#60A5FA` |
| `.auth-btn-oauth:hover` border | amber rgba | cobalt rgba |

### Glow and shadow utilities

| Utility | Correct value | Was |
|---|---|---|
| `--app-glow-amber` | `0 0 12px rgba(245,158,11,0.14)` | cobalt rgba (misnamed!) |
| `--app-glow-amber-strong` | `0 0 16px 0 rgba(245,158,11,0.22)...` | cobalt rgba (misnamed!) |
| `shadow-gold-glow` | amber rgba | cobalt rgba |

### Utilities that ARE correctly amber (do not revert)

- `btn-amber-solid` → `background-color: #F59E0B` ✅
- `shadow-amber-glow` → `rgba(245,158,11,...)` ✅
- `glass-card` → color-neutral dark glass ✅
- `GlassCard` component → `components/shared/GlassCard.tsx` ✅

### Utilities still using cobalt (known debt — fix when touching)

- `btn-amber-soft` — despite the name, it's a cobalt gradient. Fix or rename.
- `form-field:focus` — cobalt border + cobalt ring. Fix to amber.
- `form-button-ghost:hover` — cobalt border/tint. Fix to amber.
- `surface-raised-interactive:hover` — inherits `--primary` (now amber if Layer 1 is fixed).
- `bg-cobalt-soft`, `bg-cobalt-soft-strong`, `text-cobalt`, `border-cobalt`, `border-cobalt-soft` — legacy utilities. Allowed to coexist as named utilities, but should not be applied to new amber-primary surfaces.
- `--module-hub`, `--module-slatedrop`, `--module-virtual` — still `#3B82F6`. Update when module accent colors are redesigned.

### Key structural rules for globals.css

- **Light mode is default** for authenticated pages (`:root` has `--background: #F8FAFC`).
- **Dark mode is opt-in** via `<div className="dark">` — the `.dark` block overrides to canvas/card tokens.
- **Header is permanently dark** — `--header-bg: #0B0F15` is NOT in `.dark`, it's in `:root`. Never retheme the header.
- **Auth pages and the app shell use dark canvas** — auth pages have `background-color: #0B0F15` in `.auth-page` utility.

---

## 4. Layer 2 — Tailwind Hardcoded in TSX Files

**136 TSX/TS files** contain hardcoded `#3B82F6`, `#2563EB`, or `bg-blue-*` / `text-blue-*` / `border-blue-*` classes.

### Already converted to amber (do not redo)

- `app/site-walk/(act-2-inputs)/walks/page.tsx`
- `app/site-walk/(act-2-inputs)/walks/[sessionId]/page.tsx`
- `app/site-walk/(act-3-outputs)/deliverables/page.tsx`
- `app/site-walk/(act-2-inputs)/assigned-work/page.tsx`
- `components/coordination/InboxTabs.tsx`
- `app/(dashboard)/more/page.tsx`
- `components/dashboard/command-center/DashboardTopBar.tsx` (logo fix)
- `app/site-walk/(act-1-setup)/setup/_components/` — all 6 forms

### Still blue (fix when touching these files)

- All `app/(dashboard)/project-hub/[projectId]/` tool pages (management, photos, submittals, schedule, drawings, budget, punch-list, daily-logs, rfis)
- `components/widgets/WidgetBodies.tsx` — `style={{ backgroundColor: "#3B82F6" }}` at lines ~328, ~467
- Google Maps markers — `fillColor: "#3B82F6"` in 3 files
- `app/not-found.tsx`, `app/global-error.tsx`
- `app/(public)/` marketing + terms/privacy pages
- Share viewer, upload portal

### Replacement pattern

| Old (cobalt) | New (amber) |
|---|---|
| `bg-blue-600` | `bg-amber-500` |
| `text-blue-400` | `text-amber-400` |
| `border-blue-500/40` | `border-amber-400/40` |
| `hover:border-blue-500/40` | `hover:border-amber-400/40` |
| `bg-blue-600/10` | `bg-amber-500/10` |
| `text-white` on blue bg | `text-slate-950` on amber bg |
| `style={{ color: "#3B82F6" }}` | `style={{ color: "#F59E0B" }}` |
| `style={{ backgroundColor: "#3B82F6" }}` | `style={{ backgroundColor: "#F59E0B" }}` |

**Rule:** When converting a cobalt button to amber, always change text from `text-white` to `text-slate-950` — amber is a light color, white text fails WCAG on amber-500.

---

## 5. Layer 3 — Email Theme (`lib/email-theme.ts`)

Single source of truth for **all Resend transactional emails**. Import from this file — do not hardcode hex in email template strings.

```typescript
// CORRECT current state (should match this):
export const EMAIL_COLORS = {
  primary:        "#F59E0B",  // amber-500 — CTA buttons
  primaryHover:   "#D97706",  // amber-600
  primaryOnDark:  "#FCD34D",  // amber-300 — readable on dark header bands
  quoteBorder:    "#F59E0B",  // amber accent line
  headerBand:     "#0B0F15",  // dark canvas — email header bg (correct, do not change)
  bodyBg:         "#F8FAFC",  // slate-50 — email body background
  cardBg:         "#FFFFFF",  // white card
  textPrimary:    "#0F172A",  // slate-900
  textMuted:      "#64748B",  // slate-500
  border:         "#E2E8F0",  // slate-200
  footerText:     "#94A3B8",  // slate-400
};
```

**Consumer files — fix inline bypasses when touching:**
- `lib/email.ts` — uses `EMAIL_COLORS` correctly
- `lib/email-site-walk.ts` — uses `EMAIL_COLORS` correctly
- `lib/email-assignments.ts` — has inline `color: #3B82F6` bypass (~line 52) — replace with `EMAIL_COLORS.primary`
- `lib/email-collaborators.ts` — has inline `color: #3B82F6` bypass (~line 22) — replace with `EMAIL_COLORS.primary`

---

## 6. Layer 4 — Supabase Auth Email Templates (Manual — NOT in code)

Location: **Supabase Dashboard → project `hadnfcenpcfaeclczsmm` → Authentication → Email Templates**

Templates: Confirm Signup, Reset Password, Magic Link, Email Change, Invite User.

**Current state:** Uses `#D4AF37` (old gold — WRONG). Target: `#F59E0B` (amber-500).

**To update:** Supabase Dashboard → Auth → Email Templates → find `#D4AF37` → replace with `#F59E0B` → Save.

This step CANNOT be done by editing code. It requires a human to open the Supabase Dashboard.

Documentation of current template HTML: `slate360-context/SUPABASE_EMAIL_TEMPLATES.md`

---

## 7. Layer 5 — Logo SVGs

### The two canonical logo components (use these, not raw `<img>` tags)

| Component | File | For | SVG source |
|---|---|---|---|
| `<SlateLogo>` | `components/shared/SlateLogo.tsx` | Dark backgrounds (shell, auth, sidebar) | `/uploads/slate360-logo-light-v3.svg` — white text + cobalt "360" |
| `<SlateLogoOnLight>` | `components/shared/SlateLogoOnLight.tsx` | Light backgrounds | `/uploads/slate360-logo-cobalt-v3.svg` — all cobalt |

**When a new amber-accent SVG is provided by the designer:** update `LOGO_SRC` constant in both component files → all usage sites update automatically.

### Sites correctly wired to components

- DashboardTopBar ✅, DashboardSidebar ✅, login ✅, signup ✅, reset-password ✅, forgot-password ✅, apps/[slug] ✅, marketing homepage ✅ → `<SlateLogo>` (dark bg)
- external/respond/[token] ✅ → `<SlateLogoOnLight>` (light bg)

### Sites using raw `<img>` (wrong — bypass the components)

These must be migrated to use `<SlateLogo>` or `<SlateLogoOnLight>`:
- `components/home/LandingHeader.tsx` → cobalt SVG `<img>` → use `<SlateLogoOnLight>`
- `components/home/LandingFooter.tsx` → reversed SVG `<img>` → use `<SlateLogo>`
- `components/home/LoginModal.tsx` → cobalt SVG `<img>` → use `<SlateLogoOnLight>`
- `components/collaborator/CollaboratorShell.tsx` → reversed SVG `<img>` → use `<SlateLogo>`

### Favicon

- `app/icon.svg` — `fill="#3B82F6"` hardcoded → change to `fill="#F59E0B"` when designer provides updated favicon

---

## 8. Shell Design Patterns

### Dark App Shell (authenticated shell, auth pages)

```
Background canvas: bg-[#0B0F15]           (dark absolute)
Radial glow:       rgba(245,158,11,0.07)  (amber — subtle)
Card surface:      glass-card utility     (bg-slate-900/60 blur-12 border-slate-700/60 rounded-3xl)
Primary CTA:       btn-amber-solid        (#F59E0B bg, #0C0A09 text, #D97706 hover)
FAB / floating:    btn-amber-solid + shadow-amber-glow
Secondary action:  bg-slate-800 or glassy border + text-slate-300
Section label:     text-sm font-semibold tracking-wide text-amber-400
Icon spot:         bg-amber-500 text-slate-950 rounded-xl w-10 h-10
Divider:           border-white/10
Muted text:        text-slate-400
Body text:         text-slate-100 or text-slate-200
```

### Light Authenticated Shell (most post-login app pages)

```
Background:        bg-background = #F8FAFC (slate-50)
Card:              bg-white border-slate-300 shadow-sm rounded-xl
Primary CTA:       bg-amber-500 text-slate-950 hover:bg-amber-600
Focus rings:       var(--ring) = #F59E0B (amber — inherits if Layer 1 is fixed)
Secondary:         bg-slate-100 text-slate-700 hover:bg-slate-200
Table header:      bg-slate-50 border-slate-200 text-slate-600
```

### GlassCard component

```tsx
import GlassCard from "@/components/shared/GlassCard";
// Usage:
<GlassCard className="p-4">...</GlassCard>
// Renders: bg-slate-900/60 backdrop-blur-md border-slate-700/60 rounded-3xl shadow-lg shadow-black/40
// Override padding/radius via className
```

---

## 9. Typography Scale

| Use | Class |
|---|---|
| Page heading | `text-2xl font-bold text-slate-100` (dark) / `text-slate-900` (light) |
| Section label | `text-sm font-semibold tracking-wide text-amber-400` (dark) |
| Section label | `text-sm font-semibold text-slate-600` (light) |
| Body | `text-sm text-slate-300` (dark) / `text-slate-700` (light) |
| Muted / caption | `text-xs text-slate-500` |
| Field label | `text-xs font-semibold uppercase tracking-widest text-slate-400` |
| Badge | `text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full` |

---

## 10. Status / Badge Colors

| Status | Class |
|---|---|
| Open / Active | `bg-amber-500/20 text-amber-300 border-amber-400/40` |
| Complete / Closed | `bg-emerald-500/20 text-emerald-300 border-emerald-400/40` |
| In Progress | `bg-sky-500/20 text-sky-300 border-sky-400/40` |
| Blocked / Error | `bg-red-500/20 text-red-300 border-red-400/40` |
| Draft / Pending | `bg-slate-500/20 text-slate-300 border-slate-500/40` |
| Shared | `bg-purple-500/20 text-purple-300 border-purple-400/40` |

---

## 11. Project Hub Tool Pages (known monoliths — do not make large)

These 9 files are oversized and still use cobalt. Fix in extraction passes, not inline:

| File | Lines | Fix needed |
|---|---|---|
| `app/(dashboard)/project-hub/[projectId]/management/page.tsx` | 931 | Extract + amber pass |
| `app/(dashboard)/project-hub/[projectId]/photos/page.tsx` | 599 | Extract + amber pass |
| `app/(dashboard)/project-hub/[projectId]/submittals/page.tsx` | 579 | Extract + amber pass |
| `app/(dashboard)/project-hub/[projectId]/schedule/page.tsx` | 465 | Extract + amber pass |
| `app/(dashboard)/project-hub/[projectId]/drawings/page.tsx` | 448 | Extract + amber pass |
| `app/(dashboard)/project-hub/[projectId]/budget/page.tsx` | 421 | Extract + amber pass |
| `app/(dashboard)/project-hub/[projectId]/punch-list/page.tsx` | 403 | Extract + amber pass |
| `app/(dashboard)/project-hub/[projectId]/daily-logs/page.tsx` | 358 | Extract + amber pass |
| `app/(dashboard)/project-hub/[projectId]/rfis/page.tsx` | 339 | Extract + amber pass |

Rule: if a file is ≥250 lines, plan an extraction before adding logic. Check with `wc -l <file>`.
