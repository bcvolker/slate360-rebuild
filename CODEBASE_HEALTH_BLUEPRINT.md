# Slate360 Codebase Health Blueprint

**Purpose:** Actionable rules and phased plan to move Slate360 from a vibe-coded, tangled codebase to a clean, composable architecture where features can be added and bugs fixed quickly without accumulating technical debt.

**Owner:** Engineering team + AI agents  
**Created:** 2026-03-02

---

## Table of Contents

1. [Current State Summary](#1-current-state-summary)
2. [Non-Negotiable Rules](#2-non-negotiable-rules)
3. [Phase 1 — Foundation (Week 1–2)](#3-phase-1--foundation-week-12)
4. [Phase 2 — Component Decomposition (Week 3–4)](#4-phase-2--component-decomposition-week-34)
5. [Phase 3 — Pattern Consolidation (Week 5–6)](#5-phase-3--pattern-consolidation-week-56)
6. [Phase 4 — Quality Gates (Week 7+)](#6-phase-4--quality-gates-week-7)
7. [File & Folder Conventions](#7-file--folder-conventions)
8. [Component Rules](#8-component-rules)
9. [API Route Rules](#9-api-route-rules)
10. [Type System Rules](#10-type-system-rules)
11. [State Management Rules](#11-state-management-rules)
12. [Dependency Rules](#12-dependency-rules)
13. [Testing Strategy](#13-testing-strategy)
14. [AI Agent Instructions](#14-ai-agent-instructions)

---

## 1. Current State Summary

| Metric | Value | Target |
|--------|-------|--------|
| **Total TS/TSX files** | 169 | — |
| **Total lines of code** | 33,742 | — |
| **Files > 500 lines** | 10 | 0 |
| **Largest file** | 3,006 lines (`MarketClient.tsx`) | < 300 |
| **API routes with duplicated auth boilerplate** | 48 | 0 |
| **`RouteContext` type copies** | 12 | 1 |
| **Custom hooks** | 1 | 10+ |
| **Shared UI components** | 1 (`tooltip.tsx`) | 15+ |
| **`any` type annotations** | 33 | 0 |
| **Client-rendered pages (could be server)** | 29 of 42 (69%) | < 30% |
| **Charting libraries** | 2 (redundant) | 1 |
| **ESLint custom rules** | 0 | 10+ |

### Root Causes of Debt

1. **No extraction discipline** — features were built by adding code to existing files instead of creating new modules.
2. **No shared abstractions** — every page and API route re-invents auth, data fetching, error handling, forms, tables, and modals from scratch.
3. **Client-component default** — pages use `"use client"` + `useEffect` + `fetch()` when they could be server components with direct DB access.
4. **No type sharing** — types are defined inline in every file, causing drift and duplication.
5. **No code quality enforcement** — ESLint config has zero rules, so nothing prevents the above.

---

## 2. Non-Negotiable Rules

These rules apply to **every** code change going forward. Any AI agent or developer working on this codebase must follow them.

### Rule 1: No File Exceeds 300 Lines

If a file approaches 300 lines, extract a sub-component, utility, or hook before adding more code. The only exceptions are auto-generated files and migration files.

### Rule 2: No Duplicated Patterns

If you write the same 5+ lines of code in two places, extract it into a shared utility, hook, or higher-order function. Specific targets:
- Auth boilerplate → shared `withAuth()` wrapper
- Supabase query patterns → shared typed query helpers
- Table/form/modal UI → shared components
- Type definitions → shared `types/` files

### Rule 3: Server Components by Default

Every new `page.tsx` must be a **server component** unless it requires interactivity that cannot be isolated into a child client component. Data fetching happens on the server; interactivity lives in small client-component islands.

### Rule 4: Typed, Not `any`

No `any` type annotations. Use `unknown` + type narrowing, generics, or proper interface definitions. When interfacing with untyped APIs (Google Maps, model-viewer), create a typed wrapper.

### Rule 5: Every Component Has a Single Responsibility

A component does one thing. A "project card" is not also a "delete modal" and a "context menu." Extract each into its own file.

### Rule 6: Imports Flow Downward

```
lib/          → pure utilities, types, server helpers (no React)
components/   → reusable UI (imports from lib/)
app/          → pages & routes (imports from components/ and lib/)
```

Never import from `app/` into `components/` or `lib/`. Never import from `components/` into `lib/`.

---

## 3. Phase 1 — Foundation (Week 1–2)

**Goal:** Create the shared infrastructure that all future work builds on. No feature changes — only extraction and consolidation.

### 1.1 Create Shared Types

Create `lib/types/` directory with domain type files:

```
lib/types/
  project.ts      — Project, ProjectMember, ProjectTask, ProjectBudget, etc.
  slatedrop.ts    — Folder, DbFile, UploadMeta
  market.ts       — Listing, MarketBot, PredictionMarket
  account.ts      — UserProfile, Organization, OrgMember, Tier
  api.ts          — RouteContext, ApiResponse<T>, ApiError
```

**Action:** Extract every inline type from API routes and components into these files. Replace 12 copies of `RouteContext` with 1 import.

### 1.2 Create Auth Middleware for API Routes

Create `lib/server/api-auth.ts`:

```typescript
// Shared auth wrapper — replaces 48 copy-pasted preambles
export async function withProjectAuth(
  req: NextRequest,
  context: RouteContext,
  handler: (ctx: AuthedProjectContext) => Promise<NextResponse>
): Promise<NextResponse> {
  const { projectId } = await context.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  const { admin, orgId } = await resolveProjectScope(user.id);
  const { project } = await getScopedProjectForUser(user.id, projectId, "id");
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  
  return handler({ req, user, admin, orgId, projectId, project });
}
```

**Action:** Refactor all project API routes to use `withProjectAuth()`. Each route's handler shrinks from 40+ lines to 15.

### 1.3 Create Shared Error Response Utility

```typescript
// lib/server/api-response.ts
export function ok<T>(data: T) { return NextResponse.json(data); }
export function created<T>(data: T) { return NextResponse.json(data, { status: 201 }); }
export function badRequest(msg: string) { return NextResponse.json({ error: msg }, { status: 400 }); }
export function unauthorized() { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }
export function notFound(msg = "Not found") { return NextResponse.json({ error: msg }, { status: 404 }); }
export function serverError(msg: string) { return NextResponse.json({ error: msg }, { status: 500 }); }
```

### 1.4 Configure ESLint

Add actionable rules to `eslint.config.mjs`:
- `no-restricted-syntax` — ban `as any`
- `max-lines` — warn at 250, error at 350
- `import/order` — enforce consistent import ordering
- `no-duplicate-imports`
- `react/no-unstable-nested-components`

---

## 4. Phase 2 — Component Decomposition (Week 3–4)

**Goal:** Break the 3 monolith components into composable pieces.

### 2.1 Decompose `DashboardClient.tsx` (2,943 lines)

Target structure:
```
components/dashboard/
  DashboardClient.tsx        — < 150 lines, layout shell only
  DashboardHeader.tsx        — header bar, nav, notifications
  DashboardStatsGrid.tsx     — stat cards row
  DashboardProjectList.tsx   — project cards section
  DashboardActivityFeed.tsx  — activity section
  DashboardWidgetGrid.tsx    — widget container
```

### 2.2 Decompose `MarketClient.tsx` (3,006 lines)

Target structure:
```
components/dashboard/market/
  MarketClient.tsx           — < 150 lines, layout shell
  MarketListingCard.tsx      — individual listing
  MarketListingGrid.tsx      — grid/list view
  MarketCreateForm.tsx       — create/edit flow
  MarketFilterBar.tsx        — search/filter controls
  MarketBotPanel.tsx         — AI bot interface
  MarketDetailModal.tsx      — listing detail view
```

### 2.3 Decompose `SlateDropClient.tsx` (1,965 lines)

Target structure:
```
components/slatedrop/
  SlateDropClient.tsx        — < 200 lines, layout shell
  SlateDropSidebar.tsx       — folder tree sidebar
  SlateDropFileGrid.tsx      — file list / grid view
  SlateDropUploadZone.tsx    — drag-and-drop upload area
  SlateDropContextMenu.tsx   — right-click context menu
  SlateDropPreviewPanel.tsx  — file preview
  SlateDropBreadcrumb.tsx    — breadcrumb navigation
```

### 2.4 Create Shared UI Components

Build a minimal component library in `components/ui/`:

```
components/ui/
  Modal.tsx           — reusable modal wrapper (replaces 8+ inline modals)
  ConfirmDialog.tsx   — 2-step delete / dangerous action confirmation
  DataTable.tsx       — sortable, filterable table (replaces 10+ inline tables)
  FormField.tsx       — label + input + error wrapper
  Toast.tsx           — toast notification (replaces 10+ inline toasts)
  EmptyState.tsx      — standard empty-state placeholder
  StatusBadge.tsx     — colored status pills
  DropdownMenu.tsx    — 3-dot / context menu wrapper
  Skeleton.tsx        — loading skeleton primitives
  PageHeader.tsx      — standard page header with breadcrumb
```

**Extraction rule:** Before building any of these, search the codebase for existing inline implementations, extract the best one, and replace all others.

---

## 5. Phase 3 — Pattern Consolidation (Week 5–6)

**Goal:** Eliminate remaining duplication and establish consistent patterns.

### 3.1 Create Data-Fetching Hooks

```
lib/hooks/
  useProjectData.ts      — fetch + cache project-scoped data (replaces 10+ useEffect+fetch patterns)
  useTableState.ts       — pagination, sorting, filtering state
  useFormState.ts        — form field state + validation + submit handler
  useToast.ts            — toast queue with auto-dismiss
  useConfirmAction.ts    — 2-step confirmation flow state
```

### 3.2 Convert Client Pages to Server Components

Priority pages to convert (currently client-rendered with `useEffect` + `fetch`):
1. `project-hub/[projectId]/rfis/page.tsx`
2. `project-hub/[projectId]/submittals/page.tsx`
3. `project-hub/[projectId]/budget/page.tsx`
4. `project-hub/[projectId]/daily-logs/page.tsx`
5. `project-hub/[projectId]/punch-list/page.tsx`
6. `project-hub/[projectId]/schedule/page.tsx`
7. `project-hub/[projectId]/photos/page.tsx`
8. `project-hub/[projectId]/drawings/page.tsx`

**Pattern:** Server component fetches data → passes to a client component for interactivity.

```tsx
// page.tsx (server component)
export default async function RFIsPage({ params }) {
  const { projectId } = await params;
  const { rfis } = await fetchProjectRFIs(projectId);
  return <RFITable projectId={projectId} initialData={rfis} />;
}
```

### 3.3 Consolidate API Routes

The 5 project CRUD routes (`rfis`, `submittals`, `budget`, `daily-logs`, `punch-list`) share 90% identical code. Create a factory:

```typescript
// lib/server/project-crud-route.ts
export function createProjectCrudRoute(tableName: string, selectClause: string) {
  return {
    GET: (req, ctx) => withProjectAuth(req, ctx, async ({ admin, projectId }) => {
      const { data } = await admin.from(tableName).select(selectClause).eq("project_id", projectId);
      return ok({ [tableName]: data ?? [] });
    }),
    POST: (req, ctx) => withProjectAuth(req, ctx, async ({ admin, projectId, user }) => {
      const body = await req.json();
      const { data, error } = await admin.from(tableName).insert({ ...body, project_id: projectId, created_by: user.id }).select().single();
      if (error) return serverError(error.message);
      return created(data);
    }),
    DELETE: (req, ctx) => withProjectAuth(req, ctx, async ({ admin, projectId }) => {
      const { id } = await req.json();
      await admin.from(tableName).delete().eq("id", id).eq("project_id", projectId);
      return ok({ deleted: true });
    }),
  };
}
```

### 3.4 Remove Redundant Dependencies

- Remove **one** of `chart.js`/`react-chartjs-2` or `recharts` — standardize on one charting library.
- Audit Web3 imports — if prediction market features are not active, tree-shake or lazy-load the 7 Web3 packages.

---

## 6. Phase 4 — Quality Gates (Week 7+)

### 4.1 Automated Checks

Add to CI/CD pipeline:
- **ESLint** — block PRs that introduce `any`, exceed file line limits, or break import order.
- **TypeScript strict** — add `noUncheckedIndexedAccess: true` to tsconfig.
- **Bundle analyzer** — track bundle size per route; alert on regressions.
- **Playwright smoke tests** — already partially set up; expand to cover project CRUD, SlateDrop upload, and market listing flow.

### 4.2 PR Review Checklist

Before merging, verify:
- [ ] No file exceeds 300 lines
- [ ] No new `any` annotations
- [ ] New components are in `components/`, not inline in `page.tsx`
- [ ] API routes use `withAuth()` / `withProjectAuth()` wrappers
- [ ] Types are imported from `lib/types/`, not defined inline
- [ ] Server component by default; `"use client"` only for interactive islands

---

## 7. File & Folder Conventions

### Current (Problematic)
```
components/
  dashboard/
    DashboardClient.tsx    ← 2,943 lines, does everything
    MarketClient.tsx       ← 3,006 lines, does everything
    LocationMap.tsx         ← 1,568 lines
```

### Target
```
components/
  dashboard/
    DashboardLayout.tsx           ← ~100 lines, shell
    DashboardHeader.tsx           ← ~80 lines
    DashboardStatsGrid.tsx        ← ~60 lines
    DashboardProjectCards.tsx     ← ~80 lines
    market/
      MarketLayout.tsx            ← ~100 lines
      MarketListingCard.tsx       ← ~60 lines
      MarketFilterBar.tsx         ← ~50 lines
      ...
  ui/
    Modal.tsx
    ConfirmDialog.tsx
    DataTable.tsx
    ...
  shared/
    PageHeader.tsx
    QuickNav.tsx
    ...
lib/
  types/
    project.ts
    slatedrop.ts
    market.ts
    account.ts
    api.ts
  server/
    api-auth.ts
    api-response.ts
    project-crud-route.ts
    org-context.ts
  hooks/
    useProjectData.ts
    useTableState.ts
    useFormState.ts
    useToast.ts
    useConfirmAction.ts
```

### Naming Rules

| Entity | Convention | Example |
|--------|-----------|---------|
| Components | PascalCase, noun-based | `ProjectCard.tsx` |
| Hooks | camelCase, `use` prefix | `useProjectData.ts` |
| Utilities | camelCase, verb-based | `resolveProjectScope.ts` |
| Types | PascalCase, noun-based | `Project`, `ApiResponse<T>` |
| API routes | `route.ts` only | `app/api/projects/route.ts` |
| Constants | UPPER_SNAKE_CASE | `MAX_FILE_SIZE` |

---

## 8. Component Rules

### Maximum Complexity

| Metric | Limit |
|--------|-------|
| Lines per file | 300 |
| `useState` hooks per component | 5 (extract a custom hook above this) |
| `useEffect` hooks per component | 2 (extract data fetching to a hook or server component) |
| Props per component | 7 (group into an object prop above this) |
| Inline event handlers | 3 lines (extract to named function above this) |

### Component Template

```tsx
// components/project-hub/ProjectCard.tsx
"use client";

import { type FC } from "react";
import type { Project } from "@/lib/types/project";

interface ProjectCardProps {
  project: Project;
  onDelete: (id: string) => void;
}

const ProjectCard: FC<ProjectCardProps> = ({ project, onDelete }) => {
  // ... < 100 lines of JSX
};

export default ProjectCard;
```

### What Goes Where

| Content | Location |
|---------|----------|
| Layout shell (header, sidebar, main area) | `page.tsx` or layout component |
| Interactive table/form/modal | Dedicated component file |
| Data fetching (server) | Server component `page.tsx` or `lib/server/` |
| Data fetching (client) | Custom hook in `lib/hooks/` |
| Business logic | `lib/` utility |
| Supabase queries | `lib/server/` or `lib/projects/` |
| UI primitives (button, input, modal) | `components/ui/` |
| Feature-specific components | `components/<feature>/` |

---

## 9. API Route Rules

### Before (Current Pattern — Repeated 48 Times)

```typescript
export async function GET(req: NextRequest, context: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await context.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { admin } = await resolveProjectScope(user.id);
  const { project } = await getScopedProjectForUser(user.id, projectId, "id");
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  
  const { data, error } = await admin.from("project_rfis").select("*").eq("project_id", projectId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rfis: data });
}
```

### After (Target Pattern)

```typescript
import { withProjectAuth } from "@/lib/server/api-auth";
import { ok, serverError } from "@/lib/server/api-response";
import type { RouteContext } from "@/lib/types/api";

export const GET = (req: NextRequest, ctx: RouteContext) =>
  withProjectAuth(req, ctx, async ({ admin, projectId }) => {
    const { data, error } = await admin.from("project_rfis").select("*").eq("project_id", projectId);
    if (error) return serverError(error.message);
    return ok({ rfis: data });
  });
```

**Result:** 15 lines → 6 lines. Auth, scoping, and error handling are guaranteed correct.

---

## 10. Type System Rules

### Banned Patterns

```typescript
// ❌ NEVER
const data = result as any;
const items: any[] = [];
function process(input: any) {}

// ✅ INSTEAD
const data = result as ProjectRFI[];
const items: ProjectRFI[] = [];
function process(input: unknown) {
  if (!isProjectRFI(input)) throw new Error("Invalid input");
}
```

### Supabase Query Types

Create typed query helpers instead of casting:

```typescript
// lib/server/queries.ts
export async function getProjectRFIs(admin: SupabaseClient, projectId: string) {
  const { data, error } = await admin
    .from("project_rfis")
    .select("id, title, status, assigned_to, created_at, response")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  
  return { rfis: (data ?? []) as ProjectRFI[], error };
}
```

---

## 11. State Management Rules

### When to Use What

| Scenario | Solution |
|----------|----------|
| Form field values | Custom `useFormState` hook |
| Server data (list of RFIs, projects) | Server component prop OR `useProjectData` hook |
| UI toggle (modal open, sidebar collapsed) | Local `useState` — fine |
| Cross-page state (current org, user profile) | React Context via `lib/context/` |
| Complex derived state (filters + sort + pagination) | Custom `useTableState` hook |
| Global app state (rare) | Zustand store |

### Rule: Extract When `useState` Count Exceeds 5

```typescript
// ❌ Before — 18 useState hooks in one component
const [items, setItems] = useState([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);
const [form, setForm] = useState({});
const [editing, setEditing] = useState(null);
const [saving, setSaving] = useState(false);
// ... 12 more

// ✅ After — extracted hooks
const { items, loading, error, refresh } = useProjectData("rfis", projectId);
const { form, setField, reset, submit, saving } = useFormState(initialValues, onSubmit);
const { toast, showToast } = useToast();
```

---

## 12. Dependency Rules

### Consolidation Targets

| Current | Action |
|---------|--------|
| `chart.js` + `react-chartjs-2` + `recharts` | Pick one (recommend `recharts` — React-native). Remove the other. |
| 7 Web3 packages | Lazy-load via `next/dynamic` — only load on market pages |
| 4 PDF packages | Lazy-load — only needed for report export |

### Adding New Dependencies

Before adding a package:
1. Check if the functionality exists in an existing dependency
2. Check bundle size impact (`bundlephobia.com`)
3. Prefer packages with tree-shaking support
4. Document why it was added in the PR

---

## 13. Testing Strategy

### Current State
- 1 Playwright spec (`e2e/mobile-smoke.spec.ts`) 
- 0 unit tests
- 0 component tests

### Target

| Layer | Tool | Coverage Target |
|-------|------|-----------------|
| Unit (utilities, hooks) | Vitest | `lib/` functions, custom hooks |
| Component (UI) | Vitest + Testing Library | Shared UI components (`Modal`, `DataTable`, etc.) |
| Integration (API routes) | Vitest | Auth middleware, CRUD route factories |
| E2E (user flows) | Playwright | Project CRUD, SlateDrop upload, auth flow, market listing |

### Priority Test Targets

1. `withAuth()` and `withProjectAuth()` middleware
2. `resolveProjectScope()` scoping logic
3. Shared `DataTable` sorting/filtering
4. Project create → open → delete flow (E2E)
5. SlateDrop upload → download flow (E2E)

---

## 14. AI Agent Instructions

When any AI agent works on this codebase, it must:

1. **Read this document first** before making changes.
2. **Check file line count** before editing — if a file is near 300 lines, extract before adding.
3. **Search for existing patterns** before creating new ones — use `grep` to find similar code that should be reused.
4. **Never add `any`** — use proper types or `unknown` with narrowing.
5. **Never duplicate auth boilerplate** — use `withAuth()` / `withProjectAuth()` wrappers (create them first if they don't exist yet).
6. **Prefer server components** — only add `"use client"` when the component needs browser APIs, event handlers, or `useState`/`useEffect`.
7. **Create small files** — one component per file, one hook per file, one utility per file.
8. **Update the issue ledger** when fixing runtime bugs.
9. **Don't create new documentation files** for every change — update existing docs instead.
10. **Run `get_errors`** after editing to verify no TypeScript errors were introduced.

### Refactoring Checklist (Before PR)

- [ ] No file I touched exceeds 300 lines
- [ ] No new `any` annotations
- [ ] No duplicated auth boilerplate
- [ ] Types imported from `lib/types/`, not defined inline
- [ ] New components are in `components/`, not inline in pages
- [ ] Server component where possible
- [ ] Custom hook extracted if `useState` count > 5

---

## Quick Reference: What to Fix First

If you only have time for 3 things, do these:

1. **Create `lib/server/api-auth.ts`** with `withAuth()` and `withProjectAuth()` — immediately eliminates the #1 source of duplication (48 routes).
2. **Create `lib/types/api.ts`** with `RouteContext` and `ApiResponse<T>` — instantly removes 12 type copies.
3. **Decompose `DashboardClient.tsx`** (2,943 lines → 6 files of ~150 lines each) — proves the pattern for all other monolith files.

If you have time for 3 more:

4. Create `components/ui/Modal.tsx` and `components/ui/ConfirmDialog.tsx` — replaces 8+ inline modal implementations.
5. Create `lib/hooks/useToast.ts` — replaces 10+ inline toast implementations.
6. Add `max-lines` ESLint rule — prevents future monoliths.
