-- AIA Document Workflow System Database Schema

-- Document workflows table
CREATE TABLE IF NOT EXISTS document_workflows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_type TEXT NOT NULL CHECK (document_type IN ('g702', 'g703', 'g704', 'g706', 'sov', 'po', 'invoice', 'rfi', 'submittal', 'change_order')),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('draft', 'sent', 'received', 'approved', 'rejected', 'revised')) DEFAULT 'draft',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  sent_to TEXT[],
  sent_at TIMESTAMP,
  received_at TIMESTAMP,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP,
  file_id UUID REFERENCES unified_files(id),
  metadata JSONB DEFAULT '{}',
  history JSONB[] DEFAULT ARRAY[]::JSONB[],
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_document_workflows_project ON document_workflows(project_id, created_at DESC);
CREATE INDEX idx_document_workflows_org ON document_workflows(org_id, status);
CREATE INDEX idx_document_workflows_status ON document_workflows(status, created_at DESC);
CREATE INDEX idx_document_workflows_type ON document_workflows(document_type, project_id);
-- Cyclical/recurring document schedules
CREATE TABLE IF NOT EXISTS document_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  document_type TEXT NOT NULL,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'annual')),
  next_due_date DATE NOT NULL,
  template_data JSONB DEFAULT '{}',
  auto_create BOOLEAN NOT NULL DEFAULT false,
  recipients TEXT[],
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_generated_at TIMESTAMP,
  enabled BOOLEAN NOT NULL DEFAULT true
);
CREATE INDEX idx_document_schedules_project ON document_schedules(project_id);
CREATE INDEX idx_document_schedules_due ON document_schedules(next_due_date) WHERE enabled = true;
-- Document templates for reusability
CREATE TABLE IF NOT EXISTS document_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  document_type TEXT NOT NULL,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  template_data JSONB NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_document_templates_org_type ON document_templates(org_id, document_type);
-- Add workflow reference to unified_files
ALTER TABLE unified_files
ADD COLUMN IF NOT EXISTS workflow_id UUID REFERENCES document_workflows(id);
CREATE INDEX IF NOT EXISTS idx_unified_files_workflow ON unified_files(workflow_id);
-- RLS Policies
ALTER TABLE document_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view workflows in their org"
  ON document_workflows FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM organization_members WHERE user_id = auth.uid()
    )
  );
CREATE POLICY "Users can create workflows in their org"
  ON document_workflows FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM organization_members WHERE user_id = auth.uid()
    )
  );
CREATE POLICY "Users can update workflows in their org"
  ON document_workflows FOR UPDATE
  USING (
    org_id IN (
      SELECT org_id FROM organization_members WHERE user_id = auth.uid()
    )
  );
CREATE POLICY "Users can view schedules in their org"
  ON document_schedules FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM organization_members WHERE user_id = auth.uid()
    )
  );
CREATE POLICY "Users can manage schedules in their org"
  ON document_schedules FOR ALL
  USING (
    org_id IN (
      SELECT org_id FROM organization_members WHERE user_id = auth.uid()
    )
  );
CREATE POLICY "Users can view templates in their org"
  ON document_templates FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM organization_members WHERE user_id = auth.uid()
    )
  );
CREATE POLICY "Users can manage templates in their org"
  ON document_templates FOR ALL
  USING (
    org_id IN (
      SELECT org_id FROM organization_members WHERE user_id = auth.uid()
    )
  );
-- Function to auto-generate scheduled documents
CREATE OR REPLACE FUNCTION generate_scheduled_documents()
RETURNS VOID AS $$
DECLARE
  schedule_record RECORD;
BEGIN
  FOR schedule_record IN 
    SELECT * FROM document_schedules 
    WHERE enabled = true 
    AND auto_create = true 
    AND next_due_date <= CURRENT_DATE
  LOOP
    -- Create new workflow from schedule
    INSERT INTO document_workflows (
      document_type,
      project_id,
      org_id,
      status,
      created_by,
      metadata
    ) VALUES (
      schedule_record.document_type,
      schedule_record.project_id,
      schedule_record.org_id,
      'draft',
      schedule_record.created_by,
      schedule_record.template_data
    );

    -- Update schedule for next occurrence
    UPDATE document_schedules
    SET 
      last_generated_at = NOW(),
      next_due_date = CASE 
        WHEN frequency = 'daily' THEN next_due_date + INTERVAL '1 day'
        WHEN frequency = 'weekly' THEN next_due_date + INTERVAL '1 week'
        WHEN frequency = 'biweekly' THEN next_due_date + INTERVAL '2 weeks'
        WHEN frequency = 'monthly' THEN next_due_date + INTERVAL '1 month'
        WHEN frequency = 'quarterly' THEN next_due_date + INTERVAL '3 months'
        WHEN frequency = 'annual' THEN next_due_date + INTERVAL '1 year'
      END
    WHERE id = schedule_record.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER update_document_workflows_updated_at
  BEFORE UPDATE ON document_workflows
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_document_templates_updated_at
  BEFORE UPDATE ON document_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
-- Create default AIA templates
INSERT INTO document_templates (name, document_type, org_id, template_data, is_default, created_by) 
SELECT 
  'AIA G702 - Application for Payment',
  'g702',
  id,
  '{
    "retainage": 10,
    "contractFor": "Construction Services"
  }'::jsonb,
  true,
  (SELECT id FROM auth.users LIMIT 1)
FROM organizations
ON CONFLICT DO NOTHING;
