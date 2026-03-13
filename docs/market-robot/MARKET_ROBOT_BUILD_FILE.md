# Market Robot Build File

Last Updated: 2026-03-13

## Canonical Constraints
- Route and access gate: /market must remain gated by resolveServerOrgContext().canAccessMarket in app/market/page.tsx.
- Keep market_plans as canonical config target for automation saves/applies; legacy directives are compatibility fallback only.
- Do not remove withMarketAuth / resolveServerOrgContext protections from Market API routes.
- Keep direct-buy and scan safety checks unified through lib/market/execution-policy.ts and shared trade persistence helpers.
- Live trading must keep hard blockers visible when NEXT_PUBLIC_POLYMARKET_SPENDER or CLOB credentials are missing.
- Any tab/navigation changes must preserve tab preference compatibility in lib/market/layout-presets.ts and lib/hooks/useMarketLayoutPrefs.ts.
- Results and overview claims must reflect market_trades + runtime state, not optimistic client-only values.

## Source-Of-Truth Map

### Plans
- Primary source: market_plans via app/api/market/plans/route.ts.
- Client manager: lib/hooks/useMarketAutomationState.ts fetches/saves plans, but keeps optimistic localStorage fallback under slate360_automation_plans.
- Apply pipeline: components/dashboard/MarketClient.tsx handleApplyPlan -> lib/market/sync-automation-plan.ts -> /api/market/plans.

### Active Runtime
- Server runtime status: market_bot_runtime via app/api/market/bot-status/route.ts.
- Runtime config resolution order in scan/scheduler: market_plans first, else market_directives, with user_metadata.marketBotConfig overlays (app/api/market/scan/route.ts, lib/market/scheduler-run-user.ts, lib/market/runtime-config.ts).
- System status source label: app/api/market/system-status/route.ts emits configSource and blockers.

### Search State
- Client state and filters live in lib/hooks/useMarketDirectBuyState.ts.
- Fetch strategy per timeframe/query in lib/market/direct-buy-fetch.ts.
- Server browse/search proxy in app/api/market/polymarket/route.ts, including synonym expansion from lib/market/search-synonyms.ts.
- Final list is client-filtered/sorted in lib/market/direct-buy-table.ts.

### Results / Open Positions
- Trade rows source: market_trades via app/api/market/trades/route.ts and hook lib/hooks/useMarketTradeData.ts.
- Results analytics computed client-side in lib/hooks/useMarketResultsState.ts.
- Summary cards endpoint: app/api/market/summary/route.ts.
- Open positions panel + top overview derive from trades passed through components/dashboard/MarketClient.tsx.

### Wallet / Live Readiness
- Wallet/connect/signature/approval state: lib/hooks/useMarketWalletState.ts and components/dashboard/market/MarketLiveWalletTab.tsx.
- Backend readiness/live blockers: app/api/market/system-status/route.ts surfaced via lib/hooks/useMarketSystemStatus.ts.
- Buy route live fallback behavior: app/api/market/buy/route.ts.

## Open Bugs
- BUG-026 (open): architecture still split across market_plans, directives, metadata, runtime tables, scheduler, and UI assumptions.
- Live scan path is effectively paper-only in /api/market/scan: execute branch inserts only simulated paper trades when config.paperMode or runtime status is paper; no live-order execution branch exists.
- Direct-buy success messaging can mislead when backend downgrades live intent to paper_fallback: frontend treats any 2xx as success and does not surface mode/warning from response.
- Automation save/apply can proceed with optimistic local plan even when server plan save fails, causing local/server divergence.
- Summary endpoint still derives mode/starting balance from user metadata/directives instead of market_plans, creating potential mismatch with automation overview state.
- Tab prefs write to /api/market/tab-prefs but load path is localStorage-only, so server-stored prefs are not read back across devices/sessions.

## Current Blockers
- Critical live blocker: NEXT_PUBLIC_POLYMARKET_SPENDER missing blocks allowance checks/approval UX path.
- Missing POLYMARKET_API_KEY / SECRET / PASSPHRASE triggers live fallback behavior.
- Runtime source fallback away from market_plans (directives or metadata) keeps behavior non-canonical.
- Architectural split between summary metrics, top overview values, and runtime source selection still causes trust issues.

## Next Implementation Step
- Implement a single runtime-read model for UI and execution, then wire all overview/status cards to that model.
- Immediate low-risk start: update direct-buy success handling to display backend mode and warnings (paper_fallback vs live), and prevent false live confirmation.

## Manual Verification Checklist
- Access/gate: signed-in user with canAccessMarket can open /market; unauthorized user cannot.
- Layout/tabs: tab reorder/visibility works; hidden active tab auto-switches; prefs persist after refresh.
- Search/browse: query + timeframe + filters produce expected list; synonym query returns related markets.
- Practice direct buy: place paper buy, confirm trade row appears, top overview open count increments, results tab updates.
- Live direct buy (env missing): attempt live buy and confirm UI explicitly states fallback/warning, not pure live success.
- Save/apply/start: save plan, apply plan, ensure bot status changes, immediate scan runs, banner + results update.
- Runtime source: /api/market/system-status reports configSource and blockers consistent with saved data.
- Results/open positions: refresh from Results tab reflects new trades and open exposure consistently.
- Live wallet blockers: checklist + system status both reflect missing spender/CLOB env blockers.
- Overview consistency: compare top overview, results analytics, and /api/market/summary values for the same account after at least one new trade.

## Post-4.5 Verification (2026-03-13)

### Deployment Status
- Batch 4.5 commit `76da310` is HEAD on `main` and confirmed deployed to production at `https://www.slate360.ai`.
- Commit timestamp `23:03:00 UTC` matches Vercel deployment timestamp `23:03:05 UTC` — exact alignment.
- No stale deployment issue.

### Render Ownership
- All 4 sections (Dashboard, Markets, Automation, Results) render through MarketClient → section wrappers → Batch 4.5 components.
- Every Batch 4.5-converted component is actually mounted in the live render tree.
- No shadow/orphaned components intercepting rendering.

### Theme Completeness
- The 14 files converted in Batch 4.5 are fully clean — zero white/light card surfaces.
- **5 files were not included in the Batch 4.5 conversion and still have genuine white/light card backgrounds:**
  - `MarketBuyPanel.tsx` (246 lines, 7 white-surface hits) — solid white cards, outcome selectors, gray quick-pick chips
  - `MarketLiveWalletTab.tsx` (292 lines, 8 hits) — multiple `bg-white border-gray-100` card sections
  - `MarketAdvancedFilters.tsx` (164 lines, 10 hits) — all filter inputs use `border-gray-200` light styling
  - `MarketCustomizeDrawer.tsx` (135 lines, 1 hit) — solid white dropdown panel
  - `MarketTradeReplayDrawer.tsx` (103 lines, 2 hits) — white close button and light-tone rows
- All 5 files are actively mounted in the render tree.

### Root Cause of UI Still Looking Old/Bad
- Not stale deployment.
- Not render-tree mismatch.
- Not a backend truth issue requiring Batch 5.
- **Incomplete visual replacement** — Batch 4.5 missed 5 files containing real white/light card surfaces.

### Recommended Next Step
- **Batch 4.6: targeted theme cleanup pass** on the 5 remaining files before proceeding to Batch 5.
- Same CSS-only rules as Batch 4.5: dark slate panels, transparent accent badges, no functional changes.

## Batch 4.6A — Direct Buy / Search Fix (2026-03-13)

### Root Cause of Direct Buy 400
- The `/api/market/buy` route imported `resolveUserMaxOpenPositions()` which reads the automation plan's `max_open_positions` (typically 5–25).
- `checkSafetyConstraints()` counts ALL `market_trades` rows with `status = "open"` (accumulated paper trades, often 1000+).
- Result: `1000/5` → 400 on every manual direct buy because the automation robot's position cap was applied to manual buys.

### Fix Applied
- Separated direct-buy cap handling from automation cap in `app/api/market/buy/route.ts`.
- Direct buys now use `DIRECT_BUY_MAX_OPEN_POSITIONS` (env-configurable, default 500); paper buys use `Math.max(500, 2000)` to avoid blocking practice users.
- Removed the `resolveUserMaxOpenPositions` import/call from the buy route — automation-plan caps no longer affect manual buys.
- The automation scan route (`/api/market/scan`) still uses `resolveUserMaxOpenPositions`, so robot cap behavior is preserved.
- Error messaging updated: buy errors now state `limitSource: "direct_buy"` and show contextual help text instead of directing users to Automation settings.

### Search/Category Mismatch Fix
- Added `queryMatchesText()` in `lib/market/search-synonyms.ts` with word-boundary matching for synonym expansions.
- Original user queries still use substring match (user typed it intentionally).
- Synonym expansions (e.g. "rain" from weather, "storm" from weather) now use `\b` word boundaries to prevent false positives like "rain" → "Rainbow" or "storm" → "Brainstorm".
- Removed "wind" from weather synonyms (too common, matches "winding", "window", etc.).
- Both server proxy (`/api/market/polymarket`) and client filter (`direct-buy-table.ts`) now use `queryMatchesText`.

### Pre-existing TS Errors Fixed
- `MarketClient.tsx:67`: `wallet.maticData.formatted` → manual formatting from `.value`/`.decimals` (wagmi v2 `useBalance` no longer returns `.formatted`).
- `useMarketAutomationState.ts:108`: `return;` → `return null;` to match `Promise<SavePlanResult | null>` return type.

### Files Changed
- `app/api/market/buy/route.ts` — separate direct-buy cap, remove automation-plan dependency
- `lib/market/search-synonyms.ts` — add `queryMatchesText()` with word-boundary matching
- `app/api/market/polymarket/route.ts` — use `queryMatchesText` instead of `expandSearchTerms` + substring
- `lib/market/direct-buy-table.ts` — use `queryMatchesText` instead of `expandSearchTerms` + substring
- `lib/hooks/useMarketDirectBuyState.ts` — fix fallback error text
- `components/dashboard/MarketClient.tsx` — fix `.formatted` TS error
- `lib/hooks/useMarketAutomationState.ts` — fix return type TS error

### Intentionally Not Changed
- No UI layout/IA changes
- No tab renaming
- No scheduler/runtime-config changes
- No Vercel env/redeploy work
- No broad UI redesign
- `app/api/market/scan/route.ts` unchanged — automation cap remains via `resolveUserMaxOpenPositions`
- 5 remaining dark-theme files (MarketBuyPanel, MarketLiveWalletTab, MarketAdvancedFilters, MarketCustomizeDrawer, MarketTradeReplayDrawer) untouched — deferred to 4.6B

## Last Updated Summary
- Batch 4.6C complete: Market Search product cleanup — oversized clutter removed, topic/category derivation honesty improved with word-boundary matching, buy panel redesigned to dark theme with mode control and post-buy verification, advanced filters dark-themed, quick search pills compacted. Typecheck clean.

## Batch 4.6C — Market Search Product Cleanup (2026-03-13)

### What Changed
- **MarketDirectBuyTab.tsx** (313→248 lines): Removed oversized hero header (~30 lines of gradient/badge/explainer). Replaced with compact one-line header strip. Compacted search toolbar from 3-column grid to inline flex. Replaced verbose status chips with compact inline filter chips. Merged duplicate loading states. Removed unused `systemStatus` import and `onOpenAutomation` destructured usage.
- **MarketBuyPanel.tsx** (246→225 lines): Full dark theme conversion (was white/light). Redesigned to compact single-column layout (was 2xl max-width). Added explicit Practice/Live mode selector with two-step confirmation for live switch. Added post-buy verification guidance ("Where to verify → Results → Open Positions"). Removed unused TP/SL controls from destructuring. Compacted YES/NO buttons, amount input, wallet impact grid.
- **MarketAdvancedFilters.tsx** (164→111 lines): Full dark theme conversion. Compacted to 3-col grid with smaller inputs. Labels shortened.
- **MarketSharedUi.tsx** (81→69 lines): HelpTip tooltip background changed from light gray to dark slate. MarketTableLegend converted from large white 3-card explainer to dark `<details>` collapsible help section.
- **MarketQuickSearchPills.tsx** (29→25 lines): Converted from large white 2-col card grid with descriptions to compact inline pill buttons. Dark themed.
- **MarketMarketsSection.tsx** (30→22 lines): Removed oversized Markets section header block (gradient, explainer, uppercase heading). Direct render of DirectBuy + SavedMarkets grid. Tightened spacing.
- **MarketDirectBuyResults.tsx** (127→125 lines): Removed MarketTableLegend import/render. Tightened border radius and shadow. Removed excess margins.
- **lib/market/mappers.ts** (241→250 lines): `deriveCategory()` now uses `\b` word-boundary matching to prevent false positives. Added geopolitical terms (ceasefire, treaty, sanctions, war) to Politics. Split ambiguous terms (storm vs brainstorm, rain vs rainbow, building construction vs generic "building", TV context, AI context, token+crypto context, finance vs defi, tech vs biotech). `normalizeCategoryBucket()` similarly updated with word boundaries.

### Category Honesty Fix Detail
- Before: "storm" anywhere in title/category → Weather. "Brainstorm" → Weather. "Rainbow" → Weather. "Russia ceasefire" → no specific category. "AI" → Tech even in non-tech contexts.
- After: word-boundary matching prevents substring false positives. Geopolitical events (ceasefire, sanctions, treaty) map to Politics. Ambiguous terms (building, storm, rain, tv, ai, token, tech, finance) require surrounding context words to trigger category assignment.

### Intentionally Not Changed
- No `app/api/market/*` routes touched
- No scheduler/runtime-config/source-of-truth logic changed
- No Vercel env/redeploy work
- MarketLiveWalletTab, MarketCustomizeDrawer, MarketTradeReplayDrawer dark-theme conversion not done (still pending from 4.6B scope)
- No backend buy logic changed
- MarketListingDetailDrawer unchanged (already dark themed)
