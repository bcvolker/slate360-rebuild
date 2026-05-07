# SlateDrop — Env & Tool Matrix

Last Updated: 2026-04-13

## Environment Variables

| Variable | Where Referenced | Required? | Status | Risk if Wrong |
|----------|-----------------|-----------|--------|---------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase client | Yes | Present in `.env` | DB ops fail |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client-side Supabase | Yes | Present in `.env` | Auth fails |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin client | Yes | Present in `.env` | Server writes fail |
| `AWS_ACCESS_KEY_ID` | `lib/s3.ts` — presigned URLs | Yes | Present in `.env` | Uploads/downloads fail |
| `AWS_SECRET_ACCESS_KEY` | `lib/s3.ts` | Yes | Present in `.env` | S3 ops fail |
| `AWS_REGION` | `lib/s3.ts` | Yes | Present (`us-east-2`) | Misrouted requests |
| `SLATEDROP_S3_BUCKET` | File storage bucket | Yes | Present in `.env` | Files go to wrong bucket |
| `NEXT_PUBLIC_SITE_URL` | Share link generation | Yes | Present in `.env` | Broken share URLs |
| `EMAIL_FROM` | Secure send emails | For sharing | Present in `.env` | Send emails fail |
| `RESEND_API_KEY` | Email delivery | For sharing | Present in `.env` | No email delivery |

## External Services

| Service | Purpose | Status |
|---------|---------|--------|
| Supabase | Auth, `project_folders`, `slatedrop_uploads`, `slatedrop_links`, `slatedrop_deleted_at` | **Active** |
| AWS S3 | File storage (presigned upload/download URLs) | **Active** — bucket `slate360-storage` |
| Resend | Email delivery for secure sends | **Active** |

## Operational Risks

1. S3 presigned URL expiry — large file uploads may timeout
2. No virus/malware scanning on uploads
3. Storage quota tracking may not be enforced (28-line implementation)
4. ZIP generation for large folders may timeout on serverless
5. Share links have no expiry by default — access persists indefinitely
