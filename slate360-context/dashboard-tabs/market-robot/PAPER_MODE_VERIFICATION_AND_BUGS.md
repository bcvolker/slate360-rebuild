# Market Robot — Paper Mode Verification And Concrete Bug List

Last updated: 2026-03-09
Purpose: Record what is actually verified from this workspace, what is still blocked, and which Market Robot issues remain concrete rather than speculative.

## 1. What Was Verified

### 1.1 Compile status

- `npm run typecheck` passed on 2026-03-09.

### 1.2 Runtime prerequisite status

`npm run diag:market-runtime` results:

- Core Supabase env: pass
- Scheduler secret presence: pass
- `market_trades`: pass
- `market_directives`: pass
- `market_bot_runtime`: pass
- `market_bot_runtime_state`: pass
- `market_activity_log`: pass
- `market_scheduler_lock`: pass
- Live CLOB env: fail

Interpretation:

- Paper-mode backend prerequisites are present.
- Live-mode prerequisites are not present in this workspace because real Polymarket credentials are still missing.

## 2. What Could Not Be Fully Verified Here

These remain unverified from this workspace session because they require either a running local app, an authenticated browser session, or both.

- authenticated paper direct buy end-to-end
- authenticated apply-plan -> immediate scan -> paper trade persistence
- scheduler tick execution against a live authenticated Market user
- UI-level reproduction of the user's reported 500

Observed limitation during this session:

- nothing was listening on `127.0.0.1:3100` when local HTTP verification was attempted

## 3. Concrete Open Bugs

These are real code-level gaps, not just guesses.

### BUG-MR-001 — Direct Buy search is not reactive

Current behavior:

- `query` updates local state in `useMarketDirectBuyState.ts`
- the loaded table is filtered by timeframe/category/probability/edge/liquidity/volume/spread
- search text is only applied inside `fetchMarkets()`

Root cause:

- `filterAndSortMarkets()` does not receive `query`
- typing in the search box does not immediately re-filter the currently loaded market set

Fix:

- pass `query` into the filter layer and perform in-memory text matching against `title` and `category`
- keep refresh separate from search so the UI is both reactive and manually refreshable

### BUG-MR-002 — Timeframe UI is incomplete relative to supported logic

Current behavior:

- helper supports `hour`, `day`, `week`, `month`, `year`, `today`, `tomorrow`, `all`
- Direct Buy UI only exposes `All`, `Next Hour`, `Ends Today`, `This Week`, `This Month`

Fix:

- update the UI chips to the intended beginner-friendly set:
  - `Next Hour`
  - `Day`
  - `Week`
  - `Month`
  - `Year`
  - `All Time`

### BUG-MR-003 — “Show all markets” is not literally true yet

Current behavior:

- market fetch is capped by `MAX_MARKET_FETCH = 1000`
- page size is `25`
- this is fine for usability, but it is not the same as “show all markets”

Fix options:

1. Keep pagination, but make it explicit that all matched markets are paginated while fetch is capped.
2. Remove the 1000-market cap and implement progressive/infinite loading.
3. Add server-side pagination and search parameters to the proxy so “all markets” is scalable.

Recommended fix:

- implement server-side pagination or progressive loading instead of pretending the first 1000 records are the full universe

### BUG-MR-004 — Category coverage is too dependent on raw upstream labels

Current behavior:

- Direct Buy category dropdown is derived from raw `market.category`
- Gamma categories are passed through with minimal normalization
- upstream labels do not reliably map to user-facing buckets like Construction, Weather, Economy, Entertainment

Fix:

- normalize market categories in the mapper using the same kind of keyword/category derivation used by the automation scorer
- expose stable user-facing categories rather than raw upstream category strings only

### BUG-MR-005 — Some beginner-friendly labels are still incomplete

Current behavior:

- help tips already exist in `MarketAdvancedFilters.tsx`
- some labels are still not in the requested beginner-friendly language

Example:

- `Min Edge %` should become `Minimum Deal Advantage`

Fix:

- update labels without changing the underlying filter semantics
- keep help tips, but simplify their wording further where needed

### BUG-MR-006 — “24/7 background” is partly implemented in code, but not proven operationally

Current behavior:

- `vercel.json` already contains a cron for `/api/market/scheduler/tick` every 5 minutes
- scheduler code exists

Important truth:

- adding the cron entry is not enough because it is already present
- true 24/7 behavior still depends on deployed scheduler secret wiring and successful tick execution

Fix:

- do not implement a duplicate cron block
- verify the deployed environment calls the route successfully and logs activity

### BUG-MR-007 — Activity log exists, but not in the exact “big dashboard log” form requested

Current behavior:

- `MarketResultsTab.tsx` already renders an activity log with plain-English log text
- it is limited in height and located under Results, not the first Market surface

Fix options:

1. Expand the Results activity log and treat that as the main log surface.
2. Add a larger recent-activity panel to `MarketStartHereTab.tsx` if “Dashboard” means the first Market screen.

Recommended fix:

- clarify whether “Dashboard” means Start Here or Results, then place one canonical large activity surface there

## 4. Prompt-By-Prompt Status Check

Prompt item: `Make search + all filters reactive`

- Partly done
- filters are reactive
- search is not fully reactive yet

Prompt item: `Add timeframe buttons: Next Hour / Day / Week / Month / Year / All Time`

- Not fully done
- filter logic exists
- UI does not expose the full requested set

Prompt item: `Default = show ALL markets`

- Not fully done
- no default filter caps hide results, but fetch is still capped at 1000 and paginated to 25 per page

Prompt item: `Fix categories so Construction, Weather, Economy, Entertainment show real results`

- Not fully done
- needs category normalization and likely keyword-derived bucketing

Prompt item: `Change labels to plain English and add help icons`

- Mostly done
- help icons exist
- some labels still need renaming

Prompt item: `Turn on true 24/7 background: add Vercel cron`

- Already done in code
- still needs deployed runtime verification, not a new code change

Prompt item: `Add big Activity Log on Dashboard`

- Partly done
- there is an activity log in Results
- placement/size may still need adjustment

## 5. Highest-Value Next Checks

1. Start the local app and verify reactive Direct Buy behavior in-browser.
2. Verify whether the reported 500 is from `/api/market/logs`, `/api/market/directives`, or another route.
3. Confirm category normalization against live Gamma payloads.
4. Decide whether “Dashboard” means Start Here or Results before moving the log surface.
