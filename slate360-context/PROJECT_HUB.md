# Slate360 — Project Hub Blueprint

**Last Updated:** 2026-03-13
**Context Maintenance:** Update this file whenever Project Hub routes, components, API endpoints, tool views, or creation/deletion flows change.

---

## 1. 3-Tier URL Structure

```
/project-hub                                ← Tier 1: all projects grid (834 lines — needs extraction)
/project-hub/[projectId]                    ← Tier 2: project home (143 lines)
/project-hub/[projectId]/rfis              ← Tier 3: RFIs (~340 lines)
/project-hub/[projectId]/submittals        ← Tier 3: Submittals (~580 lines)
/project-hub/[projectId]/documents          ← Tier 3: alias for slatedrop
/project-hub/[projectId]/slatedrop          ← Tier 3: SlateDrop files (38 lines, embeds SlateDropClient)
/project-hub/[projectId]/schedule           ← Tier 3: Schedule (~472 lines)
/project-hub/[projectId]/budget             ← Tier 3: Budget (~425 lines)
/project-hub/[projectId]/photos             ← Tier 3: Photos (~601 lines)
/project-hub/[projectId]/drawings           ← Tier 3: Drawings (~450 lines)
/project-hub/[projectId]/daily-logs         ← Tier 3: Daily Logs (~362 lines)
/project-hub/[projectId]/punch-list         ← Tier 3: Punch List (~408 lines)
/project-hub/[projectId]/observations        ← Tier 3: Observations (~285 lines)
/project-hub/[projectId]/management          ← Tier 3: Management (~934 lines)
/project-hub/[projectId]/records            ← Tier 3: Records
/project-hub/[projectId]/map               ← Tier 3: Map
/project-hub/[projectId]/team              ← Tier 3: Team
/project-hub/[projectId]/settings          ← Tier 3: Settings
```

**9 of 14 Tier-3 files exceed the 300-line limit.** All need component extraction.

---

## 2. Shared Project Hub Components

### ViewCustomizer (`components/project-hub/ViewCustomizer.tsx`)
- Hook: `useViewPrefs(storageKey, defaultCols)` — loads/saves preferences to localStorage
- Component: density toggle (compact/normal/comfortable) + per-column visibility checkboxes
- Storage key pattern: `viewprefs-{tool}-{projectId}`
- Utility: `densityClass(density)` — returns Tailwind padding/text-size classes for table rows
- **Present on:** ALL 9 tool pages

```tsx
const [viewPrefs, setViewPrefs] = useViewPrefs(`viewprefs-rfis-${projectId}`, defaultCols);
<ViewCustomizer storageKey={`viewprefs-rfis-${projectId}`} cols={colDefs}
  defaultCols={defaultCols} prefs={viewPrefs} onPrefsChange={setViewPrefs} />
```

### ChangeHistory (`components/project-hub/ChangeHistory.tsx`)
- Right-side slide-over panel showing a record's change timeline
- Helper: `buildBaseHistory(record)` — derives `HistoryEntry[]` from `created_at`, `updated_at`, `closed_at`, `completed_at`
- Shows SlateDrop subfolder indicator badge: `Saved to: /Projects/…/{subfolder}/`
- **Present on:** RFIs, Submittals, Daily Logs, Punch List, Budget, Schedule (row-level History button)
- **Not on:** Drawings, Photos (SlateDrop-backed, files *are* the history), Management (no single-record panel needed)
- **Status:** `project_activity_log` write events are wired in core CRUD routes (RFIs, Submittals, Schedule, Budget, Punch List, Daily Logs, Observations, Records, Management Contracts). UI still uses `buildBaseHistory` until read-side integration is completed.

```tsx
const [historyItem, setHistoryItem] = useState<RFI | null>(null);
<ChangeHistory open={historyItem !== null} onClose={() => setHistoryItem(null)}
  title={historyItem?.subject ?? ""}
  entries={historyItem ? buildBaseHistory(historyItem) : []}
  subfolder="RFIs" />
```

### SlateDrop Auto-Save Coverage

| Page | Has File Uploads | SlateDrop Wired | Target Folder |
|---|---|---|---|
| RFIs | ✅ Yes | ✅ `saveProjectArtifact("RFI")` | `/RFIs/` |
| Submittals | ✅ Yes | ✅ `saveProjectArtifact("Submittal")` | `/Submittals/` |
| Budget | ✅ Snapshots | ✅ snapshot route | `/Budget/` |
| Schedule | ✅ Snapshots | ✅ snapshot route | `/Schedule/` |
| Contracts (Management) | ✅ Yes | ✅ Direct S3 + slatedrop_uploads | `/Submittals/` |
| Drawings | Reads SlateDrop | N/A — reads from folder | `/Drawings/` |
| Photos | Reads SlateDrop | N/A — reads from folder | `/Photos/` |
| Daily Logs | ❌ Text only | ✅ Activity log writes wired | `/Daily Logs/` |
| Punch List | ❌ Text only | ✅ Activity log writes wired | `/Reports/` |
| Observations | ❌ Photos placeholder | 🟡 Planned (Records) | `/Records/` |

---

## 3. Tier Gating

| Tier | Access |
|---|---|
| trial | ✅ full access (trial period) |
| creator | ❌ no access |
| model | ❌ no access |
| business | ✅ full access |
| enterprise | ✅ full access |

Gate check: `getEntitlements(tier).canAccessHub`

---

## 4. Project Creation Flow

```
POST /api/projects/create
→ validates user auth + org membership
→ creates `projects` row (with metadata.location from WizardLocationPicker)
→ provisions canonical SlateDrop project subfolders (all is_system = true)
→ returns { projectId }
```

### WizardLocationPicker
- Uses `AutocompleteSuggestion.fetchAutocompleteSuggestions()` (new Google Places API)
- Custom polygon drawing via `google.maps.Polyline` + `google.maps.Polygon` (DrawingManager removed)
- Stores lat/lng in `projects.metadata.location`

### Project Subfolders (auto-provisioned)
```
/Projects/{projectId}/Documents/
/Projects/{projectId}/Drawings/
/Projects/{projectId}/Photos/
/Projects/{projectId}/3D Models/
/Projects/{projectId}/360 Tours/
/Projects/{projectId}/RFIs/
/Projects/{projectId}/Submittals/
/Projects/{projectId}/Schedule/
/Projects/{projectId}/Budget/
/Projects/{projectId}/Daily Logs/
/Projects/{projectId}/Reports/
/Projects/{projectId}/Records/
/Projects/{projectId}/Safety/
/Projects/{projectId}/Correspondence/
/Projects/{projectId}/Closeout/
/Projects/{projectId}/Misc/
```

---

## 5. 2-Step Project Deletion

1. **Modal:** User types project name to confirm
2. **API:** `DELETE /api/projects/[projectId]` with `{ confirmText: "DELETE", confirmName: "<projectName>" }`
3. **Cleanup:** Deletes from `project_folders`, `unified_files`, `file_folders`, `project_members` by `project_id` (no org scoping on FK cleanup)
4. **S3:** Non-blocking cleanup of project files

Available from:
- Project Hub card 3-dot menu
- Dashboard carousel card 3-dot menu
- Project Management page

---

## 6. Role Hierarchy

```
owner/admin > project_manager > project_member > external_viewer
```
Stored in `project_members.role` per project + `organization_members.role` org-wide.

---

## 7. Satellite Map Card Pattern

Used in 3 places (Tier 1 cards, Tier 2 header, Dashboard cards):
```typescript
const meta = (project.metadata ?? {}) as Record<string, unknown>;
const locData = (meta.location ?? {}) as Record<string, unknown>;
const lat = typeof locData.lat === "number" ? locData.lat : null;
const lng = typeof locData.lng === "number" ? locData.lng : null;
const staticMapUrl = lat && lng && mapsKey
  ? `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=17&size=600x256&maptype=satellite&key=${mapsKey}`
  : null;
// Render: separate absolute div for bg — NEVER mix backgroundImage + background shorthand
```

---

## 8. Tool Views — Current State

| Tool | Page Lines | API Route | Key Components |
|---|---|---|---|
| RFIs | ~340 | `GET/POST/DELETE /api/projects/[projectId]/rfis` | ViewCustomizer, ChangeHistory |
| Submittals | ~580 | `GET/POST/DELETE /api/projects/[projectId]/submittals` | ViewCustomizer, ChangeHistory |
| Budget | ~425 | `GET/POST /api/projects/[projectId]/budget` | ViewCustomizer, ChangeHistory, snapshot |
| Schedule | ~472 | `GET/POST /api/projects/[projectId]/schedule` | ViewCustomizer, ChangeHistory, snapshot |
| Photos | ~601 | `GET /api/projects/[projectId]/photo-report` | PhotoLogClient.tsx, ViewCustomizer |
| Drawings | ~450 | (files from SlateDrop) | DrawingsViewerClient.tsx, ViewCustomizer |
| Daily Logs | ~362 | `GET/POST/DELETE /api/projects/[projectId]/daily-logs` | ViewCustomizer, ChangeHistory |
| Punch List | ~408 | `GET/POST/DELETE /api/projects/[projectId]/punch-list` | ViewCustomizer, ChangeHistory |
| Observations | ~285 | `GET/POST/PATCH/DELETE /api/projects/[projectId]/observations` | ViewCustomizer, ChangeHistory, ObservationForm |
| Management | ~934 | Multiple (contracts, reports, stakeholders) | ViewCustomizer |
| Records | — | `GET /api/projects/[projectId]/records` | — |

**Refactoring pattern:** Each tool view should extract its table/form into a component under `components/project-hub/`:
```tsx
// page.tsx (server component)
export default async function RFIsPage({ params }) {
  const { projectId } = await params;
  return <RFITable projectId={projectId} />;
}
```

---

## 9. Key Components

| Component | File | Lines |
|---|---|---|
| ProjectDashboardGrid | `components/project-hub/ProjectDashboardGrid.tsx` | 524 |
| WizardLocationPicker | `components/project-hub/WizardLocationPicker.tsx` | 390 |
| CreateProjectWizard | `components/project-hub/CreateProjectWizard.tsx` | 218 |
| DrawingsViewerClient | `components/project-hub/DrawingsViewerClient.tsx` | 168 |
| PhotoLogClient | `components/project-hub/PhotoLogClient.tsx` | 129 |
| ViewCustomizer | `components/project-hub/ViewCustomizer.tsx` | ~180 |
| ChangeHistory | `components/project-hub/ChangeHistory.tsx` | ~140 |
| ObservationsClient | `components/project-hub/ObservationsClient.tsx` | ~285 |
| ObservationForm | `components/project-hub/ObservationForm.tsx` | ~145 |

---

## 10. API Routes

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/projects` | GET | List all projects for user |
| `/api/projects/summary` | GET | Aggregate Tier-1 snapshot metrics (projects, RFIs, submittals, budget, recent projects) |
## 11. Tier-1 Portfolio Snapshot (Restored)

`app/(dashboard)/project-hub/ClientPage.tsx` now renders a dedicated top snapshot section in Tier 1:
- Active Projects
- Open RFIs (aggregated across scoped projects)
- Pending Submittals (pending/submitted)
- Portfolio Budget (sum of `project_budgets.budget_amount`)

Data source:
- `GET /api/projects/summary` implemented in `app/api/projects/summary/route.ts`
- Uses scoped project access (`listScopedProjectsForUser`) and aggregates:
  - `project_rfis`
  - `project_submittals`
  - `project_budgets`

Refresh behavior:
- Snapshot reloads on initial page load
- Snapshot reloads after project create/delete

| `/api/projects/create` | POST | Create project + provision folders |
| `/api/projects/sandbox` | GET | SlateDrop project tree |
| `/api/projects/[projectId]` | GET, DELETE | Get/delete project |
| `/api/projects/[projectId]/rfis` | GET, POST, DELETE | RFI CRUD |
| `/api/projects/[projectId]/submittals` | GET, POST, DELETE | Submittal CRUD |
| `/api/projects/[projectId]/budget` | GET, POST | Budget items |
| `/api/projects/[projectId]/budget/snapshot` | GET | Budget snapshot |
| `/api/projects/[projectId]/schedule` | GET, POST | Schedule items |
| `/api/projects/[projectId]/schedule/snapshot` | GET | Schedule snapshot |
| `/api/projects/[projectId]/daily-logs` | GET, POST, DELETE | Daily log CRUD |
| `/api/projects/[projectId]/punch-list` | GET, POST, DELETE | Punch list CRUD |
| `/api/projects/[projectId]/observations` | GET, POST, PATCH, DELETE | Observations CRUD (sentiment-based) |
| `/api/projects/[projectId]/photos` | — | Photo management |
| `/api/projects/[projectId]/photo-report` | GET | Photo report |
| `/api/projects/[projectId]/records` | GET | Project records |
| `/api/projects/[projectId]/management/*` | Various | Contracts, reports, stakeholders |
| `/api/projects/[projectId]/external-links` | GET, POST | External share links |
| `/api/projects/[projectId]/recent-files` | GET | Recent project files |

---

## 11. Database Tables

### `projects`
Key columns: `id`, `name`, `project_name`, `status`, `type`, `project_type`, `org_id`, `created_by`, `metadata` (JSONB — contains `location: {lat, lng}`, `address`), `thumbnail_url`, `cover_image`, `city`, `region`, `created_at`, `updated_at`

### `project_members`
Key columns: `id`, `project_id`, `user_id`, `role`, `created_at`

### `project_folders` (canonical — not `file_folders`)
Key columns: `id`, `name`, `folder_path`, `parent_id`, `is_system`, `folder_type`, `is_public`, `allow_upload`, `org_id`, `project_id`, `deleted_at`

### Tool-specific tables
- `project_rfis` — id, title, status, assigned_to, response, project_id, created_by, created_at
- `project_submittals` — id, title, status, project_id, created_by, created_at
- `project_tasks` — id, title, status, due_date, assignee_id, project_id
- `project_budget_items` — id, description, amount, category, project_id
- `project_milestones` — id, name, date, project_id
- `project_history_events` — id, event_type, description, project_id, created_at
- `project_observations` — id, project_id, number (serial), title, description, sentiment (positive/negative/neutral), category, location_area, priority, status, photos (jsonb), notes, observed_at, resolved_at, created_by, created_at, updated_at

---

## 12. Status Pill Colors (Design Consistency)

| Status | Color |
|---|---|
| Open / Active | `bg-blue-100 text-blue-800` |
| In Progress | `bg-yellow-100 text-yellow-800` |
| Completed / Closed | `bg-green-100 text-green-800` |
| Overdue / Rejected | `bg-red-100 text-red-800` |
| Draft / Pending | `bg-gray-100 text-gray-800` |

---

## 13. Context Maintenance Checklist

When making Project Hub changes, update this file if:
- [ ] Tool views are added, renamed, or restructured
- [ ] API endpoints change
- [ ] Project creation/deletion flow changes
- [ ] Database tables or columns change
- [ ] Component files are created or decomposed
- [ ] Role/permission logic changes
- [ ] SlateDrop integration behavior changes
