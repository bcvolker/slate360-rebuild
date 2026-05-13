# Site Walk V1 — Taxonomy and Workflow

Last Updated: 2026-05-13
Scope: Site Walk V1 terminology and workflow naming.

## Purpose

Site Walk needs simple field-first language without implying that every user is adopting a full construction project-management suite. Use `Worksite` for lower-tier Site Walk organization and `Project` only for higher-tier PM contexts unless an existing route, API, table, or integration forces the legacy name.

## Core Terms

### 1. Worksite

- Lower-tier Site Walk container for Site Walk users.
- Used for a building, location, job, client site, or scoped work area.
- Can contain multiple Walks / Site Visits, plans, stops, captures, reports, deliverables, files, and SlateDrop folders.
- Does not imply the full construction PM suite.
- UI labels should prefer `Worksite` for Site Walk Home, Site Walk setup, and compact field workflows.

### 2. Project

- Higher-tier construction management container, reserved for advanced PM contexts.
- Supports advanced PM features later:
  - schedule
  - budget
  - RFIs
  - submittals
  - change/order logs
  - historical versions
  - enterprise oversight
- Use `Project` where the user is clearly inside Project Hub or higher-tier construction management.
- Do not rename database tables, route segments, or API contracts in the Site Walk Home slices; UI can say `Worksite` even when internal names still use `projects` temporarily.

### 3. Walk / Site Visit

- One field visit/session under a Worksite or Project.
- `Walk` is the compact product term.
- `Site Visit` can be used where a more formal customer-facing label is clearer.

### 4. Stop

- One capture location in a walk.
- May be plan-linked or photo-only.
- A stop can contain photos, notes, markup, attachments, plan pin context, and tracked items/issues.

### 5. Item / Issue

- Something tracked from a stop.
- Can have category, status, assignee, priority, and due date.
- Use `Issue` in compact navigation when the user expects open/flagged work.
- Use `Item` in data models and detailed lists where not every tracked item is necessarily a defect.

### 6. Deliverable

- Report, proposal, or export created from walk data.
- Compact UI may say `Report` when space is tight.
- Routes and backend APIs may continue using `deliverables` until a broader naming migration is planned.

### 7. SlateDrop Relationship

Each Worksite or Project should eventually generate a SlateDrop folder structure automatically. This slice documents the relationship only; full folder automation is future work.

Future folder examples:

- Plans
- Photos
- Captures
- Walk Data
- Deliverables
- Attachments
- Schedules
- Budgets
- RFIs
- Submittals
- Historical Versions

## Current Implementation Rule

For Slice 1.2, update UI language where safe:

- Prefer `Worksites` over `Projects` in Site Walk Home.
- Prefer `Reports` over `Drafts` for compact output tabs.
- Keep existing route/API/table names intact when changing them would risk data, auth, or navigation regressions.
- Do not rename database tables in this slice.
- Do not implement SlateDrop folder automation in this slice.
