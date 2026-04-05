-- Deliverable cleanup queue + trigger on org churn.
--
-- When an org's tier drops to 'trial' (subscription cancel / downgrade),
-- a row is inserted into `deliverable_cleanup_queue` so that a background
-- worker can reclaim storage, revoke shares, and archive deliverables.
--
-- This is a pure Postgres approach — no HTTP calls from triggers.
-- A cron or edge function polls the queue periodically.

-- ══════════════════════════════════════════════════════════════
-- 1. Queue table
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.deliverable_cleanup_queue (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  org_id     uuid         NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  old_tier   text         NOT NULL,
  new_tier   text         NOT NULL DEFAULT 'trial',
  status     text         NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'processing', 'done', 'failed')),
  created_at timestamptz  NOT NULL DEFAULT now(),
  processed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_cleanup_queue_pending
  ON public.deliverable_cleanup_queue (status)
  WHERE status = 'pending';

COMMENT ON TABLE public.deliverable_cleanup_queue IS
  'Job queue for deferred cleanup when an org downgrades / churns. '
  'Workers poll for status=pending rows, process them, then mark done.';

-- ══════════════════════════════════════════════════════════════
-- 2. Trigger function — fires AFTER UPDATE on organizations.tier
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.trg_enqueue_deliverable_cleanup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only fire when tier actually changed AND the new tier is 'trial'
  IF OLD.tier IS DISTINCT FROM NEW.tier AND NEW.tier = 'trial' THEN
    INSERT INTO deliverable_cleanup_queue (org_id, old_tier, new_tier)
    VALUES (NEW.id, OLD.tier, NEW.tier);
  END IF;

  RETURN NEW;
END;
$$;

-- ══════════════════════════════════════════════════════════════
-- 3. Attach trigger to organizations table
-- ══════════════════════════════════════════════════════════════

DROP TRIGGER IF EXISTS on_org_tier_downgrade ON public.organizations;

CREATE TRIGGER on_org_tier_downgrade
  AFTER UPDATE OF tier ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_enqueue_deliverable_cleanup();

-- ══════════════════════════════════════════════════════════════
-- 4. RLS — only service role should read/write queue rows
-- ══════════════════════════════════════════════════════════════

ALTER TABLE public.deliverable_cleanup_queue ENABLE ROW LEVEL SECURITY;

-- No policies = only service_role (bypasses RLS) can access.
-- This is intentional — queue is an internal system table.

REVOKE ALL ON TABLE public.deliverable_cleanup_queue FROM anon;
REVOKE ALL ON TABLE public.deliverable_cleanup_queue FROM authenticated;
