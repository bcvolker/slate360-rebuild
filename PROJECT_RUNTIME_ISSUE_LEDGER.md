# Project Runtime Issue Ledger (Live)

Purpose: single source of truth for persistent production/runtime defects, with root-cause elimination history and handoff context.

Last updated: 2026-02-28
Owner: AI agent + engineering team

---

## Environment + Deployment Context

- Production domain: `https://www.slate360.ai`
- Runtime commit verification endpoint: `/api/deploy-info`
- Important caveat: Vercel preview domains may be deployment-protected and return `401`, which can look like stale deployments when they are actually access-controlled.

Recent validated commits in this workstream:
- `1413aae` — LocationMap TypeScript repair after scripted JSX replacement breakage.
- `82a9716` — blocker fixes (dashboard duplication, CEO access parity, files tab route, SlateDrop auto-expand key).
- `3fe9d29` — shared server org resolver + runtime diagnostics banner.

---

## Issue 1 — CSP blocks runtime network calls (upload + weather + map worker)

### Symptoms
- Browser console reports CSP violations for:
  - `connect-src` denying `https://api.open-meteo.com`
  - `connect-src` denying presigned S3 upload URLs (`https://*.amazonaws.com`)
  - worker creation warning/blocking for map internals (`blob:` worker context)
- User-visible impact:
  - SlateDrop upload fails at runtime despite valid UI flow.
  - Weather widget/location integrations fail to fetch.

### Root-cause hypothesis
- `Content-Security-Policy` in `next.config.ts` omitted required runtime domains/directives.

### Attempt history
1. Initial CSP hardening pass for maps/pannellum (prior cycle).
2. Follow-up runtime evidence from production console showed additional missing sources.
3. Current patch added:
   - `connect-src ... https://api.open-meteo.com https://*.amazonaws.com`
   - `worker-src 'self' blob:`

### Files touched
- `next.config.ts`

### Elimination status
- Eliminated: “code not deployed” as primary cause (runtime commit already verified).
- In-progress: confirming CSP header now includes new directives in production response headers.

### Next verification
- Inspect response headers from production page/API to confirm updated CSP string.
- Retry SlateDrop upload and weather call in authenticated session.

---

## Issue 2 — `/api/account/overview` returning 400 for some users

### Symptoms
- `400` from account overview endpoint when organization membership row is absent/inconsistent.
- User-facing dashboard/account widgets degrade.

### Root-cause hypothesis
- Endpoint still had strict membership requirement and returned hard error instead of graceful payload.

### Attempt history
1. Added shared resolver `resolveServerOrgContext()` in previous cycle.
2. Current patch migrated `/api/account/overview` to shared resolver and removed hard 400 path.
3. Endpoint now returns deterministic defaults when `orgId` is unavailable.

### Files touched
- `app/api/account/overview/route.ts`
- (dependency) `lib/server/org-context.ts`

### Elimination status
- Eliminated: “must always have org membership row” assumption.
- In-progress: confirm no regressions in admin-only fields and Stripe mapping behavior.

### Next verification
- Hit `/api/account/overview` as:
  - normal member with org
  - user with missing org membership
  - admin/owner
- Validate shape stability and non-400 behavior.

---

## Issue 3 — SlateDrop sidebar cannot reliably reach deep items

### Symptoms
- User reports inability to scroll/access deeper project sandbox entries in left sidebar.

### Root-cause hypothesis
- Sidebar height/positioning and overflow handling in combined fixed/mobile + desktop layout caused clipped/reachability behavior.

### Attempt history
1. Prior fix corrected default project auto-expand key (`project-sandboxes` -> `projects`).
2. Current patch adjusted sidebar container behavior:
   - mobile positioning from `inset-y-14` + `h-full` to explicit `top-14 bottom-0`
   - added `overscroll-contain`
   - ensured desktop `md:h-full`
   - added bottom padding in sidebar content for reachability

### Files touched
- `components/slatedrop/SlateDropClient.tsx`

### Elimination status
- Eliminated: auto-expand key mismatch as sole explanation.
- In-progress: verify manual scroll on long folder trees across viewport sizes.

### Next verification
- Test with folder tree > viewport height on mobile and desktop.
- Confirm bottom-most item is reachable/selectable.

---

## Team Workflow (Issue-by-Issue)

1. Reproduce one issue with exact console/network evidence.
2. Patch only root-cause file(s) for that issue.
3. Validate locally with targeted checks.
4. Validate in production runtime behavior.
5. Mark issue state as `Resolved` only after production verification.

Current issue states:
- Issue 1 (CSP): **Patched / awaiting production verification**
- Issue 2 (Account overview 400): **Patched / awaiting endpoint verification**
- Issue 3 (Sidebar reachability): **Patched / awaiting UX verification**

---

## Full Handoff Context for Another AI

Architecture slices relevant to current blockers:
- Next.js app router with route groups under `app/(dashboard)`
- Supabase auth + org membership (`organization_members`) as primary entitlement source
- Shared server org resolver introduced in `lib/server/org-context.ts`
- SlateDrop feature client in `components/slatedrop/SlateDropClient.tsx`
- Global response security headers in `next.config.ts`
- Account aggregation endpoint in `app/api/account/overview/route.ts`

High-value files for immediate continuation:
- `next.config.ts`
- `app/api/account/overview/route.ts`
- `components/slatedrop/SlateDropClient.tsx`
- `lib/server/org-context.ts`
- `app/api/deploy-info/route.ts`

Suggested immediate continuation checklist:
1. Confirm CSP headers on production responses reflect latest directives.
2. Re-test SlateDrop upload with real presigned URL flow.
3. Re-test account overview for users with/without org membership rows.
4. Re-test SlateDrop long-sidebar scrolling on mobile+desktop.
5. Record pass/fail evidence in this file before next push.
