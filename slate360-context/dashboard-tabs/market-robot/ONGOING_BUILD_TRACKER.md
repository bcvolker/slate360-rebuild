# Market Robot — Ongoing Build Tracker

Read this only after `START_HERE.md`. This file is long-form build history and prompt-oriented reference, not default startup context.

## Purpose
Use this file to continue Market Robot across multiple chats. Read it after:
1. `SLATE360_PROJECT_MEMORY.md`
2. `slate360-context/NEW_CHAT_HANDOFF_PROTOCOL.md`
3. `slate360-context/BACKEND.md`
4. `slate360-context/dashboard-tabs/CUSTOMIZATION_SYSTEM.md`
5. `slate360-context/dashboard-tabs/market-robot/IMPLEMENTATION_PLAN.md`

This file tracks current status, build order, prompts, checks, and rebuild-from-scratch rules.

## Repo-Aligned Corrections
- Market access is now `canAccessMarket` from `resolveServerOrgContext()`, not the older blanket `hasInternalAccess` wording.
- CEO entitlement override and internal-tab visibility are separate concerns. Do not merge them again.
- Market still uses legacy tab files; rebuild incrementally without breaking route/API contracts.
- Shared customization for Market is still missing and should be implemented first.
- CEO Command Center now has a searchable subscriber directory for granting Market access; do not reintroduce manual-email-only workflows as the primary operator path.

## Current Build Status
**Active batch: 9+ — see Ready-To-Paste Prompt below**

`MarketClient` has zero external callers outside `app/market/page.tsx` (confirmed via GitNexus).
This makes large batches safe. The revised strategy is ~10 prompts by combining related steps.

| Batch | Name | Est. Prompts | AI Model | Done When |
|---|---|---|---|---|
| 1 | Foundation scaffold | 1 | **Sonnet** | ✅ Complete — `MarketClient.tsx` 84 lines, 6 stubs render, MarketPrimaryNav replaces MarketTabBar |
| 2 | Shared customization | 1–2 | **Sonnet** | ✅ Complete — customize in shared header, prefs persist reload, legacy key migrated |
| 3 | Start Here + Direct Buy | 2 | **Sonnet** | ✅ Complete — StartHere has mode picker, 6 recommendations, stepper, explainer; DirectBuy has search/filter/table/buy panel |
| 4 | Simulation + Automation | 2 | **Opus** | ✅ Complete — SimulationPanel with config/compare/snapshots; AutomationTab with plan builder (basic/intermediate/advanced), plan list with save/clone/rename/archive/default |
| 5 | Results + Live Wallet | 1 | **Opus** | ✅ Complete — MarketResultsTab with full P/L analytics, trade replay drawer; MarketLiveWalletTab with readiness checklist, wallet connect, approve, verify, test flow |
| 6 | Background hardening | 1 | **Opus** | ✅ Complete — useMarketServerStatus hook polls server; StatusBadge + StartHereTab use server-confirmed status; UI never shows "running" without server confirmation |
| 7 | Cleanup + retirement | 1 | **Opus** | ✅ Complete — 22 legacy/orphaned files deleted, tsc clean |
| 8 | Direct Buy UX hardening | 1 | **Opus** | ✅ Complete — auto-load, 5 new filters, HelpTip tooltips, 1000-market fetch, MarketAdvancedFilters extracted |
| **Total** | | **~10–12** | | |

**MCP use per batch**
- Run `GitNexus impact(MarketClient, downstream)` before Batch 1 to confirm zero outside callers still true
- Run `GitNexus detect_changes` after every batch before pushing — catches unintended file edits
- Run `GitNexus context(<symbol>)` before editing or extracting any hook
- Use **Supabase MCP** during Batch 4 to confirm `market_plans` table exists before writing automation logic

## AI Model Guide

### Which model for which work
**Sonnet 4.6** — use for all UI-heavy batches (1, 2, 3, 5, 7). Follows multi-file guardrails reliably, respects file size limits, good at composition and decomposition. Best code-to-context ratio.

**Opus 4.6** — use for architecture-heavy batches (4, 6). Stronger reasoning for complex state machines, scheduler behavior, and multi-table DB logic. Worth the extra time when correctness matters more than speed.

**Codex 5.3** — use for narrow, well-scoped completions: "fill in this hook body", "write this API route handler", "fix these TypeScript errors". Not recommended for multi-file refactors or anything requiring project context awareness. Always provide the file contents directly in the prompt.

**Gemini 3.1** — has a very long context window. Useful if you need to paste the entire current state of multiple large files simultaneously. Not recommended as primary builder — tends to diverge from repo patterns. Use as a "read everything and summarize what's wrong" check, not a writer.

**ChatGPT / GPT-5.4** — broad capability but most likely to drift from repo-specific rules. If you use it, prefix every prompt with the full non-negotiables list from this tracker and the exact current file contents. Best for explaining concepts or generating isolated UI snippets, not for multi-file refactors on this codebase.

### Anti-hallucination protocol (use with every model)

**Before the prompt**
1. Run `GitNexus impact` and paste the output into the prompt — forces the model to reason from real data, not assumptions
2. Paste the current content of every file being touched directly into the prompt — do not let the model assume what's in the file
3. State the non-negotiables explicitly in the prompt (route, gate, API backward compat, file size)

**In the prompt**
4. Ask the model to state back what it sees before editing: "Before writing any code, list the files you will touch and what you will change in each"
5. Set a hard rule: "Do not create new API routes. Do not modify existing API routes. Do not add new DB tables unless the Supabase MCP confirms the table does not exist."
6. End every prompt with: "After edits, run `npx tsc --noEmit` and report all errors before considering this complete"

**After the prompt**
7. Run `GitNexus detect_changes` — if files appear that you didn't expect, reject the batch and restart with a narrower scope
8. Run typecheck — TypeScript errors are the fastest way to catch hallucinated function signatures or missing imports
9. Check line counts on every touched file before pushing

## Current Verified State
Status: pre-rebuild groundwork complete, product rebuild not started

Completed
- `slate360_staff` table exists and is managed from CEO Command Center
- scoped internal access exists for `market` and `athlete360`; CEO remains owner-only
- `/market` gates on `canAccessMarket`
- shared header and quick-nav respect scoped internal visibility
- Project Hub duplicate portfolio snapshot was removed and the surviving snapshot is interactive

Current Market files in play
- `app/market/page.tsx`
- `components/dashboard/MarketClient.tsx` (181 lines — orchestrator, switch-renders tabs with shared props, server-confirmed status in header, lazy-loads results logs only when Results is active)
- `components/dashboard/market/MarketRouteShell.tsx` (63 lines — shell + customize integration)
- `components/dashboard/market/MarketPrimaryNav.tsx` (51 lines — prefs-driven nav)
- `components/dashboard/market/MarketCustomizeDrawer.tsx` (135 lines — shared customize drawer)
- `components/dashboard/market/MarketStartHereTab.tsx` (275 lines — **Batch 3 built, Batch 6 updated, Mar 6 runtime hardening, Mar 6 recommendations fix**: mode picker, 6 recommendation presets with user mode respect, first-run banner, YES/NO explainer, navigation to other tabs, server-confirmed bot status bar, onApplyRecommendation passes plan data directly)
- `components/dashboard/market/MarketDirectBuyTab.tsx` (267 lines — **Batch 3 built, Batch 8 updated**: search toolbar, timeframe chips, MarketAdvancedFilters integration, market table w/ YES/NO buy buttons, buy panel drawer)
- `components/dashboard/market/MarketDirectBuyResults.tsx` (139 lines — **Mar 7 new**: extracted results table, bidirectional sortable headers for Market/YES/NO/Prob/Edge/Signal/Volume/Ends, summary insight cards for high-quality setups / best edge / tight spreads)
- `components/dashboard/market/MarketAutomationTab.tsx` (100 lines — **Batch 4 built, Mar 6 automation hardening**: orchestrates builder + plan list + active plan summary with runtime trades/day and max-positions visible)
- `components/dashboard/market/MarketAutomationBuilder.tsx` (214 lines — **Batch 4 built, Mar 6 automation hardening**: guided plan creation with typed numeric inputs for budget, max trades/day, max daily loss, and max open positions)
- `components/dashboard/market/MarketAutomationDetailControls.tsx` (139 lines — **Mar 6 new**: extracted intermediate/advanced automation controls with typed numeric inputs and toggles)
- `components/dashboard/market/MarketNumericInput.tsx` (61 lines — **Mar 6 new**: text-friendly numeric input with clamp-on-commit behavior)
- `components/dashboard/market/MarketPlanList.tsx` (151 lines — **Batch 4 built**: saved plans with apply/edit/clone/rename/archive/default/delete)
- `components/dashboard/market/MarketAdvancedFilters.tsx` (188 lines — **Batch 8 new**: extracted advanced filter panel with 8 filter controls + HelpTip tooltips)
- `components/dashboard/market/MarketSavedMarketsStub.tsx` (stub — future)
- `components/dashboard/market/MarketResultsTab.tsx` (247 lines — **Batch 5 built**: P/L analytics, category/paper-vs-live breakdown, trade history with sort/filter, activity log, trade replay drawer)
- `components/dashboard/market/MarketLiveWalletTab.tsx` (258 lines — **Batch 5 built**: wallet connect, readiness checklist (7 checks), balance/gas display, signature verify, USDC approve, risk disclaimer, verification test flow)
- `components/dashboard/market/MarketBuyPanel.tsx` (reused by DirectBuyTab — shows max loss, max payout, implied probability, what-if scenarios, $5k buy cap with quick-pick buttons)
- `components/dashboard/ceo/CeoSubscriberDirectory.tsx` (259 lines — **Mar 7 operator access flow**: searchable/filterable subscriber list with one-click Market enable/remove, owner account protected from grants)
- `components/dashboard/market/types.ts` (164 lines — all shared types including SimulationConfig, AutomationPlan)
- `lib/hooks/useMarketDirectBuyState.ts` (280 lines — **Batch 3 new, Batch 8 updated, Mar 6 runtime hardening, Mar 7 sorting clarity pass**: auto-load on mount, cursor-batched fetch up to 1000 markets, minVolume/minLiquidity/maxSpread filters, bidirectional sort state, page clamping, table insight summary state)
- `lib/market/direct-buy-table.ts` (108 lines — **Mar 7 new**: pure filter/sort/insight helpers for the direct-buy table)
- `lib/market/opportunity.ts` (54 lines — **Mar 7 new**: shared opportunity signal and spread heuristics reused by UI badges and sorting)
- `lib/hooks/useMarketAutomationState.ts` (136 lines — **Batch 4 new**: plan CRUD, localStorage persistence, control level state)
- `lib/hooks/useMarketTradeData.ts` (156 lines — **Mar 6 automation/runtime hardening**: activity-log polling only runs when Results is active)
- `lib/hooks/useMarketBot.ts` (237 lines — **Mar 6 automation hardening, Mar 6 bot activation fix**: runtime config now includes maxTradesPerDay and blocks scans once the daily trade cap is reached; server hydration on mount via loadServerConfig(); defaults raised to 25 trades/day, 25 positions; handleStartBot sends correct paper/running status)

- `lib/market/layout-presets.ts` (64 lines — tab/panel defaults)
- `lib/market/sync-automation-plan.ts` (70 lines — **Mar 6 new, Mar 6 rewrite**: SyncResult with error details, ensureBotRunning() helper, error response parsing)
- `lib/hooks/useMarketLayoutPrefs.ts` (169 lines — persist/migrate prefs)

- `lib/hooks/useMarketResultsState.ts` (170 lines — **Batch 5 new**: analytics computation, sort/filter, trade replay state)
- `lib/hooks/useMarketWalletState.ts`
- `lib/hooks/useMarketServerStatus.ts` (109 lines — **Batch 6 new, Mar 6 polling fix**: polls /api/market/bot-status + scheduler/health every 10s, returns canonical server-confirmed status)

Still missing from the revised plan
- saved markets / saved searches unified tab (future)
- full retirement of the directive compatibility bridge and auth metadata overlay now that execution is `market_plans`-first
- app-ecosystem-ready packaging assumptions
- server-side pagination for Polymarket catalog (currently client-side fetch)
- bookmarking / saved markets persistence
- authenticated production verification of directives/logs fallback behavior after deploy

## Mar 9, 2026 — Direct Buy reactivity + market_plans bootstrap

Completed
- Direct Buy search now filters the loaded market set instantly instead of only on manual refresh.
- Direct Buy timeframe chips now expose the beginner-friendly set: `Next Hour`, `Day`, `Week`, `Month`, `Year`, `All Time`.
- Direct Buy no longer pages results by default; the table shows all currently matched results.
- Market categories are now normalized in the mapper so Construction, Weather, Economy, Entertainment, and similar groups produce cleaner results.
- Advanced filter labels were rewritten in plainer language and the Results activity log was enlarged into a more readable plain-English feed.
- Added `supabase/migrations/20260309_market_plans.sql` and applied it to the linked Supabase project via the Management API. `market_plans` now exists with indexes, RLS, and an updated-at trigger.
- Applied the existing `20260305_market_enhancements.sql` migration to the linked Supabase project, so `market_watchlist` and `market_tab_prefs` now exist there too.
- Saved Markets is no longer a stub: the tab now loads from `market_watchlist`, Direct Buy rows can be saved/removed, and the buy panel now opens as a fixed modal instead of forcing the user to scroll back to the top.
- Automation plans now load from `/api/market/plans` with local fallback, so the UI is no longer localStorage-only.

Still not done
- Execution is now `market_plans`-first, but apply flow still dual-writes through directives for compatibility.
- “Show all markets” is still bounded by client fetch strategy, not true infinite catalog loading.
- True 24/7 background still depends on deployed cron execution and scheduler secret wiring, not just `vercel.json`.

## Mar 9, 2026 — Direct Buy confirmation + open positions visibility

Completed
- Successful direct buys now refresh trade data, refresh summary/scheduler health, and route the user into Results so the position is immediately visible.
- Results now has an explicit `Open Positions` panel instead of relying only on analytics cards and mixed history rows.
- Direct Buy now fetches a smaller default market set to reduce load time and switches to `endDate` ordering for hour/day/week filters.
- Timeframe filtering now prefers the precise timestamp field (`endDate`) over the date-only field (`endDateIso`), fixing the inaccurate `Next Hour` behavior.

Follow-up hardening
- Direct Buy timeframe filtering now excludes already-ended markets returned by the upstream Gamma feed, which was still emitting stale `active=true` rows with past end dates.
- Direct Buy search now switches into a broader fetch plan when a query is present so search is not limited to the first 1,200 preloaded rows.
- Direct Buy search is now server-assisted through `/api/market/polymarket?_q=...`, so changing the search term triggers a real proxy-backed catalog search instead of only filtering the previously loaded slice.
- Timeline chips now request `upcoming=true` through the market proxy, which makes the proxy scan past stale expired Gamma rows and return only future-closing markets for `Next Hour`, `Day`, and `Week`.
- Default Direct Buy fetch sizes were reduced to cut down cursor-based proxy churn, and scheduler health polling was slowed to reduce transient 504 noise in the Market tab.

## Mar 9, 2026 — Automation stability + UX cleanup

Completed
- Fixed a Results-tab fetch loop in `MarketClient.tsx` that could repeatedly hammer `trades`, `summary`, `health`, and `logs` and contribute to `ERR_INSUFFICIENT_RESOURCES` browser failures.
- Hardened `/api/market/plans` so older or missing `market_plans` schemas degrade to local-fallback behavior instead of throwing 500s on every automation load/save action.
- Automation builder now behaves more like a task flow: it opens on demand, closes automatically after save, and closes on cancel.
- Added clearer automation copy so the simple path is emphasized and the extra controls are explicitly positioned as optional.
- Added a top-level Market overview strip with clickable `Open Positions` and `Automation Programmed` cards so users can jump directly into what is currently open or configured.

## Mar 10, 2026 — Practice-mode diagnosis and immediate wiring fix

Verified from this workspace
- Supabase connectivity is confirmed from the current environment (`curl` to the configured project returned HTTP 200).
- Core Market runtime diagnostics now pass for paper-mode schema prerequisites: `market_trades`, `market_directives`, `market_bot_runtime`, `market_bot_runtime_state`, `market_activity_log`, and `market_scheduler_lock`.
- Local/runtime env now includes `POLYMARKET_API_KEY`, `POLYMARKET_API_SECRET`, `POLYMARKET_API_PASSPHRASE`, and `CRON_SECRET`.
- `NEXT_PUBLIC_POLYMARKET_SPENDER` is still missing in the current environment, so live wallet approval and true live execution are still incomplete even before funding the wallet.
- AWS credentials are present in env, but AWS identity connectivity was not independently verified from this container because the `aws` CLI is not installed here.

Concrete blockers behind “plans save but nothing happens”
- The most obvious practice-mode entry point was partially dead: `MarketStartHereTab` rendered `Start Practice Trading` and `Stop Robot` actions, but `MarketClient` was not passing `onQuickStart` / `onStopBot`, so the hero CTA did nothing. Fixed Mar 10 by wiring those handlers from `useMarketBot`.
- Saving a plan is still not the same as applying a plan. `market_plans` stores the plan, but execution still depends on `syncAutomationPlan()` writing a legacy directive plus bot status, so users can save configuration without changing the runtime until they explicitly hit `Apply`.
- Automation source of truth is still split across `market_plans`, `market_directives`, and auth `user_metadata.marketBotConfig`, but scheduler and one-off scan execution now prefer `market_plans` and only fall back when needed.
- Practice automation remained sensitive to trade sizing until `df68fba` changed scheduler capital allocation to size by `maxOpenPositions` instead of `buys_per_day`. That fix is now in `lib/market/scheduler-run-user.ts`, but it still needs authenticated browser verification in the actual Market tab flow.
- `useMarketBot.loadServerConfig()` now prefers the active `market_plans` row and only falls back to directives when no server plan is available, which reduces one more source of runtime drift.

Most likely user-visible effect right now
- A user can save a practice plan successfully and still see no robot activity because save does not apply.
- A user starting from the Start Here hero previously got no response because the CTA handler was unwired.
- Even after apply, background automation still depends on the scheduler tick actually running with valid cron-secret wiring; the client-side immediate scan path and the server-side background path are separate.

Next highest-value checks
- Authenticated browser verification: save plan -> apply plan -> confirm immediate `/api/market/scan` write -> confirm `market_activity_log` row -> confirm Results/Open Positions shows the practice trade.
- Verify the deployed environment includes `NEXT_PUBLIC_POLYMARKET_SPENDER` before attempting any live-wallet flow.
- Finish retiring directive dual-write and metadata overlay so save/apply/runtime all share one canonical server source of truth.

## Mar 10, 2026 — market_plans scheduler migration

Completed
- `app/api/market/scan/route.ts` now reads the user's active `market_plans` record first (default plan first, then most recently updated non-archived plan) and only falls back to `market_directives` when no plan exists or the table is not available.
- `lib/market/scheduler-run-user.ts` now reads the active `market_plans` record as the primary execution source for budget, trades/day, max open positions, categories, liquidity/spread controls, fill policy, and other runtime settings.
- `lib/market/runtime-config.ts` now has an explicit server-side serializer for `market_plans` rows into `MarketRuntimeConfig`, including scan-mode-to-timeframe mapping and derived defaults for total loss cap and moonshot mode.
- Legacy directive fallback remains in place, so existing users without a server-backed plan still execute instead of failing.

Result
- The split-brain gap is materially reduced: scheduler and one-off scan execution now prefer `market_plans` instead of reading directives as the primary source of truth.
- `market_directives` remains a compatibility layer during migration rather than the primary runtime model.

Still not done
- Apply flow still dual-writes through directives for compatibility; the execution source is now plan-first, but the compatibility bridge has not been removed yet.
- Auth `user_metadata.marketBotConfig` still exists as a runtime overlay for values not yet fully promoted into plan columns.

## Mar 10, 2026 — Search + automation verification cleanup

Completed
- Direct Buy search now keeps soon-ending searches on the upcoming-market path, so hour/day/week searches are less likely to look broken when a text query is present.
- Scheduler health now derives its expected run cadence from the active `market_plans.max_trades_per_day` value before falling back to legacy directives.
- Automation runtime hydration in `useMarketBot` now prefers the active saved plan from `/api/market/plans` and only falls back to `/api/market/directives` when necessary.
- The automation builder now exposes a clearer split between `Save Draft` and `Save + Start Robot`, and the automation tab now surfaces server status, recent scan messages, and a `Run scan now` action for immediate paper-mode verification.

## Mar 10, 2026 — Results refresh + plain-English automation copy

Completed
- `useMarketBot` now refreshes server activity logs after scan/start/pause/stop actions, so local bot messages and server-side activity are less likely to drift apart during paper-mode testing.
- `MarketResultsTab` now refreshes trades, summary, scheduler health, and market logs in-app instead of forcing a full page reload.
- `MarketStartHereTab` now shows a clearer server-status verification block that points users toward Automation and Results for paper-mode confirmation.
- `MarketAutomationBuilder` rewrites the most confusing Basic fields into plainer language: total budget, daily trade cap, stop-after-loss, max positions at once, and scan speed.

Still not done
- The product still lacks a real 24/7 high-volume execution architecture; Vercel cron plus the per-user polling loop is not the same as a worker or queue-backed bot engine.
- The broader Market UI is still too card-heavy and jargon-heavy for a first-time user. This pass improved verification and wording, but it did not redesign the full product experience.
- There is still no true single-pane operator console that shows search universe, scored opportunities, filtered decisions, executed trades, and wallet state together in an obvious Polymarket-bot-first layout.

## Mar 7, 2026 — Operator + Direct Buy refinement pass

Completed
- CEO subscriber assignment path is searchable/filterable and works from the subscriber directory instead of relying on manual email entry.
- Direct Buy headers now support click-to-sort with direction toggling across the visible columns users care about during scanning.
- Direct Buy includes a stronger onboarding legend and three scan summary cards so new users can interpret prices, colors, opportunity strength, and execution quality faster.
- Opportunity heuristics were centralized in `lib/market/opportunity.ts` so Signal badges and Signal sorting cannot drift.

Remaining validation to run later
- Browser-level verification of `/market` sorting and CEO subscriber grant flow with a live local or deployed session.

## Mar 7, 2026 — Paper automation root-cause findings

Confirmed blockers
- Direct paper buys work because [app/api/market/buy/route.ts](../../../app/api/market/buy/route.ts) inserts the paper trade immediately. Automated paper trading takes a different path: plan apply -> [lib/market/sync-automation-plan.ts](../../../lib/market/sync-automation-plan.ts) -> bot status -> [app/api/market/scan/route.ts](../../../app/api/market/scan/route.ts) and optionally the server scheduler in [lib/market/scheduler.ts](../../../lib/market/scheduler.ts).
- The automation scorer was effectively hard-disabled by its own edge threshold. `scoreOpportunities()` defined edge as `abs(1 - yesPrice - noPrice) * 100` in [lib/market-bot.ts](../../../lib/market-bot.ts), while `useMarketBot` defaulted `minEdge` to `1` and the scheduler hard-coded `minOpportunityEdgePct` to `1`. A live sample over the top 500 active Polymarket markets returned `edge >= 1` for `0/500`, `edge >= 0.5` for `0/500`, and even `edge >= 0.1` for `0/500`, so automation could stay "running" forever and still never create a decision.
- Background automation still depends on the secret-protected scheduler tick route at [app/api/market/scheduler/tick/route.ts](../../../app/api/market/scheduler/tick/route.ts). Direct buy does not. If cron is missing, misconfigured, or not reachable in the target environment, users only get the one immediate client scan plus the browser-local 5 minute interval from [lib/hooks/useMarketBot.ts](../../../lib/hooks/useMarketBot.ts) while the tab stays open.

Architecture gaps still limiting automation
- Automation plans are still localStorage-first in [lib/hooks/useMarketAutomationState.ts](../../../lib/hooks/useMarketAutomationState.ts). The UI itself says "Plans stored locally" in [components/dashboard/market/MarketAutomationTab.tsx](../../../components/dashboard/market/MarketAutomationTab.tsx), and the server still treats legacy `market_directives` as the source of truth.
- Several automation controls are UI-only today. `AutomationPlan` includes `scanMode`, `maxOpenPositions`, `maxPctPerTrade`, `feeAlertThreshold`, `closingSoonFocus`, `slippage`, `minimumLiquidity`, `maximumSpread`, and `exitRules` in [components/dashboard/market/types.ts](../../../components/dashboard/market/types.ts), but the sync layer only persists a subset in [lib/market/sync-automation-plan.ts](../../../lib/market/sync-automation-plan.ts). The directives route schema in [app/api/market/directives/route.ts](../../../app/api/market/directives/route.ts) confirms those omitted fields are not stored or enforced server-side.
- Timeframe-specific execution is not real yet. The sync layer writes a coarse `timeframe` string, but the scan route and scheduler do not consume it when selecting markets, so user-specified time windows are currently cosmetic.
- Category vocabulary is inconsistent. The automation UI uses labels like `General`, `Finance`, `Science`, and `Tech` from [components/dashboard/market/market-constants.ts](../../../components/dashboard/market/market-constants.ts), while execution only normalizes the smaller focus-area set in [lib/market/scheduler-utils.ts](../../../lib/market/scheduler-utils.ts) and [lib/market/scan-request.ts](../../../lib/market/scan-request.ts). Unsupported labels are dropped and can silently broaden a plan back to `all`.

Why high-volume automated buys are not optimized yet
- Vercel cron is configured for every 5 minutes in [vercel.json](../../../vercel.json). That means the true background ceiling is roughly 288 scheduler invocations per day unless another worker path is introduced.
- The scheduler derives cadence from `buys_per_day`, but then clamps each run through `MARKET_SCHEDULER_MIN_INTERVAL_SECONDS`, `MARKET_SCHEDULER_MAX_INTERVAL_SECONDS`, `maxTradesPerScan`, and `maxMarketLimit` in [lib/market/scheduler-utils.ts](../../../lib/market/scheduler-utils.ts) and [lib/market/scheduler.ts](../../../lib/market/scheduler.ts). It is a single cron-loop design, not a burst-capable queue.
- There is no durable job queue, no per-user execution backlog, no retry queue, and no true time-window scheduler. Users asking for very high buy counts in specific windows are funneled into a generalized polling loop.

Attempt history and ineffective fixes
- Previous hardening fixed plan sync, bot-status persistence, server-confirmed runtime badges, and scheduler logging, but those changes did not solve the core zero-decision problem because the opportunity model still required a nonzero edge threshold that live markets were not meeting.
- Rewriting the apply flow to sync directives and set `market_bot_runtime` correctly improved state consistency, but it did not by itself create trades because the scan and scheduler still filtered the market set down to zero.

Current fix applied in this pass
- Lowered the automation edge threshold to `0` in [lib/market-bot.ts](../../../lib/market-bot.ts), [lib/hooks/useMarketBot.ts](../../../lib/hooks/useMarketBot.ts), and [lib/market/scheduler.ts](../../../lib/market/scheduler.ts) so paper automation can generate candidates from the existing confidence/liquidity filters instead of requiring an arbitrage gap that the live feed does not expose.
- Improved client scan logging in [lib/hooks/useMarketBot.ts](../../../lib/hooks/useMarketBot.ts) so zero-trade runs now report opportunity and decision counts instead of looking like a silent no-op.
- `app/api/market/directives/route.ts` is now backward-compatible with the older `market_directives` base schema and persists the richer automation execution settings in auth `user_metadata.marketBotConfig`, so missing newer directive columns no longer have to produce a 500.
- The scan route and scheduler now consume metadata-backed timeframe, liquidity floor, spread ceiling, max open positions, and per-trade allocation caps through [lib/market/runtime-config.ts](../../../lib/market/runtime-config.ts), [app/api/market/scan/route.ts](../../../app/api/market/scan/route.ts), and [lib/market/scheduler-run-user.ts](../../../lib/market/scheduler-run-user.ts).

## Mar 7, 2026 — Direct buy token IDs + apply-plan first scan

Confirmed blockers
- Live Gamma market payloads currently return `clobTokenIds` as a JSON string, not a native array. The mapper in [lib/market/mappers.ts](../../../lib/market/mappers.ts) only handled the array shape, so many Direct Buy rows reached the UI without `tokenIdYes` / `tokenIdNo` even when Polymarket had provided them.
- The Direct Buy readiness check in [lib/hooks/useMarketDirectBuyState.ts](../../../lib/hooks/useMarketDirectBuyState.ts) treated missing token IDs as a blocker for both live and paper buys, even though paper-mode execution through [app/api/market/buy/route.ts](../../../app/api/market/buy/route.ts) does not require a token ID.
- The immediate scan triggered from [components/dashboard/MarketClient.tsx](../../../components/dashboard/MarketClient.tsx) could still run with stale hook state because React had not necessarily committed the freshly applied plan values before `runScan()` executed.

Current fix applied in this pass
- Hardened [lib/market/mappers.ts](../../../lib/market/mappers.ts) to parse `clobTokenIds` from Gamma string payloads and preserve YES/NO token IDs in the market view model.
- Updated [lib/hooks/useMarketDirectBuyState.ts](../../../lib/hooks/useMarketDirectBuyState.ts) so token IDs are required only for live buys. Paper direct buys can execute again even when token IDs are absent.
- Updated [lib/hooks/useMarketBot.ts](../../../lib/hooks/useMarketBot.ts) and [components/dashboard/MarketClient.tsx](../../../components/dashboard/MarketClient.tsx) so Apply Plan passes an explicit runtime config into the first `runScan()` call, eliminating the stale-config window on the first automation pass.

## Mar 8, 2026 — Why nothing seemed to work

Confirmed blocker
- The current codebase assumes post-Feb-24 `market_trades` migrations exist in the target Supabase project, but the live error proves production is still serving an older schema cache. The clearest symptom is the direct-buy 500: `Could not find the 'entry_mode' column of 'market_trades' in the schema cache`.
- That means the previous UI-side fixes were not enough on their own. Even after token IDs, stale first-scan state, and automation thresholds were corrected, the server could still fail at the final insert/update step because [app/api/market/buy/route.ts](../../../app/api/market/buy/route.ts), [app/api/market/scan/route.ts](../../../app/api/market/scan/route.ts), and [lib/market/scheduler-run-user.ts](../../../lib/market/scheduler-run-user.ts) were all writing optional columns from newer migrations.
- The mismatch likely includes more than `entry_mode`. The repo adds `token_id` and `clob_order_id` in [supabase/migrations/20260305_market_enhancements.sql](../../../supabase/migrations/20260305_market_enhancements.sql), plus `take_profit_pct`, `stop_loss_pct`, and `entry_mode` in [supabase/migrations/20260306_market_robot_phase_1a_3b.sql](../../../supabase/migrations/20260306_market_robot_phase_1a_3b.sql), and `idempotency_key` in [supabase/migrations/20260306_market_trades_idempotency.sql](../../../supabase/migrations/20260306_market_trades_idempotency.sql). The deployed DB appears to be behind some or all of those.

Current fix applied in this pass
- Added [lib/market/trade-persistence.ts](../../../lib/market/trade-persistence.ts), a backward-compatible mutation helper that retries `market_trades` inserts and updates after stripping unsupported optional columns exposed by PostgREST schema-cache errors.
- Wired that helper into [app/api/market/buy/route.ts](../../../app/api/market/buy/route.ts) so direct paper buys, live fallbacks, pending live trade initialization, and CLOB failure updates no longer hard-fail when optional columns are missing.
- Wired the same helper into [app/api/market/scan/route.ts](../../../app/api/market/scan/route.ts) and [lib/market/scheduler-run-user.ts](../../../lib/market/scheduler-run-user.ts) so paper automation can still write simulated trades even when the target database has not received the latest `market_trades` migration set.
- Extended the same compatibility fix into the legacy trade write route [app/api/market/trades/route.ts](../../../app/api/market/trades/route.ts), so any older client path that still posts there will not bypass the schema fallback.
- Hardened [app/api/market/settle-trades/route.ts](../../../app/api/market/settle-trades/route.ts) to retry its initial `market_trades` read without `take_profit_pct` / `stop_loss_pct` when the deployed schema does not expose those newer columns. That keeps the Wallet & Performance settlement loop alive on older environments.
- Fixed the live CLOB payload contract in [lib/market/clob-api.ts](../../../lib/market/clob-api.ts) and [app/api/market/buy/route.ts](../../../app/api/market/buy/route.ts): live orders now submit share size instead of raw USDC spend as the CLOB `size` field.
- Added [scripts/ops/check-market-runtime.mjs](../../../scripts/ops/check-market-runtime.mjs) plus `npm run diag:market-runtime` to verify Supabase schema state and Market Robot env prerequisites against the configured project.
- Verified the route coverage with GitNexus/MCP tracing, confirmed the critical backend/runtime dependencies in [package.json](../../../package.json), and validated with `npm run typecheck` plus `npm run guard:clob-contract`.
- The new runtime diagnostic currently reports that core Supabase keys are present but live CLOB envs are missing locally (`POLYMARKET_API_KEY`, `POLYMARKET_API_SECRET`, `POLYMARKET_API_PASSPHRASE`, `NEXT_PUBLIC_POLYMARKET_SPENDER`), scheduler secret env is missing locally, and the configured Supabase project still lacks [market_activity_log](../../../supabase/migrations/20260306_market_robot_phase_1a_3b.sql#L23) and [market_scheduler_lock](../../../supabase/migrations/20260306_market_robot_phase_1a_3b.sql#L55).
- `npm run verify:release` still passes architecture guardrails, file-size regression, and typecheck; the remaining build-gate instability is the same environment-level `143` interruption already seen in prior Market Robot sessions, not a new Market-specific compile failure.
- Kept all touched production code files at or under the 300-line rule.

Next recommended follow-up
- Make `market_plans` the canonical server-side config and stop translating rich automation plans into legacy directives.
- Replace the auth-metadata stopgap with a first-class server table once `market_plans` lands, then migrate the scheduler off legacy directives entirely.
- Replace the cron-only loop with a queue or worker model if the goal is genuinely high-volume scheduled automation.

## Mar 8, 2026 — Next steps for the next chat

**UPDATE: The missing tables and configurations were applied directly to the production Supabase database via the Management API!**

1. `market_activity_log` table, RLS, and indexes were created.
2. `market_scheduler_lock` table was created and initialized.
3. Local `.env.local` keeps a scheduler secret for local scheduler verification.
4. Real Polymarket CLOB credentials are still required for actual live-mode execution; do not use dummy placeholders.

Runtime status now:
- paper-mode runtime prerequisites are repaired
- scheduler lock/log tables exist in the target Supabase project
- live mode still depends on valid `POLYMARKET_API_KEY`, `POLYMARKET_API_SECRET`, `POLYMARKET_API_PASSPHRASE`, and `NEXT_PUBLIC_POLYMARKET_SPENDER`

Next steps: verify paper buy, verify scheduler tick with the local secret, then supply real live CLOB credentials before validating live buys or resuming feature work (`market_plans`, Saved Markets, server-side pagination, then worker/queue design).

## Mar 8, 2026 — What was tried that did not solve it by itself

These changes improved correctness, but none of them alone fixed the broken-buy report.

- Token ID parsing and stale first-scan fixes from Mar 7 removed obvious UI blockers, but direct and automated trades still failed because the server write path hit the older `market_trades` schema.
- Lowering automation thresholds and improving bot/runtime sync increased the chance of generating candidates, but generated trades still could not persist when optional columns were missing in the deployed DB.
- Tightening access gates, wallet checks, and CLOB response validation improved safety, but did not address the underlying PostgREST schema-cache mismatch.
- Frontend-only verification was misleading because the root cause sat in final trade persistence and later in the live-order payload contract.

## Mar 8, 2026 — Backend, API, and dependency map

Critical execution paths
- Direct buy UI: [lib/hooks/useMarketDirectBuyState.ts](../../../lib/hooks/useMarketDirectBuyState.ts) -> [app/api/market/buy/route.ts](../../../app/api/market/buy/route.ts)
- Immediate automation: [components/dashboard/MarketClient.tsx](../../../components/dashboard/MarketClient.tsx) and [lib/hooks/useMarketBot.ts](../../../lib/hooks/useMarketBot.ts) -> [app/api/market/scan/route.ts](../../../app/api/market/scan/route.ts)
- Background automation: [app/api/market/scheduler/tick/route.ts](../../../app/api/market/scheduler/tick/route.ts) -> [lib/market/scheduler.ts](../../../lib/market/scheduler.ts) -> [lib/market/scheduler-run-user.ts](../../../lib/market/scheduler-run-user.ts)
- Settlement: [app/api/market/settle-trades/route.ts](../../../app/api/market/settle-trades/route.ts)
- Legacy write path still kept alive: [app/api/market/trades/route.ts](../../../app/api/market/trades/route.ts)

Critical DB tables
- `market_trades`
- `market_directives`
- `market_bot_runtime`
- `market_bot_runtime_state`
- `market_activity_log`
- `market_scheduler_lock`

Repo-side compatibility layer
- [lib/market/trade-persistence.ts](../../../lib/market/trade-persistence.ts) is now the compatibility boundary for older `market_trades` schemas. Reuse it for any new `market_trades` write path.

Verified dependency surface
- Runtime packages were rechecked in [package.json](../../../package.json): `@supabase/supabase-js`, `@supabase/ssr`, `@polymarket/clob-client`, `next`, `react`, `react-dom`
- Live-order payload contract is guarded by [scripts/ops/check-clob-contract.mjs](../../../scripts/ops/check-clob-contract.mjs)
- Runtime env/schema prerequisites are guarded by [scripts/ops/check-market-runtime.mjs](../../../scripts/ops/check-market-runtime.mjs)

## Mar 8, 2026 — MCP playbook for future Market work

Use MCPs before editing, not after damage is done.

- Use `GitNexus query` first when you need the real route or execution flow instead of guessing from filenames.
- Use `GitNexus context(<symbol>)` before changing a shared hook, runtime helper, or route handler.
- Use `GitNexus impact(<symbol>, upstream)` before refactors or signature changes to see what will break.
- Use `GitNexus detect_changes` before every push to confirm only intended files changed.
- Use MCP findings to narrow the blast radius, then confirm with direct file reads before patching.
- Do not use MCP output as a substitute for reading the current file contents. Use it to map pathways and risks.

## Mar 8, 2026 — Clean and scalable Market coding rules

- Keep the route stack stable: route page -> route shell -> thin orchestrator -> focused tab -> hook -> runtime/helper.
- Reuse [lib/market/trade-persistence.ts](../../../lib/market/trade-persistence.ts) for `market_trades` compatibility instead of duplicating schema-fallback logic.
- Keep new production `.ts` and `.tsx` files under 300 lines. Extract early instead of compressing late.
- Keep market runtime logic UI-agnostic and testable. UI components should not know Supabase schema details.
- Keep access control in server/auth helpers. Do not re-inline entitlement or scope checks inside tab components.
- Prefer additive API changes while the rebuild is still in flight. Do not break old client paths unless the replacement is fully migrated.
- Do not start new feature work while runtime env/schema diagnostics are failing. Fix execution prerequisites first.

## Non-Negotiables
- Route remains `/market`
- Gate remains internal-only via `canAccessMarket`
- `app/market/page.tsx` remains the gate + provider wrapper
- `components/dashboard/MarketClient.tsx` remains a thin orchestrator
- no new monoliths
- no parallel auth system
- API changes stay additive/backward compatible during rebuild
- bot/runtime logic stays UI-agnostic and testable
- keep files under 300 lines

## Architecture Rules For Reuse
Build Market so the same structure works later for other large tabs and standalone apps.

Shared large-tab rules
- route page = gate only
- route shell = header/chrome only
- orchestrator = state wiring only
- tab files = focused task surfaces only
- hooks = state/data only
- domain/runtime logic = UI-agnostic

Future app-ecosystem rules
- no market logic should depend on dashboard-home state
- no entitlement checks inside market UI components
- future standalone routes must reuse the same module internals
- future `org_feature_flags` support should be additive, not a rewrite
- PWA/native packaging should not require a second market codepath

## Checkpoints (Batched)

### Batch 1. Foundation Scaffold (~1 prompt — BLOCKING first step)
Goal: extract `MarketClient.tsx` to ≤ 200 lines, dedup types, replace primary nav with 6 task-tab stubs. No visible data or API change.

Safe because `MarketClient` has **zero external callers** outside `app/market/page.tsx` (GitNexus confirmed). Full rewrite of that one file is low blast-radius.

What to do
- Move `MarketTrade`, `BuyDirective` duplication from `MarketClient.tsx` into `components/dashboard/market/types.ts` (they already exist there — remove duplicates from client file)
- Extract Wagmi wallet state, buy state, and sim state into dedicated hooks under `lib/hooks/`
- Create `MarketPrimaryNav.tsx` with 6 tasks: Start Here / Direct Buy / Automation / Saved Markets / Results / Live Wallet
- Create 6 stub tab files under `components/dashboard/market/` — just a placeholder returning a heading each
- Rewire `MarketClient.tsx` to use the new nav and stubs; retire the old `MarketTabBar` import
- All 18 API routes and 4 domain hooks (`useMarketBot`, `useMarketTradeData`, `useMarketsExplorer`, `useMarketDirectives`) must remain untouched

Prompt
```text
Run GitNexus impact(MarketClient, downstream) and confirm zero external callers.

Then: extract MarketClient.tsx to under 200 lines by (1) removing duplicate type definitions already in types.ts, (2) extracting Wagmi/buy/sim state into dedicated hooks, (3) creating MarketPrimaryNav.tsx with 6 task tabs as stubs, (4) replacing the legacy MarketTabBar-driven activeTab with the new nav. do not touch any API routes or domain hooks. All existing tabs can remain as fallback until their batch replaces them.
```

Done when: `MarketClient.tsx` ≤ 200 lines, 6 task-tab stubs render without errors, `npx tsc --noEmit` passes.

### Batch 2. Shared Customization (~1–2 prompts)
Goal: replace `MarketTabBar`'s local customize drawer with shared header-driven layout prefs.

Target outputs: `lib/market/layout-presets.ts`, `lib/hooks/useMarketLayoutPrefs.ts`, customize entry in `MarketRouteShell.tsx`.

Prompt
```text
Implement shared market layout customization using the dashboard customization system. Replace the local MarketTabBar customize drawer. Store prefs via useMarketLayoutPrefs. Remove market-only localStorage key `market_tab_prefs_v1`. Keep the api/market/tab-prefs route alive for backward compat.
```

Done when: customize entry is in the shared market header, prefs survive reload.

### Batch 3. Start Here + Direct Buy (~2 prompts)
Goal: build the two most-used surfaces. They share the same `MarketListing` data shape so one hook serves both.

**Prompt 3a**
```text
Build MarketStartHereTab.tsx: practice vs real-money explainer, Recommended/Guided/Advanced entry paths, first-run stepper (2 steps), recent results snapshot, current bot status. Data comes from existing useMarketBot and useMarketTradeData hooks. No new API routes needed.
```

**Prompt 3b**
```text
Build MarketDirectBuyTab.tsx replacing MarketExplorerTab and MarketBuyPanel. Add MarketSearchToolbar.tsx and MarketAdvancedFiltersDrawer.tsx. Buy panel must show max loss, max payout, implied probability, and a plain-English what-if line before the confirm button. Reuse existing api/market/buy and api/market/book routes.
```

Done when: 2-click path from Start Here to a trade idea works; buy panel shows risk/payout before submission.

### Batch 4. Simulation + Automation (~2 prompts)
Goal: realistic practice mode and a saved-plan-based automation workflow.

**Prompt 4a — Simulation**
```text
Rebuild MarketSimCompareTab into a simulation panel inside the Start Here or Results tab. Add configurable starting balance, realistic vs ideal fills comparison, fee-aware trade testing, and saveable simulation snapshots. Do not break existing paper-trade flow.
```

**Prompt 4b — Automation**
```text
Build MarketAutomationTab.tsx, MarketAutomationBuilder.tsx, MarketPlanList.tsx. Replace directive-centric terminology with automation-plan language. Check Supabase MCP for a market_plans table — add a migration if none exists. Existing api/market/directives route stays alive during transition.
```

Done when: simulation snapshot is saveable; a plan can be created from a recommendation, saved, and toggled to run.

### Batch 5. Results + Live Wallet (~1 prompt)
Goal: split `MarketWalletPerformanceTab` into two distinct surfaces.

Prompt
```text
Split MarketWalletPerformanceTab into MarketResultsTab (P/L, activity log, trade replay, plan comparison) and MarketLiveWalletTab (connect, gas, readiness checklist, approval, blockers). Retire MarketWalletPerformanceTab after both pass verification.
```

Done when: P/L analytics and wallet readiness are on two separate tabs with no cross-contamination.

### Batch 6. Background Hardening (~1 prompt)
Goal: make browser-closed expectations accurate. No new UI — just label and separate state correctly.

Prompt
```text
Audit Market Robot UI state vs server-side scheduler state. Anywhere the UI shows "running" based only on client-side state, replace with a server-confirmed status indicator. Review api/market/scheduler/health and api/market/bot-status. Add clear UI distinction between local UI state and confirmed server runtime state.
```

Done when: UI never shows "robot running" without a confirmed server-side status response.

### Batch 7. Cleanup + Retirement (~1 prompt)
Goal: delete the legacy files now that all replacements are verified.

Prompt
```text
Retire the following legacy market files now that their replacements have passed verification: MarketDashboardTab.tsx, MarketHotOppsTab.tsx, MarketWhaleWatchTab.tsx, MarketWalletPerformanceTab.tsx, MarketSimCompareTab.tsx, MarketDirectivesTab.tsx, MarketDirectivesForm.tsx, MarketDirectivesList.tsx, MarketSimulationPanel.tsx, MarketAutomationStub.tsx, MarketResultsStub.tsx, MarketLiveWalletStub.tsx. Also retire orphaned hooks: useMarketSimState.ts, useMarketBuyState.ts. Update all imports. Confirm no TypeScript errors.
```

Done when: retired files deleted, `npx tsc --noEmit` passes, no import of retired files remains.


## Checks Before Every Batch Push
1. `npx tsc --noEmit`
2. `get_errors` on all touched files
3. line-count check on all touched files (300-line limit)
4. `GitNexus detect_changes` — confirm only expected files were modified
5. confirm `/market` still gates on `canAccessMarket`
6. confirm staff with `market` scope can access `/market`
7. confirm staff without `market` scope cannot
8. confirm CEO still sees all internal tabs
9. confirm mobile layout at 375px minimum for any new UI
10. confirm no entitlement logic re-inlined into market access

## Rebuild-From-Scratch Blueprint
Canonical route stack
1. `app/market/page.tsx` = gate + providers only
2. `components/dashboard/market/MarketRouteShell.tsx` = shell only
3. `components/dashboard/MarketClient.tsx` = orchestrator only
4. task tabs under `components/dashboard/market/`

Canonical split
- hooks own state/data orchestration
- tabs own task UX only
- shared UI pieces stay small and reusable
- runtime/execution logic stays outside large UI files

Standalone-app adaptation later
- keep same auth helpers
- add standalone route wrapper later, not a second module codepath
- merge feature flags via `org_feature_flags` when Phase 3 app ecosystem exists
- keep Market internals portable to PWA/Capacitor wrappers

## New-Chat Prompts

### Prompt A — Start of Batch (use when beginning any batch fresh)

Load files **in this order**. Stop loading after step 3 if you are already near the token limit.

1. `SLATE360_PROJECT_MEMORY.md`
2. `slate360-context/NEW_CHAT_HANDOFF_PROTOCOL.md`
3. `slate360-context/dashboard-tabs/market-robot/ONGOING_BUILD_TRACKER.md` ← find the active batch here
4. `slate360-context/BACKEND.md` — only if auth, DB, or API patterns are involved in this batch
5. `slate360-context/dashboard-tabs/market-robot/IMPLEMENTATION_PLAN.md` — only if the tracker's batch prompt does not give enough spec detail

After reading the tracker, identify the first batch that is not marked complete. That is the active batch.

**Before editing anything:**
- Run `GitNexus impact(MarketClient, downstream)` and confirm zero external callers outside `app/market/page.tsx`
- Read the current contents of every file you will touch
- State the batch name, every file you will touch, and your validation plan — then wait for confirmation before editing

**During the batch:**
- Follow the batch prompt in the tracker exactly as written
- Keep every new or modified file under 300 lines
- Do not touch any of the 18 `app/api/market/` routes

**Before ending the session (required):**
1. Run `npx tsc --noEmit` and `get_errors` on all touched files
2. Run `GitNexus detect_changes` — if unexpected files appear, flag them before pushing
3. Update this tracker:
   - Change the batch row in the summary table to `complete` or `in progress: [what remains]`
   - Add to Session Log: `YYYY-MM-DD: Batch N [name] — [complete / partially done: what remains]. Files changed: [list]. Next: Batch N+1.`
4. If tokens are running low before the batch is finished: stop editing, state exactly what was done, add a partial-status note to the Session Log, and tell the user to start a new chat using Prompt B below.

**Non-negotiables (no need to re-read upstream files for these):**
- Route: `/market` — do not change
- Gate: `canAccessMarket` from `resolveServerOrgContext()` — never `hasInternalAccess`
- Wrapper: `app/market/page.tsx` remains the provider + gate — do not inline logic here
- Orchestrator: `MarketClient.tsx` stays thin (≤ 200 lines after Batch 1)
- Types: do not redefine `MarketTrade` or `BuyDirective` — they live in `components/dashboard/market/types.ts`
- No `any` — use `unknown` + narrowing
- No entitlement checks inside market UI components
- No dashboard-home state dependencies in market components

---

### Prompt B — Mid-Session Continuation (use when picking up a partially-done batch)

```text
I'm mid-way through Market Robot Batch [N — fill in number and name from the tracker].

Read `slate360-context/dashboard-tabs/market-robot/ONGOING_BUILD_TRACKER.md` first. The Session Log entry for the last session will tell you exactly what was done and what remains.

Then read the current contents of the files listed in that Session Log entry.

State what is left in this batch before touching anything. Then continue from where the last session left off. Follow the same "Before ending the session" rules from the tracker when you are done or near the token limit.
```

## After Market Robot
Priority order
1. Dashboard / Project Hub refinements and additions
2. Design Studio

Carry-forward rule
- create the next tracker in this same format for Dashboard / Project Hub
- then create the next tracker in this same format for Design Studio

## Session Log
- 2026-03-06: Initial tracker created after CEO/internal-access groundwork.
- 2026-03-06: Tracker rewritten — phased prompts, push gates, app-ecosystem constraints, summary table, per-checkpoint done-when criteria added.
- 2026-03-06: Tracker restructured into 7 batches (~10 prompts total). GitNexus confirmed MarketClient has zero external callers, enabling larger safe batches. MCP guidance added per batch.
- 2026-03-06: Batch 1 (Foundation Scaffold) — complete. Files created: MarketPrimaryNav.tsx, 6 task-tab stubs, useMarketBuyState.ts, useMarketSimState.ts, useMarketWalletState.ts. MarketClient.tsx reduced to 84 lines. tsc clean. Next: Batch 2.
- 2026-03-06: Batch 2 (Shared Customization) — complete. Files created: lib/market/layout-presets.ts, lib/hooks/useMarketLayoutPrefs.ts, MarketCustomizeDrawer.tsx. MarketRouteShell wired to DashboardHeader onCustomizeOpen/prefsDirty. Legacy market_tab_prefs_v1 key auto-migrated to layoutprefs-market. Tab nav now prefs-driven. useMarketDirectives updated to use new tab IDs. tsc clean. Next: Batch 3.
- 2026-03-06: Batch 4 (Simulation + Automation) — complete. Files created: MarketSimulationPanel.tsx (226 lines), MarketAutomationTab.tsx (96 lines), MarketAutomationBuilder.tsx (300 lines), MarketPlanList.tsx (151 lines), useMarketAutomationState.ts (136 lines). Files modified: MarketClient.tsx (123→165 lines), useMarketSimState.ts (68→87 lines), types.ts (+SimulationConfig, +AutomationPlan, extended SimRun). MarketClient switch now renders Automation and Results (sim panel) directly. Supabase `market_plans` table not confirmed — plans use localStorage fallback. All files ≤300 lines, tsc clean. Next: Batch 5.
- 2026-03-06: Batch 5 (Results + Live Wallet) — complete. Files created: MarketResultsTab.tsx (247 lines), MarketLiveWalletTab.tsx (258 lines), useMarketResultsState.ts (170 lines). Files modified: MarketClient.tsx (165→171 lines — wired new tabs, added useMarketWalletState, removed useMarketSimState + MarketSimulationPanel imports), types.ts (164→189 lines — added ResultsAnalytics, TradeReplay). MarketSimulationPanel.tsx and useMarketSimState.ts are now orphaned (no importers) — add to Batch 7 retirement. All files ≤300 lines, tsc clean. Next: Batch 6.
- 2026-03-06: Batch 6 (Background Hardening) — complete. Files created: useMarketServerStatus.ts (109 lines — polls bot-status + scheduler/health every 30s, returns server-confirmed canonical status). Files modified: MarketClient.tsx (171→192 lines — replaced client-only StatusBadge with server-confirmed status, shows last run time + trades today from server), MarketStartHereTab.tsx (277→246 lines — bot status bar now shows server-confirmed state with explicit "server confirmed" labels, shows last error from scheduler, removed local botRunning/lastScan props), MarketSharedUi.tsx (added paused/stopped/unknown status colors to StatusBadge). All files ≤300 lines, tsc clean. Next: Batch 7.
- 2026-03-06: Batch 7 (Cleanup + Retirement) — complete. 22 legacy/orphaned files deleted: MarketDashboardTab, MarketHotOppsTab, MarketWhaleWatchTab, MarketWalletPerformanceTab, MarketSimCompareTab, MarketDirectivesTab, MarketDirectivesForm, MarketDirectivesList, MarketSimulationPanel, MarketAutomationStub, MarketResultsStub, MarketLiveWalletStub, useMarketSimState, useMarketBuyState, MarketExplorerTab, MarketFiltersPanel, MarketBotConfigPanel, MarketWalletCard, MarketActivityLog, MarketTabBar, MarketStartHereStub, MarketDirectBuyStub. tsc clean. Next: Batch 8.
- 2026-03-06: Batch 8 (Direct Buy UX Hardening) — complete. Files created: MarketAdvancedFilters.tsx (188 lines — extracted filter panel w/ 8 controls + HelpTip tooltips for edge, prob min/max, sort, category, risk tag, volume, liquidity, spread). Files modified: useMarketDirectBuyState.ts (197→222 lines — auto-load on mount via useEffect+useRef, limit 300→1000, added minVolume/minLiquidity/maxSpread states + filter logic, availableCategories derived from loaded markets), MarketDirectBuyTab.tsx (299→267 lines — replaced inline filters with MarketAdvancedFilters component, removed SORT_OPTIONS constant, replaced "Load all markets" with auto-load spinner, Search→Refresh label when loaded). All files ≤300 lines, tsc clean. Next: Batch 9+ (saved markets, market_plans migration, server-side pagination).
- 2026-03-06: Runtime review + hardening — complete. Files modified: MarketClient.tsx (removed eager directives load, fetches logs only on Results tab), MarketStartHereTab.tsx (moved localStorage init into useEffect to eliminate hydration mismatch / React 418), useMarketDirectBuyState.ts (cursor-batched Polymarket fetch to actually load up to 1000 markets; added loadError state), MarketDirectBuyTab.tsx (renders load error banner), app/api/market/directives/route.ts + app/api/market/logs/route.ts (GET now degrades to empty arrays when legacy tables are absent instead of returning 500). Verified: `npx tsc --noEmit` clean, changed files all <300 lines, deployed `/api/market/polymarket` paginates with `nextCursor`. Next: deploy and authenticated production verification.
- 2026-03-06: Automation transfer + logs polling hardening — complete. Files created: MarketAutomationDetailControls.tsx (139 lines), MarketNumericInput.tsx (61 lines), lib/market/sync-automation-plan.ts (41 lines). Files modified: MarketAutomationBuilder.tsx (300→214 lines — extracted detail controls and replaced spinner-only numeric entry for key automation fields), MarketAutomationTab.tsx (96→100 lines — active summary now shows trades/day and max positions), MarketClient.tsx (181→200 lines — applying a plan now transfers budget/max trades/day/max positions into runtime config and syncs the plan to legacy directives), useMarketBot.ts (runtime config enforces maxTradesPerDay for client-run scans), useMarketTradeData.ts (activity-log polling gated by Results tab), app/api/market/logs/route.ts (treats both `42P01` and `PGRST205` missing-table errors as empty logs). Verified: `npx tsc --noEmit` clean, touched files all within line limits. Next: push and production verify endpoint behavior, then authenticated browser verification.
- 2026-03-07: Access + live-buy hardening — complete. Files modified: lib/server/org-context.ts (CEO page now owner-only; market/athlete360 remain grantable by scope), components/dashboard/ceo/CeoStaffAddForm.tsx + CeoStaffPanel.tsx + app/api/ceo/staff/*.ts (grant flow defaults to market-only and no longer exposes CEO scope), components/dashboard/MarketClient.tsx + MarketDirectBuyTab.tsx + useMarketDirectBuyState.ts (direct buy now consumes real wallet state, validates live prerequisites, and sends wallet_address), app/api/market/buy/route.ts + lib/market/clob-api.ts (rejects CLOB success responses without an order id), primary `/api/market/*` routes now enforce `canAccessMarket`, and `scripts/ops/check-clob-contract.mjs` now validates the split buy-route/clob-helper implementation. Verified: `npx tsc --noEmit` clean, `npm run guard:clob-contract` pass. Next: authenticated browser verification of direct live buy, automation tick, and market-only access grants.
- 2026-03-06: **Bot activation + algorithm + runtime fixes** — complete. 12 fixes across 8 files resolving why the bot was not making trades.
  **lib/market-bot.ts:** (a) DEFAULT_CONFIG: riskLevel low→medium, maxDailyLoss 25→100, maxTradesPerScan 25→50, minOpportunityEdgePct 1→0.5, maxCandidates 200→500, portfolioMix rebalanced {low:40,med:40,high:20}; (b) fetchMarkets limit 50→200; (c) scoreOpportunities: added time-decay bonus (+10 for markets <7 days), probability-edge bonus (+8 near 50/50), reweighted scoring (vol 25%, liq 20%, edge 30%); (d) decideTrades confidence thresholds lowered from {low:60,medium:45,high:30} to {low:25,medium:15,high:5}; (e) removed 0.3 budget multiplier.
  **lib/hooks/useMarketBot.ts:** (a) added loadServerConfig() — fetches directives+bot-status on mount to hydrate from DB; (b) defaults: maxTradesPerDay 5→25, maxPositions 5→25, minEdge 3→1, minVolume 10000→5000, minProbLow 10→5, minProbHigh 90→95, focusAreas `all`; (c) presets updated: starter 25/day, balanced 50/day, active 200/day; (d) handleStartBot fixed to send "paper" status when paperMode=true.
  **lib/market/sync-automation-plan.ts:** complete rewrite — SyncResult with error details, ensureBotRunning() helper, error response parsing.
  **lib/market/scan-request.ts:** SCAN_DEFAULTS.maxPositions 5→25.
  **components/dashboard/MarketClient.tsx:** handleApplyPlan calls ensureBotRunning after sync, better error messages.
  **lib/market/scheduler.ts:** logs to market_activity_log when 0 decisions or guard-rule skip.
  **app/api/market/settle-trades/route.ts:** fetchGammaMarket returns {market, error}, 200ms rate-limit delay, added .eq("status","open") to all 3 update queries (race condition fix), Gamma error tracking.
  **lib/hooks/useMarketServerStatus.ts:** POLL_INTERVAL_MS 30000→10000.
  **components/dashboard/market/MarketBuyPanel.tsx:** buy amount cap raised from $500 to $5,000, added $500 and $1,000 quick-pick buttons.
  **components/dashboard/market/MarketStartHereTab.tsx:** recommendations now respect user mode selection (practice/real), added onApplyRecommendation prop + recommendationToPlan() converter, Apply button now sends plan data directly instead of just navigating. MarketClient wired to call handleApplyPlan + switch to results tab.
  Verified: `npx tsc --noEmit` clean.
- 2026-03-08: Runtime compatibility hardening — complete. Files created: [lib/market/trade-persistence.ts](../../../lib/market/trade-persistence.ts), [scripts/ops/check-market-runtime.mjs](../../../scripts/ops/check-market-runtime.mjs). Files modified: [app/api/market/buy/route.ts](../../../app/api/market/buy/route.ts), [app/api/market/scan/route.ts](../../../app/api/market/scan/route.ts), [lib/market/scheduler-run-user.ts](../../../lib/market/scheduler-run-user.ts), [app/api/market/trades/route.ts](../../../app/api/market/trades/route.ts), [app/api/market/settle-trades/route.ts](../../../app/api/market/settle-trades/route.ts), [lib/market/clob-api.ts](../../../lib/market/clob-api.ts), [scripts/ops/check-clob-contract.mjs](../../../scripts/ops/check-clob-contract.mjs), [package.json](../../../package.json), [PROJECT_RUNTIME_ISSUE_LEDGER.md](../../../PROJECT_RUNTIME_ISSUE_LEDGER.md). Result: `market_trades` writes now degrade safely on older schemas, settlement reads retry without newer optional columns, live CLOB orders submit share size instead of raw spend, and runtime env/schema checks are scripted. Verified: `npm run typecheck`, `npm run guard:clob-contract`, `npm run verify:release` (same environment-level `143` interruption only), `npm run diag:market-runtime`. Commit pushed: `96effc5` (`Harden market robot runtime compatibility`). Next: repair env/schema blockers, then run authenticated end-to-end Market verification before new feature work.

## Ready-To-Paste Prompt For Next Chat

Copy-paste this entire block into a new chat session to continue the Market Robot build:

```text
I'm continuing the Market Robot rebuild after the Mar 8 runtime compatibility hardening. Do not start new Market feature work until runtime prerequisites are verified.

## Read order
1. `SLATE360_PROJECT_MEMORY.md`
2. `slate360-context/NEW_CHAT_HANDOFF_PROTOCOL.md`
3. `slate360-context/dashboard-tabs/market-robot/ONGOING_BUILD_TRACKER.md`
4. `PROJECT_RUNTIME_ISSUE_LEDGER.md`
5. `slate360-context/dashboard-tabs/market-robot/IMPLEMENTATION_PLAN.md` — only after runtime blockers are clear

## Environment & tool access
- Do not assume `.env.local` is complete. Run `npm run diag:market-runtime` first.
- **Supabase dashboard**: https://supabase.com/dashboard/project/hadnfcenpcfaeclczsmm
- **Git**: you have push access to `main` — commit and push when done
- **Terminal**: `npm run diag:market-runtime`, `npm run typecheck`, `npm run guard:clob-contract`, `bash scripts/check-file-size.sh`, `wc -l`

## Current code state
- Batches 1–8 UI rebuild work is complete.
- Mar 8 hardened direct buy, immediate automation, scheduler, legacy trades, and settlement against older `market_trades` schemas.
- Live CLOB helper now sends `shares` as `size`; contract is guarded by `npm run guard:clob-contract`.
- Runtime prerequisite check now exists in `npm run diag:market-runtime`.

## Immediate blockers to verify or fix first
1. Run `npm run diag:market-runtime`.
2. If it fails, fix missing envs or missing DB objects before writing feature code.
3. Run authenticated verification for:
  - paper direct buy
  - live direct buy
  - Apply Plan immediate scan
  - scheduler tick
  - settlement
4. Only after that, continue with:
  - Saved Markets tab
  - `market_plans` table migration
  - server-side pagination
  - queue/worker design for high-volume automation

## MCP rules
- Use `GitNexus query` or `context` before editing any route, hook, or runtime helper.
- Use `GitNexus impact` before changing shared contracts.
- Use `GitNexus detect_changes` before pushing.
- Read the real file contents before editing; do not rely on MCP output alone.

## Non-negotiables
- Route: `/market` — do not change
- Gate: `canAccessMarket` — never `hasInternalAccess`
- `MarketClient.tsx` stays thin (≤ 200 lines)
- No `any` — use `unknown` + narrowing
- All files ≤ 300 lines
- Types in `components/dashboard/market/types.ts`
- Reuse `lib/market/trade-persistence.ts` for any new `market_trades` writes
- Do not start feature work while `npm run diag:market-runtime` is failing

## End-of-session requirements
1. Run `npm run typecheck`.
2. Run `get_errors` on touched files.
3. Run `GitNexus detect_changes`.
4. Update `ONGOING_BUILD_TRACKER.md` and `PROJECT_RUNTIME_ISSUE_LEDGER.md` if runtime behavior or blockers changed.
5. If runtime blockers remain, record them explicitly instead of burying them in feature notes.
```
