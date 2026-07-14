-- Additive migration: personal Inbox triage (flag / to-do) columns.
-- Locked in docs/design/SITEWALK360_LOCK_SHEET.md rev 7 addendum (Q3, corrected
-- 2026-07-14): both source tables are already per-recipient rows
-- (site_walk_assignments.assigned_to and project_notifications.user_id are
-- both required, RLS-scoped 1:1-per-user), so triage state lives directly on
-- each row rather than a separate junction table. "Done for me" on an
-- assignment does NOT set status to a terminal value (that stays the
-- assigner-only GC verify-then-close state machine) - it only hides the row
-- from the default Inbox view.

alter table site_walk_assignments
  add column if not exists flagged boolean not null default false,
  add column if not exists is_todo boolean not null default false;

alter table project_notifications
  add column if not exists flagged boolean not null default false,
  add column if not exists is_todo boolean not null default false;
