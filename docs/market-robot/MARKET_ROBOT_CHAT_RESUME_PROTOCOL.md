# Market Robot Chat Resume Protocol

Last Updated: 2026-03-12

## Files To Read First
1. [SLATE360_PROJECT_MEMORY.md](../../SLATE360_PROJECT_MEMORY.md)
2. [docs/market-robot/MARKET_ROBOT_BUILD_FILE.md](MARKET_ROBOT_BUILD_FILE.md)
3. [docs/market-robot/MARKET_ROBOT_PROMPT_BACKLOG.md](MARKET_ROBOT_PROMPT_BACKLOG.md)
4. Only then, the batch-specific implementation files named in the active prompt.

## Current Batch
- Batch 3 is complete (local changes landed; push blocked by terminal `ENOPRO` in this session).
- The next recommended batch is Batch 4.
- Rescue implementation is now in progress; do not reset the Market shell back to the pre-Batch-1 six-tab IA.

## Latest Rescue State
- Batch 3 upgraded Automation UX with explicit beginner presets (Conservative/Balanced/Aggressive), clearer action labels, and stronger Save Draft vs Save + Start vs Run Scan Now vs Stop/Halt separation.
- Batch 3 now surfaces config source truth directly in Automation and explicitly warns when runtime is using fallback sources (`market_directives` / metadata) instead of canonical `market_plans`.
- Batch 3 keeps advanced settings available behind a disclosure toggle rather than removing them.
- Batch 3 adds honest post-action feedback that differentiates server-persisted save from local fallback save.
- Batch 3 did not change any `app/api/market/*` route, runtime-config resolution logic, scheduler logic, summary endpoint logic, or backend contracts.
- Continuation note: terminal command execution (`npm run typecheck`, `npx tsc --noEmit`) is currently blocked in this session by `ENOPRO`; rely on editor diagnostics plus GitNexus until terminal provider is restored.
- Verify next chat before widening scope:
	- 4 primary nav items only
	- Automation shows explicit action meanings for Save Draft / Save + Start Robot / Run Scan Now / Stop-Halt
	- Automation summary shows config source and fallback warning when not using `market_plans`
	- Advanced settings remain reachable via disclosure
	- Saved plans, current automation status, and Results entry remain reachable
	- No UI copy implies live automation exists end-to-end

## Rules Of Engagement
- Respect the repo-aligned gate: `/market` is controlled by `canAccessMarket`, not entitlements and not blanket internal access.
- Treat this as a rescue-rebuild, not a rewrite.
- Work one batch at a time.
- Do not silently expand scope.
- Before editing, restate the exact batch goal, the files allowed to change, the forbidden files and contracts, and the verification plan.
- If a batch touches any success banner, status label, summary card, or runtime state, explicitly name the server truth surface that supports the claim.
- If a batch moves or hides UI, preserve reachability for saved markets, results, wallet readiness, and automation plans.
- Prefer existing hooks/utilities before creating new ones.
- Keep backend changes out of a batch unless the prompt explicitly authorizes a small truth patch.

## Forbidden Files / Boundaries
- Do not change unrelated dashboard systems outside the Market subtree unless the prompt explicitly names them.
- Do not redesign or replace `/api/market/buy`, `/api/market/scan`, `/api/market/plans`, `/api/market/system-status`, `/api/market/bot-status`, `/api/market/trades`, `/api/market/scheduler/health`, or `/api/market/scheduler/tick` in a UI-only batch.
- Do not do Phase 2 work during the rescue. That includes EV scoring, Kelly sizing, websocket-first signal upgrades, reference-data modules, and scaling changes.
- Do not delete legacy tabs or flows until the replacement surface is wired and verified reachable.
- Do not claim live automation exists end-to-end. As of Batch 0, scan execution is still effectively paper-only.

## How To Summarize Work After Each Batch
- Required summary format:
- Files changed
- What changed
- What was intentionally not changed
- What still appears blocked
- Commands run
- Whether typecheck passed
- Manual verification steps performed and outcomes
- Build files updated

## What To Do If Token / Context Runs Low
- Stop editing before making a speculative partial fix.
- Update [docs/market-robot/MARKET_ROBOT_BUILD_FILE.md](MARKET_ROBOT_BUILD_FILE.md) with new findings or changed constraints.
- Update [docs/market-robot/MARKET_ROBOT_PROMPT_BACKLOG.md](MARKET_ROBOT_PROMPT_BACKLOG.md) if the batch order, risks, or success criteria changed.
- Overwrite the Latest Session Handoff section in [SLATE360_PROJECT_MEMORY.md](../../SLATE360_PROJECT_MEMORY.md) before ending the chat.
- Leave the next chat a precise stop point: what was completed, what was not completed, what files were touched, and the first safe next step.

## Batch Startup Checklist
- Read the four files in the order above.
- Re-check [docs/market-robot/MARKET_ROBOT_ENV_AND_TOOL_MATRIX.md](MARKET_ROBOT_ENV_AND_TOOL_MATRIX.md) if the batch depends on live mode, scheduler secrets, or external tooling.
- Re-check [slate360-context/ONGOING_ISSUES.md](../../slate360-context/ONGOING_ISSUES.md) and [ops/bug-registry.json](../../ops/bug-registry.json) before product edits.
- If a batch touches existing files, check line counts first per repo rules.
- If a batch requires reading more than a few files, build a short file map before editing.

## Resume Shortcut
- If continuing the Market Robot rescue, do not re-discover the module from scratch.
- Treat [docs/market-robot/MARKET_ROBOT_BUILD_FILE.md](MARKET_ROBOT_BUILD_FILE.md) as the canonical current-state file unless a code read proves it stale.