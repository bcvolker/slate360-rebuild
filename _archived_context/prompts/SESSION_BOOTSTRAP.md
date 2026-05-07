# Session Bootstrap — Full Assistant Stack

Use this at the start of any new chat in this repository.

## Objectives

- Enable full internal tool stack for repo work.
- Confirm environment is loaded and diagnostics can run safely.
- Keep startup checks aligned to the app-centric ecosystem direction.
- Keep outside-AI handoffs reproducible.

## In-Chat Bootstrap Checklist

1. Confirm the repo path is /workspaces/slate360-rebuild.
2. Load the project memory file first:
   - SLATE360_PROJECT_MEMORY.md
3. Activate available tool groups:
   - GitHub PR tools
   - GitHub issue/notification tools
   - API route mapping and impact tools
   - Code symbol/context/impact graph tools
4. Verify local environment file presence:
   - .env.local exists
5. Run safe diagnostics:
   - npm run diag:storage-runtime
   - npm run typecheck
6. Verify Anthropic model intent if Claude handoff is required:
   - ANTHROPIC_API_KEY present
   - ANTHROPIC_MODEL set to claude-opus-4-6 (or override explicitly in the handoff text)

## Optional Extended Validation

- npm run typecheck
- npm run verify:release

## External AI Coordination

If outside model help is needed, generate a complete handoff prompt in prompts/CURRENT.md and include:
- branch
- exact file paths
- hard rules
- required output format
- verification checklist

## Notes

- Never expose secret values in logs or chat.
- Report only checks actually executed.
- If a required tool is unavailable, state that explicitly and continue with available alternatives.
- Market Robot has been removed; do not add startup tasks or migrations for `/market` paths.
