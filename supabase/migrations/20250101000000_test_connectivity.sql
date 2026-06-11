-- =====================================================
-- TEST CONNECTIVITY MIGRATION
-- =====================================================
-- This file is created to verify that the AI agent can create SQL files.
-- It creates a simple test table.

CREATE TABLE IF NOT EXISTS public.connectivity_test (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  test_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Insert a test record
INSERT INTO public.connectivity_test (test_name) VALUES ('AI Agent Connectivity Check');
