# Stable QA URL — Vercel protection

Brian should not type a new Vercel protection password for every unique `*.vercel.app` preview hash.

Do **not** disable Deployment Protection on production or on authenticated dashboard routes.

## What is happening

Each git push to a preview branch mints a new unique host (`slate360-rebuild-<hash>-slate360.vercel.app`). Standard Protection treats that host as a new deployment, so the SSO/password gate appears again.

App login still protects `/spatial-walkthrough/*`. Public `/w/{token}` is meant to open without Slate360 account login, but Vercel protection sits **in front** of that.

## Safest one-time project setting (no code change)

In Vercel → `slate360-rebuild` → Settings → Deployment Protection:

1. Keep **Standard Protection** on Production.
2. Add a **stable preview alias** for this rescue branch, e.g. assign `feature/spatial-media-delivery-rescue-v1` a fixed domain:
   - `slate360-spatial-qa.vercel.app` (Vercel alias)
   - or `qa.slate360.ai` if DNS is available
3. Optionally add Brian’s Vercel team member so protection is SSO, not a rotating password.
4. For public share QA only: Protection Bypass for Automation is for scripts, not a public bookmark. Do not paste that bypass onto a public page.

## What code will not do

- Will not turn off protection for `www.slate360.ai`
- Will not expose `/app` or Studio without Slate360 auth
- Will not add a public unauthenticated dashboard

Until the alias exists, use the unique host from `npx vercel ls slate360-rebuild` or `/api/deploy-info` after each deploy, and keep one Vercel password in a password manager.
