-- Beta program: foundational testers + structured feedback collection.
-- Idempotent.

-- ---------------------------------------------------------------------------
-- profiles flags for beta + foundational status
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='profiles') then
    alter table public.profiles add column if not exists beta_tester boolean not null default false;
    alter table public.profiles add column if not exists foundational_member boolean not null default false;
    alter table public.profiles add column if not exists beta_joined_at timestamptz;
    alter table public.profiles add column if not exists foundational_granted_at timestamptz;
  end if;
end$$;

-- ---------------------------------------------------------------------------
-- beta_feedback: structured submissions from beta testers (and any user)
-- Filterable in Operations Console by type / severity / app / status.
-- ---------------------------------------------------------------------------
create table if not exists public.beta_feedback (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  org_id              uuid references public.organizations(id) on delete set null,
  type                text not null check (type in ('bug','feature','ux','performance','other')),
  severity            text check (severity in ('blocker','high','medium','low')),
  app_area            text,
  title               text not null check (length(title) between 3 and 200),
  description         text not null check (length(description) between 5 and 5000),
  steps_to_reproduce  text check (steps_to_reproduce is null or length(steps_to_reproduce) <= 5000),
  screenshot_url      text,
  page_url            text,
  user_agent          text,
  console_errors      jsonb,
  status              text not null default 'new'
                         check (status in ('new','triaged','in_progress','resolved','wont_fix','duplicate')),
  gh_issue_url        text,
  admin_notes         text,
  resolved_at         timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists idx_beta_feedback_status_time on public.beta_feedback (status, created_at desc);
create index if not exists idx_beta_feedback_type_sev on public.beta_feedback (type, severity);
create index if not exists idx_beta_feedback_user on public.beta_feedback (user_id);
create index if not exists idx_beta_feedback_app on public.beta_feedback (app_area) where app_area is not null;

-- updated_at autotouch
create or replace function public.beta_feedback_touch() returns trigger as $$
begin new.updated_at := now(); return new; end;
$$ language plpgsql;

drop trigger if exists trg_beta_feedback_touch on public.beta_feedback;
create trigger trg_beta_feedback_touch before update on public.beta_feedback
  for each row execute function public.beta_feedback_touch();

alter table public.beta_feedback enable row level security;

-- Any authenticated user can submit
drop policy if exists "beta_feedback_insert_authed" on public.beta_feedback;
create policy "beta_feedback_insert_authed" on public.beta_feedback
  for insert with check (auth.uid() = user_id);

-- Submitter can read their own
drop policy if exists "beta_feedback_select_own" on public.beta_feedback;
create policy "beta_feedback_select_own" on public.beta_feedback
  for select using (auth.uid() = user_id);

-- Slate360 staff can read + update everything
drop policy if exists "beta_feedback_staff_select" on public.beta_feedback;
create policy "beta_feedback_staff_select" on public.beta_feedback
  for select using (
    exists (
      select 1 from public.slate360_staff s
      join auth.users u on lower(u.email) = lower(s.email)
      where u.id = auth.uid() and s.revoked_at is null
    )
  );

drop policy if exists "beta_feedback_staff_update" on public.beta_feedback;
create policy "beta_feedback_staff_update" on public.beta_feedback
  for update using (
    exists (
      select 1 from public.slate360_staff s
      join auth.users u on lower(u.email) = lower(s.email)
      where u.id = auth.uid() and s.revoked_at is null
    )
  );

-- Service role full access
drop policy if exists "beta_feedback_service" on public.beta_feedback;
create policy "beta_feedback_service" on public.beta_feedback
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

comment on table public.beta_feedback is 'Structured beta tester feedback; filtered/triaged in Operations Console.';
comment on column public.profiles.beta_tester is 'TRUE = enrolled in beta program; subject to BETA_LIMITS, sees BetaBanner, no upgrade UI.';
comment on column public.profiles.foundational_member is 'TRUE = entitled to 50% off year 1 + 20% off lifetime (revoked if subscription lapses >30d).';
