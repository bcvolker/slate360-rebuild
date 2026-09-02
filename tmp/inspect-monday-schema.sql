SELECT current_database() AS db;

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'spatial_project_items',
    'spatial_project_item_comments',
    'spatial_project_item_activity',
    'spatial_project_item_locators',
    'spatial_project_item_files',
    'spatial_project_documents',
    'spatial_compare_anchors',
    'spatial_compare_issue_refs',
    'spatial_project_shares',
    'spatial_project_share_grants',
    'spatial_share_tokens',
    'spatial_walkthroughs',
    'spatial_clips',
    'spatial_redactions'
  )
ORDER BY table_name;

SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'spatial_clips'
  AND column_name IN ('operator_patch', 'orientation', 'public_proxy_key')
ORDER BY column_name;

SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'spatial_redactions'
  AND column_name IN ('keyframes', 'feather', 'style')
ORDER BY column_name;

SELECT id, title, building
FROM spatial_walkthroughs
WHERE id = '7e0575a3-5d55-45d8-807f-9fb959ce2c21';
