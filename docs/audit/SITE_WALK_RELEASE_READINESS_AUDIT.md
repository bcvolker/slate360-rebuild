# Site Walk Release Readiness Audit

Last Updated: 2026-05-14
Status: Read-only audit. No code changes.

## Purpose

Truthful readiness matrix for foundational app-store submission, foundational user testing, and monetized Site Walk V1.

## Functional Readiness Matrix

| Feature | Backend | Frontend | Mobile | Desktop | Blocker | Foundational Release? |
|---|---|---|---|---|---|---|
| Auth / signup / login | Production | Production | Works | Works | — | Yes |
| Email confirmation | Production | Production | Works | Works | — | Yes |
| User approval / access gating | Production | Production (ops console) | Works | Works | — | Yes |
| Operations console approval | Production | Functional (access queue + feedback) | Works | Works | Stubs for users/revenue/health/systems | Partial |
| Entitlements (legacy tiers) | Production | Production | Works | Works | — | Yes |
| Entitlements (modular per-app) | Production | Wired via resolveOrgEntitlements | Works | Works | — | Yes |
| Beta mode (all access unlocked) | Production | Production | Works | Works | Must be disabled for monetized launch | Yes (for testing) |
| Worksite creation | Production (projects.project_type=field) | Production (create project) | Works | Works | — | Yes |
| Project creation (full PM) | Production (business+ gated) | Production | Works | Works | — | Yes |
| Worksites vs Projects label | Backend ready (project_type) | V1 preview has useProjectLabel prop | Not wired to entitlements yet | Same | Needs wiring | Partial |
| SlateDrop project folders | Production (17 auto-folders) | Production (SlateDrop pages) | Works | Works | — | Yes |
| File upload / download | Production (presigned S3/R2) | Production | Works | Works | — | Yes |
| Shared drops / file requests | Production | Production | Works | Works | — | Yes |
| Plan PDF upload | Production | Production (PlanUploaderCard) | Works | Works | — | Yes |
| Trigger rasterization | Production | Triggers on upload | Works | Works | DO NOT TOUCH | Yes |
| Plan sheet display | Production | Production (PlanViewerLeaflet) | Works | Works | — | Yes |
| Plan pan / zoom | Production | Production | Works | Works | — | Yes |
| Plan sheet navigation | Production (data model) | **Not built** — no sheet picker UI | N/A | N/A | No UI | No |
| Plan search | Not built | Not built | N/A | N/A | Not built | No |
| Plan layers / toggles | Not built | Not built | N/A | N/A | Not built | No |
| Plan pin creation (draft) | Production | Production (long press) | Works | Works | — | Yes |
| Saved pin open | Production | Production | Works | Works | — | Yes |
| Saved pin move | **Not built** | **Not built** | N/A | N/A | Not built | No |
| Saved pin delete | **Not built** | **Not built** | N/A | N/A | Not built | No |
| Quick Capture | Production | Production | Works | Works | — | Yes |
| Plan-linked capture | Production | Production | Works | Works | — | Yes |
| Details / notes / category / status / assignee | Production | Production (bottom sheet) | Works | Works | — | Yes |
| Attachments | Production | Production (tab) | Works | Works | — | Yes |
| Markup | Production | Production (tab) | Works | Works | — | Yes |
| Metadata: timestamp / GPS / weather / device | Production | Production (auto-captured) | Works | Works | — | Yes |
| Offline queue | Partial (IndexedDB + sync) | Partial (wired to Site Walk) | Untested | N/A | SW in kill-switch mode | Partial |
| Real-time collaboration | Production (Supabase Realtime on items/pins/comments/sheets) | Subscriptions exist | Untested | Untested | Needs testing | Partial |
| Collaborator invites | Production | Production (per-project) | Works | Works | — | Yes |
| Org member management | Production | Production (invite) | Works | Works | — | Yes |
| Cross-org sharing | **Not built** | **Not built** | N/A | N/A | Not built | No |
| Coordination page | Production (APIs for assignments/comments/inbox/board) | **Not built** — no dedicated page | N/A | N/A | No frontend page | No |
| Notifications (in-app) | Partial (project_notifications table) | Bell icon UI exists, no backend notifications table | Limited | Limited | No general notification system | Partial |
| Push notifications | **Not built** | UI toggle only | N/A | N/A | Not built | No |
| Bug report / feature suggestion | Production (beta_feedback, feature_suggestions) | Production (feedback form + ops inbox) | Works | Works | — | Yes |
| Deliverables CRUD | Production (22 types, 9 output modes) | List page exists | Works | Works | — | Yes |
| Deliverable creation from walk | Production (API) | Redirect stub — no dedicated creation form | Partial | Partial | No creation UI | Partial |
| Hosted share link | Production | Production | Works | Works | — | Yes |
| PDF export | Production (jsPDF) | Production | Works | Works | Images are placeholder only | Partial |
| Email / text share | Production (3 modes) | Production | Works | Works | — | Yes |
| Interactive deliverable viewer | Config stored, no renderer | **Not built** | N/A | N/A | Not built | No |
| Public viewer permissions | Production (token-gated) | Production | Works | Works | — | Yes |
| Viewer comments | Production | Production | Works | Works | — | Yes |
| Account deletion | Production | Production | Works | Works | App Store compliant | Yes |
| Privacy policy | Production | `/privacy` route | Works | Works | — | Yes |
| Terms of service | Production | `/terms` route | Works | Works | — | Yes |
| Support / help | Not built | **Not built** — no in-app route | N/A | N/A | No route | No |
| App Store mode / hidden apps | Production | Production (all nav filtered) | Works | Works | 2 minor "Coming Soon" leaks | Yes |
| Responsive portrait | — | Production | Works | N/A | — | Yes |
| Responsive landscape | — | **Not built** | Not built | N/A | No landscape CSS | No |
| Tablet | — | Implicit (lg: breakpoint) | Implicit | N/A | No tablet-specific | Partial |
| Desktop | — | Production (sidebar + topbar) | N/A | Works | — | Yes |

## Summary Counts

| Status | Count |
|---|---|
| Ready (Yes) | 34 |
| Partial | 10 |
| Not ready (No) | 12 |

## Top Blockers for Foundational App Store Submission

1. **No native wrapper** — Capacitor or TWA needed for iOS App Store and Google Play
2. **No splash screens or apple-touch-icon** — required for iOS
3. **No in-app support/help route** — App Store reviewers expect this
4. **Saved pin move/delete not implemented** — core plan workflow gap
5. **Plan sheet navigation UI not built** — multi-sheet plans unusable
6. **Coordination page not built** — backend ready, no frontend
7. **Deliverable creation UI is a redirect stub** — no real creation form
8. **No landscape layouts** — phone landscape is broken-looking
9. **V1 preview not wired to production routes yet** — old UI still serves
10. **"Coming Soon" text in 2 authenticated surfaces** — minor cleanup

## Top Blockers for Monetized V1

All foundational blockers plus:
1. **Beta mode must be disabled** — currently all entitlements are unlocked
2. **Stripe checkout must be tested end-to-end** with real pricing
3. **Collaborator limits must be enforced in UI** (backend enforces, UI doesn't show limits)
4. **Interactive deliverable viewers not built** — key value proposition
5. **Offline capture needs physical device testing** — IndexedDB queue untested on real phones
6. **Real-time collaboration needs testing** — Supabase Realtime subscriptions untested
7. **No notification system** — users won't know when assignments/comments happen
8. **PDF export has placeholder images** — not production quality
9. **Three billing models need consolidation** — confusing if all exposed
10. **Ops console stubs need filling** — revenue, users, health, systems sections
