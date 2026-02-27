-- ═══════════════════════════════════════════════════════════════════
-- Project Tools Enhancement Migration
-- Adds punch_items and daily_logs tables, enhances existing tables
-- ═══════════════════════════════════════════════════════════════════

-- ─── Punch List Items ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_punch_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  number          serial,
  title           text NOT NULL,
  description     text,
  status          text NOT NULL DEFAULT 'Open'
                    CHECK (status IN ('Open','In Progress','Ready for Review','Closed')),
  priority        text NOT NULL DEFAULT 'Medium'
                    CHECK (priority IN ('Low','Medium','High','Critical')),
  assignee        text,
  location_area   text,
  trade_category  text,
  due_date        date,
  photos          jsonb DEFAULT '[]',
  created_by      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  completed_at    timestamptz
);

CREATE INDEX IF NOT EXISTS idx_punch_items_project ON project_punch_items(project_id);
CREATE INDEX IF NOT EXISTS idx_punch_items_status ON project_punch_items(project_id, status);

-- ─── Daily Logs ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_daily_logs (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id            uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  log_date              date NOT NULL,
  summary               text,
  weather_temp          numeric,
  weather_condition     text,
  weather_wind          text,
  weather_precip        text,
  crew_counts           jsonb DEFAULT '[]',
  equipment             jsonb DEFAULT '[]',
  visitors              text,
  safety_observations   text,
  delays                text,
  photos                jsonb DEFAULT '[]',
  created_by            uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_daily_logs_project ON project_daily_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_daily_logs_date ON project_daily_logs(project_id, log_date DESC);

-- ─── Enhance RFIs ──────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE project_rfis ADD COLUMN IF NOT EXISTS rfi_number serial;
EXCEPTION WHEN others THEN NULL;
END $$;

ALTER TABLE project_rfis ADD COLUMN IF NOT EXISTS due_date          date;
ALTER TABLE project_rfis ADD COLUMN IF NOT EXISTS assigned_to       text;
ALTER TABLE project_rfis ADD COLUMN IF NOT EXISTS ball_in_court     text;
ALTER TABLE project_rfis ADD COLUMN IF NOT EXISTS cost_impact       numeric DEFAULT 0;
ALTER TABLE project_rfis ADD COLUMN IF NOT EXISTS schedule_impact   integer DEFAULT 0;
ALTER TABLE project_rfis ADD COLUMN IF NOT EXISTS priority          text DEFAULT 'Normal';
ALTER TABLE project_rfis ADD COLUMN IF NOT EXISTS distribution      jsonb DEFAULT '[]';
ALTER TABLE project_rfis ADD COLUMN IF NOT EXISTS updated_at        timestamptz DEFAULT now();
ALTER TABLE project_rfis ADD COLUMN IF NOT EXISTS closed_at         timestamptz;

-- ─── Enhance Submittals ────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE project_submittals ADD COLUMN IF NOT EXISTS submittal_number serial;
EXCEPTION WHEN others THEN NULL;
END $$;

ALTER TABLE project_submittals ADD COLUMN IF NOT EXISTS due_date                date;
ALTER TABLE project_submittals ADD COLUMN IF NOT EXISTS responsible_contractor  text;
ALTER TABLE project_submittals ADD COLUMN IF NOT EXISTS revision_number         integer DEFAULT 0;
ALTER TABLE project_submittals ADD COLUMN IF NOT EXISTS lead_time_days          integer;
ALTER TABLE project_submittals ADD COLUMN IF NOT EXISTS received_date           date;
ALTER TABLE project_submittals ADD COLUMN IF NOT EXISTS required_date           date;
ALTER TABLE project_submittals ADD COLUMN IF NOT EXISTS updated_at             timestamptz DEFAULT now();

-- ─── Enhance Tasks/Schedule ────────────────────────────────────────
ALTER TABLE project_tasks ADD COLUMN IF NOT EXISTS percent_complete  integer DEFAULT 0;
ALTER TABLE project_tasks ADD COLUMN IF NOT EXISTS assigned_to       text;
ALTER TABLE project_tasks ADD COLUMN IF NOT EXISTS priority          text DEFAULT 'Normal';
ALTER TABLE project_tasks ADD COLUMN IF NOT EXISTS notes             text;
ALTER TABLE project_tasks ADD COLUMN IF NOT EXISTS is_milestone      boolean DEFAULT false;
ALTER TABLE project_tasks ADD COLUMN IF NOT EXISTS updated_at        timestamptz DEFAULT now();

-- ─── Enhance Budgets ───────────────────────────────────────────────
ALTER TABLE project_budgets ADD COLUMN IF NOT EXISTS category              text;
ALTER TABLE project_budgets ADD COLUMN IF NOT EXISTS change_order_amount   numeric DEFAULT 0;
ALTER TABLE project_budgets ADD COLUMN IF NOT EXISTS forecast_amount       numeric DEFAULT 0;
ALTER TABLE project_budgets ADD COLUMN IF NOT EXISTS notes                 text;
ALTER TABLE project_budgets ADD COLUMN IF NOT EXISTS updated_at            timestamptz DEFAULT now();

-- ─── RLS Policies (mirrors existing pattern) ───────────────────────
ALTER TABLE project_punch_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_daily_logs  ENABLE ROW LEVEL SECURITY;

-- Allow service-role full access (app uses admin client)
CREATE POLICY "service_role_full_punch"  ON project_punch_items FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_full_logs"   ON project_daily_logs  FOR ALL TO service_role USING (true) WITH CHECK (true);
