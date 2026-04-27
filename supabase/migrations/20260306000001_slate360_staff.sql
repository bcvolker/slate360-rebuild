-- slate360_staff: Internal employee access grants managed from CEO Command Center.
-- Rows in this table get `hasInternalAccess = true` in resolveServerOrgContext(),
-- granting visibility of CEO Command Center, Market Robot, and Athlete360 tabs.

CREATE TABLE IF NOT EXISTS slate360_staff (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL UNIQUE,
  display_name text,
  granted_by text NOT NULL,          -- email of the CEO/admin who granted access
  granted_at timestamptz DEFAULT now() NOT NULL,
  revoked_at timestamptz,            -- soft-revoke: set this to revoke access
  access_scope text[] DEFAULT '{ceo,market,athlete360}', -- which internal tabs they can see
  notes text,                        -- optional admin notes
  CONSTRAINT email_lowercase CHECK (email = lower(email))
);

-- Index for the hot path: org-context lookup by email
CREATE INDEX IF NOT EXISTS idx_slate360_staff_email_active
  ON slate360_staff (email) WHERE revoked_at IS NULL;

-- RLS: Only service-role (admin client) should read/write this table.
ALTER TABLE slate360_staff ENABLE ROW LEVEL SECURITY;

-- No RLS policies for anon/authenticated — only admin client (service role) bypasses RLS.
-- This ensures no user can self-grant access.
