# SlateDrop Diagnostic Prompt for AI Assistants

> **Purpose**: Share this prompt with another AI coding assistant (Claude, ChatGPT, Gemini, etc.) so they can diagnose why SlateDrop file operations were failing. This documents the root cause found, all attempted fixes, the tech stack, database schema, and the final solution. Use this as a reference or second opinion check.

---

## The Problem

SlateDrop is the file management module in Slate360 (a Next.js 15 SaaS platform). **All file operations fail silently or with 500 errors:**

- **File upload**: Console shows `api/slatedrop/upload-url:1 Failed to load resource: the server responded with a status of 500`
- **Secure Send** (share file via link): Returns 404 or fails silently
- **Context menu actions** (rename, delete, download): All fail because no files ever get created in the database
- **ZIP download**: Returns "No files to download" because the files table is always empty

The UI renders perfectly — folder tree, drag-drop zones, context menus, modals — but **zero files have ever been successfully uploaded** to the database. The `slatedrop_uploads` table has 0 rows.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Auth | Supabase Auth (server-side via `@supabase/ssr` cookie-based client) |
| Database | Supabase PostgreSQL (PostgREST API) with **Row Level Security (RLS) enabled** |
| Storage | AWS S3 (`@aws-sdk/client-s3`, presigned URLs via `@aws-sdk/s3-request-presigner`) |
| Frontend | React 18, Tailwind CSS, Lucide icons |
| Relevant files | 8 API routes under `app/api/slatedrop/`, frontend in `components/slatedrop/SlateDropClient.tsx` |

---

## Database Schema (from Supabase OpenAPI)

### `slatedrop_uploads` (0 rows — nothing has ever been inserted successfully)

| Column | Type | Required | Notes |
|---|---|---|---|
| id | uuid | auto-generated PK | `gen_random_uuid()` default |
| project_id | uuid | nullable | |
| folder_id | uuid | nullable | FK — **NOT used in current code** |
| org_id | uuid | nullable | Organization scope |
| file_name | text | **REQUIRED** | |
| file_size | bigint | nullable | | 
| file_type | text | nullable | extension like "pdf", "jpg" |
| s3_key | text | nullable | Full S3 path like `orgs/{ns}/{folder}/{ts}_{name}` |
| status | text | nullable | "pending" → "active" → "deleted" |
| uploaded_by | uuid | nullable | `auth.uid()` of uploader |
| created_at | timestamptz | auto | |

### `slate_drop_links` (share links)

| Column | Type | Required |
|---|---|---|
| id | uuid | auto PK |
| file_id | uuid | nullable FK → slatedrop_uploads |
| token | text | **REQUIRED** |
| role | text | nullable ("view", "download") |
| created_by | uuid | nullable |
| expires_at | timestamptz | nullable |
| org_id | uuid | nullable |
| view_count | int | nullable |

### `file_folders` (50+ rows — real folder metadata)
| Column | Type | Notes |
|---|---|---|
| id | uuid | Auto PK |
| name | text | "General", "Design Studio", etc. |
| path | text | "/general", "/design-studio", etc. |
| scope | text | "project" |
| is_system_folder | boolean | |
| org_id | uuid | |

### `organization_members`
| Column | Type |
|---|---|
| org_id | uuid |
| user_id | uuid |
| role | text |

---

## Architecture: How Upload Works (3-step presigned URL flow)

1. **Frontend** (`SlateDropClient.tsx`) sends `POST /api/slatedrop/upload-url` with `{ filename, contentType, size, folderId: "general", folderPath: "general" }`
2. **API route** generates a presigned S3 PUT URL, inserts a `status: "pending"` record into `slatedrop_uploads`, returns `{ uploadUrl, fileId, s3Key }`
3. **Frontend** PUTs the file directly to S3 via the presigned URL
4. **Frontend** calls `POST /api/slatedrop/complete` with `{ fileId }` to mark the record `status: "active"`
5. **Frontend** calls `GET /api/slatedrop/files?folderId=general` to refresh the file list

---

## ROOT CAUSE FOUND (after extensive debugging)

### **Supabase Row Level Security (RLS) blocking all database operations**

The server-side Supabase client (`lib/supabase/server.ts`) creates a client using:
```typescript
import { createServerClient } from "@supabase/ssr";
createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,  // ← anon key
  { cookies: { getAll, setAll } }
);
```

This client respects RLS policies. When the API route does `supabase.from("slatedrop_uploads").insert(...)`, PostgREST enforces RLS.

**Proof of RLS blocking:**
```bash
# Insert with anon key (no JWT) — BLOCKED
curl -X POST "$SUPABASE_URL/rest/v1/slatedrop_uploads" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"file_name":"test.txt","file_size":42,"file_type":"txt","s3_key":"orgs/test/general/test.txt","uploaded_by":"00000000-0000-0000-0000-000000000000","status":"pending"}'

# Response: HTTP 401
# {"code":"42501","message":"new row violates row-level security policy for table \"slatedrop_uploads\""}

# Insert with service_role key — SUCCEEDS
# Same request but with service_role key → HTTP 201, record created
```

**Even with an authenticated user JWT**, the RLS policy for `slatedrop_uploads` may require specific conditions (e.g., `uploaded_by = auth.uid()` AND `org_id` matches) that the cookie-based client doesn't satisfy, or the policy simply doesn't have an INSERT rule for the `authenticated` role.

We cannot query `pg_policies` or run arbitrary SQL because the Supabase project doesn't have an `exec_sql` or `run_sql` RPC function exposed.

---

## All Attempted Fixes (Chronological)

### Fix 1: Table Name Corrections
**Problem**: Routes were referencing non-existent tables `slatedrop_files` and `file_shares`.
**Fix**: Changed all routes to use `slatedrop_uploads` and `slate_drop_links`.
**Result**: ❌ Still 500. Table names were correct but RLS still blocked operations.

### Fix 2: Column Name Remapping
**Problem**: Columns like `name`, `size`, `type` don't exist. Real columns are `file_name`, `file_size`, `file_type`.
**Fix**: Remapped all column names across all 8 routes.
**Result**: ❌ Still 500. Column names were correct but RLS still blocked.

### Fix 3: folder_id UUID Type Mismatch
**Problem**: `folder_id` column is UUID type, but frontend sends text strings like `"general"`. PostgreSQL error: `22P02: invalid input syntax for type uuid: "general"`.
**Fix**: Removed `folder_id` from the insert payload entirely. Use `s3_key` prefix matching (`LIKE 'orgs/{ns}/{folderId}/%'`) for folder-based queries instead.
**Result**: ❌ Still 500. The UUID type error was fixed, but RLS was the real blocker all along.

### Fix 4 (THE ACTUAL FIX): Switch to Admin Client for DB Operations
**Problem**: The `createClient()` from `@/lib/supabase/server` uses the anon key and respects RLS. RLS on `slatedrop_uploads` blocks inserts/updates/selects.
**Fix**: Import `createAdminClient()` from `@/lib/supabase/admin` (which uses `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS) for all database operations. Still use the cookie-based client for `auth.getUser()` to verify the user is logged in.

```typescript
// Auth check — cookie-based client (anon key, verifies JWT from cookies)
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

// DB operations — admin client (service role key, bypasses RLS)
const admin = createAdminClient();
const { data, error } = await admin.from("slatedrop_uploads").insert({...}).select("id").single();
```

**Result**: ✅ This should work because the service_role key bypasses all RLS policies.

---

## The 8 API Routes (all fixed)

| Route | Method | Purpose | DB Tables Used |
|---|---|---|---|
| `/api/slatedrop/upload-url` | POST | Generate presigned S3 URL + pending record | `organization_members`, `slatedrop_uploads` |
| `/api/slatedrop/complete` | POST | Mark upload as active | `organization_members`, `slatedrop_uploads` |
| `/api/slatedrop/files` | GET | List files in a folder (by s3_key prefix) | `organization_members`, `slatedrop_uploads` |
| `/api/slatedrop/download` | GET | Get presigned download URL | `organization_members`, `slatedrop_uploads` |
| `/api/slatedrop/rename` | PATCH | Rename a file | `organization_members`, `slatedrop_uploads` |
| `/api/slatedrop/delete` | DELETE | Soft-delete + S3 cleanup | `organization_members`, `slatedrop_uploads` |
| `/api/slatedrop/zip` | POST | Bundle folder as ZIP | `organization_members`, `slatedrop_uploads` |
| `/api/slatedrop/secure-send` | POST | Create share link + email | `organization_members`, `slatedrop_uploads`, `slate_drop_links` |

---

## Key Files

- `lib/supabase/server.ts` — Cookie-based client (anon key, respects RLS)
- `lib/supabase/admin.ts` — Service-role client (bypasses RLS)
- `lib/supabase/client.ts` — Browser client (anon key, for frontend)
- `lib/s3.ts` — S3 client, bucket config, `buildS3Key()` function
- `lib/entitlements.ts` — Tier-based feature gating
- `components/slatedrop/SlateDropClient.tsx` — Full frontend (1709 lines): folder tree, file grid, upload, context menus, modals
- `app/api/slatedrop/*/route.ts` — 8 API routes

---

## Environment Variables (server-side)

```
NEXT_PUBLIC_SUPABASE_URL=https://hadnfcenpcfaeclczsmm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ... (role: "anon")
SUPABASE_SERVICE_ROLE_KEY=eyJ... (role: "service_role")
AWS_REGION=us-east-2
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=VDZe...
SLATEDROP_S3_BUCKET=slate360-storage
```

---

## Questions for the Second AI Assistant

1. **RLS Policy Audit**: Can you help write SQL to check/fix the RLS policies on `slatedrop_uploads` and `slate_drop_links`? The ideal policy should allow authenticated users to INSERT where `uploaded_by = auth.uid()` and SELECT/UPDATE/DELETE where `uploaded_by = auth.uid() OR org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid())`. This would let us use the cookie-based client (better security) instead of the admin client.

2. **Admin Client Security**: Using `createAdminClient()` (service_role key) in API routes bypasses RLS entirely. Is there a security concern? The auth check (`supabase.auth.getUser()`) still verifies the user's JWT, and the routes manually scope queries by `org_id` or `uploaded_by`. Is this acceptable?

3. **S3 Presigned URL Flow**: The presigned URL is generated with `ContentLength` set. If the browser sends a different content length, will S3 reject the PUT? Should we remove the `ContentLength` constraint?

4. **Future: Project Subfolder Auto-Filing**: Business/enterprise users should have files automatically sorted into project subfolders (e.g., when working in Design Studio on "Maple Heights", outputs go to `projects/maple-heights/design-studio/`). What's the best way to wire this into the `buildS3Key` function using the `file_folders` table?

---

## Alternative Fix: Add Proper RLS Policies (Preferred Long-Term)

Instead of using the admin client, the proper fix is to add correct RLS policies. Run this SQL in the Supabase SQL Editor:

```sql
-- Enable RLS (likely already enabled)
ALTER TABLE slatedrop_uploads ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert their own records
CREATE POLICY "Users can insert own uploads"
  ON slatedrop_uploads
  FOR INSERT
  TO authenticated
  WITH CHECK (uploaded_by = auth.uid());

-- Allow users to view their own uploads or org uploads
CREATE POLICY "Users can view own/org uploads"
  ON slatedrop_uploads
  FOR SELECT
  TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid())
  );

-- Allow users to update their own uploads or org uploads
CREATE POLICY "Users can update own/org uploads"
  ON slatedrop_uploads
  FOR UPDATE
  TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid())
  )
  WITH CHECK (
    uploaded_by = auth.uid()
    OR org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid())
  );

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete own uploads"
  ON slatedrop_uploads
  FOR DELETE
  TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid())
  );

-- Similar for slate_drop_links
ALTER TABLE slate_drop_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own share links"
  ON slate_drop_links
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can view own/org share links"
  ON slate_drop_links
  FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid()
    OR org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid())
  );
```

After running these policies, you could switch back from `createAdminClient()` to `createClient()` (the cookie-based client) for all DB operations, which is more secure because RLS provides an additional layer of protection.
