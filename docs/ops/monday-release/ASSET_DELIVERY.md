# Monday asset delivery (R2 CORS unavailable)

The current R2 API token cannot `PutBucketCors`. Do **not** block Monday on a stronger token.

## What works today

- Signed GET of kitchen/HouseWalk objects from R2 returns `206` Range.
- Browser fetches to `*.r2.cloudflarestorage.com` have **no** `Access-Control-Allow-Origin`.
- Spark workers and `video.crossOrigin` therefore cannot use the 302 URL.

## Monday path (least-bad, non-naïve)

Same-origin Range **stream** through Next:

- Walkthrough: `/api/spatial-walkthrough/public/[token]/media` streams poster + proxy. No 302.
- Twin: `/preview/twin-metric/asset?...&proxy=1` streams GLB/SPZ. Default 302 remains for non-proxy callers.

Rules:

- Stream `GetObject` body (`transformToWebStream`). Do not buffer the file in RAM.
- Preserve `Range` / `Content-Length` / `Content-Range`.
- `Cache-Control: public, max-age=86400, immutable` on binaries.
- Forward `abortSignal` from the incoming request.

## Final CDN (later, not Monday)

Put a Cloudflare custom domain or public bucket in front of `slate360-storage` with a GET CORS policy limited to `https://www.slate360.ai` and the git preview host. Then viewers can skip the Vercel stream. Until that domain exists in this project’s config, do not weaken bucket privacy for the demo.

No public ACL change. No destructive token.
