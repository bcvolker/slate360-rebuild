# Slate360 — Design & UI Overhaul Execution Plan

Created: 2026-03-24
Updated: 2026-03-28
Status: Phases 0–8 COMPLETE. Design/UI overhaul plan fully executed.
Branch: main

## Context

The dashboard and platform UI had accumulated inconsistent styling — navy blue (`#1E3A8A`) scattered across 60+ files, no shared UI primitives (only 3 files in `components/ui/`), a 1,954-line monolith in `DashboardClient.tsx`, and a 780-line homepage. This plan fixes all of it in safe, reversible phases.

### Current State

**As of 2026-03-28 — Phases 0–5B complete, all TS errors resolved:**

- **Remote:** Healthy. HEAD is `01bbdf8`, pushed to `origin/main`.
- **TypeScript:** 0 errors across entire codebase.
- **globals.css:** 230 lines, all `#1E3A8A` removed. Module tokens correct.
- **Navy `#1E3A8A`:** Fully purged. 0 files remaining (was 60+).
- **DashboardClient.tsx:** 264 lines (was 1,961). 5 component extractions + 6 sub-hooks.
- **useDashboardState.ts:** 244 lines (was 775). Thin orchestrator importing 6 sub-hooks.
- **SlateDropClient.tsx:** 282 lines (was 451). 7 sub-hooks extracted.
- **MarketClient.tsx:** 175 lines. All TS errors fixed (chainId, wallet props).
- **DashboardHeader.tsx:** 286 lines. Logo now links to `/`. Debug banner removed.
- **components/ui/:** 13 files — 3 pre-existing + 10 shadcn primitives.
- **entitlements.ts:** 136 lines — creator tier has `canAccessHub: true`. ✅
- **app/page.tsx:** 775 lines — still a monolith (Phase 6 target).
- **Mobile quick-access:** Removed (redundant with header QuickNav).
- **Husky + lint-staged:** Installed. Pre-commit hook active.
- **GitHub Actions CI:** `release-gates.yml` runs on every push/PR.

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

## ✅ Phase 4 — DashboardClient.tsx Decomposition (COMPLETE)

**Result:** DashboardClient.tsx reduced from 1,961 → 264 lines. useDashboardState reduced from 775 → 244 lines.

### Extractions completed:
1. **DashboardMyAccount.tsx** — 267 lines (billing, profile, subscription UI)
2. **DashboardOverview.tsx** — Project carousel, quick actions, widget grid
3. **DashboardSidebar.tsx** — Tab list, navigation
4. **DashboardSlateDropWindow.tsx** — Floating SlateDrop panel
5. **DashboardWidgetGrid.tsx / DashboardWidgetRenderer.tsx** — Widget rendering + orphaned widgets wired

### Sub-hooks extracted from useDashboardState (Phase 5B):
- `useBillingState` (81 lines) — billing portal, credits, plan upgrades
- `useWidgetPrefsState` (155 lines) — widget prefs, drag-reorder, save/reset
- `useAccountState` (154 lines) — account overview, API keys, preferences
- `useWeatherState` (104 lines) — geolocation, weather fetch, logging
- `useSuggestFeatureState` (40 lines) — suggest-feature form + submit
- `useNotificationsState` (38 lines) — unread notifications fetch

### Also completed (not in original plan):
- SlateDropClient.tsx: 451 → 282 lines (7 sub-hooks)
- MarketLiveWalletTab props fixed (chainId, onSwitchToPolygon, isSwitchingChain)
- MobileQuickAccess removed (redundant with QuickNav)
- Debug runtime banner removed
- DashboardHeader logo linked to homepage

---

## ✅ Phase 5 — Entitlements Fix (COMPLETE)

Creator tier now has `canAccessHub: true` in `lib/entitlements.ts`. All tiers have correct access flags.

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

## Phase 6 — Homepage Decomposition ✅ COMPLETE (2026-03-28)

**Result:** `app/page.tsx` 775→63 lines (thin shell with imports)

### Extracted files:

| New File | Lines | What |
|----------|-------|------|
| `components/home/home-data.ts` | 166 | Platform cards, moreTools, pricing tiers |
| `components/home/ViewerHelpers.tsx` | 75 | ViewerCard + ViewerModal shared components |
| `components/home/HeroSection.tsx` | 95 | Hero banner + 3D model + CTAs |
| `components/home/PlatformSection.tsx` | 172 | 8 platform cards with interactive viewers |
| `components/home/MoreToolsSection.tsx` | 51 | SlateDrop, GPU, Collaboration, Digital Twin cards |
| `components/home/PricingSection.tsx` | 122 | Pricing table with billing toggle |
| `components/home/CTASection.tsx` | 38 | Bottom call-to-action |
| `components/home/HomeModals.tsx` | 145 | Hero 3D modal + feature card modal with controls |

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
Phase 2    Navy blue purge (60+ files)        ✅ COMPLETE (0 files remaining)
Phase 3    Install shadcn primitives          ✅ COMPLETE (13 files in components/ui/)
Phase 3.5  Guardrails (Husky, lint-staged)    ✅ COMPLETE
Phase 4    DashboardClient decomposition      ✅ COMPLETE (1,961→264 lines, 5 extractions + 6 sub-hooks)
Phase 5    Entitlements fix                   ✅ COMPLETE (creator canAccessHub: true)
Phase 5B   useDashboardState decomposition    ✅ COMPLETE (775→244 lines, 6 sub-hooks)
Phase 5.5  Zod API validation                 ⬜ Add per-route as touched (incremental)
Phase 6    Homepage decomposition             ✅ COMPLETE (775→63 lines, 8 extracted files)
Phase 7    Visual polish                      ✅ COMPLETE (17 files, dark zinc palette, Skeleton.tsx, focus states)
Phase 8    New feature readiness              ✅ COMPLETE (shadcn Tabs, UpgradeGate, tier gating, shell dark mode)

Also completed (not in original plan):
- SlateDropClient decomposition: 451→282 lines (7 sub-hooks)
- MarketClient TS fixes: wallet props + chainId
- UI fixes: logo href, mobile quick-access removal, debug banner removal
- TypeScript: 0 errors across entire codebase
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
| `components/dashboard/DashboardClient.tsx` | 264 | Dashboard orchestrator (✅ Phase 4 complete) |
| `lib/hooks/useDashboardState.ts` | 244 | Dashboard state hook (✅ Phase 5B complete) |
| `components/slatedrop/SlateDropClient.tsx` | 282 | SlateDrop orchestrator (✅ decomposed) |
| `lib/entitlements.ts` | 136 | Tier gates (✅ Phase 5 complete) |
| `app/page.tsx` | 63 | Homepage shell (✅ Phase 6 complete) |
| `components/home/*` | 8 files | Homepage sections (✅ Phase 6 complete) |
| `components/ui/*` | 13 files | UI primitives (✅ Phase 3 complete) |
| `components/shared/DashboardHeader.tsx` | 286 | Shared header (✅ logo + banner fixed) |
| `components/shared/DashboardTabShell.tsx` | 96 | Tab wrapper (Phase 8) |
