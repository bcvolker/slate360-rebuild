-- vNext project and saved-view share links.
-- A token does not grant a capability, a publication, or an account.
-- Site Walk, Digital Twin, Thermal, and deliverable tokens are separate tables.

create table if not exists public.project_share_links (
  id uuid primary key default gen_random_uuid(),
  token text not null,
  project_id uuid not null references public.projects(id) on delete cascade,
  target_type text not null,
  saved_view_id uuid references public.project_saved_views(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  label text,
  expires_at timestamptz,
  is_revoked boolean not null default false,
  revoked_at timestamptz,
  view_count integer not null default 0,
  last_viewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_share_links_token_key unique (token),
  constraint project_share_links_token_check check (char_length(token) between 32 and 128),
  constraint project_share_links_target_check check (
    (target_type = 'project' and saved_view_id is null)
    or (target_type = 'saved_view' and saved_view_id is not null)
  ),
  constraint project_share_links_label_check check (label is null or char_length(btrim(label)) between 1 and 80),
  constraint project_share_links_views_check check (view_count >= 0)
);

comment on table public.project_share_links is
  'vNext public links. project follows the current published portal. saved_view stays on that exact source. Neither overrides scope or publication.';

create index if not exists project_share_links_project_id_idx
  on public.project_share_links (project_id);

alter table public.project_share_links enable row level security;

revoke all on table public.project_share_links from public, anon, authenticated;
grant select, insert, update, delete on table public.project_share_links to service_role;

-- One open per portal entry. Revoked or expired tokens do not increment.
create or replace function public.claim_project_share_open(p_token text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  link public.project_share_links%rowtype;
begin
  select * into link
  from public.project_share_links
  where token = p_token
  for update;

  if not found then
    return false;
  end if;
  if link.is_revoked then
    return false;
  end if;
  if link.expires_at is not null and link.expires_at <= now() then
    return false;
  end if;

  update public.project_share_links
  set view_count = link.view_count + 1,
      last_viewed_at = now(),
      updated_at = now()
  where id = link.id;

  return true;
end;
$$;

revoke all on function public.claim_project_share_open(text) from public, anon, authenticated;
grant execute on function public.claim_project_share_open(text) to service_role;
