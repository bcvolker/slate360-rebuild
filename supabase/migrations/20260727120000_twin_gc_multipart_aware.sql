-- Harden the stale-upload sweep introduced in 20260725120000_twin_asset_dedup.sql.
--
-- External review (2026-07-27) found the sweep can soft-delete an upload that is legitimately
-- still in flight. The condition is `status='uploading' AND storage_key IS NULL AND created_at
-- older than the cutoff` — but during a multipart upload `storage_key` stays NULL until the
-- complete call lands. That is exactly the 262 MB drone-video case the dedup work exists for:
-- a slow uplink on a large file can hold a row in that state for hours while parts are
-- steadily arriving, and the sweep cannot tell it apart from an abandoned one.
--
-- Two changes:
--   1. Do not sweep a row whose multipart session has recent part activity. Arriving bytes are
--      direct evidence the upload is alive, which `created_at` alone can never be.
--   2. Widen the default cutoff 180 min -> 720 min. Three hours is inside the plausible range
--      for a large file on site LTE; twelve is not.
--
-- The `complete` route additionally clears `deleted_at` so a row swept mid-flight is
-- resurrected rather than becoming a `ready`-but-soft-deleted zombie that every job query
-- filters out. Both halves are needed: this one narrows the window, that one repairs the case
-- where the window is still hit.
--
-- Additive: CREATE OR REPLACE of a function plus one index. No schema change, no backfill.
-- Safe to apply before or after 20260725120000 has run, and safe to re-run.

-- Supports the NOT EXISTS probe below.
create index if not exists digital_twin_multipart_parts_upload_recent_idx
  on public.digital_twin_multipart_parts (multipart_id, uploaded_at desc);

create or replace function public.gc_stale_digital_twin_upload_assets(
  p_stale_minutes integer default 720
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  with swept as (
    update public.digital_twin_capture_assets a
       set status = 'failed',
           deleted_at = now()
     where a.status = 'uploading'
       and a.deleted_at is null
       and a.storage_key is null
       and a.created_at < now() - make_interval(mins => p_stale_minutes)
       -- Alive if any part of its multipart session arrived inside the same window. Scoped to
       -- non-terminal sessions so a completed-but-unlinked upload cannot pin a row forever.
       -- `uploaded_at` is nullable and NULL never satisfies the comparison, so pending parts
       -- correctly count as no activity — only bytes that actually landed keep a row alive.
       -- (`status` is NOT NULL with default 'initiated', so no coalesce is needed.)
       and not exists (
         select 1
           from public.digital_twin_multipart_uploads u
           join public.digital_twin_multipart_parts p on p.multipart_id = u.id
          where u.asset_id = a.id
            and u.status not in ('aborted', 'failed')
            and p.uploaded_at > now() - make_interval(mins => p_stale_minutes)
       )
    returning 1
  )
  select count(*) into v_count from swept;
  return coalesce(v_count, 0);
end;
$$;

comment on function public.gc_stale_digital_twin_upload_assets(integer) is
  'Soft-deletes capture assets abandoned mid-upload. Skips rows with recent multipart part '
  'activity: arriving bytes prove the upload is alive, which created_at cannot. Default '
  'cutoff 720 min. Note this does NOT abort the orphaned S3/R2 multipart session — blob '
  'cleanup is a separate concern (see orphan cleanup ops).';

revoke all on function public.gc_stale_digital_twin_upload_assets(integer) from public, anon, authenticated;
grant execute on function public.gc_stale_digital_twin_upload_assets(integer) to service_role;
