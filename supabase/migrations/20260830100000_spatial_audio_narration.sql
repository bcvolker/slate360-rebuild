-- Spatial Walkthrough narration / voice notes / transcripts.
-- Additive. Does not alter master clip keys or existing pin/privacy tables.

ALTER TABLE public.spatial_pins DROP CONSTRAINT IF EXISTS spatial_pins_pin_type_check;
ALTER TABLE public.spatial_pins ADD CONSTRAINT spatial_pins_pin_type_check
  CHECK (pin_type IN ('document','rfi','drawing','submittal','photo','issue','note','url','other','voice'));

CREATE TABLE IF NOT EXISTS public.spatial_audio_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  walkthrough_id uuid NOT NULL REFERENCES public.spatial_walkthroughs(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('narration','voice_note')),
  storage_key text NOT NULL,
  mime text,
  bytes bigint,
  duration_s double precision,
  trim_start_s double precision NOT NULL DEFAULT 0,
  trim_end_s double precision,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT spatial_audio_assets_not_master_chk CHECK (storage_key NOT LIKE '%/master.%'),
  CONSTRAINT spatial_audio_assets_audio_prefix_chk CHECK (storage_key LIKE '%/audio/%')
);
CREATE INDEX IF NOT EXISTS idx_sw_audio_wt ON public.spatial_audio_assets(walkthrough_id);

CREATE TABLE IF NOT EXISTS public.spatial_narration_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  walkthrough_id uuid NOT NULL REFERENCES public.spatial_walkthroughs(id) ON DELETE CASCADE,
  clip_id uuid NOT NULL REFERENCES public.spatial_clips(id) ON DELETE CASCADE,
  chapter_id uuid REFERENCES public.spatial_chapters(id) ON DELETE SET NULL,
  pin_id uuid REFERENCES public.spatial_pins(id) ON DELETE SET NULL,
  asset_id uuid REFERENCES public.spatial_audio_assets(id) ON DELETE SET NULL,
  start_time double precision NOT NULL,
  end_time double precision NOT NULL,
  title text,
  speaker text,
  volume double precision NOT NULL DEFAULT 1,
  source text NOT NULL DEFAULT 'upload' CHECK (source IN ('record','upload','replace')),
  transcript_status text NOT NULL DEFAULT 'none'
    CHECK (transcript_status IN ('none','pending','ready','failed','manual')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT spatial_narration_time_chk CHECK (end_time > start_time)
);
CREATE INDEX IF NOT EXISTS idx_sw_narration_clip ON public.spatial_narration_segments(clip_id, start_time);

CREATE TABLE IF NOT EXISTS public.spatial_voice_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  walkthrough_id uuid NOT NULL REFERENCES public.spatial_walkthroughs(id) ON DELETE CASCADE,
  pin_id uuid NOT NULL REFERENCES public.spatial_pins(id) ON DELETE CASCADE,
  asset_id uuid REFERENCES public.spatial_audio_assets(id) ON DELETE SET NULL,
  transcript_status text NOT NULL DEFAULT 'none'
    CHECK (transcript_status IN ('none','pending','ready','failed','manual')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_sw_voice_pin ON public.spatial_voice_notes(pin_id);

CREATE TABLE IF NOT EXISTS public.spatial_transcripts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  walkthrough_id uuid NOT NULL REFERENCES public.spatial_walkthroughs(id) ON DELETE CASCADE,
  narration_segment_id uuid REFERENCES public.spatial_narration_segments(id) ON DELETE CASCADE,
  voice_note_id uuid REFERENCES public.spatial_voice_notes(id) ON DELETE CASCADE,
  provider text NOT NULL,
  language text NOT NULL DEFAULT 'en',
  full_text text NOT NULL DEFAULT '',
  phrases jsonb NOT NULL DEFAULT '[]'::jsonb,
  words jsonb,
  status text NOT NULL DEFAULT 'ready' CHECK (status IN ('pending','ready','failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT spatial_transcripts_target_chk CHECK (
    (narration_segment_id IS NOT NULL AND voice_note_id IS NULL)
    OR (narration_segment_id IS NULL AND voice_note_id IS NOT NULL)
  )
);
CREATE INDEX IF NOT EXISTS idx_sw_transcript_wt ON public.spatial_transcripts(walkthrough_id);

CREATE TABLE IF NOT EXISTS public.spatial_walkthrough_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  walkthrough_id uuid NOT NULL REFERENCES public.spatial_walkthroughs(id) ON DELETE CASCADE,
  kind text NOT NULL,
  t_seconds double precision,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sw_events_wt ON public.spatial_walkthrough_events(walkthrough_id, created_at DESC);

COMMENT ON TABLE public.spatial_audio_assets IS 'Derivative audio only. Master 360 files are never stored here.';
COMMENT ON TABLE public.spatial_walkthrough_events IS 'AI-ready event log. No extraction jobs run from this table yet.';
