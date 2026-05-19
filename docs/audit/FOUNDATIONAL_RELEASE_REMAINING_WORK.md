# Foundational Release Remaining Work

Last Updated: 2026-05-14
Status: Read-only audit. No code changes.

## What Is Already Done

| Area | Status | Notes |
|---|---|---|
| Auth/signup/login/approval | Done | Full flow including Turnstile, email confirm, pending-verification, ops console approval |
| Entitlement system | Done | 3 models coexist, resolveOrgEntitlements merges, beta mode unlocks all |
| Project/worksite CRUD | Done | Field projects (all tiers) + full projects (business+) |
| SlateDrop file backbone | Done | 17 auto-folders, upload/download, share, requests, soft delete |
| Site Walk sessions CRUD | Done | Create, list, update, delete, sign |
| Capture (quick + plan-linked) | Done | Camera, markup, notes, categories, status, assignee, metadata |
| Plan upload + rasterization | Done | PDF upload → Trigger rasterizes → sheets appear |
| Plan display + pan/zoom | Done | Leaflet-based viewer |
| Pin creation (draft via long press) | Done | |
| Saved pin open | Done | |
| Deliverable CRUD + share + export + email | Done | 22 types, 9 output modes, PDF, hosted links |
| Coordination routes | Done | /coordination/inbox, /coordination/contacts, /coordination/calendar |
| Contacts manager | Done | CRUD with project links |
| Assignments CRUD | Done | Field-to-office assignments |
| Comments (threaded) | Done | Session/item-scoped |
| Calendar | Done | Per-org events |
| Collaborator invites | Done | Per-project with seat limits |
| Operations console (approval + feedback) | Done | Owner-only access queue + feedback inbox |
| Bug report + feature suggestion | Done | beta_feedback + feature_suggestions tables + forms |
| Account deletion | Done | App Store compliant |
| Privacy + terms | Done | Full legal documents |
| Error handling + Sentry | Done | Global error boundary, PII scrubbing |
| Billing/Stripe integration | Done | Checkout, portal, webhook, credit packs |
| App-store mode filtering | Done | Hides comingSoon items from all nav |
| V1 preview components | Done | 11 components + preview route with 5-tab nav |

## What Needs UI Migration Only (Backend Ready)

| Area | Effort | Prompts |
|---|---|---|
| Home: swap SiteWalkHub → V1Shell + real data | Medium | 1–2 |
| Worksites: swap walks page → V1 rows + real data | Medium | 1–2 |
| SlateDrop tab: link to /slatedrop or embed | Low | 1 |
| Coordination tab: link to /coordination or embed | Low | 1 |
| Deliverables tab: swap list page → V1 layout | Medium | 1–2 |
| Plan workspace: wrap PlanViewerLeaflet in V1 chrome | Medium | 1–2 |
| Capture workspace: replace header chrome, keep internals | Medium | 1 |
| Reports → Deliverables rename | Low | 1 |
| More page removal | Low | 1 |

**Subtotal: ~8–12 prompts**

## What Needs Backend Wiring (Feature Exists in API)

| Area | Effort | Prompts |
|---|---|---|
| V1 preview → real loadHubData() | Low | 1 |
| Worksite row → real project data | Low | 1 |
| Deliverable creation form → POST /api/site-walk/deliverables | Medium | 1–2 |
| Needs Review tab → /api/site-walk/inbox | Low | 1 |
| Shared tab → listCollaboratorProjects() | Low | 1 |
| Notification bell → real notification source | Medium | 1 |
| Avatar menu → real user data | Low | 1 |
| useProjectLabel → canCreateFullProject() | Low | 1 |

**Subtotal: ~7–9 prompts**

## What Is Missing Entirely

| Area | Effort | Prompts | Required for V1? |
|---|---|---|---|
| Plan sheet navigation UI | Medium | 1–2 | Yes |
| Saved pin move | Medium | 1–2 | Yes |
| Saved pin delete | Low | 1 | Yes |
| In-app support/help page | Low | 1 | Yes |
| Deliverable creation form | Medium | 1–2 | Yes |
| Landscape layouts | Medium | 1–2 | Recommended |
| Native wrapper (Capacitor) | High | 2–3 | Required for App Store |
| Splash screens | Low | 1 | Required for App Store |
| apple-touch-icon | Low | 0.5 | Required for iOS |
| Push notifications | High | 3–5 | Post-launch |
| Interactive deliverable viewers | High | 5–10 | Post-launch |
| Notification backend table | Medium | 2–3 | Post-launch |
| Cross-org sharing | Medium | 2–3 | Post-launch |
| Block editor wiring | High | 3–5 | Post-launch |

**Subtotal (V1 required): ~8–12 prompts**
**Subtotal (post-launch): ~15–26 prompts**

## What Is Required for App Store Foundational Release

1. V1 shell serving all production Site Walk routes (UI migration steps 1–8)
2. Plan sheet navigation UI
3. Saved pin move + delete
4. Deliverable creation form
5. In-app support/help page
6. "Coming Soon" cleanup (2 instances)
7. /virtual-studio and /geospatial route blocking
8. Native wrapper (Capacitor)
9. App icons (all sizes from existing 512)
10. Splash screens
11. apple-touch-icon
12. Permission descriptions (Info.plist + AndroidManifest)
13. Store listing (human task)
14. Reviewer account setup

## What Can Wait Until Monetized V1

- Interactive deliverable viewers
- Block editor
- Push notifications
- Notification backend
- Plan search/layers
- Before/after ghost alignment
- Cross-org sharing
- Org entitlement granting UI
- Full PM tools (project-hub)
- Analytics
- Revenue ops console
- Landscape-specific layouts (usable, not optimized)

## Rough Prompt Count by Area

| Area | Prompts |
|---|---|
| UI migration (steps 1–8) | 8–12 |
| Backend wiring | 7–9 |
| Missing features (V1 required) | 8–12 |
| Native wrapper + store prep | 3–5 |
| Testing + bug fixes | 3–5 |
| **Total for foundational release** | **29–43** |
| Post-launch features | 15–26 |

## Rough Calendar Estimate

| Phase | Days | Notes |
|---|---|---|
| UI migration (steps 1–8) | 3–4 | ~3 prompts/day |
| Backend wiring + missing features | 3–4 | Parallel with testing |
| Native wrapper + store prep | 2–3 | Includes human store work |
| Testing + bug fixes | 2–3 | Physical device testing |
| Store submission + review | 2–5 | Apple review time varies |
| **Total** | **12–19 days** | |

At aggressive pace (4+ prompts/day with immediate human testing): **12–14 days.**
At moderate pace (2 prompts/day): **18–22 days.**
