# Codex Workflow — Slate360

Date: 2026-05-12

Slate360 uses a three-agent partnership for safe release work.

## Roles

### ChatGPT

ChatGPT owns architecture, product planning, implementation sequencing, and prompt design. It should turn repo facts into small safe build plans and acceptance criteria.

### Copilot

Copilot is the in-Codespaces implementation assistant. It edits files, runs commands, performs targeted repo reads, and keeps changes scoped to the active implementation slice.

### Codex

Codex is the repo-wide reviewer, branch auditor, test builder, no-edit investigator, and PR reviewer. Codex should be used to inspect risk, find missed call paths, propose tests, and review diffs before merge.

## Standard Workflow

1. Create a feature branch.
2. Read the current handoff docs:
   - `SLATE360_PROJECT_MEMORY.md`
   - `docs/CHATGPT_FACT_FINDING_HANDOFF.md`
   - `docs/CHATGPT_FACT_FINDING_FILE_LIST.txt`
   - active module docs and bug registry entries for the task.
3. Do a no-edit audit first.
4. Make one narrow implementation slice.
5. Run `npm run typecheck`.
6. Run `npm run build`.
7. Run relevant guardrails.
8. Push the feature branch only.
9. Test the Vercel Preview on a real phone/tablet when mobile behavior is affected.
10. Merge to `main` only after preview passes.

## Site Walk BUG-079 Workflow

For the plan pin/capture blocker, do not combine persistence work with broad UI redesigns. First confirm the exact ID lifecycle, then fix the smallest path from plan interaction to persisted pin and capture item.

Minimum review chain:

1. `PlanViewerLeaflet`
2. `PlanQuickActionMenu`
3. `CaptureContext`
4. `useCaptureFileHandler`
5. `useCaptureUpload`
6. `/api/site-walk/items`
7. `/api/site-walk/pins`
8. return-to-plan state/refetch/realtime behavior

## Non-Negotiables

- Do not push directly to `main`.
- Do not use `git add .`.
- Do not rasterize PDFs inside Vercel routes.
- Do not disturb Trigger rasterization unless directly necessary.
- Do not add mock, fake, demo, or Coming Soon content to production UI.
- Keep App Store mode clean.
- Keep Site Walk mobile-first and physical-device-testable.
