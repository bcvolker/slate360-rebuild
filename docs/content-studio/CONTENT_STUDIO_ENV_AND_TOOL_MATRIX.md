# Content Studio — Env & Tool Matrix

Last Updated: 2026-04-13

## Environment Variables

| Variable | Where Referenced | Required? | Current Status | Risk if Wrong |
|----------|-----------------|-----------|----------------|---------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase client | Yes | Present in `.env` | DB ops fail |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client-side Supabase | Yes | Present in `.env` | Auth fails |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin client | Yes | Present in `.env` | Server writes fail |
| `AWS_ACCESS_KEY_ID` | S3 asset uploads | Yes | Present in `.env` | Uploads fail |
| `AWS_SECRET_ACCESS_KEY` | S3 asset uploads | Yes | Present in `.env` | Uploads fail |
| `AWS_REGION` | S3 config | Yes | Present (`us-east-2`) | Misrouted |
| `SLATEDROP_S3_BUCKET` | Asset file storage | Yes | Present in `.env` | Wrong bucket |
| `NEXT_PUBLIC_SITE_URL` | Share links (future) | For sharing | Present in `.env` | Links broken |

## External Services

| Service | Purpose | Status |
|---------|---------|--------|
| Supabase | Auth, `media_assets`, `media_collections` | **Active** |
| AWS S3 | Asset file storage | **Active** |

## Operational Risks

1. **Page gate effectively ungated** — `canAccessContent` is true for all tiers (P0)
2. No media processing pipeline — large files stored as-is
3. No CDN — assets served directly from S3 presigned URLs
4. Module not on marketing page — no visibility or waitlist
