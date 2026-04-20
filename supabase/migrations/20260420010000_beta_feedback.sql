-- 20260420010000_beta_feedback.sql
-- Beta feedback intake table for in-app "Report Issue / Suggest Feature" modal.

create table if not exists public.beta_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid references public.organizations(id) on delete set null,
  category text not null check (category in ('bug', 'suggestion', 'praise', 'other')),
  title text not null,
  description text not null,
  severity text check (severity in ('low', 'medium', 'high', 'critical')),
  page_url text,
  user_agent text,
  replay_url text,
  status text not null default 'new' check (status in ('new', 'triaged', 'in_progress', 'resolved', 'wontfix')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists beta_feedback_user_id_idx on public.beta_feedback (user_id);
create index if not exists beta_feedback_org_id_idx on public.beta_feedback (org_id);
create index if not exists beta_feedback_status_idx on public.beta_feedback (status);
create index if not exists beta_feedback_created_at_idx on public.beta_feedback (created_at desc);

alter table public.beta_feedback enable row level security;

-- Users can insert their own feedback.
drop policy if exists beta_feedback_insert_own on public.beta_feedback;
create policy beta_feedback_insert_own on public.beta_feedback
  for insert with check (auth.uid() = user_id);

-- Users can read their own submissions.
drop policy if exists beta_feedback_select_own on public.beta_feedback;
create policy beta_feedback_select_own on public.beta_feedback
  for select using (auth.uid() = user_id);

-- Slate360 staff (CEO + slate360_staff allowlist) can read/update everything.
drop policy if exists beta_feedback_staff_all on public.beta_feedback;
create policy beta_feedback_staff_all on public.beta_feedback
  for all
  using (
    exists (
      select 1 from public.slate360_staff s
      where s.email = (auth.jwt() ->> 'email')
        and s.revoked_at is null
    )
  )
  with check (
    exists (
      select 1 from public.slate360_staff s
      where s.email = (auth.jwt() ->> 'email')
        and s.revoked_at is null
    )
  );
