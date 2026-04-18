# Cloudflare R2 Cutover Checklist

Last Updated: 2026-04-18

Use this checklist before removing AWS credentials or assuming production is fully R2-backed.

## Preconditions

- Local or Codespaces runtime passes `npm run diag:storage-runtime`
- Local or Codespaces runtime passes `npm run diag:storage-runtime:write`
- Local or Codespaces runtime passes `npm run diag:storage-runtime:presign`
- Local app runtime passes `npm run smoke:slatedrop-public-flow`

## Production Runtime

- Vercel envs contain `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`
- Vercel envs contain either `R2_ENDPOINT` or `CLOUDFLARE_ACCOUNT_ID`
- Production runtime no longer depends on missing `AWS_*` envs for file flows
- One deployed environment verifies `npm run diag:storage-runtime` successfully
- Cloudflare R2 bucket CORS allows the Slate360 app origins for direct browser PUT/GET/HEAD flows

### Required bucket-side CORS behavior

Minimum rule shape for direct browser uploads:
- Allowed origins: local dev/Codespaces origin(s) and production app origin(s)
- Allowed methods: `GET`, `HEAD`, `PUT`
- Allowed headers: `*` or at minimum `content-type`, `x-amz-*`
- Expose headers: `ETag` is sufficient for most flows

## App Flows To Verify

- SlateDrop upload URL reservation succeeds
- Direct upload to presigned R2 PUT URL succeeds
- SlateDrop completion route marks uploads active
- SlateDrop share page renders a real uploaded file
- Shared download/open links return the object successfully
- Site Walk upload route still reserves canonical project-folder uploads
- Site Walk plan image and deliverable export routes still return usable presigned URLs

## Before Removing AWS

- Decide whether `slate360-storage` remains the canonical bucket name on R2
- Audit whether any old objects still only exist in AWS S3
- Define rollback: restore `AWS_*` envs and redeploy if an R2-only deploy fails
- Keep AWS credentials available until at least one full production validation cycle passes