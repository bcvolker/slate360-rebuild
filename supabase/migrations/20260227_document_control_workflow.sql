-- Document control enhancements for Project Hub

-- Allow document workflows through external links
alter table public.project_external_links
  drop constraint if exists project_external_links_target_type_check;

alter table public.project_external_links
  add constraint project_external_links_target_type_check
  check (target_type in ('RFI', 'Submittal', 'Document'));

-- Enrich submittals as document-control records (AIA/SOV/Invoice/Pay Apps)
alter table public.project_submittals add column if not exists document_type text;
alter table public.project_submittals add column if not exists document_code text;
alter table public.project_submittals add column if not exists stakeholder_email text;
alter table public.project_submittals add column if not exists amount numeric default 0;
alter table public.project_submittals add column if not exists version_number integer default 1;
alter table public.project_submittals add column if not exists sent_at timestamptz;
alter table public.project_submittals add column if not exists last_response_at timestamptz;
alter table public.project_submittals add column if not exists response_decision text;

create index if not exists idx_project_submittals_doc_type on public.project_submittals(project_id, document_type);

-- Notification deep-links so users can open exact item from inbox
alter table public.project_notifications add column if not exists link_path text;
