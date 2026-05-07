# Slate360 — Environment And Tool Matrix

Last Updated: 2026-04-18

Use this file when a new Codespace or chat needs to understand which external systems are available, where their credentials should live, and how to verify access without exposing secrets.

## Services

| Service | Purpose | Primary Access | Local/Codespace Env | Hosted Env | Verification |
|---|---|---|---|---|---|
| GitHub / Git | source control, PRs, pushes | local git + GitHub auth | built into Codespace session | n/a | `git status`, `git push`, PR tools |
| Vercel | deploys, env management, prod runtime | `VERCEL_TOKEN` | Codespaces secret or shell env | Vercel project env | `vercel env ls`, deploy checks |
| Supabase | auth, DB, storage metadata | app clients + CLI | `.env.local` | Vercel project env | `npm run typecheck`, API route smoke tests |
| Stripe | billing, portal, webhooks | server envs | optional local runtime | Vercel project env | checkout/webhook smoke tests |
| AWS S3 | legacy/default object storage | `lib/s3.ts` | `.env` or `.env.local` | Vercel project env | `npm run diag:storage-runtime` |
| Cloudflare R2 | S3-compatible object storage | `lib/s3.ts` | `.env` or `.env.local` | Vercel project env | `npm run diag:storage-runtime`, `npm run diag:storage-runtime:write`, `npm run diag:storage-runtime:presign` |

## Cloudflare R2 Contract

Required runtime env:
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET`

Optional runtime env:
- `R2_REGION` (`auto` default)
- `R2_ENDPOINT`
- `CLOUDFLARE_ACCOUNT_ID` if you want the endpoint auto-derived as `https://<account>.r2.cloudflarestorage.com`
- `CLOUDFLARE_R2_API_TOKEN` for account-scoped R2 operations outside the S3-compatible SDK path

Current project values that are safe to document:
- Bucket: `slate360-storage`
- Account ID: `96019f75871542598e1c34e4b4fe2626`

## Storage Provider Selection

`lib/s3.ts` selects Cloudflare R2 automatically when the required `R2_*` envs are present. If they are not complete, it falls back to AWS S3 using:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`
- `SLATEDROP_S3_BUCKET`

## Recommended Checks

- `npm run diag:storage-runtime`: confirms which provider is active and whether the bucket is reachable
- `npm run diag:storage-runtime:write`: performs a temporary put/delete probe
- `npm run diag:storage-runtime:presign`: validates the presigned URL path used by upload/download flows