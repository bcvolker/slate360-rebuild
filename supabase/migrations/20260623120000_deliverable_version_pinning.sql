-- Deliverable version pinning
--
-- Freeze a deliverable's content into an immutable snapshot when it is shared,
-- and pin the public viewer to that snapshot. This makes client-facing
-- deliverables a durable record: editing a deliverable after it has been sent
-- no longer silently changes what the recipient already received. "Update link"
-- creates a new version intentionally.

-- Monotonic version number per deliverable (v1, v2, ...). Nullable so existing
-- manually-created snapshots remain valid; new snapshots always set it.
alter table public.site_walk_deliverable_snapshots
  add column if not exists version_number integer;

-- The snapshot the live share token currently points at. Null for links shared
-- before this migration (viewer falls back to live content for those).
alter table public.site_walk_deliverables
  add column if not exists shared_snapshot_id uuid
    references public.site_walk_deliverable_snapshots(id) on delete set null;

create index if not exists idx_deliverables_shared_snapshot
  on public.site_walk_deliverables(shared_snapshot_id)
  where shared_snapshot_id is not null;
