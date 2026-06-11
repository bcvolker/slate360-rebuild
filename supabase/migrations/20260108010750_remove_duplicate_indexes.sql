-- ==============================================
-- Remove duplicate indexes (keeping one of each pair)
-- ==============================================

-- file_folders: idx_file_folders_project and idx_file_folders_project_id are duplicates
DROP INDEX IF EXISTS public.idx_file_folders_project;

-- rfis: idx_rfis_project and idx_rfis_project_id are duplicates
DROP INDEX IF EXISTS public.idx_rfis_project;

-- schedule_tasks: idx_schedule_tasks_project and idx_schedule_tasks_project_id are duplicates
DROP INDEX IF EXISTS public.idx_schedule_tasks_project;

-- submittals: idx_submittals_project and idx_submittals_project_id are duplicates
DROP INDEX IF EXISTS public.idx_submittals_project;

-- tasks: idx_tasks_assigned and idx_tasks_assigned_to are duplicates
DROP INDEX IF EXISTS public.idx_tasks_assigned;

-- tasks: idx_tasks_project and idx_tasks_project_id are duplicates
DROP INDEX IF EXISTS public.idx_tasks_project;

-- tours: idx_tours_project and idx_tours_project_id are duplicates
DROP INDEX IF EXISTS public.idx_tours_project;;
