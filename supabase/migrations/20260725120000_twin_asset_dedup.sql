-- P0a — upload integrity: idempotent asset registration + stale-upload GC.
--
-- Observed failure (2026-07-08 dual-camera field test): one 262.9 MB video registered THREE
-- times as separate rows on the same capture — two `ready`, one stuck `uploading` with a NULL
-- storage_key. The processing job then ran against the incomplete triplicate set, and the
-- ~1-minute video took 25+ minutes to import because the bytes were uploaded three times.
--
-- Root cause: asset rows are inserted per submit attempt with no dedup key, so any retry,
-- refresh, or re-entry into the submit flow re-registers the same file.
--
-- Additive only: one nullable column + one partial unique index + one index. No backfill, no
-- destructive change. Existing rows keep client_fingerprint NULL and are unaffected (NULLs are
-- never equal in a unique index, so legacy rows never collide).

alter table public.digital_twin_capture_assets
  add column if not exists client_fingerprint text;

comment on column public.digital_twin_capture_assets.client_fingerprint is
  'Stable client-computed identity for a source file (name+size+lastModified), used to make '
  'asset registration idempotent across submit retries. NOT a content hash — see '
  'checksum_sha256 for that.';

-- One live asset per (capture, fingerprint). Partial so soft-deleted rows do not block
-- re-adding a file the user intentionally removed and re-picked.
create unique index if not exists digital_twin_capture_assets_capture_fingerprint_uniq
  on public.digital_twin_capture_assets (capture_id, client_fingerprint)
  where client_fingerprint is not null and deleted_at is null;

-- Supports the stale-upload sweep: find rows left in `uploading` past a cutoff.
create index if not exists digital_twin_capture_assets_stale_uploading_idx
  on public.digital_twin_capture_assets (status, created_at)
  where status = 'uploading' and deleted_at is null;


-- Sweep assets abandoned mid-upload. Called by the existing recover-stale-twin-jobs cron.
-- Soft-deletes only; the R2 blobs are handled separately by the existing r2-cleanup queue.
create or replace function public.gc_stale_digital_twin_upload_assets(
  p_stale_minutes integer default 180
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
    update public.digital_twin_capture_assets
       set status = 'failed',
           deleted_at = now()
     where status = 'uploading'
       and deleted_at is null
       and storage_key is null
       and created_at < now() - make_interval(mins => p_stale_minutes)
    returning 1
  )
  select count(*) into v_count from swept;
  return coalesce(v_count, 0);
end;
$$;

revoke all on function public.gc_stale_digital_twin_upload_assets(integer) from public, anon, authenticated;
grant execute on function public.gc_stale_digital_twin_upload_assets(integer) to service_role;
