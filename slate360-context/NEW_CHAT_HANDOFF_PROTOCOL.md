# Slate360 — New Chat Handoff Protocol

**Last Updated:** 2026-03-04 (Session 6 — Complete rewrite with comprehensive start/end protocol, failure mode library, and session templates)  
**Purpose:** Prevent context drift, avoid re-introducing fixed bugs, and ensure every new session picks up exactly where the last one left off.

---

## PART 1 — Start of Chat: Orientation Protocol

### Step 1: Read These Files (Required, In Order)

Read every file in this list before touching any code. Skip none.

| Order | File | Purpose |
|---|---|---|
| 1 | `SLATE360_PROJECT_MEMORY.md` | Master state — platform overview, tech stack, code rules, key patterns |
| 2 | `slate360-context/NEW_CHAT_HANDOFF_PROTOCOL.md` | This file |
| 3 | `slate360-context/ONGOING_ISSUES.md` | Active bugs, open tech debt, refactor status |
| 4 | `slate360-context/FUTURE_FEATURES.md` | Full roadmap (Phases 0–7) + Phase 0G/0H quick wins |
| 5 | `ops/bug-registry.json` | Machine-readable open bugs with verification checks |
| 6 | `slate360-context/GUARDRAILS.md` | Code quality rules — read before writing any code |
| 7 | Module-specific blueprint | E.g. `slate360-context/DASHBOARD.md`, `PROJECT_HUB.md`, `SLATEDROP.md` for the area you'll touch |
| 8 | `slate360-context/dashboard-tabs/MODULE_REGISTRY.md` | Canonical tab routes, gates, and spec precedence |

For new tab/module work, also read:
- `slate360-context/dashboard-tabs/CUSTOMIZATION_SYSTEM.md`
- `slate360-context/dashboard-tabs/{tab}/IMPLEMENTATION_PLAN.md`

### Step 2: Run Pre-Flight Checks

```bash
# Confirm TypeScript is clean before making ANY changes
npm run typecheck

# Check current line count of any file you plan to touch
wc -l <file-path>
```

**If the file you plan to touch is > 300 lines, extract first. Do not add features to an over-limit file.**

### Step 3: Verify Non-Negotiables Before Coding

Before writing any code, confirm all of the following for the scope of your work:

- [ ] Route and access gate verified in `MODULE_REGISTRY.md`
- [ ] Entitlement check uses `getEntitlements()` from `lib/entitlements.ts` — cross-reference module access table in `copilot-instructions.md`
- [ ] Internal-tab gate: `/ceo`, `/market`, `/athlete360` use `hasInternalAccess` (NOT entitlements)
- [ ] New module entitlements match the tier access table — trial = Hub + SlateDrop only
- [ ] `"use client"` only where browser APIs or state are required
- [ ] API routes use `withAuth()` / `withProjectAuth()` from `@/lib/server/api-auth`
- [ ] Response helpers from `@/lib/server/api-response` (`ok()`, `badRequest()`, `serverError()`)
- [ ] Types imported from `lib/types/`, not defined inline
- [ ] No `any` — use `unknown` + narrowing, generics, or interfaces
- [ ] Folder DB writes use `project_folders` (NOT `file_folders`)

---

## PART 2 — During Work: Critical Rules

### File Size Discipline (The Single Most Important Rule)

| File Size | Required Action |
|---|---|
| Approaching 300 lines | Extract next logical sub-component or hook BEFORE adding code |
| Over 300 lines | DO NOT add features. Decompose first, then add. |
| Over 1,000 lines | STOP. This is a monolith. Plan full decomposition before any edit. |

**Why this matters:** AI sessions can't reliably edit files they can't see in full context. Every file over 300 lines is a reliability hazard that causes partial fixes, missed side effects, and regressions.

### Pattern Quick Reference

```typescript
// ✅ Correct: Auth in API routes
export const GET = (req: NextRequest, ctx: ProjectRouteContext) =>
  withProjectAuth(req, ctx, async ({ admin, projectId }) => {
    const { data, error } = await admin.from("table").select("*").eq("project_id", projectId);
    if (error) return serverError(error.message);
    return ok({ items: data });
  });

// ✅ Correct: Entitlement check
const e = getEntitlements(user.tier);
if (!e.canAccessDesignStudio) notFound();

// ❌ Wrong: Never inline tier comparisons
if (tier === 'business' || tier === 'enterprise') { ... }

// ✅ Correct: Internal/admin tabs — use hasInternalAccess, NOT entitlements
const { hasInternalAccess } = await resolveServerOrgContext(req);
if (!hasInternalAccess) notFound();

// ✅ Correct: Supabase client patterns
// Browser ("use client"):   import { createClient } from "@/lib/supabase/client"
// Server (API routes):      import { createServerSupabaseClient } from "@/lib/supabase/server"
// Admin (server only):      import { createAdminClient } from "@/lib/supabase/admin"
```

### Recurring Failure Mode Library

These patterns have caused silent bugs in this codebase. Check for each before submitting any change:

| Anti-Pattern | What Happens | Prevention |
|---|---|---|
| Creating a file/component but not wiring it to parent | Works locally, crashes at runtime | After creating ANY file, ALWAYS verify it is imported and used by the component that needs it |
| Guard added in JSX but the corresponding state var never declared | `ReferenceError` crash — was worse than the original bug | Grep for the variable name in the same file before adding a guard |
| CSP directive fixed for one resource type but sibling directive missed | Half the cases still fail silently | When editing `next.config.ts` CSP, audit ALL directives that could affect the same resource origin |
| `confirm()` for delete confirmation | Breaks the 2-step deletion contract, native blocking dialog | Use `ConfirmDialog` component or toast + inline confirmation |
| `any` cast to paper over a union type gap | TypeScript silently wrong; runtime crash on unexpected value | Extend the union type instead of casting |
| Demo/mock data left in production component | Rule 9 violation; confuses real vs mock data path | Always move to `lib/*/demo-data.ts` or replace with empty state component |
| Type defined both inline in component and in hook | Diverges silently; one gets updated, one doesn't | Single source of truth in `lib/types/` |
| Entitlement flag set `true` for tier that shouldn't have access | Paywall bypass when module ships real functionality | Always cross-check `lib/entitlements.ts` against module access table after any change |

---

## PART 3 — After Each Change: Validation Protocol

After ANY code change, run in this exact order:

```bash
# 1. TypeScript errors — must be zero
npm run typecheck

# 2. Check sizes of every file you touched
wc -l <each-file-you-edited>
```

Then use the `get_errors` tool on changed files.

**Do not continue to the next change until:**
- Zero TypeScript errors
- No file you touched has grown over 300 lines
- Context docs are updated (see Part 4)

---

## PART 4 — Context Maintenance (Required After Any Change)

**Every time you make a code change, update at least one context file.** These docs are the project memory passed between sessions. If they fall behind, the next agent makes wrong assumptions.

### What to Update and When

| Change Type | Required Context Updates |
|---|---|
| New route or page | `MODULE_REGISTRY.md`, module blueprint (e.g. `DASHBOARD.md`) |
| New API endpoint | Module blueprint, `BACKEND.md` if auth/billing/storage touched |
| New DB table or column | `BACKEND.md`, `FUTURE_FEATURES.md` (mark infrastructure as done) |
| Bug fixed | `ONGOING_ISSUES.md`, `ops/bug-registry.json`, `PROJECT_RUNTIME_ISSUE_LEDGER.md` |
| New component extracted from large file | Module blueprint (update file size entry) |
| Entitlement change | `SLATE360_PROJECT_MEMORY.md` §11, verify `lib/entitlements.ts` matches module access table |
| Feature added | `FUTURE_FEATURES.md` (mark status → ✅), module blueprint |
| New pattern established | `SLATE360_PROJECT_MEMORY.md` §12 (Patterns & Gotchas) |

---

## PART 5 — Current Codebase State (March 4, 2026)

### Refactor Status: Core Scope ✅ COMPLETE

| Item | Status |
|---|---|
| SlateDrop decomposition (2,030 → 577 lines) | ✅ Done |
| Dashboard widget extraction (11 components) | ✅ Done |
| Project Hub Slice C (ClientPage.tsx = 249 lines) | ✅ Done |
| BUG-018 DrawingManager removal (LocationMap.tsx) | ✅ Done |
| BUG-022 Trial tier entitlement fix | ✅ Done |
| All critical bugs BUG-010 through BUG-021 | ✅ Done |

### Files Still Over 300 Lines (Priority Order for Phase 0H)

| # | File | Lines | Strategy |
|---|---|---|---|
| 1 | `components/dashboard/MarketClient.tsx` | 3,006 | 7 tab components + 2 market hooks |
| 2 | `components/dashboard/DashboardClient.tsx` | 2,043 | Extract `renderWidget` + demo data + utils |
| 3 | `components/dashboard/LocationMap.tsx` | 1,864 | 5 extractions: search, routing, drawing, share, container |
| 4 | `management/page.tsx` | 932 | 3 tab components + `useStakeholders` + `useContracts` |
| 5 | `app/page.tsx` | 780 | Section components per homepage section |
| 6 | `photos/page.tsx`, `submittals/page.tsx` | 579–599 | `ProjectToolLayout` + `useProjectCrudBase` |
| 7–13 | Other tool pages | 339–465 | Same `ProjectToolLayout` + hook pattern |

### Open Bugs (full detail in `ops/bug-registry.json`)

| ID | Module | Status | Summary |
|---|---|---|---|
| BUG-001 | SlateDrop | ⚠️ Open | `file_folders` → `project_folders` migration Phase 2 |
| BUG-021 | Location | 🟡 In Progress | Inconsistent location display across contexts |
| BUG-023 | Dashboard | ⚠️ Open | Type duplication: dashboard client ↔ runtime hook |
| BUG-024 | Dashboard | ⚠️ Open | 8 mock data arrays in DashboardClient production component |
| BUG-025 | Dashboard | ⚠️ Open | No error boundary on (dashboard) route group |

### Recommended Starting Points for New Sessions

| Priority | Work | File(s) | Effort |
|---|---|---|---|
| 1 | **BUG-025**: Add error boundary | Create `app/(dashboard)/error.tsx` | 15 min |
| 2 | **BUG-024**: Extract demo data | `components/dashboard/DashboardClient.tsx` → `lib/dashboard/demo-data.ts` | 30 min |
| 3 | **Phase 0G**: Dashboard Quick Actions Row | `DashboardClient.tsx` or new widget component | 1–2 hrs |
| 4 | **Phase 0H #1**: `MarketClient.tsx` decomposition | Major session — plan before starting | 2–3 hrs |
| 5 | **Phase 0G**: SlateDrop expiring-share center | New page/component + `slatedrop_shares` table | 2–3 hrs |
| 6 | **Phase 1**: RFI export PDF + SLA timers | `rfis/page.tsx` | 1–2 hrs |

---

## PART 6 — End of Chat: Required Handoff Block

Use this exact structure as the final message in any session that made changes:

```markdown
## Session Handoff — [Date]

### What Changed
- [file]: [what changed and why]

### Context Files Updated
- [file]: [what was updated]

### Bugs Fixed
- BUG-XXX: [description]

### Bugs Opened
- BUG-XXX: [description, root cause, verification steps]

### Open Risks / Blockers
- [anything unresolved that the next session must know about]

### Next 3 Highest-Leverage Steps
1. [specific file + action]
2. [specific file + action]
3. [specific file + action]
```

---

## PART 7 — Session Templates

### Bug Fix Session

```markdown
### Session Scope
Goal: Fix BUG-XXX — [description]
In-scope files: [list]
Out-of-scope: [modules to leave alone]

### Pre-flight
- [ ] SLATE360_PROJECT_MEMORY.md read
- [ ] ONGOING_ISSUES.md read
- [ ] typecheck baseline: clean
- [ ] Full relevant file read before editing
- [ ] File under 300 lines (if not: extract first)

### Post-change
- [ ] get_errors: zero errors
- [ ] typecheck: clean
- [ ] File sizes within limit
- [ ] ONGOING_ISSUES.md updated
- [ ] ops/bug-registry.json updated
- [ ] Commit + push
```

### Feature Implementation Session

```markdown
### Session Scope
Goal: [feature name] in [module]
Gate: [entitlement flag] — verified in lib/entitlements.ts
Route: [route from MODULE_REGISTRY.md]

### Pre-flight
- [ ] Route verified in MODULE_REGISTRY.md
- [ ] Entitlement cross-checked against module access table
- [ ] Module blueprint read
- [ ] DB schema confirmed
- [ ] File sizes within limit before starting

### Post-change
- [ ] No TypeScript errors
- [ ] No new files over 300 lines
- [ ] FUTURE_FEATURES.md status updated
- [ ] Module blueprint updated
- [ ] Commit + push
```

### Decomposition Session

```markdown
### Session Scope
Goal: Decompose [file] ([N] lines → target < 300 lines)
Extract into: [list of new files]
CRITICAL: NO feature changes — pure relocation only

### Pre-flight
- [ ] Read entire source file before starting
- [ ] Map all state dependencies
- [ ] Map all prop passing between sections
- [ ] Plan exact extraction order

### Post-change
- [ ] Source file now under 300 lines
- [ ] All extracted files under 300 lines
- [ ] typecheck: clean (no behavior change)
- [ ] Module blueprint file sizes updated
- [ ] Commit + push
```

---

## Appendix: Quick Reference Key Files

| File | Purpose |
|---|---|
| `SLATE360_PROJECT_MEMORY.md` | Master state — read first always |
| `slate360-context/FUTURE_FEATURES.md` | Roadmap + Phase 0G (quick wins) + Phase 0H (health pass) |
| `slate360-context/ONGOING_ISSUES.md` | Active bugs + tech debt + refactor status |
| `slate360-context/GUARDRAILS.md` | Code quality rules |
| `slate360-context/BACKEND.md` | Auth, billing, S3, DB, email patterns |
| `slate360-context/REVIEW_PROMPT_SONNET46.md` | Full code health review prompt for deep audit sessions |
| `ops/bug-registry.json` | Machine-readable bug list with verification |
| `ops/module-manifest.json` | Machine-readable module routes/status |
| `lib/entitlements.ts` | Tier access (single source of truth) |
| `lib/server/api-auth.ts` | `withAuth()`, `withProjectAuth()` |
| `lib/server/api-response.ts` | `ok()`, `badRequest()`, `serverError()` |
| `lib/types/api.ts` | `ProjectRouteContext`, `ApiErrorPayload` |
