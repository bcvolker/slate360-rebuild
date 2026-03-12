# Market Robot Build File

Last Updated: 2026-03-12
Current Batch: Batch 3 - Automation rescue landed (local)
Status: Batch 3 frontend rescue landed locally. Automation now has beginner presets, explicit Save Draft vs Save + Start Robot vs Run Scan Now vs Stop/Halt semantics, visible runtime config-source truth (including fallback wording), advanced controls behind disclosure, and honest post-action messaging tied to server confirmation boundaries.

Continuation Note (2026-03-12): required preflight/read order was rerun in a fresh chat and GitNexus `detect_changes` was executed successfully. Terminal command execution remains blocked by `ENOPRO`, so `npm run typecheck` / `npx tsc --noEmit` could not be rerun from terminal in this session. No push was performed.

Continuation Note (2026-03-12, Vercel env diagnostic): read/verify-only env triage was run to validate the `NEXT_PUBLIC_POLYMARKET_SPENDER` blocker. This workspace remains terminal-blocked by `ENOPRO`, so live `vercel env ls` and `vercel env run` commands could not be rerun in-chat. Local Vercel link metadata confirms this repo is linked to `slate360-rebuild`, and the latest local Vercel env snapshot file (`.env.vercel.tmp`) still does not include `NEXT_PUBLIC_POLYMARKET_SPENDER`. If the variable was recently added in Vercel UI, production likely needs a fresh build deployment for `NEXT_PUBLIC_*` propagation.

Continuation Note (2026-03-12, Vercel env diagnostic follow-up): `vercel whoami`, `vercel env ls production`, and `vercel env ls preview` were successfully executed in a fresh chat before terminal degradation and all confirmed `NEXT_PUBLIC_POLYMARKET_SPENDER` is present in Vercel env scopes (`Production, Preview, Development`). The same chat then hit `ENOPRO` on `vercel env pull --environment=production --yes`, and `vercel env run -e production -- npm run diag:market-runtime` could not be executed afterward. Local artifacts at chat end still show no `NEXT_PUBLIC_POLYMARKET_SPENDER` in `.env.vercel.tmp` or `.env.local`, so the highest-confidence next step is a production redeploy to force `NEXT_PUBLIC_*` client build propagation, then rerun pull and production env-run diagnostics.

## Batch 3 Outcome — 2026-03-12
- Status: complete (local changes only; push blocked)
- Files changed:
	- `components/dashboard/market/MarketAutomationTab.tsx`
	- `components/dashboard/market/MarketAutomationBuilder.tsx`
	- `components/dashboard/market/MarketPlanList.tsx`
	- `lib/hooks/useMarketAutomationState.ts`
	- `lib/market/automation-presets.ts`
- What changed:
	- Added three explicit beginner preset entry paths in the builder: Conservative, Balanced, Aggressive.
	- Presets are frontend-only mapping sugar over existing plan fields; backend plan/API contracts are unchanged.
	- Preset match is visible in both builder (`Preset currently matched`) and saved plan cards (`Preset: ...`).
	- Clarified and renamed primary actions to: Save Draft, Save + Start Robot, Run Scan Now, Stop / Halt.
	- Added explicit action-meaning copy so beginners can distinguish config-save actions from runtime actions.
	- Added post-action feedback banners in Automation tab with honest wording about server confirmation boundaries.
	- Save result now distinguishes server-persisted vs local-fallback save and surfaces that truth in UI copy.
	- Active automation summary now highlights config source from system status and explicitly warns when runtime is using fallback sources (`market_directives`, runtime metadata overlays).
	- Runtime heading now keys off server status for running/not-running wording instead of implying local save state equals active runtime.
	- Advanced controls are preserved but hidden behind an explicit disclosure toggle.
- What was intentionally not changed:
	- No `app/api/market/*` route was edited.
	- No runtime-config resolution logic was changed.
	- No scheduler logic was changed.
	- No summary endpoint logic was changed.
	- No backend contract/API envelope was changed.
	- No UI copy claims real live automation exists end-to-end.
- Validation and command notes:
	- Attempted preflight `npm run typecheck`: blocked by `ENOPRO`.
	- Attempted required validation `npx tsc --noEmit`: blocked by `ENOPRO`.
	- Ran GitNexus `detect_changes` before and after edits.
	- Ran editor diagnostics (`get_errors`) on changed files: no errors reported.
	- Repo was not clean before editing (pre-existing modified files present).
	- Commit/push not performed due terminal `ENOPRO` blocker.
- Visible UI things to verify right now:
	- Automation builder shows Conservative/Balanced/Aggressive preset cards and updates plan fields.
	- Actions read exactly as Save Draft, Save + Start Robot, Run Scan Now, Stop / Halt with plain-English meanings.
	- Active automation summary shows config source label and explicit fallback warning when source is not `market_plans`.
	- Save Draft feedback differentiates server-persisted save from local fallback save.
	- Advanced settings remain available only after opening the disclosure.
	- Results, saved plans, automation status surfaces, and readiness entry points remain reachable.
- Blockers for Batch 4:
	- Terminal command execution still blocked by `ENOPRO` for CLI validation and git push from this session.
	- Runtime truth remains split across canonical and compatibility sources until backend unification work (out of scope for Batch 3).
	- `NEXT_PUBLIC_POLYMARKET_SPENDER` remains a live readiness blocker.

## Batch 2 Outcome — 2026-03-12
- Status: complete
- Files changed:
	- `components/dashboard/market/MarketDirectBuyTab.tsx`
	- `components/dashboard/market/MarketDirectBuyResults.tsx`
	- `components/dashboard/market/MarketListingDetailDrawer.tsx`
	- `lib/hooks/useMarketDirectBuyState.ts`
- What changed:
	- Markets search workflow now surfaces current keyword, active sort, active filters, loaded market set count, visible result count, and fetch-source context in one place.
	- Search copy is explicit that matching remains lexical keyword-based (not semantic).
	- Results moved from loose cards to a compact scrollable table with clearer columns (YES, NO, implied probability, edge, volume, resolution time) and sortable controls.
	- Clicking a market row opens a cleaner detail drawer with title, YES/NO pricing, implied probability, practice/live mode indication, save/watchlist action, and a wallet impact preview (ticket size, max loss, potential payout, potential profit).
	- Detail drawer can route directly into the buy ticket with the previewed amount.
	- Post-buy refresh behavior is preserved via existing `onTradePlaced` flow.
- What was intentionally not changed:
	- No `app/api/market/*` route was edited.
	- No runtime-config resolution, scheduler logic, or automation save/apply logic was changed.
	- No backend contract or API envelope was changed.
	- No live automation claim was introduced.
- Visible UI things to verify right now:
	- Markets tab shows transparent search status chips (keyword/sort/filters/source/load-size).
	- Results table is compact and scrollable with credible trading columns and quick YES/NO actions.
	- Clicking any result row opens the detail drawer.
	- Detail drawer shows mode indication plus wallet impact preview and can open the buy ticket with that amount.
	- Saved Markets / watchlist remains reachable within Markets.
	- Practice buy still shows truthful fallback-aware feedback and routes into refreshed Results.
- Remaining blockers for Batch 3:
	- Automation save/apply truth and runtime clarity still need a dedicated pass.
	- Results/wallet/readiness still need tighter unification after automation rescue.
	- `NEXT_PUBLIC_POLYMARKET_SPENDER` remains a concrete live blocker.

## Batch 1 Outcome — 2026-03-12
- Status: complete
- Files changed:
	- `components/dashboard/MarketClient.tsx`
	- `components/dashboard/market/MarketDashboardSection.tsx`
	- `components/dashboard/market/MarketMarketsSection.tsx`
	- `components/dashboard/market/MarketPrimaryNav.tsx`
	- `components/dashboard/market/MarketRouteShell.tsx`
	- `components/dashboard/market/MarketTopOverview.tsx`
	- `components/dashboard/market/MarketBuyPanel.tsx`
	- `lib/hooks/useMarketDirectBuyState.ts`
	- `lib/market/direct-buy-feedback.ts`
	- `lib/market/layout-presets.ts`
- What changed:
	- Visible IA now shows exactly four primary sections: Dashboard, Markets, Automation, Results.
	- Saved Markets / watchlist is re-homed inside Markets.
	- Wallet / live readiness is reachable from Dashboard via an explicit wallet-readiness disclosure.
	- Results continues to contain open positions and history.
	- The top overview no longer uses local optimistic bot config for visible status claims; it reads from `market_trades`, `useMarketServerStatus()`, and `useMarketSystemStatus()` only.
	- Manual buy flow now surfaces `paper_fallback`, `clob_error`, `clob_invalid_success`, and `clob_network_error` as an explicit warning: `Live execution blocked. Executed as Paper Trade.`
	- Post-buy refresh wiring now refreshes trades, scheduler health, activity logs, bot-status, and system-status before routing the user to Results.
- What was intentionally not changed:
	- No `app/api/market/*` route was edited.
	- No runtime-config resolution logic was changed.
	- No scheduler logic was changed.
	- `/api/market/summary` was not promoted to a canonical truth surface.
	- No claim of real live automation was introduced.
- Visible UI things to verify right now:
	- `/market` opens with a dark terminal shell and exactly 4 primary nav items.
	- Dashboard shows config source, blockers, last known runtime, and open positions without relying on local bot config.
	- Markets still exposes browsing plus the re-homed Saved Markets list.
	- Dashboard still exposes wallet/live readiness.
	- A live-buy fallback response shows the explicit paper-trade warning instead of a generic success.
- Remaining blockers for Batch 2:
	- Search quality is still lexical-only.
	- Results and wallet are reachable, but they are not yet unified into a tighter truth surface.
	- Automation save/apply still has optimistic local behavior.
	- `NEXT_PUBLIC_POLYMARKET_SPENDER` is still the concrete live blocker from diagnostics.

## Canonical Constraints
- Access model is repo-aligned to `resolveServerOrgContext().canAccessMarket` in [app/market/page.tsx](../../app/market/page.tsx).
- The rescue target is a controlled rebuild of the existing Market Robot, not a ground-up rewrite.
- `market_plans` is the long-term canonical automation source. `market_directives` and `user_metadata.marketBotConfig` remain compatibility fallback only.
- Do not remove `withMarketAuth()` or `resolveServerOrgContext()` protections from Market routes.
- Do not change request or response envelopes for `/api/market/buy`, `/api/market/plans`, `/api/market/scan`, `/api/market/bot-status`, `/api/market/system-status`, `/api/market/trades`, `/api/market/scheduler/health`, or `/api/market/scheduler/tick` during the rescue unless a batch explicitly authorizes it.
- Early rescue work is frontend-first. Small backend truth patches are allowed only to expose truthful status, block misleading behavior, or align server summaries with actual runtime behavior.
- The UI must never claim a live buy occurred if the backend returned `paper_fallback`, `clob_error`, `clob_invalid_success`, or `clob_network_error` from [app/api/market/buy/route.ts](../../app/api/market/buy/route.ts).
- The UI must never imply that a saved plan is running unless server-confirmed runtime state from `market_bot_runtime` and `market_bot_runtime_state` agrees.
- Any IA or tab changes must preserve reachability of current functionality and preserve compatibility with [lib/market/layout-presets.ts](../../lib/market/layout-presets.ts) and [lib/hooks/useMarketLayoutPrefs.ts](../../lib/hooks/useMarketLayoutPrefs.ts).
- Do not mix this rescue with Phase 2 strategy upgrades like EV scoring, Kelly sizing, weather/reference-data modules, websocket-first signal upgrades, or scaling work.

## Current Architecture Map

### Route shell
- Entry route: [app/market/page.tsx](../../app/market/page.tsx)
- Provider boundary: [app/market/MarketProviders.tsx](../../app/market/MarketProviders.tsx)
- Layout shell and customization entry: [components/dashboard/market/MarketRouteShell.tsx](../../components/dashboard/market/MarketRouteShell.tsx)
- Main orchestrator: [components/dashboard/MarketClient.tsx](../../components/dashboard/MarketClient.tsx)

### Primary UI surfaces
- Nav: [components/dashboard/market/MarketPrimaryNav.tsx](../../components/dashboard/market/MarketPrimaryNav.tsx)
- Dashboard section: [components/dashboard/market/MarketDashboardSection.tsx](../../components/dashboard/market/MarketDashboardSection.tsx)
- Markets section: [components/dashboard/market/MarketMarketsSection.tsx](../../components/dashboard/market/MarketMarketsSection.tsx)
- Overview: [components/dashboard/market/MarketTopOverview.tsx](../../components/dashboard/market/MarketTopOverview.tsx)
- Direct buy: [components/dashboard/market/MarketDirectBuyTab.tsx](../../components/dashboard/market/MarketDirectBuyTab.tsx)
- Automation: [components/dashboard/market/MarketAutomationTab.tsx](../../components/dashboard/market/MarketAutomationTab.tsx)
- Results: [components/dashboard/market/MarketResultsTab.tsx](../../components/dashboard/market/MarketResultsTab.tsx)
- Wallet: [components/dashboard/market/MarketLiveWalletTab.tsx](../../components/dashboard/market/MarketLiveWalletTab.tsx)

### Hook layer
- Trade/result loading: [lib/hooks/useMarketTradeData.ts](../../lib/hooks/useMarketTradeData.ts)
- Bot config and scan runner: [lib/hooks/useMarketBot.ts](../../lib/hooks/useMarketBot.ts)
- Layout prefs: [lib/hooks/useMarketLayoutPrefs.ts](../../lib/hooks/useMarketLayoutPrefs.ts)
- Direct buy state: [lib/hooks/useMarketDirectBuyState.ts](../../lib/hooks/useMarketDirectBuyState.ts)
- Automation plans: [lib/hooks/useMarketAutomationState.ts](../../lib/hooks/useMarketAutomationState.ts)
- System status: [lib/hooks/useMarketSystemStatus.ts](../../lib/hooks/useMarketSystemStatus.ts)
- Server status badge: [lib/hooks/useMarketServerStatus.ts](../../lib/hooks/useMarketServerStatus.ts)
- Wallet readiness: [lib/hooks/useMarketWalletState.ts](../../lib/hooks/useMarketWalletState.ts)

### Server truth surfaces
- Plans: [app/api/market/plans/route.ts](../../app/api/market/plans/route.ts)
- Runtime status: [app/api/market/bot-status/route.ts](../../app/api/market/bot-status/route.ts)
- System truth and blockers: [app/api/market/system-status/route.ts](../../app/api/market/system-status/route.ts)
- Scan execution: [app/api/market/scan/route.ts](../../app/api/market/scan/route.ts)
- Direct buy: [app/api/market/buy/route.ts](../../app/api/market/buy/route.ts)
- Summary cards: [app/api/market/summary/route.ts](../../app/api/market/summary/route.ts)
- Trades and history: [app/api/market/trades/route.ts](../../app/api/market/trades/route.ts), [app/api/market/logs/route.ts](../../app/api/market/logs/route.ts)
- Scheduler health and tick: [app/api/market/scheduler/health/route.ts](../../app/api/market/scheduler/health/route.ts), [app/api/market/scheduler/tick/route.ts](../../app/api/market/scheduler/tick/route.ts)

## Source-Of-Truth Map

### Plans
- Intended canonical store: `market_plans` via [app/api/market/plans/route.ts](../../app/api/market/plans/route.ts)
- Client plan editor: [lib/hooks/useMarketAutomationState.ts](../../lib/hooks/useMarketAutomationState.ts)
- Split truth still present: `slate360_automation_plans` localStorage is used optimistically and can diverge if server save fails.

### Active runtime
- Runtime status store: `market_bot_runtime`
- Runtime counters and last-run info: `market_bot_runtime_state`
- Runtime config resolution: [lib/market/runtime-config.ts](../../lib/market/runtime-config.ts)
- Current read order in scan/scheduler: plan first, else directive, with metadata overlay.
- Split truth still present across `market_plans`, `market_directives`, `user_metadata.marketBotConfig`, and in-memory hook state.

### Search state
- Client query, filters, selected market, and buy form state live in [lib/hooks/useMarketDirectBuyState.ts](../../lib/hooks/useMarketDirectBuyState.ts)
- Fetch strategy is controlled by [lib/market/direct-buy-fetch.ts](../../lib/market/direct-buy-fetch.ts)
- Upstream market data comes from Gamma through [app/api/market/polymarket/route.ts](../../app/api/market/polymarket/route.ts)
- Final filtering and sort order are client-side in [lib/market/direct-buy-table.ts](../../lib/market/direct-buy-table.ts)

### Results / open positions
- Durable trade source: `market_trades`
- Trade/result hook: [lib/hooks/useMarketTradeData.ts](../../lib/hooks/useMarketTradeData.ts)
- Results analytics are derived client-side from fetched trades.
- Summary endpoint exists, but [app/api/market/summary/route.ts](../../app/api/market/summary/route.ts) still derives mode and starting balance from metadata/directives rather than `market_plans`.
- Top overview in [components/dashboard/market/MarketTopOverview.tsx](../../components/dashboard/market/MarketTopOverview.tsx) now limits itself to trade rows plus server/system status. It no longer surfaces local optimistic bot config values as truth.

### Wallet / live readiness
- Wallet connection and approval UI state: [lib/hooks/useMarketWalletState.ts](../../lib/hooks/useMarketWalletState.ts)
- Server blocker truth: [app/api/market/system-status/route.ts](../../app/api/market/system-status/route.ts)
- Live order path: [app/api/market/buy/route.ts](../../app/api/market/buy/route.ts)
- Split truth still present because the wallet tab uses client checklist state while system-status separately reports env/runtime blockers.

## Known Broken States

### 1. Direct buy success can misrepresent fallback execution
- Symptom: user can request a live buy and still see a generic success message that reflects requested mode, not actual backend mode.
- Root cause: [lib/hooks/useMarketDirectBuyState.ts](../../lib/hooks/useMarketDirectBuyState.ts) only checks `res.ok` and composes its own success text, while [app/api/market/buy/route.ts](../../app/api/market/buy/route.ts) can return `mode: "paper_fallback"` or other non-live outcomes.
- Severity: critical
- Ownership: split

### 2. Automation save/apply is optimistic before server truth is proven
- Symptom: Save Draft or Save + Start Robot can appear successful even if server persistence failed or fell back.
- Root cause: [lib/hooks/useMarketAutomationState.ts](../../lib/hooks/useMarketAutomationState.ts) updates local state and localStorage before server confirmation, then returns optimistic data when save fails.
- Severity: high
- Ownership: split

### 3. Overview cards are not server-grounded enough for trust-sensitive claims
- Symptom: automation overview can say running or show budget values based on local hook state rather than canonical server runtime.
- Root cause: [components/dashboard/market/MarketTopOverview.tsx](../../components/dashboard/market/MarketTopOverview.tsx) consumes local `bot.config`, and [components/dashboard/MarketClient.tsx](../../components/dashboard/MarketClient.tsx) updates that config before server confirmation.
- Severity: high
- Ownership: frontend

### 4. Summary endpoint is not aligned to the canonical plan source
- Symptom: dashboard/result summaries can disagree with automation state or plan state.
- Root cause: [app/api/market/summary/route.ts](../../app/api/market/summary/route.ts) still reads `market_directives` and `user_metadata.marketBotConfig` for mode and starting balance instead of preferring `market_plans`.
- Severity: high
- Ownership: backend

### 5. Live automation is not actually implemented in scan execution
- Symptom: live-ready automation can be implied by UI, but the scan route only inserts simulated paper trades.
- Root cause: [app/api/market/scan/route.ts](../../app/api/market/scan/route.ts) executes only inside the paper branch and has no real order placement path.
- Severity: high
- Ownership: backend

### 6. Tab preferences are written to the server but not read back by the client
- Symptom: tab layout may not persist cross-device or cross-session despite a server endpoint existing.
- Root cause: [lib/hooks/useMarketLayoutPrefs.ts](../../lib/hooks/useMarketLayoutPrefs.ts) loads from localStorage only, while [app/api/market/tab-prefs/route.ts](../../app/api/market/tab-prefs/route.ts) is write-capable and read-capable but its GET path is unused.
- Severity: medium
- Ownership: frontend

### 7. Search quality is still lexical, not semantic or historically informed
- Symptom: search feels shallow and browse relevance depends heavily on exact words and current Gamma payload shape.
- Root cause: [app/api/market/polymarket/route.ts](../../app/api/market/polymarket/route.ts) and [lib/market/direct-buy-table.ts](../../lib/market/direct-buy-table.ts) use term expansion and substring matching only.
- Severity: medium
- Ownership: frontend

### 8. Watchlist and saved-market functionality is real, but it is not prominent in the current IA
- Symptom: save/bookmark exists yet is easy to lose during tab simplification.
- Root cause: current feature is split across [lib/hooks/useMarketWatchlist.ts](../../lib/hooks/useMarketWatchlist.ts), [app/api/market/watchlist/route.ts](../../app/api/market/watchlist/route.ts), and saved market tabs/components.
- Severity: medium
- Ownership: frontend

## Env / Config Blockers
- Confirmed by `npm run diag:market-runtime`: `NEXT_PUBLIC_POLYMARKET_SPENDER` is the current failing live blocker.
- The same diagnostic confirms local repo/runtime visibility for `POLYMARKET_API_KEY`, `POLYMARKET_API_SECRET`, `POLYMARKET_API_PASSPHRASE`, and one of `MARKET_SCHEDULER_SECRET` or `CRON_SECRET`.
- Raw shell `printenv` checks in this dev container do not show those values, so env availability is repo-runtime or dotenv loaded rather than inherited into the shell session. Treat shell visibility as partial, not authoritative.
- Scheduler cron is wired in [vercel.json](../../vercel.json) to `/api/market/scheduler/tick` every 5 minutes.
- Scheduler execution also depends on `MARKET_SCHEDULER_SECRET` or `CRON_SECRET` matching the request headers used by Vercel cron.
- Live wallet approval also depends on a correct spender address, not just a present one.

## Tool Access Status
- Git: confirmed usable
- GitHub CLI: installed and authenticated
- Vercel CLI: installed and authenticated
- Supabase CLI: not installed in this container
- AWS CLI: not installed in this container
- `kubectl`: installed, authentication not verified during this pass
- GitNexus: confirmed usable and indexed for this repo
- `npm run diag:market-runtime`: confirmed usable; failed only on spender env
- `npm run typecheck`: confirmed usable; no type errors surfaced during this pass
- `rg`: not installed in this container; use workspace search tools instead

## Safe Refactor Boundaries

### Safe to replace first
- [components/dashboard/market/MarketPrimaryNav.tsx](../../components/dashboard/market/MarketPrimaryNav.tsx)
- [components/dashboard/market/MarketRouteShell.tsx](../../components/dashboard/market/MarketRouteShell.tsx)
- [components/dashboard/market/MarketTopOverview.tsx](../../components/dashboard/market/MarketTopOverview.tsx)
- Presentation-only portions of [components/dashboard/market/MarketDirectBuyTab.tsx](../../components/dashboard/market/MarketDirectBuyTab.tsx), [components/dashboard/market/MarketAutomationTab.tsx](../../components/dashboard/market/MarketAutomationTab.tsx), and [components/dashboard/market/MarketResultsTab.tsx](../../components/dashboard/market/MarketResultsTab.tsx)

### Safe to restyle first
- Empty states, banners, cards, disclosures, tab grouping, drawer shells, and explanatory copy
- Beginner-first presets and Advanced disclosures, as long as existing fields and handlers are preserved

### Preserve carefully
- [components/dashboard/MarketClient.tsx](../../components/dashboard/MarketClient.tsx)
- [lib/hooks/useMarketBot.ts](../../lib/hooks/useMarketBot.ts)
- [lib/hooks/useMarketAutomationState.ts](../../lib/hooks/useMarketAutomationState.ts)
- [lib/hooks/useMarketDirectBuyState.ts](../../lib/hooks/useMarketDirectBuyState.ts)
- [app/api/market/buy/route.ts](../../app/api/market/buy/route.ts)
- [app/api/market/scan/route.ts](../../app/api/market/scan/route.ts)
- [app/api/market/plans/route.ts](../../app/api/market/plans/route.ts)
- [app/api/market/system-status/route.ts](../../app/api/market/system-status/route.ts)
- [app/api/market/scheduler/tick/route.ts](../../app/api/market/scheduler/tick/route.ts)

### Contracts not to change in rescue phase
- `POST /api/market/buy`
- `POST /api/market/scan`
- `GET|POST|PATCH|DELETE /api/market/plans`
- `GET|POST /api/market/bot-status`
- `GET /api/market/system-status`
- `GET /api/market/trades`
- `GET /api/market/summary`
- `GET /api/market/scheduler/health`
- `POST /api/market/scheduler/tick`

## Planned Batch Sequence

### Batch 0 - Analysis only
- Repo audit
- Tool and env verification
- Build-file creation
- Prompt preflight

### Batch 1 - Shell + truthfulness pass
- Four primary sections: Dashboard, Markets, Automation, Results
- Dark terminal-style shell and re-homed legacy access points
- Explicit runtime source and blocker visibility
- Do not promise live execution or running state unless server-confirmed

### Batch 2 - Markets / search rescue
- Search, browse, sort, filter, detail drawer, save/watchlist, impact preview, post-buy refresh

### Batch 3 - Automation rescue
- Beginner presets
- Save vs Apply vs Running clarity
- Current config source visibility
- Run scan now
- Kill switch
- Advanced controls behind disclosure

### Batch 4 - Results + wallet/readiness integration
- Unify positions, history, wallet snapshot, readiness blockers, and post-action refresh

### Batch 5 - Small backend truth patch if still needed
- Only truthful status, summary, save/apply integrity, or misleading behavior blockers
- No redesign

### Batch 6 - Cleanup / stabilization
- Dead UI removal
- Import cleanup
- Obvious duplication cleanup
- Final verification and docs update

## Batch Guardrails
- One batch per prompt.
- Every batch prompt must list exact files allowed to change and exact files/contracts forbidden to change.
- Every batch prompt must require: files changed, what changed, what was intentionally not changed, remaining blockers, commands run, whether typecheck passed, and manual verification steps.
- Every batch must update this build file plus the prompt backlog if the plan shifts.
- No cross-batch cleanup work.
- No Phase 2 upgrades mixed into rescue batches.
- Prefer existing hooks/utilities over creating new duplicate state managers.
- If a batch cannot be completed safely, stop and document why instead of partially landing a risky half-fix.
- New rule added in this pass: any batch that changes user-facing status, success banners, summary cards, or automation state must name the exact server truth surface those claims rely on.
- New rule added in this pass: any batch that re-homes a tab must prove that watchlist, results, wallet readiness, and saved-plan flows remain reachable before closing the batch.

## Manual Verification Checklist
- Access gate: authorized user reaches `/market`; unauthorized user does not.
- IA reachability: every surviving legacy function is reachable from the new four-section shell.
- Search: query, timeframe, and filters all change the result set in understandable ways.
- Detail flow: row click opens drawer and preserves the ability to buy or save.
- Practice buy: trade is persisted, success banner is truthful, and Results refreshes.
- Live buy with blocker: UI clearly states fallback or blocker and does not imply success.
- Save only: saved plan appears in the plan list and server config source reflects it.
- Save + apply/start: server runtime changes, scan runs, banner appears, Results refreshes.
- Run scan now: no false success when no trades are placed.
- Results: open positions, history, and summary surfaces do not contradict each other.
- Wallet readiness: client checklist and system-status blockers tell the same story.
- Scheduler: health endpoint and cron secret wiring remain intact after rescue changes.

## Next Recommended Batch
- Batch 1 should proceed, but with a narrower definition than originally stated.
- It should focus on shell, IA, re-homing, truth banners, config-source visibility, and server-grounded overview values that can already be derived from `market_trades`, `market_bot_runtime`, `market_bot_runtime_state`, and `system-status` without changing API contracts.
- It should not attempt to make automation or summary fully canonical if that would require summary/runtime backend changes in the same prompt.

## Rollback Notes
- Batch 1 rollback target: revert shell/nav/overview presentation only; do not touch API route contracts.
- Batch 2 rollback target: revert drawer/save/watchlist/search UI without changing `/api/market/buy` or `/api/market/watchlist` contracts.
- Batch 3 rollback target: revert presets/disclosures/labels while preserving plan CRUD and runtime endpoints.
- Batch 4 rollback target: revert results aggregation UI and wallet-readiness display without altering buy or approval flows.
- Batch 5 rollback target: revert only the small truth patch and leave frontend messaging conservative until the server patch is corrected.

## Latest Summary
- `/market` route shell and gate are correctly wired through `canAccessMarket` and `MarketProviders`.
- The biggest current trust failures are not blank-page issues anymore. They are truth-model issues: split config sources, optimistic local state, and UI success text that can outrun backend reality.
- Search and browse are functional but lexical-only, with fetch strategy and final filtering split between the server proxy and client filtering.
- Direct buy persists paper trades correctly and has real fallback handling in the backend, but the frontend does not surface fallback truth well enough.
- Automation still reads from mixed sources and can return optimistic success states before server truth is proven.
- Wallet/live readiness is partially solid: checklist wiring exists, system-status blockers exist, and the confirmed blocking env is `NEXT_PUBLIC_POLYMARKET_SPENDER`.
- Scheduler infrastructure is present, secret-gated, and cron-wired. The local diagnostic passed everything except the spender env.
