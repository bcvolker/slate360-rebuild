# Slate360 — Design & UI Overhaul Execution Plan

Created: 2026-03-24
Status: Ready for execution
Branch: main (local commit `1c09352`)

## Context

The dashboard and platform UI has accumulated inconsistent styling — navy blue (`#1E3A8A`) scattered across 60+ files, no shared UI primitives (only 3 files in `components/ui/`), a 1,954-line monolith in `DashboardClient.tsx`, and a 780-line homepage. This plan fixes all of it in safe, reversible phases.

### Current State

- **Remote is broken**: `origin/main` has commit `8a3ab35` (Gemini's truncated `globals.css`). Local `main` is at `1c09352` (healthy). **Phase 0 must run first.**
- **globals.css**: 227 lines, healthy locally. Contains `--slate-blue: #1E3A8A` tokens that need replacement.
- **DashboardClient.tsx**: 1,954 lines, 55 useState vars, JSX starts at ~L1018. My Account inline at ~L1384-1790.
- **components/ui/**: Only 3 files — `EmptyState.tsx`, `StatusPill.tsx`, `tooltip.tsx`. Missing all shadcn basics.
- **entitlements.ts**: 136 lines. Creator missing `canAccessHub: true`. Trial blocks tabs instead of showing upgrade prompts.
- **app/page.tsx**: 780 lines (homepage monolith).
- **Navy blue `#1E3A8A`**: Found in 60+ files — `app/features/**`, `components/dashboard/**`, `components/project-hub/**`, `components/slatedrop/**`, `app/(dashboard)/**`.
- **9 orphaned widget files**: Exist in `components/dashboard/` but imported by nothing.

### Design System Target

| Token | Value | Usage |
|-------|-------|-------|
| Page background | `bg-zinc-950` / `oklch(0.145 0 0)` | Full-page dark background |
| Card surface | `bg-zinc-900` | Cards, panels, modals |
| Card border | `border-zinc-800` | All card borders |
| Subtle text | `text-zinc-400` | Secondary/muted text |
| Brand accent | `#FF4D00` (orange) | CTAs, active states, brand highlights |
| Hover border | `hover:border-zinc-700` | Interactive card hover |
| Focus ring | `ring-orange-500/50` | Keyboard focus indicator |

---

## Phase 0 — Fix Remote (BLOCKING — do first)

**Risk:** Low | **Rollback:** `git push origin 8a3ab35:main --force`

```bash
# 1. Back up env
cp .env.local ~/env-backup

# 2. Force-push healthy local to remote
git push --force origin main

# 3. Verify Vercel redeploys (check dashboard or wait ~2 min)
```

**Why:** Remote `origin/main` is at broken commit `8a3ab35` (Gemini truncated `globals.css`, missing closing bracket at line 103). Local `main` at `1c09352` is healthy with build passing. Force-push overwrites the one broken commit.

---

## Phase 1 — Design Token Foundation

**Risk:** Low | **File:** `app/globals.css` | **Rollback:** `git checkout -- app/globals.css`

### Changes to make in the Slate360 Design Tokens section (~line 123-172):

```css
/* REPLACE these values: */

/* Brand colors — OLD */
--slate-blue: #1E3A8A;
--slate-blue-hover: #162D69;
--slate-blue-light: rgba(30, 58, 138, 0.08);

/* Brand colors — NEW */
--slate-blue: #27272a;           /* zinc-800 — legacy var kept for compat */
--slate-blue-hover: #3f3f46;     /* zinc-700 */
--slate-blue-light: rgba(39, 39, 42, 0.08);

/* ADD new canonical accent variable after --slate-orange-light: */
--slate-accent: #FF4D00;
--slate-accent-hover: #E04400;
--slate-accent-ring: rgba(255, 77, 0, 0.5);

/* Module accent colors — OLD */
--module-hub: #1E3A8A;
--module-analytics: #1E3A8A;

/* Module accent colors — NEW */
--module-hub: #FF4D00;           /* Hub = brand orange */
--module-analytics: #6366F1;     /* Indigo — distinct from other modules */

/* Surface — OLD */
--surface-page: #ECEEF2;

/* Surface — NEW (dark-mode-first) */
--surface-page: oklch(0.09 0 0);  /* zinc-950 equivalent */
```

### Verify

```bash
npm run dev
# Navigate to /dashboard — check colors render, no broken backgrounds
```

---

## Phase 2 — Navy Blue Purge (Batch Find-Replace)

**Risk:** Low-Medium | **Touches ~60 files** | **Rollback per batch:** `git checkout -- <batch files>`

### Strategy: One commit per batch, verify between each.

**Batch A — Feature pages** (`app/features/**`):
```bash
# Find all navy refs in feature pages
grep -rn "#1E3A8A" app/features/
# Replace with appropriate zinc or orange values:
# - Backgrounds: bg-zinc-900
# - Text: text-zinc-100 or text-white  
# - Accents/buttons: #FF4D00 (orange)
# - Borders: border-zinc-800
```

**Batch B — Dashboard components** (`components/dashboard/**`):
```bash
grep -rn "#1E3A8A\|bg-blue-900\|bg-blue-800\|text-blue-" components/dashboard/
# Replace:
# - bg-blue-900 → bg-zinc-900
# - bg-blue-800 → bg-zinc-800  
# - text-blue-400 → text-zinc-400
# - #1E3A8A → bg-zinc-900 or var(--slate-accent)
```

**Batch C — Project Hub** (`components/project-hub/**`, `app/(dashboard)/project-hub/**`):
```bash
grep -rn "#1E3A8A" components/project-hub/ app/\(dashboard\)/project-hub/
# Same replacements as Batch B
```

**Batch D — SlateDrop** (`components/slatedrop/**`):
```bash
grep -rn "#1E3A8A" components/slatedrop/
```

**Batch E — Remaining files** (catch-all):
```bash
grep -rn "#1E3A8A" --include="*.tsx" --include="*.ts" .
# Also catch bg-slate-* leftovers:
grep -rn "bg-slate-900\|bg-slate-800" --include="*.tsx" .
# Replace: bg-slate-900 → bg-zinc-900, bg-slate-800 → bg-zinc-800
```

### Verify per batch

```bash
npm run dev
# Spot-check each affected page
npm run typecheck
```

### Commit per batch

```bash
git add -A && git commit -m "style: purge navy blue from {batch name}"
```

---

## Phase 3 — Install Shared UI Primitives

**Risk:** Low (additive only) | **Rollback:** `git checkout -- components/ui/`

```bash
npx shadcn@latest add button card input badge dialog dropdown-menu tabs separator avatar
```

This populates `components/ui/` with properly typed, accessible components. Do NOT refactor existing consumers yet — just make them available.

### Verify

```bash
npm run typecheck
ls components/ui/  # Should now have button.tsx, card.tsx, input.tsx, etc.
```

### Commit

```bash
git add -A && git commit -m "feat(ui): install shadcn button, card, input, badge, dialog, tabs"
```

---

## Phase 4 — DashboardClient.tsx Decomposition

**Risk:** Medium | **This is the most complex phase** | **Rollback per extraction:** `git checkout -- components/dashboard/`

### Current structure of DashboardClient.tsx (1,954 lines):

| Section | Lines | What |
|---------|-------|------|
| Imports | 1-50 | ~50 import statements |
| State declarations | ~270-503 | 55 useState vars |
| Callbacks/effects | ~504-1017 | Billing, navigation, data fetching |
| JSX return | ~1018-1954 | Header, sidebar, tab content, floating windows |
| My Account tab | ~1384-1790 | Inline billing/profile/subscription UI |
| Overview tab | ~1100-1380 | Project carousel, quick actions, widgets |

### Extraction order (one at a time, test between each):

#### Extract 1: DashboardMyAccount.tsx
- **Source:** ~L1384-1790 of DashboardClient.tsx
- **New file:** `components/dashboard/DashboardMyAccount.tsx`
- **Props needed:** user, profile, subscription, billing callbacks
- **Steps:**
  1. Read L1384-1790 in DashboardClient.tsx
  2. Read the state vars these lines reference (grep for `set` calls)
  3. Create DashboardMyAccount.tsx with those as props
  4. Replace inline JSX with `<DashboardMyAccount {...props} />`
  5. `npm run typecheck && npm run dev` → navigate to My Account tab
  6. `git commit -m "refactor(dashboard): extract DashboardMyAccount"`

#### Extract 2: DashboardOverview.tsx
- **Source:** ~L1100-1380
- **New file:** `components/dashboard/DashboardOverview.tsx`
- **Contains:** Project carousel, quick actions, widget grid

#### Extract 3: DashboardSidebar.tsx
- **Source:** Tab array definition + sidebar nav JSX
- **New file:** `components/dashboard/DashboardSidebar.tsx`
- **Contains:** Tab list, navigation, active tab state

#### Extract 4: DashboardSlateDropWindow.tsx
- **Source:** Floating window state + JSX
- **New file:** `components/dashboard/DashboardSlateDropWindow.tsx`
- **Contains:** SlateDrop floating panel, minimize/maximize, position

#### Extract 5: DashboardWidgetGrid.tsx
- **Source:** Widget rendering from Overview
- **New file:** `components/dashboard/DashboardWidgetGrid.tsx`
- **Also:** Wire the 9 orphaned widget files here:
  - `DashboardCalendarWidget.tsx`
  - `DashboardContactsWidget.tsx`
  - `DashboardContinueWidget.tsx`
  - `DashboardDataUsageWidget.tsx`
  - `DashboardFinancialWidget.tsx`
  - `DashboardProcessingWidget.tsx`
  - `DashboardSeatsWidget.tsx`
  - `DashboardSuggestWidget.tsx`
  - `DashboardWeatherWidget.tsx`

#### Extract 6: useDashboardState.ts
- **Source:** ~L270-503 (55 useState vars)
- **New file:** `lib/hooks/useDashboardState.ts`
- **Contains:** All dashboard state as a custom hook returning `{ state, actions }`

### Target result
- DashboardClient.tsx drops from 1,954 → ~400 lines (orchestrator + imports)
- Each extracted component: 100-300 lines max

---

## Phase 5 — Entitlements Fix

**Risk:** Low | **File:** `lib/entitlements.ts` | **Rollback:** `git checkout -- lib/entitlements.ts`

### Fix 1: Creator gets Hub access
```typescript
// In TIER_MAP.creator, change:
canAccessHub: false,
// To:
canAccessHub: true,
```

### Fix 2 (Recommended): Trial preview mode
Instead of blocking tabs entirely, add a `canPreview` concept:
- Trial users SEE all tabs (navigation is visible)
- Clicking a tier-locked tab shows the tab content with an `<UpgradeGate>` overlay
- This shows value and converts better than hiding features

### Implementation:
```typescript
// Add to Entitlements interface:
canPreviewAll: boolean;

// In TIER_MAP.trial:
canPreviewAll: true,  // show tabs with upgrade prompt overlay
```

Then create `components/shared/UpgradeGate.tsx`:
```tsx
// Wraps tier-locked tab content
// Shows children + semi-transparent overlay with "Upgrade to {tier} to unlock"
// Links to /plans
```

---

## Phase 6 — Homepage Decomposition

**Risk:** Medium | **File:** `app/page.tsx` (780 lines) | **Rollback:** `git checkout -- app/page.tsx components/home/`

### Extract into:

| New File | What |
|----------|------|
| `components/home/HeroSection.tsx` | Hero banner + CTA |
| `components/home/FeaturesGrid.tsx` | Feature card grid |
| `components/home/PricingSection.tsx` | Pricing table |
| `components/home/CTASection.tsx` | Bottom call-to-action |

### Target: `app/page.tsx` drops to ~100 lines (layout shell + imports)

---

## Phase 7 — Visual Polish

**Only after Phases 1-6 are complete.**

| Item | Standard |
|------|----------|
| Cards | `bg-zinc-900 border border-zinc-800 rounded-xl p-6` |
| Headings | `text-2xl font-bold text-white` (page), `text-lg font-semibold` (section) |
| Muted text | `text-sm text-zinc-400` |
| Spacing | `gap-4` for grids, `p-6` for card padding |
| Hover | `hover:border-zinc-700 transition-colors` |
| Focus | `focus-visible:ring-2 ring-orange-500/50` |
| Loading | Skeleton components for every async section |
| Empty states | Use existing `EmptyState.tsx` everywhere |

---

## Phase 8 — New Feature Readiness

**Only after all above is solid.**

- Add shadcn `Tabs` to replace manual tab switching in DashboardClient
- Wire `DashboardTabShell` into all scaffolded tabs (Design Studio, Tours, etc.)
- Build `UpgradeGate` component for trial user conversion
- Add proper empty states to every tab

---

## Platform Recommendations (Beyond Design)

### High-Impact, Low-Effort

1. **Install shadcn basics now** (Phase 3) — Every component reinvents `<Button>` and `<Card>` inline. One `npx shadcn add` command saves hundreds of lines.

2. **Add `next-themes` ThemeProvider** — Dark mode class is applied inconsistently. Single provider in `app/layout.tsx` ensures system preference + user toggle work everywhere.

3. **ModuleAccentProvider context** — Each tab has a module accent color (CSS tokens exist). A React context that reads the active tab eliminates per-component color prop drilling.

### Medium-Impact

4. **Trial → Paid conversion** — Don't hide tabs. Show full dashboard with `<UpgradeGate>` overlay on locked content. "See what you're missing" converts far better than blank pages.

5. **Dev component preview** — Add `/dev/components` route behind `NODE_ENV === 'development'`. Renders all UI primitives. Prevents visual regressions.

6. **DashboardWidgetRenderer → dynamic imports** — The 513-line renderer loads every widget eagerly. Use `next/dynamic` to lazy-load. Cuts initial dashboard bundle ~40%.

7. **Centralize API error handling** — `@/lib/server/api-response` helpers exist but many routes still do inline try/catch. A `withErrorHandler` HOF standardizes responses.

### Strategic

8. **Feature flag system** — Add `lib/feature-flags.ts` reading from env vars. Deploy half-built features behind flags without branching. Essential before Tours/Design Studio builds.

9. **E2E tests for critical paths** — Playwright is configured but only has `mobile-smoke.spec.ts`. Add: login → dashboard, tab switching, My Account billing, SlateDrop upload. Critical during decomposition.

10. **Audit 39 Market files** — `components/dashboard/market/` has 39 files. Some are dead V1 code. Import trace to find and remove orphans.

---

## Execution Order Summary

```
Phase 0  Fix remote (force-push)           ← MUST do first
Phase 1  CSS tokens in globals.css          ← Safe, sets visual foundation  
Phase 2  Navy blue purge (60 files)         ← Mechanical, batch commits
Phase 3  Install shadcn primitives          ← Additive, zero risk
Phase 4  DashboardClient decomposition      ← Highest value, highest effort
Phase 5  Entitlements fix                   ← Small, standalone
Phase 6  Homepage decomposition             ← After dashboard stable
Phase 7  Visual polish                      ← Only after structure solid
Phase 8  New feature readiness              ← Final layer
```

Each phase has its own rollback. No phase depends on a later phase. Phases 1-3 can run in a single session. Phase 4 should be its own focused session.

---

## Agent Coordination Notes

- **Copilot (Claude Opus 4.6):** Primary codebase owner. Does all code changes, decomposition, and verification.
- **Grok 4.2 (Continue):** Good for UX concepts and research. Bad at hook/component API contracts (invents fictional APIs). Protocol: Copilot provides exact type contracts → Grok writes UI → Copilot verifies and fixes types.
- **Gemini 3.1 (Continue):** Useful for design consultation (color palette ideas, layout concepts). **Do NOT let Gemini execute code** — it truncated `globals.css` and broke the remote. Use for mockups/specs only.

---

## Files Referenced

| File | Lines | Role |
|------|-------|------|
| `app/globals.css` | 227 | Design tokens (Phase 1) |
| `components/dashboard/DashboardClient.tsx` | 1,954 | Main monolith (Phase 4) |
| `lib/entitlements.ts` | 136 | Tier gates (Phase 5) |
| `app/page.tsx` | 780 | Homepage (Phase 6) |
| `components/ui/*` | 3 files | UI primitives (Phase 3) |
| `components/shared/DashboardHeader.tsx` | 286 | Shared header (referenced by Phase 4) |
| `components/shared/DashboardTabShell.tsx` | 96 | Tab wrapper (Phase 8) |
| `components/dashboard/DashboardWidgetRenderer.tsx` | 513 | Widget renderer (Phase 4.5) |
