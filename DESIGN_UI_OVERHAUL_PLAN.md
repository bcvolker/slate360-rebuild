# Slate360 — Design & UI Overhaul Execution Plan

Created: 2026-03-24
Updated: 2026-03-26
Status: Phase 4 — DashboardClient decomposition (NEXT)
Branch: main

## Context

The dashboard and platform UI has accumulated inconsistent styling — navy blue (`#1E3A8A`) scattered across 60+ files, no shared UI primitives (only 3 files in `components/ui/`), a 1,954-line monolith in `DashboardClient.tsx`, and a 780-line homepage. This plan fixes all of it in safe, reversible phases.

### Current State

**As of 2026-03-26 — Phases 0-3.5 complete:**

- **Remote:** Healthy. Force-push fixed broken `8a3ab35`. Current HEAD is `5343dbf`.
- **globals.css:** 230 lines, all `#1E3A8A` removed. Module tokens correct: hub/slatedrop/my-account orange, analytics/market indigo, design purple, content pink, tours cyan, geo green, virtual amber.
- **DashboardClient.tsx:** ~1,961 lines. Navy purged. Still a monolith — Phase 4 decomposes it.
- **components/ui/:** 13 files — 3 pre-existing (`EmptyState.tsx`, `StatusPill.tsx`, `tooltip.tsx`) + 10 from Phase 3 shadcn install (`button`, `card`, `input`, `badge`, `separator`, `avatar`, `select`, `dialog`, `dropdown-menu`, `tabs`).
- **entitlements.ts:** 136 lines — still unmodified (Phase 5).
- **app/page.tsx:** ~780 lines — still a monolith (Phase 6).
- **Navy `#1E3A8A`:** Intentionally kept only in 3 files (user-selectable color swatches): `components/contacts/AddContactModal.tsx`, `app/api/contacts/route.ts`, `app/api/dashboard/widgets/route.ts`.
- **9 orphaned widget files:** Still present, Phase 4.5 wires them in.
- **Husky + lint-staged:** Installed. Pre-commit hook runs ESLint + CSS brace-balance check.
- **GitHub Actions CI:** `release-gates.yml` already runs typecheck + build + architecture guards on every push/PR. No duplicate CI needed.

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

## ✅ Phase 0 — Fix Remote (COMPLETE)

Force-pushed `1c09352` → fixed broken `8a3ab35` (Gemini's truncated globals.css).

---

## ✅ Phase 1 — Design Token Foundation (COMPLETE)

`app/globals.css` updated: `--slate-orange: #FF4D00`, `--slate-accent: #FF4D00`, zinc for backgrounds, module accent tokens for all 10 tabs. `--slate-blue` kept as zinc-800 (`#18181b`) for backward compat.

---

## ✅ Phase 2 — Navy Blue Purge (COMPLETE — commit `5343dbf`)

55 files fixed across all directories. 3 files intentionally left (color swatches). All `#1E3A8A` removed from production UI.

---

## ✅ Phase 3 — Install Shared UI Primitives (COMPLETE)

`components/ui/` now has 13 files. 10 added via `npx --yes shadcn@latest add ...`:
`button`, `card`, `input`, `badge`, `separator`, `avatar`, `select`, `dialog`, `dropdown-menu`, `tabs`

`eslint-plugin-tailwindcss` blocked by Tailwind v4 peer dep conflict — skip until stable support ships. Style: New York, RSC-compatible.

---

## ✅ Phase 3.5 — Guardrails (COMPLETE)

Added during 2026-03-26 session based on Gemini engineering analysis:

- **Husky + lint-staged:** Pre-commit hook runs ESLint on staged `.ts/.tsx` and a CSS brace-balance check on staged `.css` files. This is the guard against broken CSS like Gemini's `8a3ab35` truncation.
- **lint-staged config:** In `package.json` — ESLint with `--max-warnings=0 --fix` for TS, brace-count validation for CSS.
- **GitHub Actions CI:** Already covered by `.github/workflows/release-gates.yml` — runs typecheck (`npx tsc --noEmit`), build stability check, architecture guardrails, and file-size regression on every push and PR. No new CI workflow needed.
- **`tailwind-merge` + `clsx` + `cn()`:** Already installed pre-session. `lib/utils.ts` has the canonical `cn()` helper.
- **`@tanstack/react-query` v5:** Already installed. Use for all async dashboard data fetching in Phase 4.

### Gemini Recommendations Assessment

| Recommendation | Status | Notes |
|---|---|---|
| Remove magic color values | ✅ Done | 55 files fixed, tokens in globals.css |
| tailwind-merge / clsx / cn() | ✅ Already installed | lib/utils.ts has `cn()` |
| React Query | ✅ Already installed | @tanstack/react-query v5 |
| shadcn primitives | ✅ Done Phase 3 | 10 components added |
| Husky + lint-staged | ✅ Done Phase 3.5 | Pre-commit hook in place |
| GitHub Actions CI | ✅ Already existed | release-gates.yml covers this |
| Zod API validation | ⬜ Phase 5.5 | Add after entitlements fix |
| nuqs (URL-synced tab state) | ⬜ Phase 4 | Use for activeTab in DashboardClient |
| eslint-plugin-tailwindcss | ❌ Blocked | No Tailwind v4 support yet |
| Storybook | ❌ Skip | Overkill at current stage |
| Figma MCP | ❌ Skip | External workflow choice |

---

## 🔜 Phase 4 — DashboardClient.tsx Decomposition (NEXT)

**Risk:** Medium | **This is the most complex phase** | **Rollback per extraction:** `git checkout -- components/dashboard/`

**New addition from Gemini analysis:** Use `nuqs` for `activeTab` URL state. Install: `npm install nuqs`. Replace the `activeTab` useState in DashboardClient with `useQueryState('tab', parseAsString.withDefault('project-hub'))`. This makes tab navigation bookmarkable and shareable.

### Current structure of DashboardClient.tsx (~1,961 lines):

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

## Phase 5.5 — Zod API Validation

**Risk:** Low | **Install:** `npm install zod` | **Rollback:** remove zod, revert route files

Add Zod schemas at API route boundaries to catch malformed payloads early. Start with:
- `app/api/market/**` routes (most complex, most risk)
- `app/api/contacts/route.ts`
- `app/api/dashboard/widgets/route.ts`

Pattern:
```typescript
import { z } from "zod";
const schema = z.object({ ... });
const result = schema.safeParse(req body);
if (!result.success) return apiError(400, result.error.message);
```

Do NOT add Zod to every route at once — add per-route when touching that route for another reason.

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
Phase 0    Fix remote (force-push)           ✅ COMPLETE
Phase 1    CSS tokens in globals.css          ✅ COMPLETE
Phase 2    Navy blue purge (55 files)         ✅ COMPLETE (commit 5343dbf)
Phase 3    Install shadcn primitives          ✅ COMPLETE (13 files in components/ui/)
Phase 3.5  Guardrails (Husky, lint-staged)    ✅ COMPLETE
Phase 4    DashboardClient decomposition      🔜 NEXT — includes nuqs for activeTab
Phase 5    Entitlements fix                   ⬜ After Phase 4
Phase 5.5  Zod API validation                 ⬜ Add per-route as touched
Phase 6    Homepage decomposition             ⬜ After dashboard stable
Phase 7    Visual polish                      ⬜ Only after structure solid
Phase 8    New feature readiness              ⬜ Final layer
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
| `app/globals.css` | ~230 | Design tokens (✅ complete) |
| `components/dashboard/DashboardClient.tsx` | ~1,961 | Main monolith (Phase 4) |
| `lib/entitlements.ts` | 136 | Tier gates (Phase 5) |
| `app/page.tsx` | ~780 | Homepage (Phase 6) |
| `components/ui/*` | 13 files | UI primitives (✅ Phase 3 complete) |
| `components/shared/DashboardHeader.tsx` | 286 | Shared header (referenced by Phase 4) |
| `components/shared/DashboardTabShell.tsx` | 96 | Tab wrapper (Phase 8) |
| `components/dashboard/DashboardWidgetRenderer.tsx` | 513 | Widget renderer (Phase 4.5) |
