-- Reconcile Version 1 feedback storage with the live Operations Console/API contract.
-- Earlier migration history contains both `category`/`replay_url` and newer
-- `type`/`app_area`/`console_errors` shapes. Keep inserts and the owner inbox
-- reliable regardless of which baseline created the table first.

alter table public.beta_feedback
  add column if not exists type text,
  add column if not exists app_area text,
  add column if not exists console_errors jsonb,
  add column if not exists steps_to_reproduce text,
  add column if not exists screenshot_url text,
  add column if not exists gh_issue_url text,
  add column if not exists admin_notes text,
  add column if not exists resolved_at timestamptz;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'beta_feedback'
      and column_name = 'category'
  ) then
    update public.beta_feedback
    set type = case category
      when 'suggestion' then 'feature'
      when 'praise' then 'other'
      when 'bug' then 'bug'
      else 'other'
    end
    where type is null;

    alter table public.beta_feedback
      alter column category drop not null;
  end if;
end $$;

update public.beta_feedback set type = 'other' where type is null;

alter table public.beta_feedback
  alter column type set not null;

do $$
begin
  alter table public.beta_feedback
    drop constraint if exists beta_feedback_type_check;
  alter table public.beta_feedback
    add constraint beta_feedback_type_check
    check (type in ('bug', 'feature', 'ux', 'performance', 'other'));

  alter table public.beta_feedback
    drop constraint if exists beta_feedback_severity_check;
  alter table public.beta_feedback
    add constraint beta_feedback_severity_check
    check (severity is null or severity in ('blocker', 'high', 'medium', 'low', 'critical'));
end $$;

create index if not exists idx_beta_feedback_status_time on public.beta_feedback (status, created_at desc);
create index if not exists idx_beta_feedback_type_sev on public.beta_feedback (type, severity);
create index if not exists idx_beta_feedback_app on public.beta_feedback (app_area) where app_area is not null;
