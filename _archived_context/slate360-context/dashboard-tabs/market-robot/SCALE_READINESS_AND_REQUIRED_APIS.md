# Market Robot — Scale Readiness And Required APIs

Last updated: 2026-03-09
Purpose: Explain what the current Market Robot stack can handle, what it cannot handle yet, and which external APIs/credentials are still required for serious paper and live operation.

## 1. Current Readiness Summary

### What is ready enough now

- paper-mode trade persistence
- market scanning and direct-buy UX
- scheduler schema prerequisites
- Saved Markets backend table and UI path
- server-backed automation plan storage

### What is not ready for true scale yet

- high-frequency live execution
- thousands of buys through a single cron-loop scheduler
- queue-based retries and burst smoothing
- strict live slippage/fill-policy enforcement
- sophisticated order-book-aware opportunity selection

## 2. Current Throughput Constraints

The current backend is not built for thousands of buys in a production-grade way.

Main reasons:

1. `vercel.json` schedules a single cron tick every 5 minutes.
2. Scheduler execution is still centralized around one polling loop.
3. There is no durable queue, retry queue, or worker fan-out.
4. There is no explicit rate-limit management for large multi-user live execution bursts.
5. The current opportunity engine is heuristic and feed-driven, not an order-book-native execution model.

Practical result:

- the current architecture is suitable for continued paper-mode hardening and low-volume live validation
- it is not suitable for “thousands of Polymarket buys” without a worker/queue redesign

## 3. APIs And Credentials You Still Need

### Required for live Polymarket execution

You still need to obtain and configure:

1. `POLYMARKET_API_KEY`
2. `POLYMARKET_API_SECRET`
3. `POLYMARKET_API_PASSPHRASE`
4. `NEXT_PUBLIC_POLYMARKET_SPENDER`

You also need:

1. a funded Polygon wallet
2. USDC for trade capital
3. MATIC for gas

### Strongly recommended for better runtime reliability

1. a dedicated Polygon RPC provider key from Alchemy, QuickNode, or Infura
2. observability tooling for scheduler runs, queue latency, and failed live orders
3. a durable job/queue platform if you want high-volume automation

## 4. What The Current Frontend/Backend Setup Already Has

Frontend/backend strengths today:

- Next.js 15 app-router structure is good enough for Market UI iteration
- Supabase is sufficient for current trade/runtime tables
- Vercel cron is enough for low-volume periodic scheduler ticks
- current auth model and `canAccessMarket` gating are correct for the Market tab

Weak points for scale:

- Vercel cron is not a high-throughput trading engine
- no dedicated execution workers
- no queue fan-out
- no explicit live-order retry orchestration
- no throughput partitioning by user or strategy

## 5. What To Build For “Thousands Of Buys”

If the goal is truly high-volume automated execution, the next architecture should look like this:

1. Vercel or another scheduler emits lightweight enqueue events, not direct full scans.
2. A durable job queue stores pending scan and execution work.
3. Dedicated workers consume jobs, fetch markets, score candidates, and place orders.
4. Per-user concurrency controls and rate limits protect against runaway order floods.
5. Failed live orders are retried or dead-lettered with clear telemetry.

Good practical stack options:

1. Supabase + Upstash/QStash + dedicated worker service
2. Supabase + Redis queue + Fly.io/Render worker pool
3. Supabase + Temporal/trigger.dev style workflow engine for more durable orchestration

## 6. Recommended Near-Term Sequence

1. finish paper-mode verification end to end
2. validate one small live trade with real CLOB credentials
3. migrate scheduler reads to `market_plans`
4. unify direct-buy and automation execution policy
5. redesign scheduler into enqueue + worker model for high-volume execution
