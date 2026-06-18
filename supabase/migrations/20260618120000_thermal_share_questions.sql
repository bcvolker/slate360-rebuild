-- Stakeholder questions on a shared thermal report + owner replies (threaded).
-- External viewers submit via the share token (no account); the CEO reads/answers
-- in the Operations Console. Mirrors the viewer_comments pattern.

create table if not exists public.thermal_analysis_share_questions (
  id              uuid primary key default gen_random_uuid(),
  share_token_id  uuid references public.thermal_analysis_share_tokens(id) on delete set null,
  session_id      uuid not null references public.thermal_analysis_sessions(id) on delete cascade,
  org_id          uuid,
  capture_id      uuid,
  parent_id       uuid references public.thermal_analysis_share_questions(id) on delete cascade,
  author_name     text,
  author_email    text,
  body            text not null,
  is_owner_reply  boolean not null default false,
  status          text not null default 'new' check (status in ('new', 'acknowledged', 'answered', 'resolved')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists thermal_share_questions_session_idx
  on public.thermal_analysis_share_questions (session_id, created_at desc);
create index if not exists thermal_share_questions_status_idx
  on public.thermal_analysis_share_questions (status);

alter table public.thermal_analysis_share_questions enable row level security;

-- All reads/writes flow through service-role API routes (token-gated for the public
-- viewer, withThermalOpsAuth for the console), so only service_role gets direct access.
drop policy if exists thermal_share_questions_service on public.thermal_analysis_share_questions;
create policy thermal_share_questions_service
  on public.thermal_analysis_share_questions
  for all
  to service_role
  using (true)
  with check (true);

-- Ops staff/CEO may read questions for sessions they can access.
drop policy if exists thermal_share_questions_ops_read on public.thermal_analysis_share_questions;
create policy thermal_share_questions_ops_read
  on public.thermal_analysis_share_questions
  for select
  to authenticated
  using (public.user_can_access_thermal_ops());
