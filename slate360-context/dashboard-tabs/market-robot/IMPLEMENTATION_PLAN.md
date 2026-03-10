# Market Robot — Implementation Plan

## Purpose
Turn `/market` into a clear, beginner-friendly trading workspace with two obvious jobs:
1. Place a direct trade.
2. Set up automation.

The current backend autonomy work and market data plumbing stay in place. This plan is focused on fixing the product model, information architecture, terminology, and shared customization integration without breaking the route, auth gate, or API contracts.

## Canonical Constraints
- Route remains `/market`.
- Access remains `canAccessMarket` from `resolveServerOrgContext()`. Never move Market Robot to subscription entitlement gating.
- `app/market/page.tsx` remains the gate + provider wrapper.
- `components/dashboard/MarketClient.tsx` remains a thin orchestrator, not a new monolith.
- New files must stay under 300 lines.
- Reuse shared dashboard chrome and shared customization patterns; do not build a market-only customization system.
- Keep current API routes backward compatible while the UI is refactored.

## March 10, 2026 Redesign Pass
- Direct Buy now favors plain-English outcome labels and a detail drawer over dense binary-market shorthand.
- Results and Open Positions now drill into a reusable position detail drawer instead of stopping at summary cards.
- Automation and Results both surface a visible robot activity feed so scans, syncs, and trade events are easier to follow while the wallet/API work is still being finished.

### March 10, 2026 Follow-up UX pass
- Removed "Browse markets in plain English" style meta-copy from the Direct Buy hero and replaced it with direct task copy.
- Replaced chip-heavy + slider-heavy filter controls with standard form controls (search input, time/topic/sort selects, optional advanced numeric filters).
- Added explicit "Open running positions" action in Automation so active trades are easier to locate.
- Added Results guidance clarifying that new trades remain open until market resolution and included a quick refresh action.

## Current State and User Goal
Current backend and data plumbing are usable: shared shell/header, decomposed UI, cron-driven scheduler, wallet verification, approval flow, directives, logs, and summary stats all exist.

The redesign fixes these UX failures:
- top-level tabs reflect implementation details instead of user tasks
- direct buy and automation are mixed together
- jargon appears before the workflow is understood
- search/filter UX depends too much on sliders and caps
- bookmark and watchlist are duplicated
- Market customization is disconnected from the shared dashboard pattern

Primary user tasks:
1. Find a market and place a practice or real-money trade.
2. Create an automation plan and start it safely.
3. Review results and confirm live wallet readiness.

## New Top-Level IA

### Replace current tabs with these task tabs
| New Tab | Purpose | Pulls From |
|---|---|---|
| `Start Here` | Explains what Market Robot does, paper vs live, and where to begin | current dashboard + wallet overview copy |
| `Direct Buy` | Search markets, filter, compare YES/NO, place a manual trade | `MarketExplorerTab`, `MarketHotOppsTab`, `MarketBuyPanel` |
| `Automation` | Build, save, edit, and run automation plans in plain English | `MarketBotConfigPanel`, `MarketDirectivesTab`, `MarketDirectivesForm` |
| `Saved Markets` | Unified saved/followed market list with alerts | bookmark + watchlist logic |
| `Results` | Portfolio, recent trades, P/L chart, automation activity, optional sim comparison | `MarketWalletPerformanceTab`, `MarketSimCompareTab`, `MarketActivityLog` |
| `Live Wallet` | Connect, verify, approve, and understand live-readiness | `MarketWalletCard` |

### Remove these as primary tabs
- `Hot Opps`
- `Whale Watch`
- `Directives`
- `Sim Compare`
- `Wallet & Performance`

These become subsections inside the new task tabs.

## Plain-English Terminology Map
| Current Label | New Label |
|---|---|
| `Markets` | `Direct Buy` |
| `Hot Opps` | `Trade Ideas` |
| `Directives` | `Automation Plans` |
| `Whale Watch` | `Large Trader Signals` |
| `Wallet & Performance` | split into `Results` and `Live Wallet` |
| `Focus Areas` | `Market Categories` |
| `Min Edge` / `Deal Advantage` | `Minimum pricing edge` |
| `Risk Mix` | `Risk level` |
| `Moonshot Mode` | `High-risk mode` |
| `Paper Mode` | `Practice mode` |
| `Live Mode` | `Real-money mode` |
| `Run One Scan` | `Find trade ideas now` |
| `Start Autopilot` | `Start automation` |

## Concepts Removed From Default View
These may remain in advanced mode, but they should not be first-run UI:
- Construction-first presets and category bias.
- Separate bookmark and watchlist actions.
- Scheduler health as a hero card.
- Backend config dump.
- Moonshot as a primary toggle.
- Whale copy as a top-level tab.
- Sim compare as a top-level tab.

## New Page Layout
Market should render in this order inside the shared shell:
1. Intro / task-selection hero.
2. Primary task nav.
3. Active tab content.
4. Optional advanced/secondary panels.

The first screen must answer:
- What can I do here?
- Should I use practice mode or real money?
- Do I want direct buy or automation?

## Component Architecture

### Keep and repurpose
- `components/dashboard/MarketClient.tsx`
- `components/dashboard/market/MarketBuyPanel.tsx`
- `components/dashboard/market/MarketActivityLog.tsx`
- `components/dashboard/market/MarketWalletCard.tsx`
- `components/dashboard/market/MarketDirectivesList.tsx`
- `lib/hooks/useMarketTradeData.ts`
- `lib/hooks/useMarketBot.ts`
- `lib/hooks/useMarketsExplorer.ts`
- `lib/hooks/useMarketDirectives.ts`

### Replace or fold into new task tabs
- Replace `MarketDashboardTab.tsx` with `MarketStartHereTab.tsx`
- Replace `MarketExplorerTab.tsx` with `MarketDirectBuyTab.tsx`
- Fold `MarketHotOppsTab.tsx` into `Direct Buy` as `Trade Ideas`
- Replace `MarketBotConfigPanel.tsx` with `MarketAutomationBuilder.tsx`
- Fold `MarketDirectivesTab.tsx` into `Automation`
- Split `MarketWalletPerformanceTab.tsx` into `MarketResultsTab.tsx` and `MarketLiveWalletTab.tsx`
- Fold `MarketWhaleWatchTab.tsx` into advanced automation insights
- Fold `MarketSimCompareTab.tsx` into advanced results

### New files to create
- `components/dashboard/market/MarketPrimaryNav.tsx`
- `components/dashboard/market/MarketStartHereTab.tsx`
- `components/dashboard/market/MarketDirectBuyTab.tsx`
- `components/dashboard/market/MarketSearchToolbar.tsx`
- `components/dashboard/market/MarketAdvancedFiltersDrawer.tsx`
- `components/dashboard/market/MarketAutomationTab.tsx`
- `components/dashboard/market/MarketAutomationBuilder.tsx`
- `components/dashboard/market/MarketPlanList.tsx`
- `components/dashboard/market/MarketSavedTab.tsx`
- `components/dashboard/market/MarketResultsTab.tsx`
- `components/dashboard/market/MarketLiveWalletTab.tsx`
- `lib/market/layout-presets.ts`
- `lib/hooks/useMarketLayoutPrefs.ts`

## Component Responsibilities
| File | Responsibility |
|---|---|
| `MarketClient.tsx` | Orchestrator only: wire hooks, hold active tab/buy-panel state, pass grouped props, drive layout prefs. Must not render inline market customization, filter markup, or beginner copy logic. |
| `MarketPrimaryNav.tsx` | Render task-based tabs only. No built-in customize trigger or drawer. |
| `MarketStartHereTab.tsx` | Explain what the tool does, practice vs real-money mode, and route users to direct buy or automation. |
| `MarketDirectBuyTab.tsx` | Own search toolbar, standard filters, advanced filters drawer, trade ideas subsection, unified save action, and shared buy panel. |
| `MarketAutomationTab.tsx` | Own automation builder, saved plans list, current automation state, and advanced safety/large-trader subsections. |
| `MarketResultsTab.tsx` | Own portfolio snapshot, metrics, recent trades, bot activity, and optional advanced sim compare. |
| `MarketLiveWalletTab.tsx` | Own wallet connect, signature verification, approval, and explicit live-readiness states. |

## Search and Filter Rules
- Replace slider-only numeric controls with paired number input + optional slider.
- Every capped field must support manual entry for large values.
- Add a visible `Clear filters` action.
- Keep standard filters always visible.
- Move advanced filters into disclosure or drawer.
- Remove construction bias from quick presets and default categories.

## Saved Markets Rules
- Unify bookmark and watchlist into one concept: `Saved Markets`.
- Persist the saved concept in the database-backed watchlist path first.
- If alerting is needed, treat alerts as a property of a saved market, not a second concept.
- Replace star + bell dual actions with one `Save` control and optional alert toggle inside the saved item view.

## Shared Customization Integration
Market must follow `dashboard-tabs/CUSTOMIZATION_SYSTEM.md` and reuse the shared dashboard header/button pattern.

### Canonical integration points
- `components/dashboard/market/MarketRouteShell.tsx`
- `components/shared/DashboardHeader.tsx`
- `components/widgets/WidgetCustomizeDrawer.tsx`
- `lib/widgets/widget-prefs-storage.ts`
- `components/project-hub/ViewCustomizer.tsx`

### Required changes
1. Move the Market customize trigger to the shared header via `MarketRouteShell.tsx`.
2. Remove the customize button and drawer from `MarketTabBar.tsx`.
3. Introduce a market-specific layout hook and presets layer: `lib/market/layout-presets.ts` and `lib/hooks/useMarketLayoutPrefs.ts`.
4. Use the canonical preference shape with `version`, `tabId`, `mode`, `panelOrder`, `panelVisibility`, `panelSizes`, `pinnedTools`, and `expandedSections`.
5. Support `simple`, `standard`, `advanced`, and `custom` modes.
6. Keep layout prefs separate from dashboard widget prefs.

### Preferred implementation approach
Do not fork `WidgetCustomizeDrawer` into a Market-only system. Extract a shared layout customizer base or adapt the existing drawer so future tabs can reuse the same interaction model.

## File-by-File Refactor Plan

### PR1 — Shared customization foundation
Files:
- update `components/dashboard/market/MarketRouteShell.tsx`
- update `components/dashboard/market/MarketTabBar.tsx`
- create `lib/market/layout-presets.ts`
- create `lib/hooks/useMarketLayoutPrefs.ts`
- create shared/customizer adapter if needed

Outcome:
- header-level customize button controls market layout
- market tab order/visibility prefs move to shared-pattern persistence

### PR2 — New primary IA shell
Files:
- update `components/dashboard/MarketClient.tsx`
- create `components/dashboard/market/MarketPrimaryNav.tsx`
- create `components/dashboard/market/MarketStartHereTab.tsx`

Outcome:
- new task tabs exist
- current screens can still be temporarily routed underneath while copy improves

### PR3 — Direct Buy rebuild
Files:
- create `MarketDirectBuyTab.tsx`
- create `MarketSearchToolbar.tsx`
- create `MarketAdvancedFiltersDrawer.tsx`
- refactor `MarketBuyPanel.tsx`
- refactor `useMarketsExplorer.ts`

Outcome:
- direct buy becomes the clear manual trading path
- filters become standard, typed, and resettable
- saved state is simplified

### PR4 — Automation rebuild
Files:
- create `MarketAutomationTab.tsx`
- create `MarketAutomationBuilder.tsx`
- create `MarketPlanList.tsx`
- refactor `MarketDirectivesList.tsx` and `useMarketDirectives.ts`
- demote whale insights to advanced section

Outcome:
- directives and bot config become one plain-English workflow

### PR5 — Results and Live Wallet split
Files:
- create `MarketResultsTab.tsx`
- create `MarketLiveWalletTab.tsx`
- retire top-level `MarketWalletPerformanceTab.tsx`
- refactor `MarketWalletCard.tsx`

Outcome:
- performance and wallet readiness are no longer mixed

### PR6 — Cleanup and advanced tools pass
Files:
- fold or retire `MarketHotOppsTab.tsx`
- fold or retire `MarketWhaleWatchTab.tsx`
- fold or retire `MarketSimCompareTab.tsx`
- finalize copy and terminology updates across all market components

Outcome:
- advanced tools remain available without owning the IA

## Manual Verification Checklist
After each PR verify:
1. `/market` still gates on `canAccessMarket`.
2. Practice mode direct buy still works.
3. Real-money readiness flow still shows connect, verify, and approve states.
4. Saved markets persist across refresh.
5. Layout customization persists across refresh.
6. Reset layout restores a known-good market default.
7. No file exceeds 300 lines.
8. `npx tsc --noEmit` passes.
9. `node scripts/ops/check-clob-contract.mjs` still passes.

## Definition of Done
- A new user can understand Market Robot in under 15 seconds.
- Direct buy and automation are separate first-level paths.
- Search/filter UI is standard and supports typed values.
- There is one saved-market concept.
- Market customization uses the shared dashboard header customize entry.
- Layout preferences follow the cross-tab customization contract.
- No new monolith files are introduced.
