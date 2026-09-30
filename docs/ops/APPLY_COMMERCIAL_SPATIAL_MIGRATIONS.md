# Apply commercial spatial migrations

Paste or run `docs/ops/APPLY_COMMERCIAL_SPATIAL_MIGRATIONS.sql` once in the
Supabase SQL Editor for project `hadnfcenpcfaeclczsmm`.

Rules:

- Additive only. No DROP of existing constraints.
- Safe to re-run (`IF NOT EXISTS` / exception guards).
- Does not change entitlements, billing, or middleware.
- Service-role REST already works for row access after tables exist.

Order inside the file:

1. `spatial_audio_assets` (needed before item comment FK)
2. Project items, locators, documents, comments, activity, files
3. Locator kinds + optional project-frame column on twin models
4. Project shares + brand snapshot
5. Notification events (persist only; email send is later)

This laptop does not reconstruct or launch GPU jobs.
