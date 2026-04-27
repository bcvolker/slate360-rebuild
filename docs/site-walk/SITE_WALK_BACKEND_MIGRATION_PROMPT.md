# Site Walk Backend Migration Prompt for External AI Assistant

Copy/paste this entire prompt into the other AI assistant. Return that assistant's response in this same file so it can be reviewed and corrected inside the Slate360 codebase.

---

## Prompt for the other AI assistant

You are helping generate backend Supabase/Postgres migration code for Slate360, specifically the Site Walk module.

You do **not** have access to the codebase, so this prompt includes all relevant context. Your job is to write migration SQL code that fills the backend gaps before the frontend build continues.

### Product context

Slate360 is a Next.js 15 / React 19 / TypeScript SaaS platform using:

- Supabase Postgres/Auth/RLS
- Cloudflare R2 / S3-compatible storage
- Stripe billing
- SlateDrop as the canonical file/document backbone
- Site Walk as the first major field-capture module inside Slate360

Site Walk is **not** a separate app. It is a module inside Slate360. It uses the same auth, projects, org/workspace context, SlateDrop storage, Coordination inbox/comments, subscriptions, and entitlements.

The new strategic Site Walk blueprint requires:

1. Real-time multiplayer pins/comments/status updates.
2. IndexedDB offline-first capture queues with server-side idempotency.
3. Tier-gated collaboration:
   - Free Collaborator: assigned-task responder only, no owned storage/credits.
   - Standard: solo field projects, 0 collaborators.
   - Pro/Business: CM projects, 3 included collaborators.
   - Enterprise: custom.
4. Master Plan Room:
   - Project-level plan PDF uploads.
   - Multi-page PDFs split into mobile-optimized sheets/tiles.
   - Walk sessions can attach one or more plan sheets.
5. Act 2 capture:
   - Camera-only or plan-based capture.
   - Long-press plan pinning before/while creating an item.
   - Editable vector markups.
   - Undo/redo operation history.
   - Ghost Camera / before-after relationship.
6. Non-PDF deliverables:
   - Hosted previews.
   - Client portals.
   - Kanban boards.
   - Cinematic presentations.
   - CSV/Excel exports.
   - PDFs remain supported but are not the center.
7. Auditability:
   - Immutable activity logs.
   - Status-change trails.
   - Read receipts.
   - Viewer activity.
8. SlateDrop integration:
   - New Site Walk artifacts must write through `project_folders`, `slatedrop_uploads`, and/or `unified_files`.
   - Do not create a disconnected `site-walk/photos` silo.
9. Service-worker HTML/CSS/JS caching is disabled. Offline capture should be IndexedDB/client queue + server idempotency, not service-worker page caching.

### Existing backend rules

Use these conventions:

- Supabase migrations are plain SQL.
- Migrations must be **idempotent** where practical:
  - `CREATE TABLE IF NOT EXISTS`
  - `ADD COLUMN IF NOT EXISTS`
  - `CREATE INDEX IF NOT EXISTS`
  - `DROP POLICY IF EXISTS` before recreating policies
  - Wrap fragile constraint changes in safe blocks where needed
- Do not drop data.
- Avoid destructive changes.
- If changing `CHECK` constraints, drop/re-add only the constraint, not the table/column.
- Enable RLS on new tables.
- RLS must allow:
  - organization members,
  - and project-scoped collaborators through `project_members`.
- Existing code still often uses org membership, but collaborators may not be org members. This is one of the biggest gaps.
- Use `project_folders`, not legacy `file_folders`.
- Use `auth.users(id)` for users.
- Use `public.organizations(id)`, `public.projects(id)`, `public.project_members`, and `public.organization_members`.
- Use `gen_random_uuid()`.

### Existing schema summary

Existing project tables:

```sql
public.projects (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  name text not null,
  description text,
  status text not null default 'active',
  created_by uuid not null,
  created_at timestamptz not null,
  report_defaults jsonb not null default '{}'
)

public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null,
  role text not null,
  primary key (project_id, user_id)
)
```

Existing organization/member tables exist:

```sql
public.organizations(id)
public.organization_members(org_id, user_id, role, ...)
```

Existing SlateDrop/file tables:

```sql
public.project_folders (
  id uuid primary key,
  project_id uuid references public.projects(id),
  org_id uuid references public.organizations(id),
  folder_path text not null,
  name text not null,
  parent_id uuid,
  is_system boolean default false,
  metadata jsonb default '{}',
  ...
)

public.slatedrop_uploads (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  file_size bigint not null default 0,
  file_type text,
  s3_key text not null,
  org_id uuid references organizations(id) on delete set null,
  uploaded_by uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','active','deleted')),
  folder_id uuid references project_folders(id) on delete set null,
  created_at timestamptz not null default now(),
  unified_file_id uuid references public.unified_files(id) on delete set null
)

public.unified_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id),
  org_id uuid references public.organizations(id),
  name text not null,
  storage_key text not null,
  source text default 'slatedrop',
  uploaded_by uuid references auth.users(id),
  metadata jsonb default '{}',
  ...
)
```

Existing Site Walk tables:

```sql
public.site_walk_sessions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null default '',
  status text not null default 'draft'
    check (status in ('draft','in_progress','completed','archived')),
  started_at timestamptz,
  completed_at timestamptz,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
)
```

```sql
public.site_walk_items (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.site_walk_sessions(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  item_type text not null check (item_type in ('photo','video','text_note','voice_note','annotation')),
  title text not null default '',
  description text,
  file_id uuid references public.slatedrop_uploads(id) on delete set null,
  s3_key text,
  latitude double precision,
  longitude double precision,
  location_label text,
  captured_at timestamptz not null default now(),
  weather jsonb,
  metadata jsonb not null default '{}',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Added by later migrations:
  workflow_type text not null default 'general'
    check (workflow_type in ('general','punch','inspection','proposal')),
  item_status text not null default 'open'
    check (item_status in ('open','in_progress','resolved','verified','closed','na')),
  priority text not null default 'medium'
    check (priority in ('low','medium','high','critical')),
  assigned_to uuid references auth.users(id),
  due_date date,
  resolved_by uuid references auth.users(id),
  resolved_at timestamptz,
  verified_by uuid references auth.users(id),
  verified_at timestamptz,
  cost_estimate numeric(12,2),
  manpower_hours numeric(8,2),
  before_item_id uuid references site_walk_items(id) on delete set null,
  item_relationship text not null default 'standalone'
    check (item_relationship in ('standalone','resolution','rework')),
  audio_s3_key text,
  markup_data jsonb not null default '{}'
)
```

```sql
public.site_walk_plans (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references site_walk_sessions(id) on delete cascade,
  org_id uuid not null references organizations(id) on delete cascade,
  title text not null,
  s3_key text not null,
  file_id uuid references slatedrop_uploads(id) on delete set null,
  width integer not null default 0,
  height integer not null default 0,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
)
```

```sql
public.site_walk_pins (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references site_walk_plans(id) on delete cascade,
  item_id uuid not null references site_walk_items(id) on delete cascade,
  org_id uuid not null references organizations(id) on delete cascade,
  x_pct numeric(7,4) not null check (x_pct >= 0 and x_pct <= 100),
  y_pct numeric(7,4) not null check (y_pct >= 0 and y_pct <= 100),
  pin_number integer,
  pin_color text not null default 'blue'
    check (pin_color in ('blue','green','amber','red','gray','purple')),
  created_at timestamptz not null default now(),

  -- Added later:
  markup_data jsonb not null default '{}',
  updated_at timestamptz not null default now()
)
```

```sql
public.site_walk_comments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  session_id uuid not null references public.site_walk_sessions(id) on delete cascade,
  item_id uuid references public.site_walk_items(id) on delete cascade,
  parent_id uuid references public.site_walk_comments(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  is_field boolean not null default false,
  read_by uuid[] not null default '{}',
  is_escalation boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
)
```

```sql
public.site_walk_assignments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  session_id uuid not null references public.site_walk_sessions(id) on delete cascade,
  item_id uuid references public.site_walk_items(id) on delete set null,
  assigned_by uuid not null references auth.users(id) on delete cascade,
  assigned_to uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  priority text not null default 'medium'
    check (priority in ('low','medium','high','critical')),
  status text not null default 'pending'
    check (status in ('pending','acknowledged','in_progress','done','rejected')),
  due_date date,
  acknowledged_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
)
```

```sql
public.site_walk_deliverables (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.site_walk_sessions(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Untitled Report',
  deliverable_type text not null
    check (deliverable_type in ('report','punchlist','photo_log','rfi','estimate','status_report','custom')),
  status text not null default 'draft'
    check (status in ('draft','submitted','shared','archived')),
  content jsonb not null default '[]',
  share_token text unique,
  shared_at timestamptz,
  export_s3_key text,
  share_expires_at timestamptz,
  share_max_views integer,
  share_view_count integer not null default 0,
  share_password_hash text,
  share_revoked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
)
```

Existing token/viewer tables:

```sql
public.deliverable_access_tokens (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  org_id uuid not null references organizations(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete set null,
  deliverable_type text not null check (deliverable_type in ('tour','report','walk','file')),
  deliverable_id uuid not null,
  role text not null default 'view' check (role in ('view','download','comment')),
  expires_at timestamptz,
  max_views integer,
  view_count integer not null default 0,
  is_revoked boolean not null default false,
  created_at timestamptz not null default now(),
  last_viewed_at timestamptz
)
```

```sql
public.viewer_comments (
  id uuid primary key default gen_random_uuid(),
  deliverable_id uuid not null references public.site_walk_deliverables(id) on delete cascade,
  item_id text not null,
  parent_id uuid references public.viewer_comments(id) on delete cascade,
  author_user_id uuid references auth.users(id) on delete set null,
  author_name text not null,
  author_email text,
  body text not null,
  created_at timestamptz not null default now(),
  is_field boolean not null default false,
  is_escalation boolean not null default false,
  comment_intent text check (comment_intent is null or comment_intent in ('approve','needs_change','question','comment'))
)
```

Existing collaborator invite table:

```sql
public.project_collaborator_invites (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  invited_by uuid not null references auth.users(id) on delete cascade,
  email text,
  phone text,
  role text not null default 'collaborator'
    check (role in ('collaborator','viewer')),
  status text not null default 'pending'
    check (status in ('pending','accepted','revoked','expired')),
  channel text not null check (channel in ('email','sms','both','link')),
  invitation_token uuid references public.invitation_tokens(token) on delete set null,
  message text,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  revoked_at timestamptz,
  last_sent_at timestamptz,
  send_count integer not null default 1
)
```

### Existing problems/gaps to solve with migrations

#### Gap 1 — RLS only understands org members, not project collaborators

Most Site Walk RLS policies check `organization_members`. Free Collaborators may only be in `project_members`, not `organization_members`. This means the planned collaborator/subcontractor workflow cannot work safely.

You must create reusable helper functions and update Site Walk RLS policies to allow scoped project access.

#### Gap 2 — Master Plan Room is session-scoped only

`site_walk_plans` belongs to a session. The new architecture requires a project-level Master Plan Room where a project can have uploaded PDFs, converted sheets, and tile manifests before any session starts.

You must add project-level plan room tables and link sessions to selected plan sheets.

#### Gap 3 — Plan pinning needs draft/offline/idempotent support

Currently `site_walk_pins.item_id` is NOT NULL and pins are tied to `site_walk_plans`. The desired UI allows long-pressing a plan and then choosing Take Photo / Upload / Add Note / Assign Task. The backend needs to support client-generated mutation IDs, draft pins/items, and safe retry from offline queues.

#### Gap 4 — Offline queue needs server-side idempotency

Client IndexedDB is frontend-side, but the server needs idempotency keys to avoid duplicate records when queued mutations replay.

#### Gap 5 — Deliverables are still too report/PDF-centric

`site_walk_deliverables.deliverable_type` does not include all planned non-PDF outputs, and there is no normalized block table for a Notion-style builder or presentation/portal configs.

#### Gap 6 — Audit trails/read receipts are incomplete

There is comment `read_by uuid[]`, deliverable views, and viewer comments, but no robust immutable Site Walk activity log or read receipt table covering items, assignments, comments, deliverables, and portal interactions.

#### Gap 7 — Realtime is incomplete

Some tables are added to `supabase_realtime`, but not all relevant Act 2/Act 3 tables have `REPLICA IDENTITY FULL` and publication membership. Realtime should cover sessions, items, pins, comments, assignments, plan sheet/session links, and possibly activity.

#### Gap 8 — Usage/margin metering is not explicit

Site Walk needs storage/AI/export usage tracking so backend can enforce/measure tier caps and margin.

### Required output

Return complete SQL migration files. Do **not** provide vague advice. Write the actual SQL.

Use these exact migration file names:

1. `20260427090000_site_walk_project_access_helpers.sql`
2. `20260427091000_site_walk_master_plan_room.sql`
3. `20260427092000_site_walk_offline_capture_idempotency.sql`
4. `20260427093000_site_walk_deliverable_outputs.sql`
5. `20260427094000_site_walk_audit_receipts_realtime.sql`
6. `20260427095000_site_walk_usage_metering.sql`

Each migration must be idempotent and safe to run against the existing schema described above.

---

## Migration 1: `20260427090000_site_walk_project_access_helpers.sql`

Write SQL that:

### 1. Creates helper functions

Create these stable/security-definer-safe helper functions:

```sql
public.current_user_org_ids()
returns setof uuid
```

```sql
public.user_is_org_member(p_org_id uuid, p_user_id uuid default auth.uid())
returns boolean
```

```sql
public.user_project_role(p_project_id uuid, p_user_id uuid default auth.uid())
returns text
```

Rules:
- Return `organization_members.role` if user is in the project org.
- Return `project_members.role` if user is project-scoped only.
- Prefer org role if both exist.
- Return null if no access.

```sql
public.user_can_access_project(p_project_id uuid, p_user_id uuid default auth.uid())
returns boolean
```

True if:
- user is an `organization_members` member of the project org, OR
- user exists in `project_members` for that project.

```sql
public.user_can_manage_project(p_project_id uuid, p_user_id uuid default auth.uid())
returns boolean
```

True if:
- org role in `owner`, `admin`, `member`, OR
- project role in `owner`, `admin`, `manager`.

```sql
public.user_can_respond_to_project(p_project_id uuid, p_user_id uuid default auth.uid())
returns boolean
```

True if:
- can access project, including collaborators/viewers,
- but downstream insert/update policies should still restrict destructive actions.

### 2. Adds project-aware columns where needed

Add to `site_walk_items`:

```sql
project_id uuid references public.projects(id) on delete cascade
```

Backfill from session:

```sql
update site_walk_items i
set project_id = s.project_id
from site_walk_sessions s
where i.session_id = s.id and i.project_id is null;
```

Do not make NOT NULL yet unless all rows are backfilled. Create index.

Add to `site_walk_comments`:

```sql
project_id uuid references public.projects(id) on delete cascade
```

Backfill from session. Create index.

Add to `site_walk_assignments`:

```sql
project_id uuid references public.projects(id) on delete cascade
```

Backfill from session. Create index.

Add to `site_walk_deliverables`:

```sql
project_id uuid references public.projects(id) on delete cascade
```

Backfill from session. Create index.

Add to `site_walk_plans`:

```sql
project_id uuid references public.projects(id) on delete cascade
```

Backfill from session. Create index.

Add to `site_walk_pins`:

```sql
project_id uuid references public.projects(id) on delete cascade,
session_id uuid references public.site_walk_sessions(id) on delete cascade
```

Backfill by joining `site_walk_plans` to sessions. Create indexes.

### 3. Replaces Site Walk RLS policies

Drop and recreate RLS policies for:

- `site_walk_sessions`
- `site_walk_items`
- `site_walk_plans`
- `site_walk_pins`
- `site_walk_comments`
- `site_walk_assignments`
- `site_walk_deliverables`
- `site_walk_templates`
- `site_walk_deliverable_snapshots` if it exists

Policy rules:

- SELECT: `user_can_access_project(project_id)` or org member for org-only template rows.
- INSERT: caller must have project access/manage permission, depending table:
  - sessions/items/comments/pins: project responders can insert.
  - plans/templates/deliverables: project managers/org members can insert.
  - assignments: project managers can assign; assignee can update their own assignment status.
- UPDATE:
  - item creator, assignee, or project manager can update items.
  - assigned user can update assignment status/ack/completion fields.
  - project manager can update assignments fully.
  - comment author can update own comment.
  - project manager can update deliverables/plans.
- DELETE:
  - project manager can delete.
  - comment author can delete own comment.

Keep policies simple enough to be maintainable.

---

## Migration 2: `20260427091000_site_walk_master_plan_room.sql`

Write SQL that creates project-level plan room support.

### Tables to create

#### `site_walk_plan_sets`

Represents an uploaded source plan document/PDF for a project.

Columns:

```sql
id uuid primary key default gen_random_uuid()
org_id uuid not null references public.organizations(id) on delete cascade
project_id uuid not null references public.projects(id) on delete cascade
title text not null
description text
source_file_id uuid references public.slatedrop_uploads(id) on delete set null
source_unified_file_id uuid references public.unified_files(id) on delete set null
source_s3_key text
original_file_name text
mime_type text
file_size bigint not null default 0
page_count integer not null default 0
processing_status text not null default 'pending'
  check (processing_status in ('pending','processing','ready','failed','archived'))
processing_error text
uploaded_by uuid not null references auth.users(id) on delete set null
metadata jsonb not null default '{}'
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

Indexes:
- `(project_id, processing_status)`
- `(org_id)`
- `(uploaded_by)`

#### `site_walk_plan_sheets`

Represents one rendered sheet/page/tile manifest from a source plan set.

Columns:

```sql
id uuid primary key default gen_random_uuid()
org_id uuid not null references public.organizations(id) on delete cascade
project_id uuid not null references public.projects(id) on delete cascade
plan_set_id uuid not null references public.site_walk_plan_sets(id) on delete cascade
sheet_number integer not null
sheet_name text
image_s3_key text
thumbnail_s3_key text
tile_manifest jsonb not null default '{}'
width integer not null default 0
height integer not null default 0
rotation integer not null default 0
scale_label text
sort_order integer not null default 0
metadata jsonb not null default '{}'
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

Indexes:
- `(project_id, sort_order)`
- `(plan_set_id, sheet_number)`
- unique `(plan_set_id, sheet_number)`

#### `site_walk_session_plan_sheets`

Links a session to the selected plan sheets.

Columns:

```sql
id uuid primary key default gen_random_uuid()
org_id uuid not null references public.organizations(id) on delete cascade
project_id uuid not null references public.projects(id) on delete cascade
session_id uuid not null references public.site_walk_sessions(id) on delete cascade
plan_sheet_id uuid not null references public.site_walk_plan_sheets(id) on delete cascade
is_primary boolean not null default false
created_by uuid not null references auth.users(id) on delete set null
created_at timestamptz not null default now()
```

Indexes:
- unique `(session_id, plan_sheet_id)`
- unique partial `(session_id) where is_primary = true`
- `(project_id)`

### RLS

Enable RLS. Policies:

- SELECT: `user_can_access_project(project_id)`.
- INSERT/UPDATE/DELETE: `user_can_manage_project(project_id)`.

### Compatibility

Do not remove old `site_walk_plans`. Add optional compatibility fields to `site_walk_plans`:

```sql
plan_set_id uuid references public.site_walk_plan_sets(id) on delete set null
plan_sheet_id uuid references public.site_walk_plan_sheets(id) on delete set null
sheet_number integer
tile_manifest jsonb not null default '{}'
thumbnail_s3_key text
processing_status text not null default 'ready'
```

---

## Migration 3: `20260427092000_site_walk_offline_capture_idempotency.sql`

Write SQL that supports offline queues and draft capture.

### Add idempotency/draft fields to `site_walk_sessions`

```sql
client_session_id text
session_type text not null default 'general'
  check (session_type in ('general','progress','punch','inspection','proposal','safety','proof_of_work'))
sync_state text not null default 'synced'
  check (sync_state in ('pending','syncing','synced','failed','conflict'))
last_synced_at timestamptz
```

Unique index:
- `(org_id, created_by, client_session_id)` where `client_session_id is not null`

### Add idempotency/capture fields to `site_walk_items`

```sql
client_item_id text
client_mutation_id text
capture_mode text not null default 'camera'
  check (capture_mode in ('camera','upload','plan_pin','voice','text','mixed'))
sync_state text not null default 'synced'
  check (sync_state in ('pending','syncing','synced','failed','conflict'))
local_created_at timestamptz
local_updated_at timestamptz
device_id text
upload_state text not null default 'none'
  check (upload_state in ('none','queued','uploading','uploaded','failed'))
upload_progress integer not null default 0 check (upload_progress >= 0 and upload_progress <= 100)
vector_history jsonb not null default '[]'
markup_revision integer not null default 0
tags text[] not null default '{}'
trade text
category text
```

Unique indexes:
- `(org_id, created_by, client_item_id)` where not null.
- `(org_id, created_by, client_mutation_id)` where not null.

### Modify `site_walk_pins`

Need support draft pins and plan-room sheets:

```sql
client_pin_id text
plan_sheet_id uuid references public.site_walk_plan_sheets(id) on delete cascade
pin_status text not null default 'draft'
  check (pin_status in ('draft','active','resolved','archived'))
label text
created_by uuid references auth.users(id) on delete set null
```

Also:

```sql
ALTER TABLE public.site_walk_pins ALTER COLUMN item_id DROP NOT NULL;
```

This is required because the UI can create a plan pin before the user chooses photo/upload/note/assignment. The item can be attached afterward.

Unique index:
- `(org_id, created_by, client_pin_id)` where not null.

### Create `site_walk_offline_mutations`

Server-side idempotency ledger for replayed IndexedDB mutations.

Columns:

```sql
id uuid primary key default gen_random_uuid()
org_id uuid not null references public.organizations(id) on delete cascade
project_id uuid references public.projects(id) on delete cascade
session_id uuid references public.site_walk_sessions(id) on delete cascade
user_id uuid not null references auth.users(id) on delete cascade
client_mutation_id text not null
mutation_type text not null
  check (mutation_type in (
    'create_session','update_session',
    'create_item','update_item','delete_item',
    'create_pin','update_pin','delete_pin',
    'create_comment','update_assignment',
    'upload_file','complete_upload',
    'create_deliverable','update_deliverable'
  ))
target_table text
target_id uuid
payload jsonb not null default '{}'
status text not null default 'received'
  check (status in ('received','applied','duplicate','failed','conflict'))
error_message text
created_at timestamptz not null default now()
applied_at timestamptz
```

Unique index:
- `(user_id, client_mutation_id)`

RLS:
- SELECT/INSERT own `user_id = auth.uid()`.
- Project manager can SELECT by project.
- No direct client DELETE.

Realtime:
- Add to realtime publication if available.

---

## Migration 4: `20260427093000_site_walk_deliverable_outputs.sql`

Write SQL for non-PDF deliverables.

### Expand `site_walk_deliverables.deliverable_type`

Drop/recreate check to include:

```sql
'report',
'punchlist',
'photo_log',
'rfi',
'estimate',
'status_report',
'proposal',
'field_report',
'inspection_package',
'safety_report',
'proof_of_work',
'client_portal',
'kanban_board',
'cinematic_presentation',
'spreadsheet_export',
'custom'
```

### Expand `site_walk_deliverables.status`

Drop/recreate check to include:

```sql
'draft',
'in_review',
'approved',
'submitted',
'shared',
'published',
'archived',
'revoked'
```

### Add columns to `site_walk_deliverables`

```sql
output_mode text not null default 'hosted'
  check (output_mode in ('hosted','pdf','portal','presentation','spreadsheet','zip','email_body'))
brand_snapshot jsonb not null default '{}'
portal_config jsonb not null default '{}'
presentation_config jsonb not null default '{}'
kanban_config jsonb not null default '{}'
export_config jsonb not null default '{}'
summary_stats jsonb not null default '{}'
last_published_at timestamptz
published_by uuid references auth.users(id) on delete set null
```

### Create `site_walk_deliverable_blocks`

Normalized block-editor rows.

Columns:

```sql
id uuid primary key default gen_random_uuid()
org_id uuid not null references public.organizations(id) on delete cascade
project_id uuid references public.projects(id) on delete cascade
deliverable_id uuid not null references public.site_walk_deliverables(id) on delete cascade
source_item_id uuid references public.site_walk_items(id) on delete set null
block_type text not null
  check (block_type in (
    'cover','executive_summary','text','photo','markup','plan_map','pin_list',
    'punch_table','estimate_table','status_summary','before_after',
    'signature','file_attachment','comment_thread','divider','custom'
  ))
content jsonb not null default '{}'
sort_order integer not null default 0
created_by uuid references auth.users(id) on delete set null
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

Indexes:
- `(deliverable_id, sort_order)`
- `(source_item_id)` where not null
- `(project_id)`

RLS:
- SELECT: `user_can_access_project(project_id)` or owner-created deliverable.
- INSERT/UPDATE/DELETE: project manager or deliverable creator.

### Create `site_walk_portal_boards`

Supports interactive client portals/Kanban.

Columns:

```sql
id uuid primary key default gen_random_uuid()
org_id uuid not null references public.organizations(id) on delete cascade
project_id uuid not null references public.projects(id) on delete cascade
deliverable_id uuid references public.site_walk_deliverables(id) on delete cascade
title text not null
board_type text not null default 'kanban'
  check (board_type in ('kanban','plan_review','proof_of_work','client_review'))
columns jsonb not null default '[]'
filters jsonb not null default '{}'
is_public boolean not null default false
created_by uuid not null references auth.users(id) on delete set null
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

RLS same as deliverables.

### Update `deliverable_access_tokens`

Expand `deliverable_type` check to include:

```sql
'tour','report','walk','file','site_walk_deliverable','site_walk_portal','site_walk_presentation'
```

Expand `role` check to include:

```sql
'view','download','comment','respond','approve'
```

Add columns:

```sql
recipient_email text
recipient_phone text
recipient_name text
metadata jsonb not null default '{}'
```

---

## Migration 5: `20260427094000_site_walk_audit_receipts_realtime.sql`

Write SQL for audit logs, read receipts, and realtime publication.

### Create `site_walk_activity_log`

Immutable audit/event log.

Columns:

```sql
id uuid primary key default gen_random_uuid()
org_id uuid not null references public.organizations(id) on delete cascade
project_id uuid references public.projects(id) on delete cascade
session_id uuid references public.site_walk_sessions(id) on delete cascade
item_id uuid references public.site_walk_items(id) on delete set null
deliverable_id uuid references public.site_walk_deliverables(id) on delete set null
assignment_id uuid references public.site_walk_assignments(id) on delete set null
comment_id uuid references public.site_walk_comments(id) on delete set null
actor_id uuid references auth.users(id) on delete set null
event_type text not null
  check (event_type in (
    'session_created','session_started','session_completed',
    'item_created','item_updated','item_status_changed','item_assigned','item_resolved','item_verified',
    'pin_created','pin_moved','comment_created','comment_read',
    'assignment_created','assignment_acknowledged','assignment_completed',
    'deliverable_created','deliverable_published','deliverable_shared','deliverable_viewed',
    'portal_comment_created','file_uploaded','file_attached','share_revoked',
    'sync_conflict','offline_mutation_applied'
  ))
before_state jsonb
after_state jsonb
metadata jsonb not null default '{}'
created_at timestamptz not null default now()
```

Indexes:
- `(project_id, created_at desc)`
- `(session_id, created_at desc)`
- `(item_id, created_at desc)` where not null
- `(deliverable_id, created_at desc)` where not null
- `(actor_id, created_at desc)` where not null
- `(event_type, created_at desc)`

RLS:
- SELECT: `user_can_access_project(project_id)`.
- INSERT: authenticated users through app/API if they can access project.
- No UPDATE.
- No DELETE except service role; do not create client delete policy.

### Create `site_walk_read_receipts`

Generic read receipts.

Columns:

```sql
id uuid primary key default gen_random_uuid()
org_id uuid not null references public.organizations(id) on delete cascade
project_id uuid references public.projects(id) on delete cascade
subject_type text not null
  check (subject_type in ('comment','assignment','deliverable','portal','thread','item'))
subject_id uuid not null
user_id uuid references auth.users(id) on delete cascade
external_recipient text
read_at timestamptz not null default now()
metadata jsonb not null default '{}'
```

Unique indexes:
- `(subject_type, subject_id, user_id)` where `user_id is not null`
- `(subject_type, subject_id, external_recipient)` where `external_recipient is not null`

RLS:
- SELECT: `user_can_access_project(project_id)`.
- INSERT: user can insert own read receipt or project manager can insert for external recipient.
- UPDATE: user can update own read receipt.

### Trigger helpers

Create lightweight trigger functions to log:

- item status changes,
- assignment status changes,
- deliverable status changes.

Do not over-engineer. The trigger can insert event rows into `site_walk_activity_log` using old/new row values.

### Realtime publication

Add these tables to `supabase_realtime` if publication exists:

- `site_walk_sessions`
- `site_walk_items`
- `site_walk_pins`
- `site_walk_comments`
- `site_walk_assignments`
- `site_walk_deliverables`
- `site_walk_deliverable_blocks`
- `site_walk_activity_log`
- `site_walk_offline_mutations`
- `site_walk_session_plan_sheets`
- `site_walk_plan_sheets`

Use duplicate-safe `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN NULL; END $$`.

Set `REPLICA IDENTITY FULL` on realtime-critical tables:

- sessions
- items
- pins
- comments
- assignments
- deliverables
- deliverable_blocks
- activity_log
- offline_mutations
- session_plan_sheets

---

## Migration 6: `20260427095000_site_walk_usage_metering.sql`

Write SQL for usage/margin metering.

### Create `site_walk_usage_events`

Columns:

```sql
id uuid primary key default gen_random_uuid()
org_id uuid not null references public.organizations(id) on delete cascade
project_id uuid references public.projects(id) on delete cascade
session_id uuid references public.site_walk_sessions(id) on delete set null
user_id uuid references auth.users(id) on delete set null
event_type text not null
  check (event_type in (
    'storage_bytes_uploaded',
    'storage_bytes_deleted',
    'ai_credits_used',
    'pdf_export',
    'spreadsheet_export',
    'portal_view',
    'presentation_view',
    'sms_sent',
    'email_sent',
    'realtime_minutes',
    'media_transcode',
    'plan_page_processed'
  ))
quantity numeric(18,4) not null default 1
unit text not null default 'count'
  check (unit in ('count','bytes','credits','minutes','pages','messages'))
source_table text
source_id uuid
metadata jsonb not null default '{}'
created_at timestamptz not null default now()
```

Indexes:
- `(org_id, created_at desc)`
- `(project_id, created_at desc)`
- `(user_id, created_at desc)`
- `(event_type, created_at desc)`

RLS:
- SELECT: org members and project managers can view.
- INSERT: authenticated user can insert for org/project they can access.
- No UPDATE/DELETE for clients.

### Create optional monthly rollup view

Create view:

```sql
site_walk_usage_monthly
```

Grouped by:
- org_id
- project_id
- month
- event_type
- unit

Fields:
- total_quantity
- event_count

Make it a normal view, not materialized.

### Optional helper function

Create:

```sql
public.record_site_walk_usage(
  p_org_id uuid,
  p_project_id uuid,
  p_session_id uuid,
  p_event_type text,
  p_quantity numeric,
  p_unit text,
  p_source_table text default null,
  p_source_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
```

Rules:
- Inserts into `site_walk_usage_events`.
- Uses `auth.uid()` for `user_id`.
- Requires `user_can_access_project(p_project_id)` when project_id is not null.
- Returns inserted event id.

---

## Additional requirements

### Validation SQL

At the end of your response, include validation queries:

1. List new tables.
2. List RLS-enabled new tables.
3. Confirm realtime publication membership.
4. Confirm no old `site_walk_deliverables_deliverable_type_check` is missing.
5. Confirm project collaborators can pass `user_can_access_project`.

### Do not implement frontend

Do not generate React components. This task is only backend migrations and database functions.

### Do not assume service-worker offline caching

Offline support must be built through client IndexedDB and these server-side idempotency/mutation tables. Do not propose service-worker HTML/CSS/JS caching.

### Output format

Return:

1. A short summary of what the migrations do.
2. Then each migration file with a heading and a complete SQL code block.
3. Then validation SQL.
4. Then any warnings or assumptions.

Make the SQL as production-safe as possible. Use comments generously so a human reviewer can understand why each table/function exists.
