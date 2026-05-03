-- Slice 3: Field Project Model
-- Adds project_type to the projects table so Field Projects and full Projects
-- share a single table with a type discriminator column.

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS project_type TEXT NOT NULL DEFAULT 'field'
    CHECK (project_type IN ('field', 'full')),
  ADD COLUMN IF NOT EXISTS converted_from_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS converted_at TIMESTAMPTZ;

-- Back-fill: every existing project becomes a field project
UPDATE projects SET project_type = 'field' WHERE project_type IS NULL;

-- Indexes for fast type-filtered and org-type queries
CREATE INDEX IF NOT EXISTS idx_projects_project_type ON projects(project_type);
CREATE INDEX IF NOT EXISTS idx_projects_org_id_type ON projects(org_id, project_type);
