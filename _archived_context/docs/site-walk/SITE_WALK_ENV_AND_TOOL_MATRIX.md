# Site Walk — Env & Tool Matrix

Last Updated: 2026-04-13

## Environment Variables

| Variable | Where Referenced | Required? | Current Status | Risk if Wrong |
|----------|-----------------|-----------|----------------|---------------|
| `NEXT_PUBLIC_SUPABASE_URL` | All Supabase clients | Yes | Present in `.env` | All DB ops fail |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client-side Supabase | Yes | Present in `.env` | Auth + client queries fail |
| `SUPABASE_SERVICE_ROLE_KEY` | `lib/supabase/admin.ts` (API routes) | Yes | Present in `.env` | Server-side DB writes fail |
| `AWS_ACCESS_KEY_ID` | `lib/s3.ts`, `lib/s3-utils.ts` | Yes | Present in `.env` | Photo/video uploads fail |
| `AWS_SECRET_ACCESS_KEY` | `lib/s3.ts`, `lib/s3-utils.ts` | Yes | Present in `.env` | Photo/video uploads fail |
| `AWS_REGION` | `lib/s3.ts` | Yes | Present in `.env` (`us-east-2`) | S3 requests misrouted |
| `AWS_S3_BUCKET` | `lib/s3.ts` | Yes | Present in `.env` (`slate360-storage`) | Uploads go to wrong bucket |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Map/location components | For GPS features | Present in `.env` | Map views fail, GPS tagging may still work |
| `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` | Map components | For styled maps | Present in `.env` | Falls back to default map style |
| `EMAIL_FROM` | `lib/email.ts` | For deliverable sharing | Present in `.env` | Email sends fail |
| `RESEND_API_KEY` | `lib/email.ts` | For email delivery | Present in `.env` | Email sends fail |
| `NEXT_PUBLIC_SITE_URL` | Deliverable share links | Yes | Present in `.env` | Share links point to wrong domain |

## External Services

| Service | Purpose | Access Method | Status |
|---------|---------|---------------|--------|
| Supabase | Auth, DB (sessions, items, deliverables, plans, templates, pins, comments, assignments) | REST API via `@supabase/supabase-js` | **Active** — project `hadnfcenpcfaeclczsmm` |
| AWS S3 | Photo/video/file storage | `@aws-sdk/client-s3` + presigned URLs | **Active** — bucket `slate360-storage`, region `us-east-2` |
| Google Maps | GPS tagging, map views | Client-side JS API | **Active** — API key present |
| Resend | Email delivery for shares | REST API | **Active** — API key present |

## What Can Be Verified From Repo Only

- All 31 API route files exist and export handlers
- All 18 component files exist
- Type definitions in `lib/types/site-walk.ts` and `lib/types/site-walk-ops.ts`
- Supabase migration files exist for all 10 tables
- Route guards reference `canAccessStandalonePunchwalk`

## What Requires Live External Access

- Supabase table existence and RLS policies (need Supabase dashboard or CLI)
- S3 bucket permissions and CORS config
- Google Maps API key validity and quota
- Email delivery (Resend account status)
- Stripe checkout flow for Site Walk subscriptions

## Operational Risks

1. **API routes use `withAuth()` not `withAppAuth()`** — any authenticated user can hit Site Walk APIs without a subscription (P0 security gap identified in 2026-04-13 audit)
2. S3 presigned URL expiry — if configured too short, large uploads may fail
3. GPS/geolocation requires HTTPS and user permission — PWA/mobile may need special handling
4. No offline queue for Site Walk (exists in `lib/offline-queue.ts` but integration status unclear)
