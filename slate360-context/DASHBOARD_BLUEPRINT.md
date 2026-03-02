# Dashboard — Complete System Blueprint

**Last Updated:** 2026-03-02
**Purpose:** Single source of truth for the Slate360 Dashboard. Authoritative enough to rebuild the Dashboard from scratch including routes, components, backend, and tier behavior.

---

## Table of Contents

1. [What the Dashboard Is](#1-what-the-dashboard-is)
2. [Routes & Layout](#2-routes--layout)
3. [Widget System](#3-widget-system)
4. [Project Cards (Satellite Map View)](#4-project-cards-satellite-map-view)
5. [SlateDrop Entry Point](#5-slatedrop-entry-point)
6. [Location Tools](#6-location-tools)
7. [Financials & Credits Widget](#7-financials--credits-widget)
8. [Tier Behavior](#8-tier-behavior)
9. [Navigation & Sidebar](#9-navigation--sidebar)
10. [Backend — API Routes](#10-backend--api-routes)
11. [Frontend — Key Files](#11-frontend--key-files)
12. [Entitlements Gating in UI](#12-entitlements-gating-in-ui)
13. [Build Status & Known Issues](#13-build-status--known-issues)
14. [Reconstruction Checklist](#14-reconstruction-checklist)

---

## 1. What the Dashboard Is

The Dashboard is the **primary launchpad** for Slate360. It is the first page users see after login and the main navigation hub. It must:
- Feel simple for first-time users (trial, creator).
- Scale into a full operations console for business and enterprise teams.
- Be the primary upgrade pathway from trial to paid tiers.
- Expose all major features via widgets that expand into full tool views.

**URL:** `/dashboard`
**Auth:** Required — `middleware.ts` redirects unauthenticated users to `/login`.

---

## 2. Routes & Layout

### Dashboard routes

| Route | File | Purpose |
|---|---|---|
| `/dashboard` | `app/dashboard/page.tsx` | Main dashboard home |
| `/(dashboard)/*` | `app/(dashboard)/layout.tsx` | Shared layout shell for all dashboard tabs |
| `/(dashboard)/project-hub` | `app/(dashboard)/project-hub/page.tsx` | Project Hub tab |
| `/(dashboard)/analytics` | `app/(dashboard)/analytics/page.tsx` | Analytics tab |
| `/(dashboard)/ceo` | `app/(dashboard)/ceo/page.tsx` | CEO view (enterprise only) |
| `/(dashboard)/integrations` | `app/(dashboard)/integrations/page.tsx` | Integrations (Procore, Autodesk, DocuSign, Adobe Sign) |

### Dashboard shell layout

```
┌──────────────────────────────────────────────────────────────────────┐
│  Top Bar: Logo | Tab Nav (Project Hub, Design Studio...) | Account   │
├──────────────┬───────────────────────────────────────────────────────┤
│  Left Sidebar│  Main Content (widget grid)                           │
│              │                                                       │
│  - Nav links │  [ Project Cards Row — horizontal scroll ]            │
│  - Quick     │                                                       │
│    actions   │  [ Location Map Widget ] [ SlateDrop Widget ]        │
│              │                                                       │
│              │  [ Usage/Credits Widget ] [ Activity Widget ]        │
│              │                                                       │
└──────────────┴───────────────────────────────────────────────────────┘
```

### Layout invariants (never break)

- `app/(dashboard)/layout.tsx` is the hydration boundary.
- Uses `isClient && _hasHydrated` guard before rendering persisted Zustand state.
- Do NOT remove this guard — React hydration errors will result.
- Top bar and sidebar must be identical across all tabs.

---

## 3. Widget System

Widgets are the primary UI unit. Each widget:
- Has a fixed size on the grid (small / medium / large / full-width).
- Shows a summary state by default.
- Has a header with title + "Expand" button that opens the full tool view.
- Can be minimized — state persisted in Zustand + localStorage.

### Widget grid

```typescript
// Widget types currently in use
type DashboardWidget =
  | "project-cards"
  | "location-map"
  | "slatedrop"
  | "usage-credits"
  | "activity"
  | "my-work"
  | "analytics-snapshot"
```

### Widgets API

`GET /api/dashboard/widgets` returns the widget data bundle:

```typescript
{
  projects: ProjectSummary[];    // For project-cards widget
  usage: UsageSummary;           // For usage-credits widget
  activity: ActivityEvent[];     // For activity widget
  myWork: WorkItem[];            // For my-work widget
}
```

This endpoint uses `withAuth()` and reads from:
- `projects` table filtered by `org_id`
- `credits` table for usage
- `project_history_events` for activity

---

## 4. Project Cards (Satellite Map View)

### Visual spec

Each project card:
- **Height:** 128px top section (map area) + content below.
- **Map area:** Satellite thumbnail from Google Static Maps API. Overlaid with `bg-black/45` scrim so text is readable. If no location set, show gradient (`from-[#1E3A8A] to-[#1e293b]`).
- **Overlay content:** Project name (large, white), client name (small, gray), status pill.
- **Below map:** Quick stats: open RFIs count, open submittals, next milestone.
- **Click:** Navigate to `/project-hub/[projectId]`.

### Satellite map URL construction

```typescript
const meta = (project.metadata ?? {}) as Record<string, unknown>;
const locData = (meta.location ?? {}) as Record<string, unknown>;
const lat = typeof locData.lat === "number" ? locData.lat : null;
const lng = typeof locData.lng === "number" ? locData.lng : null;
const mapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

const staticMapUrl = lat !== null && lng !== null && mapsKey
  ? `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=17&size=600x256&maptype=satellite&key=${mapsKey}`
  : null;
```

### Rendering pattern (correct — avoids CSS background shorthand clash)

```tsx
<div className="h-32 w-full relative overflow-hidden rounded-t-xl">
  {staticMapUrl
    ? <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${staticMapUrl})` }} />
    : <div className="absolute inset-0 bg-gradient-to-br from-[#1E3A8A] to-[#1e293b]" />
  }
  {staticMapUrl && <div className="absolute inset-0 bg-black/45" />}
  <div className="absolute inset-0 p-4 flex flex-col justify-between">
    {/* project name + status */}
  </div>
</div>
```

**Important:** This exact same pattern is used in BOTH `DashboardProjectCard.tsx` and `app/(dashboard)/project-hub/page.tsx`. Do not use `style={{ background: ..., backgroundImage: ... }}` on the same element — the shorthand wipes the `backgroundImage`.

### Components

- `components/dashboard/DashboardProjectCard.tsx` (~275 lines) — card component used on dashboard.
- `app/(dashboard)/project-hub/page.tsx` — inline card rendering for project hub page (uses same pattern).

---

## 5. SlateDrop Entry Point

### Dashboard SlateDrop widget

- Shows latest 5 recently modified files.
- Has a "Browse Files" button that links to `/slatedrop`.
- Has a drag-and-drop upload target — files dropped here upload to the user's General folder.
- Visible on ALL tiers (`canViewSlateDropWidget: true` in entitlements for all tiers).

### Connection

The widget calls `GET /api/dashboard/widgets` which includes recent files in the response. The full explorer at `/slatedrop` renders `<SlateDropClient>` with the user's session data.

---

## 6. Location Tools

### Location Map widget

- Component: `components/dashboard/LocationMap.tsx`
- Full-screen expandable satellite + road map.
- Shows project pins (lat/lng from `projects.metadata.location`).
- Clicking a pin opens the project card popup with link to Project Hub.
- Supports markup (draw on map) and share link generation.

### Routing engine
- Google Maps Static API is used for satellite card thumbnails.
- Routing (turn-by-turn, directions) uses **OSRM** (`router.project-osrm.org`) NOT Google Routes API, because the API key restrictions exclude Routes API.
- To enable Google native routing: GCP Console → Credentials → Edit key → add Routes API + Directions API to allowed list.

---

## 7. Financials & Credits Widget

### Component

`EnhancedUsageTracker` — located at `src/components/dashboard/EnhancedUsageTracker.tsx` (note: `src/` prefix, this is an older component path).

### Display

```
Storage:       ████████░░  42 GB / 750 GB
Monthly credits: ██████░░░░ 4,200 / 30,000  (resets in 8 days)
Purchased:     ██░░░░░░░░  1,500 credits (never expire)
───────────────────────────────────────────────
Total available: 27,300 credits
```

### Credit purchase link

`SubtleCreditPurchase` component — shown as a quiet link near the usage bar when total credits ≤ 20%. Triggers Stripe Checkout via `POST /api/credits/purchase`.

Design rule: **Never** show the credit purchase as a pop-up modal. Never push it prominently — it can make users suspicious of hidden charges.

---

## 8. Tier Behavior

| Feature | Trial | Creator | Model | Business | Enterprise |
|---|---|---|---|---|---|
| Project cards visible | Yes (limited to 1 trial project) | No | No | Yes (all projects) | Yes (all projects) |
| Project Hub tab | ✅ (limited) | ❌ | ❌ | ✅ | ✅ |
| Location Map widget | ✅ | ✅ | ✅ | ✅ | ✅ |
| SlateDrop widget | ✅ | ✅ | ✅ | ✅ | ✅ |
| Credits widget | ✅ | ✅ | ✅ | ✅ | ✅ |
| Analytics widget | ❌ | ❌ | ❌ | ✅ | ✅ |
| CEO view tab | ❌ | ❌ | ❌ | ❌ | ✅ |
| Seat management | ❌ | ❌ | ❌ | ✅ | ✅ |
| Max storage | 5 GB | 40 GB | 150 GB | 750 GB | 5 TB |
| Max credits/month | 500 | 6,000 | 15,000 | 30,000 | 100,000 |

### Trial upgrade path

When a trial user hits a limit or tries to access a locked feature, show a contextual upgrade CTA:
- "You've reached the trial limit for [feature]. Upgrade to [suggested tier] to unlock."
- CTA links to `/plans?upgrade=true&highlight=[tier]`.
- Never block the entire UI — show the prompt inline near the action.

---

## 9. Navigation & Sidebar

### Tab navigation (top bar)

Order matches product spec:
1. **Dashboard** (home)
2. **Project Hub** (business + enterprise + trial)
3. **Design Studio** (model + business + enterprise)
4. **Content Studio** (creator + model + business + enterprise)
5. **360 Tour Builder** (creator + model + business + enterprise)
6. **Geospatial & Robotics** (model + business + enterprise)
7. **Analytics** (business + enterprise)
8. **SlateDrop** (all tiers)

Locked tabs (not on current tier) show with a lock icon and tooltip "Upgrade to [tier] to access."

### Sidebar quick actions

- **New Project** → opens project creation wizard (business + enterprise only)
- **Upload** → opens SlateDrop upload dialog
- **Support / Help** → external link

---

## 10. Backend — API Routes

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/dashboard/widgets` | Fetch all widget data (projects, usage, activity, my-work) |
| `GET` | `/api/dashboard/usage` | Fetch usage + credit breakdown (standalone) |
| `GET` | `/api/static-map` | Google Static Maps API proxy (avoids key exposure in browser) |
| `POST` | `/api/directions` | Geocode + OSRM routing |
| `GET` | `/api/projects` | List projects for org (used by project cards) |
| `GET` | `/api/notifications` | User notification list |
| `POST` | `/api/notifications/mark-read` | Mark notification(s) as read |
| `POST` | `/api/credits/purchase` | Initiate credit pack Stripe checkout |
| `POST` | `/api/billing/portal` | Stripe billing portal session |

### Static Maps proxy

**Why a proxy?** The Google Maps API key has HTTP referrer restrictions (`*.slate360.ai`). In production this is fine for browser requests. The proxy `app/api/static-map/route.ts` allows server-side card rendering without exposing the key directly in image URLs.

---

## 11. Frontend — Key Files

| File | Purpose |
|---|---|
| `app/dashboard/page.tsx` | Dashboard main page (server component wrapper) |
| `app/(dashboard)/layout.tsx` | Dashboard shell: top bar, sidebar, hydration guard |
| `components/dashboard/DashboardProjectCard.tsx` | Project card with satellite map (~275 lines) |
| `components/dashboard/LocationMap.tsx` | Full map widget with pins |
| `components/dashboard/EnhancedUsageTracker.tsx` | Storage + credits usage widget |
| `components/shared/` | Shared UI primitives used across tabs |
| `components/ui/` | Base UI components (buttons, modals, dialogs) |
| `lib/entitlements.ts` | Tier → features mapping (single source of truth) |
| `lib/server/org-context.ts` | `resolveServerOrgContext()` — gets org_id for current user |
| `lib/projects/access.ts` | `listScopedProjectsForUser()`, `getScopedProjectForUser()` |

---

## 12. Entitlements Gating in UI

Always import from `lib/entitlements.ts`:

```typescript
import { getEntitlements, type Tier } from "@/lib/entitlements";

const entitlements = getEntitlements(user.tier);
if (!entitlements.canAccessHub) {
  return <UpgradePrompt feature="Project Hub" requiredTier="business" />;
}
```

**Never** write inline tier comparisons like `if (tier === 'business' || tier === 'enterprise')` in components. Always go through `getEntitlements()`.

---

## 13. Build Status & Known Issues

### Active issues (as of 2026-03-02)

- Dashboard and Project Hub project cards now both use consistent satellite map rendering (fixed commit `38f8bb7`).
- Google Routes API blocked by key restrictions — routing falls back to OSRM.
- `file_folders` → `project_folders` migration Phase 2 pending (see SlateDrop Blueprint Section 19).

### Watch list

- Mock Supabase client in `lib/supabase/server.ts` returns empty arrays when env vars are missing. Never ship UI that silently "works" on mock data — show a proper empty/error state.
- Hydration guard in `app/(dashboard)/layout.tsx` must not be removed. Persisted Zustand state must only render after `_hasHydrated = true`.

---

## 14. Reconstruction Checklist

- [ ] `app/(dashboard)/layout.tsx` — hydration guard, top bar, sidebar with tier-gated nav links
- [ ] `app/dashboard/page.tsx` — fetch org context, pass to widget grid
- [ ] `GET /api/dashboard/widgets` — returns project summaries (with lat/lng from metadata), usage, activity
- [ ] `DashboardProjectCard.tsx` — satellite map pattern (separate absolute div, no CSS shorthand clash)
- [ ] `LocationMap.tsx` — map with project pins, OSRM routing
- [ ] `EnhancedUsageTracker.tsx` — storage + monthly credits + purchased credits
- [ ] Notification bell → `GET /api/notifications` with Supabase Realtime subscription
- [ ] Tier-gated tab nav — locked tabs show lock icon + upgrade tooltip
- [ ] Trial upgrade CTA — inline, contextual, links to `/plans`
- [ ] Credit purchase — `SubtleCreditPurchase` component, never as prominent CTA
