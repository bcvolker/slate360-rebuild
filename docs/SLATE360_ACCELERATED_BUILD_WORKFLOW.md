# Slate360 Accelerated Build Workflow

Last Updated: 2026-05-13
Status: Current workflow guidance. Documentation only.

## Purpose

This workflow helps agents move quickly without following stale context, introducing filler, or destabilizing working Site Walk behavior.

## Default Read Order

1. `SLATE360_PROJECT_MEMORY.md`
2. `SLATE360_MASTER_BUILD_PLAN.md`
3. `docs/SLATE360_CURRENT_BUILD_CONTEXT.md`
4. `docs/SLATE360_GLOBAL_UX_DOCTRINE.md` for UX, shell, Site Walk, or app-store-visible surface work
5. One task-specific current doc from the source map
6. Targeted code reads for the exact files being changed

Do not bulk-read archived context trees. Use `docs/REPO_CONTEXT_FILE_AUDIT.md` when unsure whether a file is current.

## Workflow Stages

### 1. No-Edit Orientation

- Confirm the requested scope.
- Identify the surface owner: global shell, module shell, task shell, route-local component, API, backend, or docs.
- Check current handoff and active issues for that surface.
- Run targeted searches rather than scanning the entire repo.
- For external AI review packets, include product context and questions only. Do not include secrets, backend access instructions, env vars, tokens, passwords, private deployment credentials, or raw project memory.

### 2. Pre-Edit Guardrails

- Check line counts for files to edit.
- Read state declarations and JSX together for large client components.
- Confirm no active bug is being reintroduced.
- For backend/API work, use existing auth and response helpers.
- For Site Walk plan/capture work, state exactly how existing plan loading, pins, save, and return behavior will be preserved.

### 3. Scoped Implementation

- Make the smallest complete change that satisfies the task.
- Do not combine UI redesign with backend/persistence changes.
- Do not add mock data, fake metrics, placeholder cards, or dead buttons.
- Prefer existing primitives and shell patterns.
- Wire every new helper/provider/component into the consuming file before marking work complete.

### 4. Review And Validation

- Run `get_errors` on changed files when possible.
- Run `npm run typecheck` for TypeScript behavior or when requested.
- Run `npm run build` before marking production-facing implementation complete.
- Run relevant guardrails such as architecture/file-size checks for touched app code.
- Document smoke tests and expected results.

### 5. Handoff

- Update the relevant context doc.
- Add a structured handoff to `SLATE360_PROJECT_MEMORY.md`.
- Include what changed, what remains broken, context files updated, and ordered next steps.

## Codex Role

Codex should be used as a no-edit auditor or tightly scoped reviewer before broad UI work, and as a diff reviewer after implementation.

Recommended Codex checks:

1. No-edit audit before broad UI slices.
2. Diff review after implementation.
3. Check for filler content: Coming Soon, demo, mock, fake, placeholder, beta/test language, non-actionable metrics.
4. Check duplicate nav/shell/header systems.
5. Check hardcoded colors, arbitrary Tailwind colors, inline style colors, and old palette drift.
6. Check scope creep against the requested slice.
7. Check file-size and architecture guardrails.
8. Confirm new wrappers, providers, or helpers are imported and actually used.

Codex should not:

- Run unbounded restyles.
- Rewrite broad class sets across the repo.
- Touch Trigger, Supabase schema, migrations, billing, or backend infrastructure during UI audits.
- Introduce filler to make incomplete surfaces look full.
- Change Site Walk plan/capture behavior during a visual or documentation audit.

## Broad UI Slice Checklist

Before broad UI work, create or update a no-edit inventory covering:

- Shell/header/nav ownership.
- Filler and app-store-visible language.
- Hardcoded colors and token gaps.
- Fixed/absolute/z-index/safe-area action-zone conflicts.
- Current screenshots or user-provided mobile observations.
- Files to touch, smoke tests, and rollback plan.

## Rollback Pattern

For documentation-only work, rollback is a simple doc revert.

For code work:

- Keep changes narrow and reviewable.
- Do not revert unrelated user changes.
- Prefer feature-flagged or additive changes for risky behavior.
- If a slice touches Site Walk plan/capture, preserve a direct path back to the last known working behavior.

## Current Planning Packets

- `docs/SLATE360_GLOBAL_UX_DOCTRINE.md` is the concise UX doctrine.
- `docs/EXTERNAL_AI_UX_REVIEW_PACKET.md` is the sanitized external-review packet.
- `docs/site-walk/PLAN_PIN_SAFETY_BEFORE_CAPTURESHELL.md` is the tiny saved-pin safety plan to review before Shared CaptureShell.
