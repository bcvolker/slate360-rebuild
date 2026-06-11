-- ==============================================
-- Add missing indexes on foreign keys for performance
-- These are the most critical ones based on expected query patterns
-- ==============================================

-- Core relationship indexes
CREATE INDEX IF NOT EXISTS idx_projects_org_id ON public.projects(org_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON public.projects(created_by);
CREATE INDEX IF NOT EXISTS idx_organization_members_org_role_id ON public.organization_members(org_role_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_deactivated_by ON public.organization_members(deactivated_by);

-- Project files and folders
CREATE INDEX IF NOT EXISTS idx_project_files_created_by ON public.project_files(created_by);
CREATE INDEX IF NOT EXISTS idx_project_files_deleted_by ON public.project_files(deleted_by);
CREATE INDEX IF NOT EXISTS idx_project_folders_created_by ON public.project_folders(created_by);

-- Construction management indexes
CREATE INDEX IF NOT EXISTS idx_rfis_response_by ON public.rfis(response_by);
CREATE INDEX IF NOT EXISTS idx_daily_reports_org_id ON public.daily_reports(org_id);
CREATE INDEX IF NOT EXISTS idx_daily_reports_created_by ON public.daily_reports(created_by);
CREATE INDEX IF NOT EXISTS idx_daily_reports_approved_by ON public.daily_reports(approved_by);
CREATE INDEX IF NOT EXISTS idx_inspections_org_id ON public.inspections(org_id);
CREATE INDEX IF NOT EXISTS idx_inspections_inspector_id ON public.inspections(inspector_id);
CREATE INDEX IF NOT EXISTS idx_punch_items_org_id ON public.punch_items(org_id);
CREATE INDEX IF NOT EXISTS idx_punch_items_assigned_to ON public.punch_items(assigned_to);
CREATE INDEX IF NOT EXISTS idx_punch_items_created_by ON public.punch_items(created_by);
CREATE INDEX IF NOT EXISTS idx_punch_items_verified_by ON public.punch_items(verified_by);
CREATE INDEX IF NOT EXISTS idx_punch_lists_org_id ON public.punch_lists(org_id);
CREATE INDEX IF NOT EXISTS idx_punch_lists_created_by ON public.punch_lists(created_by);
CREATE INDEX IF NOT EXISTS idx_punch_lists_verified_by ON public.punch_lists(verified_by);

-- Financial indexes
CREATE INDEX IF NOT EXISTS idx_budget_line_items_org_id ON public.budget_line_items(org_id);
CREATE INDEX IF NOT EXISTS idx_budget_line_items_created_by ON public.budget_line_items(created_by);
CREATE INDEX IF NOT EXISTS idx_change_orders_org_id ON public.change_orders(org_id);
CREATE INDEX IF NOT EXISTS idx_change_orders_created_by ON public.change_orders(created_by);
CREATE INDEX IF NOT EXISTS idx_change_orders_approved_by ON public.change_orders(approved_by);
CREATE INDEX IF NOT EXISTS idx_pay_applications_org_id ON public.pay_applications(org_id);
CREATE INDEX IF NOT EXISTS idx_pay_applications_created_by ON public.pay_applications(created_by);
CREATE INDEX IF NOT EXISTS idx_schedule_of_values_org_id ON public.schedule_of_values(org_id);
CREATE INDEX IF NOT EXISTS idx_schedule_of_values_created_by ON public.schedule_of_values(created_by);

-- Schedule indexes
CREATE INDEX IF NOT EXISTS idx_schedule_tasks_org_id ON public.schedule_tasks(org_id);
CREATE INDEX IF NOT EXISTS idx_schedule_tasks_created_by ON public.schedule_tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_schedule_tasks_parent_id ON public.schedule_tasks(parent_id);
CREATE INDEX IF NOT EXISTS idx_schedule_versions_org_id ON public.schedule_versions(org_id);
CREATE INDEX IF NOT EXISTS idx_schedule_versions_project_id ON public.schedule_versions(project_id);
CREATE INDEX IF NOT EXISTS idx_schedule_versions_created_by ON public.schedule_versions(created_by);

-- Integration indexes  
CREATE INDEX IF NOT EXISTS idx_autodesk_sync_queue_org_id ON public.autodesk_sync_queue(org_id);
CREATE INDEX IF NOT EXISTS idx_autodesk_sync_queue_integration_id ON public.autodesk_sync_queue(integration_id);
CREATE INDEX IF NOT EXISTS idx_integration_oauth_states_org_id ON public.integration_oauth_states(org_id);
CREATE INDEX IF NOT EXISTS idx_integration_oauth_states_user_id ON public.integration_oauth_states(user_id);
CREATE INDEX IF NOT EXISTS idx_integration_webhooks_org_id ON public.integration_webhooks(org_id);
CREATE INDEX IF NOT EXISTS idx_integration_webhooks_integration_id ON public.integration_webhooks(integration_id);

-- Document and workflow indexes
CREATE INDEX IF NOT EXISTS idx_documents_org_id ON public.documents(org_id);
CREATE INDEX IF NOT EXISTS idx_documents_created_by ON public.documents(created_by);
CREATE INDEX IF NOT EXISTS idx_document_signatures_signed_by ON public.document_signatures(signed_by);
CREATE INDEX IF NOT EXISTS idx_document_workflows_document_id ON public.document_workflows(document_id);
CREATE INDEX IF NOT EXISTS idx_document_workflows_org_id ON public.document_workflows(org_id);
CREATE INDEX IF NOT EXISTS idx_document_workflows_created_by ON public.document_workflows(created_by);
CREATE INDEX IF NOT EXISTS idx_file_versions_uploaded_by ON public.file_versions(uploaded_by);

-- Credit and usage indexes
CREATE INDEX IF NOT EXISTS idx_credit_ledger_created_by ON public.credit_ledger(created_by);
CREATE INDEX IF NOT EXISTS idx_credit_purchases_user_id ON public.credit_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_purchases_credit_pack_id ON public.credit_purchases(credit_pack_id);
CREATE INDEX IF NOT EXISTS idx_org_usage_events_user_id ON public.org_usage_events(user_id);

-- Notification and activity indexes
CREATE INDEX IF NOT EXISTS idx_email_notifications_org_id ON public.email_notifications(org_id);
CREATE INDEX IF NOT EXISTS idx_project_activity_user_id ON public.project_activity(user_id);

-- Other useful indexes
CREATE INDEX IF NOT EXISTS idx_assets_parent_asset_id ON public.assets(parent_asset_id);
CREATE INDEX IF NOT EXISTS idx_backup_history_initiated_by ON public.backup_history(initiated_by);
CREATE INDEX IF NOT EXISTS idx_daily_logs_org_id ON public.daily_logs(org_id);
CREATE INDEX IF NOT EXISTS idx_daily_logs_created_by ON public.daily_logs(created_by);
CREATE INDEX IF NOT EXISTS idx_daily_logs_approved_by ON public.daily_logs(approved_by);
CREATE INDEX IF NOT EXISTS idx_data_exports_org_id ON public.data_exports(org_id);
CREATE INDEX IF NOT EXISTS idx_digital_twin_versions_created_by ON public.digital_twin_versions(created_by);
CREATE INDEX IF NOT EXISTS idx_expenses_created_by ON public.expenses(created_by);
CREATE INDEX IF NOT EXISTS idx_feature_flags_created_by ON public.feature_flags(created_by);
CREATE INDEX IF NOT EXISTS idx_feature_requests_user_id ON public.feature_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_created_by ON public.invoices(created_by);
CREATE INDEX IF NOT EXISTS idx_meetings_org_id ON public.meetings(org_id);
CREATE INDEX IF NOT EXISTS idx_meetings_organizer_id ON public.meetings(organizer_id);
CREATE INDEX IF NOT EXISTS idx_model_processing_jobs_org_id ON public.model_processing_jobs(org_id);
CREATE INDEX IF NOT EXISTS idx_org_invites_invited_by ON public.org_invites(invited_by);
CREATE INDEX IF NOT EXISTS idx_org_invites_role_id ON public.org_invites(role_id);
CREATE INDEX IF NOT EXISTS idx_print_jobs_org_id ON public.print_jobs(org_id);
CREATE INDEX IF NOT EXISTS idx_print_jobs_created_by ON public.print_jobs(created_by);
CREATE INDEX IF NOT EXISTS idx_print_jobs_file_id ON public.print_jobs(file_id);
CREATE INDEX IF NOT EXISTS idx_project_members_invited_by ON public.project_members(invited_by);
CREATE INDEX IF NOT EXISTS idx_project_stakeholders_org_id ON public.project_stakeholders(org_id);
CREATE INDEX IF NOT EXISTS idx_project_stakeholders_invited_by ON public.project_stakeholders(invited_by);
CREATE INDEX IF NOT EXISTS idx_project_tasks_project_id ON public.project_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_project_tasks_assigned_to ON public.project_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_project_tasks_created_by ON public.project_tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_shared_links_org_id ON public.shared_links(org_id);
CREATE INDEX IF NOT EXISTS idx_shared_links_created_by ON public.shared_links(created_by);
CREATE INDEX IF NOT EXISTS idx_slate_drop_links_project_id ON public.slate_drop_links(project_id);
CREATE INDEX IF NOT EXISTS idx_slate_drop_links_folder_id ON public.slate_drop_links(folder_id);
CREATE INDEX IF NOT EXISTS idx_slate_drop_links_created_by ON public.slate_drop_links(created_by);
CREATE INDEX IF NOT EXISTS idx_stakeholder_invitations_org_id ON public.stakeholder_invitations(org_id);
CREATE INDEX IF NOT EXISTS idx_stakeholder_invitations_invited_by ON public.stakeholder_invitations(invited_by);;
