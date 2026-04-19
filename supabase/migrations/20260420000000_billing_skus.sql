-- Billing SKUs: app-centric subscription model (replaces single-tier per-org).
-- Idempotent: safe to re-run. Does NOT drop legacy organizations.tier (kept
-- for migration window — entitlements code maps it forward).

-- ---------------------------------------------------------------------------
-- Subscription SKU enum (mirrors lookupKey values in lib/billing/cost-model.ts)
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'subscription_sku_kind') then
    create type public.subscription_sku_kind as enum (
      'site_walk_std', 'site_walk_pro',
      'tours_std', 'tours_pro',
      'design_studio_std', 'design_studio_pro',
      'content_studio_std', 'content_studio_pro',
      'project_bundle_std', 'project_bundle_pro',
      'studio_bundle_std', 'studio_bundle_pro',
      'total_std', 'total_pro',
      'enterprise'
    );
  end if;
end$$;

-- ---------------------------------------------------------------------------
-- org_subscriptions: one row per active SKU per org (multi-row replaces tier)
-- ---------------------------------------------------------------------------
create table if not exists public.org_subscriptions (
  id                       uuid primary key default gen_random_uuid(),
  org_id                   uuid not null references public.organizations(id) on delete cascade,
  sku                      public.subscription_sku_kind not null,
  status                   text not null default 'active'
                             check (status in ('trialing','active','past_due','canceled','incomplete','paused')),
  stripe_subscription_id   text,
  stripe_price_id          text,
  stripe_customer_id       text,
  billing_interval         text check (billing_interval in ('month','year')),
  current_period_start     timestamptz,
  current_period_end       timestamptz,
  cancel_at_period_end     boolean not null default false,
  metadata                 jsonb not null default '{}'::jsonb,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  unique (org_id, sku, status) deferrable initially deferred
);

create index if not exists idx_org_subs_org on public.org_subscriptions (org_id) where status in ('active','trialing','past_due');
create index if not exists idx_org_subs_stripe on public.org_subscriptions (stripe_subscription_id);

alter table public.org_subscriptions enable row level security;

drop policy if exists "org_subs_select_member" on public.org_subscriptions;
create policy "org_subs_select_member" on public.org_subscriptions
  for select using (
    exists (
      select 1 from public.organization_members om
      where om.org_id = org_subscriptions.org_id and om.user_id = auth.uid()
    )
  );

drop policy if exists "org_subs_service_write" on public.org_subscriptions;
create policy "org_subs_service_write" on public.org_subscriptions
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- credit_balance: one row per org, monotonic running total
-- ---------------------------------------------------------------------------
create table if not exists public.credit_balance (
  org_id              uuid primary key references public.organizations(id) on delete cascade,
  balance_credits     bigint not null default 0,
  monthly_allowance   bigint not null default 0,
  last_reset_at       timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table public.credit_balance enable row level security;

drop policy if exists "credit_balance_select_member" on public.credit_balance;
create policy "credit_balance_select_member" on public.credit_balance
  for select using (
    exists (
      select 1 from public.organization_members om
      where om.org_id = credit_balance.org_id and om.user_id = auth.uid()
    )
  );

drop policy if exists "credit_balance_service_write" on public.credit_balance;
create policy "credit_balance_service_write" on public.credit_balance
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- credit_ledger: ALREADY EXISTS on live with a richer schema (organization_id,
-- delta, category, ref_type/ref_id, credit_source, etc.). We adopt that
-- schema rather than overwrite it. Code in lib/billing/* must use:
--   organization_id (not org_id)
--   delta (not delta_credits)
--   category (not reason)  — values: subscription/purchase/bonus/refund/
--                                     job_usage/storage_usage/bandwidth_usage/
--                                     export_usage/api_usage/adjustment/expiration
--   credit_source — 'monthly'|'purchased'|'bonus'|'refund'|'mixed'
-- This block intentionally left as documentation only. No DDL.

-- ---------------------------------------------------------------------------
-- collaborator_addons: stacked +5/+10/+25 packs purchased after subscribe
-- ---------------------------------------------------------------------------
create table if not exists public.collaborator_addons (
  id                       uuid primary key default gen_random_uuid(),
  org_id                   uuid not null references public.organizations(id) on delete cascade,
  count                    int not null check (count > 0),
  pack_lookup_key          text not null,
  stripe_subscription_id   text,
  stripe_price_id          text,
  status                   text not null default 'active'
                             check (status in ('active','canceled','past_due')),
  current_period_end       timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index if not exists idx_collab_addons_org on public.collaborator_addons (org_id) where status = 'active';

alter table public.collaborator_addons enable row level security;

drop policy if exists "collab_addons_select_member" on public.collaborator_addons;
create policy "collab_addons_select_member" on public.collaborator_addons
  for select using (
    exists (
      select 1 from public.organization_members om
      where om.org_id = collaborator_addons.org_id and om.user_id = auth.uid()
    )
  );

drop policy if exists "collab_addons_service_write" on public.collaborator_addons;
create policy "collab_addons_service_write" on public.collaborator_addons
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

comment on table public.org_subscriptions is 'Multi-SKU subscription rows; replaces organizations.tier single-value model.';
comment on table public.credit_balance is 'Per-org running credit balance; updated atomically by ledger triggers in app code.';
comment on table public.collaborator_addons is 'Stacked +N collaborator packs purchased post-subscribe.';
