# Slate360 Smoke Test Playbook

## Purpose
Fast validation after major UI/logic changes to ensure:
- Core routes and auth flows work
- Tier/entitlement visibility is correct
- Critical business flows (signup, billing, projects, SlateDrop, map export) are functional
- No major SaaS readiness gaps are missed

---

## 1) Automated Baseline (5-10 min)

### A. Widget/Location structural checks
```bash
node scripts/widget-block-isolation-test.mjs
```
Expected: all checks pass.

### B. HTTP route smoke checks
```bash
node scripts/mobile-smoke-http.mjs
```
Expected:
- Homepage returns 200
- Protected routes redirect to login when unauthenticated
- Key feature pages render

### C. Type and build checks
```bash
npx tsc --noEmit
npm run build
```
Expected:
- no TypeScript errors
- build compiles successfully

---

## 2) Manual Critical Path Smoke (15-25 min)

## Auth & Account
- Create account from `/signup`
- Verify terms/privacy are required before submit
- Verify confirmation email is delivered and callback flow activates account
- Log in and confirm redirect to `/dashboard`

## Tier/Entitlements Matrix
Test with at least:
- trial/creator/model/business account
- `slate360ceo@gmail.com`

Verify for each:
- Tab visibility (Dashboard, Project Hub, Analytics, CEO, etc.)
- Route access behavior (allowed vs gated)
- Seat management visibility for seat tiers

## Dashboard UI/UX
- Mobile: confirm only dropdown Quick Access remains (no duplicate tile strip)
- Desktop: confirm quick-access tiles are visible and responsive
- Widget sizing: default/sm/md/lg behavior and card dimensions look correct

## Project Hub + In-Project
- Open project from dashboard card
- Verify `/project-hub/[projectId]` loads (not blank)
- Verify top tabs navigate to real pages
- Verify Files tab routes into project SlateDrop

## SlateDrop
- Open from dashboard widget -> general view expected
- Open from in-project SlateDrop -> project sandbox folder auto-selected
- Verify left folder tree, toolbar actions, right-click context menu
- Upload, rename, delete, preview, and secure-send basic checks

## Billing/Payments
- From `/plans`: checkout for creator/model/business (test mode)
- Billing portal opens from My Account
- Buy credits flow opens checkout and returns success/cancel status
- Verify subscription status updates via webhook handling

## Location Map (Directions/Export)
- Calculate route
- Verify route polyline visible in widget map
- Download PDF and verify map image + route path appear
- Send route link (email/SMS) and validate payload

---

## 3) SaaS Industry Readiness Checklist

## Reliability
- [ ] Auth redirects and protected routes are deterministic
- [ ] Tier gating is consistent between nav visibility and route-level access
- [ ] Core pages avoid blank states for valid users

## Billing & Monetization
- [ ] Trial -> paid upgrade path is discoverable
- [ ] Billing portal and credit purchase flows are reachable from account UI
- [ ] Subscription and credits reconcile via webhook events

## Multi-Tenant Data Safety
- [ ] Org/project scope checks enforced in server routes
- [ ] Users cannot access another org’s projects/files via URL edits
- [ ] Sensitive operations require authenticated user + scoped org context

## Collaboration & Workspace UX
- [ ] Project-specific file context opens correctly
- [ ] Global file context remains non-project scoped
- [ ] Context menus/toolbars are consistent across entry paths

## Observability & Operations
- [ ] Build/type checks in CI
- [ ] Smoke scripts run on PR and pre-deploy
- [ ] Error logs surfaced for billing/map APIs and fallback behavior documented

---

## 4) Recommended CI sequence
```bash
npx tsc --noEmit
node scripts/widget-block-isolation-test.mjs
node scripts/mobile-smoke-http.mjs
npm run build
```

If any step fails:
1. Fix failing area
2. Re-run full sequence
3. Deploy only on full pass
