# Slate360 — Dashboard Blueprint

**Last Updated:** 2026-03-03
**Context Maintenance:** Update this file whenever dashboard routes, components, widgets, or layout logic changes.
**Cross-reference:** See `FUTURE_FEATURES.md` for the full phased build roadmap (Phases 0–7).

---

## 1. Route Structure

```
/(dashboard)                     ← Layout with sidebar + hydration guard
  /project-hub                   ← Project Hub (separate blueprint)
  /analytics                     ← Analytics tab (stub — 37 lines)
  /ceo                           ← CEO Command Center (stub — 20 lines)
  /integrations                  ← Integrations page (133 lines)
  /design-studio                 ← NOT BUILT
  /content-studio                ← NOT BUILT
  /tour-builder                  ← NOT BUILT
  /geospatial-robotics           ← NOT BUILT
  /virtual-studio                ← NOT BUILT
```

**Dashboard entry point:** `app/dashboard/` redirects into the authenticated `(dashboard)` route group.

---

## 2. Layout & Navigation

### Sidebar Tabs (Current)
| Tab | Route | Status |
|---|---|---|
| Dashboard Home | `/(dashboard)` | ✅ Built |
| Project Hub | `/project-hub` | ✅ Built |
| SlateDrop | `/slatedrop` | ✅ Built (standalone route) |
| Design Studio | `/(dashboard)/design-studio` | ❌ Not built |
| Content Studio | `/(dashboard)/content-studio` | ❌ Not built |
| 360 Tour Builder | `/(dashboard)/tour-builder` | ❌ Not built |
| Geospatial & Robotics | `/(dashboard)/geospatial-robotics` | ❌ Not built |
| Virtual Studio | `/(dashboard)/virtual-studio` | ❌ Not built |
| Analytics & Reports | `/(dashboard)/analytics-reports` | 🟡 Stub |
| CEO Command Center | `/(dashboard)/ceo` | 🟡 Stub |
| Market | `/market` | ✅ Built |

### Hydration Guard (Critical — Never Remove)
`app/(dashboard)/layout.tsx` renders client state only after `isClient && _hasHydrated`. This prevents React hydration mismatches.

### Tier Behavior
- **business/enterprise:** Portfolio-first layout — projects carousel prominent
- **creator/model:** Content-first layout — creative tools prominent
- **trial:** Gets Hub access + studio access for trial period

---

## 3. Widget System

See `slate360-context/WIDGETS.md` for the complete widget system blueprint.

Widgets appear on both Dashboard and Project Hub Tier 2, sharing identically from `components/widgets/`.

---

## 4. Key Components

| Component | File | Lines | Status |
|---|---|---|---|
| DashboardClient | `components/dashboard/DashboardClient.tsx` | 2,915 | ⚠️ Needs decomposition |
| MarketClient | `components/dashboard/MarketClient.tsx` | 3,006 | ⚠️ Needs decomposition |
| LocationMap | `components/dashboard/LocationMap.tsx` | 1,568 | ⚠️ Needs decomposition |
| AnalyticsReportsClient | `components/dashboard/AnalyticsReportsClient.tsx` | 290 | ✅ OK |
| DashboardProjectCard | `components/dashboard/DashboardProjectCard.tsx` | 275 | ✅ OK |
| CeoCommandCenterClient | `components/dashboard/CeoCommandCenterClient.tsx` | 155 | ✅ OK |

### Decomposition Targets

**DashboardClient.tsx (2,915 → ~10 files):**
```
DashboardClient.tsx        → ~150 lines (layout shell)
DashboardHeader.tsx        → header bar, nav, notifications
DashboardStatsGrid.tsx     → stat cards row
DashboardProjectCards.tsx  → project carousel section
DashboardActivityFeed.tsx  → activity section
DashboardWidgetGrid.tsx    → widget grid container
```

**MarketClient.tsx (3,006 → ~8 files):**
```
MarketClient.tsx          → ~150 lines (layout shell)
MarketListingCard.tsx     → individual listing card
MarketListingGrid.tsx     → grid/list view
MarketCreateForm.tsx      → create/edit flow
MarketFilterBar.tsx       → search/filter controls
MarketBotPanel.tsx        → AI bot interface
MarketDetailModal.tsx     → listing detail view
```

**LocationMap.tsx (1,568 → ~5 files):**
```
LocationMap.tsx           → ~200 lines (map container)
MapControls.tsx           → zoom, locate, 3D toggle
MapSearch.tsx             → address autocomplete
MapDirections.tsx         → OSRM routing overlay
MapDrawing.tsx            → polygon/polyline drawing
```

---

## 5. API Routes

| Endpoint | Purpose |
|---|---|
| `GET /api/dashboard/summary` | Dashboard summary data |
| `GET /api/dashboard/widgets` | Widget data: projects, usage, activity, myWork |

### Widget Data Shape
```typescript
// GET /api/dashboard/widgets returns:
{
  projects: Project[],
  usage: { storageUsedGb, creditBalance, creditsUsedThisMonth },
  activity: ActivityEvent[],
  myWork: { tasksDue, rfisOpen, submittalsOpen }
}
```

---

## 6. Dashboard Tabs — Build Order (Aligned to Phased Roadmap)

Refer to `FUTURE_FEATURES.md` for the master 7-phase build plan. Dashboard tab construction maps to these phases:

| Priority | Tab | Phase | Dependency |
|---|---|---|---|
| 1 | Project Hub (complete) | Phase 1 | Foundation (Phase 0) |
| 2 | Design Studio | Phase 2 | Phase 0 decomposition |
| 3 | 360 Tour Builder | Phase 4A | Design Studio viewer stack |
| 4 | Content Studio | Phase 4B | SlateDrop integration |
| 5 | Analytics & Reports | Phase 4C | Project Hub data |
| 6 | Geospatial & Robotics | Phase 4D | GPU pipeline (Phase 5) |
| 7 | Virtual Studio | Phase 4E | GPU pipeline (Phase 5) |
| 8 | CEO Command Center | Phase 4F | Analytics data |

### Standalone App Routing (Phase 3)
Modules that are offered as standalone apps (Design Studio, 360 Tour, Content Studio) will also be accessible at top-level routes (e.g., `/design-studio`, `/tour-builder`) in addition to their `/(dashboard)` routes. Both routes render the same component — the standalone route skips the full dashboard sidebar and shows a simplified nav.

### Sidebar Evolution (Future)
- **Phase 3:** Add "Apps" section to sidebar showing user’s active standalone subscriptions
- **Phase 3:** Add app directory link for discovering/subscribing to standalone modules
- **Phase 4+:** Each new module appears in sidebar as it’s built

Each new tab should:
- Be a server component page with client component islands
- Gate access via `getEntitlements(tier)` (merged with `org_feature_flags` in Phase 3)
- Follow the `< 300 lines per file` rule
- Share UI components from `components/ui/`

---

## 7. State Management

| State | Location |
|---|---|
| Widget preferences (order, visibility, expanded) | localStorage via `widget-prefs-storage.ts` |
| Project data | Server-fetched via `/api/dashboard/widgets` |
| User profile / org | Server-fetched via `/api/account/overview` |
| UI toggles (modals, drawers) | Local `useState` |
| Cross-page state | React Context or Zustand |

---

## 8. Context Maintenance Checklist

When making dashboard changes, update this file if:
- [ ] A new tab/route is added or renamed
- [ ] Component files are created, renamed, or decomposed
- [ ] API endpoints change
- [ ] Widget system behavior changes
- [ ] Navigation/sidebar structure changes
- [ ] Tier gating logic changes
