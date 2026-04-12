-- Per-app modular subscription state for each organization.
-- One row per org. Columns track individual app tiers + bundle + addons.

CREATE TABLE IF NOT EXISTS public.org_app_subscriptions (
  org_id       uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  site_walk    text NOT NULL DEFAULT 'none' CHECK (site_walk    IN ('none','basic','pro')),
  tours        text NOT NULL DEFAULT 'none' CHECK (tours        IN ('none','basic','pro')),
  slatedrop    text NOT NULL DEFAULT 'none' CHECK (slatedrop    IN ('none','basic','pro')),
  design_studio text NOT NULL DEFAULT 'none' CHECK (design_studio IN ('none','basic','pro')),
  content_studio text NOT NULL DEFAULT 'none' CHECK (content_studio IN ('none','basic','pro')),
  bundle       text          DEFAULT NULL   CHECK (bundle IS NULL OR bundle IN ('field_pro','all_access')),
  storage_addon_gb integer NOT NULL DEFAULT 0 CHECK (storage_addon_gb >= 0),
  credit_addon_balance integer NOT NULL DEFAULT 0 CHECK (credit_addon_balance >= 0),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION public.set_org_app_subscriptions_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_org_app_subscriptions_updated_at
  BEFORE UPDATE ON public.org_app_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_org_app_subscriptions_updated_at();

-- RLS
ALTER TABLE public.org_app_subscriptions ENABLE ROW LEVEL SECURITY;

-- Org members can read their own row
CREATE POLICY "Org members can read own subscriptions"
  ON public.org_app_subscriptions FOR SELECT
  USING (
    org_id IN (
      SELECT om.org_id FROM public.organization_members om WHERE om.user_id = auth.uid()
    )
  );

-- Only service role (webhook) writes — no authenticated INSERT/UPDATE/DELETE
CREATE POLICY "Service role manages subscriptions"
  ON public.org_app_subscriptions FOR ALL
  USING (false);
