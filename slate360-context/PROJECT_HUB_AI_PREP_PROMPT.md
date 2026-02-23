# Slate360 Project Hub Re-Add Prep Prompt (For External AI Assistant)

## Mission
Rebuild and re-enable **Project Hub** in Slate360 with:
1. Tier/entitlement gating that matches dashboard behavior.
2. A functional Project Creation Wizard.
3. Guaranteed persistence into SlateDrop project subfolder structure.

Use this as an implementation prompt and source-of-truth handoff.

---

## Current Repo Context
- Framework: Next.js App Router + Supabase.
- Existing dashboard tier gate source: `lib/entitlements.ts`.
- Existing folder provision endpoint: `app/api/slatedrop/provision/route.ts`.
- Existing Project Hub spec source: `slate360-context/projecthub4.txt`.

### Existing Folder Provision Behavior
`POST /api/slatedrop/provision` currently creates canonical system folders in `project_folders`:
- Documents
- Drawings
- Photos
- 3D Models
- 360 Tours
- RFIs
- Submittals
- Schedule
- Budget
- Reports
- Safety
- Correspondence
- Closeout
- Daily Logs
- Misc

It writes `folder_path` like:
`Projects/{projectName}/{SystemFolder}`
with `parent_id = projectId`.

---

## Required Outcomes

### 1) Tier/Entitlement Gating (MUST)
Use `lib/entitlements.ts` and role checks consistently.

Baseline behavior:
- Users without Hub entitlement cannot access Project Hub routes.
- Users with access can view Project Hub index and project detail.
- Project creation allowed only by role (`owner`, `admin`, `project_manager`) and entitlement.

Apply gating in:
- UI route protection (`/project-hub` and child routes).
- API handlers that create/update projects.

### 2) Project Creation Wizard (MUST)
Wizard should capture at minimum:
- project name
- project code/number
- status
- location
- optional start/end dates
- optional client name

On submit:
1. Create project record in `projects` table.
2. Create/ensure membership/ownership relation (if separate membership table exists for projects).
3. Call `POST /api/slatedrop/provision` with `{ projectId, projectName }`.
4. Verify folders were created.
5. Return success payload including new project id and folder summary.

### 3) Subfolder Persistence Integrity (MUST)
The wizard flow is considered successful only when both are true:
- project row inserted
- system subfolders inserted under `project_folders`

If folder provisioning fails:
- rollback project create if transaction is available, OR
- mark project setup as incomplete and surface retry action.

### 4) Tier 1/2/3 UX Shape (MVP)
Implement from `projecthub4.txt`:
- Tier 1: `/project-hub` project list + My Work + Activity tabs.
- Tier 2: `/project-hub/[projectId]` summary cards.
- Tier 3: tool routes (documents, rfis, submittals, schedule, map, photos).

MVP can use partial placeholders for Tier 3 content, but routing and data contracts must exist.

---

## Data Contract Guidance

## Projects API (suggested)
- `GET /api/projects` -> list projects scoped by org/user and role.
- `POST /api/projects` -> create project and trigger folder provisioning.
- `GET /api/projects/:id` -> project summary + counts.

### Suggested response (create)
```json
{
  "ok": true,
  "project": {
    "id": "...",
    "name": "...",
    "code": "..."
  },
  "folders": [
    { "id": "...", "name": "Documents" }
  ],
  "setupComplete": true
}
```

### Failure response (partial)
```json
{
  "ok": false,
  "error": "Project created but folder provisioning failed",
  "projectId": "...",
  "setupComplete": false,
  "retryProvision": true
}
```

---

## Non-Negotiable Guardrails
- No mock data for project create/list if DB access is available.
- Do not hardcode entitlement tiers in Project Hub logic; use central entitlement helpers.
- Keep routes server-authorized (don’t trust client-only checks).
- Keep naming/path conventions aligned with SlateDrop (`Projects/{projectName}/...`).
- Keep code style aligned with existing App Router API routes.

---

## Validation Checklist
1. Can an entitled user create a project from wizard?
2. Is project visible in `/project-hub` after refresh?
3. Are all 15 system folders present in `project_folders` for that project?
4. Is access denied for non-entitled users?
5. Do API responses handle partial failures clearly?
6. Do all new routes compile and pass `npm run build`?

---

## Helpful Existing Files
- `slate360-context/projecthub4.txt`
- `app/api/slatedrop/provision/route.ts`
- `lib/entitlements.ts`
- `components/dashboard/DashboardClient.tsx` (entitlement/tier patterns)

---

## Deliverable Request to External AI
"Implement Project Hub MVP routes and APIs with entitlement gating and a project creation wizard that persists the project and provisions the canonical SlateDrop subfolder tree. Ensure full compile success and provide a concise migration/run checklist."