# Market Robot — Start Here

Last Updated: 2026-03-22
Use this file first for any Market Robot task. Only open the longer Market docs if this file does not answer the question.

## ⚠️ PAUSED — Waiting for Wallet Funding

Market Robot V3 work is paused. Everything below is current state. Resume by:
1. Fund MetaMask wallet with USDC on Polygon (chain 137)
2. Confirm `NEXT_PUBLIC_POLYMARKET_SPENDER` is in `.env.local` (already on Vercel)
3. Test one $1 manual live buy to verify CLOB order format
4. Then continue Prompts 11–16 (see "Remaining Work" below)

## What Matters First

- Route: `/market`
- Gate: `resolveServerOrgContext().canAccessMarket`
- Page entry: `app/market/page.tsx`
- Orchestrator: `components/dashboard/market/MarketClient.tsx` (164 lines)
- Default tab: `command-center` (MarketCommandCenter.tsx, 235 lines)
- UI subtree: `components/dashboard/market/`
- Hooks: `lib/hooks/useMarket*` (8 hooks)
- Runtime logic: `lib/market/` (25 utilities)
- APIs: `app/api/market/` (17 routes)
- CLOB client: `lib/market/clob-api.ts` (HMAC-SHA256 signing, direct POST to Polymarket)

## Current Status (2026-03-22)

### What Works
- **V3 UI**: CommandCenter landing page with performance stats, open positions, market search
- **Color/style**: All navy/slate purged → zinc-neutral system, pills reduced, jargon cleaned
- **Paper trading**: Full end-to-end (search → buy → Supabase persistence → position monitoring)
- **Bot engine**: Arbitrage detection, half-Kelly sizing, fee-threshold guard, TP/SL position monitor
- **CLOB code**: HMAC signing + order submission built in `clob-api.ts`, live path in `buy/route.ts` with 4 graceful fallbacks
- **API credentials**: `POLYMARKET_API_KEY`, `POLYMARKET_API_SECRET`, `POLYMARKET_API_PASSPHRASE` all present in `.env.local` + Vercel
- **Builder key**: Created and signed via MetaMask on Polygon

### What's Broken / Not Working
- **Search results not clickable for buying** — click-to-buy flow needs verification/fixing (Prompt 12)
- **Some Polymarket categories missing** from search filters (Prompt 11)
- **Placeholder data visible** in some views instead of real empty states (Prompt 13)
- **Scheduler is paper-only** — no live CLOB path in automated scheduler (deliberate, pending manual test)
- **CLOB order format unverified** — signing code built from research, needs real $1 test
- **WebSocket not wired** — 5-min polling can't catch 2.7s arb windows

### What's Needed to Go Live
1. USDC in MetaMask wallet on Polygon
2. `NEXT_PUBLIC_POLYMARKET_SPENDER` added to `.env.local`
3. One successful $1 manual buy to verify CLOB format
4. After manual buy works: add live path to scheduler

## Remaining Work (Prompts 11–16)

| # | Prompt | Description | Status |
|---|--------|-------------|--------|
| 11 | Column sort + categories | Clickable column headers, Polymarket category alignment | ⬜ |
| 12 | Buy flow + position tracker | Click-to-buy from search, inline position tracker after buy | ⬜ |
| 13 | Position drill-down | Clickable open positions, real empty states | ⬜ |
| 14 | Automation rewrite | Plain language controls, remove jargon | ⬜ |
| 15 | Volume Scalper mode | High-freq 24/7 micro-buys targeting $7K/mo | ⬜ |
| 16 | Layout & scroll | Viewport fitting, scrollbar cleanup | ⬜ |

## CLOB Research (verified from Grok — March 2026)

- **WebSocket**: `wss://ws-subscriptions-clob.polymarket.com/ws/market`
- **REST**: `POST https://clob.polymarket.com/order`
- **Signing**: HMAC-SHA256 (ref: `Polymarket/clob-client/src/signing/hmac.ts`)
- **Credentials**: Builder key from `polymarket.com/settings?tab=builder`
- **token_id**: Gamma API `clobTokenIds[0]` = YES, `[1]` = NO
- **Fees**: 0% most markets; up to 1.56% on some crypto at 50/50
- **Gasless**: Builder keys work — Polymarket pays gas
- **Arb windows**: ~2.7s average lifespan
- **No testnet**: Paper mode is client-side only
- **Rate limits**: UNVERIFIED
- **Min order size**: UNVERIFIED

## Grok Prompt Ready for Resume

When resuming, send this to Grok first to verify the CLOB order format hasn't changed:
(See SLATE360_PROJECT_MEMORY.md "CLOB Research Notes" section for the full Grok prompt)

## Main Known Blockers

- CLOB order body format unverified against real API (could be slightly wrong)
- Scheduler has no live execution path (paper-only by design until manual buy succeeds)
- WebSocket streaming not implemented (needed for profitable arb detection)

## Fast Verification Commands

```bash
npm run diag:market-runtime
npm run typecheck
```

Relevant deploy/runtime checks:
- Confirm `vercel.json` cron for `/api/market/scheduler/tick`
- Confirm scheduler secret in deployed env
- Confirm Polymarket envs for live mode
- Use `RUNTIME_CHECKLIST.md` for step-by-step verification

## Core File Map

### Entry
- `app/market/page.tsx`
- `components/dashboard/MarketClient.tsx`
- `components/dashboard/market/MarketRouteShell.tsx`

### Main tabs
- `components/dashboard/market/MarketStartHereTab.tsx`
- `components/dashboard/market/MarketDirectBuyTab.tsx`
- `components/dashboard/market/MarketAutomationTab.tsx`
- `components/dashboard/market/MarketResultsTab.tsx`
- `components/dashboard/market/MarketLiveWalletTab.tsx`

### Hooks
- `lib/hooks/useMarketBot.ts`
- `lib/hooks/useMarketDirectBuyState.ts`
- `lib/hooks/useMarketAutomationState.ts`
- `lib/hooks/useMarketTradeData.ts`
- `lib/hooks/useMarketServerStatus.ts`

### Runtime / scheduler
- `lib/market/runtime-config.ts`
- `lib/market/scheduler-run-user.ts`
- `lib/market/scheduler.ts`
- `lib/market/sync-automation-plan.ts`
- `lib/market/trade-persistence.ts`

### APIs
- `app/api/market/scan/route.ts`
- `app/api/market/buy/route.ts`
- `app/api/market/plans/route.ts`
- `app/api/market/bot-status/route.ts`
- `app/api/market/system-status/route.ts`
- `app/api/market/scheduler/health/route.ts`
- `app/api/market/scheduler/tick/route.ts`

## Use These Docs Only If Needed

- `IMPLEMENTATION_PLAN.md`: canonical plan and current intended architecture
- `CURRENT_STATE_HANDOFF.md`: compressed state/history handoff
- `ONGOING_BUILD_TRACKER.md`: longer build history and prompt-oriented notes
- `PAPER_MODE_VERIFICATION_AND_BUGS.md`: focused testing details
- `RUNTIME_CHECKLIST.md`: fast operational verification path
- `SCALE_READINESS_AND_REQUIRED_APIS.md`: scale / external dependency planning

## Default Next Read

- For implementation or architecture work: `IMPLEMENTATION_PLAN.md`
- For runtime diagnosis: `CURRENT_STATE_HANDOFF.md`
- For backend/storage/auth detail: `../../BACKEND.md`