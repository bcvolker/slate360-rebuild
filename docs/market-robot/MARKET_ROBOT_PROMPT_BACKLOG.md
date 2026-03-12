# Market Robot Prompt Backlog

Last Updated: 2026-03-12

## Batch 0 Analysis Prompt Summary
- Audit the current Market Robot route, hooks, APIs, env usage, and tool access.
- Identify source-of-truth splits, misleading states, and rescue-phase boundaries.
- Create persistent build files so later chats can resume cleanly.

### Risks / Preconditions
- None. Read-only plus docs only.

### Success Criteria
- Build file, resume protocol, prompt backlog, and env/tool matrix exist and reflect verified repo state.
- Tool availability and current env blockers are documented.
- Future batch order and guardrails are explicit.

## Batch 1 Shell / Truthfulness Prompt Summary
- Reduce the IA to four primary sections: Dashboard, Markets, Automation, Results.
- Re-home, do not lose, current legacy functionality.
- Add explicit blocker and config-source visibility.
- Make overview/status messaging truthful and beginner-first.

### Status After 2026-03-12 Implementation
- Complete.
- Landed a dark four-section shell, re-homed Saved Markets into Markets, and moved wallet/live-readiness access into Dashboard.
- Re-grounded dashboard overview cards to `market_trades`, `useMarketServerStatus()`, and `useMarketSystemStatus()`.
- Added explicit manual buy fallback messaging for `paper_fallback` and related live-fallback response modes.
- Preserved post-buy refresh for trades, Results, bot-status, scheduler health, activity logs, and system-status.
- Intentionally left backend truth unification, `/api/market/summary` alignment, runtime-config resolution, and scheduler behavior for later batches.

### Risks / Preconditions
- Do not change API contracts.
- Do not hide wallet readiness, saved markets, or results without a reachable replacement path.
- Do not use [app/api/market/summary/route.ts](../../app/api/market/summary/route.ts) as authoritative for plan-driven truth unless the batch explicitly proves the values are correct for that surface.
- Preserve layout customization compatibility.

### Success Criteria
- Four-section IA is in place.
- Any moved functionality remains reachable.
- Dashboard/overview status claims come from server-confirmed trade/runtime/system-status data or are clearly labeled as client-side.
- Live blockers and fallback config source are visible.

## Batch 2 Markets / Search Prompt Summary
- Improve keyword search behavior and browse relevance.
- Keep sorting and filtering understandable.
- Add row click to drawer/modal.
- Re-home save/bookmark/watchlist behavior.
- Add buy impact preview and a reliable post-buy refresh path.

### Status After 2026-03-12 Implementation
- Complete.
- Search workflow now exposes current keyword, active filters, active sort, loaded set size, visible result count, and fetch-source context.
- UI copy is explicit that search remains lexical keyword matching; no semantic claim is made.
- Results are now shown in a compact scrollable table with clearer trading columns and sortable controls.
- Market row click opens a cleaner detail drawer that includes mode indication, save/watchlist action, and wallet impact preview (ticket size, max loss, payout, potential profit).
- Detail drawer routes into buy flow with selected amount, and post-buy refresh wiring remains intact.
- Kept all backend contracts untouched (`/api/market/buy`, `/api/market/polymarket`, `/api/market/watchlist`, `/api/market/trades`).
- Continuation validation note: GitNexus `detect_changes` reran successfully; terminal `tsc` rerun remained blocked by `ENOPRO` in this session, so no push was performed.

### Risks / Preconditions
- Preserve `/api/market/buy` request and response contracts.
- Preserve `market_watchlist` semantics.
- Do not break paper trade persistence.
- Avoid pretending search is semantic or historical if the implementation is still lexical.

### Success Criteria
- Search results feel materially better for real user keywords.
- Drawer open, save toggle, and buy action all work from the same result surface.
- Post-buy refresh updates Results and positions consistently.
- If backend returns a fallback mode or warning, the UI surfaces it honestly.

## Batch 3 Automation Prompt Summary
- Introduce Conservative, Balanced, and Aggressive presets for beginners.
- Clarify Save vs Apply vs Running state.
- Show current config source.
- Expose Run scan now and kill switch clearly.
- Keep advanced controls behind disclosure.

### Status After 2026-03-12 Implementation
- Complete (local changes landed; push blocked by terminal `ENOPRO` in this session).
- Added clear beginner preset entry points (Conservative, Balanced, Aggressive) as frontend mapping to existing plan fields.
- Added explicit Save Draft vs Save + Start Robot vs Run Scan Now vs Stop / Halt semantics across builder, plan list, and active automation summary.
- Added config-source visibility in Automation with explicit fallback wording when runtime is not using `market_plans`.
- Added honest post-action feedback messaging that distinguishes server-confirmed save from local fallback save.
- Kept advanced controls available but hidden behind explicit disclosure.
- Preserved existing handlers/contracts and avoided `app/api/market/*` edits.

### Risks / Preconditions
- Preserve `/api/market/plans` and `/api/market/scan` contracts.
- Do not claim that a saved plan is running without server-confirmed status.
- Handle optimistic local plan state carefully.
- Do not imply live automation exists if scan execution remains paper-only.

### Success Criteria
- Beginner can choose a preset and understand what happens next.
- Save only, Save + Start, Run now, and Stop are visually distinct.
- Current config source is visible.
- Scan/result feedback appears after action and refreshes downstream surfaces.

## Batch 4 Results / Wallet Prompt Summary
- Unify positions, history, results, wallet snapshot, and live blockers.
- Add a readiness drawer or equivalent surface.
- Remove contradictory metrics across overview, results, and wallet-related surfaces.

### Risks / Preconditions
- Preserve trade history semantics.
- Preserve wallet connect, signature verification, and approval flows.
- Do not over-promise live readiness. Respect blocker truth from system-status and wallet state.

### Success Criteria
- Results and positions feel like a single coherent story.
- Wallet readiness and live blockers are easy to understand.
- Post-action refresh path updates all relevant views.

## Batch 5 Backend Truth Patch Prompt Summary
- Only if still needed after Batches 1 to 4.
- Patch misleading or incomplete server truth surfaces.
- Likely targets: summary alignment, missing truthful status fields, save/apply integrity, blocker exposure.

### Risks / Preconditions
- No API envelope redesign.
- No scheduler redesign.
- No persistence-layer rewrite.
- Limit changes to the smallest server patch needed to make the frontend truthful.

### Success Criteria
- Server truth surfaces match current rescue UI needs.
- Summary/runtime/config-source values stop contradicting plan/runtime state.
- Existing route contracts survive unchanged.

## Batch 6 Cleanup Prompt Summary
- Remove dead UI paths.
- Clean imports and duplication.
- Verify no hidden regressions.
- Update build files and summaries.

### Risks / Preconditions
- No cleanup that changes behavior unless verified.
- No broad refactor disguised as cleanup.

### Success Criteria
- Surviving UI paths are cleaner.
- No lost functionality.
- Build files and handoff notes reflect the true final rescue state.

## Recommended Order Changes
- Batch 1 is now complete.
- Keep Batch 2 and Batch 3 separate. Search rescue and automation rescue touch different state tangles.
- Keep Batch 5 conditional, but expect it may be required before the rescue can truthfully claim server-grounded summary behavior.

## Hallucination Traps To Avoid
- Treating `market_plans` as the only live source today. It is the target, not the only active source.
- Claiming live automation exists end-to-end. Current scan execution is still effectively paper-only.
- Assuming server-stored tab prefs are already read by the client.
- Assuming any `res.ok` from `/api/market/buy` means a live trade happened.
- Assuming summary metrics are plan-grounded today.
- Deleting saved-market or live-wallet access because the new IA feels simpler without them.