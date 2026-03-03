# Slate360 — New Chat Handoff Protocol

Use this protocol at the start and end of every substantial implementation chat to prevent context drift.

## Start-of-Chat Required Inputs

Attach and read in this exact order:

1. `SLATE360_PROJECT_MEMORY.md`
2. `slate360-context/FUTURE_FEATURES.md`
3. Module blueprint(s) (for example `slate360-context/DASHBOARD.md`, `PROJECT_HUB.md`, `SLATEDROP.md`)
4. `slate360-context/dashboard-tabs/MODULE_REGISTRY.md`
5. `slate360-context/dashboard-tabs/CUSTOMIZATION_SYSTEM.md`
6. Relevant tab implementation plan(s) under `slate360-context/dashboard-tabs/{tab}/IMPLEMENTATION_PLAN.md`

If raw uploads (`*.txt`, `*.html`) are present, they are reference material only and must be reconciled with canonical files before implementation.

## Non-Negotiable Start Checks

- Confirm route and gate from module registry before coding.
- Confirm entitlement source from `lib/entitlements.ts` (never inline tier checks).
- Confirm internal-tab gate model: `hasInternalAccess` for `/ceo`, `/market`, `/athlete360`.
- Confirm API patterns: `withAuth()`/`withProjectAuth()` + response helpers.
- Confirm customization requirements: movable/expandable/resizable/persisted layouts for the target tab.

## Decision Logging Standard

For any route/gate/schema/API change, update at least one canonical context file in the same session.

Minimum delta entry:
- What changed
- Why it changed
- Which files/routes are affected
- Any migration or follow-up required

## End-of-Chat Handoff Block (Required)

Use this exact structure in the final message:

1. **What changed** (implementation summary)
2. **Canonical docs updated** (file list)
3. **Open risks / blockers**
4. **Next 3 highest-leverage steps**

## Quick Drift Guardrails

- Never treat brainstorm notes as build specs without normalization.
- Never let `DASHBOARD.md`/`FUTURE_FEATURES.md` contradict live code for access control.
- Never leave route aliases ambiguous (`/tours` vs `/tour-builder`) without explicit canonical mapping.
- Never reintroduce deprecated entitlement flags (for example `canAccessCeo`).

## Recommended Session Template

```markdown
### Session Scope
- Goal:
- In-scope modules:
- Out-of-scope modules:

### Preconditions Checked
- [ ] Route + gate verified in MODULE_REGISTRY
- [ ] Entitlements source verified
- [ ] Internal access model verified
- [ ] API/auth patterns verified

### Implemented Changes
- ...

### Canonical Context Updates
- ...

### Follow-ups
- ...
```
