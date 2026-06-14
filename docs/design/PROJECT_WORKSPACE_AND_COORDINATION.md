# Slate360 — Project Workspace, SlateDrop, Collaborators & Coordination Hub

Enterprise design, grounded in the existing codebase. Slate360 is app-centric
(Site Walk + Twin 360) with a web portal for logged-in users. A **Project** is the
unit of context; everything (files, walks, twins, issues, deliverables, people)
lives inside a project. The **Coordination Hub** is the org-wide layer (people,
schedule, comms) that spans all projects.

---

## 0. What already exists (we build on, not rebuild)

| Capability | Where | Status |
|---|---|---|
| Per-project file system (auto-provisioned folder taxonomy) | `lib/slatedrop/folder-taxonomy.ts`, `provisioning.ts` | ✅ built |
| Site Walk captures auto-route to `02_Site_Walk/*`; Twin assets to `03_Digital_Twin/*` | taxonomy + capture pipeline | ✅ built |
| Deliverable distribution (email/SMS share, expiry, view/download) | `app/api/slatedrop/secure-send`, `request-link` | ✅ built |
| Project file explorer (scoped) | `components/slatedrop/ProjectFileExplorer.tsx` | ✅ built |
| Collaborator seats, tier-gated | `lib/entitlements.ts` (`maxCollaborators`: 0 / 3 / 10 / ∞), `project_members.role='collaborator'` | ✅ built |
| Collaborator invite/revoke + seat usage | `app/api/projects/[id]/collaborators/*` | ✅ built |
| Contacts CRM linked to projects | `components/coordination/contacts/*` (`contact_projects`) | ✅ built |
| Coordination Hub: Inbox / Contacts / Calendar | `components/coordination/*` | ⚠️ exists, old flat styling |
| Project workspace tabs (Overview/Walks/Twins/Files/Team/Photos/Issues) | `app/(dashboard)/projects/[projectId]/*` | ⚠️ exists, needs cohesion + no-scroll + cover image |
| Project audit export | `app/api/slatedrop/project-audit-export` | ✅ built |

**Implication:** the deep work is *integration + polish*, not greenfield.

---

## 1. Project ↔ SlateDrop (the file system)

**Principle: SlateDrop IS the project's file system.** Every project auto-provisions a
numbered taxonomy root:

```
01_Project_Info   → Contracts, Drawings, Permits, Specs, Insurance
02_Site_Walk      → Photos, Notes, Voice_Memos, Plans, Deliverables, Data
03_Digital_Twin   → Clips, Models, Source_Assets, Deliverables
04_PM_Documents   → RFIs, Submittals, Schedule, Budget, Daily_Logs, Reports,
                    Records, Safety, Correspondence, Closeout
05_Team_Shared    → Uploads, Shared_Links
```

- **Captures auto-file:** Site Walk photos/notes/voice/plans land in `02_Site_Walk/*`;
  twin clips/models in `03_Digital_Twin/*`; generated reports in the relevant
  `Deliverables` folder. The user never manually sorts.
- **Project "Files" tab** = a `ProjectFileExplorer` rooted at this project's taxonomy.
  Uploads in-context route to the right folder (plans → `01_Project_Info/Drawings`
  or `02_Site_Walk/Plans`; official docs → `01_Project_Info`).
- **Attachments** the user described (plans, reports, official documents) are simply
  uploads into the taxonomy — already supported; the workspace just needs an
  in-context upload affordance per area.
- **Cross-project** files surface in the org-level SlateDrop; project-scoped files
  surface in the workspace. One storage system, two lenses.

---

## 2. Project Workspace — "working in a project"

A **no-scroll, tabbed workspace shell** (mirrors the Thermal Studio shell pattern we
just shipped). Tabs are real pages; nothing is one long scroll.

```
[ Project: Oak Ridge Roof ]   (cover image = a site-walk photo or twin still)
 Overview │ Site Walks │ Twins │ Files │ Issues │ Team │ Deliverables
```

- **Overview** — cover image hero; at-a-glance: # walks, open issues, recent
  activity feed, team avatars, next scheduled items (from Coordination calendar).
- **Site Walks** — every walk *in this project's context* (a project can have
  unlimited walks; they stay scoped here). Status, assignee, date. "New walk" +
  "Assign walk" (to a collaborator).
- **Twins** — digital twins for this project.
- **Files** — scoped SlateDrop taxonomy (section 1).
- **Issues** — unified issue tracker fed by walk findings (punch-list/observations
  rolled into "Issues"): location, severity, status, before/after photos, assignee.
- **Team** — collaborators + seats (section 3): invite, assign walks, roles.
- **Deliverables** — generate reports (ties to report templates), then distribute
  via Coordination (section 4): email/SMS to contacts or a group, or share link.

**Value beyond a list:** the Overview leads with a *picture* (walk/twin) + live
status, not a scrollable list. Lists are secondary.

---

## 3. Project Creation Wizard — sets up the context

The wizard's job is to **create the container and everything downstream needs.**
On finish it provisions: the project record + the full SlateDrop taxonomy
(`provisioning.ts`) + initial context.

**Steps:**
1. **Basics** — name, project type (roof / commercial / residential / inspection /
   custom), client, site address (geocoded for the location widget).
2. **Context & cover** — optional plan/drawing upload (→ `01_Project_Info/Drawings`),
   optional site photo (becomes the card/cover image).
3. **Team** — invite collaborators (seat-gated by tier), set roles; link existing
   Contacts to the project.
4. **Defaults** — report template, units (°F/°C, default °F), branding.
5. **Create** → provisions taxonomy, seeds an empty first walk, links contacts,
   applies defaults. The user lands in the workspace Overview.

**Why it matters:** because the wizard establishes type + folders + team + defaults,
every later action (a walk, an upload, a report) already has a correct home and
context — no orphaned files, no manual sorting.

---

## 4. Collaborators (higher tier) — limited collection app

- **Seats are tier-gated:** free 0, mid 3, pro 10, enterprise ∞ (`maxCollaborators`).
  Counted as active `project_members.role='collaborator'` + pending invites.
- **Invite** by email; they download the app and authenticate.
- **Scoped, collect-only experience:** a collaborator entitlement profile grants
  *only*: capture photos/data, complete **assigned** walks, upload before/after
  conditions. It denies: creating deliverables, accessing other projects, the full
  Slate360 suite, org management. (New `entitlements` profile: `isCollaborator`.)
- **Walk assignment:** in the project Team/Walks tab, assign a specific walk (or set
  of tasks) to a collaborator. On their app they see **only** assigned items; on
  completion the data syncs back into the project context.
- **Use case:** a subcontractor documents before/after to prove completion — they
  collect, you keep control of deliverables.

---

## 5. Coordination Hub — org-wide people, schedule & comms

Available to **all users**, spanning **all projects**. Three pillars (rebuild the
styling to Graphite Glass; the data layer exists):

- **Contacts (CRM)** — name, company, title, email, phone, tags, notes, linked
  projects (`contact_projects`). Enterprise: **groups / distribution lists**, roles,
  bulk assign to projects. This is the address book for the whole org.
- **Calendar** — a **cross-project schedule**: walk dates, deliverable due dates,
  collaborator assignments, and personal events all surface as calendar items.
  Reminders. Each user organizes their own schedule across every project.
- **Inbox** — notifications, external responses (RFI/submittal/share replies),
  share/activity events.

**Deliverable distribution (the "send to groups" requirement):** from any deliverable
or file, "Send" → pick **contacts or a group** → choose channel (email / SMS, via
`secure-send`) or generate a share link with expiry + view/download permission.
Sends are tracked. This is how a finished report reaches a client, a crew, or a
stakeholder group in one action.

---

## 6. Enterprise-grade touches

- **Security:** RLS on all tables, time-limited signed share links, seat enforcement,
  audit export per project (already built).
- **Branding:** org logo + report templates on deliverables (thermal report template
  system already exists; generalize it).
- **Permissions matrix:** subscriber (full) vs collaborator (collect-only) vs external
  recipient (view/download via link).
- **Naming:** keep **"Coordination Hub"** (already established) over "Command Center."

---

## 7. Recommended build sequence

1. **Project workspace shell** — no-scroll tabbed shell + cover image on Overview
   (reuse the Thermal Studio shell pattern + existing tab pages). Highest visible value.
2. **Project creation wizard** — 5-step wizard calling existing provisioning.
3. **Collaborator assignment + collect-only entitlement profile** — walk assignment UI
   + the scoped app entitlements.
4. **Coordination Hub redesign** — Graphite Glass restyle, cross-project calendar,
   contact groups, deliverable distribution to groups.
5. **Real card images** — populate project/twin card images from a recent walk photo /
   twin still (dashboard polish; rendering already shipped).
