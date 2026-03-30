-- Add role column to organization_members for RBAC
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'org_role') THEN
    CREATE TYPE org_role AS ENUM ('owner', 'admin', 'member', 'viewer');
  END IF;
END $$;

ALTER TABLE public.organization_members
  ADD COLUMN IF NOT EXISTS role org_role NOT NULL DEFAULT 'member';

COMMENT ON COLUMN public.organization_members.role IS 'Role of the user within the organization. Defines what they can manage (e.g., billing, members, or just view projects).';
