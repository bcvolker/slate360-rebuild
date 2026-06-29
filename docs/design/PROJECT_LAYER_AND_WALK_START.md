# Project Layer + Walk-Start + 360-on-Plan — design & rebuild plan (Jun 28 2026)

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

See [[slate360-project-layer-rebuild-plan]], [[slate360-projects-redesign]],
[[slate360-project-coordination-design]], [[slate360-business-model-projects]],
[[slate360-walks-with-plans-plan]], [[slate360-legacy-projecthub]], docs/TWIN360_CAPTURE_GAPS.md.
