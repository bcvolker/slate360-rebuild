-- Spatial Walkthrough temporal compare. Additive. No Digital Twin tables.
-- Compare Anchor maps a locator in capture A to a locator in capture B.
-- Matching is authored / chapter-assisted. This is not metric world registration.

CREATE TABLE IF NOT EXISTS public.spatial_compare_anchors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  label text,
  before_walkthrough_id uuid NOT NULL REFERENCES public.spatial_walkthroughs(id) ON DELETE CASCADE,
  after_walkthrough_id uuid NOT NULL REFERENCES public.spatial_walkthroughs(id) ON DELETE CASCADE,
  before_locator jsonb NOT NULL,
  after_locator jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sw_compare_distinct_captures CHECK (before_walkthrough_id <> after_walkthrough_id)
);
CREATE INDEX IF NOT EXISTS idx_sw_compare_project ON public.spatial_compare_anchors(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sw_compare_pair ON public.spatial_compare_anchors(before_walkthrough_id, after_walkthrough_id);

-- Pin / future ProjectItem locators for a before/after/verified review.
CREATE TABLE IF NOT EXISTS public.spatial_compare_issue_refs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  pin_id uuid REFERENCES public.spatial_pins(id) ON DELETE SET NULL,
  project_item_id uuid,
  title text NOT NULL DEFAULT 'Issue',
  before_locator jsonb NOT NULL,
  after_locator jsonb NOT NULL,
  verification text NOT NULL DEFAULT 'before'
    CHECK (verification IN ('before', 'after', 'verified')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sw_compare_issue_project ON public.spatial_compare_issue_refs(project_id, created_at DESC);

ALTER TABLE public.spatial_compare_anchors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spatial_compare_issue_refs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY sw_compare_anchor_org_all ON public.spatial_compare_anchors FOR ALL
    USING (EXISTS (SELECT 1 FROM public.organization_members om WHERE om.org_id = spatial_compare_anchors.org_id AND om.user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.organization_members om WHERE om.org_id = spatial_compare_anchors.org_id AND om.user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY sw_compare_issue_org_all ON public.spatial_compare_issue_refs FOR ALL
    USING (EXISTS (SELECT 1 FROM public.organization_members om WHERE om.org_id = spatial_compare_issue_refs.org_id AND om.user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.organization_members om WHERE om.org_id = spatial_compare_issue_refs.org_id AND om.user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

REVOKE ALL ON TABLE public.spatial_compare_anchors FROM anon;
REVOKE ALL ON TABLE public.spatial_compare_issue_refs FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.spatial_compare_anchors TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.spatial_compare_issue_refs TO authenticated;
