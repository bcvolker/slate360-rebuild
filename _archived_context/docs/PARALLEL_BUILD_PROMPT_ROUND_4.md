# Parallel Build Prompt — Round 4 (Beta Mode + Subscription Gating + Production Polish)

> Branch: `refactor/brand-token-migration-core-surfaces` (now MERGED to main).
> Continue work on a NEW branch off main: `feat/beta-mode-subscription-gating`.
> Default base for all PRs: `main`.

> CONTEXT: Round 1+2+3 prompts still apply (re-read if needed). Live production
> now has cobalt branding, default-open sidebar, and "Get the App" hero CTA.
> The user is testing on the live site, not preview.

---

You are continuing the Slate360 build. Round 4 focuses on **putting the
platform into BETA MODE** — the workflow exists end-to-end but monetization
is visibly disabled until launch. The user explicitly wants to test the full
flow without being charged.

================================================================================
ALL PRIOR CONVENTIONS APPLY
================================================================================

Re-read these if anything is unclear:
- `docs/PARALLEL_BUILD_PROMPT_ROUND_2.md` (auth, response helpers, types,
  locked decisions on GH issues + 30d lifetime grace)
- `docs/PARALLEL_BUILD_PROMPT_ROUND_3.md` (mobile shell at `/app`, amber sweep,
  dashboard decongest)

Reminders:
- Auth: `withAuth(req, handler)` / `withProjectAuth(req, ctx, handler)`.
  Tier via `ctx.entitlements.tier`.
- Response helpers ONLY: ok / created / noContent / badRequest / unauthorized /
  forbidden / notFound / conflict / serverError.
- DB: `credit_ledger.organization_id|delta|category`,
  `slate360_staff` keyed by `email`.
- No `any`, no file >300 lines, one component per file.
- DO NOT modify api-auth, api-response, org-context, api-app-access,
  cost-model.ts.

================================================================================
WORK UNITS — BUILD IN ORDER
================================================================================

UNIT #13: GLOBAL BETA MODE FLAG
----------------------------------------------------------------

Single source of truth: `lib/beta-mode.ts`

```ts
export const BETA_MODE = process.env.NEXT_PUBLIC_BETA_MODE !== "false";
export const BETA_TESTER_CAP = 100;

export function isBetaMode(): boolean { return BETA_MODE; }

// Grayed-out CTA copy used everywhere monetization is disabled.
export const BETA_DISABLED_LABELS = {
  subscribe: "Subscribing opens at launch",
  upgrade: "Upgrade unlocks at launch",
  buyCredits: "Credit packs unlock at launch",
  addCollaborator: "Add seats at launch",
} as const;
```

Add `NEXT_PUBLIC_BETA_MODE=true` to `.env.local` and `.env.example`. Document
in `docs/ENV_AND_TOOL_MATRIX.md` that flipping this to `false` enables
monetization sitewide.

UNIT #14: GRAY OUT MONETIZATION CTAs
----------------------------------------------------------------

Wrap every "Subscribe" / "Upgrade" / "Buy Credits" / "Add Seat" button with a
shared component:

`components/billing/BetaGatedButton.tsx` — client component, ~40 lines:
- Props: `variant`, `action: 'subscribe' | 'upgrade' | 'buyCredits' | 'addCollaborator'`,
  `children`, `className`.
- If `isBetaMode()`: render disabled button with `cursor-not-allowed opacity-60`
  + `Tooltip` showing the matching `BETA_DISABLED_LABELS[action]` + a small
  cobalt "Beta" badge in corner.
- If NOT beta: render normal button passing through props (use a
  `renderEnabled` prop returning the real `<Button>` so callers control
  the actual enabled element).

Apply across:
- `app/(dashboard)/plans/page.tsx` — all subscribe/upgrade buttons
- `components/marketing-homepage.tsx` — app-card "Subscribe" buttons (line ~601)
  and pricing-section CTAs (line ~709, ~817, ~947)
- `components/dashboard/credits/CreditPurchasePanel.tsx` (if exists; create the
  panel as part of UNIT #16 if not)
- Any "Add Collaborator" / "Add Seat" UI

The "Create Account" / "Get the App" / "Sign In" / "Start Trial" CTAs are NOT
monetization — leave those fully enabled.

UNIT #15: BETA SIGNUP FLOW (NO CARD REQUIRED)
----------------------------------------------------------------

When `isBetaMode()`:
- `/signup` route: skip Stripe step entirely. After email verification,
  insert into `profiles` with `beta_tester=true`, `foundational_member=true`,
  `beta_joined_at=now()`, `foundational_granted_at=now()`. Cap at
  `BETA_TESTER_CAP` (count `WHERE beta_tester=true`). If cap reached, redirect
  to `/beta-pending` with copy "Beta is full — you're on the waitlist."
- New user gets default entitlements: `tier='trial'`, all apps unlocked, with
  beta limits from `lib/billing/cost-model.ts` BETA_LIMITS (10 GB / 20
  renders / 500 credits / 3 collaborators).
- New API route: `app/api/beta/join/route.ts` — POST handler using `withAuth`,
  performs the cap check + profile flagging, returns `ok({beta: true, foundational: true})`.

Do NOT touch the post-beta paid flow code paths — only branch on `isBetaMode()`
at the top of `/signup` server action and route handlers.

UNIT #16: CREDIT BALANCE & USAGE DISPLAY (READ-ONLY DURING BETA)
----------------------------------------------------------------

`components/dashboard/credits/CreditMeter.tsx` (~80 lines, client):
- Reads from `credit_balance` table for current org via
  `lib/credits/get-balance.ts` server helper (NEW, ~30 lines, uses admin client).
- Renders compact pill in dashboard top-bar: "🔋 384 / 500 credits"
- Click opens a Sheet (right-side) with: balance breakdown + recent ledger
  entries from `credit_ledger` (last 20, ordered by `created_at desc`) + a
  BetaGatedButton "Buy More Credits".

`components/dashboard/credits/CreditLedgerList.tsx` (~60 lines, client):
- Table with columns: When (relative), What (category), Amount (delta with +/-
  color), Balance After.

Mount the meter in `DashboardTopBar.tsx` to the LEFT of the notifications bell.
Hide on mobile (lg:flex).

UNIT #17: BETA STATUS BANNER
----------------------------------------------------------------

`components/beta/BetaBanner.tsx` (~50 lines, client):
- Slim cobalt strip below the dashboard top bar (NOT the homepage).
- Copy: "🚀 You're a Beta Founder — your usage is free. Foundational pricing
  locks in when subscriptions open. [Send feedback]"
- "Send feedback" button opens the BetaFeedbackModal from Round 2 UNIT #5.
- Dismissable per-session (sessionStorage `slate360.betabanner.dismissed`).
- Renders only when `profile.beta_tester === true` AND `isBetaMode()`.

Mount in `app/(dashboard)/layout.tsx` immediately above the main content area.

UNIT #18: PRICING PAGE — BETA STATE
----------------------------------------------------------------

`app/(dashboard)/plans/page.tsx`:
- When `isBetaMode()`: at top of page, prominent cobalt card:
  "Pricing locks at launch. Foundational members get 50% off year 1 + 20% off
  for life (revoked if subscription lapses >30 days)."
- All plan cards stay visible (so user can see what's coming) but every
  Subscribe/Upgrade button uses BetaGatedButton.
- Add small "Beta — Free" badge to the user's currently-active row.

UNIT #19: PRODUCTION SMOKE TEST CHECKLIST
----------------------------------------------------------------

Create `docs/BETA_PRODUCTION_SMOKE.md` documenting the manual walkthrough
the user (Brett) will run on the live site:

1. Visit `slate360.io` → see graphite SLATE logo, cobalt 360, "Get the App
   — Free" hero CTA.
2. Click "Get the App — Free" → land on `/signup?next=/app`.
3. Sign up → email verification → land on `/app` mobile shell (or
   `/dashboard` if desktop).
4. See "🚀 You're a Beta Founder" banner.
5. See "🔋 500 / 500 credits" pill in top bar.
6. Click any "Subscribe" button → see disabled state + tooltip "Subscribing
   opens at launch."
7. Submit beta feedback → confirm row appears in `beta_feedback` table.
8. Capture a Site Walk → verify credits decrement.
9. Sign out → log back in → entitlements + credits persist.

================================================================================
LOCKED PRODUCT DECISIONS (UNCHANGED)
================================================================================

- GitHub issue creation from beta feedback: MANUAL ONLY.
- Foundational 20% lifetime: REVOKED if subscription lapses >30 days.
- Beta tester cap: 100.
- Beta limits (per profile): 10 GB storage, 20 renders, 500 credits, 3 collaborators.

================================================================================
VALIDATION + OUTPUT FORMAT — UNCHANGED FROM ROUND 2/3
================================================================================

Per unit: emit a code block with COMMIT MESSAGE / FILES / VERIFICATION /
NOTES / "READY FOR REVIEW: UNIT #N", then pause.

When all 7 units delivered, end with:
"ROUND 4 COMPLETE. <N> commits, <M> files, ready for orchestrator integration
+ production merge."
