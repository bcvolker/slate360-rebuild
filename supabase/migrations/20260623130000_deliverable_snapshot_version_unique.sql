-- Deliverable snapshot version uniqueness
--
-- Prevent two snapshots sharing a version number for the same deliverable (e.g.
-- a double-clicked Publish / Approve creating two snapshots at the same version,
-- which would make version history ambiguous). NULL version_numbers (legacy
-- manual snapshots created before versioning) are allowed to repeat — Postgres
-- treats NULLs as distinct in a UNIQUE constraint. createDeliverableSnapshot()
-- retries on conflict.

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'uq_snapshot_deliverable_version'
  ) then
    alter table public.site_walk_deliverable_snapshots
      add constraint uq_snapshot_deliverable_version unique (deliverable_id, version_number);
  end if;
end $$;
