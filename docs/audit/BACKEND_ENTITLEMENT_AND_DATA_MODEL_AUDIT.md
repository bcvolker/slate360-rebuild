# Backend, Entitlement & Data Model Audit

Last Updated: 2026-05-14
Status: Read-only audit. No code, schema, or migration changes.

## Purpose

Maps every database table, migration, RLS policy, and data relationship relevant to Site Walk V1 UI decisions. Ensures the V1 preview matches real backend capabilities.

## Database Table Inventory (~55 tables)

### Organizations & Identity

| Table | Purpose | Key Columns | Status |
|---|---|---|---|
| `organizations` | Multi-tenant org container | `id`, `tier`, `credits_balance`, `org_storage_used_bytes`, `stripe_customer_id`, `brand_settings` (jsonb), `deliverable_logo_s3_key` | Active, production |
| `organization_members` | Org membership + RBAC | `org_id`, `user_id`, `role` (owner/admin/member/viewer), `permissions` (jsonb) | Active, production |
| `profiles` | User profile + approval gates | `id`, `is_beta_approved`, `account_status` (pending_approval/approved/suspended) | Active, production |
| `user_profiles` | Per-user profile (signature, avatar) | `user_id`, `full_name`, `title`, `phone`, `signature_url`, `avatar_url`, `preferences` | Active, production |
| `slate360_staff` | Internal employee access | `email`, `display_name`, `access_scope` (array) | Active, internal |
| `invitation_tokens` | Redeemable invite tokens | `token`, `invite_type` (ceo/beta/collaborator), `project_id`, `expires_at`, `max_redemptions` | Active, production |
| `org_member_app_access` | Per-user per-app seat grants | `org_id`, `user_id`, `app_key` (site_walk/tours/design_studio/content_studio) | Active, production |
| `org_feature_flags` | Per-org app entitlements | `standalone_punchwalk`, `standalone_tour_builder`, `site_walk_seat_limit/used` | Active, production |

### Billing & Subscriptions

| Table | Purpose | Key Columns | Status |
|---|---|---|---|
| `org_subscriptions` | Multi-SKU subscription rows | `org_id`, `sku` (site_walk_std/pro, tours_std/pro, etc.), `status`, `stripe_subscription_id` | Active, production |
| `org_app_subscriptions` | Per-app tier state (legacy) | `site_walk`, `tours`, `slatedrop`, `design_studio`, `content_studio`, `bundle` | Active, legacy bridge |
| `credit_balance` | Running credit balance | `org_id`, `balance_credits`, `monthly_allowance` | Active, production |
| `credit_transactions` | Credit ledger (idempotent) | `org_id`, `amount`, `idempotency_key` | Active, production |
| `collaborator_addons` | Stacked collaborator seat packs | `org_id`, `count`, `pack_lookup_key`, `stripe_subscription_id` | Active, production |
| `stripe_events` | Webhook idempotency | `id` (Stripe event ID), `type` | Active, internal |

### Projects

| Table | Purpose | Key Columns | Status |
|---|---|---|---|
| `projects` | Core project container | `id`, `org_id`, `name`, `project_type` (field/full), `status`, `budget_total`, `client_contact_id`, `is_archived`, `converted_from_id` | Active, production |
| `project_members` | Project-level membership | `project_id`, `user_id`, `role` (includes collaborator) | Active, production |
| `project_folders` | Hierarchical folder tree | `project_id`, `name`, `folder_path`, `parent_id`, `is_system`, `folder_type` | Active, production |
| `project_collaborator_invites` | Collaborator invitations | `project_id`, `email`, `phone`, `role`, `status`, `invitation_token` | Active, production |
| `project_external_links` | Shareable token-gated links | `project_id`, `folder_id`, `token`, `target_type`, `expires_at` | Active, production |
| `project_budgets` | Budget line items | `project_id`, `cost_code`, `budget_amount`, `spent_amount` | Active, higher-tier |
| `project_tasks` | Schedule/tasks | `project_id`, `name`, `start_date`, `end_date`, `status`, `percent_complete` | Active, higher-tier |
| `project_rfis` | Requests for Information | `project_id`, `subject`, `rfi_number`, `status`, `artifact_upload_id` | Active, higher-tier |
| `project_submittals` | Document submittals | `project_id`, `title`, `submittal_number`, `status` | Active, higher-tier |
| `project_punch_items` | Punch list items | `project_id`, `number`, `title`, `status`, `priority` | Active, production |
| `project_daily_logs` | Daily field logs | `project_id`, `log_date`, `summary`, `weather_*`, `crew_counts` | Active, higher-tier |
| `project_stakeholders` | Project directory | `project_id`, `name`, `role`, `company`, `email` | Active, production |
| `project_contracts` | Contract tracking | `project_id`, `title`, `contract_type`, `contract_value` | Active, higher-tier |
| `project_observations` | Site observations | `project_id`, `title`, `sentiment`, `category`, `priority` | Active, production |
| `project_activity_log` | Audit trail | `project_id`, `action`, `entity_type`, `entity_id` | Active, production |
| `project_notifications` | In-app notifications | `user_id`, `project_id`, `title`, `is_read`, `link_path` | Active, production |

### Site Walk

| Table | Purpose | Key Columns | Status |
|---|---|---|---|
| `site_walk_sessions` | Walk sessions | `id`, `org_id`, `project_id` (nullable), `title`, `status`, `session_type`, `sync_state`, `is_ad_hoc` | Active, production |
| `site_walk_items` | Captured items | `id`, `session_id`, `item_type`, `title`, `s3_key`, `markup_data`, `capture_mode`, `tags`, `trade`, `priority`, `item_status` | Active, production |
| `site_walk_plans` | Legacy session-scoped plans | `id`, `session_id`, `s3_key`, `plan_set_id`, `plan_sheet_id` | Active, legacy |
| `site_walk_plan_sets` | Project-level plan sets (multi-page PDF) | `id`, `project_id`, `title`, `source_s3_key`, `page_count`, `processing_status` | Active, production |
| `site_walk_plan_sheets` | Individual sheets from plan set | `id`, `plan_set_id`, `sheet_number`, `sheet_name`, `image_s3_key`, `tile_manifest` | Active, production |
| `site_walk_session_plan_sheets` | Join: sessions ↔ plan sheets | `session_id`, `plan_sheet_id`, `is_primary` | Active, production |
| `site_walk_pins` | Pins on plans | `id`, `plan_id`, `item_id`, `x_pct`, `y_pct`, `pin_number`, `pin_color`, `pin_status`, `plan_sheet_id` | Active, production |
| `site_walk_templates` | Reusable checklists | `id`, `org_id`, `title`, `template_type`, `checklist_items` | Active, production |
| `site_walk_comments` | Threaded comments | `session_id`, `item_id`, `parent_id`, `body`, `is_escalation` | Active, production |
| `site_walk_assignments` | Task assignments | `session_id`, `item_id`, `assigned_to`, `priority`, `status`, `due_date` | Active, production |
| `site_walk_deliverables` | Compiled deliverables | `id`, `session_id`, `deliverable_type` (22 types), `status`, `content` (jsonb), `share_token`, `output_mode` | Active, production |
| `site_walk_deliverable_blocks` | Block-editor rows | `deliverable_id`, `block_type`, `content`, `sort_order` | Active, partial |
| `site_walk_deliverable_assets` | Deliverable media assets | `deliverable_id`, `source_item_id`, `s3_key`, `asset_type` | Active, partial |
| `site_walk_deliverable_views` | View tracking | `deliverable_id`, `viewer_ip`, `viewed_at` | Active, production |
| `site_walk_deliverable_snapshots` | Immutable history | `deliverable_id`, `snapshot_content` | Active, production |
| `site_walk_activity_log` | Audit log | `session_id`, `event_type`, `before_state`, `after_state` | Active, production |
| `site_walk_read_receipts` | Read tracking | `subject_type`, `subject_id`, `user_id` | Active, production |
| `site_walk_usage_events` | Usage metering | `event_type`, `quantity`, `unit` | Active, production |
| `site_walk_project_capture_settings` | Per-project capture config | `project_id`, `trade_options` | Active, production |
| `plan_raster_jobs` | PDF rasterization queue | `plan_set_id`, `status`, `attempts` | Active, production |

### File Management (SlateDrop)

| Table | Purpose | Key Columns | Status |
|---|---|---|---|
| `slatedrop_uploads` | File uploads (S3-backed) | `id`, `file_name`, `s3_key`, `org_id`, `folder_id`, `status`, `unified_file_id` | Active, production |
| `unified_files` | Cross-app file registry | `id`, `project_id`, `name`, `storage_key`, `source`, `parent_folder_id` | Active, production |
| `slate_drop_links` | Shareable file links | `file_id`, `token`, `role` (view/download), `expires_at` | Active, production |

### Contacts & Calendar

| Table | Purpose | Key Columns | Status |
|---|---|---|---|
| `org_contacts` | Contact book per org | `org_id`, `name`, `email`, `phone`, `company`, `tags` | Active, production |
| `contact_projects` | Contacts ↔ projects | `contact_id`, `project_id` | Active, production |
| `contact_files` | Files attached to contacts | `contact_id`, `s3_key`, `file_name` | Active, production |
| `calendar_events` | Calendar events | `org_id`, `project_id`, `title`, `date`, `color` | Active, production |

### Tours / Design Studio / Content Studio

| Table | Purpose | Status |
|---|---|---|
| `project_tours` | 360 tour container | Active, foundational |
| `tour_scenes` | Panorama scenes | Active, foundational |
| `project_models` | 3D design models | Active, foundational |
| `model_files` | Model file attachments | Active, foundational |
| `media_collections` | Content collections | Active, foundational |
| `media_assets` | Media files | Active, foundational |

### Viewer & Sharing

| Table | Purpose | Status |
|---|---|---|
| `deliverable_access_tokens` | Token-gated public access | Active, production |
| `viewer_comments` | Public comments on deliverables | Active, production |

### Operations

| Table | Purpose | Status |
|---|---|---|
| `beta_feedback` | Structured feedback | Active, production |
| `deliverable_cleanup_queue` | Background job queue | Active, internal |

## RLS Summary

- Every table has RLS enabled.
- Primary pattern: org-member-scoped (most tables).
- Self-scoped: notifications, user profiles.
- Service-role only: billing writes, staff, cleanup.
- Public/token-gated: shared deliverables, external links.
- Helper functions: `user_is_org_member()`, `user_project_role()`, `user_can_access_project()`.

## Key Architectural Facts

1. **No "Worksite" table exists.** Worksites map to `projects` with `project_type = 'field'`. Full Projects use `project_type = 'full'`.
2. **Field projects are available to all tiers** (`canCreateFieldProject()` always returns true). Full projects require business/enterprise.
3. **"punchwalk" is the legacy name for Site Walk** in `org_feature_flags.standalone_punchwalk`.
4. **Three billing models coexist**: legacy tier, modular per-app, and SKU cost model. `resolveOrgEntitlements()` merges them.
5. **Plan sets are project-scoped**, plan sheets are plan-set-scoped. Sessions link to sheets via `site_walk_session_plan_sheets`.
6. **Deliverables have 22 types** — far beyond just "reports." Output modes include hosted, pdf, portal, presentation, spreadsheet, zip, email, interactive_link.
7. **Collaborator model is fully built**: invite flow, seat counting, limits per tier, per-project access, cross-org (org-less collaborators).
8. **SlateDrop auto-provisions 17 system folders** per project including Plans, Photos, Deliverables.
9. **Realtime enabled** on: site_walk_items, site_walk_pins, site_walk_comments, site_walk_plan_sheets.

## V1 UI Implications

| Backend Fact | V1 UI Impact |
|---|---|
| No Worksite table — uses `projects` with `project_type` | V1 shows "Worksites" for field projects, "Projects" for full projects. Same API. |
| `canCreateFieldProject()` always true | All tiers can create worksites. |
| `canCreateFullProject()` requires business+ | Full project creation is gated. |
| 22 deliverable types | Label must be "Deliverables," not "Reports." |
| Collaborator model exists | V1 can show collaborator invites per worksite/project. |
| SlateDrop auto-folders | V1 can show files grouped by auto-folder. |
| Plan sets are project-scoped | Plans belong under the worksite/project, not as a standalone "Plan Room." |
| `org_member_app_access` | Per-user app seat assignment exists for gating. |
