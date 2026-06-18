# Slate360 — Project Bridge Plan (merged, authoritative)

**Goal:** the shortest reuse-first path to *create a project → open it → upload/select a plan → start a walk on that plan*. The capture engine, SlateDrop provisioning, project tabs, wizard skeleton, and collaborator APIs already exist. The gap is the **front door (bare hub list)**, a **cohesive no-scroll workspace**, the **people surfacing**, and one **broken hand-off route**.

This doc merges the original bridge plan with four independent AI critiques and **verified code facts**. Where they conflicted, the decision is recorded under "Locked decisions."

---

## 0. Verified code facts (don't re-litigate)
- **The Plans→capture route is BROKEN.** `ProjectPlansTab.startWalk()` pushes `/site-walk?projectId&planSetId`; Site Walk home ignores those params. Capture lives at `/site-walk/capture-v2?session=…&plan=…`. → **Phase 0 fixes this. The bridge is not "done when the workspace exists."**
- **Real SlateDrop taxonomy** (`lib/slatedrop/folder-taxonomy.ts`): `01_Project_Info` (Drawings) · `02_Site_Walk` (Plans, Deliverables) · `03_Digital_Twin` · `04_PM_Documents` · `05_Team_Shared`.
- **Plan storage duality:** the walkable plan lives in **`site_walk_plan_sets`** (DB, source of truth for walking); the uploaded PDF is mirrored to **`01_Project_Info/Drawings`**. Builders must not duplicate or mis-route.
- **Real workspace tabs (7):** Overview · Site Walks · Plans · Twins · Issues · Files · Team (`projectDetailTabs.ts`).
- **Cross-org sharing is NOT supported today** (`docs/audit/COLLABORATION_ORG_ACCESS_AUDIT.md`). Treat cross-org as *enhanced collaborators*, not federation.
- **`CreateProjectWizard` still uses amber** — de-amber during reimagination.

## 0a. Product scope note — PM tools removed
RFI / submittals / schedule / budget (PM tools) are **out of product scope** and are **not** a tier differentiator. Tiers differ by other features (collaborator count, storage, credits, plan-pinning). The `04_PM_Documents` SlateDrop folder may remain as a generic document home, but **no PM UI/tabs** ship. "Issues" stays only as the walk-finding/punch roll-up (a Site Walk output, not a PM tool) — keep minimal or fold into walk review; do not expand.

---

## 1. The locked, intuitive IA

**Three surfaces. Workspace tabs capped at 7. No page scroll anywhere (lists are bounded `overflow-y-auto`).**

### Projects Hub (front door)
- Prominent **+ New Project**; stat strip; **Continue** featured card (cover = walk photo › twin still › map snapshot).
- **Bounded expandable card container** (the app-shell pattern), filter chips: All / Active / Shared-with-me / Archived.
- Coordination quick-access (≤4 icons on mobile) → org-level hub, not per-project.

### Project Workspace (reuse the 7 existing tabs)
Order: **Overview · Plans · Site Walks · Files · Team · Deliverables · Issues**
- **Twins** hidden under `APP_STORE_MODE` (hard hide, no "coming soon").
- **Settings** lives in an overflow ⋮ menu (rename, archive, audit export, delete) — **not** a tab.
- **Coordination (Contacts/Calendar/Inbox) stays org-level** — linked from Overview, never forked per project.
- Reuse `ThermalStudioShell` no-scroll pattern (`flex h-full min-h-0 flex-col` + stage switcher) + `MobileExpandableTabbedPanel`. Do not invent a third shell.

### Mobile vs desktop
- **Mobile:** 4 primary tabs visible (Overview · Plans · Site Walks · Files) + **More** sheet (Team · Deliverables · Issues). Horizontal scrollable tab bar, teal active.
- **Desktop:** left sub-rail or denser top tabs; all 7 visible; side panels (activity, metadata, recent files).
- Cover image = compact 72–96px band on Overview only, not a hero on every tab.

---

## 2. The walk-with-plans hand-off (Phase 0 — the actual blocker)
`ProjectPlansTab` "Start walk on this plan" must:
1. Guard: plan set `status === "ready"` (else disabled with reason).
2. **Create or resume** a `site_walk_sessions` row for `(projectId)` via `POST /api/site-walk/sessions`.
3. **Deep-link** to `/site-walk/capture-v2?session=<id>&plan=<planSetId>` (the canonical capture route → `WithPlansCaptureCanvas`).
- Canonical capture engine for plan walks = **capture-v2 + `WithPlansCaptureCanvas`** (retire the legacy `(act-2-inputs)/capture` path from the plan-walk flow).

---

## 3. Plans tab — states (must design)
`queued → converting → ready → failed → archived`, plus `superseded`. Polling while converting (rasterize runs via Trigger.dev); retry on failed; "Set as current plan." "Start walk" disabled unless `ready`.

## 3a. State matrix (design all of these)
- **Hub:** skeleton · fetch-error+retry · zero-projects (drives +New) · empty filter · stale-after-create refresh.
- **Wizard:** draft-restore banner · exit-without-saving · geocode fail · map-snapshot fail · provisioning fail mid-create (project still exists; Files shows a **repair/provision** action).
- **Workspace:** not-found/403 · viewer read-only (actions hidden consistently, with reason) · tier-gated Twins.
- **Walks:** in-progress resume · offline queue badge · collaborator "assigned-only" empty.
- **Team:** seat-limit reached (409) · pending invite expired · revoke in-flight.
- **Offline (v1 = explicit):** walk pin queue exists; project create / invite / plan upload are **online-only in v1** — state it.

---

## 4. Reimagined creation wizard (3 steps)
1. **Basics** (required: name; optional type chips, client, status).
2. **Location** (encouraged; reuse `WizardLocationPicker`; map snapshot → cover via `/api/static-map`).
3. **Confirm & create** — render the real `folder-taxonomy.ts` tree ("Captures file automatically — you won't sort manually") + Create.
- People moves to the **Team tab** post-create. De-amber the wizard.
- **Draft = localStorage** (`slate360:project-wizard-draft` + timestamp), restore banner, clear on success. No server draft table in v1.
- On create: insert project (`org_id` from context) → `provisioning.ts` → seed creator as owner → cover snapshot → land on **Overview** (toast "Folders ready").

---

## 5. People & access — "enhanced collaborators," not federation (v1)
- **One owning org** (`projects.org_id`); never co-owned.
- **Billing/storage/credits/seats → always the owning org.** External collaborators **count against the owner's `maxCollaborators`** (pending invites included).
- **Invite by email:** if already a Slate360 subscriber, link `project_members` only (no org merge); else invite → redeem → `project_members`.
- **Guest UX:** the **collaborator shell** (`/collaborator`), not the full workspace, until explicitly promoted.
- **Visibility:** owning-org leadership sees the project (read + reassign walks, no silent content edits); the **guest's** org leadership does **not** see it. Project shows in the guest's "Shared with me" only.
- **Single source of truth = `project_members`** + `is_external` flag. One helper `canAccessProject(userId, projectId)`; never mix org-RLS with membership without an `is_external` guard. RLS test matrix: same-org admin · external collaborator · cross-org admin viewing foreign project.
- **Org umbrella:** all of a company's users are `organization_members`; every project they create is stamped `org_id` = their org; leadership (owner/admin) gets a portfolio view of all org projects + activity.
- **Archive (soft), not hard delete** in v1 (`is_archived` + filter + unarchive); retention then owner-confirmed purge. SlateDrop assets retained. Project **activity/audit feed** (reuse `project-audit-export`).

---

## 6. Build sequence (reuse-first; Phase 0 first)
0. **Plans→capture route fix** (session create/resume → capture-v2 deep-link). *Unblocks walking on a plan.*
1. **Projects Hub** (mobile + desktop): bounded card container, +New, filters, Continue card. Replace bare list bodies.
2. **No-scroll workspace shell** + Overview/Plans/Walks bounded + Graphite-Glass; Settings → ⋮ menu.
3. **Wizard** trim to 3 steps + confirm tree + localStorage draft + de-amber.
4. **Team** tab: collaborator APIs, seats, "detect existing subscriber" invite, external badge, walk assignment.
5. **Files** in-context upload (scoped SlateDrop) + provisioning repair action.
6. **Deliverables** (light, project-scoped) + soft archive + activity feed.
7. **Leadership portfolio** (org-scoped list for admins: read + reassign).
- **Defer:** per-project Coordination/Contacts/Calendar/Inbox, schedule/budget parse, true cross-org federation. PM tools = out of scope entirely.
- Each slice: mobile + desktop, `typecheck:changed`, guards, `/preview/*` harness, device-test Phases 0–3.

---

## 7. Locked decisions
| Decision | Locked |
|---|---|
| Primary v1 outcome | Create → upload/select plan → start walk (the only success metric for the bridge) |
| Cross-org model | Enhanced collaborators (detect existing subscriber); no federation v1 |
| Billing/credits/storage | Owning org always |
| External collaborator seats | Count against owner's `maxCollaborators` |
| Leadership reach | Read + reassign walks on owned projects; no silent content edits; audited |
| Tabs | 7 max (4 + More on mobile); Settings in ⋮; Coordination org-level |
| Twins | Hard-hidden under `APP_STORE_MODE` |
| PM tools (RFI/submittal/schedule/budget) | **Out of product scope; not a tier differentiator** |
| Archive vs delete | Soft archive + retention; delete = typed confirm |
| Canonical capture route | capture-v2 + `WithPlansCaptureCanvas` for plan walks |
| Wizard depth | 3 steps; People post-create |
| Draft persistence | localStorage v1 |
| Plan source of truth | `site_walk_plan_sets` for walking; mirror PDF to `01_Project_Info/Drawings` async |
| Taxonomy | `01_Project_Info` · `02_Site_Walk` · `03_Digital_Twin` · `04_PM_Documents` · `05_Team_Shared` |
