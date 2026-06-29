-- Evidentiary + offline-sync foundation (ADDITIVE; safe to re-run).
-- Unblocks: evidence_events append-only audit log, server hash re-verify, and
-- HLC-based conflict resolution. No existing columns/tables are modified destructively.

-- 1) Append-only evidence audit log (chain of custody).
--    Server writes via the service role (bypasses RLS); org members may READ their
--    org's trail; there are intentionally NO insert/update/delete policies, so the
--    log is append-only for any non-service client.
CREATE TABLE IF NOT EXISTS public.evidence_events (
  id              bigserial PRIMARY KEY,
  org_id          uuid NOT NULL,
  project_id      uuid,
  entity_type     text NOT NULL,           -- 'site_walk_item' | 'site_walk_deliverable' | ...
  entity_id       text NOT NULL,           -- server uuid OR client_item_id
  event_type      text NOT NULL,           -- captured | uploaded | hash_verified | included_in_deliverable | deliverable_shared | deliverable_viewed | ai_formatted | ...
  actor_user_id   uuid,
  actor_device_id text,
  content_sha256  text,
  prev_hash       text,                     -- previous event_hash for this entity (tamper-evident chain)
  event_hash      text NOT NULL,
  metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_evidence_events_entity
  ON public.evidence_events (entity_type, entity_id, id);
CREATE INDEX IF NOT EXISTS idx_evidence_events_org
  ON public.evidence_events (org_id, created_at);

ALTER TABLE public.evidence_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS evidence_events_select_org ON public.evidence_events;
CREATE POLICY evidence_events_select_org ON public.evidence_events
  FOR SELECT TO authenticated
  USING (
    org_id IN (SELECT org_id FROM public.organization_members WHERE user_id = auth.uid())
  );

-- 2) Integrity + HLC/conflict columns on the main mutable capture entity.
--    capture_sha256 is also mirrored in metadata today; the column makes it queryable
--    and lets the server store the re-verify result.
ALTER TABLE public.site_walk_items
  ADD COLUMN IF NOT EXISTS capture_sha256    text,
  ADD COLUMN IF NOT EXISTS server_sha256     text,
  ADD COLUMN IF NOT EXISTS hash_verified_at  timestamptz,
  ADD COLUMN IF NOT EXISTS capture_device_id text,
  ADD COLUMN IF NOT EXISTS hlc               text,
  ADD COLUMN IF NOT EXISTS author_node_id    text,
  ADD COLUMN IF NOT EXISTS conflict_flag     boolean NOT NULL DEFAULT false;

-- 3) Generic soft-delete tombstones (never hard-delete evidence; resurrect-bug guard).
CREATE TABLE IF NOT EXISTS public.entity_tombstones (
  entity_type        text NOT NULL,
  entity_id          text NOT NULL,
  org_id             uuid,
  deleted_at_hlc     text,
  deleted_by_user_id uuid,
  deleted_at         timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (entity_type, entity_id)
);

ALTER TABLE public.entity_tombstones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS entity_tombstones_select_org ON public.entity_tombstones;
CREATE POLICY entity_tombstones_select_org ON public.entity_tombstones
  FOR SELECT TO authenticated
  USING (
    org_id IN (SELECT org_id FROM public.organization_members WHERE user_id = auth.uid())
  );
