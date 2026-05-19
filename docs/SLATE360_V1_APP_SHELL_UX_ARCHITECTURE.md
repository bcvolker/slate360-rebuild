# Slate360 V1 App Shell UX Architecture

Date: 2026-05-13
Status: Planning bridge — do not implement until an approved slice
Depends on:

- `docs/SLATE360_PRODUCT_DOCTRINE.md`
- `docs/APP_STORE_AND_OFFLINE_STRATEGY.md`
- `docs/ENTITLEMENTS_AND_PROJECT_MODEL.md`
- `docs/SLATEDROP_ARCHITECTURE.md`
- `docs/site-walk/SITE_WALK_V1_MOBILE_UX_DECISION_RECORD.md`
- `docs/site-walk/SITE_WALK_V1_UI_IMPLEMENTATION_PLAN.md`
- `docs/design/SLATE360_V1_DESIGN_TOKEN_PLAN.md`

## Purpose

The Site Walk V1 mobile UX docs define the field-work pattern. This document bridges that pattern back into the overall Slate360 app shell so the V1 Foundational Release feels like one native product rather than a collection of unrelated web pages.

This is not an implementation prompt. It is the product and layout contract for future slices.

## Current shell reality

Slate360 already has most of the structural pieces needed for a unified app shell:

- `components/dashboard/AppShell.tsx` is the authenticated shell wrapper and owns the main viewport contract.
- `components/dashboard/command-center/DashboardSidebar.tsx` owns desktop navigation.
- `components/dashboard/command-center/DashboardTopBar.tsx` owns the desktop top bar.
- `components/shared/MobileTopBar.tsx` owns the mobile authenticated header.
- `components/shared/MobileBottomNav.tsx` owns mobile bottom navigation.
- `lib/app-store-mode.ts` provides the App Store visibility filter.
- Site Walk capture routes already need a full-bleed task mode that temporarily takes over the viewport.

The missing bridge is a shared UX hierarchy: when a user is in the platform shell, they should see platform navigation; when they enter a task like capture or plan walk, that task gets the full viewport and hides global chrome.

## 1. Product role of the app shell

The Slate360 shell is the global command center for the user and organization. It owns cross-app orientation, not individual app task controls.

The shell owns:

- Home command center
- Projects / Field Projects
- SlateDrop
- Coordination
- Account / organization / settings entry
- App access visibility
- Workspace and organization context
- Notifications, feedback, support, and profile actions
- Read-only or limited role framing

The shell must not own:

- Site Walk plan-room controls
- Capture buttons
- Markup tools
- Walk-specific stop navigation
- Deliverable-builder internals
- Future app UI that is not ready for V1

Rule: platform shell navigation can deep-link into Site Walk, but it must not duplicate Site Walk's task chrome.

## 2. Slate360 Home as command center

The Home tab should become a compact, data-driven command center.

Primary jobs:

- Continue the most recent unfinished work across entitled apps.
- Start the next allowed action based on entitlements and role.
- Surface assigned work, pending approvals, unsynced work, recent files, and recent deliverables.
- Provide a clean route to Site Walk without making the whole shell Site Walk-biased.

V1 command-center rules:

- No marketing hero blocks inside authenticated surfaces.
- No fake metrics.
- No dead CTAs.
- No future app tiles.
- No Coming Soon, beta, demo, test, waitlist, or placeholder language.
- Empty states must be functional: create a Field Project, open SlateDrop, view assigned work, contact admin, or continue an existing item.

Entitlement examples:

| User context | Home emphasis |
|---|---|
| Site Walk foundational user | Continue Walk, New Walk, Field Projects, Recent Deliverables, SlateDrop |
| Executive viewer | Org activity, Field Projects, open items, deliverables, read-only filters |
| Project collaborator | Assigned Work, My Walks, Messages, Submit update |
| Pending user | No shell; pending verification screen only |
| App reviewer | Seeded Field Project, sample Walk, deliverable route, no blocked shell |

## 3. Platform bottom navigation

The platform mobile bottom nav is locked for normal shell pages:

`Home | Projects | SlateDrop | Coordination | Account`

Rules:

- Use this nav on standard authenticated mobile shell pages.
- Do not add future apps to this nav in V1.
- Do not replace `Account` with a generic `More` label for the V1 app-store-facing shell.
- Do not expose unfinished apps through the nav, command palette, app grid, or direct visible cards.
- Desktop uses the sidebar pattern instead of bottom nav.

Site Walk may have a module-level nav for non-task pages, but the module nav must not duplicate platform nav. Active capture and active plan tasks should hide platform bottom nav and own the viewport.

## 4. Header taxonomy

Slate360 needs four header categories.

### Global shell header

Used by normal platform pages: Home, Projects, SlateDrop, Coordination, Account, settings, and management surfaces.

Responsibilities:

- workspace / organization context
- profile entry
- feedback/support entry
- notifications/search/share where relevant
- desktop sidebar toggle
- mobile safe-area top spacing

It must not show walk-specific copy or plan tools.

### Site Walk module header

Used by Site Walk non-task pages such as Site Walk Home, Walks, Plans, Deliverables, and More.

Responsibilities:

- module identity
- route to active walk or setup when appropriate
- module-level status summaries
- compact access to Site Walk areas

It must not crowd the page with duplicate platform navigation.

### Capture task header

Used inside Quick Walk and Plan Walk active capture.

Responsibilities:

- `Back to Plan` when plan-linked
- stop context: `Stop N · From Plan` or `Stop N · Plan Location`
- sync/save status
- More menu
- secondary/destructive Exit Walk

It replaces global chrome during the task. It must never put Exit Walk where Back to Plan belongs.

### Public/auth header

Used by public marketing, login, signup, and pending verification surfaces.

Responsibilities:

- public brand orientation
- auth actions
- support/contact links

It must not expose app shell nav to pending or unauthenticated users.

## 5. App Store visibility rules

V1 is a Foundational Release. It is not a public multi-app launch.

Visible V1 surfaces:

- Slate360 Core shell
- Projects / Field Projects
- SlateDrop
- Coordination
- Account and organization settings needed for V1
- Site Walk
- Pending Foundational Verification
- Operations Console for authorized admins only
- Executive Viewer read-only oversight

Hidden in V1 app-store-facing authenticated surfaces:

- 360 Tours UI
- Design Studio UI
- Content Studio UI
- unfinished Project Hub tools
- disabled future app tiles
- Coming Soon cards
- public subscription/checkout flows
- beta/test/demo wording

Direct-route risk remains if compiled pages exist. App Store mode and entitlement gates must be audited before submission so unfinished routes are unreachable from reviewer-visible navigation and, where appropriate, redirect to safe shell destinations.

## 6. Organization, leadership, and collaborator awareness

The shell must communicate access context without creating separate products.

### Personal / default workspace

- Shows user-owned or assigned work.
- Does not imply organization-wide visibility.
- Can create Field Projects only if the user is allowed.

### Organization workspace

- Shows organization-level projects, SlateDrop, coordination, and activity based on role.
- Organization branding is platform infrastructure, not a per-app setting.

### Executive viewer

- Full shell, read-only posture.
- Org-wide Site Walk and Field Project oversight.
- No edit/capture affordances unless separately entitled.
- Clear read-only badges and disabled edit actions should be replaced by hidden actions where possible.

### Enterprise admin / owner

- Full shell plus org management, approvals, access, and operations routes.
- Admin-only actions are gated server-side and not merely hidden in the client.

### Project collaborator

- Scoped shell or collaborator shell.
- Assigned work, limited capture/submission, messages, account.
- No billing, app launcher, global org analytics, or unrelated projects.

### Cross-organization collaboration

- Shell must show which workspace/project is active.
- Shared-with-me and project-scoped access should not look like full org ownership.

## 7. Portrait, landscape, and desktop rules

### Mobile portrait

- Normal shell pages: fixed top header, fixed bottom nav, contained content scroll.
- Task pages: full-bleed `100dvh` task shell; no global bottom nav; safe-area-aware controls.
- Lists must scroll in contained panels above the bottom nav.
- No page content should bleed under fixed nav without intentional bottom padding.

### Mobile landscape

- Preserve task context and primary controls.
- Prefer side drawers/inspectors for plan tools when space allows.
- Do not let bottom drawers consume most of the viewport.
- Plan/photo/capture canvas remains primary.

### Desktop

- Sidebar replaces mobile bottom nav.
- Desktop top bar remains global shell chrome.
- Task modes can still use focused workspaces, but must provide a clear route back to shell/module context.
- Avoid mobile-only bottom sheet assumptions on desktop.

## 8. Relationship to Site Walk docs

The Site Walk docs are the pattern source for active field tasks, not a reason to make every page Site Walk-specific.

Apply Site Walk principles platform-wide like this:

| Site Walk principle | Shell translation |
|---|---|
| Command center | Home is actionable and data-driven, not marketing copy |
| Task header | Any focused workflow gets a task header and hides irrelevant chrome |
| Bottom tools drawer | Tools live in predictable compact drawers, not floating dog-piles |
| Maximize plan/camera canvas | Workspace content gets priority over persistent chrome |
| State-specific save copy | Buttons say what will happen next |
| Details/Attachments/Markup sheet | Related secondary data stays in one structured place |
| Explicit pin movement | Destructive or trust-sensitive actions require deliberate modes |
| Token foundation | Visual language comes from tokens, not ad hoc hardcoded colors |

## 9. External UI-forensic findings to preserve

The next implementation prompts must account for these issues:

1. Plan Viewer vs Plan Toolbar DOM flow conflict: plan canvas and controls must not fight for layout ownership.
2. Capture bottom rail/FAB dog-pile: active capture must reserve one coherent action zone.
3. Async-gated/hiding toolbar issue: task controls should not disappear solely because server data has not arrived yet.
4. Viewport bleed in Site Walk hub: shell pages need explicit height and contained scroll contracts.
5. No unified design-token source of truth: future visual work must start from tokens and an audit, not broad class replacement.

## 10. Recommended implementation order

Do not implement this whole document at once.

1. Keep the already planned Site Walk Slice 1: Site Walk Home command center cleanup.
2. Before broad shell edits, run a read-only shell visibility audit against App Store mode, command palette, app grid, mobile nav, and direct routes.
3. Implement Site Walk task-shell slices before changing global nav visuals.
4. Pilot `--s360-*` tokens in Site Walk capture/plan only.
5. After the pilot is stable, migrate platform shell surfaces in a separate slice.
6. Only then inspect public/auth surfaces for visual alignment.

## Open decisions

- Whether V1 native distribution uses public-gated App Store listing, Apple School Manager Custom App, or unlisted app path.
- Exact Executive Viewer dashboard composition.
- Whether collaborators use a fully separate `CollaboratorShell` or a restricted platform shell variant for V1.
- Whether `Account` remains routed through `/more` internally while the nav label becomes Account.
