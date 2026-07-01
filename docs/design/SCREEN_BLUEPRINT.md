# Slate360 — Screen Blueprint (2026-07-01)

Working inventory of every significant screen: route, component, purpose, what's on it
today, and status. Assembled from a 3-agent source audit. Hand this to external AI
platforms to review each screen for value, simplicity, intuitive flow, and premium UI.

**Status legend:** SOLID (works, good UX) · THIN (works but sparse/needs value) ·
SLOP (placeholder/mock/dead-end) · BROKEN (dead-end or bug). Design system = Graphite
Glass (dark `#0B0F15`, translucent glass, IBM Plex Mono labels, ONE accent per surface on
interactive states only, 48–72px targets; bans amber/glow/rounded-full/hardcoded-hex).
Surfaces: Dashboard (desktop cockpit), Site Walk (green), Twin 360 (blue), Coordination,
Projects, SlateDrop, Deliverables, Settings.

---

## TOP DEAD-ENDS & SLOP (fix first)
1. **`/integrations`** (`app/(dashboard)/integrations/ClientPage.tsx:26`) — **SLOP**, literally
   "Integrations — In Development". App-store auto-reject language. Remove/rebuild or hide.
2. **`/site-walk/reports/new`** (`ReportBuilderClient.tsx`) — **SLOP**. Static mockup: drag
   handles with no drag logic, "Generate PDF & Save to SlateDrop" button with NO onClick
   (:79), "LOGO HERE"/"Organization Name"/"YYYY-MM-DD" placeholders, hardcoded `sky-500`.
   Nothing functions. This is the Site Walk "sophisticated document" builder — needs a real build.
3. **Contacts `?contact=` dead-end** (`MobileContactsClient.tsx:73`) — tapping a contact changes
   the URL but nothing opens; no detail sheet, no add/edit contact. THIN → BROKEN.
4. **`/site-walk/capture-v2/flow`** — THIN: hardcoded `SAMPLE_STOPS`, attachments not persisted,
   hardcoded `#6EA7A0`. Secondary/experimental flow.
5. **`/site-walk/reports`** — THIN signpost-only (forwards to walks + deliverables; no report data).
6. **Design-token violations** (guard:design risk): `assigned-work/page.tsx:45-58`
   (yellow/orange/red/green Tailwind), `ReportBuilderClient` (sky-500), `CaptureFlowClient` (#6EA7A0).
7. **Twin cinematic MP4 export** (`CinematicCameraPath.tsx:82`) — TODO: server-render via
   Trigger.dev not built (this is the CEO's before/after MP4-for-social feature).
8. **Duplicate SlateDrop pickers**: `/slatedrop` (tokens) vs `/site-walk/slatedrop` (raw Tailwind,
   font-black) — design-system drift.
9. **White-label gap**: org branding accent is **preset-only** (3 options), no arbitrary hex /
   custom domain / app-wide theme (`SettingsOrganizationPanel`).
10. **No onboarding/first-run wizard** anywhere (only signup confirmation + pending-verification gate).

---

## DASHBOARD (desktop cockpit)
| Route | Component | Purpose | Status | Gaps / should-be |
|---|---|---|---|---|
| `/dashboard` | `DashboardHomeContent` | Home cockpit | THIN | Hero is a 160px tile in a draggable board, not the **squarish featured-project hero** the CEO wants (twin/360/walk snapshot + project info overlaid, opens project, "make primary" control); `imageUrl` never populated; needs expandable-section widget system (usage/buy-tokens, PDF, Google-Maps/3D-tiles shareable directions). See DASHBOARD_VISION.md. |
| `/projects` (Portfolio tab) | `ProjectsPortfolioOverview` | Portfolio | SOLID (rebuilt) | Real status rollup + clickable project rows (fake KPIs removed). Could add attention-queue + in-flight strip. |
| `/integrations` | `IntegrationsHubPage` | Integrations | **SLOP** | "In Development" stub — remove/rebuild. |
| `/settings` | `AccountSettingsClient` | Account/org cockpit | SOLID | 6 panels (Profile/Security/Notifications/Organization/Billing/Team) + deletion; most complete surface. |

## PROJECTS
| Route | Component | Purpose | Status | Gaps |
|---|---|---|---|---|
| `/projects` (All tab) | `ProjectsAllProjectsTab` + `MobileProjectsClient` | Project directory | SOLID | Solid list/search/create; add "make primary/featured" control for the hero. |
| `/projects/[id]` (overview) | `ProjectOverviewTab` | Project workspace home | SOLID | StatCards Walks/Twins/Files/Team/Deliverables (deliverables link added this session) + activity; the "project management landing" the hero should open into. |
| `/projects/[id]/{walks,twins,slatedrop,team,plans,deliverables}` | tab pages | Sub-workspaces | SOLID | All linked from overview. |

## SITE WALK (green)
| Route | Component | Purpose | Status | Gaps |
|---|---|---|---|---|
| `/site-walk` | `SiteWalkHomeClient` | Mobile hub | SOLID | Fully wired (hub data, assignments, deliverables). |
| `/site-walk/capture-v2` | `CaptureV2Shell` | **Primary** capture engine | SOLID | Session-backed capture, entitlement-gated 360. |
| `/site-walk/capture-v2/flow` | `CaptureFlowClient` | Alt multi-stop flow | THIN | SAMPLE_STOPS, unpersisted attachments, #6EA7A0. |
| `/site-walk/capture-v2/summary` | `CaptureV2Summary` | Post-walk review | SOLID | — |
| `/site-walk/(act-1-setup)/setup` | `SiteWalkSetupClient` | Setup (brand/contacts/tier) | SOLID | — |
| `/site-walk/(act-2-inputs)/capture` | V1 capture | Legacy capture | SOLID (redundant) | Two live capture boundaries (V1/V2 hazard) — confirm canonical. |
| `/site-walk/(act-2-inputs)/walks` | walks list | Worksites/walks | SOLID | Real thumbnails, resume/view, bulk manager. |
| `/site-walk/(act-2-inputs)/walks/[sessionId]` | walk review | Single-walk review | SOLID | — |
| `/site-walk/(act-2-inputs)/progression` | progression | Before/after grouped | SOLID | Needs `?projectId=` (by design). |
| `/site-walk/(act-2-inputs)/assigned-work` | assigned-work | Items assigned to me | SOLID | **Token violation** (hardcoded status colors :45-58). |
| `/site-walk/(act-3-outputs)/deliverables` | deliverables list | Deliverables + share | SOLID | — |
| `/site-walk/(act-3-outputs)/reports` | reports | Reports landing | THIN | Signpost-only. |
| `/site-walk/(act-3-outputs)/reports/new` | `ReportBuilderClient` | Deliverable builder | **SLOP** | Static mockup, no drag, no PDF wiring, placeholders. |
| `/site-walk/deliverables/[id]` | `ViewerClient` (reuse) | Owner preview | SOLID | Smart share-viewer reuse. |
| `/site-walk/items/[id]/compare` | compare | Before/after pair | SOLID | — |

## TWIN 360 (blue)
| Route | Component | Purpose | Status | Gaps |
|---|---|---|---|---|
| `/digital-twin` | `DigitalTwinHomeClient` | Twin hub | SOLID | — |
| `/digital-twin/capture` | `TwinCaptureFlow` | Capture funnel | SOLID | Native ARKit LiDAR HUD is canonical on device; web is fallback. |
| `/digital-twin/capture/review` | `TwinCaptureReviewScreen` | Review + HQ gate | SOLID | Web-flow submit path. |
| `/digital-twin/capture/submit` | `TwinCaptureSubmitScreen` | Native submit funnel | SOLID | The native LiDAR handoff landing. |
| `/digital-twin/upload` | `TwinUploadPanel` | Desktop/web upload | SOLID | — |
| `/digital-twin/twins` | twins list | My Twins + unsubmitted | SOLID | Status filter, continue-captures. |
| `/digital-twin/twins/[id]` | `TwinViewerWorkspace` | Interactive splat viewer | SOLID | **Now handles building/failed/not-found** (fixed this session); share actions inline. |
| `/digital-twin/twins/[id]/editor` | `DesktopSplatEditor` | Crop/clean | SOLID | Desktop-gated, edit-list persisted. |
| `/digital-twin/twins/[id]/cinematic` | `CinematicCameraPath` | Camera-path authoring | SOLID (export partial) | **MP4 server-render TODO** (:82) — the before/after social MP4. |
| `/digital-twin/twins/[id]/progression` | `ProgressionTimeline` | Progression over time | SOLID | — |
| Twin processing (submit status) | `TwinSubmitStepStatus` + `TwinProcessingChecklist` | Reconstruction wait | SOLID (rebuilt) | Staged checklist + elapsed + ETA + safe-to-leave + completion hub (View/Edit); worker posts real stages. Polish: preview thumbnail on complete, heartbeat "last update", segmented track. |

## COORDINATION
| Route | Component | Purpose | Status | Gaps |
|---|---|---|---|---|
| `/coordination` | `MobileCoordinationHubClient` | Nav hub | SOLID | No unread badges on rows. |
| `/coordination/inbox` | `MobileInboxClient` | Notification inbox | SOLID (rebuilt) | Single real feed; unread-only (no history/archive), poll-on-mount (no realtime). |
| `/coordination/calendar` | `MobileCalendarClient` + `CalendarEventSheet` | Calendar + create | SOLID (new) | Create works; rows read-only (no edit/delete), list-only (no month grid), reminders + project-scoping TODO. |
| `/coordination/contacts` | `MobileContactsClient` | Contact directory | THIN | `?contact=` unhandled dead-end; no add/edit contact. |

## SLATEDROP / DELIVERABLES / SHARE
| Route | Component | Purpose | Status | Gaps |
|---|---|---|---|---|
| `/slatedrop` | picker | Project→file browser | SOLID | Pure redirector; no recents/search/all-files. |
| `/site-walk/slatedrop` | picker | SW-branded picker | SOLID (drift) | Raw Tailwind, duplicative of `/slatedrop`. |
| `/upload/[token]` | `upload-portal-client` | No-login upload portal | SOLID | Real 3-step resilient upload; no quota display. |
| `/view/[token]` | `ViewerClient` | Interactive deliverable deck | SOLID (richest viewer) | 413-line component; evidentiary metadata + comments wired. |
| `/share/deliverable/[token]` | `SharedDeliverableDocument` | Static doc share | SOLID | Coexists with `/view` — confirm canonical for emails. |
| `/share/twin/[token]` | `TwinShareViewer` | Public twin viewer | SOLID | Role-based annotate/download. |
| `/share/thermal/[token]` | `ThermalShareViewer` | Public thermal report | SOLID | Password gate + branding snapshot (only public thermal surface). |

## SETTINGS / ACCOUNT / AUTH
| Route | Component | Status | Notes |
|---|---|---|---|
| `/settings` | `AccountSettingsClient` | SOLID | 6 panels + branding + deletion. |
| Org branding | `SettingsOrganizationPanel` | SOLID / partial | Logo/signature/contact + **preset-only accent** (no free hex/domain/theme = white-label gap). |
| `/more/account` | mobile account | SOLID | 4 metric tiles + links; **no sign-out on this screen**. |
| `/login` `/signup` `/forgot-password` `/reset-password` `/pending-verification` `/install` | auth | SOLID | Real Supabase auth, OAuth, Turnstile, approval gate. |
| Onboarding wizard | — | MISSING | No first-run/getting-started flow. |

---

## Cross-cutting themes for reviewers to weigh in on
- **Flow**: does each screen lead intuitively into the next (capture → add data → tokens/ETA →
  process → status → all-project-statuses → completed deliverables → send)? Where are the breaks?
- **Value per screen**: which THIN/signpost screens (reports, coordination hub, slatedrop picker)
  should become feature-rich?
- **The two big builds**: (1) real Site Walk **document/report builder** (replace the SLOP mockup),
  (2) Twin **before/after MP4 export** (server-render). Both are core CEO value.
- **Dashboard**: squarish featured-project hero + expandable widget system (see DASHBOARD_VISION.md).
- **3D-tiles surrounding context**: greenfield (see COORDINATION_AND_PORTFOLIO_REBUILD_LOCKED.md).
- **Consistency**: purge remaining hardcoded colors, unify the two SlateDrop pickers + two capture
  boundaries, one accent per surface.
