# Project Hub — Implementation Plan

## Purpose
Deliver construction operations command center (projects → project detail → tool views) with strong field-to-office workflows and analytics handoff.

## Current State
- Core 3-tier structure exists.
- Advanced scheduling/financial depth still incomplete.

## Source Coverage
Derived from uploaded `raw-upload.html` and canonical `slate360-context/PROJECT_HUB.md`.

## MVP Scope
1. Harden Tier 1/2/3 reliability and performance.
2. Complete high-priority tools: RFIs, submittals, daily logs, punch list, budget, schedule.
3. Improve cross-module linking (Tour/Geospatial/Content/Analytics).
4. Ensure change history uses real activity logs.

## Major Feature Backlog (from uploads)
- 6-step project wizard enhancements.
- True Gantt + dependencies/critical path.
- Budget/cost code/change-order depth.
- Mobile-first field workflows (check-ins, site capture).
- External stakeholder sharing experiences.

## API Plan
- Keep existing project tool APIs as primary.
- Add/complete: check-in endpoints, delay prediction, stakeholder share token routes.
- Standardize activity logging via `project_activity_log`.

## Customization Requirements
- Per-tool table/view customization (`ViewCustomizer`).
- Project command-center widget arrangement persistence.
- Collapsible left navigation and contextual right-side detail panels.

## Dependencies
- Activity log migration completion.
- Data-table primitives standardization.

## Definition of Done
- Tier 3 tools are production-complete for core PM workflows.
- Cross-tab artifact linking works (files, tours, reports).
- Preferences persist for tool-level layouts.
