-- Thermal Analysis: share tokens, reports, summary metrics, creator Realtime access.
-- Extends 20260613120000_thermal_analysis_foundation.sql (public schema — not thermal_private).

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Session summary metrics (inspection KPIs)
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.thermal_analysis_sessions
  add column if not exists summary_metrics jsonb not null default '{
    "total_captures": 0,
    "radiometric_captures": 0,
    "critical_anomalies": 0,
    "max_detected_temp_c": null,
    "avg_confidence_score": null
  }'::jsonb;

comment on column public.thermal_analysis_sessions.summary_metrics is
  'Aggregated session KPIs updated after extract/analyze jobs complete.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Share tokens (mirrors digital_twin_share_tokens)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.thermal_analysis_share_tokens (
  id                uuid primary key default gen_random_uuid(),
  token             text not null unique,
  org_id            uuid references public.organizations(id) on delete cascade,
  session_id        uuid not null references public.thermal_analysis_sessions(id) on delete cascade,
  created_by        uuid references auth.users(id) on delete set null,
  role              text not null default 'view'
                      check (role in ('view', 'annotate', 'download')),
  label             text,
  expires_at        timestamptz,
  max_views         integer check (max_views is null or max_views > 0),
  view_count        integer not null default 0 check (view_count >= 0),
  is_revoked        boolean not null default false,
  password_hash     text,
  layer_config      jsonb not null default '{}'::jsonb,
  branding_snapshot jsonb not null default '{}'::jsonb,
  last_viewed_at    timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_thermal_share_token on public.thermal_analysis_share_tokens(token);
create index if not exists idx_thermal_share_session on public.thermal_analysis_share_tokens(session_id);

create table if not exists public.thermal_analysis_share_views (
  id               uuid primary key default gen_random_uuid(),
  share_token_id   uuid not null references public.thermal_analysis_share_tokens(id) on delete cascade,
  viewer_ip        text,
  viewer_ua        text,
  viewed_at        timestamptz not null default now()
);

create index if not exists idx_thermal_share_views_token
  on public.thermal_analysis_share_views(share_token_id, viewed_at desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Generated reports
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.thermal_analysis_reports (
  id              uuid primary key default gen_random_uuid(),
  session_id      uuid not null references public.thermal_analysis_sessions(id) on delete cascade,
  org_id          uuid references public.organizations(id) on delete cascade,
  created_by      uuid references auth.users(id) on delete set null,
  title           text not null,
  template_id     text not null default 'executive_one_pager',
  storage_key     text,
  html_storage_key text,
  config          jsonb not null default '{}'::jsonb,
  generated_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_thermal_reports_session
  on public.thermal_analysis_reports(session_id, created_at desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. updated_at triggers
-- ─────────────────────────────────────────────────────────────────────────────
drop trigger if exists trg_thermal_share_tokens_updated_at on public.thermal_analysis_share_tokens;
create trigger trg_thermal_share_tokens_updated_at
  before update on public.thermal_analysis_share_tokens
  for each row execute function public.set_updated_at();

drop trigger if exists trg_thermal_reports_updated_at on public.thermal_analysis_reports;
create trigger trg_thermal_reports_updated_at
  before update on public.thermal_analysis_reports
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. RLS — ops staff manage tokens; share views service-only
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.thermal_analysis_share_tokens enable row level security;
alter table public.thermal_analysis_share_views enable row level security;
alter table public.thermal_analysis_reports enable row level security;

drop policy if exists thermal_share_tokens_ops_all on public.thermal_analysis_share_tokens;
create policy thermal_share_tokens_ops_all on public.thermal_analysis_share_tokens
  for all to authenticated
  using (public.user_can_access_thermal_ops())
  with check (public.user_can_access_thermal_ops());

drop policy if exists thermal_reports_ops_all on public.thermal_analysis_reports;
create policy thermal_reports_ops_all on public.thermal_analysis_reports
  for all to authenticated
  using (public.user_can_access_thermal_ops())
  with check (public.user_can_access_thermal_ops());

revoke all on table public.thermal_analysis_share_views from anon, authenticated;

-- Creator read policies so Realtime works for CEO/staff who created the session
drop policy if exists thermal_sessions_creator_select on public.thermal_analysis_sessions;
create policy thermal_sessions_creator_select on public.thermal_analysis_sessions
  for select to authenticated
  using (created_by = (select auth.uid()));

drop policy if exists thermal_captures_creator_select on public.thermal_captures;
create policy thermal_captures_creator_select on public.thermal_captures
  for select to authenticated
  using (
    exists (
      select 1 from public.thermal_analysis_sessions s
      where s.id = thermal_captures.session_id
        and s.created_by = (select auth.uid())
    )
  );

drop policy if exists thermal_jobs_creator_select on public.thermal_processing_jobs;
create policy thermal_jobs_creator_select on public.thermal_processing_jobs
  for select to authenticated
  using (
    exists (
      select 1 from public.thermal_analysis_sessions s
      where s.id = thermal_processing_jobs.session_id
        and s.created_by = (select auth.uid())
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Atomic share view claim RPC
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.claim_thermal_share_view(
  p_token text,
  p_viewer_ip text default null,
  p_viewer_ua text default null
)
returns table (
  share_token_id uuid,
  session_id uuid,
  org_id uuid,
  role text,
  layer_config jsonb,
  branding_snapshot jsonb
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row public.thermal_analysis_share_tokens%rowtype;
begin
  select *
    into v_row
  from public.thermal_analysis_share_tokens
  where token = p_token
    and is_revoked = false
    and (expires_at is null or expires_at > now())
    and (max_views is null or view_count < max_views)
  for update;

  if not found then
    return;
  end if;

  update public.thermal_analysis_share_tokens
  set view_count = view_count + 1,
      last_viewed_at = now(),
      updated_at = now()
  where id = v_row.id;

  insert into public.thermal_analysis_share_views (share_token_id, viewer_ip, viewer_ua)
  values (v_row.id, p_viewer_ip, left(coalesce(p_viewer_ua, ''), 500));

  share_token_id := v_row.id;
  session_id := v_row.session_id;
  org_id := v_row.org_id;
  role := v_row.role;
  layer_config := v_row.layer_config;
  branding_snapshot := v_row.branding_snapshot;
  return next;
end;
$$;

revoke all on function public.claim_thermal_share_view(text, text, text) from public;
grant execute on function public.claim_thermal_share_view(text, text, text) to anon, authenticated, service_role;
