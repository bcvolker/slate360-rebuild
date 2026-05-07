# Market Robot — Runtime Checklist

Last Updated: 2026-03-11
Use this for step-by-step runtime verification. Start with paper mode. Do not jump to live mode first.

## 1. Local Baseline

Run:

```bash
npm run typecheck
npm run diag:market-runtime
```

Expected paper-mode baseline:
- Supabase env present
- scheduler secret present
- `market_trades` present
- `market_bot_runtime` present
- `market_bot_runtime_state` present
- `market_activity_log` present
- `market_scheduler_lock` present

## 2. Paper Mode Checks

Verify in order:
1. open `/market`
2. confirm route access works
3. save a plan
4. apply the plan
5. run an immediate scan
6. confirm `market_activity_log` updates
7. confirm Results or Open Positions reflects the new paper trade

If that fails, inspect:
- `app/api/market/scan/route.ts`
- `lib/market/scheduler-run-user.ts`
- `lib/market/runtime-config.ts`
- `lib/market/trade-persistence.ts`

## 3. Scheduler Checks

Verify:
- `vercel.json` includes `/api/market/scheduler/tick`
- deployed env has cron/scheduler secret wiring
- the tick route is actually executing on cadence
- activity log and scheduler state rows are moving

Remember:
- browser-local polling is not real background automation
- cron presence in code is not the same as deployed scheduler health

## 4. Live Mode Checks

Live mode requires all paper-mode checks plus:
- `POLYMARKET_API_KEY`
- `POLYMARKET_API_SECRET`
- `POLYMARKET_API_PASSPHRASE`
- `NEXT_PUBLIC_POLYMARKET_SPENDER`
- funded Polygon wallet
- USDC balance
- gas balance

Only after paper mode is stable:
1. verify wallet connect
2. verify signature flow
3. verify approve flow
4. test one small live trade

## 5. Common Failure Meanings

- save works, nothing happens: save/apply/runtime path is still not aligned
- bot says running, no trades: scheduler path or runtime filters likely failed
- live action falls back or blocks: CLOB envs or spender/wallet path incomplete
- UI looks healthy, no backend evidence: check `market_activity_log` and scheduler state

## 6. Core Commands

```bash
npm run typecheck
npm run diag:market-runtime
npm run guard:clob-contract
npm run verify:release
```

## 7. Primary Files

- `app/market/page.tsx`
- `components/dashboard/MarketClient.tsx`
- `lib/hooks/useMarketBot.ts`
- `app/api/market/scan/route.ts`
- `app/api/market/buy/route.ts`
- `lib/market/scheduler-run-user.ts`
- `lib/market/runtime-config.ts`
- `lib/market/trade-persistence.ts`