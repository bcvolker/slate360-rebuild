-- ============================================================================
-- Client Workflow, Contacts Directory, Calendar Events
-- Migration: 20260206_client_workflow_contacts_calendar.sql
-- ============================================================================

-- ============================================================================
-- 1. DOCUMENT WORKFLOWS (ensure table + indexes exist)
-- ============================================================================

CREATE TABLE IF NOT EXISTS document_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  file_id UUID REFERENCES unified_files(id) ON DELETE SET NULL,
  document_type TEXT NOT NULL DEFAULT 'general',
  status TEXT NOT NULL DEFAULT 'draft',
  recipient_emails TEXT[] DEFAULT '{}',
  recipient_type TEXT DEFAULT 'client',
  message TEXT,
  due_date TIMESTAMPTZ,
  requires_signature BOOLEAN DEFAULT false,
  sent_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  revision_notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dw_project ON document_workflows(project_id);
CREATE INDEX IF NOT EXISTS idx_dw_status ON document_workflows(status);
CREATE INDEX IF NOT EXISTS idx_dw_file ON document_workflows(file_id);
CREATE INDEX IF NOT EXISTS idx_dw_created_by ON document_workflows(created_by);
CREATE INDEX IF NOT EXISTS idx_dw_created_at ON document_workflows(created_at DESC);
CREATE TABLE IF NOT EXISTS document_workflow_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES document_workflows(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  message TEXT,
  revision_notes TEXT,
  changed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dwh_workflow ON document_workflow_history(workflow_id);
-- ============================================================================
-- 2. CONTACTS DIRECTORY (org-wide with project grouping)
-- ============================================================================

CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  role TEXT DEFAULT 'other',
  title TEXT,
  avatar_url TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  notes TEXT,
  starred BOOLEAN DEFAULT false,
  tags TEXT[] DEFAULT '{}',
  last_contact TIMESTAMPTZ,
  is_enterprise_user BOOLEAN DEFAULT false,
  seat_assigned BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_contacts_org ON contacts(org_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_company ON contacts(company);
CREATE INDEX IF NOT EXISTS idx_contacts_starred ON contacts(org_id, starred) WHERE starred = true;
-- Link contacts to projects (many-to-many)
CREATE TABLE IF NOT EXISTS project_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'other',
  access_level TEXT DEFAULT 'viewer',
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  added_by UUID REFERENCES auth.users(id),
  UNIQUE(project_id, contact_id)
);
CREATE INDEX IF NOT EXISTS idx_pc_project ON project_contacts(project_id);
CREATE INDEX IF NOT EXISTS idx_pc_contact ON project_contacts(contact_id);
-- Contact groups (for filtering/organizing)
CREATE TABLE IF NOT EXISTS contact_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6366f1',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cg_org ON contact_groups(org_id);
-- Contact-to-group mapping
CREATE TABLE IF NOT EXISTS contact_group_members (
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES contact_groups(id) ON DELETE CASCADE,
  PRIMARY KEY (contact_id, group_id)
);
-- ============================================================================
-- 3. CALENDAR EVENTS + SYNC
-- ============================================================================

CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  all_day BOOLEAN DEFAULT false,
  recurrence_rule TEXT,  -- iCal RRULE format
  color TEXT DEFAULT '#6366f1',
  event_type TEXT DEFAULT 'general',  -- general, meeting, inspection, milestone, deadline, rfi_due, submittal_due
  status TEXT DEFAULT 'confirmed',    -- confirmed, tentative, cancelled
  created_by UUID REFERENCES auth.users(id),
  attendee_emails TEXT[] DEFAULT '{}',
  attendee_contact_ids UUID[] DEFAULT '{}',
  external_id TEXT,         -- Google/Outlook event ID for sync
  external_source TEXT,     -- 'google', 'outlook', 'ical'
  external_calendar_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ce_org ON calendar_events(org_id);
CREATE INDEX IF NOT EXISTS idx_ce_project ON calendar_events(project_id);
CREATE INDEX IF NOT EXISTS idx_ce_time ON calendar_events(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_ce_external ON calendar_events(external_id, external_source);
CREATE INDEX IF NOT EXISTS idx_ce_created_by ON calendar_events(created_by);
-- Calendar sync connections (per-user)
CREATE TABLE IF NOT EXISTS calendar_sync (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL,
  provider TEXT NOT NULL,            -- 'google', 'outlook', 'apple'
  calendar_id TEXT NOT NULL,         -- External calendar ID
  calendar_name TEXT,
  access_token TEXT,                 -- Encrypted OAuth token
  refresh_token TEXT,                -- Encrypted refresh token
  token_expires_at TIMESTAMPTZ,
  sync_direction TEXT DEFAULT 'both', -- 'push', 'pull', 'both'
  last_sync_at TIMESTAMPTZ,
  sync_status TEXT DEFAULT 'active',  -- 'active', 'paused', 'error'
  sync_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, provider, calendar_id)
);
CREATE INDEX IF NOT EXISTS idx_cs_user ON calendar_sync(user_id);
CREATE INDEX IF NOT EXISTS idx_cs_provider ON calendar_sync(provider);
-- ============================================================================
-- 4. RLS Policies
-- ============================================================================

ALTER TABLE document_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_workflow_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_sync ENABLE ROW LEVEL SECURITY;
-- Document workflows: org members can read/write
DO $$ BEGIN
CREATE POLICY dw_org_access ON document_workflows
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN organization_members om ON om.org_id = p.org_id
      WHERE p.id = document_workflows.project_id
        AND om.user_id = auth.uid()
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
-- Contacts: org members can CRUD
DO $$ BEGIN
CREATE POLICY contacts_org_access ON contacts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.org_id = contacts.org_id
        AND om.user_id = auth.uid()
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
-- Calendar events: org members can CRUD
DO $$ BEGIN
CREATE POLICY ce_org_access ON calendar_events
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.org_id = calendar_events.org_id
        AND om.user_id = auth.uid()
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
-- Calendar sync: user owns their own sync records
DO $$ BEGIN
CREATE POLICY cs_user_access ON calendar_sync
  FOR ALL USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
-- Project contacts: org members with project access
DO $$ BEGIN
CREATE POLICY pc_org_access ON project_contacts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN organization_members om ON om.org_id = p.org_id
      WHERE p.id = project_contacts.project_id
        AND om.user_id = auth.uid()
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
-- Contact groups: org members can CRUD
DO $$ BEGIN
CREATE POLICY cg_org_access ON contact_groups
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.org_id = contact_groups.org_id
        AND om.user_id = auth.uid()
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
-- Contact group members: access via group's org
DO $$ BEGIN
CREATE POLICY cgm_org_access ON contact_group_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM contact_groups cg
      JOIN organization_members om ON om.org_id = cg.org_id
      WHERE cg.id = contact_group_members.group_id
        AND om.user_id = auth.uid()
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
-- Document workflow history: through parent workflow
DO $$ BEGIN
CREATE POLICY dwh_org_access ON document_workflow_history
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM document_workflows dw
      JOIN projects p ON p.id = dw.project_id
      JOIN organization_members om ON om.org_id = p.org_id
      WHERE dw.id = document_workflow_history.workflow_id
        AND om.user_id = auth.uid()
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
