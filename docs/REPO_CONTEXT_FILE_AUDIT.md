# Repo Context File Audit

Last Updated: 2026-05-13
Status: Documentation-only audit. No code deleted or moved.

## Purpose

The repo contains many planning, handoff, archived, and generated context files. This audit classifies which files future agents should trust first and which files should be treated as historical reference only.

## Executive Finding

The repo has a valid current planning spine, but it is surrounded by large archived context trees and older active-looking files. Future agents should start from the current spine below, then read only task-specific docs.

The most important risk is not that stale files exist. The risk is that agents may treat archived build files, old prompt backlogs, or legacy context docs as current implementation instructions.

## Authoritative Current Spine

| Priority | File | Classification | Notes |
|---:|---|---|---|
| 1 | `SLATE360_PROJECT_MEMORY.md` | Authoritative current handoff | Must be read first at session startup |
| 2 | `SLATE360_MASTER_BUILD_PLAN.md` | Authoritative master plan | Says it supersedes older planning docs |
| 3 | `docs/SLATE360_CURRENT_BUILD_CONTEXT.md` | Authoritative source map | Created by this audit to reduce stale-context drift |
| 4 | `AGENTS.md` | Authoritative guardrails | App-store, Site Walk, git, validation, Trigger preservation rules |
| 5 | `.github/copilot-instructions.md` | Authoritative agent operating rules | Repo-specific Copilot rules and task map |

## Current Product Doctrine And Architecture

| File | Classification | Notes |
|---|---|---|
| `docs/SLATE360_PRODUCT_DOCTRINE.md` | Authoritative current doctrine | Read for app-neutral shell, collaborators, org branding |
| `docs/APP_STORE_AND_OFFLINE_STRATEGY.md` | Authoritative current doctrine | Read for native/offline/app-store constraints |
| `docs/ENTITLEMENTS_AND_PROJECT_MODEL.md` | Authoritative current doctrine | Read for entitlements and Field Project model |
| `docs/SLATEDROP_ARCHITECTURE.md` | Authoritative current doctrine | Read for file system and share architecture |
| `docs/SLATE360_GLOBAL_UX_DOCTRINE.md` | Authoritative current doctrine | Read for global UX rules, object action rules, pin behavior, shell/task behavior, hidden-app rules |
| `docs/SLATE360_V1_APP_SHELL_UX_ARCHITECTURE.md` | Current planning bridge | Not an implementation prompt by itself |
| `docs/design/SLATE360_V1_DESIGN_TOKEN_PLAN.md` | Current planning bridge | Token plan only; do not implement globally |
| `docs/design/SLATE360_UNIFIED_DESIGN_SYSTEM_GAP_AUDIT.md` | Current audit | Use for design-system debt and Codex review scope |
| `docs/SLATE360_ACCELERATED_BUILD_WORKFLOW.md` | Current workflow | Created by this audit |
| `docs/EXTERNAL_AI_UX_REVIEW_PACKET.md` | Sanitized share packet | Safe product/UX context for external AI review; excludes secrets |

## Current Site Walk Docs

| File | Classification | Notes |
|---|---|---|
| `docs/SITE_WALK_MASTER_ARCHITECTURE.md` | Authoritative Site Walk blueprint | Module-level source |
| `docs/site-walk/SITE_WALK_MASTER_ARCHITECTURE.md` | Useful reference / possible duplicate | Same-name module doc under site-walk; verify before using over root docs version |
| `docs/site-walk/SITE_WALK_V1_CURRENT_BUILD_CONTEXT.md` | Authoritative Site Walk source map | Created by this audit |
| `docs/site-walk/SITE_WALK_V1_UI_IMPLEMENTATION_PLAN.md` | Current implementation plan | Slice plan; preserve behavior unless slice says otherwise |
| `docs/site-walk/SITE_WALK_V1_MOBILE_UX_DECISION_RECORD.md` | Current decision record | Mobile UX decisions and constraints |
| `docs/site-walk/PLAN_PIN_SAFETY_BEFORE_CAPTURESHELL.md` | Current pin-safety plan | Tiny saved-pin guard plan before Shared CaptureShell |
| `docs/site-walk/SITE_WALK_V1_TAXONOMY_AND_WORKFLOW.md` | Current taxonomy | Worksite vs Project rules |
| `docs/site-walk/SITE_WALK_HOME_COMMAND_CENTER_IMPLEMENTATION_NOTES.md` | Useful implementation notes | Historical notes for recent Home slices |
| `docs/site-walk/SITE_WALK_CAPTURE_FAILURE_ANALYSIS_2026-05-08.md` | Useful risk reference | Read only when touching capture/save behavior |

## Missing Requested Docs

| Requested path | Classification | Finding |
|---|---|---|
| `docs/SLATE360_GLOBAL_UX_DOCTRINE.md` | Filled | Created after the source-of-truth audit as the concise global UX doctrine |
| `docs/SLATE360_ACCELERATED_BUILD_WORKFLOW.md` | Missing before audit | Created during this audit |

## Historical Or Stale Context Zones

Do not use these as current instructions unless a task explicitly asks for history recovery:

| Path | Classification | Notes |
|---|---|---|
| `_archived_context/` | Stale historical archive | Contains old build files, prompt backlogs, old context docs, Claude skills, and historical audits |
| `_archived_context/docs/*` | Stale historical archive | Many files look current by name but are archived |
| `_archived_context/slate360-context/*` | Stale historical archive | Superseded by active docs and project memory |
| `_archived_context/prompts/*` | Stale historical archive | Useful only for forensic reconstruction |
| `_archived_context/CODEBASE_AUDIT_2025.md` | Historical audit | Do not treat as current implementation plan |
| `_archived_context/SLATE360_ARCHITECTURE.md` | Historical architecture | Superseded by master build plan and current docs |

## Active But Potentially Confusing Files

| File | Classification | Risk |
|---|---|---|
| `DESIGN.md` | Unknown/current-adjacent | Could conflict with V1 token plan; verify before using |
| `docs/SLATE360_MASTER_BUILD_PLAN.md` | Potential duplicate | Root `SLATE360_MASTER_BUILD_PLAN.md` is the current master starting point; compare before trusting duplicate |
| `ONGOING_ISSUES.md` | Active but broad | Root issues may overlap `slate360-context/ONGOING_ISSUES.md` and `ops/bug-registry.json` |
| `slate360-context/ONGOING_ISSUES.md` | Active by Copilot instructions | Must be checked for bug discipline, but not a product doctrine source |
| `docs/CHATGPT_FACT_FINDING_HANDOFF.md` | Handoff/reference | Read only when task needs that handoff |
| `CRITICAL_FAILURE_REPORT_MAY.md` | Incident/reference | Read only when related to the incident area |
| `SECOND_OPINION_DOSSIER.md` | Review/reference | Read only for requested review context |

## Context Search Evidence

The audit search found current files across root `docs/`, active `slate360-context/`, and many archived files under `_archived_context/`. The archived tree includes old module build files for 360 Tours, billing, content studio, design studio, market robot, platform, Site Walk, SlateDrop, and old prompt backlogs.

Future agents should not scan all of these by default. Follow the task map in `.github/copilot-instructions.md` and use this file to identify the next single relevant doc.

## Recommended Cleanup Later

No cleanup was performed in this audit. Future approved cleanup could:

1. Add an archive warning README at `_archived_context/README.md` if absent.
2. Add a short pointer in confusing duplicate files to the current source map.
3. Normalize duplicate master-plan docs or explicitly mark one as generated copy.
4. Create `docs/SLATE360_GLOBAL_UX_DOCTRINE.md` only if it can unify, not duplicate, shell architecture and token docs.
5. Add a read-only context audit script that reports current, archived, duplicate, and missing expected docs.
