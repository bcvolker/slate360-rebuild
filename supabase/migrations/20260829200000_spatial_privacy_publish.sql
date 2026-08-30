-- Spatial Walkthrough privacy + publishing.
-- MASTER (spatial_clips.master_key) is immutable. Shares stay CLIENT|PUBLIC only.

ALTER TABLE public.spatial_clips
  ADD COLUMN IF NOT EXISTS operator_patch jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.spatial_redactions
  ADD COLUMN IF NOT EXISTS waypoint_id uuid REFERENCES public.spatial_waypoints(id) ON DELETE CASCADE;

ALTER TABLE public.spatial_redactions DROP CONSTRAINT IF EXISTS spatial_redactions_mode_check;
ALTER TABLE public.spatial_redactions
  ADD CONSTRAINT spatial_redactions_mode_check
  CHECK (mode IN ('skip','solid','operator-patch','blur','cover','hide-waypoint','panel'));

ALTER TABLE public.spatial_share_tokens
  ADD COLUMN IF NOT EXISTS token_hash text,
  ADD COLUMN IF NOT EXISTS token_prefix text;

UPDATE public.spatial_share_tokens
SET
  token_hash = encode(sha256(convert_to(token, 'utf8')), 'hex'),
  token_prefix = left(token, 8)
WHERE token_hash IS NULL AND token IS NOT NULL;

ALTER TABLE public.spatial_share_tokens ALTER COLUMN token DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_sw_share_token_hash
  ON public.spatial_share_tokens(token_hash)
  WHERE token_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sw_redact_waypoint ON public.spatial_redactions(waypoint_id);

-- Never rewrite the archival master object key or its hash once set.
CREATE OR REPLACE FUNCTION public.spatial_clip_protect_master()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.master_key IS NOT NULL AND NEW.master_key IS DISTINCT FROM OLD.master_key THEN
      RAISE EXCEPTION 'MASTER is immutable';
    END IF;
    IF OLD.master_sha256 IS NOT NULL AND NEW.master_sha256 IS DISTINCT FROM OLD.master_sha256 THEN
      RAISE EXCEPTION 'MASTER hash is immutable';
    END IF;
    IF OLD.master_bytes IS NOT NULL AND NEW.master_bytes IS DISTINCT FROM OLD.master_bytes THEN
      RAISE EXCEPTION 'MASTER size is immutable';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_spatial_clip_protect_master ON public.spatial_clips;
CREATE TRIGGER trg_spatial_clip_protect_master
  BEFORE UPDATE ON public.spatial_clips
  FOR EACH ROW EXECUTE FUNCTION public.spatial_clip_protect_master();
