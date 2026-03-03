# Analytics & Reports — Implementation Plan

## Purpose
Deliver stakeholder-grade report creation from project data, with saved outputs, download/share actions, and scheduled distribution roadmap.

## Current State
- Live report-builder UI exists.
- Backend aggregation, PDF pipeline, and share automation remain pending.

## Source Coverage
Derived from canonical analytics spec and uploaded `raw-upload.txt`.

## MVP Scope
1. Report type selection + date range.
2. Include/exclude section selection.
3. Build and persist report records.
4. Saved reports with PDF/CSV/export actions.

## Data Contracts
- `ReportDraft`
- `SavedReport`
- `ReportSectionSelection`
- `ReportExportJob`

## API Plan
- `POST /api/analytics/reports/build`
- `GET /api/analytics/reports`
- `GET /api/analytics/reports/[id]/download`
- `DELETE /api/analytics/reports/[id]`

## Data Inputs
- RFIs, submittals, budget, schedule, photos, daily logs, observations, team, drawings.

## Customization Requirements
- Reorder report sections in builder.
- Save report templates/presets.
- Expand/collapse builder panels and saved-report filters.
- Persist layout with `layoutprefs-analytics-reports-{userId}`.

## Dependencies
- PDF generation and artifact storage pipeline.
- Reliable cross-project data aggregation and auditability.

## Definition of Done
- User can configure, generate, store, and share/download reports.
- Report templates and builder layout preferences persist.
- Module remains report-builder-first (no regression to generic dashboard-only scope).
