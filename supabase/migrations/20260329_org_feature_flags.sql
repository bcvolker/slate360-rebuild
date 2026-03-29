-- Phase 2A: org_feature_flags — standalone app entitlements per organization.
--
-- This table is the source of truth for which standalone apps an organization
-- has purchased. It is written ONLY by the Stripe webhook (service role).
-- Client-side reads are allowed for organization members (via RLS).
-- No client-side INSERT/UPDATE/DELETE policies — only the webhook (admin client) can mutate.

CREATE TABLE IF NOT EXISTS public.org_feature_flags (
  org_id        uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Standalone app subscriptions
  standalone_tour_builder  boolean  NOT NULL DEFAULT false,
  standalone_punchwalk     boolean  NOT NULL DEFAULT false,

  -- Seat management for standalone apps
  tour_builder_seat_limit  integer  NOT NULL DEFAULT 1,
  tour_builder_seats_used  integer  NOT NULL DEFAULT 0,

  -- Audit timestamps
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT tour_builder_seats_valid CHECK (tour_builder_seats_used >= 0 AND tour_builder_seats_used <= tour_builder_seat_limit),
  CONSTRAINT tour_builder_seat_limit_positive CHECK (tour_builder_seat_limit >= 0)
);

COMMENT ON TABLE public.org_feature_flags IS 'Standalone app entitlements per org. Written only by Stripe webhook via service role.';

-- Auto-update updated_at on every row change
CREATE OR REPLACE FUNCTION public.update_org_feature_flags_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_org_feature_flags_updated_at
  BEFORE UPDATE ON public.org_feature_flags
  FOR EACH ROW
  EXECUTE FUNCTION public.update_org_feature_flags_updated_at();

-- Enable RLS
ALTER TABLE public.org_feature_flags ENABLE ROW LEVEL SECURITY;

-- READ policy: authenticated users can read flags for organizations they belong to
DROP POLICY IF EXISTS org_feature_flags_select_member ON public.org_feature_flags;
CREATE POLICY org_feature_flags_select_member
  ON public.org_feature_flags
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.org_id = org_feature_flags.org_id
        AND organization_members.user_id = auth.uid()
    )
  );

-- No INSERT/UPDATE/DELETE policies for authenticated role.
-- Only the service role (admin client in webhook) bypasses RLS to mutate rows.
-- This prevents org admins from self-granting app access.
