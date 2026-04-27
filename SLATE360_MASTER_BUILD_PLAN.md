# Slate360 — Master Build Plan

**Created:** 2026-04-11
**Status:** ACTIVE — Single source of truth for all build direction
**Supersedes:** All prior planning docs in `slate360-context/`, `_archived_docs/`, `docs/archive/`

> **Rule:** If this file and any other doc conflict, THIS FILE wins.

> **Site Walk detail source:** `docs/SITE_WALK_MASTER_ARCHITECTURE.md` is the authoritative module-level blueprint for Site Walk workflow, monetization guardrails, collaborator UX, App Store mode, Act 1/2/3 routing, and non-PDF deliverables. It must remain aligned with this master plan.

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

### Things to Meter (later)

Total storage, active projects, active share links, external recipients, report exports, proposal exports, AI note cleanups, long-term hosted deliverables, large media uploads, bundled immersive content usage.

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

### Phase 1 — Slate360 Core Stabilization

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

## 17. Disruptor Pack (Future)

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

