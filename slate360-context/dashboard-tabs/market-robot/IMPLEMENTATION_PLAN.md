# Market Robot — Implementation Plan

## Purpose
Internal market intelligence and strategy workspace with signal tracking and action tooling.

## Current State
- `/market` route now uses shared dashboard chrome via `components/dashboard/market/MarketRouteShell.tsx` (same `DashboardHeader` + spacing system as other tabs).
- `MarketClient.tsx` no longer renders its own standalone logo/back-link header; route shell owns top chrome for consistency.
- Runtime now supports preview-only scans (`execute_trades: false`) so reactive UI filtering does not place trades.
- Scheduler tick endpoint now supports cron auth (`CRON_SECRET`) and lock-guarded execution via `market_scheduler_lock`.
- Directives now include advanced risk controls: `daily_loss_cap`, `total_loss_cap`, `moonshot_mode`, `auto_pause_losing_days`, `target_profit_monthly`, `take_profit_pct`, `stop_loss_pct`.
- New persisted activity stream endpoint: `GET/POST /api/market/logs`.
- Trade lifecycle now supports TP/SL auto-close in `app/api/market/settle-trades/route.ts`.
- Live CLOB path now uses non-fixed nonce generation and EVM wallet address validation (`app/api/market/buy/route.ts`).
- CLOB route defaults are versioned (`CLOB_ORDER_PATH`, `CLOB_ORDER_TYPE`, `CLOB_FEE_RATE_BPS`) so API changes can be rolled via env/config.
- Contract drift guard added: `scripts/ops/check-clob-contract.mjs` and wired as required gate `clob-contract` in `ops/release-gates.json`.

## Phase 1A–3B Delivery Snapshot
1. 1A (reactive scans + category/timeframe): Implemented in `MarketClient.tsx` + `app/api/market/scan/route.ts` with debounce preview behavior and normalized expanded focus areas.
2. 1B (cron + lock): Implemented in `app/api/market/scheduler/tick/route.ts` and `supabase/migrations/20260306_market_robot_phase_1a_3b.sql`.
3. 2A (wallet readiness flow): Implemented in `MarketClient.tsx` and `lib/wagmi-config.ts` (injected/Coinbase/WalletConnect, approval flow and checklist states).
4. 2B/3A (risk directives + execution safeguards): Implemented in `app/api/market/directives/route.ts`, `lib/market/scheduler.ts`, and `app/api/market/buy/route.ts`.
5. 3B (visibility + logs): Implemented with `app/api/market/logs/route.ts` and scheduler log persistence.

## Validation Status
- TypeScript and targeted `get_errors` checks pass on changed market files.
- File-size regression gate now passes after decomposition/extraction (`MarketClient`, scheduler, scan, buy, directives UI split).
- Required CLOB contract check passes (`node scripts/ops/check-clob-contract.mjs`).
- Independent required checks (`npx tsc --noEmit`, `node scripts/ops/check-build-stability.mjs`) run clean after CLOB hardening.

## Access Gate (Canonical)
- Gate by `hasInternalAccess`.
- Never gate through tier entitlements.

## MVP Scope
1. Reliable market feed + watchlists.
2. Signal interpretation and recommendation surface.
3. Action logging and operator workflows.
4. Interop into CEO reporting flows.

## Data Contracts
- `MarketSignal`, `WatchItem`, `MarketAction`, `PerformanceSnapshot`.

## API Plan
- Maintain existing market APIs; formalize action/audit endpoints.

## Customization Requirements
- Movable signal widgets.
- Expandable strategy panels.
- Saved watchlist and layout presets per user.

## Dependencies
- Existing market providers and secure key handling.

## Definition of Done
- Operators can monitor, decide, and track outcomes in one place.
- Custom layouts persist and reset cleanly.
