-- Extend stale recovery to QUEUED jobs that were never claimed.
--
-- The activity-aware predicate (20260802100000) only touches status='processing',
-- so a job whose Trigger run died before the queued→processing claim sat queued
-- forever with its capture stuck in 'processing'. A queued row older than the
-- threshold means the dispatch was accepted but no worker ever claimed it.
create or replace function public.recover_stale_digital_twin_processing_jobs(
  p_stale_minutes integer default 45
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count integer;
begin
  if p_stale_minutes is null or p_stale_minutes < 1 then
    raise exception 'p_stale_minutes must be >= 1' using errcode = 'invalid_parameter_value';
  end if;

  with stale as (
    update public.digital_twin_processing_jobs j
    set status = 'failed',
        error_text = coalesce(
          j.error_text,
          case
            when j.status = 'queued'
              then format('Stale job: queued but never claimed for %s minutes', p_stale_minutes)
            else format('Stale job: no worker activity for %s minutes', p_stale_minutes)
          end
        ),
        completed_at = coalesce(j.completed_at, now()),
        updated_at = now()
    where j.deleted_at is null
      and (
        (
          j.status = 'processing'
          and greatest(
                coalesce(j.started_at, timestamptz 'epoch'),
                coalesce(j.updated_at, timestamptz 'epoch')
              ) < now() - make_interval(mins => p_stale_minutes)
        )
        or (
          j.status = 'queued'
          and j.created_at < now() - make_interval(mins => p_stale_minutes)
        )
      )
    returning j.capture_id
  ),
  captures as (
    update public.digital_twin_captures c
    set capture_status = 'failed',
        error_text = format('Processing timed out after %s minutes of inactivity', p_stale_minutes),
        updated_at = now()
    where c.id in (select capture_id from stale where capture_id is not null)
      and c.capture_status = 'processing'
      and c.deleted_at is null
    returning c.id
  )
  select count(*)::integer into v_count from stale;

  return coalesce(v_count, 0);
end;
$$;

comment on function public.recover_stale_digital_twin_processing_jobs(integer) is
  'Fails processing jobs with no start/heartbeat activity and queued jobs never claimed within p_stale_minutes.';
