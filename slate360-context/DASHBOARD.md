# Slate360 — Dashboard Blueprint

**Last Updated:** 2026-05-01 (dashboard no-filler cleanup)
**Context Maintenance:** Update this file whenever dashboard routes, components, widgets, or layout logic changes.
**Cross-reference:** See `FUTURE_FEATURES.md` for the full phased build roadmap (Phases 0–7).

---

## 1. Route Structure

```
/(dashboard)                     ← Layout with sidebar + hydration guard
  /project-hub                   ← Project Hub (separate blueprint)
  /analytics                     ← Analytics & Reports (DashboardTabShell, light theme)
  /ceo                           ← CEO Command Center (DashboardTabShell)
  /integrations                  ← Integrations page (133 lines)
  /design-studio                 ← ✅ Scaffolded (DashboardTabShell)
  /content-studio                ← ✅ Scaffolded (DashboardTabShell)
  /tours                         ← ✅ Scaffolded (DashboardTabShell)
  /geospatial                    ← ✅ Scaffolded (DashboardTabShell)
  /virtual-studio                ← ✅ Scaffolded (DashboardTabShell)
  /my-account                    ← ✅ Scaffolded (DashboardTabShell)
```

**Dashboard entry point:** `app/dashboard/` redirects into the authenticated `(dashboard)` route group.

---

## 2. Layout & Navigation

### Fixed Native-App Shell + Contained Scroll Direction

The authenticated Slate360 shell treats the viewport as a fixed native-app frame, but content must remain accessible on real phones:

- Top header and mobile bottom nav stay shell-owned and `flex-none`/fixed.
- The outer shell remains `h-[100dvh]` with hidden body/page overflow to preserve the PWA/native frame.
- The primary app content area must use `min-h-0 flex-1 overflow-y-auto overscroll-contain` with mobile bottom padding (`pb-24` or safe-area equivalent) so buttons and lower content are never cut off.
- Full-bleed workspaces such as capture/canvas views may keep local `overflow-hidden`, but their detail panels and action surfaces need their own contained scroll regions.
- The Command Center home should still be compact, but “zero body scroll” must not become “no scroll anywhere.” If content cannot fit on a small phone, use contained internal panes rather than clipping.
- This keeps the PWA transition path close to a future App Store/native shell while protecting field usability.

### Dark Glass Shell Direction

As of 2026-04-30, authenticated shell chrome and Site Walk/Auth entry surfaces use the premium Dark Glass direction:

- Base app surface: `#0B0F15` with subtle graphite/cobalt radial gradients.
- Panels/cards: translucent glass (`bg-white/5`, `backdrop-blur-md`, `border-white/10`, `shadow-lg`, rounded corners).
- Primary actions: cobalt blue with a soft glow (`bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)]`).
- Secondary actions: ghost glass (`border-white/20 bg-white/5 hover:bg-white/10`).
- Text: `text-slate-50` for primary/headings and `text-slate-400` for supporting copy.

### Mobile/PWA Bottom Navigation (Current Direction)

`components/shared/MobileBottomNav.tsx` is the primary phone/PWA tab bar. The platform nav is intentionally app-shell focused:

| Tab | Route | Purpose |
|---|---|---|
| Home | `/dashboard` | Command Center / app launcher |
| Projects | `/projects` | Global field/project management |
| SlateDrop | `/slatedrop` | App-aware file hub and project/site file spaces |
| More | `/more` | Settings, account, billing, subscriptions, coordination, and secondary tools |

Site Walk routes will use a future app-specific nav aligned to the 3 Act Play: Home, Capture, Files, Outputs, More.

### Coordination Hub Direction

The notification bell must target the **Communication Inbox** at `/coordination/inbox`, not generic account settings.

Current Coordination sections:
- `/coordination/inbox` — bell destination for messages, received files, stakeholder responses, feedback replies, and unread work.
- `/coordination/contacts` — global + project-scoped contact/stakeholder management for Site Walk, SlateDrop sends, and bulk outreach.
- `/coordination/calendar` — calendar/schedule-assistant planning for iOS/Android calendar sync and higher-tier Site Walk scheduling.

Future unread counts should be computed from inbox rows and surfaced on both desktop and mobile bell icons.

### Operations Console Direction

- `components/dashboard/operations-console/OperationsConsoleNav.tsx` accepts count badges for pending Version 1 access, open feedback, and feature/function suggestions.
- `lib/server/operations-console-counts.ts` is the shared server helper for current badge counts. It reads `profiles.is_beta_approved` and `beta_feedback` while public-facing labels remain Version 1 / Feedback.
- 2026-05-01: feedback intake is wired through `components/shared/BetaFeedbackModal.tsx` → `app/api/feedback/route.ts` → `beta_feedback` → `app/(dashboard)/operations-console/feedback/page.tsx`. Migration `20260501090000_beta_feedback_contract_reconcile.sql` reconciles older `category`/`replay_url` table shape with the current `type`/`app_area`/`console_errors` Operations Console contract.
- Operations sections are shaped as the business control center: access extensions, trial extensions, temporary/permanent app grants, pricing controls, business health, product health, systems health, and enterprise seat/permission management.
- Existing backend mutations for many of these controls are not complete yet; keep the current UI truthful by framing them as workflows/build targets until migrations and audited APIs exist.

### My Account Direction

- `components/dashboard/my-account/AccountControlCenterNav.tsx` provides an Operations Console-style card launcher above the legacy grouped tab rail.
- My Account should be organized around Profile, Security, Notifications, Organization, Billing & Apps, Data & Storage, Team Seats, and Privacy.
- Admin-only account controls must stay hidden from non-admin members; enterprise per-feature permissions continue to come from `organization_members.permissions` via `resolveServerOrgContext()`.

### Homepage Direction

- The public hero should position Slate360 as a connected app ecosystem, not only a Site Walk field-capture product.
- Site Walk-specific capture/report/proposal language belongs in the Site Walk app card/section.
- Ecosystem copy should explain that adding apps/bundles increases power through shared SlateDrop storage, Coordination, contacts, project context, and deliverables.

### Mobile/PWA Top Bar (Current Direction)

`components/shared/MobileTopBar.tsx` is the primary phone/PWA chrome above authenticated pages.

- Logo uses the cobalt Version 1 icon asset, not the old white/orange mark.
- PWA install icons must use the geometric Slate360 mark on `#0B0F15`. Keep `app/manifest.ts`, `app/layout.tsx`, `app/icon.svg`, `/icon-v2.svg`, `/uploads/slate360-favicon-v2.svg`, `/uploads/favicon.svg`, and `/uploads/icon-*.png` aligned; do not reintroduce the old generic letter-S favicon.
- PWA service-worker rule: service-worker caching is disabled by kill switch as of `2026-04-26-sw-kill-v2`. Do **not** precache or runtime-cache Next HTML/CSS/JS (`/_next/static`) unless there is a tested versioned rollout on real mobile refresh after deploy. Stale mobile SW caches can serve old HTML that points at retired CSS chunks and render a white/text-only page after refresh.
- The label defaults to `Slate360` and should show the resolved org name when available; avoid generic `Workspace` copy.
- Feedback is positioned as `Version 1 Feedback` and uses a portal-backed modal so it renders above the shell.
- The notification bell routes to `/coordination/inbox`; account/profile actions remain in the avatar menu.
- Keep tap targets at least 44px and avoid nested interactive elements in mobile shell controls.

### Command Center Home Layout (Current Direction)

The Command Center follows the zero-scroll blueprint:

- Top content: condensed centered 2×2 app tiles for Site Walk, 360 Tours, Design Studio, and Content Studio. Site Walk remains visible/clickable during development; the next three apps stay represented as coming-soon app tiles so the launcher does not collapse to a single app. Keep this row shorter than the Workspace Tray so small mobile screens do not clip the tray.
- Middle content: a very shallow horizontal shortcut rail for Active Projects, Recent Files, Draft Deliverables, My Work, Coordination, Settings, and New Project. It does not render extra title text above the rail.
- Bottom content: a contained Workspace Tray occupying the largest remaining lower area, with its own internal scroll area for work queue, inbox, file activity, and setup entry points.
- Search and global actions live in shell chrome/menus instead of taking vertical space on the home surface.
- 2026-05-01 triage: the Command Center app launcher and workspace tray are back on Dark Glass surfaces. When App Store mode leaves only one visible app, Site Walk renders as a large primary entry card instead of a tiny tile floating in a mostly empty app grid. The shell also removed the duplicate inner mobile bottom padding that created an obvious gap above the bottom nav.
- 2026-05-01 no-filler cleanup: the Command Center no longer uses a horizontal shortcut carousel or Workspace Tray. The active home surface is now vertical and action-first: app entry, Quick Actions grid, Recent Walks row, and Inbox row. Avoid reintroducing horizontal scrolling for primary dashboard actions.

### Secondary Mobile Surfaces Triage

- 2026-05-01: `/more`, `/coordination/inbox`, `/coordination/contacts`, `/coordination/calendar`, `/slatedrop`, and `/site-walk/slatedrop` were converted away from white cards on the dark app frame. This is a triage consistency pass, not the final SlateDrop/Coordination product model.
- In App Store mode, SlateDrop hides inactive future app folder placeholders instead of showing locked 360 Tours / Design Studio / Content Studio spaces to reviewers.
- 2026-05-01 native-tab cleanup: `/projects` is now a Field Projects directory instead of a dashboard metrics page; `/slatedrop` is now a compact file-browser shell with Browse/Recents/Shared/Requests tabs; `/more` is now a utility/settings list. These tabs should stay no-filler: compact title, useful rows/cards, and one obvious primary action.

### Command Center Quick Actions (Legacy Reference)

- Quick Start
- New Project
- Open SlateDrop
- My Work

`My Work` replaces the narrower `Assigned Tasks` label because owners/admins often assign and review work rather than only receive it.

### Sidebar Tabs (Current)
| Tab | Route | Status |
|---|---|---|
| Dashboard Home | `/(dashboard)` | ✅ Built |
| Project Hub | `/project-hub` | ✅ Built |
| SlateDrop | `/slatedrop` | ✅ Built (standalone route) |
| Design Studio | `/(dashboard)/design-studio` | ✅ Scaffolded |
| Content Studio | `/(dashboard)/content-studio` | ✅ Scaffolded |
| 360 Tour Builder | `/(dashboard)/tours` | ✅ Scaffolded |
| Geospatial & Robotics | `/(dashboard)/geospatial` | ✅ Scaffolded |
| Virtual Studio | `/(dashboard)/virtual-studio` | ✅ Scaffolded |
| My Account | `/(dashboard)/my-account` | ✅ Scaffolded |
| Analytics & Reports | `/(dashboard)/analytics` | ✅ DashboardTabShell |
| CEO Command Center | `/(dashboard)/ceo` | ✅ DashboardTabShell |
| Market | `/market` | ✅ Built |

### DashboardHeader (Shared Top Bar)
`components/shared/DashboardHeader.tsx` (~280 lines) — **unified header** used by both `DashboardClient` and `DashboardTabShell`:

**Header Layout:**
- **Left cluster:** Slate360 logo (links to `/dashboard`) + optional "← Dashboard" back link (via `showBackLink` prop)
- **Center:** Search bar (active with `onSearchChange` or read-only stub)
- **Right cluster:** QuickNav dropdown, Bell (with live notifications), Customize (with dirty dot), User avatar with dropdown menu (My Account, Billing, Sign out)

**Props:** `user`, `tier`, `isCeo?`, `showBackLink?`, `searchQuery?`, `onSearchChange?`, `searchPlaceholder?`, `prefsDirty?`, `onCustomizeOpen?`, `notifications?`, `notificationsLoading?`, `onRefreshNotifications?`

**Self-contained:** Handles sign-out, billing portal, and notification dropdown state internally.

### DashboardTabShell (Shared Tab Wrapper)
`components/shared/DashboardTabShell.tsx` (~94 lines) — standardized wrapper for all tab pages. Delegates header to `DashboardHeader`.

**Props:** `user`, `tier`, `title`, `icon`, `accent`, `status`, `isCeo?`, `children`

**Tier/CEO Override:** Uses `getEntitlements(tier, { isSlateCeo: isCeo })` so the CEO account automatically gets enterprise-level navigation items regardless of DB tier.

**Theme:** Light theme only (white/gray). Dark theme removed. All tabs use consistent light styling.

### QuickNav (Shared Dropdown)
`components/shared/QuickNav.tsx` (~100 lines) — tier-gated navigation dropdown:
- Props: `tier?: Tier`, `isCeo?: boolean`
- 13 navigation items, each with optional `gate` key mapping to Entitlements boolean
- CEO-only items gated via `ceoOnly: true` flag
- No back button — back-to-dashboard link is in the DashboardTabShell header left cluster

### Cross-Tab Customization Contract
All dashboard tabs must implement layout/tooling customization using:
- `slate360-context/dashboard-tabs/CUSTOMIZATION_SYSTEM.md`
- `slate360-context/dashboard-tabs/{tab}/IMPLEMENTATION_PLAN.md`

Minimum required behaviors per tab: movable regions, expandable/collapsible sections, resizable panels where applicable, and persisted mode presets (`simple`, `standard`, `advanced`, `custom`).

### isCeo / Internal Access Flow
Server pages now resolve `isSlateCeo`, `isSlateStaff`, and `hasInternalAccess` from `resolveServerOrgContext()`.

- Pass `isCeo={hasInternalAccess}` to shell components and `DashboardTabShell` for internal navigation visibility.
- Keep entitlement override tied to true CEO identity only (`getEntitlements(tier, { isSlateCeo })`) when needed.
- Use `hasInternalAccess` to gate internal platform tabs.

```
Server page (resolveServerOrgContext → hasInternalAccess)
  → Shell component (isCeo prop from hasInternalAccess)
    → DashboardTabShell (isCeo prop → getEntitlements override)
      → QuickNav (isCeo prop → shows CEO-only nav items)
```

### Shell Components (All Use DashboardTabShell)
| Component | File | Route | Passes isCeo? |
|---|---|---|---|
| DesignStudioShell | `components/dashboard/DesignStudioShell.tsx` | `/design-studio` | ✅ |
| ContentStudioShell | `components/dashboard/ContentStudioShell.tsx` | `/content-studio` | ✅ |
| ToursShell | `components/dashboard/ToursShell.tsx` | `/tours` | ✅ |
| GeospatialShell | `components/dashboard/GeospatialShell.tsx` | `/geospatial` | ✅ |
| VirtualStudioShell | `components/dashboard/VirtualStudioShell.tsx` | `/virtual-studio` | ✅ |
| MyAccountShell | `components/dashboard/MyAccountShell.tsx` | `/my-account` | ✅ |

### Hydration Safety (Critical)
Current state:
- `app/(dashboard)/layout.tsx` is a pass-through route-group layout.
- Hydration protection for dashboard rendering is currently implemented inside `components/dashboard/DashboardClient.tsx` via `isClient`-guarded render paths and mount-only localStorage hydration.

Follow-up target:
- Reintroduce a shared route-group hydration boundary in `app/(dashboard)/layout.tsx` once dashboard and tab shells are fully decomposed.

### Tier Behavior
- **business/enterprise:** Portfolio-first layout — projects carousel prominent
- **creator/model:** Content-first layout — creative tools prominent
- **trial:** Gets Hub access + studio access for trial period
- **CEO account (`slate360ceo@gmail.com`):** Gets enterprise entitlements via `isSlateCeo` override. Also gets access to platform-admin tabs (CEO, Market Robot, Athlete360) which are NOT available at any subscription tier.

### CEO / Internal Tabs — Access Model
| Tab | Route | Access Gate |
|---|---|---|
| CEO Command Center | `/(dashboard)/ceo` | `hasInternalAccess` — never tier |
| Market Robot | `/market` | `hasInternalAccess` — never tier |
| Athlete360 | `/athlete360` | `hasInternalAccess` — never tier |

These tabs contain sensitive platform-admin and internal business data. No subscription tier — including enterprise — grants access. `hasInternalAccess` is computed as `isSlateCeo || isSlateStaff`.

---

## 3. Widget System

See `slate360-context/WIDGETS.md` for the complete widget system blueprint.

Widgets appear on both Dashboard and Project Hub Tier 2, sharing identically from `components/widgets/`.

---

## 4. Key Components

| Component | File | Lines | Status |
|---|---|---|---|
| DashboardHeader | `components/shared/DashboardHeader.tsx` | ~280 | ✅ NEW — unified top bar (dashboard home + all tabs) |
| DashboardTabShell | `components/shared/DashboardTabShell.tsx` | ~94 | ✅ Shared scaffold (uses DashboardHeader, light theme, isCeo) |
| DashboardClient | `components/dashboard/DashboardClient.tsx` | 264 | ✅ Decomposed (Phase 4 complete — 5 extractions + 6 sub-hooks) |
| DashboardWidgetGrid | `components/dashboard/DashboardWidgetGrid.tsx` | 41 | ✅ Extracted grid shell for draggable widget cards |
| DashboardWidgetPopout | `components/dashboard/DashboardWidgetPopout.tsx` | 102 | ✅ Extracted widget popout frame/shell |
| DashboardDataUsageWidget | `components/dashboard/DashboardDataUsageWidget.tsx` | 124 | ✅ Extracted data-usage widget view |
| DashboardProcessingWidget | `components/dashboard/DashboardProcessingWidget.tsx` | 83 | ✅ Extracted processing widget view |
| DashboardFinancialWidget | `components/dashboard/DashboardFinancialWidget.tsx` | 85 | ✅ Extracted financial widget view |
| DashboardCalendarWidget | `components/dashboard/DashboardCalendarWidget.tsx` | 218 | ✅ Extracted calendar widget view |
| DashboardWeatherWidget | `components/dashboard/DashboardWeatherWidget.tsx` | 176 | ✅ Extracted weather widget view |
| DashboardContinueWidget | `components/dashboard/DashboardContinueWidget.tsx` | 81 | ✅ Extracted continue-working widget view |
| DashboardSuggestWidget | `components/dashboard/DashboardSuggestWidget.tsx` | 105 | ✅ Extracted suggest-feature widget view |
| DashboardContactsWidget | `components/dashboard/DashboardContactsWidget.tsx` | 83 | ✅ Extracted contacts widget view |
| DashboardSeatsWidget | `components/dashboard/DashboardSeatsWidget.tsx` | 109 | ✅ Extracted seat-management widget view |
| MarketClient | `components/dashboard/market/MarketClient.tsx` | 175 | ✅ Under limit (0 TS errors) |
| LocationMap | `components/dashboard/LocationMap.tsx` | 1,864 | ⚠️ Needs decomposition (BUG-018 drawing-library migration complete; all drawing tools now native) |
| AnalyticsReportsClient | `components/dashboard/AnalyticsReportsClient.tsx` | ~245 | ✅ Report builder UI (saved reports + export actions) |
| DashboardProjectCard | `components/dashboard/DashboardProjectCard.tsx` | 275 | ✅ OK |
| CeoCommandCenterClient | `components/dashboard/CeoCommandCenterClient.tsx` | 155 | ✅ OK |
| QuickNav | `components/shared/QuickNav.tsx` | ~100 | ✅ 13 nav items, tier-gated |

### Decomposition Targets

**DashboardClient.tsx — ✅ COMPLETE (1,961 → 264 lines)**

Extracted components:
- `DashboardMyAccount.tsx` (267 lines) — billing, profile, subscription UI
- `DashboardOverview.tsx` — project carousel, quick actions, widget grid
- `DashboardSidebar.tsx` — tab list, navigation
- `DashboardSlateDropWindow.tsx` — floating SlateDrop panel
- `DashboardWidgetGrid.tsx` / `DashboardWidgetRenderer.tsx` — widget rendering

Extracted hooks from `useDashboardState.ts` (775 → 244 lines):
- `useBillingState` (81) — billing portal, credits, plan upgrades
- `useWidgetPrefsState` (155) — widget prefs, drag-reorder, save/reset
- `useAccountState` (154) — account overview, API keys, preferences
- `useWeatherState` (104) — geolocation, weather fetch, logging
- `useSuggestFeatureState` (40) — suggest-feature form + submit
- `useNotificationsState` (38) — unread notifications fetch

Widget components (all extracted):
- `DashboardDataUsageWidget.tsx`, `DashboardProcessingWidget.tsx`, `DashboardFinancialWidget.tsx`
- `DashboardCalendarWidget.tsx`, `DashboardWeatherWidget.tsx`, `DashboardContinueWidget.tsx`
- `DashboardSuggestWidget.tsx`, `DashboardContactsWidget.tsx`, `DashboardSeatsWidget.tsx`

**MarketClient.tsx — ✅ Under limit (175 lines)**
Already decomposed into `components/dashboard/market/` directory (39 files). Orchestrator at 175 lines.

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

Location normalization note:
- `/api/dashboard/widgets` now uses shared `resolveProjectLocation` (`lib/projects/location.ts`) to derive consistent project location label/lat/lng for dashboard cards/widgets.

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
