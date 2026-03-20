# Market Robot — Status Handoff

Last Updated: 2026-03-21
Purpose: Definitive handoff for Market Robot UI. Replaces all prior Grok phase tracking.

---

## TL;DR — Current Reality

The Market Robot tab system **routes correctly** (6 tabs, navigation works, 0 TypeScript errors) but **has no real data wiring and severe UX problems**. Grok created 8 phases of scaffolding that compile but are not user-ready. The orchestrator (`MarketClient.tsx`) passes dummy data and `console.log` callbacks to all tabs. 4 of 6 tabs are placeholder boxes. The Direct Buy tab is the most complete but has jargon and UX issues.

**Before touching any tab UI, the data wiring in MarketClient.tsx must be fixed first.**

---

## Current File Inventory

| File | Lines | UX Grade | Status |
|---|---|---|---|
| `components/dashboard/market/MarketClient.tsx` | 99 | C | Routing works; all data is dummy/hardcoded |
| `components/dashboard/market/MarketPrimaryNav.tsx` | 52 | B | Tab bar works — icons, active states, hover |
| `components/dashboard/market/MarketStartHereTab.tsx` | 60 | D | Static boxes, no dynamic content, dev text |
| `components/dashboard/market/MarketDirectBuyTab.tsx` | 244 | B- | Most complete; jargon + disconnected presets |
| `components/dashboard/market/MarketAutomationTab.tsx` | 147 | D- | Unconnected form, no guidance, fake state |
| `components/dashboard/market/MarketResultsTab.tsx` | 74 | F | 3 placeholder divs + all-zero analytics |
| `components/dashboard/market/MarketLiveWalletTab.tsx` | 61 | F | Dead Connect button, 3 placeholder divs |
| `components/dashboard/market/MarketSavedTab.tsx` | 30 | F | 2 placeholder divs, no hook integration |
| `components/dashboard/market/MarketRobotWorkspace.tsx` | 84 | N/A | Unused alternative layout — not rendered |
| `components/dashboard/MarketClient.tsx` (OLD) | 75 | — | Orphaned. Nothing imports it. Delete. |

---

## What's Structurally Sound

- Tab routing works — 6 tabs render, navigation switches correctly
- 0 TypeScript errors — compiles and deploys cleanly
- Dark theme tokens consistent across files (slate-950, slate-900, rounded-2xl/32px)
- MarketPrimaryNav is well-built with icon mapping and active state indicators
- MarketDirectBuyTab has proper hook architecture (useMarketDirectBuyState, useMarketWatchlist)
- Two-column layout pattern (search + buy sidebar) in Direct Buy is solid

---

## Critical Problems (Ordered by Fix Priority)

### 1. MarketClient.tsx — No Real Data Wiring (CRITICAL)

The orchestrator does not call any of the hooks that existed in the old monolith:
- `useMarketBot` — not imported (provides paperMode, bot controls)
- `useMarketTradeData` — not imported (provides trade history)
- `useMarketWalletState` — not imported (provides wallet connection, balances, liveChecklist)
- `useMarketServerStatus` — not imported (provides real server health)
- `useMarketSystemStatus` — not imported (provides system readiness)

Instead, every callback is `console.log("X triggered")`, liveChecklist is hardcoded all-false, paperMode defaults to true with no toggle, trades=[], system=null, serverHealth=null.

**Fix:** Import all 5 hooks, replace dummy values with real data, replace console.log callbacks with hook methods.

### 2. Placeholder Text Rendered to Users

4 of 6 tabs show "(Placeholder)" labels and "will appear here after implementation" text:
- Results: 3 placeholder boxes
- Live Wallet: 3 placeholder boxes + dead Connect Wallet button
- Saved Markets: 2 placeholder boxes
- Automation: form inputs have no onChange handlers

**Fix:** Replace all placeholder divs with either real components or proper empty states with CTAs.

### 3. Developer Jargon in User-Facing Text

- "Edge" (probability differential — meaningless to casual users)
- "Scan" / "Paper Scan" / "Live Scan" (internal automation terminology)
- "Runtime status: unknown. Awaiting server confirmation." (diagnostic text)
- "fetchModeLabel" badge ("Keyword + Filters")
- "Minimum Edge %" / "Risk Level" without explanation

**Fix:** Rewrite all user-facing copy in plain language. No user should need to know what "edge" means.

### 4. No Practice / Live Mode Toggle

Users cannot switch between Practice and Live mode from any tab. `paperMode` is a hardcoded default prop in MarketClient with no toggle mechanism. The old MarketClient computed this from `useMarketBot().config.paperMode`.

### 5. Dead Buttons and Unconnected Forms

- **Live Wallet "Connect Wallet" button:** No onClick handler
- **Automation "Save Plan" button:** No onClick handler
- **Automation form inputs:** No useState or onChange — typing has no effect
- **Automation "Stop" button:** Uses local useState that resets on refresh

### 6. No Empty States Designed

When there are no trades, saved markets, or activity, tabs show zeros or nothing. Should show illustration + message + CTA to relevant action.

### 7. Start Here Tab — No Dynamic Content

Landing page is static: two colored boxes + two buttons + a server status string. No trending markets, no wallet snapshot, no performance preview, no explanation of what prediction markets are.

### 8. Results Tab — No Visual Dashboard

Should have PnL chart, position breakdown, trade history table. Instead has 3 empty boxes labeled "Placeholder" and an all-zero analytics component.

### 9. Direct Buy — Jargon and Presets

Quick search presets (weather-hour, moonshots, high-liquidity) are developer-defined quant combos, not user mental models. Advanced Filters expose minEdge, probMin/probMax, riskTag, minLiquidity, maxSpread — all expert concepts with no user explanation.

---

## Existing Working Hooks (Wire These into MarketClient)

| Hook | File | Provides |
|---|---|---|
| `useMarketBot` | `lib/hooks/useMarketBot.ts` | config.paperMode, isRunning, quickStart, stopBot |
| `useMarketTradeData` | `lib/hooks/useMarketTradeData.ts` | trades array, refetch, trade status |
| `useMarketWalletState` | `lib/hooks/useMarketWalletState.ts` | address, isConnected, usdcBalance, liveChecklist |
| `useMarketServerStatus` | `lib/hooks/useMarketServerStatus.ts` | server status, health, isConfirmed |
| `useMarketSystemStatus` | `lib/hooks/useMarketSystemStatus.ts` | system readiness, loading, error |
| `useMarketDirectBuyState` | `lib/hooks/useMarketDirectBuyState.ts` | search, filters, buy panel state |
| `useMarketWatchlist` | `lib/hooks/useMarketWatchlist.ts` | saved markets, toggle save |
| `useMarketAutomationState` | `lib/hooks/useMarketAutomationState.ts` | plans, draft, automation controls |
| `useMarketLayoutPrefs` | `lib/hooks/useMarketLayoutPrefs.ts` | tab visibility, order preferences |

---

## Fix Execution Order (for next session)

1. **Wire MarketClient.tsx** — import hooks, replace dummy data (CRITICAL — unblocks all tabs)
2. **Kill placeholder text** — replace "(Placeholder)" divs with empty states
3. **Fix Start Here** — add trending markets, mode toggle, wallet badge, plain-language explainer
4. **Simplify Direct Buy** — rename jargon, replace presets with category cards, hide advanced filters
5. **Rebuild Automation as wizard** — multi-step guided flow, connected form inputs
6. **Build Results dashboard** — PnL chart, position cards, trade history table
7. **Wire Live Wallet to hooks** — real wallet connection, readiness checklist, balances
8. **Connect Saved Markets to watchlist hook** — render saved items, empty state

---

## Prompt Templates for Each Fix

### Prompt 1 — Wire Data (do this first)
> "In MarketClient.tsx, import and call useMarketBot, useMarketTradeData, useMarketWalletState, useMarketServerStatus, and useMarketSystemStatus. Replace all console.log callbacks with real hook methods. Replace the hardcoded liveChecklist with wallet.liveChecklist. Compute paperMode from bot.config.paperMode. Pass real trade data to ResultsTab and real wallet state to LiveWalletTab. Do NOT change the tab routing structure — only wire in real data."

### Prompt 2 — Kill Placeholders
> "Search all files in components/dashboard/market/ for 'Placeholder' or 'after implementation'. Replace every placeholder box with either a real component that displays actual data, or an empty state showing what the user should do next with a CTA button."

### Prompt 3 — Fix Start Here
> "Rewrite MarketStartHereTab: (a) 2-sentence explainer of prediction markets, (b) live trending markets carousel from the API, (c) Practice/Live mode toggle that changes the mode, (d) wallet status badge. Remove raw server status text. Primary CTA: 'Browse Markets' navigates to direct-buy tab."

### Prompt 4 — Simplify Direct Buy
> "In MarketDirectBuyTab: (a) replace presets with category cards (Sports, Politics, Crypto, Entertainment, Science), (b) rename 'Edge' to 'Opportunity' in UI, (c) hide Advanced Filters behind 'Expert Mode' toggle, (d) fire search on Enter keypress, (e) add empty state when no search done, (f) remove fetchModeLabel badge."

### Prompt 5 — Automation Wizard
> "Rewrite MarketAutomationTab as multi-step wizard: Step 1 Choose category, Step 2 Set rules (max per trade, min opportunity), Step 3 Set limits (total budget, max positions), Step 4 Review in plain language, Step 5 Start. Add onChange handlers. Show saved/running plans list."

### Prompt 6 — Results Dashboard
> "Rewrite MarketResultsTab: (a) PnL chart over time, (b) live position cards with gain/loss, (c) trade history table, (d) empty state with 'Start Trading' CTA when no trades. Remove all placeholder boxes."

### Prompt 7 — Live Wallet
> "Rewrite MarketLiveWalletTab: (a) import useMarketWalletState, (b) step-by-step readiness checklist (Connect, Polygon, Sign, Approve USDC, Fund), (c) live USDC/MATIC balances, (d) real Connect Wallet via wagmi."

### Prompt 8 — Saved Markets
> "Rewrite MarketSavedTab: (a) import useMarketWatchlist, (b) render saved markets as cards with odds and remove button, (c) empty state with CTA to Direct Buy."

---

## General Rules for All Future Prompts

- No "after implementation" or "(Placeholder)" text — show empty state or "Coming Soon" badge
- No developer jargon in user-facing text (no "edge," "scan," "runtime," "server status")
- Every button must have an onClick handler — dead buttons are not acceptable
- Every form input must have state management (useState + onChange)
- Test by reading UI as a non-technical user — if purpose unclear in 5 seconds, rewrite
- One component per file, no file over 300 lines
- Use existing hooks from lib/hooks/ — do not recreate or stub them

---

## Legacy Issues Still Open

- Live automation path incomplete — scan execution is paper-only
- Direct-buy can overstate live success when backend falls back to paper
- 1000+ accumulated open paper trades not auto-resolved
- 2-column layout only at xl (1280px+) — smaller desktops see stacked
- MarketCustomizeDrawer and MarketTradeReplayDrawer still need dark theme

---

## Previous Handoff Context (Archived)

The Grok Phase 1-8 tracking previously in this file is obsolete. Phases 1-8 created scaffolding but left all data disconnected and most UI as placeholders. The critique above supersedes all prior phase completion claims. Backup at MARKET_ROBOT_STATUS_HANDOFF.md.bak.
