# Market Robot — Current State Handoff

Last updated: 2026-03-10
Scope: Current repo state after the latest Market-related pushes on `main`
Audience: Another AI assistant diagnosing why Market Robot is not yet fully seamless for direct buy, paper automation, and live automation

## 1. Executive Summary

Market Robot has been substantially rebuilt. The UI architecture is now clean, the route is decomposed, Direct Buy is much better than it was, automation plan application is materially improved, and the backend is more tolerant of Supabase schema lag than it was a few days ago.

The main remaining blockers are no longer basic UI issues. They are now mostly runtime and architecture issues:

- Live mode still requires real Polymarket CLOB credentials and spender configuration.
- Background automation still depends on the scheduler cron path actually running.
- Search and soon-ending scans are better aligned now, but true high-volume 24/7 automation is still limited by the current cron-loop architecture rather than a queue or worker system.
- Several automation controls exist in UI and runtime config but are only partially enforced at execution time.
- Execution now prefers `market_plans`, but the automation source of truth is still not fully unified because apply flow dual-writes through `market_directives` and auth `user_metadata.marketBotConfig` remains as a runtime overlay.
- The implementation plan doc is partly stale and should not be treated as canonical for gate logic.

Short version:

- Direct Buy paper mode: mostly wired and much closer to working.
- Direct Buy live mode: blocked until real Polymarket live credentials and wallet approval path are in place.
- Automation paper mode: the immediate apply/scan path is now plan-first and capable of simulating trades, but background automation still depends on cron/runtime health and there are still config-enforcement gaps.
- Search for hour/day/week windows now uses the server proxy with upcoming-market filtering, but it still depends on Polymarket Gamma freshness and client-driven fetch loops rather than a purpose-built scanner service.
- Verification is better than before because bot actions now refresh server logs and Results can refresh in-app, but the product still does not offer a strong single-screen operator view that proves scanning, decisioning, and trade execution end-to-end.
- Automation live mode: not production-ready because live execution prerequisites and some runtime-enforcement logic are still incomplete.

## 2. What Changed In Recent Pushes

These are the most relevant recent pushes/commits on `main`, newest first.

### 2.1 `4c8d1f6` — Fix market robot plan execution flow

Main impact:

- `app/api/market/scan/route.ts` now reads `market_plans` first and only falls back to `market_directives` when needed.
- `lib/market/scheduler-run-user.ts` now uses `market_plans` as the primary execution source for budget, categories, risk, trades/day, and open-position limits.
- `lib/market/runtime-config.ts` now converts plan rows into server runtime config explicitly.
- `components/dashboard/MarketClient.tsx` and related UI files were trimmed so apply flow and Results visibility match the new execution path more closely.

Why it mattered:

- This materially reduced the split-brain problem for paper automation. Save/apply/runtime are still not perfectly unified, but scheduler and one-off scans now execute from the saved plan instead of treating directives as the primary source of truth.

### 2.2 `96effc5` — Harden market robot runtime compatibility

Main impact:

- Added backward-compatible `market_trades` persistence fallback in `lib/market/trade-persistence.ts`.
- Hardened direct buy, scan, settle, and legacy trades routes against Supabase schema-cache mismatch.
- Added `scripts/ops/check-market-runtime.mjs` and `npm run diag:market-runtime`.
- Updated tracker and issue ledger.

Why it mattered:

- The deployed Supabase project was behind some repo migrations.
- Newer optional columns like `entry_mode`, `idempotency_key`, `token_id`, `clob_order_id`, `take_profit_pct`, and `stop_loss_pct` could break trade writes.

### 2.3 `8b4f1d1` — Fix market token ids and first scan state

Main impact:

- Fixed Gamma mapper handling of `clobTokenIds` string payloads.
- Allowed paper direct buys even when token IDs are absent.
- Removed first-scan stale-state problem when applying automation plans.

Why it mattered:

- Direct Buy and first automation scans could silently fail for reasons unrelated to actual market logic.

### 2.4 `aa9b6eb` — Fix market automation execution fidelity

Main impact:

- Added runtime-config plumbing for automation.
- Improved scheduler execution path.
- Made automation plan sync more faithful to saved config.
- Lowered the edge threshold so automation can actually find candidates.

Why it mattered:

- Prior automation could run indefinitely and generate zero trades because the edge threshold effectively filtered out the real market set.

### 2.5 `4fad87b` — Harden market access and direct buy UX

Main impact:

- Strengthened access scope handling around Market and CEO tooling.
- Improved Direct Buy UX, sorting, signal heuristics, and explainers.
- Updated tracker, plan, and backend docs.

Why it mattered:

- This is where the market UI became more usable for humans, not just technically decomposed.

### 2.6 `3c1eeb7` — Market Robot automation transfer and log hardening

Main impact:

- Added typed numeric input UX.
- Ensured plan apply transfers runtime-critical values into bot state.
- Reduced noisy log polling.
- Added sync bridge from automation plan to directives.

Why it mattered:

- Before this, important automation values could be saved visually but not actually affect runtime behavior.

## 3. Canonical Corrections To Older Docs

Treat these as current truth.

### 3.1 Market access gate

Current truth:

- Market is gated by `canAccessMarket` from `resolveServerOrgContext()`.

Verified in:

- `app/market/page.tsx`
- `app/api/market/scan/route.ts`
- `app/api/market/directives/route.ts`

Important note:

- `slate360-context/dashboard-tabs/market-robot/IMPLEMENTATION_PLAN.md` still says Market access remains `hasInternalAccess` only. That is stale.
- `slate360-context/dashboard-tabs/market-robot/ONGOING_BUILD_TRACKER.md` is more accurate on this point.

### 3.2 Current route stack

Current truth:

1. `app/market/page.tsx` = gate + providers
2. `components/dashboard/market/MarketRouteShell.tsx` = shell/header/customize integration
3. `components/dashboard/MarketClient.tsx` = thin orchestrator
4. Task tabs under `components/dashboard/market/`
5. Hooks under `lib/hooks/`
6. Runtime and scheduler logic under `lib/market/`
7. API handlers under `app/api/market/`

## 4. Current Market Robot File Map

### 4.1 Entry and orchestration

- `app/market/page.tsx`
- `components/dashboard/MarketClient.tsx`
- `components/dashboard/market/MarketRouteShell.tsx`
- `components/dashboard/market/MarketPrimaryNav.tsx`

### 4.2 User-facing tabs

- `components/dashboard/market/MarketStartHereTab.tsx`
- `components/dashboard/market/MarketDirectBuyTab.tsx`
- `components/dashboard/market/MarketDirectBuyResults.tsx`
- `components/dashboard/market/MarketAutomationTab.tsx`
- `components/dashboard/market/MarketAutomationBuilder.tsx`
- `components/dashboard/market/MarketAutomationDetailControls.tsx`
- `components/dashboard/market/MarketPlanList.tsx`
- `components/dashboard/market/MarketResultsTab.tsx`
- `components/dashboard/market/MarketLiveWalletTab.tsx`
- `components/dashboard/market/MarketSavedMarketsStub.tsx`
- `components/dashboard/market/MarketBuyPanel.tsx`
- `components/dashboard/market/MarketAdvancedFilters.tsx`
- `components/dashboard/market/MarketNumericInput.tsx`
- `components/dashboard/market/MarketSharedUi.tsx`
- `components/dashboard/market/MarketSortHeader.tsx`
- `components/dashboard/market/market-constants.ts`
- `components/dashboard/market/types.ts`

### 4.3 Client hooks

- `lib/hooks/useMarketBot.ts`
- `lib/hooks/useMarketDirectBuyState.ts`
- `lib/hooks/useMarketAutomationState.ts`
- `lib/hooks/useMarketTradeData.ts`
- `lib/hooks/useMarketResultsState.ts`
- `lib/hooks/useMarketServerStatus.ts`
- `lib/hooks/useMarketWalletState.ts`
- `lib/hooks/useMarketLayoutPrefs.ts`
- `lib/hooks/useMarketsExplorer.ts`
- `lib/hooks/useMarketDirectives.ts`

### 4.4 Runtime and domain logic

- `lib/market-bot.ts`
- `lib/market/runtime-config.ts`
- `lib/market/direct-buy-table.ts`
- `lib/market/opportunity.ts`
- `lib/market/mappers.ts`
- `lib/market/scan-request.ts`
- `lib/market/directive-runtime.ts`
- `lib/market/sync-automation-plan.ts`
- `lib/market/trade-persistence.ts`
- `lib/market/scheduler.ts`
- `lib/market/scheduler-run-user.ts`
- `lib/market/scheduler-runtime.ts`
- `lib/market/scheduler-utils.ts`
- `lib/market/scheduler-guards.ts`
- `lib/market/scheduler-activity-log.ts`
- `lib/market/clob-api.ts`
- `lib/market/contracts.ts`
- `lib/market/polymarket.ts`
- `lib/market/layout-presets.ts`

### 4.5 API surface

- `app/api/market/polymarket/route.ts`
- `app/api/market/book/route.ts`
- `app/api/market/buy/route.ts`
- `app/api/market/scan/route.ts`
- `app/api/market/directives/route.ts`
- `app/api/market/bot-status/route.ts`
- `app/api/market/scheduler/health/route.ts`
- `app/api/market/scheduler/tick/route.ts`
- `app/api/market/logs/route.ts`
- `app/api/market/activity/route.ts`
- `app/api/market/summary/route.ts`
- `app/api/market/trades/route.ts`
- `app/api/market/settle-trades/route.ts`
- `app/api/market/watchlist/route.ts`
- `app/api/market/wallet-connect/route.ts`
- `app/api/market/resolution/route.ts`
- `app/api/market/whales/route.ts`
- `app/api/market/tab-prefs/route.ts`

### 4.6 Diagnostics and checks

- `scripts/ops/check-market-runtime.mjs`
- `scripts/ops/check-clob-contract.mjs`
- `scripts/ops/verify-release.mjs`
- `vercel.json`

### 4.7 Market-related migrations

- `supabase/migrations/20260222000000_market_bot_settings.sql`
- `supabase/migrations/20260223120000_market_directives.sql`
- `supabase/migrations/20260224000000_drop_legacy_market_runtime.sql`
- `supabase/migrations/20260224093000_market_trades.sql`
- `supabase/migrations/20260224123000_market_bot_runtime.sql`
- `supabase/migrations/20260224170000_market_bot_runtime_state.sql`
- `supabase/migrations/20260305_market_enhancements.sql`
- `supabase/migrations/20260306_market_robot_phase_1a_3b.sql`
- `supabase/migrations/20260306_market_trades_idempotency.sql`
- `supabase/migrations/20260307_market_access_scope_owner_only_ceo.sql`

## 5. What Works Today

### 5.1 Route and access model

- `/market` is gated server-side.
- Access checks are happening in both page and API routes.
- The UI route stack is decomposed and no longer one giant monolith.

### 5.2 Direct Buy UI

- Direct Buy auto-loads market data.
- Advanced filters and explanations exist.
- The table supports better sorting and visibility.
- YES/NO buy flows are clearer than earlier versions.

### 5.3 Paper trade write path compatibility

- Trade persistence is more resilient to older Supabase schemas.
- Paper direct buys do not require token IDs.
- Buy/scan routes now tolerate missing optional `market_trades` columns better.

### 5.4 Automation plan apply flow

- Applying a plan updates runtime bot state in the client.
- Applying a plan syncs to `market_plans` table (canonical source of truth — legacy directive dual-write retired).
- Applying a plan sets bot status to `paper` or `running` on the server.
- The first scan after apply is less prone to stale state.
- Automation plans can now be loaded from `market_plans` through `/api/market/plans`, with local fallback still preserved in the UI.

### 5.5 Runtime visibility

- `useMarketServerStatus.ts` gives a real server-confirmed status model.
- Results log polling is less noisy than before.
- There is now a dedicated runtime diagnostic script.

## 6. What Is Still Not Working Cleanly

This is the most important section for another assistant.

### 6.1 Live mode is not operational without real Polymarket CLOB credentials

Problem:

- Live orders depend on `POLYMARKET_API_KEY`, `POLYMARKET_API_SECRET`, `POLYMARKET_API_PASSPHRASE`, and `NEXT_PUBLIC_POLYMARKET_SPENDER`.
- Without them, live buys fall back to paper behavior.

Root cause:

- The code correctly distinguishes paper and live execution.
- Paper mode can persist simulated trades directly.
- Live mode needs signed CLOB order submission and spender approval configuration.

Impact:

- Direct live buys are not truly live.
- Automated live buys are not truly live.

Required fix:

1. Provide real Polymarket CLOB credentials in environment.
2. Provide the correct spender address in `NEXT_PUBLIC_POLYMARKET_SPENDER`.
3. Re-run `npm run diag:market-runtime`.
4. Validate live wallet connect, signature, USDC approval, and a small live order.

### 6.2 Background automation still depends on a functioning cron path

Problem:

- Background automation requires `/api/market/scheduler/tick` to be invoked on schedule.
- Vercel cron is declared in `vercel.json`, but real execution still depends on deployed env and secret correctness.

Root cause:

- The system is cron-loop based, not queue based.
- `useMarketBot.ts` has a browser-local interval fallback, but that only works while the tab is open.

Impact:

- Users can think automation is active while no server-side scans are actually happening.

Required fix:

1. Confirm `MARKET_SCHEDULER_SECRET` or `CRON_SECRET` is set in the deployed environment.
2. Manually hit or observe `/api/market/scheduler/tick` and verify lock acquisition, logs, and trade creation.
3. Confirm `market_activity_log` and `market_scheduler_lock` exist in the target Supabase project.
4. Long-term: replace cron-only scheduling with a real worker or queue if high-frequency automation is required.

### 6.3 ✅ RESOLVED — Automation source of truth unified

Status: **Fixed** (2026-03-11)

What changed:

- `syncAutomationPlan()` now writes directly to `market_plans` via `/api/market/plans` (POST/PATCH).
- The legacy dual-write to `market_directives` via `/api/market/directives` has been removed from the apply flow.
- `market_plans` is the canonical, exclusive source of truth for saving and applying automation plans.
- The scanner route (`/api/market/scan`) still reads `market_directives` as a fallback for legacy data, but no new directives are created by the plan apply flow.

Remaining:

- `user_metadata.marketBotConfig` is still used as a runtime overlay in config builders. This is acceptable for now but should be reviewed when scheduler is fully migrated.
- `scheduler-run-user.ts` still has a directive fallback path. Once all users have migrated plans, this fallback can be removed.

### 6.3a Saved Markets is now partly implemented

Current truth:

- `market_watchlist` now exists in the linked Supabase project.
- Direct Buy can now save and unsave markets.
- The Saved Markets tab now renders real watchlist data instead of a stub.

Still missing:

- a richer quick-buy or route-back workflow from Saved Markets into active trading
- alerting behavior on saved items


### 6.4 ✅ RESOLVED — Unenforced automation controls hidden from UI

Status: **Fixed** (2026-03-11)

What changed:

- `MarketAutomationDetailControls.tsx` no longer exposes `slippage`, `fillPolicy`, or `exitRules` inputs. These fields are still persisted and carried in runtime config for future backend enforcement, but the UI does not show controls that do nothing.
- `MarketBuyPanel.tsx` now defaults `showTpSlControls` to `false`. Take Profit % and Stop Loss % sliders are hidden because the backend exit lifecycle is not yet enforced. Parent components can re-enable via prop when enforcement is built.
- Min Liquidity and Max Spread controls remain visible (they ARE enforced in filtering).
- An informational note in the Advanced section explains what was removed and why.

Remaining:

- `timeframe` and `closingSoonFocus` are partially enforced — kept visible because they do affect filtering heuristics.
- `feeAlertThreshold` is mostly informational — kept visible because it is low-harm and useful for awareness.
- The `opp.edge` vs actual spread semantic mismatch in `filterExecutableOpportunities()` still needs a separate fix.
- When live slippage/fill policy/exit rules enforcement is built, re-enable the corresponding UI inputs.

### 6.5 ✅ RESOLVED — Execution policy unified across buy and scan routes

Status: **Fixed** (2026-03-11)

What changed:

- Created `lib/market/execution-policy.ts` as the single shared module for trade validation, position sizing, and safety constraint checks.
- `app/api/market/buy/route.ts` now imports and uses `validateTradeInput()`, `calculatePositionSize()`, and `checkSafetyConstraints()` from the shared policy.
- `app/api/market/scan/route.ts` now imports and uses `calculatePositionSize()` and `checkSafetyConstraints()` from the shared policy.
- Direct buys are now subject to the same open-position limit check that automation trades have always had.
- Position sizing uses the same `calculatePositionSize()` function with portfolio % cap support in both routes.

Architecture:

- `execution-policy.ts` owns: buy limits, trade input validation, position sizing with portfolio cap, and safety constraint queries (daily PnL, open positions).
- Buy route consumes: all three policy functions.
- Scan route consumes: position sizing and safety constraints (validation happens via `parseScanRequest`).
- Both routes share identical constraint enforcement — no more divergence.

### 6.6 Saved Markets is still a stub

Problem:

- The top-level IA includes Saved Markets, but the actual tab is still stubbed.

Impact:

- The IA suggests a complete workflow that is not yet implemented.

Required fix:

1. Implement the Saved Markets tab.
2. Unify watchlist/save semantics and alerts.
3. Decide whether database watchlist records are the single source of truth.

### 6.7 The implementation plan is stale in important places

Problem:

- The implementation plan still claims Market uses `hasInternalAccess` only.
- It also describes older architecture assumptions that no longer match the code.

Impact:

- Another assistant can start from the wrong gate model and wrong assumptions.

Required fix:

1. Treat the tracker plus actual code as primary truth for now.
2. Update the implementation plan to match the current repo once runtime work stabilizes.

## 7. Paper Mode Vs Live Mode

### 7.1 Paper mode prerequisites

Paper mode requires:

- Supabase env set correctly
- Market tables present enough for fallback-compatible writes
- Market route access granted via `canAccessMarket`
- Market feed access through Gamma proxy

Paper mode does not require:

- Polymarket CLOB API credentials
- Token IDs for direct paper buys
- Wallet approval for direct paper buys

### 7.2 Live mode prerequisites

Live mode requires everything paper mode requires, plus:

- `POLYMARKET_API_KEY`
- `POLYMARKET_API_SECRET`
- `POLYMARKET_API_PASSPHRASE`
- `NEXT_PUBLIC_POLYMARKET_SPENDER`
- wallet address
- signature verification path
- USDC approval path
- correct CLOB contract behavior

### 7.3 Practical status

- Paper mode should be the current verification target.
- Live mode should not be treated as complete until real CLOB credentials are installed and tested.

## 8. Backend, Infra, And Access Context

### 8.1 Tech stack

- Next.js 15
- React 19
- TypeScript 5
- Tailwind 4
- Supabase auth + DB
- AWS S3 for file storage
- Vercel deployment and cron
- Wagmi + viem + wallet SDKs
- `@polymarket/clob-client`

### 8.2 Relevant dependencies

Critical package dependencies for Market work:

- `@polymarket/clob-client`
- `@supabase/supabase-js`
- `@supabase/ssr`
- `wagmi`
- `viem`
- `next`
- `react`
- `react-dom`

### 8.3 Database tables directly relevant to Market Robot

- `market_trades`
- `market_directives`
- `market_bot_runtime`
- `market_bot_runtime_state`
- `market_activity_log`
- `market_scheduler_lock`

### 8.4 Copilot capabilities in this repo

In this workspace, Copilot can:

- read and edit files in the repo
- run terminal commands
- run local diagnostics and typechecks
- inspect git history and push to git if the environment permits
- call repo code and inspect build/runtime scripts

Copilot may also be able to interact with external systems if credentials and access are already configured in the environment, but that is environment-dependent.

Practical interpretation:

- Git: read/write/push is available when the git remote and auth are configured.
- Supabase: can inspect and interact through app routes, scripts, Management API, or direct REST calls if keys are available.
- Vercel: deployment occurs via git push to `main`; direct Vercel CLI/admin actions depend on env/tooling.
- AWS: runtime code can access AWS if keys are configured, but Market Robot itself is not primarily AWS-dependent.

Do not expose secrets in any handoff. Another assistant should verify presence and behavior, not print values.

## 9. Specific Opportunity-Finding Logic

This section matters if the next assistant is asked to improve the algorithm.

### 9.1 Market ingestion

`lib/market-bot.ts` fetches active Polymarket markets from Gamma with:

- `active=true`
- `closed=false`
- ordered by `volume24hr`

It can also filter categories by keyword matching question/category text.

### 9.2 Categorization

`categorize(question, category)` maps text into focus areas:

- crypto
- politics
- sports
- weather
- economy
- construction
- real-estate
- entertainment
- all

### 9.3 Risk assessment

`assessRisk(spread, liquidity, volume)` currently does simple heuristics:

- low risk if spread is tight and liquidity is strong
- high risk if spread is wide or liquidity is low
- otherwise medium

### 9.4 Opportunity scoring

`scoreOpportunities()` computes:

- `yesPrice`
- `noPrice`
- `spread = abs(1 - yesPrice - noPrice)`
- `edge = spread * 100`

Confidence is currently based on:

- volume contribution
- liquidity contribution
- edge contribution
- time-decay bonus for sooner expiry
- probability-edge bonus for markets near 50/50

### 9.5 Trade decision logic

`decideTrades()` currently chooses:

- side: YES if `yesPrice < noPrice`, else NO
- position sizing: based on budget-for-tier and price
- confidence threshold by risk level
- focus area filtering
- `maxTradesPerScan`

### 9.6 Why this algorithm is still limited

The current algorithm is mostly heuristic ranking, not a true predictive or market microstructure strategy.

Key limitations:

- `edge` is derived from YES + NO price sum rather than an external predictive advantage signal.
- There is no external forecasting model.
- There is no true order book depth or slippage-aware execution model applied to runtime decisions.
- There is no explicit alpha source beyond liquidity, volume, near-50/50 probability, and timing heuristics.
- There is no proper backtest engine with regime analysis.

Recommended algorithm improvements:

1. Separate market quality scoring from trade edge scoring.
2. Use real spread and order-book depth features from CLOB/book data.
3. Add expected value logic from modeled probability vs market implied probability.
4. Incorporate historical market resolution and category-specific calibration.
5. Add strategy classes rather than one blended heuristic.
6. Build a replay/backtest harness before tuning live automation aggressiveness.

## 10. Most Likely Root Causes For “It Still Doesn’t Work Seamlessly”

If another assistant is diagnosing user-reported failures, start here.

### 10.1 If paper direct buy fails

Check:

1. `market_trades` compatibility and schema fallback behavior
2. route auth and Market access grant
3. request payload shape to `/api/market/buy`
4. logs in `app/api/market/buy/route.ts`
5. whether the environment is missing critical Supabase variables

### 10.2 If automation says it is running but creates no trades

Check:

1. scheduler status and cron invocation
2. `market_bot_runtime.status`
3. `market_activity_log`
4. `market_bot_runtime_state`
5. whether decisions are being produced but not persisted
6. whether runtime filters are too strict for the chosen categories/liquidity/timeframe

### 10.3 If live mode silently falls back to paper

Check:

1. CLOB env vars
2. token IDs in mapped listings
3. wallet address and approval state
4. CLOB response contract
5. `lib/market/clob-api.ts` and `app/api/market/buy/route.ts`

### 10.4 If applied plan settings do not seem to matter

Check:

1. `components/dashboard/market/types.ts`
2. `lib/market/sync-automation-plan.ts`
3. `app/api/market/directives/route.ts`
4. `lib/market/runtime-config.ts`
5. `app/api/market/scan/route.ts`
6. `lib/market/scheduler-run-user.ts`

The likely issue is not UI storage anymore. It is the enforcement gap between stored config and execution behavior.

## 11. Recommended Diagnostic Sequence For The Next Assistant

Follow this order.

1. Read this file.
2. Read `slate360-context/dashboard-tabs/market-robot/ONGOING_BUILD_TRACKER.md`.
3. Read `app/market/page.tsx`, `components/dashboard/MarketClient.tsx`, `lib/hooks/useMarketBot.ts`, `lib/hooks/useMarketDirectBuyState.ts`.
4. Read `app/api/market/buy/route.ts`, `app/api/market/scan/route.ts`, `app/api/market/directives/route.ts`, `lib/market/scheduler-run-user.ts`, `lib/market/runtime-config.ts`, `lib/market-bot.ts`.
5. Run `npm run typecheck`.
6. Run `npm run diag:market-runtime`.
7. Validate paper direct buy.
8. Validate manual apply-plan + immediate paper scan.
9. Validate scheduler tick and activity log entries.
10. Only after paper mode is stable, validate live mode with real CLOB credentials.

## 12. Concrete Solutions To Get To Seamless Paper + Live Operation

### Phase A — Make paper mode truly reliable

1. Verify `diag:market-runtime` passes for Supabase and scheduler prerequisites.
2. Confirm direct paper buy inserts into `market_trades` in the deployed environment.
3. Confirm `market_activity_log` receives scan and scheduler events.
4. Confirm scheduler tick is executing on cadence.
5. Audit and fix any remaining config fields that are persisted but not enforced.

### Phase B — Unify automation state

1. Add `market_plans`.
2. Migrate from localStorage-first plans to server-first plans.
3. Make directives a migration layer, not the runtime source of truth.
4. Make the scheduler consume canonical plan/runtime state.

### Phase C — Make live mode legitimate

1. Install real Polymarket CLOB credentials.
2. Validate spender config and wallet approval UX.
3. Add explicit slippage/fill-policy behavior.
4. Prove a small live trade round-trip.
5. Add live failure logging that is distinct from paper fallback logging.

### Phase D — Improve algorithm effectiveness

1. Replace pseudo-edge with true execution-quality and prediction-quality signals.
2. Add order-book-aware spread and fill modeling.
3. Add strategy-specific ranking rather than one generic score.
4. Build replay/backtest tooling before increasing automation aggressiveness.

## 13. Final Bottom Line

The Market Robot rebuild is not in a “broken UI prototype” state anymore. It is in a “mostly rebuilt, but still not operationally complete” state.

What is closest to done:

- route architecture
- access control
- direct buy UX
- paper-trade persistence compatibility
- basic automation apply flow

What is still preventing seamless direct + automated + live operation:

- real Polymarket live credentials are still missing
- cron/scheduler health must be proven, not assumed
- automation config enforcement is incomplete
- server-side automation source of truth is still fragmented
- the current heuristic trading algorithm is only a starting point, not a robust production strategy
