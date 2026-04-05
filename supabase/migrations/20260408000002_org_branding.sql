-- Org branding table — stores white-label identity per organization.
-- Only enterprise-tier orgs will have rows here; all others get
-- the Slate360 default branding from the application layer.
--
-- Written by org admins (with canWhiteLabel entitlement check in API).
-- Readable by all org members (via RLS).

CREATE TABLE IF NOT EXISTS public.org_branding (
  org_id          uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  logo_url        text,
  logo_dark_url   text,
  favicon_url     text,
  brand_name      text,
  primary_color   text,      -- hex, e.g. "#1A2B3C"
  accent_color    text,      -- hex
  font_family     text,

  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.org_branding IS 'White-label branding per org. Null columns fall back to Slate360 defaults in app layer.';

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_org_branding_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_org_branding_updated_at
  BEFORE UPDATE ON public.org_branding
  FOR EACH ROW
  EXECUTE FUNCTION public.update_org_branding_updated_at();

-- Enable RLS
ALTER TABLE public.org_branding ENABLE ROW LEVEL SECURITY;

-- READ: org members can read their own org branding
DROP POLICY IF EXISTS org_branding_select_member ON public.org_branding;
CREATE POLICY org_branding_select_member
  ON public.org_branding
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.org_id = org_branding.org_id
        AND organization_members.user_id = auth.uid()
    )
  );

-- WRITE: org members with owner/admin role can update their org branding
-- (entitlement check canWhiteLabel is enforced in the API layer)
DROP POLICY IF EXISTS org_branding_update_admin ON public.org_branding;
CREATE POLICY org_branding_update_admin
  ON public.org_branding
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.org_id = org_branding.org_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role IN ('owner', 'admin')
    )
  );

-- INSERT: org admins can create branding row
DROP POLICY IF EXISTS org_branding_insert_admin ON public.org_branding;
CREATE POLICY org_branding_insert_admin
  ON public.org_branding
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.org_id = org_branding.org_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role IN ('owner', 'admin')
    )
  );
