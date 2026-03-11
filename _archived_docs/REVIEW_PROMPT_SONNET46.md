# Slate360 — Deep Review Prompt for Sonnet 4.6

**Purpose:** This file is a ready-to-use prompt for starting a new session focused on code health review, refactor completeness audit, and enhancement planning. Copy the entire "Prompt" section below and paste it as your first message in a new chat.

**Last Updated:** 2026-03-04 (Session 6)

---

## How to Use

1. Start a new chat in VS Code with GitHub Copilot (Claude Sonnet 4.6)
2. Attach `SLATE360_PROJECT_MEMORY.md` as context if possible
3. Copy everything in the "PROMPT TEXT" section below and send it as your first message
4. The agent will perform the full audit and return findings in structured sections A–F
5. After review: implement the safe quick wins it recommends in the same session or a follow-up

---

## PROMPT TEXT (Copy Everything Below This Line)

---

You are a senior software architect reviewing the Slate360 SaaS platform. Slate360 is a Next.js 15 / React 19 / TypeScript 5 / Tailwind CSS 4 / Supabase / AWS S3 construction management + creative tools SaaS. The codebase is at `/workspaces/slate360-rebuild`. A major refactor has been partially completed over 6 sessions. Your task is to assess completeness, identify remaining issues, and recommend the highest-value next actions.

**This is primarily a research and assessment task.** Read the listed files, produce your findings, and at the end: if you find any zero-risk quick wins (defined below), implement them immediately before returning your report.

---

### STEP 1: Read These Files (Required, In This Order)

1. `.github/copilot-instructions.md` — rules, tier table, platform overview, guardrails
2. `SLATE360_PROJECT_MEMORY.md` — master project state, current file sizes, code rules
3. `slate360-context/ONGOING_ISSUES.md` — active bugs, open tech debt, refactor status
4. `slate360-context/GUARDRAILS.md` — code quality rules
5. `slate360-context/NEW_CHAT_HANDOFF_PROTOCOL.md` — new chat startup + session templates
6. `lib/entitlements.ts` (full, ~135 lines) — CRITICAL: cross-reference every `canAccess*` flag for `trial` and `creator` tiers against the module table in `copilot-instructions.md`
7. `components/dashboard/DashboardClient.tsx` lines 1–500 — scan for: duplicate type definitions, demo data arrays, `TabWireframe` inline sub-component, `renderWidget` inline closure
8. `lib/hooks/useDashboardRuntimeData.ts` (full) — confirm which types are duplicated with `DashboardClient.tsx`
9. `app/(dashboard)/error.tsx` — confirm whether this file exists (it should not yet)
10. `components/dashboard/MarketClient.tsx` lines 1–120 — scan imports, identify the 7 tab names, note wagmi/Web3 imports
11. `app/(dashboard)/project-hub/[projectId]/management/page.tsx` lines 1–100 — identify the three feature areas
12. `ops/bug-registry.json` — note all open bugs and their verification steps
13. `slate360-context/FUTURE_FEATURES.md` Phase 0G and 0H sections — understand the recommended next work

---

### STEP 2: Audit and Report

After reading all files, produce a report with these exactly-named sections:

**A. Entitlement Accuracy Check**

For every `canAccess*` flag in `lib/entitlements.ts`:
- Produce a table: `Tier | Flag | Current Value | Expected Value (from copilot-instructions module table) | Match?`
- Flag any mismatches as CRITICAL
- The trial tier should have: `canAccessHub: true`, `canViewSlateDropWidget: true`, ALL other `canAccess*: false`
- The creator tier should have: `canAccessContent: true`, `canAccessTourBuilder: true`, others false (no Hub, no Design Studio, no Geo, no Virtual, no Analytics)

**B. Code Anti-Patterns Found**

For each anti-pattern found, provide: File | Line(s) | Rule Violated | Severity | Recommended Fix

Check specifically for:
- Type definitions duplicated across files
- Demo/mock data in production components (Rule 9)
- Components defined inside other component files
- Inline closures over 50 lines inside render functions
- `confirm()` usage instead of proper confirmation dialogs
- `any` usage not covered by the documented Supabase exception
- Missing error boundaries on route groups
- Hardcoded hex color values (`#FF4D00`, `#1E3A8A`)

**C. Decomposition Priority Matrix**

For these files — `MarketClient.tsx`, `DashboardClient.tsx`, `LocationMap.tsx`, `management/page.tsx`, `app/page.tsx`, `submittals/page.tsx`, `photos/page.tsx` — produce:

`File | Current Lines | Target Files | Extraction Difficulty (Low/Med/High) | Immediate Impact | Priority (1–7, 1=highest)`

**D. Missing Shared Infrastructure**

List any hook, component, type file, or utility that is clearly needed by multiple files but does not exist. For each: `What | Where It Should Live | Which 2+ Files Would Benefit | Effort to Create`

Specifically check for:
- `lib/types/dashboard.ts` (does it exist?)
- `lib/types/project-hub.ts` (does it exist?)
- `useProjectCrudBase` hook (does it exist?)
- `ProjectToolLayout` component (does it exist?)
- `app/(dashboard)/error.tsx` (does it exist?)
- CSS design tokens for `#FF4D00` / `#1E3A8A` (do they exist in globals.css?)

**E. Verified Safe Quick Wins**

List 5–8 specific changes that meet ALL of the following criteria:
- Zero risk of breaking existing behavior
- Can each be completed in one focused effort
- Each reduces a known technical debt item or closes a known bug

For each: `What to do | Files to touch | Approximate line delta | Rule/Bug it satisfies`

**F. Next Session Action Brief**

Write one focused paragraph (150–200 words) that:
- Names the single best starting file for the next decomposition session
- Lists the exact components/hooks to extract and their target files
- States the expected line count result
- Notes any dependencies or sequencing requirements
- Is written so a fresh agent can begin executing it immediately without additional context

---

### STEP 3: Implement Any Zero-Risk Quick Wins

After completing your report, implement any items from Section E that:
1. Create a new file that did not exist (zero side-effects)
2. Require ONLY moving existing code to a new location (no logic change)
3. Add a missing type annotation where the value is certain

For each implementation:
- Run `get_errors` after the change
- Confirm zero TypeScript errors
- Update the relevant context file in `slate360-context/`
- Include a brief "Implemented" note in your report

Do NOT implement anything that modifies existing component behavior, changes API contracts, or touches auth/entitlement logic during this review session.

---

### Context: What the Refactor Has Accomplished (Do Not Re-Do)

These are complete — do not revisit:
- SlateDrop decomposition: `SlateDropClient.tsx` 2,030 → 577 lines (7 components + 7 hooks)
- Dashboard widget extraction: 11 widget components extracted from `DashboardClient.tsx`
- BUG-018: DrawingManager fully removed from `LocationMap.tsx`; all 7 drawing tools now use native `google.maps` listeners
- BUG-022: Trial tier entitlement misconfiguration fixed (all module access flags set to `false`)
- Project Hub Slice C: `ClientPage.tsx` at 249 lines
- All critical bugs BUG-010 through BUG-021 resolved

### Context: Key Rules (Enforce Throughout)

1. No file > 300 lines — extract before adding
2. No `any` — use `unknown` + narrowing or generics
3. Server components first — `"use client"` only for browser APIs/state
4. Auth via `withAuth()`/`withProjectAuth()` from `@/lib/server/api-auth`
5. Entitlements via `getEntitlements()` only — never inline tier comparisons
6. CEO/internal tabs (`/ceo`, `/market`, `/athlete360`) gated by `hasInternalAccess` — never via entitlements
7. Types from `lib/types/` — not inline
8. Imports flow downward: `lib/` → `components/` → `app/`
9. No mock data in production UI
10. Canonical folder table: `project_folders` (NOT `file_folders`)
11. After every change: update the relevant `slate360-context/` blueprint

