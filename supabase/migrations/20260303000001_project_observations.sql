-- Observations table: site observations (positive, negative, neutral)
-- with photo uploads and automatic SlateDrop folder integration.
-- Follows the same pattern as project_daily_logs and project_punch_items.

CREATE TABLE IF NOT EXISTS project_observations (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id       uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  number           serial,
  title            text NOT NULL,
  description      text,
  sentiment        text NOT NULL DEFAULT 'neutral'
                   CHECK (sentiment IN ('positive', 'negative', 'neutral')),
  category         text
                   CHECK (category IS NULL OR category IN (
                     'Safety', 'Quality', 'Progress', 'Environmental',
                     'Weather', 'Equipment', 'Personnel', 'General'
                   )),
  location_area    text,
  priority         text DEFAULT 'Medium'
                   CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')),
  status           text DEFAULT 'Open'
                   CHECK (status IN ('Open', 'Acknowledged', 'In Progress', 'Resolved', 'Closed')),
  photos           jsonb DEFAULT '[]'::jsonb,
  notes            text,
  observed_at      timestamptz DEFAULT now(),
  resolved_at      timestamptz,
  created_by       uuid REFERENCES auth.users(id),
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE project_observations ENABLE ROW LEVEL SECURITY;

-- Service-role full access (app uses admin client in API routes)
CREATE POLICY "service_role_full_access_observations"
  ON project_observations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Index for project-scoped queries
CREATE INDEX IF NOT EXISTS idx_project_observations_project_id
  ON project_observations(project_id);

-- Index for filtering by sentiment
CREATE INDEX IF NOT EXISTS idx_project_observations_sentiment
  ON project_observations(project_id, sentiment);
