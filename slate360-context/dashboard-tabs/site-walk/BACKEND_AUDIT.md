# Site Walk — Backend Audit (Admin Layer)

Date: 2026-04-24
Scope: Organizations / Branding / Address Book / Projects / API routes.
Purpose: Inform UX-lead's data-model design for Global Settings, Address Book,
and Project Creation. **No code changes — report only.**

---

## 1. Organization & Branding

### 1.1 `organizations` table — current columns

The base `CREATE TABLE public.organizations` is **not present** in
`supabase/migrations/`. It was created via Supabase Studio or pre-CLI migration.
Columns referenced or added by migrations in this repo:

| Column | Type | Default | Source migration |
|---|---|---|---|
| `id` | uuid | `gen_random_uuid()` | (pre-CLI base) |
| `name` | text | — | (pre-CLI base — referenced widely) |
| `tier` | text | — | (pre-CLI base — referenced in cleanup migrations) |
| `credits_balance` | integer | `0` | `20250405_atomic_rpc_functions.sql` |
| `stripe_customer_id` | text | — | `20260402000001_org_stripe_customer_id.sql` (unique) |
| `deliverable_logo_s3_key` | text | — | `20260412000010_deliverable_sharing_snapshots.sql` |
| `brand_settings` | jsonb | `'{}'` | `20260421000001_brand_and_report_defaults.sql` ← **APPLIED LIVE? UNVERIFIED** |

### 1.2 `brand_settings` documented shape (jsonb)

Per the migration COMMENT, `brand_settings` is intended to hold:

```
{
  logo_url?: string,
  signature_url?: string,
  primary_color?: string,
  header_html?: string,
  footer_html?: string,
  contact_name?: string,
  contact_email?: string,
  contact_phone?: string,
  address?: string,
  website?: string
}
```

### 1.3 What's MISSING vs. UX-lead's "Company Identity" requirement

| UX requirement | Status | Gap |
|---|---|---|
| Company name | ✅ | Top-level `organizations.name` |
| Address | 🟡 | Only inside `brand_settings.address` jsonb. **No dedicated column** → not SQL-filterable. |
| Website | 🟡 | Only inside `brand_settings.website` jsonb. |
| Hi-res logo PNG | ✅ | `brand_settings.logo_url` (presigned S3 URL refreshed via `POST /api/site-walk/branding`) + redundant `deliverable_logo_s3_key`. |
| Brand **colors** (plural) | 🟥 | Only `primary_color` exists. **No `secondary_color`, `accent_color`, no `brand_colors[]` array.** |
| Personal profile (user title, phone, signature) | 🟥 | Mixed into `brand_settings.contact_*` keys — these are **org-level**, not per-user. **Personal profile has nowhere to live** other than `auth.users.user_metadata`. |
| Digital signature image | ✅ | `brand_settings.signature_url`. |

### 1.4 Migration `20260421000001_brand_and_report_defaults.sql`

**Exists in repo** at the path above (36 lines). What it does:

1. `ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS brand_settings jsonb NOT NULL DEFAULT '{}'`
2. Adds the COMMENT shown in §1.2.
3. `ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS report_defaults jsonb NOT NULL DEFAULT '{}'`
4. Adds a COMMENT documenting the per-project shape (project_name, client_name, client_email, project_address, project_number, inspector_name, inspector_license, scope_of_work, default_deliverable_type, custom_fields).

**Live status: UNCONFIRMED.** Operator never confirmed `supabase db push`. Required action: apply this migration **and** `20260423000002_canvas_markup_realtime.sql` against project `hadnfcenpcfaeclczsmm` before any UI consuming these fields can ship.

### 1.5 Adjacent table — `org_branding`

A separate table `public.org_branding` exists from `20260408000002_org_branding.sql` (org-keyed). **It is NOT the same** as `organizations.brand_settings` and is older/duplicative. Recommendation: pick one canonical source before UI build (proposal: keep `brand_settings`, deprecate `org_branding`).

---

## 2. Global Address Book / Contacts

### 2.1 Tables — what exists

| Table | Purpose | Migration |
|---|---|---|
| `public.org_contacts` | **Org-wide external directory** (subs, owners, architects). Org-scoped. | `20260305_contacts_calendar.sql` |
| `public.contact_projects` | M:N join — link a contact to many projects. | `20260305_contacts_calendar.sql` |
| `public.contact_files` | File attachments per contact (W-9, COI, etc.). | `20260305_contacts_calendar.sql` |
| `public.project_stakeholders` | **Per-project external roster** with role enum (Owner/Architect/GC/Subcontractor/Engineer/Inspector/Other). | `20260227_management_tables.sql` |
| `public.project_members` | **Auth-user membership** (Slate360 platform users assigned to project). | `20260223_create_projects.sql` |
| `public.project_collaborator_invites` | **Pending invites** to outside contributors (email/SMS/link, status, token). | `20260419120000_project_collaborator_invites.sql` |

### 2.2 `org_contacts` columns

`id`, `org_id` (FK orgs), `created_by` (FK auth.users), `name`, `email`, `phone`, `company`, `title`, `notes`, `initials` (stored generated), `color` (default `#1E3A8A`), `tags text[]`, `is_archived`, `created_at`, `updated_at`.

### 2.3 `project_stakeholders` columns

`id`, `project_id`, `name` (NOT NULL), `role` (NOT NULL, enum-via-CHECK), `company`, `email`, `phone`, `address`, `license_no`, `notes`, `status` (default `Active`), `created_at`, `updated_at`.

### 2.4 Gaps

| Need | Gap |
|---|---|
| Single picker that searches **across** `org_contacts` AND `project_stakeholders` | 🟥 No unified search endpoint or view. |
| Promote a `project_stakeholders` row to a permanent `org_contacts` entry | 🟥 No upsert helper. |
| Bulk import (CSV) | 🟥 No route. |
| Contact groups / categories beyond `tags[]` | 🟥 Only free-text array. |
| Address-book picker UI in Project intake form | 🟥 No FE. |
| `contact_projects` is unused by any API route | 🟥 Schema present, dead code path. |

---

## 3. Project Metadata & Tiers

### 3.1 `projects` table — current columns

| Column | Type | Source |
|---|---|---|
| `id` | uuid PK | `20260223_create_projects.sql` |
| `org_id` | uuid (FK orgs ON DELETE CASCADE) | base + FK in `20260423000001_projects_org_id_fk.sql` |
| `name` | text NOT NULL | base |
| `description` | text | base |
| `status` | text NOT NULL DEFAULT `'active'` | base |
| `created_by` | uuid NOT NULL | base |
| `created_at` | timestamptz NOT NULL DEFAULT `now()` | base |
| `metadata` | jsonb DEFAULT `'{}'` | `20260223_upgrade_projects.sql` |
| `report_defaults` | jsonb NOT NULL DEFAULT `'{}'` | `20260421000001_brand_and_report_defaults.sql` |

### 3.2 What's MISSING vs. UX-lead's "Lean Project Creation" requirement

| UX field | Column? | Status |
|---|---|---|
| Project Name | `name` | ✅ |
| Location / Address (for GPS bounding) | none | 🟥 lives in `metadata` jsonb only |
| Scope of Work | none | 🟥 in `report_defaults.scope_of_work` jsonb only |
| Start date / End date / Milestones | none | 🟥 separate `project_schedule` table exists; no top-level dates |
| Budget total | none | 🟥 separate `project_budget` table exists; no top-level rollup |
| Client (single primary) | none | 🟥 `report_defaults.client_name`/`client_email` are strings, not FK to a contact |
| Storage allocation override (tier) | none | 🟥 not represented |
| Tier-gated visibility flag | none | 🟥 must derive client-side from `getEntitlements()` |

### 3.3 Stakeholder mapping — exists, but split across 3 tables

- `project_members` → Slate360 platform users (auth.users) with role
- `project_stakeholders` → external parties (no auth) with role
- `project_collaborator_invites` → pending invites that may resolve into either of the above

**Recommendation for UX:** treat them as a single union in the picker UI. Backend layer should expose a `/api/projects/[id]/team` aggregator (does NOT exist today — see §4).

---

## 4. API Routes — Inventory

### 4.1 Organizations (sparse)

| Route | Methods | Notes |
|---|---|---|
| `app/api/auth/bootstrap-org/route.ts` | POST | First-run org creation. |
| `app/api/org/members/invite/route.ts` | POST | Invite new member. |
| `app/api/invites/generate/route.ts` | POST | Generate invite token/link. |
| `app/api/invites/redeem/route.ts` | POST | Redeem invite. |
| `app/api/site-walk/branding/route.ts` | GET / POST | Read/update org branding (logo, signature). |
| `app/api/site-walk/branding/settings/route.ts` | GET / POST | Additional branding settings. |

**Missing:**
- `GET/PATCH /api/org` — org profile read/write (name, address, website, brand_settings.* fields).
- `GET /api/org/members` — list all members.
- `PATCH /api/org/members/[memberId]` — change role.
- `DELETE /api/org/members/[memberId]` — remove member.

### 4.2 Contacts (basic CRUD only)

| Route | Methods | Notes |
|---|---|---|
| `app/api/contacts/route.ts` | GET / POST | List + create. |
| `app/api/contacts/[contactId]/route.ts` | GET / PATCH / DELETE | Single CRUD. |
| `app/api/contacts/[contactId]/files/route.ts` | GET / POST | Attached files. |

**Missing:**
- `GET /api/contacts/search?q=` — typeahead picker for project intake.
- `POST /api/contacts/import` — CSV / vCard import.
- `GET /api/contacts/groups` — tag/group enumeration.
- `POST /api/contacts/[id]/promote-to-stakeholder?project_id=` — copy contact into `project_stakeholders`.

### 4.3 Projects (extensive — best-covered domain)

CRUD + listing:
- `GET /api/projects`
- `POST /api/projects/create`
- `GET / PATCH / DELETE /api/projects/[projectId]`
- `GET /api/projects/sandbox`
- `POST /api/projects/view-mode`
- `GET /api/projects/summary`

Members / collaborators / stakeholders:
- `GET / DELETE /api/projects/[projectId]/collaborators`
- `POST /api/projects/[projectId]/collaborators/invite`
- `POST /api/projects/[projectId]/collaborators/[inviteId]/resend`
- `POST /api/projects/[projectId]/collaborators/[inviteId]/revoke`
- `GET / POST / PATCH / DELETE /api/projects/[projectId]/management/stakeholders`

Project metadata / management:
- `POST /api/projects/[projectId]/external-links`
- `GET /api/projects/[projectId]/recent-files`
- `GET / PATCH /api/projects/[projectId]/report-defaults`
- `POST /api/projects/[projectId]/records`
- `GET / POST /api/projects/[projectId]/daily-logs`
- `GET / POST /api/projects/[projectId]/observations`
- `GET / POST /api/projects/[projectId]/punch-list`
- `POST /api/projects/[projectId]/photo-report`
- `GET / POST / PATCH / DELETE /api/projects/[projectId]/rfis`
- `GET / POST / PATCH / DELETE /api/projects/[projectId]/submittals`
- `GET / POST / PATCH / DELETE /api/projects/[projectId]/schedule`
- `POST /api/projects/[projectId]/schedule/snapshot`
- `GET / POST / PATCH / DELETE /api/projects/[projectId]/budget`
- `POST /api/projects/[projectId]/budget/snapshot`
- `GET / POST / PATCH / DELETE /api/projects/[projectId]/management/contracts`
- `POST /api/projects/[projectId]/management/contracts/analyze`
- `POST /api/projects/[projectId]/management/reports`

**Missing:**
- `GET /api/projects/[projectId]/team` — unified roster (members ∪ stakeholders ∪ pending invites).
- `PATCH /api/projects/[projectId]/collaborators/[inviteId]` — role change.
- `POST /api/projects/[projectId]/archive` / `restore`.
- `GET /api/projects/[projectId]/zones` — needed for D4 / C5.
- `POST /api/projects/[projectId]/attach-session` — needed for A9 (post-walk attach).
- `GET /api/projects/tags` — taxonomy for G3.

---

## 5. Summary of Blocking Gaps for the UX Phase

| # | Blocker | Affected UX flow |
|---|---|---|
| 1 | No `GET/PATCH /api/org` endpoint | A1, A2 — Global Settings → Company Identity tab |
| 2 | `address`, `website` only inside `brand_settings` jsonb | A1 — form needs jsonb-edit pattern |
| 3 | No `secondary_color` / `brand_colors[]` | E10 — full theming |
| 4 | No personal-profile schema separate from org branding | A2 — Personal Profile tab |
| 5 | No contact-search / typeahead endpoint | A6 — Stakeholder multi-select |
| 6 | No promote-stakeholder-to-contact helper | A6 |
| 7 | No top-level project columns for location / scope / dates / budget | A5 — Project intake form (today must write to jsonb) |
| 8 | No unified `/api/projects/[id]/team` aggregator | A6 — Team & Stakeholders tab |
| 9 | `site_walk_sessions.project_id` is NOT NULL | A8 — "Start Walk Now" ad-hoc mode |
| 10 | No post-walk attach-session endpoint | A9 |
| 11 | Migration `20260421000001_brand_and_report_defaults.sql` likely **not applied to live Supabase** | All branding-driven flows |
| 12 | Migration `20260423000002_canvas_markup_realtime.sql` likely **not applied to live Supabase** | All canvas / realtime / markup |
| 13 | Duplicate branding source: `organizations.brand_settings` vs. `org_branding` table | Confusion risk for UI |

---

## 6. Recommended Schema Patches (proposal — NOT yet written)

```sql
-- Patch 1: First-class company identity columns (keep brand_settings as overflow)
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS brand_colors text[] DEFAULT ARRAY[]::text[];

-- Patch 2: First-class project columns
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS scope text,
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS end_date date,
  ADD COLUMN IF NOT EXISTS budget_total numeric(14,2),
  ADD COLUMN IF NOT EXISTS client_contact_id uuid REFERENCES public.org_contacts(id),
  ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;

-- Patch 3: Personal profile (per-user, separate from org)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  title text,
  phone text,
  signature_url text,
  avatar_url text,
  preferences jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Patch 4: Ad-hoc walk support
ALTER TABLE public.site_walk_sessions
  ALTER COLUMN project_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS is_ad_hoc boolean NOT NULL DEFAULT false;
```

Awaiting UX-lead confirmation before authoring the migration file.
