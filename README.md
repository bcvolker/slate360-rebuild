This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Market Robot High-Volume Runbook

This project includes a paper-mode burst harness for testing scheduler throughput and strategy behavior under load.

### 1) Required env for scheduler burst tests

- `MARKET_SCHEDULER_SECRET` (required by `/api/market/scheduler/tick`)
- `MARKET_SCHEDULER_MAX_USERS_PER_TICK`
- `MARKET_SCHEDULER_CONCURRENCY`
- `MARKET_SCHEDULER_MAX_TRADES_PER_SCAN`
- `MARKET_SCHEDULER_MAX_MARKET_LIMIT`
- `MARKET_SCHEDULER_MIN_INTERVAL_SECONDS`
- `MARKET_SCHEDULER_MAX_INTERVAL_SECONDS`
- `MARKET_SCAN_MAX_MARKET_LIMIT`
- `MARKET_BUY_MIN_USD`
- `MARKET_BUY_MAX_USD`

### 2) Volume profiles (starting points)

Low volume:

```bash
MARKET_SCHEDULER_MAX_USERS_PER_TICK=50
MARKET_SCHEDULER_CONCURRENCY=6
MARKET_SCHEDULER_MAX_TRADES_PER_SCAN=80
MARKET_SCHEDULER_MAX_MARKET_LIMIT=2000
MARKET_SCAN_MAX_MARKET_LIMIT=2000
```

Medium volume:

```bash
MARKET_SCHEDULER_MAX_USERS_PER_TICK=150
MARKET_SCHEDULER_CONCURRENCY=12
MARKET_SCHEDULER_MAX_TRADES_PER_SCAN=250
MARKET_SCHEDULER_MAX_MARKET_LIMIT=5000
MARKET_SCAN_MAX_MARKET_LIMIT=5000
```

High volume (paper-mode benchmark profile):

```bash
MARKET_SCHEDULER_MAX_USERS_PER_TICK=300
MARKET_SCHEDULER_CONCURRENCY=24
MARKET_SCHEDULER_MAX_TRADES_PER_SCAN=600
MARKET_SCHEDULER_MAX_MARKET_LIMIT=8000
MARKET_SCAN_MAX_MARKET_LIMIT=12000
```

### 3) Run burst benchmark

Start app server in one terminal:

```bash
npm run dev
```

Run burst benchmark in another terminal:

```bash
MARKET_BASE_URL=http://localhost:3000 \
MARKET_SCHEDULER_SECRET=your_secret \
BURST_REQUESTS=60 \
BURST_CONCURRENCY=12 \
BURST_TIMEOUT_MS=30000 \
npm run market:burst:test
```

Optional tuning flags:

- `BURST_DELAY_MS` (default `0`)
- `BURST_REQUESTS` (default `30`)
- `BURST_CONCURRENCY` (default `6`)
- `BURST_TIMEOUT_MS` (default `30000`)

Result export flags:

- `OUTPUT_FORMAT` (`none` | `json` | `csv`, default `none`)
- `OUTPUT_FILE` (required when `OUTPUT_FORMAT` is `json` or `csv`)

Example JSON export:

```bash
MARKET_BASE_URL=http://localhost:3000 \
MARKET_SCHEDULER_SECRET=your_secret \
BURST_REQUESTS=80 \
BURST_CONCURRENCY=16 \
OUTPUT_FORMAT=json \
OUTPUT_FILE=tmp/market-burst/run-$(date +%Y%m%d-%H%M%S).json \
npm run market:burst:test
```

Example CSV export:

```bash
MARKET_BASE_URL=http://localhost:3000 \
MARKET_SCHEDULER_SECRET=your_secret \
BURST_REQUESTS=80 \
BURST_CONCURRENCY=16 \
OUTPUT_FORMAT=csv \
OUTPUT_FILE=tmp/market-burst/run-$(date +%Y%m%d-%H%M%S).csv \
npm run market:burst:test
```

### 4) How to interpret results

- `Success Rate` should stay near 100% for stable operation.
- `Latency p95` should remain predictable when increasing concurrency.
- `Trade Throughput` helps compare config changes for strategy data collection.
- If failures appear, check the printed failure breakdown and scheduler runtime state (`last_error`, `last_error_at`).

### 5) Safety notes for burst testing

- Run burst tests in paper mode only.
- Start with medium profile, then move to high profile in increments.
- Increase one variable at a time (concurrency, users/tick, or trades/scan) so performance deltas are attributable.
- Keep `MARKET_BUY_MAX_USD` conservative during research to avoid unrealistic simulations.

## Billing Environment Variables

To enable subscription checkout, credit purchases, and billing portal access, set:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_APP_URL` (for success/cancel redirects)
- `STRIPE_PRICE_CREATOR_MONTHLY`
- `STRIPE_PRICE_CREATOR_ANNUAL`
- `STRIPE_PRICE_MODEL_MONTHLY`
- `STRIPE_PRICE_MODEL_ANNUAL`
- `STRIPE_PRICE_BUSINESS_MONTHLY`
- `STRIPE_PRICE_BUSINESS_ANNUAL`
- `STRIPE_PRICE_CREDITS_STARTER`
- `STRIPE_PRICE_CREDITS_GROWTH`
- `STRIPE_PRICE_CREDITS_PRO`

Stripe webhook endpoint:

- `POST /api/stripe/webhook`

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
