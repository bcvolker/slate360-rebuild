# UI Technical Debt Inventory

Last Updated: 2026-05-13
Status: Documentation-only audit. No UI behavior, colors, or layouts changed.

## Purpose

This inventory records the UI debt that future implementation slices should address carefully. It is not a refactor prompt and must not be used to justify broad repainting, deleting code, or changing Site Walk capture/plan behavior.

## Executive Finding

Slate360 has a strong V1 direction, but UI implementation is fragmented across multiple shell systems, route-local headers, hardcoded color sets, fixed overlays, and legacy/filler language. The highest-risk area is Site Walk capture/plan because working field behavior depends on overlapping fixed/absolute surfaces.

## Debt Categories

### 1. Duplicate Shell, Header, And Nav Systems

Current shell/header/nav surfaces include:

| Area | Files or symbols | Risk |
|---|---|---|
| Authenticated app shell | `components/dashboard/AppShell.tsx`, `components/dashboard/AuthedAppShell.tsx` | Canonical shell candidate; must own app-store visible navigation |
| Dashboard desktop chrome | `components/dashboard/command-center/DashboardSidebar.tsx`, `components/dashboard/command-center/DashboardTopBar.tsx` | Desktop navigation and top bar may diverge from mobile shell |
| Mobile chrome | `components/shared/MobileTopBar.tsx`, `components/shared/MobileBottomNav.tsx` | Must not expose unfinished apps or conflict with task mode |
| Project Hub legacy headers | `components/shared/DashboardHeader.tsx`, project-hub layouts | Older PM surfaces still use route-level headers |
| Site Walk module chrome | `components/site-walk/SiteWalkShell.tsx`, `components/site-walk/SiteWalkModuleNav.tsx` | Correct for module pages, not active capture tasks |
| Capture task chrome | `app/site-walk/(act-2-inputs)/capture/_components/CaptureShell.tsx`, `WalkHeader`, mode controls | Full viewport task mode; should not fight platform chrome |
| Public marketing chrome | `components/Navbar.tsx`, `components/Footer.tsx`, `components/home/LandingHeader.tsx`, `components/home/LandingFooter.tsx` | Public design patterns must not leak into authenticated command centers |
| Preview shell pages | `app/preview/*` | Useful for testing but can mislead agents if treated as product routes |

Implementation rule: choose one shell owner for the surface being edited. Do not mix global shell, module shell, and task chrome in the same slice unless the task explicitly targets shell architecture.

### 2. Filler, Demo, Placeholder, And Non-Actionable Text

Search evidence found examples of V1-sensitive terms:

- Public app pages have `Coming Soon` labels in `app/(public)/apps/[slug]/page.tsx`.
- Preview routes include mock shell/dashboard pages under `app/preview/*`.
- Some dashboard/more pages use metric-card patterns that can become non-actionable if surfaced as product value.
- Auth/dev/admin code still contains beta terminology that may be legitimate internally but should not leak into app-store-facing authenticated surfaces.
- API comments include explicit anti-fake handling, such as analytics export returning a clear error instead of fake mock URLs.

Risk distinction:

- Public marketing and dev/preview routes can contain preview/demo concepts if they are not app-store visible.
- Authenticated app-store-facing surfaces must not show Coming Soon, placeholder, demo, mock, fake, beta/test, or non-actionable metric language.

### 3. Hardcoded Colors And Competing Palettes

Search evidence found hardcoded colors in public/auth/share/upload surfaces, dashboard/project-hub surfaces, dev color audit pages, and Site Walk capture components.

Common patterns include:

- Hex blue `#3B82F6` across upload/share/auth/project-hub actions.
- Old app shell darks like `#0B0F15`.
- Auth provider SVG brand colors, which are legitimate exceptions.
- Hardcoded Tailwind palette classes such as `bg-black`, `bg-slate-*`, `text-amber-*`, `text-orange-*`, `bg-blue-*`, `text-blue-*`, and white alpha borders.
- Inline style colors in public upload/share pages and diagnostics.

Design direction remains Graphite Glass + restrained amber + muted teal, as defined by `docs/design/SLATE360_V1_DESIGN_TOKEN_PLAN.md`. Do not globally replace colors. Token migration should start with Site Walk capture/plan only when approved.

### 4. Capture And Plan Overlay Risk

Site Walk capture/plan files contain many fixed/absolute surfaces and z-index layers:

| File | Evidence | Risk |
|---|---|---|
| `app/site-walk/(act-2-inputs)/capture/layout.tsx` | Fixed full-screen layout at z-50 with warning about child fixed positioning | Contract can be violated by nested overlays |
| `CaptureShell.tsx` | `fixed inset-0 h-[100dvh]` | Owns task viewport |
| `CaptureDataBottomSheet.tsx` | Mobile FAB, fixed full-screen sheet, safe-area footer | Can compete with plan quick actions and bottom nav spacing |
| `CaptureBottomSheet.tsx` | Fixed bottom sheet with `max-h-[86dvh]` and keyboard padding | Can occlude visual workspace |
| `PlanQuickActionMenu.tsx` | Fixed bottom menu at `z-[2000]` | Very high layer can cover other task UI |
| `PendingUploadPreviewModal.tsx` | Fixed modal at `z-[2100]` | Highest modal layer; requires explicit ownership |
| `PlanToolbar.tsx` | Absolute toolbar at `z-[1000]` | Competes with plan tabs/toggles |
| `PlanViewerLeaflet.tsx` and `PlanViewerPdf.tsx` | Absolute plan surface, top tab rail, toolbar, bottom hints | Plan canvas can lose priority to chrome |
| `VisualCaptureView.tsx` | Header/footer rails with safe-area padding and modal overlays | Capture controls need consistent action-zone ownership |

The technical problem is not only z-index. The deeper problem is ownership of top, bottom, modal, and canvas action zones.

### 5. Route-Local Styling Drift

Several route folders carry one-off form/input/card classes, especially legacy Project Hub pages. This makes broad visual changes risky because similar classes can mean different product roles.

Examples from the audit include Project Hub RFI, punch-list, photos, and budget files with local `field` constants, hardcoded focus blue, and local status color maps.

## Recommended No-Edit Audit Checks Before UI Slices

Before a broad UI slice, run read-only checks for:

1. Shell/header/nav imports and route wrappers.
2. App-store visible routes containing Coming Soon, demo, mock, placeholder, beta/test, or fake language.
3. Hardcoded hex/rgb/rgba and hardcoded Tailwind palette classes.
4. Fixed/absolute/bottom/z-index/safe-area usage in the target route.
5. Files over size limits before adding logic.
6. Whether new wrappers/providers are actually imported and used.

## Safe Implementation Order

1. No-edit inventory and screenshots for the target surface.
2. Define the single shell owner for that surface.
3. Remove or hide filler only where it is visible in V1 app-store-facing product surfaces.
4. Address one overlap/action-zone problem at a time.
5. Run typecheck/build and relevant guardrails.
6. Update the current context docs and project memory.

## Do Not Do From This Inventory Alone

- Do not run app-wide color replacement.
- Do not delete archived files or legacy routes.
- Do not change Site Walk plan/capture behavior.
- Do not expose hidden apps to make navigation look complete.
- Do not add placeholder cards to fill gaps.
- Do not solve overlap bugs by only increasing z-index.
