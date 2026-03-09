# Market Robot — market_plans Migration And Enforcement Matrix

Last updated: 2026-03-09
Purpose: Show what exists today, what the canonical future model should be, and which automation fields are persisted versus actually enforced.

## 1. Current State

Today, automation state is fragmented across three layers:

1. localStorage plans via `useMarketAutomationState.ts`
2. legacy `market_directives`
3. auth `user_metadata.marketBotConfig`

That fragmentation is the main reason plan fidelity is difficult to reason about.

## 2. Target State

Introduce a first-class `market_plans` table and make it the canonical server-side source of truth.

Recommended responsibilities:

- `market_plans`: user-authored plan definitions
- `market_plan_runs` or activity log rows: execution history
- `market_bot_runtime`: current runtime status
- `market_bot_runtime_state`: daily counters and runtime telemetry

## 3. Suggested market_plans Schema

Suggested columns:

- `id uuid primary key`
- `user_id uuid not null`
- `name text not null`
- `mode text not null`
- `budget numeric not null`
- `risk_level text not null`
- `categories text[] not null default '{}'`
- `scan_mode text not null`
- `max_trades_per_day integer not null`
- `max_daily_loss numeric not null`
- `max_open_positions integer not null`
- `max_pct_per_trade numeric not null`
- `fee_alert_threshold numeric not null`
- `cooldown_after_loss_streak integer not null`
- `large_trader_signals boolean not null default false`
- `closing_soon_focus boolean not null default false`
- `slippage numeric not null`
- `minimum_liquidity numeric not null`
- `maximum_spread numeric not null`
- `fill_policy text not null`
- `exit_rules text not null`
- `is_default boolean not null default false`
- `is_archived boolean not null default false`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Optional derived/runtime snapshot column:

- `runtime_config jsonb not null default '{}'`

## 4. Migration Strategy

### Phase 1 — Add table without breaking current runtime

- create `market_plans`
- keep `market_directives` read/write alive
- keep `user_metadata.marketBotConfig` alive

### Phase 2 — Dual write

- plan create/update writes to `market_plans`
- compatibility layer still syncs minimal directive/runtime state for the scheduler

### Phase 3 — Scheduler migration

- scheduler reads canonical plan + runtime config from `market_plans`
- directives become legacy compatibility only

### Phase 4 — Remove fragmentation

- localStorage becomes cache, not source of truth
- directives no longer primary
- metadata only holds lightweight runtime state if still needed

## 5. Enforcement Matrix

Legend:

- `UI`: present in plan builder
- `Stored`: persisted somewhere today
- `Runtime`: carried into runtime config
- `Enforced`: materially affects execution today

| Field | UI | Stored | Runtime | Enforced | Notes |
|---|---|---|---|---|---|
| `budget` | yes | yes | yes | yes | affects allocation and sizing |
| `riskLevel` | yes | yes | yes | yes | mapped into risk mix and thresholds |
| `categories` | yes | yes | yes | yes, partly | works, but category vocabulary is inconsistent |
| `scanMode` | yes | yes | partly | partly | converted to coarse timeframe; not a full scheduler window model |
| `maxTradesPerDay` | yes | yes | yes | yes | used in client scan and scheduler cadence |
| `mode` | yes | yes | yes | yes | practice vs real |
| `maxDailyLoss` | yes | yes | yes | yes | used in guards |
| `maxOpenPositions` | yes | yes | yes | partly | intended in scheduler, but needs continued verification and simplification |
| `maxPctPerTrade` | yes | yes | yes | yes, partly | share caps apply, but direct buy path is not unified with automation policy |
| `feeAlertThreshold` | yes | yes | yes | weak | mostly informational today |
| `cooldownAfterLossStreak` | yes | yes | yes | yes, partly | mapped to auto-pause losing days |
| `largeTraderSignals` | yes | yes | yes | weak | toggle exists, but true whale strategy behavior is limited |
| `closingSoonFocus` | yes | yes | yes | partly | forces shorter timeframe, but not a rich time-window execution model |
| `slippage` | yes | yes | yes | no meaningful live enforcement yet | needs explicit live execution integration |
| `minimumLiquidity` | yes | yes | yes | yes | used in filtering |
| `maximumSpread` | yes | yes | yes | questionable | current enforcement semantics should be reviewed |
| `fillPolicy` | yes | yes | yes | weak | not meaningfully mapped to order placement behavior |
| `exitRules` | yes | yes | yes | no | no real exit engine yet |
| `takeProfitPct` | indirect default | yes | yes | partly | persisted and attached to trades, but exit lifecycle is incomplete |
| `stopLossPct` | indirect default | yes | yes | partly | persisted and attached to trades, but exit lifecycle is incomplete |

## 6. What Another Assistant Should Build Next

### If the goal is plan correctness

1. Add `market_plans`.
2. Make the plan list server-backed.
3. Add an explicit server-side serializer from `market_plans` to runtime config.
4. Audit each field against actual execution logic.

### If the goal is execution correctness

1. Unify direct buy and automation sizing rules.
2. Implement real slippage/fill policy behavior for live orders.
3. Implement explicit exit logic if exit controls remain visible.
4. Remove or hide fields that are not truly enforced.
