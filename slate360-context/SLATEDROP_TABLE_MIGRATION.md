# SlateDrop Table Migration: file_folders → project_folders

**Date:** February 4, 2026  
**Status:** In Progress  
**Breaking Change:** No - backwards compatible

## Problem Statement

The codebase had two folder tables with divergent schemas and data:

| Table | Rows | Key Columns | Used By |
|-------|------|-------------|---------|
| `file_folders` | 157 | `path`, `is_system_folder` | Legacy routes |
| `project_folders` | 133 | `folder_path`, `is_system` | `listChildren.server.ts`, `explorer/list` |

This caused:
1. **400 Errors** when APIs queried non-existent columns
2. **Empty UI** because widgets queried wrong table
3. **Duplicate logic** maintaining two separate folder trees

## Decision: `project_folders` is Canonical

We chose `project_folders` as the canonical table because:
- It's already used by `listChildren.server.ts` (the authoritative listing logic)
- It has richer schema (`folder_type`, `is_public`, `allow_upload`, etc.)
- The `explorer/list` API already uses it

## Migration Approach

### Phase 1: API Route Updates (✅ Complete)

Updated the following routes to use `project_folders`:

| Route | Status |
|-------|--------|
| `/api/projects/[projectId]/folders` | ✅ Migrated |
| `/api/org/folders` | ✅ Migrated |
| `/api/slatedrop/upload-url` | ✅ Migrated |
| `/api/slatedrop/files/complete` | ✅ Migrated |
| `/api/slatedrop/create` | ✅ Migrated |
| `/api/slatedrop/v2/provision` | ✅ Migrated |
| `/api/slatedrop/list` | ✅ Migrated |

### Phase 2: Remaining Routes (Pending)

Routes that still reference `file_folders` (non-critical paths):

```
src/lib/audit/pdfSnapshots.ts
src/lib/services/cross-tab-file-service.ts
src/lib/slatedrop/systemFolders.ts
src/app/api/design-studio/projects/[projectId]/route.ts
src/app/api/design-studio/workspace/route.ts
src/app/api/projects/[projectId]/export-zip/route.ts
```

These are secondary features and will be migrated in a follow-up.

### Phase 3: Data Migration (Future)

Once all code routes use `project_folders`, we'll:
1. Run a data sync script to copy `file_folders` rows into `project_folders`
2. Keep `file_folders` as read-only archive for 30 days
3. Drop `file_folders` table after validation

## Schema Mapping

| `file_folders` | `project_folders` | Notes |
|----------------|-------------------|-------|
| `path` | `folder_path` | Both store canonical path |
| `is_system_folder` | `is_system` | Boolean flag |
| - | `folder_type` | New: enum for folder categories |
| - | `is_public` | New: visibility flag |
| - | `allow_upload` | New: permission flag |

## Verification

After changes, run:

```bash
# Check no file_folders queries in critical paths
grep -rn "from('file_folders')" src/app/api/projects src/app/api/org src/app/api/slatedrop

# Build verification
npm run build

# API Health check
curl http://localhost:3000/api/health
```

## Rollback

If issues arise:
1. Revert git commits affecting the routes above
2. The `file_folders` table remains untouched and fully functional

## Next Steps

1. Complete Phase 2 route migrations
2. Add database view `v_folders` that unions both tables (interim compatibility)
3. Create migration script to sync data
4. Update widget components to use consistent API responses
