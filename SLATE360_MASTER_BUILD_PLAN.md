# Slate360 — Master Build Plan

**Created:** 2026-04-11
**Status:** ACTIVE — Single source of truth for all build direction
**Supersedes:** All prior planning docs in `slate360-context/`, `_archived_docs/`, `docs/archive/`

> **Rule:** If this file and any other doc conflict, THIS FILE wins.

> **Site Walk detail source:** `docs/SITE_WALK_MASTER_ARCHITECTURE.md` is the authoritative module-level blueprint for Site Walk workflow, monetization guardrails, collaborator UX, App Store mode, Act 1/2/3 routing, and non-PDF deliverables. It must remain aligned with this master plan.

> **Site Walk execution mandate:** `docs/site-walk/SITE_WALK_V1_3_ACT_WORKFLOW_PLAN.md` is the prompt-by-prompt execution ledger. It must be updated after each Site Walk build prompt with status, commit, validation, and an audit summary.

---

## Doctrine Documents (MUST READ for any build session)

Before writing any code involving the app shell, projects, SlateDrop, entitlements, or collaborators, read the relevant doctrine doc:

| Topic | Doc |
|---|---|
| App-neutral shell, collaborator model, org branding, cross-app bundles | `docs/SLATE360_PRODUCT_DOCTRINE.md` |
| SlateDrop as platform file system, folder hierarchy, share links | `docs/SLATEDROP_ARCHITECTURE.md` |
| Capacitor native wrapper, offline-first capture, App Store checklist | `docs/APP_STORE_AND_OFFLINE_STRATEGY.md` |
| Field Project vs Project model, entitlement gates, upgrade path, gap list | `docs/ENTITLEMENTS_AND_PROJECT_MODEL.md` |

---

## Table of Contents

1. [Product Architecture](#1-product-architecture)
2. [App Ownership Boundaries](#2-app-ownership-boundaries)
3. [Site Walk — Product Definition](#3-site-walk--product-definition)
4. [Site Walk — Data Model](#4-site-walk--data-model)
5. [Site Walk — MVP Features](#5-site-walk--mvp-features)
6. [Site Walk — Phase 2 & 3 Features](#6-site-walk--phase-2--3-features)
7. [Site Walk — Mobile UX Requirements](#7-site-walk--mobile-ux-requirements)
8. [Site Walk — Deliverables](#8-site-walk--deliverables)
9. [Bundle & Expansion Logic](#9-bundle--expansion-logic)
10. [Field ↔ Office Coordination](#10-field--office-coordination)
11. [Margin & Metering Controls](#11-margin--metering-controls)
12. [Phased Build Sequence](#12-phased-build-sequence)
13. [Distribution & App Store Strategy](#13-distribution--app-store-strategy)
14. [v0 / Design Workflow Rules](#14-v0--design-workflow-rules)
15. [Code Guardrails](#15-code-guardrails)
16. [Verification Gates](#16-verification-gates)
17. [Disruptor Pack (Future)](#17-disruptor-pack-future)

---

## 1. Product Architecture

### The Ecosystem

```
Slate360 (master app shell)
├── Slate360 Core ─── auth, billing, orgs, projects, storage, notifications, activity, comments, app launcher
├── SlateDrop ──────── project file system, uploads, shares, external intake, evidence locker
├── App 1: Site Walk ─ field capture, punch, inspection, proposals, deliverables, field↔office bridge
├── App 2: 360 Tours ─ immersive 360 hosting, scene navigation, hotspots (existing ~80% done)
├── App 3: Design Studio ── model/BIM upload, viewing, design context (greenfield)
└── App 4: Content Studio ── media editing, branded clips, polished outputs (greenfield)
```

### What Changed

- **No Project Hub as flagship.** Project Hub code remains in the repo but is de-emphasized. Site Walk replaces it as the primary user-facing app.
- **Slate360 Core is the shell.** It owns auth, billing, storage, notifications, and the app launcher.
- **SlateDrop is a product pillar** — not background storage. It is the project file nervous system.
- **Dashboard becomes an actionable command center** — not decorative metrics.

### Slate360 Core Owns

- Authentication (signup, login, OAuth, session management)
- Billing & subscriptions (Stripe, tiers, per-app purchases)
- Organization & team management (roles, invites, seats)
- Project registry (creation, membership, settings)
- Shared file storage layer (SlateDrop as backbone)
- Notifications center
- Shared activity feed
- Shared comments/threading foundation
- Deliverable token/link system
- App launcher & app gating by subscription
- Branding & account settings
- Dashboard command center

### Global Shell vs. Site Walk Module Shell

These surfaces must not be conflated:

| Surface | Owns | Must not own |
|---|---|---|
| `/dashboard` global Slate360 shell | Programmable Quick Start, Search Everything, Open SlateDrop, global app launcher, cross-app command-center cards | Site Walk-only plan-room controls, walk-specific capture controls, deliverable-builder internals |
| `/site-walk` module entry | Recent walks, Active Walks, Master Plan Room, Capture, Deliverables, Assigned Work, Site Walk setup/checklists | Global app switching, global Search Everything implementation, unrelated app quick actions |

Rule: global navigation can deep-link into Site Walk, but the Site Walk module dashboard should not duplicate the entire Slate360 command center.

---

## 2. App Ownership Boundaries

| Capability | Owner | Other Apps May... |
|---|---|---|
| Field walks, sessions, capture | **Site Walk** | — |
| Punch lists, inspections, proposals | **Site Walk** | — |
| Plan pinning, field issue records | **Site Walk** | — |
| Field-to-office live coordination | **Site Walk** | — |
| Branded reports & field deliverables | **Site Walk** | Content Studio enriches media |
| Offline field queue | **Site Walk** | — |
| Immersive 360 hosting & navigation | **360 Tours** | Site Walk references scenes |
| Hotspot authoring & scene linking | **360 Tours** | Site Walk pins issues in 360 |
| Model/BIM upload & design review | **Design Studio** | Site Walk references model views |
| Media editing & branded clips | **Content Studio** | Site Walk attaches polished media |
| File storage, folders, shares | **SlateDrop** | All apps write through SlateDrop |
| Project-level records & logs | **Slate360 Core** | All apps contribute events |

### Anti-Cannibalization Rule

> Site Walk can **reference** richer media from other apps, but must NOT recreate the authoring system of those apps. Site Walk attaches a 360 scene — it does not become a 360 builder. Site Walk references a model — it does not become BIM software.

---

## 2a. Concurrent AI Development Tracks

> **Full details:** `docs/CONCURRENT_DEVELOPMENT_TRACKS.md`

Two AI development tracks run simultaneously. Each track owns a non-overlapping area of the codebase. Cross-track edits require explicit approval.

| Track | Owns | Branch |
|---|---|---|
| **Track A — AppShell + Site Walk UI** | Global AppShell, Site Walk V1 UI, Graphite Glass design system, capture/plan visual shells | `main` |
| **Track B — Digital Twin Lite** | CEO-gated Digital Twin app, drone processing Trigger jobs, multipart upload, GPU worker, twin APIs/viewers/share routes | `feature/digital-twin-lite` |

**Hard rules:**
1. Track B must not modify `components/site-walk/`, `app/site-walk/`, `components/dashboard/AppShell.tsx`, `MobileTopBar`, or `MobileBottomNav`.
2. Track A must not implement Digital Twin backend, viewer, or drone-processing logic.
3. Track B may request AppShell integration changes — Track A applies them on `main`.
4. Both tracks confirm at session end that they did not touch the other's files.

---

## 3. Site Walk — Product Definition

### What It Is

Site Walk is the mobile-first field documentation, issue capture, communication, and action app inside Slate360.

**Product promise:** "Document anything in the field, organize it fast, turn it into a polished deliverable, and get it to the right people immediately."

### What It Does (5 core jobs)

1. **Capture** — Document problems, work status, or site conditions quickly in the field
2. **Organize** — Sort findings by project, plan, level, room, area, trade, category, assignee, or date
3. **Communicate** — Turn field data into reports, proposals, and link-based deliverables
4. **Track** — Assign, monitor, revisit, verify, and close issues
5. **Expand** — Gain richer context when bundled with other Slate360 apps

### Target Users

Superintendents, project managers, project engineers, general contractors, subcontractor foremen, inspectors, safety teams, QA/QC teams, owners' reps, architects, consultants, facility managers, turnover teams, closeout teams, warranty teams, university capital programs staff, developers, small builders, remodelers, property condition reviewers.

### Core Workflows

| Workflow | Description |
|---|---|
| **A. Punch Walk** | Walk site → take photos → tag issues → assign trades → generate punch report |
| **B. Inspection** | Perform inspection with templates/checklists → add evidence → generate report |
| **C. Progress Documentation** | Capture photos/notes routinely → send progress summary to stakeholders |
| **D. Issue Communication** | Document condition → mark up image/plan → send view link to responsible party |
| **E. Proposal / Estimate** | Document field conditions → organize corrective work → create branded proposal |
| **F. Client/Owner Deliverable** | Create clean digital handoff with photos, markups, attachments, optional 360 |
| **G. Closeout / Verification** | Revisit findings → upload completion proof → verify → generate open/closed log |
| **H. Plan-Based Documentation** | Upload drawings → pin findings on sheets → navigate by sheet |
| **I. Mobile-First Capture** | Photo + voice + markup + auto-tags in very few taps |
| **J. Follow-Up / Resolution** | Revisit issues → add updated photos → close items → produce log |

### The Heartbeat Workflow (build this first)

```
Open project → Start Walk → Choose type → Capture photo → Add title →
Voice-to-text notes → Markup → Tag location → Assign → Set priority/due →
Save → Continue walking → Review items → Generate deliverable → Send
```

---

## 4. Site Walk — Data Model

### Core Objects

| Object | Description |
|---|---|
| **Project** | The jobsite, property, or facility |
| **Walk / Session** | A specific field visit, inspection, or documentation run |
| **Finding / Item** | The core record: punch item, observation, deficiency, inspection note, safety issue, progress note, etc. |
| **Media** | Photo, video, voice note, attachment, marked-up image, linked plan view, linked 360 scene (bundle) |
| **Location** | Plan pin, room, level, floor, area, building, gridline, trade, map point, geolocation, optional 360 ref |
| **Deliverable** | Report, proposal, link package, PDF, image package, digital review package |
| **Assignment** | Responsible party, trade, subcontractor, priority, due date, status |
| **Activity** | Comments, updates, closeout verification, change history |
| **Access Link** | Time-limited branded link for external viewing |
| **Template** | Inspection forms, report templates, proposal layouts, checklists |

### Required DB Tables (to build)

- `site_walk_sessions` — EXISTS (verify schema)
- `site_walk_items` — **MUST BUILD**
- `site_walk_deliverables` — **MUST BUILD**

### Reserved Metadata Fields (add now, use later)

In `site_walk_items.metadata`: weather, device orientation, heading, capture mode, offline sync state, measurement overlays, blur flags, defect suggestions, object counts, schedule comparison result, linked 360 scene id, linked model id, QR/barcode values, AI confidence, before/after reference id.

In `site_walk_sessions.metadata`: session type config, route summary, checklist template id, weather summary, sync summary, linked deliverable ids, linked schedule segment, linked 360 map context, organization branding snapshot.

---

## 5. Site Walk — MVP Features

### Must Ship for Beta

- Project creation/selection
- Walk/session creation with session types (progress, punch, inspection, proposal, general)
- Camera-first capture (photos, short videos)
- Text note entry
- Voice note entry with browser speech-to-text
- GPS + timestamp + weather metadata
- Photo markup (arrows, circles, text, callouts)
- Category/trade/status/priority/assignee fields
- Due dates
- Plan upload and plan pinning
- Item timeline with edit/delete/reorder
- Local queue + IndexedDB persistence
- Session review screen
- Branded PDF report generation
- Branded proposal generation
- Digital viewer link (token-based)
- Send by email/text workflow
- Export/download (PDF, CSV, images)
- Mobile-optimized UI
- Office-side review view
- Office-to-field assignment (basic)
- Field-to-office comments
- Push/in-app notifications

### Standalone Value

A Site Walk-only customer must be able to do ALL of the above without any other app. Site Walk must be a **complete, sellable product** by itself.

---

## 6. Site Walk — Phase 2 & 3 Features

### Phase 2 (after MVP stability)

- Templates and checklists
- Recurring walk templates
- Before/after comparison view
- Room/area turnover mode
- Richer branded proposal layouts
- External acknowledgement workflows
- Better closeout workflows
- Issue history timeline
- Stronger offline sync
- Cost estimate & manpower fields
- Signatures
- Custom statuses
- Role-based external views
- Richer leadership dashboards

### Phase 3 (ecosystem integration)

- 360-linked issue pinning
- BIM/model-linked findings
- AI-generated descriptions and proposal drafts
- Recurring issue pattern detection
- Executive summary packages
- Trade performance analytics
- Owner portal packaging
- Voice-command-driven field workflows
- Automated closeout books
- Smart issue detection suggestions

---

## 7. Site Walk — Mobile UX Requirements

### V1 Mobile UX Direction — Locked 2026-05-13

The next Site Walk UI phase is a focused mobile architecture cleanup, not a backend rewrite and not an app-wide redesign. The current Plan Walk core loop is partially working and must be preserved: plan opens, pan/zoom works, long press opens capture, plan-linked capture can be created, and saved plan pins can be opened.

Authoritative planning docs for this phase:

- `docs/site-walk/SITE_WALK_V1_MOBILE_UX_DECISION_RECORD.md`
- `docs/site-walk/SITE_WALK_V1_UI_IMPLEMENTATION_PLAN.md`
- `docs/design/SLATE360_V1_DESIGN_TOKEN_PLAN.md`
- `docs/SLATE360_V1_APP_SHELL_UX_ARCHITECTURE.md`
- `docs/design/SLATE360_UNIFIED_DESIGN_SYSTEM_GAP_AUDIT.md`

App-shell bridge rule:

- Site Walk is the V1 field-task pattern source, but the Slate360 shell remains app-neutral. The global shell follows command-center, task-shell, safe-area, and tokenized design principles without becoming Site Walk-only.
- Normal mobile shell pages use the locked platform nav: `Home | Projects | SlateDrop | Coordination | Account`.
- Active capture/plan task modes may take over the full viewport and hide platform bottom nav while preserving a clear route back to Site Walk/module context.
- Future apps remain hidden until functional and entitled. Do not show Coming Soon, demo, beta/test, waitlist, disabled future app, or fake placeholder surfaces in the authenticated V1 shell.
- Visual direction for V1 planning is Graphite Glass + restrained amber + muted teal: premium graphite/slate, glass-like depth without crushing contrast, restrained amber/gold, muted teal/smoke, warm off-white, and neutral plan/photo workspaces. Do not frame future implementation as harsh black/orange or a broad app-wide repaint.

Locked decisions for the next UI phase:

- Site Walk Home becomes a command center: Resume Active Walk, Start New Walk, Recent Walks, Issues/Open Items, Needs Review, Draft Deliverables, Unsynced Items, and Project / Field Project shortcuts.
- Authenticated Site Walk surfaces must not show app install banners or duplicate module nav when bottom nav already covers the same routes.
- Capture uses a consistent task header. Plan-linked capture should say `Stop N · From Plan` or `Stop N · Plan Location`, not vague `PLAN-LINKED` copy.
- Back to Plan is primary in plan-linked capture; Exit Walk remains secondary/destructive and must never replace Back to Plan.
- Stop navigation uses a compact horizontal strip: `Stop 1 | Stop 2 | Stop 3 | + Stop`.
- Plan viewer prioritizes the plan canvas with compact top sheet bar, page forward/back, thumbnails, sheet/page search, search results drawer, layer/pin toggles, clean plan/show pins toggle, and portrait/landscape behavior.
- Plan tools move into a bottom drawer with `Sheets`, `Search`, `Pins`, and `Layers` tabs.
- Markup tools become compact/contextual with 44px touch targets, no long instructional text, and no toolbar covering photo/plan.
- Save copy is state-specific: `Save Stop & Return to Plan` for Plan Walk and `Save Stop & Continue` for Quick Walk.
- Attachments move into the details sheet under `Details`, `Attachments`, and `Markup` tabs.
- Quick Walk and Plan Walk share one capture system; Plan Walk adds plan sheet context, plan pin, plan coordinates, and Back to Plan.
- Draft pins are draggable before save. Saved pins are locked by default and only move through explicit Edit Location / Move Pin mode.
- Before/After and Ghost are planned as guided recapture: Ghost appears only during Add After Photo alignment.
- Color direction moves from harsh black/orange toward premium graphite/slate, softer panels, restrained amber, muted teal/smoke, warm off-white, and clearer neutral plan/photo workspaces.
- Design-system work starts with CSS variable tokens and a hardcoded color audit. First migration slice targets Site Walk capture/plan only.

Recommended implementation sequence:

1. Site Walk Home command center cleanup.
2. Shared mobile `CaptureShell`.
3. Plan viewer workspace cleanup.
4. Markup and attachment compaction.
5. Pins and stop preview.
6. Before/After and Ghost V1.
7. Design token foundation.
8. App Store visible surface cleanup.

Do not begin an app-wide visual redesign in one pass.

### Design Principles

- One-handed field use
- Big tap targets
- Quick capture (minimal taps to create an item)
- Voice-first input options
- Reliable save behavior (auto-save drafts)
- Offline tolerance
- Fast photo handling
- Keyboard-safe layouts

### Must-Have Mobile Behaviors

- Sticky bottom action bar for capture tools
- Floating capture button
- Large save button (never hidden by keyboard)
- Auto-save drafts
- Swipe between captured items
- Easy voice toggle on/off
- Fast preview thumbnails
- Easy finger/stylus markup
- Review screen before sending
- Compressed upload preview while originals process in background

### Problems to Avoid

- Keyboard covering note fields
- Save button disappearing
- Losing notes if app gets interrupted
- Slow camera-to-item flow
- Too many taps for basic issue creation
- Hard-to-see statuses on phone
- Overly heavy viewer components on weak devices

---

## 8. Site Walk — Deliverables

### Deliverable Types

Punch list report, inspection report, progress report, site walk summary, deficiency report, turnover report, closeout verification package, field observation report, branded proposal, estimate summary, trade-specific action list, issue-specific field memo, digital review package.

### Delivery Methods

PDF, email, textable share link, downloadable zip, CSV/Excel export, image package, branded mobile review page, link with restricted access window.

### Deliverable Enhancements

Logo and brand colors, custom cover page, filters before export, grouped by room/trade/level, include/exclude photos, include thumbnails or full images, include markup or clean image, include closed or only open items, optional QR code to open digital version, signatures (later).

---

## 9. Bundle & Expansion Logic

### Site Walk + 360 Tours

- Attach navigable 360 scenes to findings
- Pin issues directly in 360 imagery
- Send issue links that open into 360 scene
- Include "Open immersive context" button in deliverables
- GPS-based "Near Me" 360 linking

### Site Walk + Design Studio (later)

- Reference model/BIM locations for findings
- Connect issues to design views

### Site Walk + Content Studio (later)

- Attach edited clips as enriched proof
- Polished client-facing visual packages

### Site Walk + Reports & Analytics (later)

- Issue closure trends, recurring deficiencies
- Trade performance, executive dashboards

### Bundle Principle

> Better together, but not dependent. A standalone customer must never feel like they bought an incomplete piece of a larger machine.

---

## 10. Field ↔ Office Coordination

This is the feature that turns Slate360 from a documentation tool into a **live field coordination system.**

### Office → Field

- Create and push assignments with deadline, location/plan pin, reference files
- Attach checklists or required photos
- Push instantly to field user's device
- Pre-walk punch list imports

### Field → Office

- Receive and acknowledge assignments
- Add response notes/photos
- Mark in progress / complete / blocked
- Request clarification / escalate
- "Need help" flag

### Live Field Feed (Office View)

- Active Site Walk sessions
- Newly captured items
- Status changes
- Who is online in the field
- Uploads pending sync
- Issues opened/resolved

### Two-Way Communication

- Item-level threaded comments
- Session-level threaded comments
- Voice replies on items
- Office markups that appear on field mobile
- Project announcement channel

### Read Receipts & Tracking

For each task or deliverable: sent → delivered → opened → acknowledged → in progress → completed → verified.

### Status Transitions

assigned → seen → acknowledged → in progress → blocked → complete → verified

---

## 11. Margin & Metering Controls

**Target margins: 90–95%.** Site Walk must be disciplined about storage and processing.

### Good Margin Rules

- Store originals in controlled storage, create compressed delivery versions
- Use thumbnails/previews for everyday browsing
- Heavy files load on demand only
- Limit storage by tier
- Archive older projects to cold storage
- Cap public link duration by tier
- Limit 360/heavy media unless customer also has 360 app

### V1 Metering Engine — Required Before Scale

Metering is not deferred. A reusable server-side metering guard must ship before high-volume Site Walk capture, AI, and deliverable workflows are opened broadly.

The engine must:
- Read entitlements only from `lib/entitlements.ts`.
- Enforce storage caps before presigned R2/S3 upload URLs are issued.
- Enforce AI credit caps before transcription, note formatting, summaries, extraction, or future AI workflows run.
- Record usage through `site_walk_usage_events`, `site_walk_usage_monthly`, and `record_site_walk_usage()`.
- Return typed allow/block/top-up-needed responses so UI can prompt for upgrade/top-up before expensive work happens.

Planning caps for Site Walk:
- Standard: 5GB storage / 300 AI credits.
- Pro/Business: 25GB storage / 1,000 AI credits.
- Enterprise: negotiated/custom caps.

Meter at minimum: total storage, active public links, external recipients, report/PDF exports, proposal exports, AI note cleanups, transcription, generated summaries, long-term hosted deliverables, large media uploads, bundled 360/model references, email/SMS sends, and realtime minutes when practical.

### Profitability Principle

Site Walk should mostly be: structured data + optimized photos + lightweight PDFs + controlled sharing + optional paid enhancements.

---

## 12. Phased Build Sequence

### Phase 0 — Truth Alignment & Cleanup

- [x] Codebase audit completed (CODEBASE_AUDIT_2025.md)
- [x] Clean/stub dead navigation (Design Studio, Content Studio, Virtual Studio, Geospatial) — stub pages in `app/(apps)/`
- [x] Backfill tracked migrations for `slatedrop_uploads` and `slate_drop_links` — `20260411000001` + `20260411000002`
- [x] Set real Stripe prices and re-enable checkout — $149/$499 monthly, annual ~17% discount, all "TBD" replaced
- [x] Freeze app naming and order in code — Dashboard → Site Walk → SlateDrop → 360 Tours → future apps
- [x] Remove Project Hub from forward-looking product surface — removed from all 3 nav components
- [x] Define canonical planning docs (this file only)

### Phase 1: Foundation (COMPLETE ✅)

**STATUS: OFFICIALLY COMPLETE**

The following modules have been completed and locked into the Core Rulebooks:
- **App-Neutral Shell**
- **Account/Team Hub**
- **Site Walk 3-Tab Workspace**
- **Plan Viewer Pinning Engine**
- **Coordination Hub**


**STATUS: OFFICIALLY COMPLETE**

Completed Modules:
- App-Neutral Shell
- Account/Team Hub
- Site Walk 3-Tab Workspace
- Plan Viewer Pinning Engine
- Coordination Hub


- [ ] Verify auth, orgs, projects, entitlements, billing work end-to-end
- [ ] Verify app gating via `org_feature_flags`
- [ ] Verify SlateDrop storage, folders, shares, external upload
- [ ] Build/verify shared notification center
- [ ] Build/verify shared comments/thread foundation
- [ ] Build/verify shared activity feed
- [ ] Redesign dashboard as actionable command center:
  - Active projects, active field sessions, pending assignments
  - Unread threads, deliverables awaiting review
  - Storage usage, app launcher, quick actions
  - **Rule:** Every card must drill deeper, launch a workflow, or show live status. No decorative metrics.
- [ ] App launcher shows only real/purchased apps; "Coming Soon" for future

### Phase 2 — SlateDrop Hardening

- [ ] Complete migration coverage (reproducible from migrations alone)
- [ ] Verify folder creation, quota enforcement, file validation
- [ ] Verify share-link creation, expiry, external upload flows
- [ ] Improve project file navigation
- [ ] Ensure Site Walk and future apps can write predictable file structures
- [ ] Make history/archive behavior explicit
- [ ] Add Site Walk metering guard to storage/upload routes before broad capture rollout

### Phase 3 — Site Walk Backend Foundation

- [ ] Verify/upgrade `site_walk_sessions` schema
- [ ] Create `site_walk_items` migration + RLS
- [ ] Create `site_walk_deliverables` migration + RLS
- [ ] Build session CRUD API
- [ ] Build item CRUD API + reorder
- [ ] Build deliverable CRUD + submit/share APIs
- [ ] Build assignment/comment models
- [ ] Build contributor invite/access
- [ ] Add notification triggers + event logging
- [ ] Reserve metadata fields for future features
- [ ] Define folder conventions for Site Walk in SlateDrop

### Phase 4 — Site Walk Field Capture Engine

- [ ] Create route-group scaffold and empty modular capture placeholders before logic
- [ ] Ensure `app/site-walk/(act-2-inputs)/capture/page.tsx` stays a thin composition page
- [ ] Required capture components: `DualModeToggle.tsx`, `CameraViewfinder.tsx`, `PlanViewer.tsx`, `UnifiedVectorToolbar.tsx`, `CaptureBottomSheet.tsx`, `SyncQueueIndicator.tsx`
- [ ] PWA shell with project selector
- [ ] Session creation + session types
- [ ] Camera-first capture screen
- [ ] Photo + short video capture
- [ ] Text note + voice note entry
- [ ] Browser speech-to-text
- [ ] GPS + timestamp + weather metadata
- [ ] Item timeline with edit/delete/reorder
- [ ] Auto-save + IndexedDB queue + sync service
- [ ] Resume in-progress sessions
- [ ] Plan overlay entry point
- [ ] Session review screen

### Phase 5 — Field ↔ Office Coordination

- [ ] Office-to-field assignment system
- [ ] Item-level + session-level threaded comments
- [ ] Field acknowledgments + read receipts
- [ ] Office review mode for active sessions
- [ ] "Need help" / escalation flag
- [ ] Active sessions live board for leadership
- [ ] Notifications (push/in-app)
- [ ] Markups from office that appear on field mobile

### Phase 6 — Site Walk Operations Completeness

- [ ] Plan upload, numbered pins, status-colored pins
- [ ] Punch workflows + inspection workflows + proposal workflows
- [ ] Priorities, assignees, due dates, bulk actions
- [ ] Resolution cycle + verification cycle
- [ ] Templates/checklists
- [ ] Before/after support, signatures
- [ ] Cost estimate + manpower fields

### Phase 7 — Site Walk Deliverables & Sharing

- [ ] Deliverable draft creation + report templates + proposal templates
- [ ] Branding/logo insertion
- [ ] PDF generation engine
- [ ] Digital viewer page + link sharing
- [ ] Email/text send flow
- [ ] Access expiry/revoke/max-view logic
- [ ] History snapshots (immutable submitted copy)
- [ ] View/open analytics

### Phase 8 — PWA Hardening & Beta Readiness

- [ ] Service worker (Workbox/Serwist) with asset caching
- [ ] IndexedDB persistence + background sync
- [ ] Camera permission fixes (update Permissions-Policy)
- [ ] Wake lock for long sessions
- [ ] Install prompt UX
- [ ] Browser/device compatibility matrix
- [ ] Telemetry + error logging
- [ ] Feature flags + quota enforcement

### Phase 9 — 360 Tours Polish (App 2)

- [ ] Complete existing Tour Builder (~80% done)
- [ ] Scene reordering, mobile viewing improvements
- [ ] Sharing and branding polish
- [ ] Link Site Walk items to 360 scene references
- [ ] "Open immersive context" from Site Walk
- [ ] Immersive button in deliverables

### Phase 10 — Design Studio Foundation (App 3)

- [ ] Page route + shell
- [ ] Model upload/view basics
- [ ] Project linkage
- [ ] Future Site Walk hooks for model references

### Phase 11 — Content Studio Foundation (App 4)

- [ ] Page route + shell
- [ ] Media upload + basic editing
- [ ] Future attachment path to Site Walk and 360 Tours

### Phase 12 — App Store Packaging

- [ ] Android: TWA/wrapper → Play Store (easier first)
- [ ] iOS: Native shell with app-like UX → App Store
- [ ] Store billing compliance (IAP if selling digital goods in-app)
- [ ] Account deletion support (Apple requirement)

---

## 13. Distribution & App Store Strategy

### Launch Path

1. **Web first:** Slate360 + Site Walk on `slate360.ai` as PWA/web install
2. **Validate:** Test with real users, fix workflows, verify pricing
3. **Android:** Package with TWA/Bubblewrap → Play Store
4. **iOS:** Native shell (not thin web wrapper) → App Store
5. **Add apps:** 360 Tours → Design Studio → Content Studio as later releases

### What Works Fine as PWA

Login, subscriptions, camera/photo capture, geolocation, note entry, offline/PWA basics, push notifications (limited on iOS), tokenized sharing, comments, plan pinning, deliverable viewing.

### What Benefits from Native/Store

Background sync reliability (especially iOS), deeper push notifications, native AR frameworks, OS-level share targets, store discoverability, trust via ratings/reviews.

### Store Rules

- Apple: Minimum functionality — app must feel native, not "just Safari in a frame." Account deletion required. In-app purchases for digital subscriptions.
- Google: Play Billing for digital goods. TWA is officially supported.

### Key Decision

You do NOT need all 4 apps before submitting to stores. Ship Slate360 with Site Walk first. List others as "Coming Soon."

---

## 14. v0 / Design Workflow Rules

### Correct Order

1. Claude/Copilot **locks architecture** — schemas, routes, API contracts, storage flows, permissions
2. v0 **designs visuals** against those locked contracts
3. Claude/Copilot **implements**
4. Copilot **verifies/refactors/tests**

### v0 Should Design

App shell layouts, command-center dashboard, SlateDrop file views, Site Walk mobile capture screens, review screens, office review UX, assignment surfaces, deliverable screens, app launcher, empty states.

### v0 Should NOT Decide

DB schema, route design, auth logic, entitlements, storage flows, API shapes, share token logic, offline strategy, realtime transport.

> **Rule:** If v0 is allowed to invent workflows before contracts are locked, you'll get fake-surface-level UI that looks done but isn't wired.

---

## 15. Code Guardrails

### Hard Rules (from existing guardrails — preserved)

1. **No file over 300 lines** in production TS/TSX. Extract first.
2. **No `any`.** Use proper types or `unknown` + narrowing.
3. **Use `withAuth()` / `withProjectAuth()`** from `@/lib/server/api-auth` for all API routes.
4. **Use response helpers** from `@/lib/server/api-response`.
5. **Import shared types** from `lib/types/` — never redefine inline.
6. **Server components first.** Add `"use client"` only when required.
7. **One component per file, one hook per file.**
8. **Imports flow downward:** `lib/` → `components/` → `app/`.
9. **Entitlements from `lib/entitlements.ts` only.**
10. **Folder writes use `project_folders`**, not `file_folders`.
11. **No mock data in production UI.** Show real empty/error states.
12. **No inventing DB columns.** Reference only what exists in migrations.
13. **No duplicate Supabase clients.** One pattern per context.
14. **No orphan API routes.** Every route uses auth wrappers.
15. **All standalone apps use SlateDrop** as file backbone.
16. **CEO/Market/Athlete360 are NOT subscription features.** Gated by `isSlateCeo` only.
17. **Release gate must pass** (`npm run verify:release`) before merge.

### Neutral App-Shell Doctrine (added 2026-05-14)

Every authenticated page inside the app shell is a **functional workspace**, not a web page.

- **Every page must have a real job.** Pages inside `/dashboard`, `/site-walk`, `/coordination`, `/projects`, and any app shell route must render real data, real actions, or a clean functional empty state. They must not render hero text, descriptive marketing paragraphs, "Coming soon" banners, numbered planning lists, or dev notes visible to users.
- **No placeholder content in the authenticated shell.** If a route is not ready, do not show it — hide it via App Store mode or entitlement gates. A page that exists must be usable.
- **Authenticated shell visual language is controlled, not ad hoc.** Existing Dark Glass rescue styling remains safer than white-card drift, but the V1 direction is Graphite Glass + restrained amber + muted teal through `--s360-*` tokens. Do not add new hardcoded black/orange, white-card, or one-off Tailwind palette systems inside authenticated routes.
- **No pre-pivot dead apps in the launcher.** If a module was removed from the product, remove it from `ALL_TABS`, `routeMap`, command palette, and all nav components in the same commit.
- **Coming Soon is banned inside the shell.** `<ComingSoonEmptyState>` may only appear behind an explicit feature flag or be replaced before any App Store submission build.

### Site Walk Capture Scaffolding Rule

Before implementing capture logic, create the modular Act 2 capture component scaffold. The route page must import components from the Site Walk component tree and remain a thin composition file. Do not build capture, plan viewer, canvas, sync queue, or bottom-sheet logic directly inside a single page file.

Mandatory capture scaffold files:
- `DualModeToggle.tsx`
- `CameraViewfinder.tsx`
- `PlanViewer.tsx`
- `UnifiedVectorToolbar.tsx`
- `CaptureBottomSheet.tsx`
- `SyncQueueIndicator.tsx`

### Safe Refactoring Rules

1. Create new component file with extracted code
2. Import in original file
3. Verify with `get_errors` — zero TypeScript errors
4. Test the page still renders
5. Never change data shapes, API contracts, or auth logic during refactoring

### No Phantom Fixes

- If you create a helper/wrapper/provider, confirm it is actually IMPORTED and USED.
- After structural changes, grep for the import path to confirm it's referenced.
- Trace the full call chain: where set → where read → where displayed.

### Async / Race Condition Guard

- Always `await` each step sequentially unless provably independent.
- After DB write, re-fetch — never trust local state set before write completes.
- Never navigate user to results until data fetch has completed.

---

## 16. Verification Gates

### Per-Change

1. `get_errors` on changed files
2. `npm run typecheck` if TypeScript behavior affected
3. `bash scripts/check-file-size.sh` if app code touched
4. Update this file or ONGOING_ISSUES.md if relevant

### Per-Phase

1. All routes render without error
2. No console errors, no broken navigation
3. Auth flow works end-to-end
4. At least one real user workflow tested
5. `npm run verify:release` passes

### Safe Build Method (per prompt wave)

1. **Audit** before changing anything
2. **Change one bounded slice** only
3. **Run checks** immediately (lint, typecheck, build, tests)
4. **Return** changed files and exact reasons
5. **Manual acceptance** before next wave

---

## 18. App-Store Native Shell Doctrine (locked 2026-05-02)

This section captures the gap analysis from the external AI review of commit `228dd36` and locks the decisions. All implementation must follow this before any new feature slices.

### Locked Navigation Rules

**Slate360 Platform (main shell) — 5 tabs:**
```
Home | Projects | SlateDrop | Coordination | Account
```
- `Home` → `/dashboard` — command center
- `Projects` → `/projects` — project list + Project Hub
- `SlateDrop` → `/slatedrop` — file system
- `Coordination` → `/coordination/inbox` — inbox, calendar, contacts
- `Account` → `/my-account` — profile, billing, org, settings, sign out

**Site Walk module — 5 tabs:**
```
Home | Walks | Plans | Deliverables | More
```
- `Home` → `/site-walk` — launch grid + recent activity
- `Walks` → `/site-walk/walks` — session management (All/In Progress/Review/Complete/Drafts)
- `Plans` → `/site-walk/plans` — Master Plan Room
- `Deliverables` → `/site-walk/deliverables` — deliverable list + builder
- `More` → `/site-walk/more` — branding, templates, contacts, SlateDrop, settings

**File:** `components/shared/MobileBottomNav.tsx`

### Site Walk Three-Act Workflow (locked routing)

```
Act 1 — Setup:    /site-walk/setup   (project/field-project, walk type, plans, contacts, template)
Act 2 — Capture:  /site-walk/capture (photo, video, note, voice, pin, status, offline)
Act 3 — Deliver:  /site-walk/deliverables  (builder + list)
```

### Fixed-Screen Shell Rules

- `AppShell` outer div: `h-[100dvh] overflow-hidden` — no full-page scroll ✅
- Child scroll zone: `overflow-y-auto overscroll-contain` on inner div — contained scroll ✅
- Every `<main>` inside Site Walk must use `100dvh`, not `100vh`
- Individual pages must NOT add `overflow-y-auto` to `<main>` — the AppShell scroll zone handles it
- Exception: capture and fullscreen modes use `fixed inset-0` full-bleed overrides

### Surface Hierarchy (token names — locked)

These tokens must exist in `globals.css` before any new module styling:
- `--app-bg` — page base background
- `--app-panel` — section/panel above page (used for SiteWalkSetupClient, plan room panels)
- `--app-card` — card surface (already exists)
- `--app-card-elevated` — elevated card / modal surface (add)
- `--field-contrast-bg` — high-contrast background for outdoor use
- `--field-contrast-fg` — high-contrast foreground text
- `--field-contrast-border` — high-contrast border

Dark Glass inline classes (`bg-[radial-gradient(...)]`) are correct for page shells. Token aliases are needed for any component that must switch between normal and field-contrast modes.

### Field Project vs Project (product model — NOT YET BUILT)

This is the most critical missing model before Site Walk beta.

| Tier | Creates | Data Entity | Storage Path |
|---|---|---|---|
| Standard / Trial | Field Project | `field_projects` table | `field_projects/{id}/` |
| Business / Enterprise | Full Project | existing `projects` table | `projects/{id}/` |

Required migration: `field_projects` table with columns: `id, org_id, name, walk_type, walk_template, created_by, created_at, updated_at, status, metadata`  
Required FK: `site_walk_sessions.field_project_id UUID NULLABLE REFERENCES field_projects(id)`  
Required tier gate: trial/standard → only `field_projects`; business/enterprise → either  
Required upgrade path: Field Project → convert/import to full Project with all walk data migrated  

### Permission Tiers (not yet enforced)

| Role | Can Do |
|---|---|
| Owner / Org Admin | Everything |
| Org Executive | Read all org walks and deliverables, no edit |
| Project Manager | Full access to assigned projects only |
| Project Contributor | Create/edit items, no deliverables |
| Collaborator | Field capture only on assigned project (3-seat limit per subscriber) |
| Client/Stakeholder Viewer | Read-only via share link, no login required |

Column: `organization_members.role` — enforce in RLS policies.

### Collaborator Shell (not yet native-app-style)

`components/collaborator/CollaboratorShell.tsx` must be rewritten to:
- Dark Glass + `h-[100dvh]` fixed shell
- Mobile bottom nav: `Assigned Work | Walks | Plans | Messages | Account`
- No desktop sidebar (collaborators are field users)
- Capture access limited to assigned projects

### App Store Readiness Gaps

| Item | Status | Priority |
|---|---|---|
| Platform nav: Account tab | ❌ missing | HIGH — do first |
| Setup page: Dark Glass + 100dvh | ❌ violation | HIGH — do first |
| Field High Contrast tokens | ❌ not added | HIGH — before beta |
| Field High Contrast UI toggle | ❌ not built | HIGH — before beta |
| App icon 1024×1024 | ❌ not in manifest | HIGH — App Store Connect requirement |
| Camera pre-prompt explanation UI | ❌ not built | MEDIUM |
| Location pre-prompt explanation UI | ❌ not built | MEDIUM |
| Notification permission flow | ❌ not built | MEDIUM |
| Offline queue active retry | ⚠️ passive only | MEDIUM |
| Push notification backend | ❌ not built | LOW (V2) |
| Capacitor/native wrapper | ❌ PWA only | Required for App Store |

### Corrected Implementation Slice Order

1. **Slice 0 — Lock Shell** (nav, Dark Glass violations, token stubs) — no DB
2. **Slice 1 — Field Project Model** (migration + tier gate + create flow)
3. **Slice 2 — Site Walk Act 1 Complete** (walk type, contacts, template, Start Walk)
4. **Slice 3 — Walks Tab Full** (All/In Progress/Review/Complete/Drafts segmented control)
5. **Slice 4 — Deliverable Builder** (step flow: Type→Items→Branding→Summary→Share→Final)
6. **Slice 5 — Collaborator Shell** (native-app rewrite + limited capture access)
7. **Slice 6 — Permission Tiers** (RLS enforcement)
8. **Slice 7 — App Store Readiness Pass** (icon, pre-prompts, field contrast, Capacitor eval)

## 19. Full V1-to-App-Store Build Sequence (locked 2026-05-02, V1 Foundational corrections applied)

This is the single source of truth for what to build and in what order. Updated from the §18 locked shell doctrine and the four doctrine docs in [`docs/`](docs/).

### Key Architecture Decisions Locked

1. **V1 = Foundational Release** — invite-only, admin-approved, free to download from App Store/Play Store. No public paid subscriptions in V1. No IAP in V1. ASU $1 vendor txn handled outside the app via business invoicing. See [`docs/APP_STORE_AND_OFFLINE_STRATEGY.md`](docs/APP_STORE_AND_OFFLINE_STRATEGY.md) §0.
2. **V2 = Public Monetized Release** — native iOS/Android IAP (evaluate RevenueCat), Apple Small Business Program for 15% commission, website remains marketing-only. Other apps progressively unlocked.
3. **Field Projects and full Projects share the `projects` table** — differentiated by `project_type: 'field' | 'full'`. Upgrade = single column flip.
4. **Capacitor.js is the native wrapper** — no React Native, no TWA, no Expo.
5. **Offline capture is IndexedDB-first** — service worker remains disabled. Local-first capture, background sync.
6. **V1 UI scope = Site Walk + Core Shell + Approval Gate + Executive Viewer + Operations Console** — DB designed for 4 apps, but 360 Tours / Design Studio / Content Studio have ZERO UI in V1 (no "Coming Soon" tiles, no locked icons).
7. **App-neutral shell** — adapts to whatever apps the user has subscribed to.
8. **Banned V1 terminology**: beta, test, demo, coming soon, unfinished, trial experiment, pilot program. Use: Foundational Release, Invite-only, Access pending approval.
9. **App Reviewer accounts** — pre-approved (`is_app_reviewer = true`), bypass pending screen, demo data seeded, credentials provided in App Store Connect + Play Console submission.
10. **Foundational user data rights** — V1 users own their data, retain access for 1+ year after V2 launch, get V2 discount, ASU may negotiate enterprise license at V2.

### Step 1 — Shell Correction (no DB, fast)
- `MobileBottomNav.tsx`: `Work`→`Projects`, add `Coordination`, `More`→`Account`
- `app/site-walk/(act-1-setup)/setup/page.tsx`: Dark Glass + `100dvh`
- `globals.css`: add `--field-contrast-bg/fg/border/accent/card/muted` token stubs (no UI yet)
- Verify typecheck + guards pass → commit

### Step 2 — Approval Gate (V1 CRITICAL, before any user-facing flow)
- Migration: add `account_status`, `is_foundational_user`, `foundational_org_id`, `foundational_data_retention_until`, `v2_discount_eligible`, `is_app_reviewer`, `signup_org_request`, `approved_at`, `approved_by`, `rejection_reason` columns to `profiles`
- Migration: extend `organization_members.role` to include `executive_viewer`, `project_manager`, `project_contributor`
- Update middleware: redirect `pending_approval` users to `/pending-verification` (except `is_app_reviewer = true`)
- Build polished `/pending-verification` page (no shell, no nav, branded waiting screen)
- Build Operations Console approval queue: list pending users, approve/reject UI, assign role + org + entitlements
- Seed at least one App Store reviewer account: pre-approved, demo org, sample Field Project + Walk + Deliverable
- Verify end-to-end: new signup → pending screen → admin approves → user gets full shell on next sign-in

### Step 3 — V1 UI Scrub (remove ghost apps; CRITICAL for App Store approval)
- Audit DashboardClient `ALL_TABS`: remove 360 Tours, Design Studio, Content Studio, Tour Builder
- Audit Command Palette: remove non-V1 app commands
- Audit `/apps/` route: hide non-V1 app tiles entirely (NOT "Coming Soon")
- Audit Quick Actions: only show actions for V1-entitled apps
- Audit landing page (`app/page.tsx`): remove pricing/subscription CTAs visible in V1 native binary
- Search & remove: "beta", "test", "demo", "coming soon", "trial experiment", "pilot program" anywhere in user-facing UI
- Verify cold-start as new approved Site-Walk-only user: only Site Walk concepts visible

### Step 4 — Project Type Migration
- Migration: `projects.project_type TEXT DEFAULT 'field' CHECK (IN 'field','full')`
- Migration: `projects.converted_from_id UUID NULLABLE REFERENCES projects(id)`
- Migration: `projects.converted_at TIMESTAMPTZ NULLABLE`
- Create `lib/project-access.ts`: `canCreateFullProject()` / `canCreateFieldProject()`
- Update project creation API route to enforce tier gate
- Update `SiteWalkSetupClient` to tag sessions with `project_type = 'field'` by default

### Step 5 — SlateDrop Folder Generator
- Create `lib/slatedrop/folder-generator.ts`
- `generateFieldProjectFolders(orgId, projectId)` — creates Site Walk tree
- `generateFullProjectFolders(orgId, projectId, subscribedApps[])` — creates full tree
- Wire call to project creation API route (after project row insert)
- Verify folders created in DB

### Step 6 — Site Walk Act 1 Complete
- Walk-type selection step added to `SiteWalkSetupClient`
- Contacts + collaborator step
- "Start Walk" CTA creates `site_walk_sessions` row → routes to `/site-walk/capture?session={id}`

### Step 7 — Site Walk Act 2 — Offline Capture (Local-First)
- IndexedDB queue for capture items + media
- Background sync when network detected
- Sync status badge in capture shell
- Verify: airplane-mode capture → reconnect → all items synced

### Step 8 — Site Walk Act 3 — Deliverable Builder
- Step flow: Type → Items → Branding → Summary → Preview → Recipients → Send
- Branding auto-loads from `org.brand_settings` (no re-entry)
- Save deliverable to SlateDrop path on send
- Verify end-to-end → commit

### Step 9 — Walks Tab Full
- Segmented control: All | In Progress | Review | Complete | Drafts
- Filter `loadWalks()` by `status`
- New Walk CTA → `/site-walk/setup`
- Resume button on In Progress walks → `/site-walk/capture?session={id}`

### Step 10 — Executive Viewer Role (V1 Required for ASU leadership)
- RLS policies: `executive_viewer` SELECT-only on org-scoped Site Walk tables
- Org overview view: all Field Projects, recent walks, open items, deliverables
- Filters: by user, project, date range
- Read-only mode (all CTAs hidden for executive viewers)

### Step 11 — Collaborator Shell Rewrite
- Dark Glass + `h-[100dvh]` fixed shell
- Bottom nav: Assigned Work | My Walks | Plans | Messages | Account
- No desktop sidebar
- Verify limited capture works (only assigned project sessions)

### Step 12 — Account Deletion UI
- Account → Security tab: surface "Delete Account" button (route already exists)
- Confirm modal before submit

### Step 13 — Field High Contrast Mode
- Account → Preferences: toggle "Field High Contrast"
- Saves to `profiles.preferences.field_contrast_mode`
- Shell applies `.field-contrast` class to root div on load

### Step 14 — App Icon 1024×1024 + Permission Pre-Prompts
- Create/export 1024×1024 app icon; update manifest + Capacitor config
- Camera, microphone, location pre-prompt modals
- Verify all three permission flows work on mobile device

### Step 15 — Capacitor Installation
- Owner review meeting before this step (static export vs server mode)
- Install `@capacitor/core`, `@capacitor/cli`, platform plugins
- Configure `capacitor.config.ts`
- Add iOS + Android platforms
- Test camera, filesystem, offline capture on real device

### Step 16 — Distribution Track Decision (owner sign-off)
- Decide iOS track: Public-gated vs Apple School Manager Custom App for ASU
- Decide Android track: Public Play Store with approval gate vs Closed Testing for ASU
- TestFlight / Play Internal Testing for our own QA pass

### Step 17 — App Store Submission
- Prepare iOS screenshots (6.9" + 6.1" required)
- Prepare Android screenshots
- Write App Store + Play Store listing copy (no banned terms)
- Provide pre-approved reviewer credentials in App Store Connect + Play Console
- Provide 30-second walkthrough video for reviewer
- Submit iOS via Xcode → App Store Connect
- Submit Android via Android Studio → Play Console
- Respond to reviewer feedback
- Approval → ASU Capital Programs Management foundational user program begins

### Step 18 (V2 horizon — NOT V1) — Public Monetization
- Evaluate RevenueCat vs hand-rolled IAP
- Apply for Apple Small Business Program (15% commission)
- Wire IAP entitlement sync to `org_app_subscriptions`
- Public sign-up flow: skip approval gate, allow free trial → IAP upgrade
- Foundational user discount offer flow
- Enterprise license negotiation flow for ASU and similar orgs
- Progressively unlock 360 Tours → Design Studio → Content Studio as each becomes production-ready

---

## 17. Disruptor Pack (Future)

### Step 1 — Shell Correction (no DB, fast)
- `MobileBottomNav.tsx`: `Work`→`Projects`, add `Coordination`, `More`→`Account`
- `app/site-walk/(act-1-setup)/setup/page.tsx`: Dark Glass + `100dvh`
- `globals.css`: add `--field-contrast-bg/fg/border/accent/card/muted` token stubs (no UI yet)
- Verify typecheck + guards pass → commit

### Step 2 — Project Type Migration
- Migration: `projects.project_type TEXT DEFAULT 'field' CHECK (IN 'field','full')`
- Migration: `projects.converted_from_id UUID NULLABLE REFERENCES projects(id)`
- Migration: `projects.converted_at TIMESTAMPTZ NULLABLE`
- Create `lib/project-access.ts`: `canCreateFullProject()` / `canCreateFieldProject()`
- Update project creation API route to enforce tier gate
- Update `SiteWalkSetupClient` to tag sessions with `project_type = 'field'` by default
- Verify → commit

### Step 3 — SlateDrop Folder Generator
- Create `lib/slatedrop/folder-generator.ts`
- `generateFieldProjectFolders(orgId, projectId)` — creates Site Walk tree
- `generateFullProjectFolders(orgId, projectId, subscribedApps[])` — creates full tree
- Wire call to project creation API route (after project row insert)
- Verify folders created in DB → commit

### Step 4 — Site Walk Act 1 Complete
- Walk-type selection step added to `SiteWalkSetupClient`
- "Start Walk" CTA creates `site_walk_sessions` row → routes to `/site-walk/capture?session={id}`
- Fix setup page background + `100dvh` (done in Step 1, verify in context here)
- Verify end-to-end: create field project → choose walk type → start walk → lands in capture → commit

### Step 5 — Walks Tab Full
- Segmented control: All | In Progress | Review | Complete | Drafts
- Filter `loadWalks()` by `status` param
- New Walk CTA → `/site-walk/setup`
- "Resume" button on In Progress walks → `/site-walk/capture?session={id}`
- Verify → commit

### Step 6 — Deliverable Builder (Step-by-Step Flow)
- Step 1: Type selection (Punch / Progress / Inspection / Proposal / Custom)
- Step 2: Item selection (from sessions in project, filter by status/area/trade)
- Step 3: Branding (reads from `org.brand_settings`; no user re-entry)
- Step 4: Summary (manual text + optional AI if credits available)
- Step 5: Preview (PDF mock → then real via existing migration tables)
- Step 6: Recipients (from `org_contacts` + project contacts)
- Step 7: Send (email link / SMS link) + save to SlateDrop path
- Verify end-to-end: select items → add branding → preview → send → appears in deliverables list → commit

### Step 7 — Collaborator Shell Rewrite
- `CollaboratorShell.tsx`: Dark Glass + `h-[100dvh]` fixed shell
- Bottom nav: Assigned Work | My Walks | Plans | Messages | Account
- No desktop sidebar
- Verify limited capture works (only assigned project sessions) → commit

### Step 8 — Account Deletion UI
- Account → Security tab: surface "Delete Account" button
- Calls existing `/api/account/delete` route
- Confirm modal before submit
- Verify → commit

### Step 9 — Field High Contrast Mode
- Account → Preferences: toggle "Field High Contrast"
- Saves to `profiles.preferences.field_contrast_mode`
- Shell reads preference on load; applies `.field-contrast` class to root div
- CSS tokens `--field-contrast-*` applied via `.field-contrast` override block in `globals.css`
- Verify outdoor readability pass → commit

### Step 10 — App Icon 1024×1024 + Permission Pre-Prompts
- Create/export 1024×1024 app icon; add to `public/uploads/`; update manifest
- Camera pre-prompt modal: shown before first capture in a walk
- Microphone pre-prompt modal: shown before first voice note
- Location pre-prompt modal: shown in walk setup when enabling GPS tagging
- Verify all three permission flows work on mobile device → commit

### Step 11 — Capacitor Installation
- **Review meeting required before this step** — static export vs server mode decision
- Install `@capacitor/core`, `@capacitor/cli`, platform plugins
- Configure `capacitor.config.ts`
- Add iOS + Android platforms
- Test on real iPhone and Android device
- Verify camera works, filesystem works, offline capture works → commit

### Step 12 — App Store Submission
- Prepare iOS screenshots (6.9" + 6.1" required)
- Prepare Android screenshots
- Write App Store listing (product description, keywords)
- Submit iOS binary via Xcode to App Store Connect
- Submit Android bundle via Android Studio to Play Console
- Respond to reviewer feedback
- Approval → V1 Foundation user program begins

---

Build LAST, but keep in the roadmap. Design schema hooks NOW.

| Feature | Priority Order |
|---|---|
| WebXR AR Tape Measure | 1 |
| True offline Whisper transcription | 2 |
| On-device object counting (YOLO/ONNX) | 3 |
| VLM progress vs schedule matching | 4 |
| X-Ray BIM Vision | 5 |
| Smart subcontractor assignment (NLP) | 6 |
| QR/barcode asset routing | 7 |
| Low-light auto-enhance | 8 |

### Beta Differentiators (should come right after MVP)

- Auto-weather logging
- Ghost overlay for before/after alignment
- Speech-triggered capture
- Auto-face/plate blur on device
- "Near Me" 360 linkage
- Audio waveform trimmer
- Walk analytics / progress dashboard
- Daily summary email to leadership
- Recurring issue detection (lite)

---

## Appendix: Files This Document Replaces

The following files are now superseded by this document and have been archived or deleted:

- `slate360-context/APP_ECOSYSTEM_EXECUTION_PLAN.md`
- `slate360-context/APP_ECOSYSTEM_FACT_FINDING_PROMPT.md`
- `slate360-context/APP_FOUNDATION_REFACTOR_PROMPT.md`
- `slate360-context/FUTURE_FEATURES.md`
- `slate360-context/FUTURE_MODULES.md`
- `slate360-context/MASTER_BUILD_SEQUENCE.md`
- `slate360-context/PLATFORM_ARCHITECTURE_PLAN.md`
- `slate360-context/PROJECT_HUB.md`
- `slate360-context/REVENUE_ROADMAP.md`
- `slate360-context/SITE_WALK_BUILD_PLAN.md`
- `slate360-context/apps/APP_ECOSYSTEM_GUIDE.md`
- `slate360-context/apps/PUNCHWALK_BUILD_GUIDE.md`
- `slate360-context/refactor/DASHBOARD_REFACTOR_GUIDE.md`
- `slate360-context/refactor/PROJECT_HUB_REFACTOR_GUIDE.md`
- `slate360-context/refactor/SLATEDROP_REFACTOR_GUIDE.md`
- `slate360-context/dashboard-tabs/*/IMPLEMENTATION_PLAN.md` (all per-module plans)
- `slate360-context/dashboard-tabs/*/BUILD_GUIDE.md` (all per-module guides)
- `_archived_docs/*` (all files)
- `docs/archive/*` (all files)


### Desktop Dashboard (As of May 18, 2026)
Dashboard V3 is the live desktop application for Slate360 deployed at `/dashboard`. It introduces the Graphite Glass visual language and stands separate from the Slate360 mobile/PWA App Shell, leveraging real database queries isolated inside RSC try/catch guard blocks.
