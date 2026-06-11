-- Beta Testers Table
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.beta_testers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  company TEXT,
  industry TEXT DEFAULT 'other',
  status TEXT DEFAULT 'invited', -- 'invited', 'active', 'expired', 'suspended'
  notes TEXT,
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  activated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_beta_testers_email ON public.beta_testers(email);
CREATE INDEX IF NOT EXISTS idx_beta_testers_status ON public.beta_testers(status);
-- RLS Policies
ALTER TABLE public.beta_testers ENABLE ROW LEVEL SECURITY;
-- Allow authenticated users with CEO email to manage beta testers
DROP POLICY IF EXISTS "CEO full access" ON public.beta_testers;
CREATE POLICY "CEO full access" ON public.beta_testers
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email IN ('slate360ceo@gmail.com', 'ceo@slate360.com')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email IN ('slate360ceo@gmail.com', 'ceo@slate360.com')
    )
  );
-- Allow service role full access
DROP POLICY IF EXISTS "Service role access" ON public.beta_testers;
CREATE POLICY "Service role access" ON public.beta_testers
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
-- Grant permissions
GRANT ALL ON public.beta_testers TO authenticated;
GRANT ALL ON public.beta_testers TO service_role;
