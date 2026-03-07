# Dashboard Tabs — Module Registry

**Purpose:** Canonical map of tab routes, gates, implementation status, and source-trust policy for uploaded artifacts.

## Canonical Route + Gate Matrix

| Module | Primary Route | Access Gate | Canonical Spec | Status |
|---|---|---|---|---|
| Dashboard Home | `/dashboard` | authenticated | `dashboard-tabs/dashboard-home/IMPLEMENTATION_PLAN.md` | Live |
| Project Hub | `/project-hub` | `getEntitlements(tier).canAccessHub` | `dashboard-tabs/project-hub/IMPLEMENTATION_PLAN.md` | Live |
| SlateDrop | `/slatedrop` | authenticated | `dashboard-tabs/slatedrop/IMPLEMENTATION_PLAN.md` | Live |
| Design Studio | `/(dashboard)/design-studio` | `getEntitlements(tier).canAccessDesignStudio` | `dashboard-tabs/design-studio/IMPLEMENTATION_PLAN.md` | Scaffolded |
| Content Studio | `/(dashboard)/content-studio` | `getEntitlements(tier).canAccessContentStudio` | `dashboard-tabs/content-studio/IMPLEMENTATION_PLAN.md` | Scaffolded |
| 360 Tour Builder | `/(dashboard)/tours` | `getEntitlements(tier).canAccessTours` | `dashboard-tabs/tour-builder/IMPLEMENTATION_PLAN.md` | Scaffolded |
| Geospatial & Robotics | `/(dashboard)/geospatial` | `getEntitlements(tier).canAccessGeospatial` | `dashboard-tabs/geospatial-robotics/IMPLEMENTATION_PLAN.md` | Scaffolded |
| Virtual Studio | `/(dashboard)/virtual-studio` | `getEntitlements(tier).canAccessVirtualStudio` | `dashboard-tabs/virtual-studio/IMPLEMENTATION_PLAN.md` | Scaffolded |
| Analytics & Reports | `/(dashboard)/analytics` | `getEntitlements(tier).canAccessAnalytics` + CEO override | `dashboard-tabs/analytics-reports/IMPLEMENTATION_PLAN.md` | Live (v1 UI) |
| My Account | `/(dashboard)/my-account` | authenticated | `dashboard-tabs/my-account/IMPLEMENTATION_PLAN.md` | Scaffolded |
| CEO Command Center | `/(dashboard)/ceo` | `resolveServerOrgContext().canAccessCeo` (owner-only, NOT entitlement) | `dashboard-tabs/ceo-command-center/IMPLEMENTATION_PLAN.md` | Live stub |
| Market Robot | `/market` | `resolveServerOrgContext().canAccessMarket` (NOT entitlement) | `dashboard-tabs/market-robot/IMPLEMENTATION_PLAN.md` | Live |
| Athlete360 | `/athlete360` | `resolveServerOrgContext().canAccessAthlete360` (NOT entitlement) | `dashboard-tabs/athlete360/IMPLEMENTATION_PLAN.md` | Stub |

## Internal Access Rule (Critical)

- `canAccessCeo` is owner-only (`slate360ceo@gmail.com`)
- `canAccessMarket` / `canAccessAthlete360` may be granted per-user via `slate360_staff.access_scope`
- Entitlements override (`getEntitlements(..., { isSlateCeo })`) is for module limits/navigation only, not internal-tab authorization.

## Analytics Canonical Definition

Analytics is a **report builder**, not a generic cross-project chart dashboard.

Primary behaviors:
- choose report type
- choose date range
- choose included data sections
- build and store report
- download/share from saved reports list

## Cross-Tab Customization Requirement (Mandatory)

All tab implementations must follow `dashboard-tabs/CUSTOMIZATION_SYSTEM.md`.

Minimum requirement per tab:
- movable regions
- expandable/collapsible regions
- resizable panels where applicable
- persisted presets (`simple`, `standard`, `advanced`, `custom`)

## Uploaded File Trust Map

| Uploaded File | Canonical Location | Trust | Notes |
|---|---|---|---|
| `tour-builder/raw-upload-1.txt` | `tour-builder/IMPLEMENTATION_PLAN.md` | supporting | merged |
| `tour-builder/raw-upload-2.txt` | `tour-builder/IMPLEMENTATION_PLAN.md` | supporting | deduped |
| `dashboard-home/raw-upload.txt` | `dashboard-home/IMPLEMENTATION_PLAN.md` | supporting | normalized |
| `design-studio/raw-upload.txt` | `design-studio/IMPLEMENTATION_PLAN.md` | supporting | normalized |
| `athlete360/raw-upload.txt` | `athlete360/IMPLEMENTATION_PLAN.md` | supporting | normalized |
| `athlete360/raw-chat-notes.txt` | `athlete360/IMPLEMENTATION_PLAN.md` | archive-only | idea-only inputs |
| `ceo-command-center/raw-upload.txt` | `ceo-command-center/IMPLEMENTATION_PLAN.md` | supporting | normalized |
| `content-studio/raw-upload.txt` | `content-studio/IMPLEMENTATION_PLAN.md` | supporting | normalized |
| `geospatial-robotics/raw-upload.txt` | `geospatial-robotics/IMPLEMENTATION_PLAN.md` | supporting | normalized |
| `my-account/raw-upload.txt` | `my-account/IMPLEMENTATION_PLAN.md` | supporting | normalized |
| `project-hub/raw-upload.html` | `project-hub/IMPLEMENTATION_PLAN.md` | archive-only | extracted and reconciled |
| `analytics-reports/raw-upload.txt` | `analytics-reports/IMPLEMENTATION_PLAN.md` | supporting | reconciled with canonical analytics direction |
| `virtual-studio/raw-upload.txt` | `virtual-studio/IMPLEMENTATION_PLAN.md` | supporting | normalized |

## Next Normalization Targets

1. Add schema examples per tab (DB tables + API payloads).
2. Add dependency graph links from each tab plan back to `FUTURE_FEATURES.md` phases.
3. Add acceptance test checklist per tab implementation plan.
