-- Two-way Q&A on shared Site Walk deliverables (mirrors the thermal share Q&A).
-- Viewers ask questions on a shared deliverable; the owner replies. Threaded via
-- parent_id; owner replies flagged is_owner_reply. Idempotent. Service-role only
-- (all access via the admin client behind token-gated / authed routes).

create table if not exists public.site_walk_deliverable_questions (
  id            uuid primary key default gen_random_uuid(),
  deliverable_id uuid not null references public.site_walk_deliverables(id) on delete cascade,
  org_id        uuid references public.organizations(id) on delete set null,
  parent_id     uuid references public.site_walk_deliverable_questions(id) on delete cascade,
  author_name   text,
  author_email  text,
  body          text not null,
  is_owner_reply boolean not null default false,
  status        text not null default 'new',
  created_at    timestamptz not null default now()
);

create index if not exists idx_deliverable_questions_deliverable
  on public.site_walk_deliverable_questions (deliverable_id, created_at);

alter table public.site_walk_deliverable_questions enable row level security;
-- No anon/authenticated policies — only the service-role admin client (used by the
-- token-gated public route and the owner-authed route) reads/writes this table.
