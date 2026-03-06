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
- scoped internal access exists for `ceo`, `market`, and `athlete360`
- `/market` gates on `canAccessMarket`
- shared header and quick-nav respect scoped internal visibility
- Project Hub duplicate portfolio snapshot was removed and the surviving snapshot is interactive

Current Market files in play
- `app/market/page.tsx`
- `components/dashboard/MarketClient.tsx` (181 lines — orchestrator, switch-renders tabs with shared props, server-confirmed status in header, lazy-loads results logs only when Results is active)
- `components/dashboard/market/MarketRouteShell.tsx` (63 lines — shell + customize integration)
- `components/dashboard/market/MarketPrimaryNav.tsx` (51 lines — prefs-driven nav)
- `components/dashboard/market/MarketCustomizeDrawer.tsx` (135 lines — shared customize drawer)
- `components/dashboard/market/MarketStartHereTab.tsx` (245 lines — **Batch 3 built, Batch 6 updated, Mar 6 runtime hardening**: mode picker, 6 recommendation presets, first-run banner, YES/NO explainer, navigation to other tabs, server-confirmed bot status bar, hydration-safe localStorage init)
- `components/dashboard/market/MarketDirectBuyTab.tsx` (267 lines — **Batch 3 built, Batch 8 updated**: search toolbar, timeframe chips, MarketAdvancedFilters integration, market table w/ YES/NO buy buttons, buy panel drawer)
- `components/dashboard/market/MarketAutomationTab.tsx` (96 lines — **Batch 4 built**: orchestrates builder + plan list + active plan summary)
- `components/dashboard/market/MarketAutomationBuilder.tsx` (300 lines — **Batch 4 built**: guided plan creation with basic/intermediate/advanced control levels)
- `components/dashboard/market/MarketPlanList.tsx` (151 lines — **Batch 4 built**: saved plans with apply/edit/clone/rename/archive/default/delete)
- `components/dashboard/market/MarketAdvancedFilters.tsx` (188 lines — **Batch 8 new**: extracted advanced filter panel with 8 filter controls + HelpTip tooltips)
- `components/dashboard/market/MarketSavedMarketsStub.tsx` (stub — future)
- `components/dashboard/market/MarketResultsTab.tsx` (247 lines — **Batch 5 built**: P/L analytics, category/paper-vs-live breakdown, trade history with sort/filter, activity log, trade replay drawer)
- `components/dashboard/market/MarketLiveWalletTab.tsx` (258 lines — **Batch 5 built**: wallet connect, readiness checklist (7 checks), balance/gas display, signature verify, USDC approve, risk disclaimer, verification test flow)
- `components/dashboard/market/MarketBuyPanel.tsx` (reused by DirectBuyTab — shows max loss, max payout, implied probability, what-if scenarios)
- `components/dashboard/market/types.ts` (164 lines — all shared types including SimulationConfig, AutomationPlan)
- `lib/hooks/useMarketDirectBuyState.ts` (258 lines — **Batch 3 new, Batch 8 updated, Mar 6 runtime hardening**: auto-load on mount, cursor-batched fetch up to 1000 markets, minVolume/minLiquidity/maxSpread filters, availableCategories, loadError state)
- `lib/hooks/useMarketAutomationState.ts` (136 lines — **Batch 4 new**: plan CRUD, localStorage persistence, control level state)

- `lib/market/layout-presets.ts` (64 lines — tab/panel defaults)
- `lib/hooks/useMarketLayoutPrefs.ts` (169 lines — persist/migrate prefs)

- `lib/hooks/useMarketResultsState.ts` (170 lines — **Batch 5 new**: analytics computation, sort/filter, trade replay state)
- `lib/hooks/useMarketWalletState.ts`
- `lib/hooks/useMarketServerStatus.ts` (109 lines — **Batch 6 new**: polls /api/market/bot-status + scheduler/health every 30s, returns canonical server-confirmed status)

Still missing from the revised plan
- saved markets / saved searches unified tab (future)
- Supabase `market_plans` table migration (plans currently localStorage-only)
- app-ecosystem-ready packaging assumptions
- server-side pagination for Polymarket catalog (currently client-side with 1000-market fetch)
- bookmarking / saved markets persistence
- authenticated production verification of directives/logs fallback behavior after deploy

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

## Ready-To-Paste Prompt For Next Chat

Copy-paste this entire block into a new chat session to continue the Market Robot build:

```text
I'm continuing the Market Robot rebuild. Batches 1–8 are complete. This session covers **Batch 9+ (remaining items)**.

## Read order
1. `SLATE360_PROJECT_MEMORY.md`
2. `slate360-context/NEW_CHAT_HANDOFF_PROTOCOL.md`
3. `slate360-context/dashboard-tabs/market-robot/ONGOING_BUILD_TRACKER.md` — see "Still missing" section
4. `slate360-context/dashboard-tabs/market-robot/IMPLEMENTATION_PLAN.md` — for saved markets spec and market_plans table schema

## Environment & tool access
- **.env.local** is fully configured with Supabase (URL + anon key + service role key + access token), AWS S3 (region + key ID + secret + bucket), Resend email, Google Maps keys
- **Supabase dashboard**: https://supabase.com/dashboard/project/hadnfcenpcfaeclczsmm
- **Git**: you have push access to `main` — commit and push when done
- **Terminal**: `npx tsc --noEmit`, `bash scripts/check-file-size.sh`, `wc -l`, all available

## What was done in Batches 1–8
- **MarketClient.tsx** (192 lines) — thin orchestrator, switch-renders tabs, server-confirmed status in header
- **MarketStartHereTab.tsx** (246 lines) — mode picker, 6 recommendation presets, first-run banner, server-confirmed bot status bar
- **MarketDirectBuyTab.tsx** (267 lines) — search toolbar, timeframe chips, market table w/ YES/NO, buy panel drawer
- **MarketAdvancedFilters.tsx** (188 lines) — 8 filter controls (edge, prob min/max, sort, category, risk tag, volume, liquidity, spread) with HelpTip tooltips
- **useMarketDirectBuyState.ts** (222 lines) — auto-loads 1000 markets on mount, all 8 filters wired, availableCategories derived
- **MarketAutomationTab.tsx** (96 lines) + **MarketAutomationBuilder.tsx** (300 lines) + **MarketPlanList.tsx** (151 lines)
- **useMarketAutomationState.ts** (136 lines) — plan CRUD, localStorage persistence
- **MarketResultsTab.tsx** (247 lines) — P/L analytics, trade replay
- **useMarketResultsState.ts** (170 lines) — analytics computation
- **MarketLiveWalletTab.tsx** (258 lines) — wallet connect, readiness checklist
- **useMarketServerStatus.ts** (109 lines) — polls server every 30s
- **MarketSharedUi.tsx** (38 lines) — HelpTip + StatusBadge
- **types.ts** (189 lines) — all shared types
- 22 legacy files deleted in Batch 7
- All 18 API routes untouched

## Remaining items (pick what to tackle)
1. **Saved Markets tab** — build MarketSavedMarketsTab.tsx to replace the stub (bookmarking, saved searches)
2. **Supabase `market_plans` table migration** — create table, migrate localStorage plans to DB, update useMarketAutomationState
3. **Server-side pagination** — add offset/cursor to /api/market/polymarket for >1000 markets
4. **App-ecosystem packaging** — ensure Market module is portable for standalone app routes

## Non-negotiables
- Route: `/market` — do not change
- Gate: `canAccessMarket` — never `hasInternalAccess`
- `MarketClient.tsx` stays thin (≤ 200 lines)
- No `any` — use `unknown` + narrowing
- All files ≤ 300 lines
- Types in `components/dashboard/market/types.ts`
```
