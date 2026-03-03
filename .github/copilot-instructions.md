# Slate360 — Copilot Instructions

**Last Updated:** 2026-03-02
**Repo:** `bcvolker/slate360-rebuild` · branch: `main` · live: https://www.slate360.ai

Before making any code change, read `SLATE360_PROJECT_MEMORY.md` in the project root.
For module-specific blueprints, see `slate360-context/` (one file per topic).

---

## Quick Rules

1. **No file > 300 lines** — extract sub-components/hooks/utils before adding code.
2. **No `any`** — use `unknown` + narrowing, generics, or proper interfaces.
3. **No duplicated auth** — use `withAuth()` / `withProjectAuth()` from `@/lib/server/api-auth`.
4. **Types from `lib/types/`** — import `ProjectRouteContext` from `@/lib/types/api`, not inline.
5. **Response helpers** — use `ok()`, `badRequest()`, etc. from `@/lib/server/api-response`.
6. **Server components first** — only `"use client"` when the component needs browser APIs or state.
7. **Single responsibility** — one component per file, one hook per file.
8. **Imports flow downward** — `lib/` → `components/` → `app/`. Never import from `app/` into `lib/`.
9. **Update issue ledger** when fixing runtime bugs: `PROJECT_RUNTIME_ISSUE_LEDGER.md`.
10. **Run `get_errors`** after edits to verify no TypeScript errors were introduced.
11. **Entitlements single source of truth:** `lib/entitlements.ts` — never inline tier checks.
12. **Canonical folder table:** `project_folders` (NOT `file_folders`) — migration in progress.
13. **No mock data in production UI** — show proper empty/error state when Supabase env is missing.
14. **Update context files** — after ANY code change, update the relevant `slate360-context/` blueprint if routes, components, APIs, DB tables, or features changed.

---

## API Route Template

```typescript
import { NextRequest } from "next/server";
import { withProjectAuth } from "@/lib/server/api-auth";
import { ok, serverError } from "@/lib/server/api-response";
import type { ProjectRouteContext } from "@/lib/types/api";

export const GET = (req: NextRequest, ctx: ProjectRouteContext) =>
  withProjectAuth(req, ctx, async ({ admin, projectId }) => {
    const { data, error } = await admin.from("table").select("*").eq("project_id", projectId);
    if (error) return serverError(error.message);
    return ok({ items: data });
  });
```

---

## Platform Overview

Slate360 is a **SaaS construction management + creative tools platform** with 8 modules:

| Module | Route | Tiers |
|---|---|---|
| Project Hub | `/project-hub` | business, enterprise, trial |
| Design Studio | `/(dashboard)/design-studio` | model, business, enterprise |
| Content Studio | `/(dashboard)/content-studio` | creator, model, business, enterprise |
| 360 Tour Builder | `/(dashboard)/tour-builder` | creator, model, business, enterprise |
| Geospatial & Robotics | `/(dashboard)/geospatial-robotics` | model, business, enterprise |
| Virtual Studio | `/(dashboard)/virtual-studio` | model, business, enterprise |
| Analytics & Reports | `/(dashboard)/analytics-reports` | business, enterprise |
| SlateDrop | `/slatedrop` | all tiers |

**Tier hierarchy (ascending):** `trial < creator < model < business < enterprise`

---

## Backend Access (Quick Reference)

### Supabase
- **URL:** `https://hadnfcenpcfaeclczsmm.supabase.co`
- **Project Ref:** `hadnfcenpcfaeclczsmm`
- **Dashboard:** https://supabase.com/dashboard/project/hadnfcenpcfaeclczsmm
- **Keys:** `NEXT_PUBLIC_SUPABASE_ANON_KEY` + `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`

### AWS S3
- **Bucket:** `slate360-storage` · **Region:** `us-east-2`
- **Keys:** `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` in `.env.local`

### Google Maps
- **Key:** `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` in `.env.local`
- **Allowed APIs:** Maps JavaScript, Geocoding, Maps Static
- **Routing:** OSRM (not Google Routes — Routes API not enabled on key)
- **Place Autocomplete:** Use `AutocompleteSuggestion.fetchAutocompleteSuggestions()` (new API)
- **Drawing:** Custom `google.maps.Polyline` + `google.maps.Polygon` — DrawingManager removed May 2026

### Email
- **Resend** · `RESEND_API_KEY` in `.env.local` · From: `noreply@slate360.ai`

### Stripe
- Keys in **Vercel environment** (not `.env.local`)
- Webhook: `POST /api/stripe/webhook`

### Full env reference
See `BACKEND_ACCESS.md` in repo root for all variable names and values.

---

## Supabase Client Patterns (Always Use Exactly One)

```typescript
// 1. Browser (client components — "use client")
import { createClient } from "@/lib/supabase/client";

// 2. Server (API routes, Server Components)
import { createServerSupabaseClient } from "@/lib/supabase/server";
// Returns: anon client with request cookie context — respects RLS

// 3. Admin (webhooks, crons, privileged ops — server-only NEVER browser)
import { createAdminClient } from "@/lib/supabase/admin";
// Uses SUPABASE_SERVICE_ROLE_KEY — bypasses ALL RLS
```

**RLS anchor:** All policies join through `organization_members` table:
```
auth.uid() → organization_members.user_id → organization_members.org_id
```

---

## Entitlements (Single Source of Truth)

```typescript
import { getEntitlements, type Tier } from "@/lib/entitlements";

// Standard usage:
const e = getEntitlements(user.tier);

// CEO override (returns enterprise entitlements regardless of DB tier):
const e = getEntitlements(user.tier, { isSlateCeo: true });

// e.canAccessHub, e.canAccessDesignStudio, e.maxStorageGB, e.maxCredits, etc.
```

**Never** write `if (tier === 'business' || tier === 'enterprise')` — always use `getEntitlements()`.

**CEO All-Access:** `resolveServerOrgContext()` returns `isSlateCeo` (true for `slate360ceo@gmail.com`). Pass as `isCeo` prop to client components. All shell components and DashboardTabShell accept `isCeo` and call `getEntitlements(tier, { isSlateCeo: isCeo })`.

Tiers and limits:
| Tier | Hub | Storage | Credits/mo | Seats | Price |
|---|---|---|---|---|---|
| trial | ✅ | 5 GB | 500 | 1 | Free |
| creator | ❌ | 40 GB | 6,000 | 1 | $79/mo |
| model | ❌ | 150 GB | 15,000 | 1 | $199/mo |
| business | ✅ | 750 GB | 30,000 | 25 | $499/mo |
| enterprise | ✅ | 5 TB | 100,000 | 999 | Custom |

---

## SlateDrop — Key Patterns

### Canonical folder table: `project_folders`
```sql
folder_path text, parent_id uuid, is_system boolean, is_public boolean,
allow_upload boolean, org_id uuid, project_id uuid, folder_type text, deleted_at timestamptz
```
**Do NOT use `file_folders`** for new code — Phase 2 migration pending (Design Studio + export-zip routes still on old table).

### Project subfolders (auto-provisioned on project create)
```
/Projects/{projectId}/Documents/ · /Drawings/ · /Photos/ · /RFIs/ · /Submittals/
/Schedule/ · /Budget/ · /Records/
```

### Satellite map card pattern (use in ALL project card locations)
```typescript
const meta = (project.metadata ?? {}) as Record<string, unknown>;
const locData = (meta.location ?? {}) as Record<string, unknown>;
const lat = typeof locData.lat === "number" ? locData.lat : null;
const lng = typeof locData.lng === "number" ? locData.lng : null;
const staticMapUrl = lat && lng && mapsKey
  ? `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=17&size=600x256&maptype=satellite&key=${mapsKey}`
  : null;
// Render: separate absolute div for bg — NEVER mix backgroundImage + background shorthand on same element
```

### Trial user upload guard (prevent runaway costs)
```typescript
if (tier === 'trial') {
  if (fileSizeMb > 50) return badRequest('Trial file size limit is 50 MB');
  if (currentStorageGb + fileSizeMb/1024 > 0.5) return badRequest('Trial storage limit reached');
}
// ALWAYS call consume_credits(org_id, amount) RPC BEFORE enqueuing any processing job
```

### 3-dot button on project sidebar nodes
```tsx
// FolderTreeItem: only show on nodes where node.parentId === "projects"
// Uses: opacity-0 group-hover/tree-row:opacity-100 pattern
// Calls: onMenuClick prop (passed down recursively)
```

### 2-step project deletion
- Step 1: modal with project name confirmation input (button disabled until match)
- Step 2: `DELETE /api/projects/[projectId]` → soft-delete with 30-day grace before S3 hard-delete

---

## Project Hub — Key Patterns

### 3-tier URL structure
```
/project-hub                           ← Tier 1: all projects grid
/project-hub/[projectId]               ← Tier 2: project home
/project-hub/[projectId]/rfis          ← Tier 3: tool view
/project-hub/[projectId]/submittals
/project-hub/[projectId]/documents
/project-hub/[projectId]/schedule
/project-hub/[projectId]/budget
/project-hub/[projectId]/map
/project-hub/[projectId]/photos
/project-hub/[projectId]/records
/project-hub/[projectId]/team
/project-hub/[projectId]/settings
```

### Project creation flow
```
POST /api/projects/create
→ creates projects row (with metadata.location from WizardLocationPicker)
→ provisions 8 SlateDrop subfolders (all is_system = true)
→ returns { projectId }
```

### Role hierarchy
`owner/admin > project_manager > project_member > external_viewer`
Stored in `project_members.role` per project + `organization_members.role` org-wide.

---

## Dashboard — Key Patterns

### Hydration guard (never remove)
`app/(dashboard)/layout.tsx` renders client state only after `isClient && _hasHydrated`.

### Widget data fetch
`GET /api/dashboard/widgets` — returns: `{ projects, usage, activity, myWork }`

### Credit purchase — always subtle (never prominent modal)
Show only when credits ≤ 20% remaining. Never pop-up. `SubtleCreditPurchase` component.

### Credit order: monthly first, purchased second
`consume_credits(org_id, amount)` Supabase RPC consumes monthly allocation before purchased balance.

---

## Known Tech Debt (Watchlist)

| Item | Status |
|---|---|
| `file_folders` → `project_folders` migration Phase 2 | ⚠️ Pending (Design Studio, export-zip, audit, cross-tab service) |
| Tier 3 Project Hub tool views (RFIs, Submittals, etc.) | ⚠️ Stubs exist, implementation pending |
| Tier 2 Project Home overview cards | ⚠️ Partial |
| External stakeholder portal `/external/project/[token]` | ❌ Not built |
| Google Routes API blocked by key restrictions | ⚠️ Using OSRM fallback |
| `SlateDropClient.tsx` approaching 300-line limit | ⚠️ Extract FolderTreeItem, ContextMenu, FileGrid, NotificationTray |
| PWA infrastructure | ❌ Not built (marketing pages claim PWA-ready) |
| Standalone app subscription system | ❌ Not built (`org_feature_flags` table needed) |
| Native app packaging (Capacitor) | ❌ Not started |

---

## Key Files Reference

| File | Purpose |
|---|---|
| `SLATE360_PROJECT_MEMORY.md` | **Master project memory — attach to new chats** |
| `slate360-context/FUTURE_FEATURES.md` | **Master build roadmap — 7-phase plan with dependency graph** |
| `PROJECT_RUNTIME_ISSUE_LEDGER.md` | Runtime bug tracker |
| `slate360-context/DASHBOARD.md` | Dashboard blueprint |
| `slate360-context/PROJECT_HUB.md` | Project Hub blueprint |
| `slate360-context/SLATEDROP.md` | SlateDrop blueprint |
| `slate360-context/WIDGETS.md` | Widget system blueprint |
| `slate360-context/HOMEPAGE.md` | Homepage blueprint |
| `slate360-context/BACKEND.md` | Backend, auth, billing, credits, DB, email |
| `slate360-context/FUTURE_MODULES.md` | Unbuilt modules (Design Studio, CEO, Athlete360, App Ecosystem, etc.) |
| `slate360-context/GUARDRAILS.md` | Code rules, refactoring priorities, tech debt |
| `lib/entitlements.ts` | Tier → entitlements (single source of truth) |
| `lib/server/api-auth.ts` | `withAuth()`, `withProjectAuth()` |
| `lib/server/api-response.ts` | `ok()`, `badRequest()`, `unauthorized()`, `serverError()` |
| `lib/types/api.ts` | `ProjectRouteContext`, `ApiErrorPayload` |
| `lib/projects/access.ts` | `listScopedProjectsForUser()`, `getScopedProjectForUser()` |
| `lib/server/org-context.ts` | `resolveServerOrgContext()` |
| `middleware.ts` | Auth session refresh on every request |
