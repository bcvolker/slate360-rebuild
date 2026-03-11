# Market Robot — Current State Handoff

Last Updated: 2026-03-11
Read this only after `START_HERE.md`. This is a compact state handoff, not the default startup file.

## Executive Summary

Market Robot is no longer blocked by basic route or UI-structure issues. The remaining problem is mainly architectural.

Current truth:
- Direct Buy paper mode is materially improved.
- Plan execution now prefers `market_plans`.
- Live mode is still blocked on full Polymarket credential and spender readiness.
- Background automation still depends on the cron path and scheduler health.
- Runtime state is improved but not yet fully unified across every execution surface.

## What Changed Recently

Recent work materially improved these areas:
- execution now reads `market_plans` first in key paths
- trade persistence is more tolerant of Supabase schema lag
- direct-buy search and filtering improved
- results and activity visibility improved
- system-status readiness surfaced more clearly in UI

These changes reduced confusion, but they did not eliminate the root architectural split.

## Canonical Corrections

1. Market access is `canAccessMarket` from `resolveServerOrgContext()`.
2. `app/market/page.tsx` stays the route gate and provider wrapper.
3. `components/dashboard/MarketClient.tsx` stays a thin orchestrator.
4. `market_plans` is the preferred execution source.
5. Legacy directive/runtime metadata paths still exist as compatibility layers.

## Core Route Stack

1. `app/market/page.tsx`
2. `components/dashboard/market/MarketRouteShell.tsx`
3. `components/dashboard/MarketClient.tsx`
4. tab components under `components/dashboard/market/`
5. hooks under `lib/hooks/`
6. runtime and scheduler logic under `lib/market/`
7. route handlers under `app/api/market/`

## What Works Today

- `/market` is gated server-side.
- UI route stack is decomposed.
- Direct Buy loads and filters market data.
- Saved plans exist and execution prefers them.
- Results and logs are more visible in-app.
- Runtime diagnostics are available through `npm run diag:market-runtime`.

## Main Remaining Gaps

### Live mode
- Requires real Polymarket credentials.
- Requires `NEXT_PUBLIC_POLYMARKET_SPENDER`.
- Requires actual wallet approval and funding path.

### Background automation
- Requires `/api/market/scheduler/tick` to run on schedule.
- Requires deployed cron secret wiring.
- Browser-local polling is not a substitute for real background execution.

### Architecture
- Save/apply/runtime are closer, but not perfectly unified.
- Some config/execution state still spans more than one persistence path.
- The product still lacks a single obvious operator view proving end-to-end scan -> decision -> trade behavior.

## Highest-Value Checks For The Next Session

1. Verify save plan -> apply plan -> immediate scan -> trade write -> Results visibility end to end.
2. Verify deployed env includes Market live-trading prerequisites.
3. Continue retiring compatibility-layer runtime state so plan save/apply/runtime share one canonical source.

## Commands

```bash
npm run diag:market-runtime
npm run typecheck
```

## If You Need More Detail

- Architecture / implementation intent: `IMPLEMENTATION_PLAN.md`
- Longer build history: `ONGOING_BUILD_TRACKER.md`
- Paper-mode debugging: `PAPER_MODE_VERIFICATION_AND_BUGS.md`
- Scale planning: `SCALE_READINESS_AND_REQUIRED_APIS.md`
