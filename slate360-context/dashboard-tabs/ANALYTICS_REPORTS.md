# Analytics & Reports Tab — Blueprint

**Route:** `/(dashboard)/analytics`  
**Client Component:** `components/dashboard/AnalyticsReportsClient.tsx`  
**Server Page:** `app/(dashboard)/analytics/page.tsx`  
**Tier Gate:** `business`, `enterprise` (+ CEO/staff override)  
**Store:** `src/lib/useAnalyticsStore.ts`  
**Status:** Live (report builder UI complete; PDF generation backend TBD)

---

## Purpose

The Analytics & Reports tab is a **report creation tool**, NOT a project metrics dashboard.

Users select a report type, choose a date range, toggle data sections to include, and click "Build Report." The platform pulls relevant data from their projects (RFIs, submittals, budget entries, photos, schedule, etc.) and generates a professional PDF report. Built reports are stored and listed in the "Saved Reports" section where they can be downloaded as PDF or shared with stakeholders.

---

## Report Types

| ID | Label | Description |
|---|---|---|
| `stakeholder-progress` | Stakeholder Progress Report | Overall project health, milestones, and key updates for clients and owners |
| `rfi-summary` | RFI Summary | Open, closed, and pending RFIs with response times and responsible parties |
| `budget-review` | Budget Review | Committed costs, forecasts, change orders, and budget vs. actual variance |
| `photo-log` | Photo Log Report | Dated progress photos organized by area, trade, or milestone |
| `submittal-log` | Submittal Log | Full submittal register with status, review cycles, and approval dates |
| `custom` | Custom Report | User-selected data sections in custom arrangement |

---

## Data Sections (toggleable per report)

- Project Overview & Schedule Status
- RFI Register
- Submittal Log
- Budget & Cost Summary
- Daily Log Entries
- Punch List
- Progress Photos
- Team & Contacts
- Drawings Register
- Observations Log

---

## UI Layout

1. **Build a Report** card
   - Report Type dropdown (custom styled, not native `<select>`)
   - Date Range `<select>` (last 7d / 30d / 90d / this year / all time)
   - "Build Report" button (orange, disabled when 0 sections selected)
   - Data Sections toggle pills (blue when selected, gray when not)
   - Success banner with "Download PDF" link when `exportState.url` is set

2. **Saved Reports** card
   - "Export All (CSV)" button in header
   - Loading state with spinner
   - Empty state with dashed border, icon, and prompt
   - Report rows: title + date + status on left; PDF download + Share buttons on right

---

## Store API (`useAnalyticsStore`)

```typescript
const { reports, loading, exportState, error, fetchReports, requestExport } = useAnalyticsStore();

fetchReports(scope: AnalyticsScope): Promise<void>
// scope = "projects" | "org" | ...

requestExport(format: "pdf" | "csv", scope: AnalyticsScope): Promise<void>
// Sets exportState.url when complete

// State shape:
reports: Array<{ id: string; title: string; createdAt: string; status: string }>
loading: { reports: boolean }
exportState: { url: string | null; loading: boolean }
error: string | null
```

---

## Data Sources (future backend wiring)

The report builder should pull from:

- `project_rfis` — RFI register
- `project_submittals` — Submittal log
- `project_budget_items` — Budget & cost entries
- `project_schedule` — Schedule milestones
- `project_photos` — Photo log (via S3 presigned URLs)
- `project_daily_logs` — Daily entries
- `project_observations` — Observations log
- `project_members` — Team & contacts
- `projects` + `project_drawings` — Overview and drawings register

All pulled via `withProjectAuth()` or `withAuth()` server-side routes with `admin` client.

---

## API Routes (planned)

| Method | Route | Description |
|---|---|---|
| `POST` | `/api/analytics/reports/build` | Create a new report from selected type + sections + date range |
| `GET` | `/api/analytics/reports` | List stored reports for org |
| `GET` | `/api/analytics/reports/[id]/download` | Stream or redirect to PDF in S3 |
| `DELETE` | `/api/analytics/reports/[id]` | Soft-delete a report |

---

## Tech Debt / Future Work

- PDF generation backend not yet wired (currently a stub in `requestExport`)
- No actual project data aggregation yet — report builder UI is complete, data pipeline TBD
- Share flow (email a report to stakeholder) not yet built
- Report scheduling (weekly/monthly auto-send) is a future enterprise feature
- Chart.js removed from this tab — do NOT re-add unless building a separate "Charts" sub-view
