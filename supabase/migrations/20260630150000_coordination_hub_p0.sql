-- Coordination Hub — P0 foundation (additive, idempotent).
-- Event log + per-user inbox superset + preferences + delivery attempts + push tokens.
-- Design: docs/design/COORDINATION_HUB_LOCKED.md (10+ AI panel consensus + repo audit).
-- Slate360 stays source of truth; external clients use browser links + email/SMS only.
--
-- RLS pattern used across the repo:
--   org_id in (select org_id from public.organization_members where user_id = auth.uid())
-- Inbox rows are private to their recipient (user_id = auth.uid()).
-- Events are inserted by the service role (triggers / Trigger.dev worker) and read by org members.

-- ---------------------------------------------------------------------------
-- 1. coordination_events — append-only source of truth ("the outbox")
-- ---------------------------------------------------------------------------
create table if not exists public.coordination_events (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null references public.organizations(id) on delete cascade,
  project_id        uuid references public.projects(id) on delete set null,
  category          text not null,       -- deliverable_comment|file_upload|calendar|milestone|twin_processing|mention|sharing|message_reply|system
  event_type        text not null,       -- fine-grained, e.g. 'deliverable.comment_created'
  actor_type        text not null default 'system' check (actor_type in ('user','contact','anonymous','system','worker')),
  actor_user_id     uuid references auth.users(id) on delete set null,
  actor_contact_id  uuid references public.org_contacts(id) on delete set null,
  actor_label       text,                -- external name/email when no user/contact row
  subject_type      text not null,       -- deliverable|file|comment|calendar_event|twin_job|folder|message|share
  subject_id        uuid,
  thread_key        text not null,       -- grouping, e.g. 'deliverable:<id>:item:<item_id>'
  payload           jsonb not null default '{}'::jsonb,
  idempotency_key   text not null,       -- e.g. 'deliverable:<id>:comment:<comment_id>'
  processed_at      timestamptz,         -- set by fan-out worker
  attempts          int not null default 0,
  last_error        text,
  created_at        timestamptz not null default now(),
  unique (idempotency_key)
);
create index if not exists coordination_events_org_created_idx  on public.coordination_events(org_id, created_at desc);
create index if not exists coordination_events_project_idx      on public.coordination_events(project_id, created_at desc) where project_id is not null;
create index if not exists coordination_events_thread_idx       on public.coordination_events(org_id, thread_key, created_at desc);
create index if not exists coordination_events_unprocessed_idx  on public.coordination_events(created_at) where processed_at is null;

alter table public.coordination_events enable row level security;
drop policy if exists coordination_events_select on public.coordination_events;
create policy coordination_events_select on public.coordination_events
  for select using (
    org_id in (select org_id from public.organization_members where user_id = auth.uid())
  );
-- Inserts/updates are service-role only (triggers + Trigger.dev). No anon/user write policy on purpose.

-- ---------------------------------------------------------------------------
-- 2. notification_threads — group notifications by subject/conversation
-- ---------------------------------------------------------------------------
create table if not exists public.notification_threads (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references public.organizations(id) on delete cascade,
  project_id     uuid references public.projects(id) on delete set null,
  thread_key     text not null,
  category       text not null,
  subject_type   text not null,
  subject_id     uuid,
  title          text not null,
  last_event_id  uuid references public.coordination_events(id) on delete set null,
  last_event_at  timestamptz not null default now(),
  archived_at    timestamptz,
  created_at     timestamptz not null default now(),
  unique (org_id, thread_key)
);
create index if not exists notification_threads_org_activity_idx on public.notification_threads(org_id, last_event_at desc);
create index if not exists notification_threads_project_idx      on public.notification_threads(project_id, last_event_at desc) where project_id is not null;

alter table public.notification_threads enable row level security;
drop policy if exists notification_threads_select on public.notification_threads;
create policy notification_threads_select on public.notification_threads
  for select using (
    org_id in (select org_id from public.organization_members where user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- 3. coordination_notifications — the per-user inbox (superset of project_notifications)
-- ---------------------------------------------------------------------------
create table if not exists public.coordination_notifications (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references public.organizations(id) on delete cascade,
  user_id        uuid not null references auth.users(id) on delete cascade,   -- recipient
  project_id     uuid references public.projects(id) on delete set null,      -- null = org-level
  event_id       uuid not null references public.coordination_events(id) on delete cascade,
  thread_id      uuid references public.notification_threads(id) on delete set null,
  category       text not null,
  title          text not null,
  body           text,
  action_url     text,
  priority       text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  read_at        timestamptz,
  archived_at    timestamptz,
  snoozed_until  timestamptz,
  created_at     timestamptz not null default now(),
  unique (user_id, event_id)
);
create index if not exists coord_notif_user_inbox_idx  on public.coordination_notifications(user_id, archived_at, snoozed_until, created_at desc);
create index if not exists coord_notif_user_unread_idx on public.coordination_notifications(user_id) where read_at is null and archived_at is null;
create index if not exists coord_notif_thread_idx      on public.coordination_notifications(thread_id, user_id, created_at desc);
create index if not exists coord_notif_org_project_idx on public.coordination_notifications(org_id, project_id, created_at desc);

alter table public.coordination_notifications enable row level security;
drop policy if exists coord_notif_select on public.coordination_notifications;
create policy coord_notif_select on public.coordination_notifications
  for select using (user_id = auth.uid());
drop policy if exists coord_notif_update on public.coordination_notifications;
create policy coord_notif_update on public.coordination_notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
-- Inserts are service-role only (fan-out worker).

-- ---------------------------------------------------------------------------
-- 4. notification_preferences — per user × org × category × channel
-- ---------------------------------------------------------------------------
create table if not exists public.notification_preferences (
  user_id     uuid not null references auth.users(id) on delete cascade,
  org_id      uuid not null references public.organizations(id) on delete cascade,
  category    text not null,
  in_app      boolean not null default true,
  push        boolean not null default true,
  email       boolean not null default false,
  sms         boolean not null default false,   -- opt-in only
  cadence     text not null default 'immediate' check (cadence in ('immediate','digest_hourly','digest_daily','off')),
  updated_at  timestamptz not null default now(),
  primary key (user_id, org_id, category)
);
alter table public.notification_preferences enable row level security;
drop policy if exists notification_preferences_all on public.notification_preferences;
create policy notification_preferences_all on public.notification_preferences
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Global per-user settings (quiet hours, digest window, channel master switches, SMS consent)
create table if not exists public.notification_settings (
  user_id           uuid primary key references auth.users(id) on delete cascade,
  quiet_hours_start time,
  quiet_hours_end   time,
  timezone          text not null default 'America/Phoenix',
  digest_hour_local int,                         -- 0-23; null = no daily digest
  push_enabled      boolean not null default true,
  email_enabled     boolean not null default true,
  sms_enabled       boolean not null default false,
  sms_opted_in_at   timestamptz,                 -- TCPA consent timestamp
  updated_at        timestamptz not null default now()
);
alter table public.notification_settings enable row level security;
drop policy if exists notification_settings_all on public.notification_settings;
create policy notification_settings_all on public.notification_settings
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 5. notification_deliveries — per-channel dispatch log (retry/backoff/metering)
-- ---------------------------------------------------------------------------
create table if not exists public.notification_deliveries (
  id                uuid primary key default gen_random_uuid(),
  notification_id   uuid not null references public.coordination_notifications(id) on delete cascade,
  org_id            uuid not null references public.organizations(id) on delete cascade,
  user_id           uuid not null references auth.users(id) on delete cascade,
  channel           text not null check (channel in ('in_app','push','email','sms')),
  provider          text,                          -- resend|twilio|fcm|apns|supabase
  provider_message_id text,
  status            text not null default 'pending' check (status in ('pending','sent','delivered','failed','skipped','suppressed')),
  attempts          int not null default 0,
  last_error        text,
  cost_micros       bigint not null default 0,     -- metered cost for billing
  scheduled_for     timestamptz,
  sent_at           timestamptz,
  created_at        timestamptz not null default now(),
  unique (notification_id, channel)
);
create index if not exists notif_deliveries_pending_idx on public.notification_deliveries(status, scheduled_for) where status in ('pending','failed');
create index if not exists notif_deliveries_org_idx     on public.notification_deliveries(org_id, created_at desc);

alter table public.notification_deliveries enable row level security;
drop policy if exists notif_deliveries_select on public.notification_deliveries;
create policy notif_deliveries_select on public.notification_deliveries
  for select using (user_id = auth.uid());
-- Writes are service-role only.

-- ---------------------------------------------------------------------------
-- 6. push_device_tokens — APNs/FCM registration (P5 uses; table ready now)
-- ---------------------------------------------------------------------------
create table if not exists public.push_device_tokens (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  org_id       uuid references public.organizations(id) on delete cascade,
  platform     text not null check (platform in ('ios','android','web')),
  provider     text not null default 'fcm' check (provider in ('fcm','apns','webpush')),
  token        text not null,
  device_label text,
  enabled      boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at   timestamptz not null default now(),
  unique (provider, token)
);
create index if not exists push_device_tokens_user_idx on public.push_device_tokens(user_id) where enabled;

alter table public.push_device_tokens enable row level security;
drop policy if exists push_device_tokens_all on public.push_device_tokens;
create policy push_device_tokens_all on public.push_device_tokens
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 7. Realtime: publish the inbox so the client gets live updates
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.coordination_notifications;
    exception when duplicate_object then null;
    end;
  end if;
end$$;
