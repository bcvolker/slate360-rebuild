-- Directed Tour PR-B: client portal packaging (additive only).
-- A client sees a deliverable only when it is packaged for the project, ready,
-- published and allowed for the share's audience. See docs/design/DIRECTED_TOUR_BUILD_PLAN.md §2.

-- Rollout switch. Packaging is enforced only for orgs with this on.
ALTER TABLE public.org_feature_flags
  ADD COLUMN IF NOT EXISTS spatial_directed_tour boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.spatial_portal_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id uuid NOT NULL UNIQUE REFERENCES public.projects(id) ON DELETE CASCADE,
  deliverables text[] NOT NULL DEFAULT '{}'::text[]
    CHECK (deliverables <@ ARRAY['walkthrough','tour','stations','twin','plan','evidence','issues']::text[]),
  tour_history_enabled boolean NOT NULL DEFAULT true,
  -- null = latest published visit
  current_visit_id uuid REFERENCES public.spatial_walkthroughs(id) ON DELETE SET NULL,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_spp_org ON public.spatial_portal_packages(org_id);

ALTER TABLE public.spatial_portal_packages ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY spp_org_all ON public.spatial_portal_packages FOR ALL
    USING (EXISTS (SELECT 1 FROM public.organization_members om WHERE om.org_id = spatial_portal_packages.org_id AND om.user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.organization_members om WHERE om.org_id = spatial_portal_packages.org_id AND om.user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
REVOKE ALL ON TABLE public.spatial_portal_packages FROM anon;

-- Per-share narrowing (null = inherit the project package; enforced as a subset in the API),
-- audience for later evidence/issue filtering, and operator-preview tokens.
ALTER TABLE public.spatial_share_tokens
  ADD COLUMN IF NOT EXISTS deliverables text[],
  ADD COLUMN IF NOT EXISTS audience text NOT NULL DEFAULT 'client',
  ADD COLUMN IF NOT EXISTS purpose text NOT NULL DEFAULT 'share';
DO $$ BEGIN
  ALTER TABLE public.spatial_share_tokens ADD CONSTRAINT spatial_share_tokens_audience_check
    CHECK (audience IN ('client','consultant','subcontractor','public'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.spatial_share_tokens ADD CONSTRAINT spatial_share_tokens_purpose_check
    CHECK (purpose IN ('share','preview'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Documents default to internal: contracts/invoices/proposals stay private unless selected.
-- Existing rows keep today's behaviour (client-visible).
DO $$ BEGIN
  ALTER TABLE public.spatial_project_documents
    ADD COLUMN visibility text NOT NULL DEFAULT 'internal'
    CHECK (visibility IN ('internal','client','consultant','subcontractor','public'));
  UPDATE public.spatial_project_documents SET visibility = 'client';
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Backfill: every project that already has a spatial share keeps today's tabs. Tour is not
-- included; it is opted in per project once visits are mapped.
INSERT INTO public.spatial_portal_packages (org_id, project_id, deliverables)
SELECT DISTINCT w.org_id, w.project_id,
  ARRAY['walkthrough','stations','twin','plan','evidence','issues']::text[]
FROM public.spatial_share_tokens s
JOIN public.spatial_walkthroughs w ON w.id = s.walkthrough_id
WHERE w.project_id IS NOT NULL
ON CONFLICT (project_id) DO NOTHING;
