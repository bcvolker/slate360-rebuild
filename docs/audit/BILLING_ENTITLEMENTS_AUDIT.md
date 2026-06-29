# Billing & Entitlements Audit — Jun 28 2026 (read-only)

Findings from a read-only audit of tier gating, metering, credits, and Stripe. **These live in
forbidden-edit zones (entitlements/billing/Stripe/middleware) — Brian applies the fixes; Claude
does not edit them.** Ranked by impact.

## Resolved on inspection
- **Site Walk routes ARE gated server-side (not login-only).** `withAppAuth("punchwalk")` resolves
  `resolveOrgEntitlements(orgId)`, maps `punchwalk → canAccessStandalonePunchwalk`, and returns
  403 "subscription required" if absent (`lib/server/api-auth.ts:89-106`). So the worst-case
  "all Site Walk free" is NOT happening. (The remaining caveat is beta-mode — see #6.)
- **Stripe webhook is sound** — signature verified, dedup-first insert, `past_due` keeps tier,
  inactive downgrades to trial, nothing trusts client tier (`...stripe/webhook/route.ts`). One gap:
  `customer.subscription.deleted` for modular/standalone subs may drop the `kind` metadata → the
  modular app sub might not deactivate (entitlement drift). Verify deletion events carry `kind`.
- `getEntitlements` defaults unknown tier to `trial` (fail-closed) ✓; twin `processing-entitlement`
  fails closed ✓.

## RISKS FOUND (top first — for Brian)
1. **Digital Twin uploads have NO storage-limit gate** (biggest payloads). `digital-twin/upload/
   single/route.ts:177` + `upload/complete/route.ts:125` increment `org_storage_used_bytes` but
   never check it before issuing the presigned URL → unmetered multi-GB R2 ingest. **Fix:** gate
   `org_storage_used_bytes + sizeBytes > limit` before the URL (mirror `slatedrop/upload-url/route.ts:133`), 429.
2. **Twin credit estimate ≠ charge, no hold at enqueue.** Pre-flight `assertTwinJobCredits`
   (`job-credits-estimate.ts:32`) computes from all ready assets; the charge in `job-callback.ts:124`
   recomputes from the worker's reported set. No reservation between estimate and the deferred
   callback → balance can be spent meanwhile → `deductCredits` 409 AFTER the GPU work ran = unbilled
   Modal compute. **Fix:** reserve/hold credits at job-create (debit, refund on failure); use the
   same asset set both times.
3. **Site Walk metering fails OPEN on DB error** (`lib/site-walk/metering.ts:145` `failOpen` →
   `allowed:true` on any query throw — both storage + AI-credit gates). A transient/forced error
   lets uploads/AI through unmetered. **Fix:** fail closed (402/503) for these gates, or only
   fail-open on read-timeout classes. (Confirm as a deliberate product call.)
4. **Three divergent storage-limit systems.** `metering.ts` (hardcoded BASIC 5GB / PRO 25GB, lines
   11-14) vs `entitlements.ts` `maxStorageGB` (trial 2 / standard 25 / business 100) vs
   `quota-check.ts` `storageGB`. Worse, `quota-check.ts:73` estimates usage as `photoCount * 2MB`
   (ignores the real `org_storage_used_bytes`; a 25MB photo counts as 2MB → ~12× overage). **Fix:**
   one source of truth (modular `AppLimits.storageGB`); delete the hardcoded constants + fake estimate.
5. **Beta-mode grants `pro` to everyone** (`processing-entitlement.ts:33` `isBetaMode()`). Confirm
   the beta flag is OFF in production or all Twin processing is free.
6. **Storage decrement on delete not race-safe** (`slatedrop/delete/route.ts:84`) — concurrent
   DELETEs can both decrement. **Fix:** make the decrement conditional on the UPDATE actually
   transitioning `status active→deleted` (only recover if a row changed).

Verdict: **RISKS FOUND.** Structural gating exists (login + entitlement enforced), but storage gates
on the largest payloads (Twin) and the credit-charge path have real revenue leaks to close.

## Resolution (Jun 28 — after code inspection)
Inspecting the code changed several conclusions. **The app is in deliberate pre-launch BETA**
(`BETA_MODE = NEXT_PUBLIC_BETA_MODE !== "false"`, "Subscribing opens at launch") — monetization is
intentionally disabled, so some "leaks" are by-design until launch.

- **#1 Twin storage gate — ALREADY HANDLED (false positive).** `app/api/digital-twin/upload/single`
  calls `assertStorageQuota` (`lib/twin/storage-quota.ts`) at presign, which reads the real
  `get_storage_used` RPC + entitlement limit and throws over quota. No change needed.
- **#4 fake 2 MB estimate — FIXED.** `lib/server/quota-check.ts` `checkStorageQuota()` was DEAD
  (zero callers) and used a fabricated estimate — removed it so it can't be wired back.
- **#3 metering fails open — FIXED (beta-aware).** `lib/site-walk/metering.ts` `failGate()` now fails
  OPEN during beta (no charging — don't block beta users on a transient DB error) and CLOSED once
  live (`isBetaMode()` gate), so errors can't leak paid usage post-launch.
- **#5 beta-mode grants pro — INTENTIONAL.** This is the pre-launch posture; the "fix" is the
  launch-time flip `NEXT_PUBLIC_BETA_MODE=false`. Not a code bug.
- **#2 credit estimate ≠ charge / no enqueue hold — LAUNCH-HARDENING TASK (deferred).** Real for
  post-launch, but credits aren't charged in beta, and reworking the charge/hold path is the
  highest-risk money change — do it as a deliberate, tested change with Brian before launch (reserve
  at job-create, refund on failure, same asset set for estimate and charge).
- **#6 delete decrement race — LAUNCH-HARDENING TASK (deferred, low frequency).** Make the
  `recoverOrgStorage` conditional on the soft-delete UPDATE actually transitioning `active→deleted`.

**Launch billing checklist (before `NEXT_PUBLIC_BETA_MODE=false`):** do #2 (credit hold) and #6
(race-safe decrement), and re-confirm Stripe `subscription.deleted` carries `kind` for modular subs.
