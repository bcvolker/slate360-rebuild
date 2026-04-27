-- Repairs legacy project_folders rows that were created with parent_id=project.id
-- and backfills canonical system folders for projects missing folder structures.

with repaired as (
  update public.project_folders pf
  set
    project_id = pf.parent_id,
    parent_id = null
  where pf.project_id is null
    and pf.parent_id is not null
    and exists (
      select 1
      from public.projects p
      where p.id = pf.parent_id
    )
  returning pf.id
),
inserted as (
  insert into public.project_folders (
    project_id,
    org_id,
    name,
    folder_path,
    is_system,
    folder_type,
    scope,
    is_public,
    allow_upload,
    allow_download,
    created_by,
    sort_order
  )
  select
    p.id,
    p.org_id,
    folder.name,
    'Project Sandbox/' || p.name || '/' || folder.name,
    true,
    lower(replace(folder.name, ' ', '_')),
    'project',
    false,
    true,
    true,
    p.created_by,
    folder.ord - 1
  from public.projects p
  cross join unnest(array[
    'Documents',
    'Drawings',
    'Photos',
    '3D Models',
    '360 Tours',
    'RFIs',
    'Submittals',
    'Schedule',
    'Budget',
    'Reports',
    'Safety',
    'Correspondence',
    'Closeout',
    'Daily Logs',
    'Misc'
  ]) with ordinality as folder(name, ord)
  where not exists (
    select 1
    from public.project_folders existing
    where existing.project_id = p.id
  )
  on conflict (project_id, folder_path) do nothing
  returning id
)
select
  (select count(*)::int from repaired) as repaired_legacy_rows,
  (select count(*)::int from inserted) as inserted_folder_rows;
