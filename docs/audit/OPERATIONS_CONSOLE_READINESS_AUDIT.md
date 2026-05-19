# Operations Console Readiness Audit

Last Updated: 2026-05-14
Status: Read-only audit. No code changes.

## Purpose

Assesses whether the operations console is ready for foundational launch.

## Console Routes

| Route | Purpose | Status | Auth |
|---|---|---|---|
| /operations-console | Access Queue — approve/revoke users | **Functional** | canAccessOperationsConsole |
| /operations-console/feedback | Feedback Inbox — bugs, features | **Functional** | canAccessOperationsConsole |
| /operations-console/users | Users & Orgs management | **Stub/wireframe** | canAccessOperationsConsole |
| /operations-console/revenue | Revenue operations | **Stub/wireframe** | canAccessOperationsConsole |
| /operations-console/product-health | Product health dashboard | **Stub/wireframe** | canAccessOperationsConsole |
| /operations-console/systems | Systems console | **Stub/wireframe** | canAccessOperationsConsole |
| /super-admin | Super admin info page | **Minimal** | app_metadata.is_super_admin |

## Access Gating

| Layer | /super-admin | /operations-console | /api/admin/beta | /api/ceo/* |
|---|---|---|---|---|
| Middleware auth | ✅ 403 | ✅ login redirect | ✅ withAuth | ✅ withAuth |
| Middleware privilege | ✅ app_metadata.is_super_admin | ❌ None (page-level only) | N/A | N/A |
| Page/handler privilege | ✅ app_metadata.is_super_admin | ✅ canAccessOperationsConsole | ✅ isOwnerEmail (env var) | ⚠️ Hardcoded email |
| Fail-closed on missing config | ✅ | ✅ | ✅ | ❌ (hardcoded) |

**canAccessOperationsConsole** = `isSlateCeo || isSlateStaff` (from resolveServerOrgContext).

## User Approval Flow

1. User signs up → profiles row created with account_status not "approved"
2. Middleware redirects unapproved users to /pending-verification
3. Owner sees pending users in Operations Console Access Queue
4. Owner clicks Approve → PATCH /api/admin/beta sets account_status="approved", is_beta_approved=true, approved_at=now
5. User refreshes /pending-verification → redirected to dashboard

**Bypass paths:**
- Owner email (CEO_EMAIL env var) always passes
- App reviewers (is_app_reviewer=true) bypass middleware gate
- Invited users get is_beta_approved=true on redemption

## Functional Capabilities

### Working
- User listing with All/Approved/Pending filters
- Summary cards: Total Users, V1 Approved, Pending
- Per-user Approve/Revoke toggle
- App Reviewer badge toggle
- Feedback inbox with type, severity, title, description, attachments, status
- Live badge counts in nav (pending access, new feedback, feature requests)
- CEO platform overview (org count, user count, tier breakdown)
- Staff access management (grant/revoke Market Robot, Athlete360 scope)
- Subscriber directory (full user list with org/role/tier)

### Not Working (Stubs)
- Users & Orgs management (planned capabilities listed but no UI)
- Revenue operations (placeholder)
- Product health dashboard (placeholder)
- Systems console (placeholder)
- Per-org entitlement granting UI — no admin UI to set org_feature_flags
- Enterprise seat management UI — no admin UI
- Subscription override UI — no manual tier adjustment

## Security Concerns

| Issue | Severity | Details |
|---|---|---|
| Hardcoded CEO email in 4 API routes | Medium | /api/ceo/* routes hardcode "slate360ceo@gmail.com" instead of using CEO_EMAIL env var |
| Case-sensitive email check | Low | Hardcoded check uses === without toLowerCase(), while isOwnerEmail() uses toLowerCase() |
| No middleware-level gate for /operations-console | Low | Gate is page-level only; route loads layout before checking access |
| /api/ceo/subscribers enumerates ALL users | Info | Protected by auth but sensitive endpoint |
| No rate limiting on admin routes | Low | Compromised session could enumerate rapidly |

## Foundational Launch Readiness

| Capability | Ready? |
|---|---|
| Approve new users | ✅ Yes |
| Revoke user access | ✅ Yes |
| Set app reviewer flag | ✅ Yes |
| Review bug reports | ✅ Yes |
| Review feature suggestions | ✅ Yes |
| View platform metrics | ✅ Yes |
| Manage staff access | ✅ Yes |
| Grant org entitlements | ❌ No UI |
| Manage subscriptions | ❌ No UI |
| View revenue | ❌ Stub |
| Monitor product health | ❌ Stub |
| Manage enterprise seats | ❌ No UI |

**Verdict:** Sufficient for foundational launch. User approval, feedback review, and basic platform metrics work. Missing capabilities are needed for scale but not for initial launch with <100 users.
