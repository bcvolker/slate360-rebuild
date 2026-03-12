# Market Robot Env And Tool Matrix

Last Updated: 2026-03-12

## Vercel Env Diagnostic — 2026-03-12 (read/verify-only)

- Scope: verify why `NEXT_PUBLIC_POLYMARKET_SPENDER` still fails `npm run diag:market-runtime`.
- Terminal state in this session: blocked by `ENOPRO`, so direct execution of:
	- `vercel env ls production`
	- `vercel env ls preview`
	- `vercel env pull --environment=production --yes`
	- `vercel env run -e production -- npm run diag:market-runtime`
	could not be rerun from this chat.
- Verified Vercel project link from local artifact:
	- `.vercel/project.json` shows linked project `slate360-rebuild` under team `team_sI0m72uIMs2FPbYIlkgp7RRS`.
- Verified latest local Vercel env snapshot (created by Vercel CLI):
	- `.env.vercel.tmp` exists and includes many `NEXT_PUBLIC_*` and `POLYMARKET_*` keys.
	- `NEXT_PUBLIC_POLYMARKET_SPENDER` is not present in `.env.vercel.tmp`.
	- `NEXT_PUBLIC_POLYMARKET_SPENDER` is also not present in `.env.local`.
- Interpretation:
	- If Vercel UI shows the variable as added, but a fresh production pull still omits it, the likely causes are:
		1. Variable added to a different environment scope/team/project.
		2. Variable saved after the last pull/diagnostic and not yet re-pulled in this workspace.
		3. Production deployment was built before the variable was available, so runtime/build output is still stale.
	- For this app, `NEXT_PUBLIC_*` values are build-time client envs, so a redeploy is normally required after adding/changing them.

## Environment Variables

| Variable name | Where referenced | Required for practice mode? | Required for live mode? | Current status | Risk if wrong | Verification notes |
| --- | --- | --- | --- | --- | --- | --- |
| NEXT_PUBLIC_POLYMARKET_SPENDER | [lib/hooks/useMarketWalletState.ts](/workspaces/slate360-rebuild/lib/hooks/useMarketWalletState.ts), [app/api/market/system-status/route.ts](/workspaces/slate360-rebuild/app/api/market/system-status/route.ts) | No | Yes | Missing in `diag:market-runtime`; missing in raw shell env | Approval and allowance checks fail; live wallet path blocked | Confirmed failing blocker by `npm run diag:market-runtime` |
| MARKET_SCHEDULER_SECRET | [app/api/market/scheduler/tick/route.ts](/workspaces/slate360-rebuild/app/api/market/scheduler/tick/route.ts) | No | No, but required for background automation | Unknown in raw shell; not needed because `CRON_SECRET` was detected | Scheduler tick rejects unauthorized requests | Tick route accepts either this or `CRON_SECRET` |
| CRON_SECRET | [app/api/market/scheduler/tick/route.ts](/workspaces/slate360-rebuild/app/api/market/scheduler/tick/route.ts) | No | No, but required for background automation | Present in diagnostic context | Scheduler tick rejects cron calls if secret mismatch | `diag:market-runtime` reported `using CRON_SECRET` |
| POLYMARKET_API_KEY | [app/api/market/buy/route.ts](/workspaces/slate360-rebuild/app/api/market/buy/route.ts), [app/api/market/system-status/route.ts](/workspaces/slate360-rebuild/app/api/market/system-status/route.ts) | No | Yes | Present in diagnostic context; missing in raw shell env | Backend downgrades live buy to fallback or cannot place live orders | `diag:market-runtime` passed it |
| POLYMARKET_API_SECRET | [app/api/market/buy/route.ts](/workspaces/slate360-rebuild/app/api/market/buy/route.ts), [app/api/market/system-status/route.ts](/workspaces/slate360-rebuild/app/api/market/system-status/route.ts) | No | Yes | Present in diagnostic context; missing in raw shell env | Same as above | `diag:market-runtime` passed it |
| POLYMARKET_API_PASSPHRASE | [app/api/market/buy/route.ts](/workspaces/slate360-rebuild/app/api/market/buy/route.ts), [app/api/market/system-status/route.ts](/workspaces/slate360-rebuild/app/api/market/system-status/route.ts) | No | Yes | Present in diagnostic context; missing in raw shell env | Same as above | `diag:market-runtime` passed it |
| POLYMARKET_CLOB_HOST | [app/api/market/buy/route.ts](/workspaces/slate360-rebuild/app/api/market/buy/route.ts) | No | Optional override | Unset | If wrong, live buy points at wrong host | Route falls back to `https://clob.polymarket.com` |
| POLYMARKET_CLOB_ORDER_PATH | [app/api/market/buy/route.ts](/workspaces/slate360-rebuild/app/api/market/buy/route.ts) | No | Optional override | Unset | Wrong path breaks live order submission | Route defaults to `/order` |
| POLYMARKET_CLOB_ORDER_TYPE | [app/api/market/buy/route.ts](/workspaces/slate360-rebuild/app/api/market/buy/route.ts) | No | Optional override | Unset | Wrong order type could reject live orders | Route defaults to `GTC` |
| POLYMARKET_CLOB_FEE_RATE_BPS | [app/api/market/buy/route.ts](/workspaces/slate360-rebuild/app/api/market/buy/route.ts) | No | Optional override | Unset | Wrong fee assumptions can distort execution | Route defaults to `200` |
| MARKET_SCHEDULER_MIN_INTERVAL_SECONDS | [app/api/market/scheduler/health/route.ts](/workspaces/slate360-rebuild/app/api/market/scheduler/health/route.ts), [lib/market/scheduler-utils.ts](/workspaces/slate360-rebuild/lib/market/scheduler-utils.ts) | No | No | Unset | Scheduler cadence floor may not match intent | Defaults exist in code |
| MARKET_SCHEDULER_MAX_INTERVAL_SECONDS | [app/api/market/scheduler/health/route.ts](/workspaces/slate360-rebuild/app/api/market/scheduler/health/route.ts), [lib/market/scheduler-utils.ts](/workspaces/slate360-rebuild/lib/market/scheduler-utils.ts) | No | No | Unset | Scheduler cadence ceiling may not match intent | Defaults exist in code |
| MARKET_SCHEDULER_DEFAULT_BUYS_PER_DAY | [app/api/market/scheduler/health/route.ts](/workspaces/slate360-rebuild/app/api/market/scheduler/health/route.ts), [lib/market/scheduler-utils.ts](/workspaces/slate360-rebuild/lib/market/scheduler-utils.ts) | No | No | Unset | Default run frequency may differ from expected behavior | Defaults exist in code |
| MARKET_SCHEDULER_MAX_USERS_PER_TICK | [lib/market/scheduler-utils.ts](/workspaces/slate360-rebuild/lib/market/scheduler-utils.ts) | No | No | Unknown in runtime; missing in raw shell env | Throughput and backlog risk at scale | Not checked by current diagnostic script |
| MARKET_SCHEDULER_CONCURRENCY | [lib/market/scheduler-utils.ts](/workspaces/slate360-rebuild/lib/market/scheduler-utils.ts) | No | No | Unknown in runtime; missing in raw shell env | Tick load and concurrency behavior may drift | Not checked by current diagnostic script |
| MARKET_SCHEDULER_MAX_TRADES_PER_SCAN | [lib/market/scheduler-utils.ts](/workspaces/slate360-rebuild/lib/market/scheduler-utils.ts) | No | No | Unknown in runtime; missing in raw shell env | Caps scheduler execution throughput | Not checked by current diagnostic script |
| MARKET_SCHEDULER_MAX_MARKET_LIMIT | [lib/market/scheduler-utils.ts](/workspaces/slate360-rebuild/lib/market/scheduler-utils.ts) | No | No | Unknown in runtime; missing in raw shell env | Caps market fetch scope and performance | Not checked by current diagnostic script |
| MARKET_SCHEDULER_DEFAULT_CAPITAL_USD | [lib/market/scheduler-utils.ts](/workspaces/slate360-rebuild/lib/market/scheduler-utils.ts) | No | No | Unknown in runtime; missing in raw shell env | Fallback sizing may be misleading | Not checked by current diagnostic script |
| MARKET_SCHEDULER_MAX_POSITION_USD | [lib/market/scheduler-utils.ts](/workspaces/slate360-rebuild/lib/market/scheduler-utils.ts) | No | No | Unknown in runtime; missing in raw shell env | Per-trade caps may differ from expectation | Not checked by current diagnostic script |
| MARKET_MAX_OPEN_POSITIONS | [app/api/market/buy/route.ts](/workspaces/slate360-rebuild/app/api/market/buy/route.ts), [app/api/market/system-status/route.ts](/workspaces/slate360-rebuild/app/api/market/system-status/route.ts) | Yes | Yes | Unknown in runtime; missing in raw shell env | Incorrect cap can block or over-allow positions | User-specific cap resolver can override this fallback |
| POLYMARKET_WHALE_USERS | [app/api/market/whales/route.ts](/workspaces/slate360-rebuild/app/api/market/whales/route.ts) | No | No | Missing in raw shell env | Whale feed route may be empty or misleading | Route is not part of the rescue-critical path |

## Tool / Access Matrix

| Tool / access | Status | Verification notes |
| --- | --- | --- |
| Git | Confirmed usable | `git` present, repo on `main` |
| GitHub CLI | Confirmed usable | `gh` present and authenticated |
| Vercel CLI | Partially verified this session | Local project link artifact exists, but terminal execution is currently blocked by `ENOPRO`, so live `vercel env ls/run` checks could not be rerun |
| Supabase CLI | Unavailable in container | `supabase` command missing |
| AWS CLI | Unavailable in container | `aws` command missing |
| kubectl | Installed, auth unknown | `kubectl` binary present, no cluster auth check run |
| GitNexus | Confirmed usable | Repo indexed and queryable |
| Market runtime diagnostic | Confirmed usable | `npm run diag:market-runtime` ran and isolated the spender blocker |
| Typecheck | Confirmed usable | `npm run typecheck` ran without reported errors |
| ripgrep | Unavailable in container | `rg` command missing; use workspace search tools instead |

## Interpretation Notes
- Do not treat raw shell `printenv` output as authoritative for Next.js runtime env visibility in this repo.
- The diagnostic script is the stronger signal for local repo/runtime availability because it resolved the CLOB and scheduler secrets successfully.
- The single confirmed current live blocker is the missing spender address. That must remain visible in the rescue UI until corrected.