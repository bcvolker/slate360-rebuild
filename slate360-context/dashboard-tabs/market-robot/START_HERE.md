# Market Robot — Start Here

Last Updated: 2026-03-11
Use this file first for any Market Robot task. Only open the longer Market docs if this file does not answer the question.

## What Matters First

- Route: `/market`
- Gate: `resolveServerOrgContext().canAccessMarket`
- Page entry: `app/market/page.tsx`
- Orchestrator: `components/dashboard/MarketClient.tsx`
- UI subtree: `components/dashboard/market/`
- Hooks: `lib/hooks/useMarket*`
- Runtime logic: `lib/market/`
- APIs: `app/api/market/`

## Current Status

- UI decomposition is largely done.
- Paper-mode trading and plan-driven automation are partially wired and much better than before.
- Execution now prefers `market_plans`, but the system still has compatibility layers and some split runtime state.
- Live mode is not fully ready until real Polymarket credentials and spender config are present.
- Background automation still depends on Vercel cron plus scheduler health.

## Current Highest-Value Truths

1. Market access is `canAccessMarket`, not entitlement-based.
2. `market_plans` is the preferred execution source.
3. Apply/start/runtime are improved but not yet fully unified.
4. Live trading still requires:
   - `POLYMARKET_API_KEY`
   - `POLYMARKET_API_SECRET`
   - `POLYMARKET_API_PASSPHRASE`
   - `NEXT_PUBLIC_POLYMARKET_SPENDER`
5. Background automation still requires scheduler cron execution and valid secret wiring.

## Main Known Blockers

- Runtime state is still spread across `market_plans`, compatibility-layer directives/runtime metadata, scheduler state, and wallet/live prerequisites.
- Practice flow can still feel unreliable if save/apply/runtime verification is not aligned.
- Search/filter quality is better, but not a complete historical or semantic market intelligence system.
- The remaining Market problem is more architectural than cosmetic.

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