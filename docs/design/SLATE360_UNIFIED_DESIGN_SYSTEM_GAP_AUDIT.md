# Slate360 Unified Design System Gap Audit

Date: 2026-05-13
Status: Planning audit — no implementation in this file
Depends on:

- `docs/design/SLATE360_V1_DESIGN_TOKEN_PLAN.md`
- `docs/SLATE360_V1_APP_SHELL_UX_ARCHITECTURE.md`
- `docs/site-walk/SITE_WALK_V1_MOBILE_UX_DECISION_RECORD.md`
- `docs/site-walk/SITE_WALK_V1_UI_IMPLEMENTATION_PLAN.md`

## Purpose

Slate360's UI has been improved in focused rescue passes, but it still lacks one enforceable design-system source of truth. This audit documents the current fragmentation and defines the safe path toward a unified V1 visual system.

This is not a repaint prompt. Do not change product behavior or globally replace classes based on this file alone.

## Executive finding

The product direction should not be described as harsh black/orange or overly aggressive Dark Glass & Amber. The V1 direction is:

**Graphite Glass + restrained amber + muted teal**

Meaning:

- premium graphite/slate base
- glass-like depth, but not so dark that workspaces feel crushed
- restrained amber/gold for primary action and high-emphasis affordances
- muted teal/smoke for secondary action, selection, and system accents
- warm off-white text
- neutral plan/photo workspaces that prioritize evidence readability
- future field high-contrast mode for bright outdoor use

## 1. Five conflicting UI systems

### 1. Legacy marketing web system

Likely sources:

- public homepage and extracted home components
- `components/marketing-homepage.tsx` historical monolith
- public navbar/footer/auth-adjacent surfaces

Symptoms:

- marketing hero language and decorative layout patterns leak into app thinking
- broader gradients, high-copy sections, public CTAs
- not suitable for authenticated command-center pages

Rule: public marketing may be polished later, but authenticated shell pages must not use marketing-page structure.

### 2. Early authenticated dashboard / widget system

Likely sources:

- dashboard command center components
- legacy widget bodies and dashboard cards
- project hub remnants

Symptoms:

- dense card stacks
- old metrics and widgets that look decorative rather than actionable
- route-specific styles repeated instead of shared shell patterns

Rule: dashboard widgets must become real command-center cards or be removed/hidden for V1.

### 3. Dark Glass rescue styling

Likely sources:

- `components/dashboard/AppShell.tsx`
- `components/shared/GlassCard.tsx`
- `components/shared/MobileBottomNav.tsx`
- Site Walk and SlateDrop rescue passes

Symptoms:

- visual improvement over white-card drift
- too much reliance on hardcoded black, white alpha borders, amber classes, and backdrop blur
- inconsistent depth and spacing across modules

Rule: keep the successful native-app direction, but replace ad hoc colors with `--s360-*` tokens in approved slices.

### 4. Field task / Site Walk capture system

Likely sources:

- `components/site-walk/capture/*`
- capture bottom sheet, plan viewer, plan toolbar, vector toolbar, action menus

Symptoms:

- overlapping toolbars, bottom rails, modals, and FABs competing for the same safe-area space
- plan/photo canvas sometimes loses priority to chrome
- async-dependent controls can disappear while task state is still valid

Rule: task workspaces need a dedicated task-shell pattern, not ordinary page chrome.

### 5. Utility-class drift / AI-generated fragments

Likely sources:

- hardcoded Tailwind palette classes across `app/` and `components/`
- arbitrary hex values
- repeated safe-area and z-index values
- one-off gradients, shadows, and blur settings

Symptoms:

- components look individually plausible but not like one product
- future agents may continue vibe-coding new variants
- global search-and-replace would be dangerous because identical colors serve different roles

Rule: add audit scripts and token contracts before changing visuals.

## 2. Current likely style sources

Audit these sources first when implementation is approved:

### Core shell

- `app/globals.css`
- `components/dashboard/AppShell.tsx`
- `components/dashboard/command-center/DashboardSidebar.tsx`
- `components/dashboard/command-center/DashboardTopBar.tsx`
- `components/shared/MobileTopBar.tsx`
- `components/shared/MobileBottomNav.tsx`
- `components/shared/GlassCard.tsx`

### Site Walk

- `app/site-walk/page.tsx`
- `components/site-walk/SiteWalkShell.tsx`
- `app/site-walk/_components/SiteWalkHub.tsx`
- `app/site-walk/(act-2-inputs)/capture/_components/CaptureClientIsland.tsx`
- `components/site-walk/capture/VisualCaptureView.tsx`
- `components/site-walk/capture/CameraViewfinder.tsx`
- `components/site-walk/capture/CaptureDataBottomSheet.tsx`
- `components/site-walk/capture/PlanViewer.tsx`
- `components/site-walk/capture/PlanViewerLeaflet.tsx`
- `components/site-walk/capture/PlanToolbar.tsx`
- `components/site-walk/capture/PlanQuickActionMenu.tsx`
- `components/site-walk/capture/UnifiedVectorToolbar.tsx`

### SlateDrop and platform workspaces

- `app/slatedrop/page.tsx`
- `app/slatedrop/[...section]/page.tsx`
- `components/slatedrop/*`
- projects and coordination shell pages

### Public/auth surfaces

- `app/login/page.tsx`
- `app/signup/page.tsx`
- `app/pending-verification/page.tsx`
- `components/Navbar.tsx`
- `components/Footer.tsx`
- current homepage components

Public/auth surfaces should be audited after Site Walk capture/plan and authenticated shell token pilots, not before.

## 3. Why global changes fail

Broad UI rewrites fail in this repo because the same visual primitive currently means different things in different contexts.

Examples:

- Black backgrounds may mean app shell depth, photo canvas framing, modal scrim, or field high-contrast mode.
- Amber may mean primary action, warning, selected pin, navigation active state, or marketing accent.
- Bottom fixed elements may be platform nav, module nav, task action rail, capture sheet, plan toolbar, or modal action footer.
- `z-index` values have accumulated around plan action sheets, modals, mobile nav, and capture tools.
- Some toolbar visibility is tied to data readiness, which creates false layout fixes if only CSS is changed.

Therefore:

- Do not run app-wide color replacement.
- Do not migrate public/auth/shell/Site Walk all at once.
- Do not replace component behavior while doing token work unless the approved slice explicitly includes it.
- Do not hide overlap bugs under higher `z-index` values without solving ownership of the action zone.

## 4. Desired V1 design system

The V1 design system should be expressed through CSS variables first, then consumed by components.

Base direction is defined in `docs/design/SLATE360_V1_DESIGN_TOKEN_PLAN.md`:

- `--s360-bg`
- `--s360-bg-soft`
- `--s360-surface`
- `--s360-surface-raised`
- `--s360-card`
- `--s360-card-muted`
- `--s360-border`
- `--s360-border-soft`
- `--s360-text`
- `--s360-text-muted`
- `--s360-text-subtle`
- `--s360-accent`
- `--s360-accent-soft`
- `--s360-accent-strong`
- `--s360-secondary`
- `--s360-secondary-soft`
- `--s360-success`
- `--s360-warning`
- `--s360-danger`
- `--s360-plan-canvas`
- `--s360-photo-canvas`

Additional token categories likely needed after the first pilot:

| Category | Examples | Why |
|---|---|---|
| Safe areas | `--s360-safe-bottom`, `--s360-shell-top`, `--s360-mobile-nav-height` | Avoid repeated hardcoded nav padding |
| Z layers | `--s360-z-nav`, `--s360-z-task-sheet`, `--s360-z-modal`, `--s360-z-critical` | Stop z-index escalation |
| Radius | `--s360-radius-card`, `--s360-radius-sheet`, `--s360-radius-control` | Unify card/sheet/control shape |
| Elevation | `--s360-shadow-soft`, `--s360-shadow-raised`, `--s360-blur-panel` | Standardize glass depth |
| Task surfaces | `--s360-task-header`, `--s360-task-rail`, `--s360-task-drawer` | Separate task chrome from shell chrome |
| Field contrast | `--s360-field-bg`, `--s360-field-text`, `--s360-field-accent` | Future outdoor mode |

## 5. Codex CLI role

Codex should be used as a read-only reviewer or scoped implementation assistant, not as an unbounded restyling engine.

Recommended Codex tasks:

1. Run a no-edit hardcoded color inventory.
2. Identify duplicate shell/header/nav patterns.
3. Review one proposed token-migration diff for invisible text or broken contrast.
4. Inspect whether a new wrapper/provider is imported and used.
5. Review App Store visible-surface terms and route exposure.

Codex should not:

- broadly rewrite classes across the repository
- invent new tokens outside the approved list
- change backend, Trigger, Supabase, billing, or migrations during visual audits
- introduce placeholder content to make surfaces look complete
- replace working Site Walk capture behavior while doing visual cleanup

## 6. Recommended guardrail scripts

Add these only in approved implementation slices.

### Hardcoded color audit

Read-only report of:

- hex colors: `#[0-9A-Fa-f]{3,8}`
- `rgb()` and `rgba()` literals
- hardcoded Tailwind palette classes such as `bg-black`, `bg-slate-*`, `bg-zinc-*`, `text-orange-*`, `text-amber-*`, `border-white/*`
- inline `style={{ color: ... }}` or background color values

Output:

- counts by file
- top repeated classes
- route/module groupings
- no file modifications

### App Store visible-surface audit

Read-only report for user-facing strings in `app/` and `components/`:

- beta
- test
- demo
- coming soon
- waitlist
- unfinished
- placeholder
- lorem
- fake

Output should distinguish docs/tests/dev-only files from authenticated app surfaces.

### Shell route exposure audit

Read-only report of:

- nav items
- command palette entries
- app grid entries
- direct visible links to hidden apps
- App Store mode filtering points
- routes with public/authenticated access risk

### Layout ownership audit

Read-only report of fixed/sticky/absolute elements in task surfaces:

- bottom nav
- bottom sheets
- FABs
- modals
- action rails
- plan toolbars
- z-index values

Purpose: identify dog-piles before changing CSS.

## 7. First safe implementation slice

The first design-system implementation should not start with the whole shell.

Recommended order:

1. Add read-only hardcoded color audit script.
2. Add `--s360-*` tokens to `app/globals.css` without changing component behavior.
3. Migrate Site Walk capture/plan surfaces only.
4. Run mobile Plan Walk and Quick Walk smoke tests.
5. Document before/after audit counts.
6. Only then migrate Site Walk Home and platform shell in separate slices.

## 8. Acceptance criteria for design-system work

- The source of truth is documented and tokenized.
- Site Walk capture and plan remain functionally unchanged during token migration.
- Plan and photo workspaces become easier to read on phones.
- No broad public/auth/homepage repaint occurs in the first slice.
- App Store-facing authenticated surfaces do not expose future app placeholders.
- `npm run typecheck` passes.
- `npm run build` passes.
- Audit scripts produce readable reports without editing files.

## 9. Open gaps

- There is no enforced token lint rule yet.
- Safe-area, z-index, radius, and elevation tokens are not yet implemented.
- Shell/account/public surfaces still need a later audit after Site Walk pilot.
- App Store direct-route visibility needs a separate no-edit audit.
- Physical-device contrast and layout verification remains mandatory.
