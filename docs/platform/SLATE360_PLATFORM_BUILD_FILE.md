# Slate360 Platform — Build File

Last Updated: 2026-04-14
Module Status: **Active — production infrastructure**
Doctrine Source: `docs/SLATE360_MASTER_BUILD_PLAN.md` (Section 0 — this file must align)

## Purpose

The platform is the Slate360 shell — the single unified product that users install, log into, and work inside. It provides authentication, the command center (dashboard), project management, navigation, billing integration, and shared UI primitives. All modules (Site Walk, Tours, etc.) live inside this shell.

For Phase 1 beta, only the command center + Projects + SlateDrop + Site Walk are exposed to testers.

## Phase 1 Doctrine Summary

- **Individual-first user model** — each user has one seat, independent by default
- **One app** — Slate360 is the single product; modules are features inside it
- **Beta-gated access** — no open signup; testers see only working surfaces
- **Project-centric data** — all records connect to projects, not orgs
- **Owner-approved design** — no UI design generation without owner signoff
- See `docs/SLATE360_MASTER_BUILD_PLAN.md` for full doctrine

## Current Real Implementation State

### What Works (Real)
- Auth flow: signup → email confirmation → org bootstrap → dashboard
- Supabase auth with 3 client types (browser, server, admin)
- Organization context resolution (lib/server/org-context.ts — 202 lines)
- API auth wrappers: withAuth(), withProjectAuth(), withAppAuth() (lib/server/api-auth.ts — 189 lines)
- Feature flags: resolveOrgEntitlements() reads 3 sources (tier, flags, app subscriptions)
- Middleware: auth redirect + route protection (middleware.ts — 139 lines)
- Rate limiting via Upstash Redis (lib/server/rate-limit.ts — 70 lines)
- Response helpers (lib/server/api-response.ts — 47 lines)
- Org bootstrap on first login (lib/server/org-bootstrap.ts — 167 lines)
- Dashboard with widget grid (10+ widget types)
- Project Hub with 14 sub-tab pages
- My Account with 5 tabs (profile, billing, security, notifications, data tracker)
- Marketing homepage with "TBD" pricing
- Walled garden dashboard (authenticated shell)
- PWA manifest and installability
- Sentry error tracking (client, server, edge configs)
- E2E tests with Playwright (4 spec files)

### What Is Partial or Needs Phase 1 Alignment
- Nav gating: sidebar/nav components show placeholder modules (Tours, DS, CS, Geo, Virtual) that must be hidden
- MobileNavSheet uses tier-based gates instead of standalone gates (inconsistent)
- WalledGardenDashboard does not pass entitlements to children
- Project Hub sub-pages (9 of 14 exceed 300-line limit — need extraction)

### What Is Missing for Phase 1 Beta
- **Beta access gate** — signup is open to anyone, no invite/code/flag mechanism
- **Bug reporting UI** — only feature suggestion widget exists
- **Individual-first UX** — org bootstrap creates "Bob's Organization" which confuses the individual-first model
- **Site Walk integrated in shell navigation** — Site Walk has a separate layout tree, not unified with the Slate360 shell
- Offline sync not wired to Site Walk capture

## Phase 1 User Experience (What Testers Will See)

### After Account Creation
1. User signs up on slate360.ai
2. User must pass beta gate (invite code, flag, or approval — TBD mechanism)
3. User confirms email
4. User lands on the Slate360 command center (dashboard)
5. Command center shows: project launcher, recent activity, module launchers (only Site Walk active)

### How They Reach the Command Center
- Login → /dashboard (command center)
- This is the app home. NOT a metrics dashboard. It's the hub for launching projects, modules, and work.

### How They Create Projects
- From command center or /project-hub
- Fill in: project name, location, scope, milestones, schedule, budget, drawings
- Project folder auto-created in SlateDrop
- Project appears in Site Walk project selector

### How They Use Site Walk (Web/Mobile/PWA)
- From command center, click Site Walk module
- Or install Slate360 as PWA on phone, log in, open Site Walk
- Select project → start session → capture photos/notes → review → create deliverable → share
- Same account, same project, same data on all surfaces

### Do They Download One App or Multiple?
- **ONE APP**: Slate360 (PWA install on phone/desktop)
- No separate Site Walk app. No separate auth.
- Site Walk is a module inside Slate360.

### Collaboration Across Independent Users
- Subscribers are independent by default (own account, own projects)
- To collaborate: subscriber invites another subscriber to a shared project
- Both subscribers see the project in their own command center
- Both can add Site Walk sessions, files, and records to the shared project
- Linking requires explicit invitation and acceptance — not automatic

### Collaborator Experience (Non-Subscriber)
- Collaborators are NOT subscribers — they are invited by a subscriber to specific projects
- Collaborator creates a lightweight Slate360 account (no subscription)
- Collaborator installs Slate360 PWA or uses web
- Collaborator sees ONLY the project(s) they were invited to — not the full command center
- Collaborator can: submit photos, respond to items, mark assignments complete, use voice/AI
- Collaborator cannot: create projects, access SlateDrop freely, manage billing, invite others
- Site Walk Standard: 0 collaborators (solo use)
- Site Walk Pro: up to 3 collaborators per subscriber
- Collaborator allowance is per subscriber, not per project
- Collaborator onboarding is a distinct path from subscriber onboarding (see master build plan Section 7)

### Operations Console Capabilities Required Before/During Beta
- /ceo route accessible only to slate360Ceo@gmail.com (route name may change later)
- Must show: beta user management (all users, grant/revoke access with optional expiry, signup dates, activity)
- Must show: all projects across all users
- Must show: collaborator invite visibility (who invited whom, to which projects)
- Must show: shared-project linking visibility (which subscribers share projects)
- Must show: bug reports and feature suggestions with severity and status
- Must show: in-app notification log and delivery status
- Must support: issue triage/status workflow (acknowledged/in-progress/resolved for bugs; planned/deferred for features)
- Current state: CeoCommandCenterClient.tsx is **legacy mock data** — must be rebuilt as Operations Console
- Do NOT treat old pricing tables in CeoCommandCenterClient as current truth
- Future: business/profit/churn/investor metrics, pricing controls, employee admin access

## Auth Routes

| Route | File | Purpose |
|-------|------|---------|
| /login | app/login/page.tsx | Login page |
| /signup | app/signup/page.tsx | Signup page (needs beta gate) |
| /forgot-password | app/forgot-password/page.tsx | Password reset |
| /auth/callback | app/auth/callback/route.ts | OAuth callback |
| /auth/confirm | app/auth/confirm/route.ts | Email confirmation |

## Server Utilities (11 files, 1380 lines)

| File | Lines | Purpose |
|------|-------|---------|
| lib/server/org-context.ts | 202 | Org context resolution |
| lib/server/api-auth.ts | 189 | Auth wrappers |
| lib/server/org-bootstrap.ts | 167 | First-login setup (creates "org" — needs rename to workspace) |
| middleware.ts | 139 | Route protection |
| lib/server/webhook-helpers.ts | 138 | Stripe webhook processing |
| lib/server/org-feature-flags.ts | 136 | Entitlements resolver |
| lib/server/quota-check.ts | 86 | Usage quota enforcement |
| lib/server/branding.ts | 84 | Org branding |
| lib/server/rate-limit.ts | 70 | Upstash rate limiting |
| lib/server/validate.ts | 65 | Request validation |
| lib/server/api-response.ts | 47 | Response helpers |

## Codebase Conflicts with Phase 1 Doctrine

| # | Severity | Issue | Action Needed |
|---|----------|-------|--------------|
| 1 | CRITICAL | No beta access gate | Add invite code / beta flag to signup + middleware |
| 2 | HIGH | Nav shows Tours/DS/CS/Geo/Virtual to testers | Remove from all 4 nav components |
| 3 | HIGH | MobileNavSheet uses tier gates, not standalone gates | Align with other nav components |
| 4 | HIGH | Site Walk has separate layout tree | Should feel part of Slate360, not a different app |
| 5 | HIGH | app-data.ts defines 6 standalone apps | Reframe for Phase 1: only Site Walk visible |
| 6 | MODERATE | Org bootstrap creates "Bob's Organization" | Rename to workspace or hide org language |
| 7 | MODERATE | No bug reporting form | Add before beta |
| 8 | HIGH | CeoCommandCenterClient.tsx is mock data + old pricing tables | Rebuild as Operations Console for Phase 1 |
| 9 | HIGH | No collaborator role in platform | Need: invite flow, scoped view, entitlement distinction |
| 10 | MODERATE | No subscriber-to-subscriber project linking | Need: project_members table, invite/accept workflow |
| 11 | MODERATE | No in-app notification system | Need: notification table, delivery mechanism, Operations Console inbox |
| 12 | MODERATE | No unified bug/feature reporting flow | Need: report form with type, module, attachments, voice-to-text |

## Known Monolith Files (Exceed 300-line limit)

| File | Lines | Priority |
|------|-------|----------|
| project-hub/[projectId]/management/page.tsx | 931 | P2 — extract before beta |
| project-hub/[projectId]/photos/page.tsx | 599 | P2 |
| project-hub/[projectId]/submittals/page.tsx | 579 | P2 |
| project-hub/[projectId]/schedule/page.tsx | 465 | P2 |
| project-hub/[projectId]/drawings/page.tsx | 448 | P2 |
| project-hub/[projectId]/budget/page.tsx | 421 | P2 |
| project-hub/[projectId]/punch-list/page.tsx | 403 | P2 |
| project-hub/[projectId]/daily-logs/page.tsx | 358 | P2 |
| project-hub/[projectId]/rfis/page.tsx | 339 | P2 |

## What Must Be Implemented Before Design Generation

1. Beta access gate mechanism (owner decides: invite code, flag, or approval)
2. Hide placeholder modules from all navigation
3. Fix MobileNavSheet gate inconsistency
4. Wire Site Walk uploads to SlateDrop project folders
5. Add bug reporting form
6. Rename org language to workspace language in UI
7. Rebuild Operations Console (replace CeoCommandCenterClient mock data with real queries for users, projects, bugs, collaborators)

Only AFTER these are done should v0/design generation begin for:
- Command center layout (owner approval required)
- Mobile navigation (owner approval required)
- Site Walk capture UX (owner approval required)
- Collaborator invite/accept UX (owner approval required)
- Collaborator scoped project view (owner approval required)

## Verification Checklist

- [ ] Auth flow works: signup → confirm → login → dashboard
- [ ] Beta gate blocks unauthorized signups
- [ ] Dashboard loads with widgets for authenticated users
- [ ] Navigation shows ONLY Phase 1 modules (no Tours/DS/CS/Geo/Virtual)
- [ ] Project creation triggers SlateDrop folder provisioning
- [ ] Site Walk accessible from command center
- [ ] PWA installable on mobile
- [ ] Operations Console shows real user/project/bug data (not mock)
- [ ] In-app notification infrastructure exists
- [ ] Unified bug/feature report form accessible from any page
- [ ] No console errors on any platform page
