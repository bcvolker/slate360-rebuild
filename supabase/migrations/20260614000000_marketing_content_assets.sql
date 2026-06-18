-- Marketing content assets — CEO-managed references for homepage/marketing
-- surfaces (hero, feature tiles, Learn More) so they can be swapped without a
-- redeploy. Idempotent. Service-role only (managed via the admin client from the
-- owner-gated /api/ceo/content endpoints).

create table if not exists public.marketing_content_assets (
  id          uuid primary key default gen_random_uuid(),
  placement   text not null,
  label       text,
  url         text not null,
  updated_by  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_marketing_content_assets_placement
  on public.marketing_content_assets (placement, created_at desc);

-- updated_at trigger (set_updated_at() already exists in this project)
drop trigger if exists trg_marketing_content_assets_updated_at on public.marketing_content_assets;
create trigger trg_marketing_content_assets_updated_at
  before update on public.marketing_content_assets
  for each row execute function public.set_updated_at();

-- RLS: service-role only. No anon/authenticated policies — only the admin client
-- (service role) reads/writes, and the API gates to the owner email.
alter table public.marketing_content_assets enable row level security;
