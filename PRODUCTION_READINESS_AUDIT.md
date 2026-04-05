# Slate360 — Production Readiness Audit

> 15-point audit against standard production failure modes.
> Date: 2026-04-05 | Branch: `fix/critical-foundation-patch`
> Total API routes: **98** | Total test files: **4**

---

## Scorecard

| # | Category | Status | Risk |
|---|---|---|---|
| 1 | ENV Documentation | **PASS** | LOW |
| 2 | API Loading/Error States | **PARTIAL** | MEDIUM |
| 3 | Mobile Responsiveness | **PASS** | LOW |
| 4 | Automated Backups | **FAIL** | HIGH |
| 5 | Rate Limiting | **FAIL** | CRITICAL |
| 6 | Input Validation | **FAIL** | CRITICAL |
| 7 | Error Monitoring | **PASS** | LOW |
| 8 | Logging/Observability | **PARTIAL** | MEDIUM |
| 9 | CORS/Security Headers | **PASS** | LOW |
| 10 | Database Migrations | **PASS** | LOW |
| 11 | CI/CD Pipeline | **PARTIAL** | MEDIUM |
| 12 | TypeScript Build Safety | **PARTIAL** | HIGH |
| 13 | Testing Coverage | **FAIL** | HIGH |
| 14 | Dependency Security | **FAIL** | HIGH |
| 15 | Performance Optimization | **PARTIAL** | MEDIUM |

**Overall: 4 PASS / 5 PARTIAL / 6 FAIL**

---

## Detailed Findings

### 1. ENV Documentation — PASS ✅

`.env.example` exists with 50+ env vars documented. Covers Supabase, AWS, Stripe, Sentry, PostHog, Google Maps, Resend, SendGrid. Placeholder values used — no real secrets committed.

### 2. API Loading/Error States — PARTIAL ⚠️

**What works**: Most API routes return proper `NextResponse.json({error}, {status})` in catch blocks.

**What's missing**:
- Only **2** `loading.tsx` files exist: `(dashboard)/loading.tsx` and `project-hub/[projectId]/loading.tsx`.
- No loading states for `/market`, `/slatedrop`, `/auth`, `/apps` route groups.
- Minimal Suspense boundary usage across components.
- No global error boundary outside of `global-error.tsx` (Sentry fallback).

### 3. Mobile Responsiveness — PASS ✅

Extensive responsive Tailwind usage (`sm:`, `md:`, `lg:`, `xl:`). Viewport configured with `viewportFit: cover`. `use-mobile.ts` hook exists. E2E mobile smoke test present. Navbar has mobile menu toggle.

### 4. Automated Backups — FAIL ❌

- **No backup scripts** in the repo.
- No cron for DB backups — only Market scheduler cron in `vercel.json`.
- No S3 versioning configuration documented.
- No disaster recovery plan.
- Supabase-managed backups are the only safety net (unverified, undocumented).

### 5. Rate Limiting — FAIL ❌ (CRITICAL)

**Infrastructure**: Well-built Upstash Redis sliding window in `lib/server/rate-limit.ts`.

**Coverage**: **2 out of 98 routes** (2%):
- `/api/auth/signup` — 5 req / 15 min
- `/api/auth/resend-confirmation` — 3 req / 15 min

**Unprotected high-risk routes**:
| Route | Risk |
|---|---|
| `/api/market/buy` | Financial transaction abuse |
| `/api/email/send` | Email spam vector |
| `/api/slatedrop/upload-url` | Storage exhaustion |
| `/api/projects/create` | Resource exhaustion |
| `/api/billing/checkout` | Checkout abuse |
| `/api/suggest-feature` | Unauthed abuse potential |

### 6. Input Validation — FAIL ❌ (CRITICAL)

- **Zero Zod schemas** in any API route handler.
- **58 routes** parse request body via `req.json()` with no schema validation.
- Only ~7 routes have basic `typeof` / truthy checks on individual fields.
- Only exception: `lib/market/execution-policy.ts` has `validateTradeInput`.

**Impact**: Any API route accepting JSON is vulnerable to type confusion, unexpected fields, and oversized payloads.

### 7. Error Monitoring — PASS ✅

Sentry fully configured across all runtimes (client, server, edge). `global-error.tsx` catches unhandled errors with `Sentry.captureException`. PII scrubbing active (strips tokens, secrets, passwords, auth headers). Session replay enabled on error.

### 8. Logging/Observability — PARTIAL ⚠️

**What works**: PostHog analytics integrated. Sentry tracing at 100% sample rate.

**What's missing**:
- No structured logging — all logs are `console.log`/`console.error` with bracket prefixes.
- No request ID tracing.
- No log levels.
- No log aggregation service.
- Some routes log user email addresses in plaintext (suggest-feature, signup error path).

### 9. CORS / Security Headers — PASS ✅

Comprehensive headers in `next.config.ts`: `X-Content-Type-Options`, `X-Frame-Options: DENY`, `X-XSS-Protection`, `Referrer-Policy`, `Strict-Transport-Security` (HSTS), full Content-Security-Policy. Middleware handles auth session refresh and security gates.

### 10. Database Migrations — PASS ✅

48 migration files in `supabase/migrations/` with timestamped naming. Covers all major features. Legacy cleanup via rename-to-backup pattern (non-destructive).

### 11. CI/CD Pipeline — PARTIAL ⚠️

**What works**: `.github/workflows/release-gates.yml` runs on push to `main` and PRs (`npm ci` + `npm run verify:release`).

**What's missing**:
- No separate test job — CI only runs release gate verification.
- E2E tests exist but are NOT run in CI.
- No staging environment documented.
- Vercel auto-deploys from `main` — a broken push goes live immediately.

### 12. TypeScript Build Safety — PARTIAL ⚠️ (HIGH)

**Good**: `tsconfig.json` has `"strict": true`.

**Bad**: `next.config.ts` disables both safety nets:
```typescript
eslint: { ignoreDuringBuilds: true },
typescript: { ignoreBuildErrors: true },
```
**Impact**: Type errors and lint errors do **not** block production deploys. A broken type annotation ships silently.

### 13. Testing Coverage — FAIL ❌

**Total test files: 4**
| File | Type |
|---|---|
| `e2e/auth.spec.ts` | E2E |
| `e2e/mobile-smoke.spec.ts` | E2E |
| `e2e/maps-diag.spec.ts` | E2E |
| `lib/uploads/validate-upload-permissions.test.ts` | Unit |

**Zero unit tests** for: billing, market trading, auth wrappers, API routes, hooks, entitlements.
**No integration tests**. E2E tests not in CI.

For a 98-route financial-transaction-capable app, this is critically insufficient.

### 14. Dependency Security — FAIL ❌

`npm audit` reports **29 vulnerabilities**:
- 18 low, 2 moderate, 8 high, **1 critical**
- Critical: `elliptic` (crypto implementation flaw, via ethersproject/Web3 deps)
- High: `@hono/node-server` (authorization bypass), `brace-expansion` (DoS)

### 15. Performance Optimization — PARTIAL ⚠️

**What's missing**:
- No `next/image` usage in app directory (raw `<img>` tags throughout).
- Only 2 `dynamic()` imports (both in deprecated pages).
- No lazy loading for heavy components (maps, charts, PDF viewer, 3D model viewer).
- No bundle analysis tooling configured.

**What works**: `memoryBasedWorkersCount: true` in next.config, SVG sandboxing.

---

## Auth Coverage

| Category | Count |
|---|---|
| Total API routes | 98 |
| Using `withAuth` / `withProjectAuth` | 23 |
| Using other auth wrappers | 26 |
| Manual `getUser` / `getSession` | 44 |
| Webhook signature / cron secret | ~6 |
| **Routes with some auth** | **87 (89%)** |
| **Intentionally unauthenticated** | **11 (11%)** |

Potentially problematic unauthenticated routes: `market/activity`, `market/book`, `market/resolution`, `market/system-status`.

---

## Top 3 Tactical Fixes (Highest Impact, Do Now)

### 🔴 #1 — Add Zod Input Validation to All JSON-Parsing API Routes

**Why**: 58 routes accept `req.json()` with zero validation. This is the #1 attack vector — type confusion, oversized payloads, injection via unexpected fields.

**Action**:
1. Install `zod` (already may be a transitive dep via Shadcn).
2. Create `lib/server/validate.ts` — a tiny wrapper that parses `req.json()` through a Zod schema and returns a `badRequest()` response on failure.
3. Add schemas to the 10 highest-risk routes first: `market/buy`, `market/sell`, `email/send`, `slatedrop/upload-url`, `billing/checkout`, `projects/create`, `contacts/*/files`, `auth/signup`, `suggest-feature`, `stripe/webhook`.

**Effort**: ~2 hours for the wrapper + 10 routes. Then grind through remaining 48 incrementally.

### 🔴 #2 — Expand Rate Limiting to High-Risk Routes

**Why**: Only 2 of 98 routes are rate-limited. Financial transactions (`market/buy`), email sending, and file uploads are wide open to abuse.

**Action**:
1. Add rate limiting to the following routes (use existing `lib/server/rate-limit.ts`):

| Route | Limit |
|---|---|
| `/api/market/buy` | 10 req / 1 min |
| `/api/market/sell` | 10 req / 1 min |
| `/api/email/send` | 5 req / 1 min |
| `/api/slatedrop/upload-url` | 20 req / 1 min |
| `/api/projects/create` | 5 req / 1 min |
| `/api/billing/checkout` | 3 req / 1 min |
| `/api/suggest-feature` | 3 req / 5 min |

2. Consider a global middleware-level rate limit (100 req / 1 min per IP) as a floor.

**Effort**: ~1 hour — the infrastructure already exists, just needs wiring.

### 🟡 #3 — Remove `ignoreBuildErrors` and `ignoreDuringBuilds` from next.config.ts

**Why**: Type errors and lint errors currently ship to production silently. This undermines every TypeScript safeguard in the codebase.

**Action**:
1. Remove both lines from `next.config.ts`:
   ```diff
   - eslint: { ignoreDuringBuilds: true },
   - typescript: { ignoreBuildErrors: true },
   ```
2. Run `npm run build` and fix all errors that surface.
3. Once clean, this becomes a permanent safety net — every future deploy is type-checked.

**Effort**: 1-3 hours depending on how many latent errors exist (current `npm run typecheck` passes clean, so build errors may be minimal).

---

## Secondary Priorities (Next Sprint)

4. **Run `npm audit fix`** — clear the 29 vulns including 1 critical (`elliptic`).
5. **Add `loading.tsx`** to `/market`, `/slatedrop`, `/apps` route groups.
6. **Replace `<img>` with `next/image`** across all components for automatic optimization.
7. **Add unit tests** for critical paths: billing webhook, entitlements, auth wrappers.
8. **Document backup strategy** — verify Supabase PITR, consider S3 versioning.
9. **Add E2E tests to CI** via Playwright in GitHub Actions.
10. **Add lazy loading** (`dynamic(() => import(...), { ssr: false })`) for maps, 3D viewer, charts.
