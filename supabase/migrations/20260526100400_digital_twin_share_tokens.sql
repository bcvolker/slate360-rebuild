-- Branded Digital Twin share links: view / annotate / download + atomic view tracking.

create table if not exists public.digital_twin_share_tokens (
  id                uuid primary key default gen_random_uuid(),
  token             text not null unique,
  org_id            uuid not null references public.organizations(id) on delete cascade,
  space_id          uuid not null references public.digital_twin_spaces(id) on delete cascade,
  created_by        uuid not null references auth.users(id) on delete set null,
  role              text not null default 'view'
                      check (role in ('view', 'annotate', 'download')),
  label             text,
  expires_at        timestamptz,
  max_views         integer check (max_views is null or max_views > 0),
  view_count        integer not null default 0 check (view_count >= 0),
  download_count    integer not null default 0 check (download_count >= 0),
  is_revoked        boolean not null default false,
  password_hash     text,
  branding_snapshot jsonb not null default '{}'::jsonb,
  last_viewed_at    timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists idx_dt_share_token on public.digital_twin_share_tokens(token);
create index if not exists idx_dt_share_space on public.digital_twin_share_tokens(space_id);
create table if not exists public.digital_twin_share_views (
  id               uuid primary key default gen_random_uuid(),
  share_token_id   uuid not null references public.digital_twin_share_tokens(id) on delete cascade,
  viewer_ip        text,
  viewer_ua        text,
  viewed_at        timestamptz not null default now()
);
create index if not exists idx_dt_share_views_token on public.digital_twin_share_views(share_token_id, viewed_at desc);
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'digital_twin_pin_comments_share_token_fk'
  ) then
    alter table public.digital_twin_pin_comments
      add constraint digital_twin_pin_comments_share_token_fk
      foreign key (share_token_id) references public.digital_twin_share_tokens(id) on delete set null;
  end if;

  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'digital_twin_comments_share_token_fk'
  ) then
    alter table public.digital_twin_comments
      add constraint digital_twin_comments_share_token_fk
      foreign key (share_token_id) references public.digital_twin_share_tokens(id) on delete set null;
  end if;
end $$;
drop trigger if exists trg_dt_share_tokens_updated_at on public.digital_twin_share_tokens;
create trigger trg_dt_share_tokens_updated_at
  before update on public.digital_twin_share_tokens
  for each row execute function public.set_updated_at();
alter table public.digital_twin_share_tokens enable row level security;
drop policy if exists dt_share_tokens_select on public.digital_twin_share_tokens;
create policy dt_share_tokens_select on public.digital_twin_share_tokens
  for select to authenticated
  using (public.user_is_org_member(org_id));
drop policy if exists dt_share_tokens_insert on public.digital_twin_share_tokens;
create policy dt_share_tokens_insert on public.digital_twin_share_tokens
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and public.user_is_org_member(org_id)
  );
drop policy if exists dt_share_tokens_update on public.digital_twin_share_tokens;
create policy dt_share_tokens_update on public.digital_twin_share_tokens
  for update to authenticated
  using (public.user_is_org_member(org_id))
  with check (public.user_is_org_member(org_id));
alter table public.digital_twin_share_views enable row level security;
revoke all on table public.digital_twin_share_views from anon, authenticated;
create or replace function public.claim_digital_twin_share_view(
  p_token text,
  p_viewer_ip text default null,
  p_viewer_ua text default null
)
returns setof public.digital_twin_share_tokens
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row public.digital_twin_share_tokens%rowtype;
begin
  update public.digital_twin_share_tokens
  set view_count = view_count + 1,
      last_viewed_at = now(),
      updated_at = now()
  where token = p_token
    and is_revoked = false
    and (expires_at is null or expires_at > now())
    and (max_views is null or view_count < max_views)
  returning * into v_row;

  if not found then
    return;
  end if;

  insert into public.digital_twin_share_views (share_token_id, viewer_ip, viewer_ua)
  values (v_row.id, p_viewer_ip, p_viewer_ua);

  return next v_row;
end;
$$;
comment on function public.claim_digital_twin_share_view is
  'Atomically increments share view_count when token is valid; appends audit row.';
revoke all on function public.claim_digital_twin_share_view(text, text, text) from public;
grant execute on function public.claim_digital_twin_share_view(text, text, text) to service_role;
revoke all on table public.digital_twin_share_tokens from anon;
