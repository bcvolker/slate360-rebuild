CREATE TABLE IF NOT EXISTS public.stripe_events (
  id text PRIMARY KEY,
  type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;

-- Allow service role access implicitly, block authenticated
CREATE POLICY "No access for authenticated users" ON public.stripe_events FOR ALL USING (false);

-- Storage quota recovery RPC
CREATE OR REPLACE FUNCTION public.increment_org_storage(target_org_id uuid, bytes_delta bigint)
RETURNS void AS $$
BEGIN
  UPDATE public.organizations
  SET org_storage_used_bytes = GREATEST(0, COALESCE(org_storage_used_bytes, 0) + bytes_delta)
  WHERE id = target_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
