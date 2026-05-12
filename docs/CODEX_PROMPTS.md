# Codex Prompts — Slate360

Date: 2026-05-12

Use these prompts for no-edit audits, branch reviews, and narrow implementation planning. Replace bracketed values before use.

## 1. Site Walk Plan Pin/Capture No-Edit Audit

You are reviewing Slate360 as a senior release engineer. Do not edit files. Audit the Site Walk plan pin/capture workflow for BUG-079.

Read:
- `docs/CHATGPT_FACT_FINDING_HANDOFF.md`
- `docs/CHATGPT_FACT_FINDING_FILE_LIST.txt`
- `components/site-walk/capture/PlanViewerLeaflet.tsx`
- `components/site-walk/capture/PlanQuickActionMenu.tsx`
- `components/site-walk/capture/CaptureContext.tsx`
- `components/site-walk/capture/useCaptureFileHandler.ts`
- `lib/hooks/useCaptureUpload.ts`
- `app/api/site-walk/items/route.ts`
- `app/api/site-walk/pins/route.ts`
- `app/api/site-walk/pins/[id]/route.ts`
- `app/site-walk/(act-2-inputs)/capture/_components/CaptureClientIsland.tsx`

Return:
1. Exact call chain from plan press to persisted rows.
2. Where local IDs are created.
3. Where UUIDs are required.
4. Where UI state can diverge from DB state.
5. Smallest safe implementation slice.
6. Tests or smoke checks needed on iOS/Android devices.

## 2. Site Walk Plan Pin Identity Lifecycle Fix

You are implementing one narrow fix for BUG-079. Do not redesign UI. Do not touch Trigger rasterization. Do not edit migrations.

Goal: make plan pin identity authoritative and stable from plan interaction through capture save and return-to-plan.

Before editing, confirm:
- Whether draft pins are persisted before capture or created after item save.
- Whether `client_pin_id` can reconcile optimistic pins.
- Whether server returns the persisted pin row to the UI.
- Whether pin numbering is server-backed or only label-based.

Implement the smallest safe slice and run:
- `npm run typecheck`
- `npm run build`
- relevant guardrails

Return the diff summary, validation results, and physical-device smoke steps.

## 3. App Shell Hidden-App Audit

Do not edit files. Audit App Store mode and authenticated app shell exposure.

Read:
- `lib/app-store-mode.ts`
- `middleware.ts`
- `components/dashboard/AppShell.tsx`
- `components/dashboard/command-center/DashboardSidebar.tsx`
- `components/dashboard/command-center/AppsGrid.tsx`
- `components/shared/MobileBottomNav.tsx`
- relevant `app/` routes from the build output

Find any path where hidden apps or unfinished modules are visible or reachable during the first app-store release. Return file path, line, risk, and suggested minimal fix.

## 4. Vibe-Coded Filler Audit

Do not edit files. Search release-visible `app/` and `components/` surfaces for filler or non-production language:
- Coming Soon
- placeholder
- lorem
- demo
- sample
- fake
- mock
- beta/test wording in user-facing copy
- dead or disabled CTAs

Return file path, line, exact text, whether it is release-visible, and recommended action.

## 5. Design Token / Style Drift Audit

Do not edit files. Audit release-visible shell and Site Walk surfaces for design drift from Dark Glass & Amber.

Focus on:
- hardcoded colors that should be tokens or shared classes
- inconsistent spacing/radii/elevation
- noncanonical shell components
- light-mode leakage in authenticated app surfaces

Return only actionable issues with file paths and line numbers.

## 6. App Store Readiness Audit

Do not edit files. Review the branch for iOS/Android app-store readiness.

Check:
- Site Walk-only visible app scope
- approval/pending gate behavior
- no hidden app exposure
- no demo/fake/Coming Soon language
- PWA/service-worker behavior
- mobile viewport and safe-area behavior
- plan capture physical-device risks
- no secrets or debug logs in user-facing output

Return blockers, warnings, and required smoke tests.

## 7. Codex PR Review Checklist

Review this PR as a senior release architect. Do not rewrite the PR. Check:

1. Does it stay on the feature branch and avoid direct `main` pushes?
2. Does it avoid `git add .` style broad staging?
3. Does it avoid unrelated refactors?
4. Does it preserve Trigger rasterization?
5. Does it preserve App Store mode cleanliness?
6. Does it keep hidden apps hidden?
7. Does it avoid fake/demo/Coming Soon/filler content?
8. Does Site Walk pin identity have one authoritative lifecycle?
9. Does the UI reconcile to the server pin UUID?
10. Does camera/upload preserve mobile user activation as much as possible?
11. Are typecheck/build/guard results present?
12. Are iOS/Android physical-device smoke steps documented?

Return approve/request-changes with exact file paths and line references.
