# Bundle 09 — Supabase & AWS Access, IAM, and Permissions Reference
# Slate360 AI Handoff
# Generated: 2026-02-19 | Claude Sonnet 4.6

> **Purpose:** Give a new AI/Copilot session everything it needs to correctly
> wire Supabase auth, RLS, and AWS S3 access — without guessing env var names
> or client patterns. Nothing in this file is a real credential.

---

## 1. ENVIRONMENT VARIABLES (All Required)

### 1a. Supabase
```env
# Public (safe for browser bundles)
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...   # anon/public JWT

# Server-only (never expose to browser)
SUPABASE_SERVICE_ROLE_KEY=eyJ...       # bypasses RLS — server-only
SUPABASE_JWT_SECRET=...                # used to verify auth tokens
SUPABASE_WEBHOOK_SECRET=...            # validates auth webhook calls

# Aliases Vercel already has (some code reads either name):
SUPABASE_URL=...                       # same value as NEXT_PUBLIC_SUPABASE_URL
SUPABASE_ANON_KEY=...                  # same value as NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SECRET_KEY=...                # same value as SUPABASE_SERVICE_ROLE_KEY
```

### 1b. Postgres Direct Connection (from Vercel Postgres integration)
```env
POSTGRES_URL=postgres://...            # pooled
POSTGRES_PRISMA_URL=postgres://...     # prisma-safe pooled
POSTGRES_URL_NON_POOLING=postgres://...
POSTGRES_PASSWORD=...
POSTGRES_USER=...
POSTGRES_HOST=...
POSTGRES_DATABASE=...
```

### 1c. AWS S3
```env
AWS_ACCESS_KEY_ID=AKI...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-2                   # NOTE: us-east-2, not us-east-1
AWS_S3_BUCKET=slate360-uploads         # or AWS_BUCKET_NAME (code reads both)
```

### 1d. Everything Else (for completeness)
```env
# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# Email
RESEND_API_KEY=re_...
SENDGRID_API_KEY=SG....
EMAIL_FROM=noreply@slate360.com
EMAIL_FROM_NAME=Slate360
EMAIL_PROVIDER=resend                  # 'resend' | 'sendgrid'

# Rate limiting (Upstash Redis)
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...

# Maps
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ...

# App URLs
NEXT_PUBLIC_APP_URL=https://slate360.com
NEXT_PUBLIC_BASE_URL=https://slate360.com
NEXT_PUBLIC_SITE_URL=https://slate360.com

# Cron protection
CRON_SECRET=...                        # sent in Authorization header to /api/cron/*

# GPU/Processing
GPU_WORKER_SECRET_KEY=...

# Integrations
AUTODESK_CLIENT_ID=...
AUTODESK_CLIENT_SECRET=...
AUTODESK_CALLBACK_URL=...
PROCORE_CLIENT_ID=...
PROCORE_CLIENT_SECRET=...
PROCORE_REDIRECT_URI=...
DOCUSIGN_CLIENT_ID=...
DOCUSIGN_CLIENT_SECRET=...
DOCUSIGN_REDIRECT_URI=...
DOCUSIGN_ACCOUNT_ID=...
ADOBE_SIGN_CLIENT_ID=...
ADOBE_SIGN_CLIENT_SECRET=...
ADOBE_SIGN_REDIRECT_URI=...
```

---

## 2. SUPABASE CLIENT PATTERNS (Three — Never Mix)

### Pattern 1: Browser Client (Client Components)
**File:** `src/lib/supabase/client.ts`
```typescript
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```
- Use in: `"use client"` components, browser-side hooks
- Key: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Respects RLS based on the logged-in user's JWT

### Pattern 2: Server Client (API Routes & Server Components)
**File:** `src/lib/supabase/server.ts`
```typescript
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
}
```
- Use in: `route.ts` API handlers, Next.js Server Components
- Key: `NEXT_PUBLIC_SUPABASE_ANON_KEY` + cookie context
- Respects RLS using the request's session cookie

### Pattern 3: Admin Client (Privileged Server-Only Operations)
**File:** `src/lib/supabase/admin.ts`
```typescript
import { createClient } from '@supabase/supabase-js';

export const createAdminClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,   // or SUPABASE_SECRET_KEY
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
};
```
- Use in: webhooks, cron jobs, admin provisioning, bypass-needed operations
- Key: `SUPABASE_SERVICE_ROLE_KEY` — **server-only, NEVER in browser**
- Bypasses ALL RLS policies — use with caution

### Which Pattern When
| Situation | Pattern |
|---|---|
| React client component, user-facing query | Browser (Pattern 1) |
| `route.ts` API handler that reads user session | Server (Pattern 2) |
| Auth webhook (`/api/auth/webhook`) | Admin (Pattern 3) |
| Cron job (`/api/cron/*`) | Admin (Pattern 3) |
| Stripe webhook handler | Admin (Pattern 3) |
| New user provisioning | Admin (Pattern 3) |
| SlateDrop unauthenticated upload (token-based) | Admin (Pattern 3) |
| External respond endpoint (no session) | Admin (Pattern 3) |

---

## 3. SUPABASE RLS POLICY ARCHITECTURE

### Core Rule
Every table has `ENABLE ROW LEVEL SECURITY`. The universal scope pattern is:

```sql
-- Standard org-scoped policy (used on ~90% of tables)
CREATE POLICY "org_members_access" ON public.some_table
  FOR ALL
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM public.organization_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );
```

### The `organization_members` Junction Table
**This is the RLS anchor.** All policies join through it:
```
auth.uid()  →  organization_members.user_id  →  organization_members.org_id
```
Fields: `user_id UUID`, `org_id UUID`, `role TEXT`, `status TEXT ('active'|'invited'|'removed')`

### Policy Patterns by Scope

**User-scoped (own row only)**
```sql
USING (user_id = auth.uid())
-- Tables: user_profiles, session_tokens, personal notifications
```

**Org-scoped (any active member)**
```sql
USING (
  org_id IN (
    SELECT org_id FROM public.organization_members
    WHERE user_id = auth.uid() AND status = 'active'
  )
)
-- Tables: projects, slatedrop_folders, slatedrop_files, contacts,
--         calendar_events, processing_jobs, credit_transactions, etc.
```

**Project-scoped (via org)**
```sql
USING (
  project_id IN (
    SELECT p.id FROM public.projects p
    JOIN public.organization_members om ON p.org_id = om.org_id
    WHERE om.user_id = auth.uid() AND om.status = 'active'
  )
)
-- Tables: project_rfis, project_submittals, project_daily_logs,
--         project_inspections, project_punch_items, etc.
```

**Service role bypass (admin client)**
- `SUPABASE_SERVICE_ROLE_KEY` bypasses all policies automatically
- No special `GRANT` or policy needed — it's inherent to the service role

### Special Policies

**Anonymous insert (public-facing routes)**
```sql
-- Tour analytics — anyone can record a view
CREATE POLICY "Allow anonymous tour analytics"
ON public.tour_analytics FOR INSERT
TO anon, authenticated
WITH CHECK (true);
```

**Stakeholder/external access (token-based)**
```sql
-- project_stakeholders.access_token validates external users
-- External routes call Admin client and manually validate the token,
-- bypassing RLS entirely. They never use Pattern 1 or 2.
```

**CEO-only access**
```sql
-- Enforced in application code via entitlements check, not RLS
-- Route /ceo → guard checks auth.uid() against owner email in org settings
```

### Performance Indexes Required for RLS
```sql
-- These must exist or RLS subqueries will cause full table scans:
CREATE INDEX idx_org_members_user_id ON public.organization_members(user_id);
CREATE INDEX idx_unified_files_org_id ON public.unified_files(org_id);
CREATE INDEX idx_file_folders_org_id ON public.file_folders(org_id);
CREATE INDEX idx_projects_org_id ON public.projects(org_id);
CREATE INDEX idx_slatedrop_files_org_id ON public.slatedrop_files(org_id);
CREATE INDEX idx_slatedrop_folders_org_id ON public.slatedrop_folders(org_id);
```

### Migration Files Reference (RLS-related, in order)
| File | What it does |
|---|---|
| `20260108010327_fix_rls_disabled_tables.sql` | Enables RLS on tables that were missing it |
| `20260108010455_add_missing_rls_policies.sql` | Adds policies to every table that had RLS on but no policies |
| `20260108010537_fix_overly_permissive_policies.sql` | Tightens `auth.role() = 'authenticated'` → org-scoped subquery |
| `20260108010816_consolidate_redundant_policies.sql` | Removes duplicate policies |
| `20260108011918` → `20260108013042` (batches 1–10) | Rewrites slow `initplan` subqueries to indexed joins |
| `20260109_fix_security_and_add_tier_limits.sql` | Adds tier enforcement at DB level |
| `20260112234810_fix_security_advisories_v2.sql` | Fixes Supabase security advisor warnings |
| `20260215_tighten_rls_unified_files.sql` | **Most recent** — tightens `unified_files` + `file_folders` to org scope |
| `FIX_CRITICAL_RLS.sql` | Emergency fix for RLS recursion bug |
| `NUKE_RLS_POLICIES.sql` | Drops ALL policies (use only for full reset) |

---

## 4. AWS S3 CONFIGURATION

### Client Singleton (from `src/lib/s3.ts`)
```typescript
import { S3Client } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.AWS_S3_BUCKET || process.env.AWS_BUCKET_NAME;
// NOTE: code reads both env var names — set both if unsure
```

### S3 Key Structure
```
uploads/
  {orgId}/
    {projectId}/
      {folderPath}/
        {uuid}-{sanitizedFileName}

Example:
  uploads/org_abc123/proj_def456/Plans & Drawings/a1b2c3d4-site-plan.pdf
```

Pattern from `buildS3Key()`:
```typescript
function buildS3Key(orgId, projectId, folderPath, fileName): string {
  // Sanitizes path, strips "..", adds UUID prefix to filename
  return `uploads/${orgId}/${projectId}/${sanitizedFolderPath}/${uuid}-${sanitizedFileName}`;
}
```

### Presigned Upload URL (client → S3 direct, server never handles bytes)
```typescript
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const command = new PutObjectCommand({
  Bucket: BUCKET,
  Key: s3Key,          // from buildS3Key()
  ContentType: mimeType,
});

const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // 1 hour
```

### Presigned Download URL
```typescript
import { GetObjectCommand } from '@aws-sdk/client-s3';

const command = new GetObjectCommand({ Bucket: BUCKET, Key: s3Key });
const downloadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 }); // 5 min
```

### Multipart Upload (>100MB files)
1. Client calls `/api/slatedrop/upload-url` → gets presigned URLs per part
2. Client uploads parts directly to S3 in parallel (5MB–100MB chunks)
3. Client calls `/api/slatedrop/files/complete` with part ETags → server calls `CompleteMultipartUpload`

### Required IAM Policy for the AWS User
Attach this policy to the IAM user whose keys are in `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "Slate360S3Access",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket",
        "s3:CreateMultipartUpload",
        "s3:UploadPart",
        "s3:CompleteMultipartUpload",
        "s3:AbortMultipartUpload",
        "s3:ListMultipartUploadParts"
      ],
      "Resource": [
        "arn:aws:s3:::slate360-uploads",
        "arn:aws:s3:::slate360-uploads/*"
      ]
    }
  ]
}
```

### S3 Bucket CORS (required for presigned URL direct uploads from browser)
Apply this CORS config to the `slate360-uploads` bucket:
```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedOrigins": [
      "https://slate360.com",
      "https://*.vercel.app",
      "http://localhost:3000"
    ],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

---

## 5. STAKEHOLDER / EXTERNAL ACCESS PATTERNS

These routes work without a logged-in Supabase session:

### External Upload (SlateDrop link)
- Route: `GET /slate-drop/[token]` (public page) + `POST /api/slatedrop/upload` (API)
- Auth: token validated against `slatedrop_links.token` — no user session
- DB access: Admin client, manually checks token validity and expiry
- S3 write: allowed via presigned URL from server; key prefixed with org/project

### External RFI/Submittal Response
- Route: `POST /api/external/respond/[token]`
- Auth: token validated against `project_rfis` or `project_submittals` — no user session
- DB access: Admin client, single-row write to the RFI/submittal record

### Stakeholder Portal
- Route: `/stakeholder/project/[projectId]`
- Auth: validated against `project_stakeholders.access_token`
- Permissions: column-level booleans on `project_stakeholders` table:
  - `can_view_project`, `can_edit_project`, `can_manage_stakeholders`, `can_delete_project`
- Per-folder permissions in `folder_permissions` table:
  - `can_view`, `can_upload`, `can_download`, `can_delete`, `can_rename`
  - `max_file_size_mb`, `allowed_file_types[]`, `upload_quota_mb`

### Gate Check-in (QR)
- Route: `GET /gate-checkin/[projectId]/[sessionId]`
- Auth: none (fully public)
- DB access: Admin client, read-only status check

---

## 6. AUTH WEBHOOK FLOW (Critical Bootstrap)

When a new user signs up via Supabase Auth, this chain fires:
```
Supabase Auth creates auth.users row
    ↓
Supabase DB webhook fires
    ↓
POST /api/auth/webhook
    Headers: Authorization: Bearer {SUPABASE_WEBHOOK_SECRET}
    Body: { type: 'INSERT', table: 'users', record: { id, email, ... } }
    ↓
Handler uses Admin client to:
    1. Create row in public.user_profiles { id = auth.uid(), email }
    2. Create row in public.organizations  { name = email, plan = 'trial' }
    3. Create row in public.organization_members { user_id, org_id, role: 'owner' }
    4. Call POST /api/slatedrop/provision-system-folders → creates 9 system folders
    5. Grant 500 trial credits in organizations.credits_balance
```

**If this webhook fails,** the user has `auth.users` row but no profile/org. They will hit a
500 on every authenticated API call. Fix: re-run provisioning via `POST /api/auth/complete-signup`.

---

## 7. SUPABASE REALTIME CHANNELS

```typescript
// Project-level activity feed
const channel = supabase.channel(`project:${projectId}`)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'project_rfis',
      filter: `project_id=eq.${projectId}` }, handler)
  .subscribe();

// Personal notifications
const notifChannel = supabase.channel(`notifications:${userId}`)
  .on('postgres_changes', { event: 'INSERT', schema: 'public',
      table: 'notifications', filter: `user_id=eq.${userId}` }, handler)
  .subscribe();

// File events (org-wide)
const fileChannel = supabase.channel(`slatedrop:${orgId}`)
  .on('postgres_changes', { event: '*', schema: 'public',
      table: 'slatedrop_files', filter: `org_id=eq.${orgId}` }, handler)
  .subscribe();
```

---

## 8. QUICK CHECKLIST FOR NEW CHAT/COPILOT SESSION

Before writing any Supabase/S3 code, confirm:

- [ ] `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` set in `.env.local`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set (server-only env var, never prefixed `NEXT_PUBLIC_`)
- [ ] `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION=us-east-2`, `AWS_S3_BUCKET` set
- [ ] S3 bucket CORS configured (see Section 4)
- [ ] IAM policy attached to AWS user (see Section 4)
- [ ] Using correct Supabase client pattern for the context (Section 2)
- [ ] All new tables have `ENABLE ROW LEVEL SECURITY` + org-scoped policy
- [ ] Admin client ONLY used server-side (API routes, webhooks, crons)
- [ ] Performance indexes added for any new org_id / user_id FK columns
