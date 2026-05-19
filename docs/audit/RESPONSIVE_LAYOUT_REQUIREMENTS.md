# Responsive Layout Requirements Audit

Last Updated: 2026-05-14
Status: Read-only audit. No code changes.

## Purpose

Documents current responsive infrastructure and V1 requirements across viewports.

## Current Shell Components

### Mobile (< lg / 1024px)
| Component | Purpose | Safe-Area? |
|---|---|---|
| `MobileTopBar` | Fixed h-14 top bar: logo, search, notifications, avatar | Yes (inline style) |
| `MobileBottomNav` | Fixed bottom tabs: Platform (Home/Projects/SlateDrop/Coordination/Account) or Site Walk (Home/Walks/Deliverables/More) | Yes (inline style) |
| `MobileNavSheet` | Slide-out overflow nav | No |

### Desktop (>= lg / 1024px)
| Component | Purpose |
|---|---|
| `DashboardSidebar` | Pinnable w-64 left sidebar: Dashboard/Projects/SlateDrop/Account + Ops Console |
| `DashboardTopBar` | Top bar with user, beta feedback |
| `AppShell` | Client wrapper combining sidebar + topbar, full-bleed for capture routes |
| `AuthedAppShell` | Server component resolving user/org context |

### Site Walk Module
| Component | Purpose |
|---|---|
| `SiteWalkShell` | Non-task module viewport |
| `SiteWalkModuleNav` | Hidden on home, compact on subpages |
| `CaptureShell` | Full-viewport `fixed inset-0 h-[100dvh]` for capture tasks |
| `LiveWalkShell` | Live walk mode with safe-area |

### Shell Coexistence
- `AppShell` detects full-bleed mode for capture routes — hides all chrome
- `MobileBottomNav` auto-switches between Platform nav and Site Walk nav by pathname
- `CollaboratorShell` is completely separate (stripped-down for collaborators)
- `DashboardSidebar` pinnable state persisted in localStorage

## Safe-Area Handling

Well-implemented in Site Walk capture:
- `MobileTopBar`: `paddingTop: env(safe-area-inset-top)`
- `MobileBottomNav`: `paddingBottom: env(safe-area-inset-bottom)`
- `LiveWalkShell`: Both top and bottom
- `CaptureBottomSheet`: `pb-[max(env(safe-area-inset-bottom),1rem)]`
- `VisualCaptureView`: `pt-[max(env(safe-area-inset-top),0.5rem)]`
- `SharedCaptureTaskHeader`: Both insets
- `PlanQuickActionMenu`: Bottom inset
- `SiteWalkHub`: Bottom inset

**Gap:** `viewport-fit=cover` meta tag status not verified in `layout.tsx`.

## Landscape Handling

**Minimal.** Only one landscape reference found (PDF export orientation). No responsive landscape-specific layouts exist.

## Tablet Support

**Implicit only.** The `lg:` breakpoint (1024px) switches mobile ↔ desktop chrome. Tablets in portrait (~768px) get mobile layout. Tablets in landscape (~1024px+) get desktop layout. No `md:` tablet-specific adjustments.

## Z-Index Layering

| Component | Z-Index | Notes |
|---|---|---|
| `MobileTopBar` | z-50 | Correct — above other chrome |
| `MobileBottomNav` | z-40 | Below top bar |
| `DashboardSidebar` | z-40 | Desktop only |
| `CaptureBottomSheet` | z-40 | Capture mode |
| `PlanToolbar` | z-[1000] | Plan chrome |
| `PlanQuickActionMenu` | z-[2000] | Very high |
| `PendingUploadPreviewModal` | z-[2100] | Highest modal |

## V1 Viewport Requirements

### Phone Portrait (375–430px wide)
| Surface | Requirement |
|---|---|
| App shell | Single-column, bottom nav, compact top bar |
| Site Walk Home | Action grid (3-col), scrollable list panel |
| Worksites/Projects | Scrollable dense rows |
| Deliverables | Scrollable list |
| Plan Workspace | Full-screen canvas, bottom tools bar, top sheet rail |
| Capture Workspace | Photo stage, bottom sheet tabs, save button |
| SlateDrop | File/folder list view |
| Coordination | List of assignments/comments |
| Account | Simple utility list |

### Phone Landscape (667–932px wide)
| Surface | Requirement |
|---|---|
| Plan Workspace | Maximum canvas area, compact controls |
| Capture Workspace | Side-by-side photo + details possible |
| All other surfaces | Same as portrait, wider content area |

### Tablet Portrait (768–834px wide)
| Surface | Requirement |
|---|---|
| App shell | Consider sidebar or wider bottom nav |
| Site Walk Home | Wider action grid, side-by-side panels possible |
| Plan Workspace | Full canvas with floating tools |
| Worksites/Projects | Two-column layout possible |

### Tablet Landscape (1024–1194px wide)
| Surface | Requirement |
|---|---|
| App shell | Desktop sidebar layout |
| All surfaces | Follow desktop patterns |

### Desktop (1200px+)
| Surface | Requirement |
|---|---|
| App shell | Pinnable sidebar, top bar |
| Site Walk Home | Multi-panel layout |
| Plan Workspace | Full canvas with persistent tool panels |
| Worksites/Projects | Table view with sortable columns |
| Deliverables | Editor with side preview |
| SlateDrop | File browser with tree sidebar |

## Current Gaps for V1

1. No landscape-specific layouts exist anywhere
2. No tablet-specific breakpoint adjustments
3. Shell conflicts between CollaboratorShell and AppShell not resolved
4. z-index hierarchy in capture/plan needs consolidation
5. `100vh` vs `100dvh` inconsistency in some components
6. `viewport-fit=cover` not verified
