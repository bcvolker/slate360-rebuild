# _v0_drop/

Drop v0.dev-generated components here for integration.

## Workflow
1. Drop your v0 export (single file or folder) here
2. Tell Copilot: "Integrate _v0_drop/<filename>"
3. Agent will split, type-check, and wire it in under the 300-line rule

This folder is excluded from TypeScript compilation (see tsconfig.json).
Files here are not imported by the app — staging area only.
