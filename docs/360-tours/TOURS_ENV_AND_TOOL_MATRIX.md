# 360 Tours — Env & Tool Matrix

Last Updated: 2026-04-13

## Environment Variables

| Variable | Where Referenced | Required? | Current Status | Risk if Wrong |
|----------|-----------------|-----------|----------------|---------------|
| `NEXT_PUBLIC_SUPABASE_URL` | All Supabase clients | Yes | Present in `.env` | All DB ops fail |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client-side Supabase | Yes | Present in `.env` | Auth + queries fail |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin client (API routes) | Yes | Present in `.env` | Server writes fail |
| `AWS_ACCESS_KEY_ID` | `lib/s3.ts` — scene uploads | Yes | Present in `.env` | Scene uploads fail |
| `AWS_SECRET_ACCESS_KEY` | `lib/s3.ts` — scene uploads | Yes | Present in `.env` | Scene uploads fail |
| `AWS_REGION` | `lib/s3.ts` | Yes | Present (`us-east-2`) | S3 misconfigured |
| `AWS_S3_BUCKET` | `lib/s3.ts` | Yes | Present (`slate360-storage`) | Wrong bucket |
| `NEXT_PUBLIC_SITE_URL` | Public tour share links | Yes | Present in `.env` | Share links broken |

## External Services

| Service | Purpose | Status |
|---------|---------|--------|
| Supabase | Auth, `project_tours`, `tour_scenes`, `project_tours_external_links` | **Active** |
| AWS S3 | 360 scene image storage | **Active** |

## What Can Be Verified From Repo Only

- 8 API route files exist
- 7 component files exist
- Type defs in `lib/types/tours.ts`
- Supabase migrations for 3 tables
- Page gate checks `canAccessStandaloneTourBuilder`

## What Requires Live External Access

- S3 scene upload and retrieval
- Supabase table existence and RLS policies
- Public tour viewer rendering with real 360 images
- Stripe checkout for Tour Builder subscription

## Operational Risks

1. 360 panorama images are large (10-50MB) — S3 upload timeouts possible
2. Public viewer depends on client-side 360 rendering — browser compatibility varies
3. Tour Builder is marked "Coming Soon" — must ensure checkout is blocked
