# Project Layer + Walk-Start + 360-on-Plan — design & rebuild plan (Jun 28 2026)

> **STATUS UPDATE (Jun 29 2026) — much of the "REBUILD" below is already done.** A 2-agent scan
> (code-map + user-journey trace) found the create wizard (`CreateProjectWizard.tsx`), mobile wizard,
> `/projects` list, and the `[projectId]` detail shell + tabs (Overview/Walks/Plans/Twins/Files/
> Deliverables/Team) **already exist and are token-clean** — the "slop" labels are stale. The real
> remaining work is narrower (tier surfacing, contacts desktop hub, calendar, guided upload, 360-on-
> plan share). **Done Jun 29 (b95dc4b8):** closed the journey dead-ends — Twin-from-project now threads
> `projectId` (was dropping context), Overview has a one-click "Start a Site Walk" tile, create
> redirects into the new project home, and two design-token fixes. Treat the table's "REBUILD" as
> "POLISH/EXTEND," not greenfield.


## The core finding (audit)
**The backend/data is far stronger than the UI.** Sound tables + APIs already exist for
projects, files (SlateDrop), contacts, sessions, plans, and tier-gating. The **UI surfaces
are the slop** — legacy/AI-generated, inconsistent tokens, mobile-only gaps, no desktop hubs.
**Rule for this whole layer: REUSE the data/API, REBUILD the screens.** Do not re-architect
the schema; do not trust the existing screens as design references.

## What exists (keep) vs what to rebuild
| Area | Data/API (KEEP) | UI verdict |
|---|---|---|
| Project CRUD | `projects` (+`project_type` field/full, `report_defaults`, `brand_settings`), `project_members`, `POST /api/projects/create` (tier-gated + SlateDrop folder provisioning + rollback), `GET /api/projects`, `projectDetailTabs.ts` registry | **REBUILD** create wizard + selection/list; KEEP detail-shell tab pattern |
| Files / docs | SlateDrop: `project_folders` (Photos/Plans/Deliverables/Intake/Submissions auto-provisioned via `lib/slatedrop/provisioning.ts`), `slatedrop_items` (s3_key, visibility), `plan_sets` (+ conversion pipeline) | **REBUILD** as guided, type-aware upload (plans/contracts/construction docs); KEEP backbone |
| Contacts | `org_contacts` (name/email/phone/company/title/tags/color), `contact_projects` M:N (global ↔ project), full `/api/contacts` CRUD + filter | **BUILD desktop hub**; wire to collaborators + deliverable recipients + comms |
| Calendar | `calendar_events` (implied; schema under-documented), `/api/calendar` CRUD, `loadCoordinationCalendar` | **CLARIFY schema + migration**, build desktop view, add external sync (ICS/Google) |
| Walk-from-project | `site_walk_sessions` (project-scoped), `site_walk_items.plan_attachments` (sheet+pin), `POST /api/site-walk/sessions` | **BUILD start-walk screen + plan picker** (clean vs additive); backend ready |
| Tier gating | `lib/entitlements.ts`, `org_app_subscriptions` + `resolveModularEntitlements`, `resolve-walk-start-tier.ts`, CEO override | **SURFACE** tier badge + gate messaging + upsell; logic is solid |

## The unified workflow (one loop, two form-factors)
Create/Select Project → add stakeholders (contacts) + milestones (calendar) → upload docs
(plans / contracts / construction docs, type-tagged into SlateDrop folders) → **Start Walk
from project** → pick plan (clean OR additive-with-prior-pins) OR no-plan → capture (Site Walk
/ 360) → deliverable → share to stakeholders (360-on-plan, permissions via SlateDrop).

**App (phone): focused, one-decision-per-screen.** Project picker → project home (compact
cards: Walks / Plans / Files / Team / Deliverables) → big "Start Walk" → plan picker sheet →
capture. Contacts/calendar are compact sheets.

**Desktop (login): multi-pane workspace that FILLS space, not an app mirror.** Project home =
left rail (sections) + center workspace + right context (stakeholders/upcoming milestones).
Files = explorer (folders left, grid center, preview right). Contacts = full hub table +
detail. Calendar = month/week grid. Reuse Graphite Glass; no amber; no scrolling-list-as-tab.

## Tier gating (locked)
- **Base Site Walk:** projects, no-plan walks, photos, notes, voice, deliverables.
- **Higher tier (Pro):** **360 photos** + **walks-with-plans** (plan pinning, additive, 360-on-plan).
- Enforce server-side at session/plan start (`resolve-walk-start-tier.ts`) AND surface in UI:
  tier badge in project header, locked controls show "Upgrade to Pro" affordance (not hidden).
- Contacts + calendar are available to all tiers (collaborator COUNT is tier-limited).

## The 360-on-plan loop — remaining pieces to make it complete
1. **SW-007** stakeholder **360-on-plan share viewer**: shared link → plan sheet → tap pin →
   open the 360 (reuse `TourPanoViewer`). Build the public/share path (`/view` or `/share`).
2. **DEL-002** plan pages + clickable pins **inside the deliverable** (author-selectable plan +
   which pins). Today deliverables have no plan context.
3. **Plan picker at walk start**: choose plan; "clean" (fresh layer) vs "additive" (load prior
   pins to build on — `metadata.prior_session_id` + load prior items as a read-only layer).
4. **Plan-walk capture path**: the plan-pin capture (distinct from `NoPlansCaptureCanvas`) —
   confirm it renders the selected plan, supports pin placement, and respects clean/additive.

## Contacts ↔ everything (project-specific comms)
`org_contacts` global + `contact_projects` link already supports "select stakeholders into a
project." Wire those project contacts as the source for: deliverable share recipients, email/
text targets, and SlateDrop view/upload permissions. A project's "Team/Stakeholders" tab =
project-linked contacts + their role + their SlateDrop permissions + quick comms actions.

## Calendar ↔ projects
Global calendar + `project_id`-scoped events. Project milestones surface in the project home
right rail and feed reminders. Add ICS export first (cheap, universal), Google sync later.

## Build sequence (proposed slices)
1. **Start-Walk-from-Project + plan picker** (clean vs additive) — closes the capture entry the
   user asked for; backend ready. [app first, then desktop]
2. **360-on-plan completion**: SW-007 share viewer + DEL-002 plan pins in deliverable.
3. **Project create wizard rebuild** (replace `CreateProjectWizard` slop) — app + desktop.
4. **Project home rebuild** (selection + workspace) — app focused / desktop multi-pane.
5. **Guided document upload** (type-aware: plans/contracts/construction docs) on SlateDrop.
6. **Contacts desktop hub** + project-stakeholders tab + comms/permission wiring.
7. **Calendar**: schema clarity + desktop view + project milestones + ICS.
8. **Tier surfacing**: badge + gate messaging + upsell.

## Clarifications (multi-AI panel + Brian, round 2)
- **Desktop entry model:** after login, the user clicks **Site Walk** or **Twin 360** and works
  in that respective tab/workspace. The project layer (projects, contacts, calendar, SlateDrop)
  is shared Slate360 infrastructure that BOTH Site Walk and Twin 360 consume.
- **Desktop walk ≠ capture:** you don't capture with a computer. On desktop a "walk" is assembled
  by **uploading photos/files from the computer**; phones/tablets do the actual capture. Desktop =
  upload + organize + author deliverables; mobile = capture.
- **Dual tiers for BOTH apps:** Site Walk has lower/upper tiers (upper = 360 + walks-with-plans);
  Twin 360 also has lower/upper tiers. Gate visibly, never hidden (TierGateCard + contextual upgrade).
- **App-shell ecosystem parity:** Slate360 shell contains Site Walk (green `--graphite-primary`) and
  Twin 360 (blue `--twin360-blue`) shells. They must feel like ONE premium ecosystem (same Graphite
  Glass grammar; only the accent differs). Both shells currently look rough/unpolished and are slated
  for a redo to match the rest.
- **SlateDrop is first-class (don't forget it):** a Dropbox/Finder/Explorer-class file system —
  store files, **automatic routing/saving** (intent → folder), and **secure-link permissions**
  (grant view / download / upload to others). UI is **desktop-optimized** (explorer: folders left,
  grid center, preview right) AND **app-optimized**, with full functionality on both and a mental
  model familiar to Explorer/Finder users. Every app/feature should take advantage of SlateDrop.
- **Design bar:** match the praised `/preview/*` harness quality. Build previews first for the
  project-layer surfaces, get approval, then wire to the sound backend.

## Consensus design (8 AI passes, reconciled — all agreed)
Desktop = **rail + center + context** 3-pane + **⌘K** command palette (Linear/Notion grammar).
Phone = **one-decision-per-screen** focused stack, 56–72px targets, capture FAB. **Intent-first
upload** (never expose the folder tree). Contacts = global hub + project stakeholders, **preset
permissions** (matrix is desktop-only; phone shows read-only access + comms). **Clean vs Additive**
plan choice with **prior pins as a dimmed read-only underlay** (never editable). **ICS export
first**, Google two-way later. **Tier = visible-but-locked**, upgrade at moment of intent (name the
exact feature). Build order universally recommended: **shell + project home FIRST** (everything
mounts in it), then start-walk/plan-picker, intent upload, stakeholders, tier surfaces, 360-on-plan
share, calendar/ICS, create-wizard, contacts hub.

See [[slate360-project-layer-rebuild-plan]], [[slate360-projects-redesign]],
[[slate360-project-coordination-design]], [[slate360-business-model-projects]],
[[slate360-walks-with-plans-plan]], [[slate360-legacy-projecthub]], docs/TWIN360_CAPTURE_GAPS.md.
