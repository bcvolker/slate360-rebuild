# Slate360 App Foundation Refactor Prompt

You are starting a new implementation chat inside the Slate360 repo. Your job is not to brainstorm at a high level. Your job is to inspect the real codebase, identify the exact foundation refactors needed to make Slate360 app-ready, assess blast radius before changing anything, then implement the safe foundation changes in sequence while preserving every currently working system.

## Primary Goal

Optimize the current Slate360 platform foundation so app development can begin on top of it without breaking the working product areas that already exist.

This means you must:
- determine what needs to be refactored, normalized, or formalized in the foundation,
- explain why each change is necessary,
- use GitNexus to measure the risk of breaking adjacent systems before editing,
- implement only the foundation changes required for app readiness,
- keep existing working routes, auth, billing, SlateDrop, Project Hub, and Market functionality intact,
- leave the repo in a state where new app-specific development can start on a stable foundation.

## Mandatory Read Order

Read these first:
- `SLATE360_PROJECT_MEMORY.md`
- `slate360-context/APP_ECOSYSTEM_FACT_FINDING_PROMPT.md`
- `slate360-context/APP_ECOSYSTEM_EXECUTION_PLAN.md`
- `slate360-context/BACKEND.md`
- `slate360-context/DASHBOARD.md`
- `slate360-context/PROJECT_HUB.md`
- `slate360-context/SLATEDROP.md`

Do not read the entire repo documentation tree unless needed.

## Non-Negotiable Constraints

- Keep all current working systems working.
- Do not break Market Robot.
- Do not break current Stripe subscription flows.
- Do not break current auth or org bootstrap flows.
- Do not replace the current project model with a new concept.
- Do not introduce mock data into production UI.
- Do not create a second entitlement system that bypasses `getEntitlements()`.
- Do not create a second auth system.
- Do not do broad cosmetic UI refactors that are unrelated to app-readiness.
- Keep changes minimal, source-backed, and reversible.

## Required Working Method

### 1. Reconfirm the foundation audit from source

Before changing anything, verify the live implementation status of:
- org and membership resolution,
- route protection and module gating,
- current entitlement logic,
- billing writeback behavior,
- file storage and share token models,
- project backbone and project tools,
- app/module navigation visibility versus actual server-side enforcement.

You must identify any material mismatch between the two architecture handoff docs and the current source.

### 2. Use GitNexus before editing

Before each substantial change, use GitNexus to inspect blast radius.

At minimum:
- run repository discovery if needed,
- use query/context to understand the execution flow around the target area,
- use impact on the symbols or modules you plan to change,
- use detect_changes after each implementation batch to verify what processes were affected.

You must explicitly evaluate risk for changes involving:
- `getEntitlements()`
- `resolveServerOrgContext()`
- `withAuth()` / `withProjectAuth()`
- Stripe webhook handling
- SlateDrop share/upload token services
- project access control
- middleware route enforcement

### 3. Produce an implementation plan before editing

After source review and GitNexus risk review, create a concise implementation plan that includes:
- exact files to change,
- exact migrations to add if needed,
- exact APIs/pages whose behavior will change,
- known risks and how you will validate them,
- explicit items you will not touch yet.

Do not start editing until the plan is specific.

### 4. Implement only foundation-critical changes

The changes you should look for are the foundation-level issues that block safe app expansion. Focus especially on these likely areas:

1. Access enforcement consistency
- Ensure app/module routes are protected by real server-side gating, not just hidden navigation.
- Align page-level access checks with org context and entitlements.

2. App entitlement foundation
- Add the minimal database and server logic needed so app-specific entitlements can coexist with org tier entitlements.
- Merge app flags into the canonical entitlement resolution path instead of bolting on a parallel system.

3. Billing readiness for apps
- Preserve current tier billing while making sure future app purchases can write into the entitlement foundation safely.
- Keep the Stripe customer model intact unless source evidence proves a change is required.

4. File/storage/share normalization
- Confirm and formalize the canonical file table and canonical folder table.
- Resolve or isolate split token/share models if they would block app expansion or cause future regressions.

5. Foundation visibility
- Add only the minimum account/dashboard visibility needed so org plan and app access can be inspected and debugged during future app rollout.

### 5. Validate after each batch

After each meaningful batch of edits:
- run file-level errors on changed files,
- run `npm run typecheck` if TypeScript behavior changed,
- run `bash scripts/check-file-size.sh` if app code changed,
- run any targeted validation needed for touched auth/billing/storage routes,
- review GitNexus change detection for unintended blast radius.

### 6. Update docs as part of the implementation

When the foundation changes are complete, update the relevant context docs so the repo documentation matches the live implementation.

## Deliverables Required In Your Final Response

Your final response must contain all of the following:

1. A clear statement of whether Slate360 is now app-foundation-ready.
2. A list of all foundation issues you found.
3. A list of all changes you made.
4. A list of items you intentionally deferred.
5. A risk summary describing what remains most fragile.
6. Validation results, including what you ran and what you could not run.
7. The recommended next development sequence for beginning app work.

## Definition Of Success

Success means:
- existing working platform behavior still works,
- app-specific entitlements now have a real foundation path,
- route protection is consistent enough that hidden UI is not the only gate,
- billing is ready to evolve into app purchases without breaking current subscriptions,
- file/share/project foundations are explicit enough that new apps can build on them safely,
- another engineer can begin app development without first re-architecting the platform core.

## Definition Of Failure

Failure means any of the following:
- breaking current access or subscription behavior,
- changing architecture without measuring blast radius,
- introducing parallel auth/entitlement/billing systems,
- broad refactors that do not directly improve app readiness,
- leaving the codebase ambiguous enough that app development is still blocked.