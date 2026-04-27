-- ============================================================
-- Migration: management file link fix (SlateDrop integration)
-- Date: 2026-02-27
-- ============================================================

alter table public.project_contracts
  add column if not exists file_upload_id uuid references public.slatedrop_uploads(id) on delete set null;

create index if not exists idx_project_contracts_file_upload_id
  on public.project_contracts(file_upload_id);
