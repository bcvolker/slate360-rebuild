-- =====================================================================
-- SLATE360 TEST-DATA CLEANUP  (Brian / CEO)
-- Deletes accumulated test walks, scans, twins, projects + their SlateDrop
-- rows for YOUR organization only. Run in the Supabase SQL editor.
--
-- HOW TO USE (3 steps, in order):
--   STEP 1 — run the "FIND ORG" query, copy your org_id.
--   STEP 2 — run the PREVIEW with that org_id; confirm the counts + project
--            names are all test data (there is NO is_test flag — this removes
--            ALL of that org's walks/scans/projects).
--   STEP 3 — run the CLEANUP. It ends in ROLLBACK (changes nothing) so you can
--            read the row counts safely. When you're SURE, change the final
--            `ROLLBACK;` to `COMMIT;` and run once more to actually delete.
--
-- NOTE: this does NOT delete the R2/S3 file blobs (storage). DB rows go; the
--       underlying files are cleaned separately (see docs note at bottom).
-- =====================================================================


-- ── STEP 1 — FIND YOUR ORG ID ───────────────────────────────────────
SELECT o.id AS org_id, o.name, count(p.id) AS project_count
FROM public.organizations o
JOIN public.organization_members m ON m.org_id = o.id
JOIN auth.users u ON u.id = m.user_id
LEFT JOIN public.projects p ON p.org_id = o.id
WHERE u.email = 'slate360ceo@gmail.com'
GROUP BY o.id, o.name;
-- If the membership table name differs and this errors, instead run:
--   SELECT id, name, created_at FROM public.projects ORDER BY created_at;
-- and identify your org_id from a known test project.


-- ── STEP 2 — PREVIEW (read-only; paste your org_id in BOTH spots) ────
-- Replace 'YOUR_ORG_ID' below. Lists what WOULD be deleted.
WITH p AS (SELECT 'YOUR_ORG_ID'::uuid AS org_id)
SELECT 'projects' AS tbl, count(*) FROM public.projects WHERE org_id = (SELECT org_id FROM p)
UNION ALL SELECT 'site_walk_sessions', count(*) FROM public.site_walk_sessions WHERE org_id = (SELECT org_id FROM p)
UNION ALL SELECT 'site_walk_items', count(*) FROM public.site_walk_items WHERE org_id = (SELECT org_id FROM p)
UNION ALL SELECT 'digital_twin_spaces', count(*) FROM public.digital_twin_spaces WHERE org_id = (SELECT org_id FROM p)
UNION ALL SELECT 'digital_twin_captures', count(*) FROM public.digital_twin_captures WHERE org_id = (SELECT org_id FROM p)
UNION ALL SELECT 'digital_twin_models', count(*) FROM public.digital_twin_models WHERE org_id = (SELECT org_id FROM p)
UNION ALL SELECT 'digital_twin_processing_jobs', count(*) FROM public.digital_twin_processing_jobs WHERE org_id = (SELECT org_id FROM p)
UNION ALL SELECT 'unified_files', count(*) FROM public.unified_files WHERE org_id = (SELECT org_id FROM p)
UNION ALL SELECT 'slatedrop_uploads', count(*) FROM public.slatedrop_uploads WHERE org_id = (SELECT org_id FROM p)
ORDER BY tbl;
-- Also eyeball the names: SELECT id, name, status, created_at FROM public.projects WHERE org_id='YOUR_ORG_ID' ORDER BY created_at;


-- ── STEP 3 — CLEANUP (transaction; ROLLBACK by default) ─────────────
-- Replace 'YOUR_ORG_ID'. Children-first; projects cascade sweeps the rest.
BEGIN;

-- unified_files FIRST (no cascade → otherwise the projects delete FK-fails)
DELETE FROM public.unified_files WHERE org_id = 'YOUR_ORG_ID';

-- slatedrop_uploads (org FK is SET NULL → would orphan; delete explicitly)
DELETE FROM public.slatedrop_uploads WHERE org_id = 'YOUR_ORG_ID';

-- Twin + Site Walk children (cascade-covered, explicit for clarity/preview)
DELETE FROM public.digital_twin_processing_jobs WHERE org_id = 'YOUR_ORG_ID';
DELETE FROM public.digital_twin_models          WHERE org_id = 'YOUR_ORG_ID';
DELETE FROM public.digital_twin_capture_assets  WHERE org_id = 'YOUR_ORG_ID';
DELETE FROM public.digital_twin_captures        WHERE org_id = 'YOUR_ORG_ID';
DELETE FROM public.digital_twin_spaces          WHERE org_id = 'YOUR_ORG_ID';
DELETE FROM public.site_walk_items              WHERE org_id = 'YOUR_ORG_ID';
DELETE FROM public.site_walk_sessions           WHERE org_id = 'YOUR_ORG_ID';

-- Folders, then projects (cascade sweeps any remaining org-scoped children)
DELETE FROM public.project_folders WHERE org_id = 'YOUR_ORG_ID';
DELETE FROM public.projects        WHERE org_id = 'YOUR_ORG_ID';

-- Read the row counts above. When you are SURE, change ROLLBACK → COMMIT.
ROLLBACK;
-- COMMIT;
