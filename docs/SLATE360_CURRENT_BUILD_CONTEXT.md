# Slate360 Current Build Context

Last Updated: 2026-05-13
Status: Current source-of-truth map. Documentation only. No product behavior changes.

## Purpose

This file is the fast-start context map for future Copilot, Codex, Claude, or human work. It exists to stop agents from following stale planning files, archived handoffs, duplicate UI systems, or AI-generated filler.

Use this file to decide what to read next. Do not treat it as permission to refactor, delete, migrate, repaint, or change behavior.

## Current Product Reality

- Slate360 is a production SaaS being prepared for iOS and Android app-store submission.
- Site Walk is the only fully visible and usable V1 app for the first app-store release.
- Other apps may exist in code but must stay hidden from authenticated app-store-facing surfaces until functional.
- Site Walk Plan Walk core loop is currently working and must be preserved: plans load, pan/zoom works, long press creates/opens capture, and saved plan pins can be opened.
- Trigger.dev PDF rasterization is working. Do not disturb Trigger, Supabase schema, migrations, or plan/capture behavior during documentation or UI-debt audit work.
- Current visible terminology should prefer Worksite for lower-tier Site Walk containers and reserve Project for higher-tier PM contexts unless route, API, or table names force legacy language.

## Active Source Of Truth Order

Read in this order when starting broad product, shell, or Site Walk work:

1. `SLATE360_PROJECT_MEMORY.md` - latest handoff and active session state.
2. `SLATE360_MASTER_BUILD_PLAN.md` - top-level product architecture. If it conflicts with another planning doc, it wins.
3. `docs/SLATE360_CURRENT_BUILD_CONTEXT.md` - this source map.
4. Task-specific current docs from the sections below.
5. Code only after selecting the narrow module surface.

## Current Doctrine And Architecture Docs

| Status | File | Use |
|---|---|---|
| Authoritative | `SLATE360_MASTER_BUILD_PLAN.md` | Master product direction and Site Walk ownership boundaries |
| Authoritative | `docs/SLATE360_PRODUCT_DOCTRINE.md` | App-neutral shell, collaborator model, org branding, cross-app bundles |
| Authoritative | `docs/APP_STORE_AND_OFFLINE_STRATEGY.md` | Native wrapper, offline-first capture, app-store visibility constraints |
| Authoritative | `docs/ENTITLEMENTS_AND_PROJECT_MODEL.md` | Entitlements, Field Project vs Project model, upgrade path |
| Authoritative | `docs/SLATEDROP_ARCHITECTURE.md` | SlateDrop as the platform file system |
| Authoritative | `docs/SLATE360_GLOBAL_UX_DOCTRINE.md` | Global UX doctrine for V1 surfaces, object actions, plan pins, shell/task behavior, hidden-app rules |
| Current bridge | `docs/SLATE360_V1_APP_SHELL_UX_ARCHITECTURE.md` | Shell/header/nav hierarchy for V1 planning |
| Current audit | `docs/design/SLATE360_UNIFIED_DESIGN_SYSTEM_GAP_AUDIT.md` | Design-system fragmentation and safe token migration direction |
| Current plan | `docs/design/SLATE360_V1_DESIGN_TOKEN_PLAN.md` | Graphite Glass + restrained amber + muted teal token plan |
| Current workflow | `docs/SLATE360_ACCELERATED_BUILD_WORKFLOW.md` | Agent workflow, Codex role, validation expectations |
| Shareable packet | `docs/EXTERNAL_AI_UX_REVIEW_PACKET.md` | Sanitized product/UX packet for external AI review; no secrets |

## Recently Filled Gaps

- `docs/SLATE360_GLOBAL_UX_DOCTRINE.md` now exists and is the concise global UX doctrine.
- `docs/SLATE360_ACCELERATED_BUILD_WORKFLOW.md` did not exist before the repo source-of-truth audit and is now current workflow guidance.
- `docs/EXTERNAL_AI_UX_REVIEW_PACKET.md` now exists as a sanitized packet for external UX review.

## Product Code Boundaries

Do not make broad product-code edits from this context file alone.

| Surface | Current owner pattern | Notes |
|---|---|---|
| Global authenticated shell | `components/dashboard/AppShell.tsx`, `components/dashboard/AuthedAppShell.tsx` | Owns platform chrome and app-store visible navigation |
| Mobile shell header/nav | `components/shared/MobileTopBar.tsx`, `components/shared/MobileBottomNav.tsx` | Must not expose unfinished apps in V1 |
| Site Walk module shell | `components/site-walk/SiteWalkShell.tsx`, `components/site-walk/SiteWalkModuleNav.tsx` | Non-task Site Walk pages only |
| Site Walk task shell | `app/site-walk/(act-2-inputs)/capture/_components/CaptureShell.tsx` | Full viewport capture/plan mode |
| Site Walk Home | `app/site-walk/page.tsx`, `app/site-walk/_components/SiteWalkHub.tsx` | Current command center and Worksite language |
| Site Walk Worksites/Walks | `app/site-walk/(act-2-inputs)/walks/page.tsx` | Route still says walks; visible UI now moves toward Worksites |
| Capture/plan components | `components/site-walk/capture/*` | Highest risk for overlap, z-index, safe-area, and behavior regressions |

## Current No-Go Rules

- Do not change product behavior during documentation/audit tasks.
- Do not refactor UI without an approved implementation slice.
- Do not delete code as part of this audit.
- Do not run migrations, touch Trigger, or alter Supabase schema.
- Do not change app colors until a token migration slice is approved.
- Do not edit capture, plan, pin, rasterization, or save behavior unless the task explicitly targets that behavior.
- Do not add Coming Soon, demo, fake, placeholder, beta/test, or non-actionable metric language to authenticated V1 app surfaces.
- Do not paste project memory, credentials, tokens, backend access instructions, or environment details into external AI packets.

## Validation Baseline

Recent implementation slices repeatedly passed:

- `npm run typecheck`
- `npm run build`
- `npm run guard:architecture`

For documentation-only changes, typecheck/build are low risk but may still be run when requested. For product-code changes, follow the stricter validation in `AGENTS.md` and `.github/copilot-instructions.md`.

## Rollback Plan For This Doc Set

These docs are additive. If they mislead future work, revert or edit only the affected docs:

- `docs/SLATE360_CURRENT_BUILD_CONTEXT.md`
- `docs/site-walk/SITE_WALK_V1_CURRENT_BUILD_CONTEXT.md`
- `docs/REPO_CONTEXT_FILE_AUDIT.md`
- `docs/design/UI_TECHNICAL_DEBT_INVENTORY.md`
- `docs/SLATE360_ACCELERATED_BUILD_WORKFLOW.md`

## Backend Audit Findings (2026-05-14)

A comprehensive backend audit was completed. Key product-level findings:

- **Deliverables, not Reports.** Backend defines 22 deliverable types, 9 output modes. The V1 label must be "Deliverables."
- **Worksites = field projects.** `projects.project_type = 'field'` is available to all tiers. Full projects require business+. V1 should show "Worksites" for lower tier, "Projects" for higher tier.
- **Plan Room label banned.** Plan sets are project-scoped. Use "Plans & Documents."
- **SlateDrop is core infrastructure.** 17 auto-provisioned folders per project, full upload/download/share/request flow. Must be visible from Home nav.
- **Coordination APIs exist.** Assignments, comments, inbox, board — all have working API routes but no dedicated page.
- **Collaborator model is production-ready.** Invites, seats, limits, per-project access.
- **Three billing models coexist.** `resolveOrgEntitlements()` merges legacy tiers, modular subscriptions, and SKU cost model.
- **Beta mode bypasses all entitlements.** When `NEXT_PUBLIC_BETA_MODE !== "false"` (default), all `canAccess*` flags are true.

Full audit docs: `docs/audit/`.
