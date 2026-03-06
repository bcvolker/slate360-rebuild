# Market Robot — Ongoing Build Tracker

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

## Current Build Status
**Active batch: 7 — Cleanup + retirement**

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
| 7 | Cleanup + retirement | 1 | **Sonnet** | legacy tab files retired |
| 8 | Direct Buy UX hardening | 1–2 | **Sonnet** | auto-load markets, missing filters, filter explainers, full-catalog search |
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
- scoped internal access exists for `ceo`, `market`, and `athlete360`
- `/market` gates on `canAccessMarket`
- shared header and quick-nav respect scoped internal visibility
- Project Hub duplicate portfolio snapshot was removed and the surviving snapshot is interactive

Current Market files in play
- `app/market/page.tsx`
- `components/dashboard/MarketClient.tsx` (192 lines — orchestrator, switch-renders tabs with shared props, server-confirmed status in header)
- `components/dashboard/market/MarketRouteShell.tsx` (63 lines — shell + customize integration)
- `components/dashboard/market/MarketPrimaryNav.tsx` (51 lines — prefs-driven nav)
- `components/dashboard/market/MarketCustomizeDrawer.tsx` (135 lines — shared customize drawer)
- `components/dashboard/market/MarketStartHereTab.tsx` (246 lines — **Batch 3 built, Batch 6 updated**: mode picker, 6 recommendation presets, first-run banner, YES/NO explainer, navigation to other tabs, **server-confirmed bot status bar**)
- `components/dashboard/market/MarketDirectBuyTab.tsx` (299 lines — **Batch 3 built**: search toolbar, timeframe chips, advanced filters, market table w/ YES/NO buy buttons, buy panel drawer)
- `components/dashboard/market/MarketAutomationTab.tsx` (96 lines — **Batch 4 built**: orchestrates builder + plan list + active plan summary)
- `components/dashboard/market/MarketAutomationBuilder.tsx` (300 lines — **Batch 4 built**: guided plan creation with basic/intermediate/advanced control levels)
- `components/dashboard/market/MarketPlanList.tsx` (151 lines — **Batch 4 built**: saved plans with apply/edit/clone/rename/archive/default/delete)
- `components/dashboard/market/MarketSimulationPanel.tsx` (226 lines — **Batch 4 built**: configurable sim settings, snapshot save, comparison chart, sim labels)
- `components/dashboard/market/MarketAutomationStub.tsx` (stub — replaced by MarketAutomationTab, can be retired in Batch 7)
- `components/dashboard/market/MarketSavedMarketsStub.tsx` (stub — future)
- `components/dashboard/market/MarketResultsStub.tsx` (stub — replaced by MarketResultsTab, can be retired in Batch 7)
- `components/dashboard/market/MarketLiveWalletStub.tsx` (stub — replaced by MarketLiveWalletTab, can be retired in Batch 7)
- `components/dashboard/market/MarketResultsTab.tsx` (247 lines — **Batch 5 built**: P/L analytics, category/paper-vs-live breakdown, trade history with sort/filter, activity log, trade replay drawer)
- `components/dashboard/market/MarketLiveWalletTab.tsx` (258 lines — **Batch 5 built**: wallet connect, readiness checklist (7 checks), balance/gas display, signature verify, USDC approve, risk disclaimer, verification test flow)
- `components/dashboard/market/MarketBuyPanel.tsx` (reused by DirectBuyTab — shows max loss, max payout, implied probability, what-if scenarios)
- `components/dashboard/market/types.ts` (164 lines — all shared types including SimulationConfig, AutomationPlan)
- `lib/hooks/useMarketDirectBuyState.ts` (197 lines — **Batch 3 new**: self-contained search/filter/pagination/buy state for DirectBuyTab)
- `lib/hooks/useMarketAutomationState.ts` (136 lines — **Batch 4 new**: plan CRUD, localStorage persistence, control level state)
- `lib/hooks/useMarketSimState.ts` (87 lines — **Batch 4 extended**: sim config, fill model labels, fee mode tracking)
- `lib/market/layout-presets.ts` (64 lines — tab/panel defaults)
- `lib/hooks/useMarketLayoutPrefs.ts` (169 lines — persist/migrate prefs)
- `lib/hooks/useMarketBuyState.ts` (used by legacy tabs)
- `lib/hooks/useMarketResultsState.ts` (170 lines — **Batch 5 new**: analytics computation, sort/filter, trade replay state)
- `lib/hooks/useMarketWalletState.ts`
- `lib/hooks/useMarketServerStatus.ts` (109 lines — **Batch 6 new**: polls /api/market/bot-status + scheduler/health every 30s, returns canonical server-confirmed status)

Still missing from the revised plan
- saved markets / saved searches unified tab (future)
- Supabase `market_plans` table migration (plans currently localStorage-only)
- app-ecosystem-ready packaging assumptions
- legacy file retirement (Batch 7)
- auto-load markets on Direct Buy tab (currently requires manual "Load all markets" click)
- category filter, liquidity filter, volume filter, spread filter missing from Direct Buy advanced filters
- advanced filter slider tooltips / explainer text for new users
- full Polymarket catalog search (only fetches 300 markets per API call, no server-side pagination)

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
- 2026-03-06: Batch 4 [Simulation + Automation] — complete. Files created: MarketSimulationPanel.tsx (226 lines), MarketAutomationTab.tsx (96 lines), MarketAutomationBuilder.tsx (300 lines), MarketPlanList.tsx (151 lines), useMarketAutomationState.ts (136 lines). Files modified: MarketClient.tsx (123→165 lines), useMarketSimState.ts (68→87 lines), types.ts (+SimulationConfig, +AutomationPlan, extended SimRun). MarketClient switch now renders Automation and Results (sim panel) directly. Supabase `market_plans` table not confirmed — plans use localStorage fallback. All files ≤300 lines, tsc clean. Next: Batch 5.
- 2026-03-06: Batch 5 [Results + Live Wallet] — complete. Files created: MarketResultsTab.tsx (247 lines), MarketLiveWalletTab.tsx (258 lines), useMarketResultsState.ts (170 lines). Files modified: MarketClient.tsx (165→171 lines — wired new tabs, added useMarketWalletState, removed useMarketSimState + MarketSimulationPanel imports), types.ts (164→189 lines — added ResultsAnalytics, TradeReplay). MarketSimulationPanel.tsx and useMarketSimState.ts are now orphaned (no importers) — add to Batch 7 retirement. All files ≤300 lines, tsc clean. Next: Batch 6.
- 2026-03-06: Batch 6 [Background Hardening] — complete. Files created: useMarketServerStatus.ts (109 lines — polls bot-status + scheduler/health every 30s, returns server-confirmed canonical status). Files modified: MarketClient.tsx (171→192 lines — replaced client-only StatusBadge with server-confirmed status, shows last run time + trades today from server), MarketStartHereTab.tsx (277→246 lines — bot status bar now shows server-confirmed state with explicit "server confirmed" labels, shows last error from scheduler, removed local botRunning/lastScan props), MarketSharedUi.tsx (added paused/stopped/unknown status colors to StatusBadge). All files ≤300 lines, tsc clean. Next: Batch 7.

## Ready-To-Paste Prompt For Next Chat

Copy-paste this entire block into a new chat session to continue the Market Robot build:

```text
I'm continuing the Market Robot rebuild. Batches 1–6 are complete. This session covers **Batch 7 (Cleanup + Retirement)** and **Batch 8 (Direct Buy UX Hardening)**.

## Read order
1. `SLATE360_PROJECT_MEMORY.md`
2. `slate360-context/NEW_CHAT_HANDOFF_PROTOCOL.md`
3. `slate360-context/dashboard-tabs/market-robot/ONGOING_BUILD_TRACKER.md` — active batches = 7 + 8
4. `slate360-context/dashboard-tabs/market-robot/IMPLEMENTATION_PLAN.md` — retirement list + Direct Buy filter spec (search "Required default filters" and "Advanced filters")

## Environment & tool access
- **.env.local** is fully configured with Supabase (URL + anon key + service role key + access token), AWS S3 (region + key ID + secret + bucket), Resend email, Google Maps keys
- **Supabase dashboard**: https://supabase.com/dashboard/project/hadnfcenpcfaeclczsmm
- **Git**: you have push access to `main` — commit and push when done
- **Terminal**: `npx tsc --noEmit`, `bash scripts/check-file-size.sh`, `wc -l`, all available

## What was done in Batches 1–6
- **MarketClient.tsx** (192 lines) — thin orchestrator, switch-renders tabs, server-confirmed status in header via useMarketServerStatus
- **MarketStartHereTab.tsx** (246 lines) — mode picker, 6 recommendation presets, first-run banner, YES/NO explainer, server-confirmed bot status bar
- **MarketDirectBuyTab.tsx** (299 lines) — search toolbar, timeframe chips, advanced filters (edge %, prob range, sort only — missing categories/volume/liquidity/spread/risk), market table with YES/NO buy buttons, buy panel drawer
- **useMarketDirectBuyState.ts** (197 lines) — self-contained hook for Direct Buy (fetches 300 markets via `/api/market/polymarket?limit=300`, client-side filter/sort/paginate). States for `category` and `riskTag` exist but have NO UI controls.
- **MarketAutomationTab.tsx** (96 lines) — orchestrates builder + plan list + active plan summary
- **MarketAutomationBuilder.tsx** (300 lines) — guided plan creation with 3 control levels
- **MarketPlanList.tsx** (151 lines) — saved plans with apply/edit/clone/rename/archive/default/delete
- **useMarketAutomationState.ts** (136 lines) — plan CRUD, localStorage persistence
- **MarketResultsTab.tsx** (247 lines) — P/L analytics, trade replay drawer
- **useMarketResultsState.ts** (170 lines) — analytics computation, sort/filter, replay state
- **MarketLiveWalletTab.tsx** (258 lines) — wallet connect, readiness checklist, approve, verify
- **useMarketServerStatus.ts** (109 lines) — polls bot-status + scheduler/health every 30s, returns server-confirmed canonical status
- **MarketSharedUi.tsx** (38 lines) — HelpTip tooltip component + StatusBadge with paused/stopped/unknown support
- **types.ts** (189 lines) — all shared types
- All 18 API routes and 4 domain hooks untouched
- Supabase `market_plans` table migration still pending — plans use localStorage fallback

## Batch 7 — Cleanup + Retirement (do this first)
Goal: delete legacy files now that all replacements are verified.

**Files to retire** (delete these after confirming no remaining imports):
- `components/dashboard/market/MarketDashboardTab.tsx`
- `components/dashboard/market/MarketHotOppsTab.tsx`
- `components/dashboard/market/MarketWhaleWatchTab.tsx`
- `components/dashboard/market/MarketWalletPerformanceTab.tsx`
- `components/dashboard/market/MarketSimCompareTab.tsx`
- `components/dashboard/market/MarketDirectivesTab.tsx`
- `components/dashboard/market/MarketDirectivesForm.tsx`
- `components/dashboard/market/MarketDirectivesList.tsx`
- `components/dashboard/market/MarketSimulationPanel.tsx`
- `components/dashboard/market/MarketAutomationStub.tsx`
- `components/dashboard/market/MarketResultsStub.tsx`
- `components/dashboard/market/MarketLiveWalletStub.tsx`
- `lib/hooks/useMarketSimState.ts`
- `lib/hooks/useMarketBuyState.ts`

**Before deleting each file:** grep the codebase for its import — if anything still imports it, update the importer first. After all deletions, run `npx tsc --noEmit` to confirm clean.

## Batch 8 — Direct Buy UX Hardening (do this after Batch 7)
Goal: fix 6 specific UX problems users are hitting on the Direct Buy tab.

### 8a: Auto-load markets on tab mount
In `useMarketDirectBuyState.ts`, add a `useEffect` that calls `fetchMarkets("")` on mount so the user sees markets immediately without clicking "Load all markets." Remove or repurpose the "Load all markets" button as a refresh.

### 8b: Add missing filters to advanced filters panel
The `IMPLEMENTATION_PLAN.md` (search "Required default filters and sort" and "Advanced filters") specifies these filters that are NOT yet built. Add them to the advanced filters section in `MarketDirectBuyTab.tsx`:

1. **Category dropdown** — the `category` state variable already exists in `useMarketDirectBuyState.ts` but there's no UI. Add a `<select>` with categories derived from loaded markets (`[...new Set(markets.map(m => m.category))]`). Return available categories from the hook.
2. **Risk tag filter** — the `riskTag` state already exists in the hook but no UI. Add a dropdown: All / Hot / High-Risk / Construction / High-Potential / None.
3. **Minimum volume filter** — add `minVolume` state to the hook (default 0). Add a slider 0–100k. Wire into `filteredMarkets`.
4. **Minimum liquidity filter** — add `minLiquidity` state to the hook (default 0). Add a slider 0–500k. Wire into `filteredMarkets`.
5. **Maximum spread filter** — add `maxSpread` state to the hook (default 100). Add a slider 0–50%. Wire into `filteredMarkets`. Spread = `1 - yesPrice - noPrice`.

Update the `filteredMarkets` useMemo in the hook to apply these new filters.

### 8c: Add help tooltips on every filter slider/dropdown
The `HelpTip` component already exists in `MarketSharedUi.tsx`. Add a `<HelpTip>` next to each filter label with a plain-English explanation:

- **Min Edge %**: "The pricing edge is the estimated advantage over fair value. Higher = more favorable entry price. 0% shows all markets."
- **Prob min/max %**: "Filter markets by their implied probability. Low (<30%) markets are long shots. High (>70%) are heavy favorites."
- **Sort by**: "Controls the order markets appear. 'Best Edge' shows the most favorable prices first."
- **Category**: "Filter markets by topic — e.g. Politics, Crypto, Sports, Economy."
- **Risk tag**: "Shows markets with special risk indicators. 'Hot' = trending. 'High-risk' = volatile."
- **Min Volume**: "Minimum 24h trading volume in USD. Higher volume = more active market with better fills."
- **Min Liquidity**: "Minimum available liquidity in USD. Higher liquidity means your trade is more likely to fill at the expected price."
- **Max Spread**: "Maximum gap between YES + NO prices and $1. Lower spread = fairer pricing."

### 8d: Increase market fetch limit
In `useMarketDirectBuyState.ts`, change `limit: "300"` to `limit: "1000"` to show more of the Polymarket catalog. Full server-side pagination is a future task.

**File size warning:** MarketDirectBuyTab.tsx is already 299 lines. If adding filters pushes it past 300, extract the advanced filters into a `MarketAdvancedFilters.tsx` sub-component (the IMPLEMENTATION_PLAN already calls for this as `MarketAdvancedFiltersDrawer.tsx`).

## Non-negotiables
- Route: `/market` — do not change
- Gate: `canAccessMarket` — never `hasInternalAccess`
- `app/market/page.tsx` remains the gate + provider wrapper — do not modify
- `MarketClient.tsx` stays thin (≤ 200 lines)
- No new API routes (use existing api/market/* routes)
- No `any` — use `unknown` + narrowing
- Every new/modified .ts/.tsx file must stay under 300 lines
- Types live in `components/dashboard/market/types.ts` — do not duplicate
- Bot/runtime logic stays UI-agnostic and testable

## After edits (required before ending session)
1. Run `npx tsc --noEmit` and `get_errors` on all touched files — fix all errors
2. Check line counts on all touched files (300-line limit)
3. Update the ONGOING_BUILD_TRACKER.md:
   - Change Batch 7 row to ✅ Complete
   - Change Batch 8 row to ✅ Complete (or note what remains)
   - Update "Current Market files in play" — remove retired files, add any new files with line counts
   - Update "Still missing" section — remove items that were addressed
   - Add Session Log entry for both batches
   - Update the "Ready-To-Paste Prompt For Next Chat" to reference whatever is next
4. Push to git: `git add -A && git commit -m "Market Robot Batch 7+8: Cleanup + Direct Buy UX" && git push`
5. Give me a summary of:
   - what was done (files deleted, files created/modified, line counts)
   - what's working
   - any issues or incomplete items
   - remaining steps/prompts after this session
```
