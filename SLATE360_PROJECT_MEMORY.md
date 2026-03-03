# Slate360 — Project Memory & New Chat Instructions

**Last Updated:** 2026-03-03
**Repo:** `bcvolker/slate360-rebuild` · branch: `main` · live: https://www.slate360.ai
**Owner:** bcvolker

> **To start a new chat:** Attach this file. After reading it, the assistant should read `slate360-context/NEW_CHAT_HANDOFF_PROTOCOL.md`, then relevant topic blueprints in `slate360-context/`, `slate360-context/FUTURE_FEATURES.md`, and `slate360-context/dashboard-tabs/MODULE_REGISTRY.md`.

---

## 1. What Is Slate360?

Slate360 is a **SaaS construction management + creative tools platform** built with Next.js 15 (App Router), React 19, TypeScript 5, Tailwind CSS 4, Supabase (auth + DB), AWS S3 (file storage), Stripe (billing), and deployed on Vercel.

### Platform Modules

| Module | Route | Tiers | Build Status |
|---|---|---|---|
| **Dashboard** | `/(dashboard)` (tabs below) | all | ✅ Built (needs decomposition) |
| **Project Hub** | `/project-hub` | business, enterprise, trial | ✅ Built (Tier 1-3 working) |
| **SlateDrop** (File Mgmt) | `/slatedrop` | all | ✅ Built (needs extraction) |
| **Design Studio** | `/(dashboard)/design-studio` | model, business, enterprise | ❌ Not built |
| **Content Studio** | `/(dashboard)/content-studio` | creator, model, business, enterprise | ❌ Not built |
| **360 Tour Builder** | `/(dashboard)/tour-builder` | creator, model, business, enterprise | ❌ Not built |
| **Geospatial & Robotics** | `/(dashboard)/geospatial-robotics` | model, business, enterprise | ❌ Not built |
| **Virtual Studio** | `/(dashboard)/virtual-studio` | model, business, enterprise | ❌ Not built |
| **Analytics & Reports** | `/(dashboard)/analytics-reports` | business, enterprise | 🟡 Stub exists |
| **CEO Command Center** | `/(dashboard)/ceo` | enterprise | 🟡 Stub exists |
| **Market** | `/market` | all | ✅ Built (Polymarket integration) |
| **Athlete360** | `/athlete360` | — | ❌ Not built (spec in context) |

**Tier hierarchy (ascending):** `trial < creator < model < business < enterprise`

---

## 2. Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router) | 15.x |
| React | React + ReactDOM | 19.x |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS | 4.x |
| Database + Auth | Supabase | 2.x JS client |
| File Storage | AWS S3 (`slate360-storage`, `us-east-2`) | v3 SDK |
| Maps | `@vis.gl/react-google-maps` | 1.7.1 |
| Routing Engine | OSRM (not Google Routes — API key restriction) | Public demo |
| PDF | jsPDF | 4.x |
| Email | Resend | 6.x |
| Payments | Stripe | 20.x |
| Icons | Lucide React | 0.575.x |
| Charts | Recharts + Chart.js | latest |
| State | Zustand | 5.x |
| Web3 | wagmi + viem | latest |
| Hosting | Vercel (auto-deploy from `main`) | — |
| Node | ≥ 20.0.0 | — |

---

## 3. Backend Access — Quick Reference

### Supabase
- **URL:** `https://hadnfcenpcfaeclczsmm.supabase.co`
- **Dashboard:** https://supabase.com/dashboard/project/hadnfcenpcfaeclczsmm
- **Keys:** `NEXT_PUBLIC_SUPABASE_ANON_KEY` + `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`

### AWS S3
- **Bucket:** `slate360-storage` · **Region:** `us-east-2`
- **Keys:** `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` in `.env.local`

### Google Maps
- **Key:** `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` in `.env.local`
- **Allowed APIs:** Maps JavaScript, Geocoding, Maps Static
- **Blocked APIs:** Routes, Directions (use OSRM instead)
- **Place Autocomplete:** `AutocompleteSuggestion.fetchAutocompleteSuggestions()` (new API)

### Email — Resend
- **Key:** `RESEND_API_KEY` in `.env.local` · From: `noreply@slate360.ai`

### Stripe
- Keys in **Vercel environment** (not `.env.local`)
- Webhook: `POST /api/stripe/webhook`

### Environment Variables

```dotenv
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://hadnfcenpcfaeclczsmm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<see .env.local>
SUPABASE_SERVICE_ROLE_KEY=<see .env.local>
SUPABASE_ACCESS_TOKEN=<see .env.local>

# AWS S3
AWS_REGION=us-east-2
AWS_ACCESS_KEY_ID=<see .env.local>
AWS_SECRET_ACCESS_KEY=<see .env.local>
SLATEDROP_S3_BUCKET=slate360-storage

# Resend
RESEND_API_KEY=<see .env.local>
EMAIL_FROM=Slate360 <noreply@slate360.ai>

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=<see .env.local>
NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID=<see .env.local>

# Stripe (set in Vercel, not usually needed locally)
# STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_* (see Vercel dashboard)
```

---

## 4. Supabase Client Patterns (Use Exactly One Per Context)

```typescript
// 1. Browser (client components — "use client")
import { createClient } from "@/lib/supabase/client";

// 2. Server (API routes, Server Components) — respects RLS
import { createServerSupabaseClient } from "@/lib/supabase/server";

// 3. Admin (webhooks, crons, privileged ops — server ONLY)
import { createAdminClient } from "@/lib/supabase/admin";
// Uses SUPABASE_SERVICE_ROLE_KEY — bypasses ALL RLS
```

**RLS anchor:** All policies join through `organization_members`:
`auth.uid() → organization_members.user_id → organization_members.org_id`

---

## 5. Non-Negotiable Code Rules

### Rule 1: No File > 300 Lines
Extract sub-components, hooks, or utils before adding code. Exceptions: auto-generated and migration files only.

### Rule 2: No `any`
Use `unknown` + narrowing, generics, or proper interfaces. When wrapping untyped APIs (Google Maps, model-viewer), create typed wrappers.

### Rule 3: Server Components First
Every new `page.tsx` is a server component unless it requires browser APIs or state. Data fetching on server; interactivity in small `"use client"` islands.

### Rule 4: No Duplicated Auth
Use `withAuth()` / `withProjectAuth()` from `@/lib/server/api-auth`. Response helpers from `@/lib/server/api-response`.

### Rule 5: Types from `lib/types/`
Import `ProjectRouteContext` from `@/lib/types/api`, not inline. Never define types inline.

### Rule 6: Imports Flow Downward
`lib/` → `components/` → `app/`. Never import from `app/` into `lib/` or `components/`.

### Rule 7: Single Responsibility
One component per file, one hook per file. A "project card" is not also a "delete modal."

### Rule 8: Entitlements — Single Source of Truth
```typescript
import { getEntitlements } from "@/lib/entitlements";

// Standard usage:
const e = getEntitlements(user.tier);

// CEO override (returns enterprise entitlements regardless of DB tier):
const e = getEntitlements(user.tier, { isSlateCeo: true });
// e.canAccessHub, e.canAccessDesignStudio, e.canWhiteLabel, e.maxStorageGB, etc.
```
**Never** write `if (tier === 'business' || tier === 'enterprise')` — always use `getEntitlements()`.
**CEO/Internal Access:** `resolveServerOrgContext()` returns `isSlateCeo`, `isSlateStaff`, and `hasInternalAccess`.
- Use `hasInternalAccess` to gate `/ceo`, `/market`, `/athlete360`.
- Use `isSlateCeo` (not `isSlateStaff`) for entitlement override behavior when needed.
**CEO Tab ≠ Tier feature:** `/ceo`, `/market`, `/athlete360` are platform-admin tabs. `canAccessCeo` does NOT exist in `Entitlements`. No tier including enterprise grants access.

### Rule 9: No Mock Data in Production UI
Show proper empty/error states when data is unavailable.

### Rule 10: Canonical Folder Table
Use `project_folders` (NOT `file_folders`) for all new code. Migration Phase 2 pending.

---

## 6. API Route Template

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

## 7. Key Files Quick Reference

| File | Purpose |
|---|---|
| `SLATE360_PROJECT_MEMORY.md` | **This file** — master project memory |
| `slate360-context/FUTURE_FEATURES.md` | **Master build roadmap** — 7-phase plan with dependency graph |
| `slate360-context/NEW_CHAT_HANDOFF_PROTOCOL.md` | Canonical new-chat startup + handoff protocol |
| `slate360-context/dashboard-tabs/MODULE_REGISTRY.md` | Canonical tab route/gate/spec registry |
| `slate360-context/dashboard-tabs/CUSTOMIZATION_SYSTEM.md` | Cross-tab layout/tool customization contract |
| `slate360-context/ARCHITECTURE_READINESS_ACTIONS.md` | Immediate prebuild dependency checklist |
| `slate360-context/DASHBOARD.md` | Dashboard blueprint |
| `slate360-context/PROJECT_HUB.md` | Project Hub blueprint |
| `slate360-context/SLATEDROP.md` | SlateDrop blueprint |
| `slate360-context/WIDGETS.md` | Widget system blueprint |
| `slate360-context/HOMEPAGE.md` | Homepage blueprint |
| `slate360-context/BACKEND.md` | Backend infra, auth, billing, credits, email |
| `slate360-context/FUTURE_MODULES.md` | Design Studio, Content Studio, CEO, Athlete360, App Ecosystem, etc. |
| `PROJECT_RUNTIME_ISSUE_LEDGER.md` | Runtime bug tracker (Issues 1-10, all resolved) |
| `lib/entitlements.ts` | Tier → entitlements (single source of truth) |
| `lib/server/api-auth.ts` | `withAuth()`, `withProjectAuth()` |
| `lib/server/api-response.ts` | `ok()`, `badRequest()`, `unauthorized()`, `serverError()` |
| `lib/types/api.ts` | `ProjectRouteContext`, `ApiErrorPayload` |
| `lib/projects/access.ts` | `listScopedProjectsForUser()`, `getScopedProjectForUser()` |
| `lib/server/org-context.ts` | `resolveServerOrgContext()` |
| `middleware.ts` | Auth session refresh on every request |

---

## 8. Current Codebase Health — March 2, 2026

### What's Working
- Dashboard with 12-widget system (shared between Dashboard + Project Hub)
- Project Hub Tier 1 (project grid), Tier 2 (project home), Tier 3 (9 tool views)
- SlateDrop file management with S3 upload/download
- Project create → 8 subfolder auto-provisioning
- 2-step project deletion with confirmation
- Auth flow (signup, login, password reset)
- Billing (Stripe checkout, webhooks, credit system)
- Shared widget system with localStorage persistence
- Location map with satellite view, search, drawing tools, OSRM routing
- Weather widget, credit tracker, activity feed

### What Needs Refactoring (Tech Debt)
| Issue | Current | Target |
|---|---|---|
| `DashboardClient.tsx` | 2,915 lines | < 300 (decompose into ~10 files) |
| `MarketClient.tsx` | 3,006 lines | < 300 (decompose into ~8 files) |
| `SlateDropClient.tsx` | 2,030 lines | < 300 (decompose into ~7 files) |
| `LocationMap.tsx` | 1,568 lines | < 300 (decompose into ~5 files) |
| 9 Tier-3 page files | 300-930 lines each | < 300 (extract table/form components) |
| `components/ui/` | 1 file (tooltip) | 15+ shared UI components |
| `lib/hooks/` | 1 hook | 10+ extracted hooks |
| `file_folders` → `project_folders` migration | Phase 1 done | Phase 2 pending |
| Charts | Recharts + Chart.js both | Pick one |

### What's Not Built Yet
- Design Studio, Content Studio, 360 Tour Builder
- Geospatial & Robotics, Virtual Studio
- Analytics & Reports (stub only)
- CEO Command Center (stub only)
- Athlete360 (spec exists)
- External stakeholder portal
- GPU worker pipeline
- **App ecosystem infrastructure** (PWA, standalone app subscriptions, native wrappers)
- **`org_feature_flags` table** for standalone app entitlements
- **Planned DB tables:** `project_activity_log`, `slatedrop_audit_log`, `slatedrop_shares`, `slatedrop_packs`, `org_credits`, `credits_ledger`

See `slate360-context/FUTURE_FEATURES.md` for the full 7-phase build roadmap (Phase 0–7) with dependency graph and SQL migrations.

---

## 9. Codebase Organization Cheat Sheet

### Folder Structure (Target)
```
app/
  (dashboard)/              ← All authenticated pages (route group)
    layout.tsx              ← Hydration guard, sidebar
    project-hub/            ← Project Hub pages
    analytics/              ← Analytics
    ceo/                    ← CEO tab
    design-studio/          ← (future)
    content-studio/         ← (future)
    ...
  api/                      ← All API routes
  slatedrop/                ← SlateDrop standalone page
  auth/, login/, signup/    ← Auth pages
  page.tsx                  ← Homepage

components/
  dashboard/                ← Dashboard-specific components
  project-hub/              ← Project Hub components
  slatedrop/                ← SlateDrop components
  widgets/                  ← Shared widget system
  shared/                   ← Cross-module shared components
  ui/                       ← Primitives (Modal, DataTable, etc.)

lib/
  types/                    ← Shared type definitions
  server/                   ← Server-only utils (api-auth, api-response, org-context)
  hooks/                    ← Client-side hooks
  projects/                 ← Project access/scoping
  slatedrop/                ← SlateDrop helpers
  supabase/                 ← Supabase clients (client, server, admin)
  entitlements.ts           ← Tier gates (single source of truth)
  s3.ts, stripe.ts, etc.    ← Service clients
```

### Naming Rules
| Entity | Convention | Example |
|---|---|---|
| Components | PascalCase | `ProjectCard.tsx` |
| Hooks | camelCase, `use` prefix | `useProjectData.ts` |
| Utilities | camelCase, verb-based | `resolveProjectScope.ts` |
| Types | PascalCase | `Project`, `ApiResponse<T>` |
| API routes | `route.ts` only | `app/api/projects/route.ts` |
| Constants | UPPER_SNAKE_CASE | `MAX_FILE_SIZE` |

### Component Complexity Limits
| Metric | Limit |
|---|---|
| Lines per file | 300 |
| `useState` per component | 5 (extract hook) |
| `useEffect` per component | 2 (extract hook or use server component) |
| Props per component | 7 (group into object) |

---

## 10. Instructions for the AI Assistant

### Before Every Code Change
1. Read this file first.
2. Read the relevant topic blueprint in `slate360-context/` for the module you're working on.
3. Check file line count before editing — if near 300, extract first.
4. Search for existing patterns before creating new ones.
5. Use `withAuth()` / `withProjectAuth()` for API routes.
6. Use `getEntitlements()` for tier checks.

### After Every Code Change
1. Run `get_errors` to verify no TypeScript errors.
2. **Update the relevant `slate360-context/` blueprint file** if the change affects:
   - Routes, components, or API endpoints (add/rename/remove)
   - Database tables or columns
   - Feature behavior or tier gating
   - Architecture patterns or file structure
3. Update `PROJECT_RUNTIME_ISSUE_LEDGER.md` if fixing a runtime bug.
4. Never create new documentation files — update existing ones.

### Context File Maintenance Rule
**Every time you make a code change, check if any `slate360-context/` file needs updating.** These files are the project memory passed between chat sessions. If they fall behind, the next AI assistant will make wrong assumptions. Keep them current.

### Refactoring Checklist
- [ ] No file I touched exceeds 300 lines
- [ ] No new `any` annotations
- [ ] Types imported from `lib/types/`, not inline
- [ ] API routes use `withAuth()` / `withProjectAuth()`
- [ ] Response helpers from `@/lib/server/api-response`
- [ ] Server component where possible
- [ ] Entitlement checks use `getEntitlements()`

---

## 11. Entitlements Quick Reference

| Tier | Hub | Storage | Credits/mo | Seats | Price |
|---|---|---|---|---|---|
| trial | ✅ | 5 GB | 500 | 1 | Free |
| creator | ❌ | 40 GB | 6,000 | 1 | $79/mo |
| model | ❌ | 150 GB | 15,000 | 1 | $199/mo |
| business | ✅ | 750 GB | 30,000 | 25 | $499/mo |
| enterprise | ✅ | 5 TB | 100,000 | 999 | Custom |

---

## 12. Known Patterns & Gotchas

### Satellite Map Card (used in 3 places)
```typescript
const meta = (project.metadata ?? {}) as Record<string, unknown>;
const locData = (meta.location ?? {}) as Record<string, unknown>;
const lat = typeof locData.lat === "number" ? locData.lat : null;
const lng = typeof locData.lng === "number" ? locData.lng : null;
const staticMapUrl = lat && lng && mapsKey
  ? `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=17&size=600x256&maptype=satellite&key=${mapsKey}`
  : null;
// NEVER mix backgroundImage + background shorthand on same element
```

### Trial Upload Guard
```typescript
if (tier === 'trial') {
  if (fileSizeMb > 50) return badRequest('Trial file size limit is 50 MB');
  if (currentStorageGb + fileSizeMb/1024 > 0.5) return badRequest('Trial storage limit reached');
}
// ALWAYS call consume_credits(org_id, amount) BEFORE enqueuing processing
```

### Dashboard Hydration Guard
`app/(dashboard)/layout.tsx` renders client state only after `isClient && _hasHydrated`.

### Credit Consumption Order
`consume_credits(org_id, amount)` RPC consumes monthly allocation first, then purchased balance.

### Google Maps Drawing
Use custom `google.maps.Polyline` + `google.maps.Polygon` — `DrawingManager` was removed May 2026.

### Project Subfolders (auto-provisioned)
```
/Projects/{projectId}/Documents/ · /Drawings/ · /Photos/ · /RFIs/ · /Submittals/
/Schedule/ · /Budget/ · /Records/
```
