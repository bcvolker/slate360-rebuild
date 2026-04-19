# Parallel Build Prompt — Round 2 for Other AI Assistant

> Paste everything below the rule into the other assistant. Self-contained.
> Branch: `refactor/brand-token-migration-core-surfaces` on
> `bcvolker/slate360-rebuild`. HEAD as of this prompt: see latest commit.

---

You are continuing the Slate360 build as a parallel-build engineer. Round 1
delivered `lib/billing/cost-model.ts` cleanly. This round you'll deliver 5
work units. The orchestrating engineer (the other AI) is handling DB
migrations + Stripe seeding directly, so you focus on application code and UI.

================================================================================
PROJECT CONVENTIONS — VERIFY YOUR CODE AGAINST THESE
================================================================================

1. Auth wrappers (lib/server/api-auth.ts):
   - withAuth(req, handler) — handler is (req, ctx: AuthedContext) => Promise<Response>
   - withProjectAuth(req, ctx, handler) — adds project access check
   - AuthedContext: userId, orgId | null, role, isAdmin, isSlateCeo,
     entitlements, permissions. NO `tier` on context (read ctx.entitlements.tier).
     NO `context.user`.

2. Response helpers (lib/server/api-response.ts) — use ONLY:
   ok, created, noContent, badRequest, unauthorized, forbidden, notFound,
   conflict, serverError. There is NO successResponse / errorResponse.

3. Supabase clients:
   - createClient() from @/lib/supabase/client (browser)
   - createServerSupabaseClient() from @/lib/supabase/server (server)
   - createAdminClient() from @/lib/supabase/admin (service role)

4. DB column names that bite people:
   - projects.created_by (NOT owner_id)
   - project_folders (NOT file_folders)
   - credit_ledger.organization_id (NOT org_id)
   - credit_ledger.delta (NOT delta_credits)
   - credit_ledger.category (NOT reason). Allowed values:
     'subscription' | 'purchase' | 'bonus' | 'refund' | 'job_usage' |
     'storage_usage' | 'bandwidth_usage' | 'export_usage' | 'api_usage' |
     'adjustment' | 'expiration'
   - credit_ledger.credit_source: 'monthly' | 'purchased' | 'bonus' | 'refund' | 'mixed'
   - slate360_staff is keyed by `email`, not user_id. To check "is current
     user staff", join with auth.users on email.
   - profiles.beta_tester / profiles.foundational_member already exist (bool).

5. Hard rules:
   - No `any` (use `unknown` + narrow).
   - No production .ts/.tsx file > 300 lines. Extract first.
   - One component per file, one hook per file.
   - Server components first; "use client" only when required.
   - Imports flow: lib/ → components/ → app/.

6. Already-shipped foundations — DO NOT MODIFY:
   - lib/server/api-auth.ts
   - lib/server/api-response.ts
   - lib/server/org-context.ts
   - lib/server/api-app-access.ts
   - lib/billing/cost-model.ts (round 1; just import from it)
   - supabase/migrations/* (orchestrator handles new migrations)

================================================================================
DB STATE (already applied to live — your code can rely on these)
================================================================================

Tables that exist on live Supabase:
- organizations, organization_members, projects, project_collaborator_invites,
  invitation_tokens, slate360_staff (keyed by email), profiles (with
  beta_tester / foundational_member / beta_joined_at / foundational_granted_at),
  org_member_app_access (per-app seat), tours, design_studio_assets
- NEW THIS ROUND: org_subscriptions (multi-row per org), credit_balance,
  collaborator_addons, beta_feedback
- credit_ledger ALREADY existed with the legacy column names listed above.
  Use those names; do not try to use org_id/delta_credits/reason.

================================================================================
WORK UNITS — BUILD IN ORDER, EACH AS A SEPARATE COMMIT
================================================================================

UNIT #2: lib/entitlements.ts REWRITE (app-centric, multi-SKU)
----------------------------------------------------------------

Replace the existing single-tier model. Read SKUs from org_subscriptions
(active or trialing rows), look each up in SKUS from cost-model.ts, then
roll up into the new shape:

```typescript
import type { AppKey } from '@/lib/billing/cost-model';
import { SKUS, BETA_LIMITS } from '@/lib/billing/cost-model';

export type Tier = 'trial' | 'standard' | 'pro' | 'enterprise';
export type AppAccessLevel = 'none' | 'standard' | 'pro' | 'enterprise';

export interface Entitlements {
  tier: Tier;                                       // max across SKUs
  appAccess: Record<AppKey, AppAccessLevel>;        // per-app highest tier
  canCreateProjects: boolean;                       // any Pro single-app, any bundle, or enterprise
  hasFullProjectManagement: boolean;                // Site Walk Pro / Project Bundle Pro / Total Pro / Enterprise
  projectFacetsEnabled: AppKey[];                   // union of SKU.appsIncluded across active SKUs
  storageGB: number;                                // sum across SKUs (capped at BETA_LIMITS if beta)
  monthlyCredits: number;                           // sum across SKUs (capped at BETA_LIMITS if beta)
  collaboratorsIncluded: number;                    // max across active SKUs + sum of collaborator_addons
  isBetaTester: boolean;                            // from profiles.beta_tester
  isFoundationalMember: boolean;                    // from profiles.foundational_member
  // Preserve any existing flags consumers expect (canViewSlateDropWidget = true always — SlateDrop is universal)
  canViewSlateDropWidget: boolean;                  // always true (universal feature)
}

export async function getEntitlementsForOrg(orgId: string | null, userId: string): Promise<Entitlements>;
```

Implementation requirements:
- If orgId is null: return TRIAL defaults (no app access, 500 MB storage, 100 credits, 0 collabs).
- Read profiles row for beta_tester + foundational_member.
- If beta_tester: clamp storageGB ≤ BETA_LIMITS.storageGB and monthlyCredits ≤ BETA_LIMITS.monthlyCredits.
- Legacy fallback: if no rows in org_subscriptions but organizations.tier is set,
  map: standard→site_walk_std, business→total_std, enterprise→enterprise SKU.
- Drop `canAccessHub` everywhere. Find and remove all consumers.
- Export a synchronous `summarizeEntitlements(skus: SkuDefinition[]): Omit<Entitlements,'isBetaTester'|'isFoundationalMember'>` for unit tests.
- File MUST stay under 300 lines. Extract helpers to lib/billing/entitlements-resolver.ts if needed.

Update consumers:
- lib/server/org-context.ts already calls getEntitlements — change to getEntitlementsForOrg(orgId, userId).
- Any UI that read ent.canAccessHub → remove.

UNIT #3: scripts/stripe-seed.ts (idempotent test-mode seeding)
----------------------------------------------------------------

```typescript
// Run with: STRIPE_SECRET_KEY=sk_test_... npx tsx scripts/stripe-seed.ts
// ABORTS if key starts with sk_live_.
```

Read SKUS / CREDIT_PACKS / COLLABORATOR_ADDONS from cost-model.ts. For each:
1. Find or create a Stripe Product with name = SKU.name, metadata.lookupKey = SKU.lookupKey.
2. Find or create monthly Price with lookup_key = `${SKU.lookupKey}_monthly`,
   amount = monthlyUsd*100, recurring.interval=month.
3. Find or create annual Price with lookup_key = `${SKU.lookupKey}_annual`,
   amount = annualUsd*100, recurring.interval=year.
4. For credit packs: one-time Price (no recurring), amount = priceUsd*100.
5. For collaborator addons: monthly recurring Price.

Plus 2 coupons (idempotent — find by id):
- id=FOUNDATIONAL_YEAR1, percent_off=50, duration=repeating, duration_in_months=12
- id=FOUNDATIONAL_LIFETIME, percent_off=20, duration=forever

Output a markdown summary table at end. Use stripe SDK already in deps.
DO NOT delete or archive existing prices — leave the orchestrator to clean up legacy SKUs.

UNIT #4: LOGIN SCREEN
----------------------------------------------------------------

User-supplied logo: `public/slate360-icon-color.png` (square color icon).
Existing assets: `public/SLATE 360-Color Lockup (1).svg` (icon + wordmark
horizontal lockup, color version).

Layout (`app/login/page.tsx` or update existing):
- Top center: horizontal lockup SVG (`public/SLATE 360-Color Lockup (1).svg`),
  height ~40px, with safe padding.
- Page body, vertically centered:
  - Large color icon (`public/slate360-icon-color.png`), 200-240px square,
    centered with subtle drop shadow / gentle rounded corners
  - Below the icon: sign-in card (existing components/auth components if
    present; otherwise build minimal email+password + "Sign in with Google"
    block using existing Supabase auth helpers)
  - Below the card: "New here? Create account" link → /signup
  - Below that: small "Forgot password?" link → /forgot-password
- Background: `bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900`
- "Stay signed in" checkbox on the form (default checked) — this is the
  default Supabase behavior already; just expose the toggle.
- After successful sign-in → redirect to `/dashboard`.

Build a reusable component:
- `components/auth/LoginCard.tsx` (the sign-in form, <200 lines)
- `components/brand/SlateIconHero.tsx` (the centered icon, accepts size + className)
- `components/brand/SlateLogoLockup.tsx` (the top wordmark SVG — variants: 'color' | 'reversed')

Auth handlers must use `createClient()` from @/lib/supabase/client (this is a
client component for the form; the wrapping page itself can be server-rendered
shell with the form as a child).

UNIT #5: BETA FEEDBACK WIDGET (full stack, beta testers only)
----------------------------------------------------------------

Files:
- `components/feedback/BetaFeedbackButton.tsx` — floating bottom-right
  button (only renders if profile.beta_tester === true). Pill style, label
  "Send Feedback", icon. Mobile: smaller round button.
- `components/feedback/BetaFeedbackModal.tsx` — opens on click. Form fields
  per spec (type radio, severity radio if type=bug, app_area auto-from URL,
  title, description, steps_to_reproduce, screenshot upload, info text
  showing what's auto-attached). Use existing Dialog primitive from components/ui.
- `app/api/beta-feedback/route.ts` — POST: zod-validated, inserts into
  beta_feedback table via createServerSupabaseClient (RLS allows authenticated
  insert). Returns the new row id. If screenshot file present, upload to R2
  bucket prefix `beta-feedback/{userId}/{uuid}.png` then store URL.
- Wire in `app/layout.tsx`: read profile.beta_tester server-side, pass to a
  client wrapper that renders BetaFeedbackButton conditionally.

Validation:
- type required (one of bug/feature/ux/performance/other)
- severity required only when type='bug'
- title 3-200 chars, description 5-5000 chars, steps_to_reproduce ≤5000 if present
- Screenshot optional, max 5 MB, image/* only
- Auto-attach: page_url, user_agent (navigator.userAgent), console_errors
  (last 50 captured via a window error listener — keep this list in a
  Provider mounted at root so the modal can read it on open)

UNIT #6: OPERATIONS CONSOLE — BETA FEEDBACK PANEL
----------------------------------------------------------------

Path: `app/(admin)/operations/feedback/page.tsx` (server component).

Gate: must check `isSlateCeo OR slate360_staff` (use existing helpers in
lib/server/org-context.ts and the join pattern shown in the SQL migration).
Otherwise redirect to /dashboard with a 403 toast.

Layout: 2-column.
- Left rail (260px): filter facets — Type checkboxes, Severity checkboxes,
  Status dropdown, App area dropdown, Date range, "Saved views" links
  (All Blockers, Last 24h, Open Bugs, Feature Requests, Resolved this week)
- Main area: list view (sortable table) + detail drawer when row clicked.
  Drawer shows full body, screenshot if present, console_errors as
  collapsible code block, status dropdown, admin_notes textarea, "Mark
  Resolved" button, "Copy as GitHub Issue" button. Decision (locked):
  GitHub issue creation is MANUAL ONLY — never auto-open issues from
  feedback submissions. The button copies a pre-filled markdown body
  (title, type/severity/app_area metadata header, description, steps,
  console_errors fenced code block, link back to feedback row) to the
  clipboard. Toast: "Copied — paste into a new GitHub issue."

Components to extract:
- components/operations/feedback/FeedbackFilters.tsx
- components/operations/feedback/FeedbackList.tsx
- components/operations/feedback/FeedbackDetail.tsx

API helpers:
- app/api/admin/feedback/route.ts — GET (list with filters), PATCH (update status/notes)
- All gated via withAuth + ctx.isSlateCeo OR staff check

================================================================================
APPROVED COPY — USE VERBATIM
================================================================================

(Same blocks as Round 1: BETA WELCOME MESSAGING, CREDIT POLICY. See
docs/REVIEW_PROMPT_FOR_OTHER_AI.md if needed; do not rewrite the wording.)

================================================================================
VALIDATION CHECKLIST PER COMMIT
================================================================================

1. `npm run typecheck` clean
2. `bash scripts/check-file-size.sh` — no file > 300 lines
3. Every new component must be imported and used somewhere (no orphan files
   — the #1 historic failure mode)
4. After each unit: emit "READY FOR REVIEW: UNIT #N" and pause
5. Use feature/<short-name> branch names if forking — but the orchestrator
   will integrate everything onto the main branch

================================================================================
OUTPUT FORMAT (per unit)
================================================================================

```
=== UNIT #N: <title> ===

COMMIT MESSAGE:
<conventional commit subject + body>

FILES:
--- path/to/file (NEW or MODIFIED) ---
<full content>
...

VERIFICATION:
<commands the orchestrator should run>

NOTES:
<anything deferred or assumed>

READY FOR REVIEW: UNIT #N
```

================================================================================
DO NOT
================================================================================

- Do NOT modify the foundation files listed in section 6.
- Do NOT add tests this round (separate unit later).
- Do NOT push to git directly — emit patches; orchestrator handles git.
- Do NOT invent helpers not specified — ask in NOTES if unsure.
- Do NOT alter SKU prices or names. The cost-model is locked.

When all 5 units delivered, end with:
"ROUND 2 COMPLETE. <N> commits, <M> files, ready for orchestrator integration."

================================================================================
LOCKED PRODUCT DECISIONS (apply throughout your code)
================================================================================

- **GitHub issue creation from beta feedback**: MANUAL ONLY. Never auto-open
  issues. The Operations Console exposes a "Copy as GitHub Issue" action that
  copies a pre-filled markdown body to the clipboard. The CEO/staff member
  pastes it manually into the GitHub issue tracker.
- **Foundational Member 20% lifetime discount**: REVOKED if the subscription
  lapses for more than 30 days. "Lifetime" means lifetime of continuous
  subscription, with a 30-day grace window for expired cards / accidental
  cancels. Implementation note for future entitlements/Stripe webhook work:
  on `customer.subscription.deleted`, schedule a 30-day timer; if no new
  active subscription by then, set `profiles.foundational_member = false`
  AND remove the FOUNDATIONAL_LIFETIME coupon from any future invoices.