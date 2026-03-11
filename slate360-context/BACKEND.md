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

Tier order:
`trial < creator < model < business < enterprise`

Subscription features must use `getEntitlements()` from `lib/entitlements.ts`.

Internal routes are separate from subscription tiers:
- `/ceo` -> `canAccessCeo`
- `/market` -> `canAccessMarket`
- `/athlete360` -> `canAccessAthlete360`

Brief limits snapshot:

| Tier | Credits/mo | Storage | Hub |
|---|---:|---:|---|
| trial | 500 | 5 GB | yes |
| creator | 6,000 | 40 GB | no |
| model | 15,000 | 150 GB | no |
| business | 30,000 | 750 GB | yes |
| enterprise | 100,000 | 5 TB | yes |

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
- SlateDrop upload/download logic lives under `app/api/slatedrop/`
- folder/file behavior should respect org and project scope

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
