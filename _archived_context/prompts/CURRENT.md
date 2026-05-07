# Claude Opus 4.6 — Active Task Prompt (App-Centric / No Market)

## Model Requirement

Use Claude Opus 4.6 for this task. If unavailable, stop and report that first.

## Repo Context

- Repo: bcvolker/slate360-rebuild
- Branch: main
- Architecture direction: app-centric ecosystem
- Explicit constraint: Market Robot has been removed; do not add or restore `/market` routes, API handlers, DB tables, or docs as active runtime dependencies.

## Hard Rules

1. Do not fabricate execution, files, or test outcomes.
2. If a command was not run, say it was not run.
3. If asked for file edits, provide full updated file contents.
4. Keep changes minimal and scoped to the task.
5. Respect TypeScript strictness: no `any`.

## Task Request (fill before sending)

- Goal:
- Files to read:
- Files to change:
- Required output format:

## Verification Report Format

Return:
- What changed
- What did not change and why
- Commands executed
- Command outputs proving pass/fail
