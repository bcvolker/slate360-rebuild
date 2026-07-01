# Coordination + Portfolio Rebuild — LOCKED

**Status:** locked 2026-06-30 by ~10-platform multi-AI panel (near-unanimous convergence).
**Principle (all screens):** show only what Slate360 can query today; no fake KPIs, no dashed
stubs, no "Phase 1 snapshot" / "coming soon" copy (App Store auto-reject). Every card is
data-backed, every number is clickable into a real workspace, one accent on interactive states
only. Graphite Glass grammar throughout.

## Why these three
All three were confirmed AI-vibe-coded slop: Portfolio = fake RFI/Submittal/Budget KPI cards
(product removed from business model) + `summary={null}` never loads; Calendar = read-only
agenda, no create (orphan mock `CalendarClient.tsx` already deleted, commit 72d1c498); Inbox =
Messages/Upcoming empty dashed stub tabs.

## Build order (panel consensus — fewest clicks to value)
1. **Inbox honest-reduced** — SHIPPED (commit c478db8a/f39ba8b6): single real
   `project_notifications` feed; dropped the 2 dead stub tabs + orphan `InboxTabs.tsx`;
   premium empty state. No migration. NEXT: category inference (comment/upload/job/calendar)
   from `link_path`/title so filter chips are real.
2. **Portfolio rebuild** — replace the 7 fake KPI cards with: Needs-Attention queue +
   Active-Projects list + In-Flight + Org-Health. Fixes the `summary={null}` bug.
3. **Calendar create/edit** — needs additive migration (`calendar_events` extend +
   `calendar_event_reminders`). Wire month/agenda + event sheet + reminders→inbox.

---

## 1. Projects Portfolio Overview (`components/projects/ProjectsPortfolioOverview.tsx`)
**Kill:** RFI/Submittal/Budget/Completed/On-Hold rainbow KPI cards; multi-hue palette;
expand-dropdowns; the `View Details → first-project` hack.
**Build:** `lib/projects/load-portfolio-data.ts` server aggregator → `GET /api/projects/portfolio`.

```
PortfolioData = {
  attention[]   // deliverable_comment | twin_ready | walk_ready | intake_upload | notification (top 5, unread first)
  activeProjects[] // {id,name,status,lastActivityAt,counts:{walks,twins,deliverablesShared},openItems:{unread,processingJobs}}
  inFlight { walksProcessing[], twinsProcessing[], deliverablesSent[] }
  orgHealth { storageUsedBytes, storageLimitBytes, creditsRemaining, projectsCount, projectsLimit }
}
```
Queries (existing tables): active projects w/ `last_activity = GREATEST(max walk/twin/deliverable updated_at)`;
attention = `project_notifications` unread + recent twin-complete + `slatedrop_uploads` in Intake;
in-flight = `site_walk_sessions`/`digital_twin_processing_jobs` status in (queued,processing) +
`site_walk_deliverables` status=shared last 30d; org-health from usage-truth/entitlements.
Components: `PortfolioAttentionList`, `PortfolioProjectRow` (glass row, NOT card grid),
`PortfolioInFlightSection`, `PortfolioOrgHealthStrip`. Every row → `/projects/[id]` or the artifact.
Wire in `ClientPage` (replace `summary={null}`). Delete `ProjectsPortfolioOverview` after cutover.

## 2. Coordination Calendar (`components/mobile-system/MobileCalendarClient.tsx`)
Orphan mock deleted. Extend `calendar_events` additively:
```sql
ALTER TABLE calendar_events
  ADD COLUMN IF NOT EXISTS event_type text NOT NULL DEFAULT 'event'
    CHECK (event_type IN ('event','walk','milestone','inspection','meeting','reminder')),
  ADD COLUMN IF NOT EXISTS source_kind text NOT NULL DEFAULT 'manual'
    CHECK (source_kind IN ('manual','site_walk_item','system')),
  ADD COLUMN IF NOT EXISTS source_id uuid;
CREATE TABLE IF NOT EXISTS calendar_event_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
  offset_minutes int NOT NULL, channel text NOT NULL DEFAULT 'in_app',
  created_at timestamptz NOT NULL DEFAULT now());
```
Unified feed = `calendar_events` (editable) merged with `site_walk_items.due_date` (read-only
`task_due`, `editable:false`). Month/Agenda toggle. `CalendarEventSheet` (create/edit): title,
date, start/end, all-day, project, type, assignee, location, reminders. Reminder → daily cron
`/api/cron/calendar-reminders` inserts `project_notifications` (honest interim; Trigger fan-out later).
Fix: drop `--twin360-blue` on coordination headers → `--app-accent` (green). Accent dot per event
day; NO rounded-full status pills, NO multi-hue.

## 3. Coordination Inbox — SHIPPED (interim)
Single `project_notifications` feed, premium empty state, Contacts/Calendar shortcut chips.
Next: category inference for filter chips (`[All][Comments][Uploads][Jobs][Calendar]`) — infer
from `link_path`/title server-side (no ML). Read/archive already wired (`/api/notifications/read`).
When Coordination-Hub fan-out lands, swap the data source to `notifications`/`coordination_notifications`
with zero UI change (same row shape). NEVER re-add a Direct Messages tab until `message_threads` exist.

---

## Unified Shell System (parallel track, LOCKED — see UNIFIED_SHELL_SYSTEM_LOCKED.md)
Do the token-level fixes FIRST (highest leverage; everything downstream inherits premium):
- **M0** `lib/shell/appRegistry.ts` (single source: id/label/href/ONE icon/accentVar per app) +
  `--app-accent-fill/ring/fg` vars; set `data-app` on mobile shell root (accent currently invisible on mobile).
- **M1** tinted-glass `AppIconChip` (replace solid accent FILLS on launcher/hero) — biggest premium lift.
- **M2** mobile bottom-nav active accent indicator (SHIPPED cff1ee6c) — first visible accent on mobile.
- **M3** one nav-active treatment (tinted-glass + 2px accent indicator; desktop left-bar / mobile top-bar).
- **M4** unify `AppSwitcher` (add popover variant; delete `MobileShellSwitcher`).
- **M5** one `AppHeader` primitive (retire `MobileTopBar` + both mobile headers + fold desktop top bar; 56px both).
- **M6** canonical icon/label registry adopted everywhere (retire Scan/Box/Orbit variants; Twin=Box, Home, Camera).
- **M7** `Skeleton` + `EmptyState` primitives.
Purge hardcoded hex in `mobileTokens.ts`/`MOBILE_SHELL_CHROME` opportunistically (→ `--shell-*` vars).
Canonical labels: **Home** (nav) / Site Walk / Twin 360. One href each: `/app`, `/site-walk`, `/digital-twin`.

## Dashboard Hero (desktop, LOCKED direction)
Promote the 160px featured tile (`DashboardHomeContent.tsx:62-92`) to a full-bleed hero band
(380–440px): real deliverable/twin/photo image (populate `imageUrl` — currently never set in
`load-dashboard-home-data.ts`), gradient overlay, IBM Plex Mono eyebrow "LATEST FROM · {project}",
H1 title, meta, "Open project" CTA → `/projects/{projectId}` (the ProjectOverviewTab, which already
exists and is solid). Rank deliverable-first, scoped to most-recently-active project.

## Twin processing "5%" (separate slice, chip task_b8503c26)
Root cause: `src/trigger/twin-gaussian-splat.ts` writes progress_pct:5 once; Modal never posts back.
Add `POST /api/twin/jobs/[id]/progress` + Modal stage callbacks; rebuild `TwinSubmitStepStatus` as a
staged checklist (upload→align→train→mesh→export) + elapsed + ETA + "close, we'll notify you."
