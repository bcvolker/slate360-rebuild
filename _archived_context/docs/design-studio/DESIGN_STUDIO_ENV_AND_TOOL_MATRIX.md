# Design Studio — Env & Tool Matrix

Last Updated: 2026-04-13

## Environment Variables

| Variable | Where Referenced | Required? | Current Status | Risk if Wrong |
|----------|-----------------|-----------|----------------|---------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase client | Yes | Present in `.env` | DB ops fail |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client-side Supabase | Yes | Present in `.env` | Auth fails |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin client | Yes | Present in `.env` | Server writes fail |
| `AWS_ACCESS_KEY_ID` | S3 model uploads | Yes | Present in `.env` | Uploads fail |
| `AWS_SECRET_ACCESS_KEY` | S3 model uploads | Yes | Present in `.env` | Uploads fail |
| `AWS_REGION` | S3 config | Yes | Present (`us-east-2`) | Misrouted |
| `SLATEDROP_S3_BUCKET` | Model file storage | Yes | Present in `.env` | Wrong bucket |

## External Services

| Service | Purpose | Status |
|---------|---------|--------|
| Supabase | Auth, `design_models`, `design_model_files` | **Active** |
| AWS S3 | 3D model file storage (GLB, FBX, etc.) | **Active** |

## What Can Be Verified From Repo Only

- 5 API route files exist
- 4 component files exist
- Type defs and queries exist
- Migration for 2 tables exists

## What Requires Live External Access

- S3 model upload and retrieval
- Supabase table existence and RLS
- 3D rendering in browser (Three.js/Babylon)
- Stripe checkout for Design Studio subscription

## Operational Risks

1. **Page gate effectively ungated** — `canAccessDesignStudio` is true for all tiers (P0)
2. 3D model files can be very large (100MB+) — upload timeout risk
3. Browser 3D rendering requires WebGL support
4. Module marked "Coming Soon" but pages are accessible
