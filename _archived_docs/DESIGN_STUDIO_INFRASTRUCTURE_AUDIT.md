# Design Studio: Deep Infrastructure Audit Report

Generated: February 25, 2026

---

## Section 1 — Testing Infrastructure

| Item | Status |
|---|---|
| Playwright | **MISSING** |
| Cypress | **MISSING** |
| Vitest / Jest | **MISSING** |
| Test directories (`__tests__/`, `test/`, `e2e/`) | **MISSING** |
| `package.json` test script | **MISSING** (`"test": "echo …"`) |

**Conclusion: MISSING.** No test framework, test runner, test files, or test configuration exists anywhere in the repository. The `test` script in `package.json` is a no-op placeholder. Any end-to-end or unit testing for Design Studio must be bootstrapped from scratch.

---

## Section 2 — DB Schema Inventory

### 2a. Migration Files in Repo (14 files)

Located in `supabase/migrations/`:

| Migration | Tables Created |
|---|---|
| `20250131000000_initial_schema` | profiles, organizations, org_members |
| `20250131000001_projects` | projects |
| `20250215000000_project_tags` | tags, project_tags |
| `20250224000000_slatedrop_*` series (5 files) | slatedrop_uploads, slatedrop_download_tokens, slatedrop_upload_feedback, notification_preferences, notifications, project_external_links, project_external_link_responses, project_external_response_links, project_core_tools |
| `20250224170000_market_bot_runtime_state` | market_bot_runtime_state |
| `20250224093000_market_trades` | market_trades |

**Only 17 CREATE TABLE statements exist across 14 migration files.**

### 2b. Live Supabase — 118 Tables

The live database (`hadnfcenpcfaeclczsmm`) has **118 tables**, far exceeding the 14 migration files. Many come from a previous codebase iteration. Key tables for Design Studio:

#### Design Studio Tables (all EXIST in live DB)

**`design_studio_projects`** (22 columns):
```
id (uuid), org_id (uuid), name (text), description (text),
model_url (text), thumbnail_url (text), canvas_state (jsonb),
scene_graph (jsonb), material_overrides (jsonb), lighting_config (jsonb),
camera_presets (jsonb), environment_config (jsonb), status (text),
is_template (boolean), template_category (text), source_project_id (uuid),
version_count (integer), current_version_id (uuid), created_by (uuid),
created_at (timestamptz), updated_at (timestamptz), deleted_at (timestamptz)
```

**`design_studio_versions`** (7 columns):
```
id, project_id, version_number, snapshot (jsonb), notes, created_by, created_at
```

**`design_studio_assets`** (11 columns):
```
id, project_id, asset_type, name, url, thumbnail_url, file_size,
metadata (jsonb), uploaded_by, created_at, deleted_at
```

**`design_studio_annotations`** (9 columns):
```
id, project_id, version_id, author_id, content, position (jsonb),
camera_state (jsonb), resolved, created_at
```

**`design_studio_exports`** (11 columns):
```
id, project_id, version_id, format, quality_preset,
output_url, file_size, credits_used (integer),
requested_by, started_at, completed_at
```

**`design_studio_sessions`** (9 columns):
```
id, project_id, user_id, role, cursor_state (jsonb),
selection_state (jsonb), is_active (boolean), joined_at, last_heartbeat_at
```

#### Credit Tables (all EXIST in live DB)

**`credits`** (10 columns):
```
id, org_id (uuid), balance, monthly_allocation, last_reset_at,
purchased_balance, monthly_credits_used, monthly_reset_at,
created_at, updated_at
```

**`credit_ledger`** (13 columns):
```
id, org_id, delta (integer), running_balance (integer), reason (text),
category (text), reference_type (text), reference_id (uuid),
credit_source (text), performed_by (uuid), metadata (jsonb),
created_at, updated_at
```

**`credit_purchases`** (12 columns):
```
id, org_id, stripe_session_id, stripe_payment_intent_id,
pack_id, compute_units (integer), amount_cents (integer),
currency, status, purchased_by (uuid), created_at, updated_at
```

#### Job Tables (all EXIST in live DB)

**`model_processing_jobs`** (24 columns):
```
id, org_id, project_id, job_type, source_url, source_format,
target_formats (jsonb), parameters (jsonb), status, progress (integer),
outputs (jsonb), thumbnail_url, error_message, credits_estimated,
credits_used, worker_id, priority (integer), queue_name,
started_at, completed_at, retry_count, max_retries,
created_at, updated_at
```

**`processing_jobs`** (34 columns):
```
Includes: credits_estimated, credits_used, credits_reserved,
progress_percent, worker_id, result_urls (jsonb),
artifact_manifest (jsonb), priority, queue_name, etc.
```

**`print_jobs`** (21 columns):
```
id, org_id, design_project_id, status, material, color,
infill_percent, support_material, layer_height, print_orientation,
gcode_url, estimated_time_minutes, actual_time_minutes,
estimated_material_grams, actual_material_grams, printer_id,
credits_used, started_at, completed_at, created_at, updated_at
```

**`background_jobs`** (13 columns):
```
id, org_id, job_type, payload (jsonb), status, result (jsonb),
error, attempts, max_attempts, scheduled_for, started_at,
completed_at, created_at
```

#### Supporting Tables (all EXIST in live DB)

**`supported_formats`** (14 columns):
```
extension, mime_type, category, display_name, description,
can_import, can_export, requires_processing, max_file_size_mb,
processing_credit_cost (numeric), is_active, metadata (jsonb), etc.
```

**`tier_limits`** (14 columns):
```
tier_name, display_name, monthly_price_cents, annual_price_cents,
storage_limit_bytes, monthly_compute_units, seats_limit,
projects_limit, features (jsonb), is_active, display_order, etc.
```

**`org_credit_summary`** (9 columns — likely a VIEW):
```
org_id, monthly_allocation, monthly_credits_used, monthly_remaining,
purchased_balance, total_available, monthly_reset_at, last_reset_at, updated_at
```

---

## Section 3 — Credits Plumbing

### 3a. Dual Source of Truth (problem)

Credits are currently read from **two places**:

1. **`credits` table** — Has `balance`, `purchased_balance`, `monthly_credits_used`
2. **`organizations` table** — Has `credits_balance` (integer)

In `app/api/account/overview/route.ts` (lines 140-170):
```ts
const { data: creditData } = await supabase
  .from("credits")
  .select("purchased_balance")
  .eq("org_id", orgId)
  .maybeSingle();

const { data: orgCredits } = await supabase
  .from("organizations")
  .select("credits_balance")
  .eq("id", orgId)
  .single();
```

### 3b. Stripe Webhook → Credit Purchase Flow

In `app/api/stripe/webhook/route.ts` (lines 45-90):
```ts
if (session.mode === "payment" && meta.kind === "credits") {
  const orgId = meta.org_id;
  const credits = parseInt(meta.credits, 10);
  await addPurchasedCredits(orgId, credits);
}
```

`addPurchasedCredits()` (in `lib/billing-server.ts`) reads `organizations.credits_balance` and adds to it — **not** using the `credits` table or `credit_ledger`.

### 3c. RPC Functions in Live DB (32 total)

Credit-specific RPCs:

| RPC | Purpose |
|---|---|
| `consume_credits` | Deduct credits (checks balance, writes ledger) |
| `add_purchased_credits` | Add purchased credits to org |
| `get_credit_balance` | Returns current credit balance |
| `get_credit_breakdown` | Monthly + purchased breakdown |
| `record_credit_usage` | Write usage to ledger |
| `reset_monthly_credits` | Monthly reset logic |
| `add_credits` | General credit addition |

Other notable RPCs: `check_seat_availability`, `get_effective_limits`, `get_storage_used`, `get_user_org_ids`, `get_daily_upload_count`, `increment_daily_upload_count`, `log_project_activity`.

### 3d. Credit Deduction Gap

**MISSING in current codebase:** No Next.js API route calls `consume_credits` RPC. The DB-level function exists, but no application code wires "start a Design Studio export" → "deduct N credits via RPC" → "record in ledger". The Stripe webhook *adds* credits, but nothing *spends* them.

Credit pack definitions in `lib/billing.ts`:
```ts
CREDIT_PACKS: { starter: 5000 credits/$9.99, growth: 15000/$24.99, pro: 50000/$69.99 }
```

Cost data in `supported_formats.processing_credit_cost` and `design_studio_exports.credits_used` columns exist but have no application code consuming them.

---

## Section 4 — Job / Queue Infrastructure

### 4a. Package Dependencies

| Dependency | Status |
|---|---|
| BullMQ | **MISSING** from `package.json` |
| Redis / ioredis | **MISSING** from `package.json` |
| AWS SQS SDK | **MISSING** from `package.json` |
| Any queue library | **MISSING** |

### 4b. Worker Code

| Item | Status |
|---|---|
| `scripts/` or `workers/` directory | **MISSING** |
| Any `.worker.ts` files | **MISSING** |
| Any process polling code | **MISSING** |

### 4c. GPU Worker Deployment Guide (spec only)

`slate360-context/GPU_WORKER_DEPLOYMENT.md` (743 lines) describes:

- **Architecture:** Next.js API → Redis/Upstash queue → BullMQ worker on EC2 g4dn.xlarge
- **Pipeline tools:** COLMAP, OpenMVS, PDAL, Entwine, gltf-pipeline, py3dtiles
- **Job flow:** API creates `model_processing_jobs` row → pushes to Redis queue → worker picks up, processes, uploads outputs to S3, updates row
- **Status:** This is a **planning document only**. No code in the repo implements this.

### 4d. Job Tables Ready

The four job tables (`model_processing_jobs`, `processing_jobs`, `print_jobs`, `background_jobs`) have complete schemas with `status`, `progress`, `worker_id`, `credits_used`, `started_at`/`completed_at` fields — ready for use once API routes are wired.

---

## Section 5 — Upload Pipelines

### 5a. SlateDrop (primary upload system)

14 API routes under `app/api/slatedrop/`:
```
upload/route.ts          — multipart upload → S3
download/route.ts        — signed URL generation
files/route.ts           — list files for a folder
folders/route.ts         — list/create folders
rename/route.ts          — rename files
delete/route.ts          — delete from S3 + DB
move/route.ts            — move between folders
feedback/route.ts        — upload feedback
```

**S3 key format:** `orgs/{namespace}/{folderId}/{timestamp}_{sanitizedFilename}`

Two key builder functions:
- `lib/s3.ts` → `buildS3Key(namespace, folderId, filename)`
- `lib/slatedrop/storage.ts` → `buildCanonicalS3Key(orgId, projectId, folderId, filename)`

File metadata stored in `slatedrop_uploads` table.

### 5b. External Upload Portal

`app/upload/[token]/page.tsx` — public upload page using `project_external_links` tokens. Validates token, then uploads to same S3 path.

### 5c. Design Studio Upload Path

**MISSING.** No `/api/design-studio/upload` route exists. Design Studio will need its own upload route that:
1. Accepts 3D model files (glTF, OBJ, FBX, PLY, etc.)
2. Writes to S3 under a Design Studio-specific prefix
3. Creates a `design_studio_assets` row
4. Optionally triggers a `model_processing_jobs` entry

Could reuse `lib/s3.ts` S3Client + BUCKET, but needs a new key schema and API route.

---

## Section 6 — Readiness Summary

### Can Reuse As-Is

| Component | Location | Notes |
|---|---|---|
| S3 client + bucket | `lib/s3.ts` | Same bucket, new key prefix |
| Supabase auth helpers | `lib/supabase/server.ts` | `createClient()` |
| Entitlements gate | `lib/entitlements.ts` | `getEntitlements(tier)` |
| Stripe credit purchase | `app/api/billing/credits/checkout/route.ts` | Already works |
| 6 Design Studio DB tables | Live Supabase | Full schemas, ready to query |
| 4 Job tracking tables | Live Supabase | Schemas include all needed fields |
| Credit RPCs | Live Supabase | `consume_credits`, `get_credit_balance`, etc. |
| `supported_formats` table | Live Supabase | Format whitelist with credit costs |
| `tier_limits` table | Live Supabase | Per-tier limits + features JSONB |
| `org_credit_summary` view | Live Supabase | Pre-computed credit breakdown |
| UI component system | shadcn/ui + Tailwind 4 | Dashboard styling patterns exist |

### Must Build

| Component | Priority | Complexity | Notes |
|---|---|---|---|
| **Design Studio client component** | P0 | High | Replace `TabWireframe` in project detail — needs 3D viewer, scene graph, toolbars |
| **API routes** (`/api/design-studio/*`) | P0 | Medium | CRUD for projects, versions, assets, annotations, exports |
| **Route + middleware wiring** | P0 | Low | Add `/features/design-studio` route, update `middleware.ts`, remove redirect in `next.config.ts` |
| **Credit deduction in API** | P0 | Low | Call `consume_credits` RPC when exports/processing start |
| **Model upload route** | P1 | Medium | Accept 3D files → S3 → `design_studio_assets` row |
| **Job submission API** | P1 | Medium | Create `model_processing_jobs` row with status="queued" |
| **Test framework bootstrap** | P2 | Low | Install Vitest + Playwright, add CI config |
| **GPU Worker** | P3 | High | BullMQ + Redis + EC2 — can defer; jobs stay "queued" until worker exists |

### Blockers to Resolve Before Building

1. **Redirect in `next.config.ts`** — Design Studio has a redirect that must be removed or pointed at the new route.
2. **Middleware allowlist** — `middleware.ts` must include Design Studio paths.
3. **Dual credit source of truth** — `organizations.credits_balance` vs `credits` table. Must pick one (recommend `credits` table + RPCs) and migrate `addPurchasedCredits()` in `lib/billing-server.ts` to use the RPC.
4. **Missing migration files** — The 6 `design_studio_*` tables, job tables, credit tables, `supported_formats`, and `tier_limits` exist in live DB but have **no migration files in the repo**. Should add migration snapshots so the repo stays deployable.

### Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| 118 tables from old codebase — unknown RLS policies | Medium | Audit RLS on `design_studio_*` tables before wiring |
| No tests — regressions possible | Medium | Bootstrap Vitest for API routes, Playwright for E2E |
| No GPU worker — exports/processing can't complete | Low | Jobs queue with status="queued"; UI shows pending state |
| Credit dual source of truth | High | Resolve before shipping credit-consuming features |

---

**Bottom line:** The database layer is surprisingly complete — all Design Studio tables, job tables, credit RPCs, and format metadata already exist in the live Supabase instance. What's missing is entirely on the **application side**: API routes, the client component, credit deduction wiring, and upload handling. The heaviest lift is the 3D viewer/editor UI itself; the backend plumbing is mostly "connect existing DB tables to new Next.js routes."

### Additional Findings

- **`supported_formats`** has `processing_credit_cost` per format — this is your pricing table for Design Studio operations.
- **`tier_limits`** has `features` JSONB — likely contains per-tier feature flags you can check for Design Studio access.
- **`org_credit_summary`** is a pre-computed view giving `monthly_remaining` + `purchased_balance` + `total_available` in one query — use this instead of manually computing balances.
