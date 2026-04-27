# Slate360 — Backend Quick Guide

Last Updated: 2026-03-11
Purpose: short operational guide for auth, billing, storage, envs, and backend-safe development. Use this first. Pull deep references only when needed.

## Service Map

- App: Next.js 15, React 19, TypeScript 5
- Auth + DB: Supabase
- File storage: AWS S3 (`slate360-storage`, `us-east-2`)
- Billing: Stripe
- Email: Resend
- Deploy + cron: Vercel
- Market live execution: Polymarket CLOB + Polygon wallet path

## Environment Sources

- Local/dev runtime secrets: `.env.local`
- MCP/service access tokens: shell env or Codespaces secrets, not `.env.local`
- Stripe secrets: Vercel env only
- Production overrides: Vercel env

## Auth And Org Bootstrap

Signup/bootstrap flow:

```text
signup
-> create profile
-> create organization
-> create owner membership
-> provision system folders in project_folders
-> grant trial credits
```

Fallbacks already exist in code:
- `app/auth/callback/route.ts`
- `app/dashboard/page.tsx`
- `app/api/auth/bootstrap-org/route.ts`

Key auth files:
- `middleware.ts`
- `lib/server/org-context.ts`
- `lib/server/org-bootstrap.ts`
- `lib/server/api-auth.ts`
- `lib/server/api-response.ts`

## Supabase Usage Rules

Use exactly one client per context:

```typescript
import { createClient } from "@/lib/supabase/client";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
```

Rules:
- Browser client only in client components.
- Server client for server components and normal API routes.
- Admin client only for privileged server-only operations.
- RLS always anchors through `organization_members`.

## Tier And Entitlements Snapshot

Current tier order:
`trial < standard < business < enterprise`

Legacy tier names (`creator`, `model`) are mapped to `standard` at runtime via `LEGACY_TIER_MAP`.

Subscription features must use `getEntitlements()` from `lib/entitlements.ts`.

Internal routes are separate from subscription tiers:
- `/ceo` -> `canAccessCeo` (platform-admin, not entitlements)
- `/market` -> `canAccessMarket` (internal)
- `/athlete360` -> `canAccessAthlete360` (internal)

### Platform Limits (tier-based)

| Tier | Credits/mo | Storage | Seats | Hub | Analytics | Reports | White-label |
|---|---:|---:|---:|---|---|---|---|
| trial | 250 | 2 GB | 1 | yes | no | no | no |
| standard | 5,000 | 25 GB | 3 | yes | no | no | no |
| business | 25,000 | 100 GB | 15 | yes | yes | yes | no |
| enterprise | 100,000 | 500 GB | 999 | yes | yes | yes | yes |

### App Access Model (purchase-based)

Apps are **not** included in platform tiers. Access requires:
1. **Standalone purchase** — `org_feature_flags.standalone_{app}` set by Stripe webhook
2. **Modular subscription** — `org_app_subscriptions.{app}` with basic/pro tier
3. **Bundle subscription** — `org_app_subscriptions.bundle` widens access to bundled apps

Subscribing to any app unlocks the Slate360 platform (project creation, command center).

| App | Flag Column | Stripe Product | Price |
|---|---|---|---|
| Site Walk | `standalone_punchwalk` | Slate360 PunchWalk | $49/mo |
| Tour Builder | `standalone_tour_builder` | Slate360 Tour Builder | $49/mo |
| Design Studio | `standalone_design_studio` | Slate360 Design Studio | $49/mo |
| Content Studio | `standalone_content_studio` | Slate360 Content Studio | $49/mo |

Tier-based fields (`canAccessDesignStudio`, `canAccessTourBuilder`, etc.) control **dashboard visibility** — what apps a user can discover. Standalone fields (`canAccessStandalone*`) control **activation** — whether the user can enter the app.

The full entitlement resolution chain:
```
organizations.tier → TIER_MAP (platform limits + visibility)
org_feature_flags → standalone flags (app activation)
org_app_subscriptions → modular subscriptions (widen standalone access)
→ getEntitlements() merges all three
```

## Billing And Credits

Stripe flow:
- `/plans` -> `POST /api/billing/checkout`
- Stripe webhook -> `POST /api/stripe/webhook`
- customer management -> `POST /api/billing/portal`

Credit rules:
- monthly credits are consumed before purchased credits
- credit logic lives in Supabase RPCs plus `lib/billing.ts` / `lib/billing-server.ts`
- low-credit UI should stay subtle, not modal-heavy

Key files:
- `lib/stripe.ts`
- `lib/billing.ts`
- `lib/billing-server.ts`
- `app/api/billing/`
- `app/api/stripe/webhook/route.ts`

## Storage And Files

Storage rules:
- use `project_folders`, not `file_folders`
- S3 client lives in `lib/s3.ts`
- `lib/s3.ts` now accepts either AWS envs or Cloudflare R2 envs: `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, optional `R2_REGION` (`auto` default), and either `R2_ENDPOINT` or `CLOUDFLARE_ACCOUNT_ID` to derive the R2 endpoint automatically
- use `npm run diag:storage-runtime` to confirm which provider the runtime selected and whether the configured bucket is reachable
- use `npm run diag:storage-runtime:write` for a temporary put/delete probe when validating upload permissions on a new R2 or S3 credential set
- use `npm run diag:storage-runtime:presign` to validate the presigned URL path used by upload/download flows
- `supabase/migrations/20260418101500_track_unified_files_and_slatedrop_bridge.sql` now tracks the live `unified_files` table in source control and adds `slatedrop_uploads.unified_file_id` so SlateDrop sharing can satisfy the live `slate_drop_links.file_id -> unified_files(id)` foreign key without breaking the current upload model
- SlateDrop upload/download logic lives under `app/api/slatedrop/`
- folder/file behavior should respect org and project scope

## Site Walk Backend Foundation

Applied 2026-04-27 to Supabase project `hadnfcenpcfaeclczsmm` and tracked in `supabase/migrations/2026042709*.sql`:
- Project-aware access helpers now allow both `organization_members` and project-scoped `project_members` collaborators across Site Walk RLS.
- Site Walk core tables now carry/backfill `project_id` where needed for collaborator-safe policies.
- Master Plan Room schema exists: `site_walk_plan_sets`, `site_walk_plan_sheets`, and `site_walk_session_plan_sheets`.
- Offline-first support exists via client IDs, sync/upload state fields, draft pins, and `site_walk_offline_mutations`.
- Non-PDF outputs exist via expanded deliverable types, output configs, `site_walk_deliverable_blocks`, and `site_walk_portal_boards`.
- Audit/read infrastructure exists via `site_walk_activity_log`, `site_walk_read_receipts`, status-change triggers, and realtime publication coverage.
- Usage/margin metering exists via `site_walk_usage_events`, `site_walk_usage_monthly`, and `record_site_walk_usage()`.

Validation notes:
- The migrations were schema-tested in a remote transaction and then applied directly with `psql` using the Codespace `POSTGRES_PASSWORD` because `supabase db push --dry-run` is blocked by old remote migration-history drift and the root `.env` has a parse issue.
- Post-apply checks confirmed 9 new tables, 9 RLS-enabled new tables, 11 realtime Site Walk tables, and 6 new migration-history rows.
- Future Site Walk APIs should call `user_can_access_project()` / `user_can_manage_project()` concepts through server auth helpers where possible, not reintroduce raw org-only checks.

## Market Backend Notes

Market-specific truths:
- route gate is `canAccessMarket`
- scheduler cron path is `/api/market/scheduler/tick`
- live trading requires Polymarket envs plus `NEXT_PUBLIC_POLYMARKET_SPENDER`
- paper mode should be verified before live mode

Use these when touching Market runtime:
- `npm run diag:market-runtime`
- `npm run guard:clob-contract`
- `slate360-context/dashboard-tabs/market-robot/RUNTIME_CHECKLIST.md`

## Build And Release Process

During build work or before pushing shared/backend changes:

```bash
npm run typecheck
bash scripts/check-file-size.sh
npm run build
npm run verify:release
```

Also run when relevant:
- `npm run guard:architecture` for architecture-sensitive changes
- `npm run guard:build-stability` for deployment/build-risk work
- `npm run diag:market-runtime` for Market/runtime changes

## Standalone Apps Foundation

Standalone apps should reuse the same foundation:
- shared auth
- shared Stripe billing
- shared entitlements model
- shared SlateDrop/S3 storage backbone

Planned direction:
- add `org_feature_flags`
- merge tier entitlements with app-specific flags
- avoid any second auth or billing system

## Deep References

Use these only when the short guide is not enough:
- `_archived_docs/BACKEND_ACCESS.md`
- `slate360-context/SUPABASE_EMAIL_TEMPLATES.md`
- `docs/MCP-TOOLS-GUIDE.md`
- `slate360-context/APP_ECOSYSTEM_EXECUTION_PLAN.md`
