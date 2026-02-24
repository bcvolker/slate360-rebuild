# Market Robot / Polymarket Diagnostic Handoff (Feb 23, 2026)

## 1) User Goal and Current Failure Pattern

User goal:
- Run reliable paper-mode strategy testing.
- Configure directives that can execute large volumes of buys within strict parameters.
- Progress toward live Polymarket connectivity when ready.

Observed failures:
- UI appears non-functional/inconsistent across bot controls, directives, whale watch, and trade history.
- Paper mode does not behave like a persistent autonomous bot.
- Live connectivity is not actually end-to-end enabled.

---

## 2) Confirmed Architecture Map

### UI entrypoints
- `app/market/page.tsx` (standalone Market Robot page)
- `components/dashboard/MarketClient.tsx` (all bot/dashboard/directive/trade UI)

### API surface
- `GET /api/market/polymarket` → `app/api/market/polymarket/route.ts`
- `GET /api/market/whales` → `app/api/market/whales/route.ts`
- `POST /api/market/scan` → `app/api/market/scan/route.ts`
- `GET/POST /api/market/trades` → `app/api/market/trades/route.ts`
- `POST /api/market/buy` → `app/api/market/buy/route.ts`
- `GET/POST /api/market/bot-status` → `app/api/market/bot-status/route.ts`
- `POST /api/market/wallet-connect` → `app/api/market/wallet-connect/route.ts`

### Server logic
- `lib/market-bot.ts` (market fetch, opportunity scoring, decisioning, paper trade simulation)

### Supabase tables referenced in code
- `market_trades`
- `market_bot_settings`
- `market_bot_state` (legacy/partial reference in docs; not in active API routes)

### Migration coverage present in repo
- `supabase/migrations/20260222000000_market_bot_settings.sql`
  - Creates `market_bot_settings`
  - Enables RLS and basic SELECT/UPDATE/INSERT policies for own `user_id`

Migration coverage missing in repo (for active runtime tables):
- No local migration found for `market_trades`
- No local migration found for `market_bot_state`

---

## 3) Confirmed Runtime Evidence (This Session)

### Route smoke (local Next server)
- `GET /api/market/polymarket?limit=1&active=true&closed=false` → `200` (Gamma reachable)
- `GET /api/market/whales` → `502` body `{"error":"Upstream error","status":400}`
- `POST /api/market/scan` (no auth session) → `401` body `{"error":"Unauthorized"}`

### Direct upstream network checks
- `https://gamma-api.polymarket.com/markets?...` → `200`
- `https://data-api.polymarket.com/activity?limit=1&side=BUY` → `400` (`required query param 'user' not provided`)

### Environment key inventory (`.env.local` keys only, no values)
Present:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ACCESS_TOKEN`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`
- `SLATEDROP_S3_BUCKET`

Missing for live Polymarket CLOB mode:
- `POLYMARKET_API_KEY`
- `POLYMARKET_API_SECRET`
- `POLYMARKET_API_PASSPHRASE`
- (optional) `POLYMARKET_CLOB_HOST`

### Supabase table existence check (service role)
- `market_trades`: exists
- `market_bot_settings`: exists
- `market_bot_state`: exists

---

## 4) Root-Cause Findings (Why It Still Feels Non-Functional)

## A) Whale Watch endpoint is wired to a broken upstream query
- `app/api/market/whales/route.ts` calls:
  - `https://data-api.polymarket.com/activity?limit=50&side=BUY&minAmount=5000`
- Upstream currently responds `400` requiring `user` query parameter.
- Result: Whale Watch tab fails and falls back inconsistently.

## B) Live buy path is not implemented end-to-end
- `app/api/market/buy/route.ts` has CLOB submission logic commented.
- If credentials are missing, it silently stores as paper fallback.
- If credentials are present, code still returns `501 live_pending`.
- Result: live mode cannot execute real orders yet.

## C) Wallet connect does not provision CLOB API credentials
- `app/api/market/wallet-connect/route.ts` only verifies signature and stores wallet address in user metadata.
- It does not create/store Polymarket CLOB API key/secret/passphrase.
- Result: wallet “verified” does not unlock live trading.

## D) Bot “start” is a one-shot scan, not continuous automation
- `handleStartBot` in `components/dashboard/MarketClient.tsx` only calls `runScan()` once.
- No scheduler/worker/queue/cron loop exists for recurring execution.
- Result: user expectation of autonomous repeated buying is unmet.

## E) Directive system is UI-local only (not backend-executed)
- Directives are saved to `localStorage` (`slate360_directives`).
- No API route persists directives or executes them server-side.
- `buys_per_day` is never enforced by backend automation.
- Result: directives do not drive real trade execution.

## F) Bot control settings are largely ignored by server scan logic
- UI sends many scan params (`max_positions`, `capital_per_trade`, `min_edge`, `min_volume`, etc.).
- `app/api/market/scan/route.ts` only merges/uses `paper_mode`, `whale_follow`, and `focus_areas` from request.
- `lib/market-bot.ts` uses internal decision limits independent of most UI controls.
- Result: changing several UI knobs appears to do nothing.

## G) Hard-coded decision limits block “large numbers of buys”
- `lib/market-bot.ts`:
  - max `3` trades per scan
  - per-trade cap around `$50`
- `app/api/market/buy/route.ts` validates amount `$1` to `$10,000`
- Result: current architecture cannot generate high-frequency/high-volume directive execution.

## H) Status model mismatch can produce confusing control behavior
- UI writes `paused` via `/api/market/bot-status`.
- Bot config type only models `stopped | running | paper` in `lib/market-bot.ts`.
- Scan gate blocks only `stopped`; `paused` is not treated as blocked state.
- Result: pause/resume semantics are inconsistent.

## I) Trade shape mismatch risk between DB rows and UI expectations
- UI `MarketTrade` expects fields like `market_title`, `avg_price`, `current_price`.
- API inserts into columns named `question`, `price`, `total`, etc.
- Unless DB view/transform maps fields, parts of UI may render undefined values.
- Result: trade display and downstream calculations can appear broken.

## J) Access gate can hide feature from intended testers
- `app/market/page.tsx` is gated to `slate360ceo@gmail.com` only.
- Non-CEO users are redirected to dashboard.
- Result: team testing can appear as non-functional access/connectivity.

---

## 5) Supabase and S3 Backend Confirmation

Supabase confirmed in use for market robot:
- Auth gate on almost all market routes (`supabase.auth.getUser()`)
- Data persistence in `market_trades`, `market_bot_settings`
- Wallet metadata persisted on `auth.users.user_metadata.marketBotConfig`

S3/AWS in market robot path:
- No market route (`app/api/market/**`) reads/writes S3 objects.
- Current market robot failures are not caused by SlateDrop S3 bucket connectivity.
- AWS keys are present in `.env.local` but currently irrelevant to market order execution path.

---

## 6) High-Priority Fix Plan (for next assistant)

1. Fix whale upstream integration
- Update `app/api/market/whales/route.ts` to use a valid Polymarket Data API query contract.
- Add fallback to Gamma-derived recent/active high-volume markets if whale API fails.

2. Normalize data contract across UI/API/DB
- Create a strict shared type for trade payload + DB row mapping.
- Ensure API responses include `market_title`, `avg_price`, `current_price` if UI expects them.

3. Implement real directive backend (not localStorage)
- Add table + migration for directives.
- Add CRUD API for directives.
- Add execution engine that reads directives and schedules buys.

4. Implement scheduler/executor
- Add recurring worker (cron/job queue/background task) for continuous scans and trade attempts.
- Respect `buys_per_day`, risk caps, and budget constraints server-side.

5. Bring live CLOB mode to executable state
- Implement actual order submission path (currently commented) in `app/api/market/buy/route.ts`.
- Add secure credential storage/rotation flow and deterministic credential checks.

6. Align status model
- Standardize `stopped|running|paused|paper` across UI + DB + scan gate.

7. Remove/soften CEO-only gate for QA
- Replace hard-coded email gate with role/feature-flag policy.

---

## 7) Suggested Validation Matrix

Paper mode:
1. Start bot
2. Verify scan executes and creates rows in `market_trades`
3. Verify trade history renders with correct field mapping
4. Verify directives persist across sessions and affect execution
5. Verify multiple scheduled runs occur without manual clicks

Whale watch:
1. Endpoint returns `200`
2. UI table populates non-empty entries
3. Filters work

Live mode:
1. Wallet verify success
2. Credentials present and validated
3. Buy request reaches CLOB submission path
4. Order receipt persisted with status transitions

Load/scale for “large numbers of buys”:
1. Backpressure/queue safety
2. Rate limits and retries
3. Max-per-day + max-loss constraints respected under burst traffic

---

## 8) Minimal SQL Checks for Next Assistant

```sql
-- existence and row counts
select 'market_trades' as table_name, count(*) from public.market_trades
union all
select 'market_bot_settings', count(*) from public.market_bot_settings
union all
select 'market_bot_state', count(*) from public.market_bot_state;

-- most recent trades for visual contract check
select *
from public.market_trades
order by created_at desc
limit 20;

-- bot status rows
select *
from public.market_bot_settings
order by updated_at desc
limit 20;
```

---

## 9) Bottom Line

This is currently a partially wired prototype:
- Paper trade writes exist.
- Core market fetch works.
- But directives are local-only, bot automation is one-shot, whale integration is broken, and live CLOB execution is not actually implemented.

That is why the UI appears non-functional for strategy automation and large-volume directive execution.

---

## 10) Implementation Update (Feb 23, 2026 — follow-up pass)

Completed in this pass:

1. Whale endpoint contract repair + fallback hardening
- Updated `app/api/market/whales/route.ts`.
- Route now uses authenticated user context and queries Polymarket Data API with the required `user` parameter.
- Source wallets are taken from:
  - `user.user_metadata.marketBotConfig.walletAddress` (if present), and
  - optional env `POLYMARKET_WHALE_USERS` (comma-separated).
- Filters BUY activity to large orders (`amount >= 5000`).
- If no whale rows are available, route falls back to Gamma-derived synthetic flow entries instead of throwing `502` for the UI path.

2. Server-side directives scaffold added
- Added migration: `supabase/migrations/20260223120000_market_directives.sql`.
- New table: `public.market_directives` with user ownership, timestamps, and RLS policies for SELECT/INSERT/UPDATE/DELETE on own rows.
- Added API CRUD route: `app/api/market/directives/route.ts` (`GET`, `POST`, `PATCH`, `DELETE`).

3. Directives UI wired to backend with local fallback
- Updated `components/dashboard/MarketClient.tsx`.
- Directives now load from `/api/market/directives` on mount.
- Save/Edit now call API (`POST`/`PATCH`), delete calls `DELETE`.
- Existing `localStorage` behavior remains as fallback if API/migration is unavailable.

4. Beginner-friendly currency + what-if UX
- Added display currency selector (`USD/EUR/GBP/CAD/AUD/JPY`) in Market header.
- Added FX conversion fetch (`open.er-api.com`) with graceful fallback.
- Added display-currency value hints on directive/buy amount areas.
- Added explicit “What-if scenarios” blocks in both buy panels (Markets + Hot Opps):
  - selected outcome resolves true,
  - opposite outcome resolves true,
  - early exit on +10% price move.

Validation evidence:
- TypeScript check: `npx tsc --noEmit` exit code `0`.
- VS Code file diagnostics on modified files: no compile errors.

Remaining constraints after this pass:
- Live CLOB order submission is still not implemented end-to-end in `app/api/market/buy/route.ts`.
- Continuous scheduler/executor for directives is still pending (this pass adds persistence scaffold, not autonomous execution loop).

---

## 11) SQL Submit + Backend Verification (Feb 23, 2026, continuation)

User requested direct SQL-level verification and correction. This was performed using Supabase Management API SQL query endpoint (`POST /v1/projects/{ref}/database/query`) with `SUPABASE_ACCESS_TOKEN`.

### What was found
- `public.market_directives` did **not** exist in the live database at first check.
- This explains why API-level directives persistence would fail despite local code + migration file existing in repo.

### What was done
1. Submitted full migration SQL from:
   - `supabase/migrations/20260223120000_market_directives.sql`
2. Re-ran SQL checks for:
   - table existence,
   - expected columns,
   - RLS enabled,
   - policy presence,
   - write path (insert/update/delete smoke).

### SQL validation result
```json
{
  "tableExists": true,
  "columnCount": 13,
  "rlsEnabled": true,
  "policyCount": 4,
  "writeSmoke": {
    "insertOk": true,
    "updateOk": true,
    "deleteOk": true
  }
}
```

### Route smoke notes
- Local route smoke against `http://localhost:3000/api/market/directives` and `http://localhost:3000/api/market/whales` still returns `401` without a browser session cookie.
- Attempted bearer-token route smoke with a temporary Supabase user JWT also returned `401` in this app runtime, indicating current server auth path is cookie-session based for these routes in local testing.
- Therefore, DB/backend correctness is now confirmed via direct SQL and write tests; remaining route-level verification should be completed in-browser with an authenticated app session.

---

## 12) 2-Minute Authenticated Browser QA (Final Confirmation)

Use this after signing into the app normally in browser (cookie session established):

1. Open `/market` and go to **Directives** tab.
  - Expected: existing directives load (or empty state, but no error).

2. Create a directive (name + amount + timeframe + strategy), click save.
  - Expected: directive appears immediately in saved list.

3. Edit the same directive and save changes.
  - Expected: card updates with new values.

4. Delete that directive.
  - Expected: card disappears from list.

5. Switch to **Whale Watch** and click refresh.
  - Expected: endpoint responds without 502; table loads either large-trade rows (if configured wallets produce data) or fallback synthetic flow rows.

6. Switch currency in header (USD/EUR/GBP etc.) and open a buy panel.
  - Expected: display values and what-if scenarios recalculate in selected currency.

If any step fails, capture:
- browser URL,
- timestamp,
- exact error text,
- network response body for failing `/api/market/*` call.

That evidence is sufficient for targeted follow-up fixes.

---

## 13) Release Changelog (Feb 24, 2026)

### Commit `0f45cf7` — Add market burst report exports and runbook guidance

Scope:
- Added paper-mode burst benchmark harness:
  - `scripts/market-burst-test.mjs`
- Added npm script:
  - `market:burst:test` in `package.json`
- Added high-volume runbook and benchmarking guidance:
  - `README.md`

Highlights:
- Burst scheduler tick benchmarking against `/api/market/scheduler/tick`
- Configurable request count, concurrency, timeout, delay
- Persistent export support for strategy trend analysis:
  - `OUTPUT_FORMAT=none|json|csv`
  - `OUTPUT_FILE=...`

### Commit `b625327` — Finalize market robot scheduler, contracts, and API/UI alignment

Scope:
- Added scheduler endpoints:
  - `app/api/market/scheduler/tick/route.ts`
  - `app/api/market/scheduler/health/route.ts`
- Added summary endpoint:
  - `app/api/market/summary/route.ts`
- Added shared market contracts and mappers:
  - `lib/market/contracts.ts`
  - `lib/market/mappers.ts`
- Added scheduler execution engine:
  - `lib/market/scheduler.ts`
- Updated market API routes and dashboard UI for normalized envelopes/contracts and runtime state integration.
- Added runtime/trade migration coverage:
  - `supabase/migrations/20260224093000_market_trades.sql`
  - `supabase/migrations/20260224123000_market_bot_runtime.sql`
  - `supabase/migrations/20260224170000_market_bot_runtime_state.sql`

Highlights:
- Throughput/scalability hardening (bounded scheduler concurrency, market fetch caching, larger bounded limits)
- Improved scan request parsing and server-side enforcement for strategy controls
- Beginner-friendly control center and scheduler health UX with explanatory hover tips
- Better trade/whale/market shape normalization across API + UI

Repository state:
- Both commits are pushed to `main`.