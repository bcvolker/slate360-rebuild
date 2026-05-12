CREATE TABLE IF NOT EXISTS public.plan_raster_jobs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_set_id uuid NOT NULL REFERENCES public.site_walk_plan_sets(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  error_text text,
  attempts integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.plan_raster_jobs ENABLE ROW LEVEL SECURITY;
