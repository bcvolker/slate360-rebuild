# Slate360 Platform Product Plan — Shells, Screens, Projects, Tokens, Enterprise

Status: **planning** (building still on hold). Companion to
`MOBILE_UX_DECISIONS_AND_MONETIZATION.md`. Grounded in a full route inventory +
data-model/entitlements audit of the repo (2026-06).

---

## 0. Mental model (the one idea everything hangs on)

**Project = the shared spine. Apps are lenses onto it. Tokens meter the expensive parts.**

- A **Project** holds identity once: name, client, **logo/branding**, **location/geo**,
  **plans (PDFs)**, **team + permissions**, folders/files. It already lives in a single
  `projects` table that **both** Site Walk and Twin 360 require (`project_id` NOT NULL on
  `site_walk_sessions` and `digital_twin_spaces`). So "shared projects across apps" is not
  a thing to build — it's a thing to **surface and make consistent**.
- **Mobile apps = capture + light interaction only.** **Desktop web = power features**
  (project setup, plan management, deliverable/report building, twin editor/cinematic,
  enterprise admin + oversight, analytics).
- **Tokens = loss protection.** Anything that burns cloud GPU/CPU (twin processing, thermal,
  large exports, transcode) costs tokens. Light capture/interaction is free. Subscriptions
  carry a **generous monthly token allowance** (margin lives here); when exhausted, buying
  more tokens is **frictionless and at cost** (pure pass-through, not a profit center). This
  keeps gross margin high on subscriptions while protecting Slate360 from runaway compute and
  building user trust ("we don't gouge your overages").
- Backend already calls these **credits**; brand them **"tokens"** in the UI (1 token = 1
  credit). Keep the ledger; rename only the user-facing label to avoid churn.

---

## 1. Current state (grounded reality check)

### What's solid
- ~119 routes; most core screens are real. Single shared `projects` table + cross-app FKs.
- Token/credit ledger, per-app + per-job metering, Twin job credit charge-on-callback.
- Modular per-app subscriptions, Stripe SKUs, seat assignment, org RBAC, collaborator invites.
- Three-act Site Walk structure (Setup / Inputs / Outputs) — good bones.

### What's duplicated / legacy (consolidate or cut)
- **Two entitlement systems**: `lib/entitlements.ts` (legacy tiers) vs
  `lib/entitlements-modular.ts` (per-app). → **Pick modular; deprecate legacy.**
- **Two capture stacks**: `/site-walk/capture` (v1, used by `Session*Client` + `SiteWalkNav`)
  vs `/site-walk/capture-v2`. → **Retire v1 after v2 parity is confirmed.**
- **Worksites vs Projects** terminology; `/site-walk/setup` vs a start sheet; `/projects/[id]/people`
  vs `/team` (duplicate tabs).
- Legacy/dead: `components/shared/MobileBottomNav.tsx`, `DashboardV3Shell`, `_dashboard-legacy`,
  `/site-walk-v1-preview`, `/tours` (redirect), `unreal-studio` (stub).

### Stubs / partials to finish (by priority later)
- Twin: `twins/[id]/editor`, `/cinematic`, `/progression`, `capture/review` (desktop power).
- Site Walk: `/reports` (info page, no list), `/deliverables/new` (redirect only).
- Mobile: `/projects/new` (thin), `/coordination` hub + `/calendar` (stubs).
- **Missing entirely**: a real **pricing/home tier page**, **enterprise admin/oversight console**,
  **pre-flight token check + estimate UX**, **deliverable builder** beyond list.

---

## 2. App shells & navigation (carries prior locked decisions)

Decisions already locked (see other doc): **bottom-nav module swap** for shell identity;
archive-first cleanup; Twin 360 = entitlement-gated purchasable product; one capture header
with a Back-vs-Exit contract.

- **Slate360 shell (mobile)** = launcher + shared surfaces: Home, Projects, Files, Activity,
  Account. Tapping Site Walk / Twin enters that module; bottom nav swaps to module tabs +
  accent strip so "which app am I in" is unmistakable.
- **Site Walk module nav**: Walks · Plans · Start (center) · Reports · More.
- **Twin 360 module nav**: Twins · Sets · Capture · More.
- **Capture mode**: strips both nav layers; minimal header; **Exit = confirmed**, never raw back.
- **Desktop** = full dashboard shell (project detail tabs, admin, analytics, twin editor) —
  the "power" tier of every feature.

---

## 3. Per-app: keep / change / remove / add

### Slate360 shell
- KEEP: launcher, Projects, Files (SlateDrop), Account.
- CHANGE: Home becomes a **smart launcher** — "Continue walk", "Resume twin job", token
  balance chip, recent projects — not a duplicate project list.
- ADD: **token wallet** surface (balance, this month's usage, buy-more), **pricing/upgrade**
  entry, notifications for job-complete / low-tokens.
- REMOVE from mobile: Coordination/Calendar stubs (hide until real), legacy dashboard routes.

### Site Walk (mobile = capture; desktop = manage)
- KEEP: walks list, capture-v2, walk review, progression, deliverables list.
- CHANGE: **one Start Walk sheet** (pick/create project → optional plan → mode → camera),
  replacing the buried `/site-walk/setup` path. Merge "Worksite" → "Project".
- ADD (mobile): archive-first bulk cleanup + undo + move-to-project; ghost plan-pin fallback;
  offline capture queue + sync chip; resume-last-walk banner.
- ADD (desktop): deliverable/report **builder** (drag/arrange photos, before/after pairs,
  branding from project logo), report list.
- REMOVE: v1 capture stack + `SiteWalkNav` + `Session*Client` once v2 has parity.

### Twin 360 (mobile = capture+upload+status; desktop = view/edit)
- KEEP: capture flow, upload panel, twins list, share viewer, **credit charge on job callback**.
- CHANGE: hub shows **job status** prominently ("Processing… 47%"), token cost shown up front.
- ADD (mobile): capture-set naming, coverage HUD, upload progress/retry, "link set to project".
- ADD (desktop): finish `editor` / `cinematic` / `progression` (these are desktop power tools,
  not phone features); twin-to-twin progression compare.
- REMOVE: any on-device reconstruction ambitions (cloud only — already the case).

### Projects (shared spine — mostly surfacing)
- KEEP: single `projects` table, NOT NULL cross-app FKs, folders, members, plans, files.
- CHANGE: make the **mobile project detail** real (`/projects/[id]`): header (logo, location,
  client), tabs Walks · Twins · Plans · Files · Team, and a prominent **Start Walk / Start
  Capture** CTA. Desktop gets the full version (settings, permissions, analytics).
- ADD: project **branding** (logo, colors) that flows into deliverables/reports automatically;
  project **location/geo** that seeds ghost-mode + map; one **create-project wizard** (mobile
  short form; desktop full).

---

## 4. Project creation — what it holds & how it carries across apps

A project is created once and **everything inherits from it**. Recommended fields:

- **Identity**: name, client/owner, project number/job code, status, type (field vs full).
- **Branding**: logo, accent color → auto-applied to deliverables, reports, share viewers.
- **Location**: address + lat/lng + optional boundary → seeds maps, ghost-mode GPS, weather log.
- **Plans**: uploaded PDFs (`site_walk_plan_sets`) → available to walk-with-plans AND twin
  georef.
- **Team & permissions**: members (`project_members.role_id`), collaborator invites (external
  trades), per-folder permissions.
- **Storage**: provisioned folder tree (`project_folders`) shared by SlateDrop, Site Walk, Twin.

Carry-over rules: Site Walk and Twin both **read the same project header**. A walk, a twin
capture, plans, and files all reference one `project_id`, so logos/location/plans/team are
automatically consistent — no per-app copies. The work is **UI consistency**, not new plumbing.

---

## 5. Deliverables & final-layout screen

The "deliverable" is the payoff. Recommended model:

- **Builder (desktop-first, mobile-quick)**: pick a walk/twin/project → choose a template
  (Site Report, Punch List, Progression/Before-After, Twin Share) → auto-pulls project
  branding (logo/colors) + photos/notes/pins → arrange → export.
- **Server-side render** (Trigger.dev, never on device) → PDF / web link; charges tokens for
  heavy exports.
- **Final layout**: cover (logo, project, date, author) → summary stats → sections by
  location/stop → **before/after pairs** (from ghost progression) → annotated photos → notes
  → sign-off. Output: shareable token-gated web link (`/share/deliverable/[token]` exists) +
  PDF.
- ADD: a **report list** (replace the current info-only `/site-walk/reports`), `deliverables/new`
  builder (replace redirect), and a mobile "Generate report" one-tap from walk review.

---

## 6. Token economics & loss protection (reconcile margin vs at-cost)

- **Subscription = margin.** Each tier (per-app basic/pro, bundle, enterprise) includes a
  **generous monthly token allowance**. Most users never exceed it; the subscription fee
  carries the ≥90% target margin.
- **Overage tokens = at cost.** Buying more tokens is one tap and **priced at the underlying
  GPU/CPU cost** (no markup). This is the "protection from losses" lever: the user pays the
  marginal compute cost, Slate360 is never upside-down on a heavy user, and trust stays high.
- **What costs tokens**: twin processing (already metered), thermal, large/bulk exports,
  transcode, plan rasterization at scale. **What's free**: capturing photos, notes, browsing,
  light review.
- **Gaps to wire** (backend mostly exists):
  1. **Pre-flight check + estimate**: before dispatching a job, check balance and show
     "This twin ≈ 120 tokens · you have 750" → confirm. (Today credits are charged on
     *callback*; there's no pre-flight gate.)
  2. **Monthly allowance reset** (`credit_balance.monthly_allowance` exists; add the reset job).
  3. **Trial hard caps**: trial = tiny token cap + job size/count limits + watermarked/low-res
     outputs, so a flood of trials can't drain compute budget.
  4. **Buy-more-tokens flow** (Stripe consumable) wired to `addCredits`.
- **UI term**: show "tokens"; ledger stays "credits".

---

## 7. Enterprise (desktop-level — seats, permissions, oversight)

Foundation exists (org RBAC, `org_member_app_access`, seat limits, collaborator invites).
Add a **desktop Enterprise Admin Console** (never on the phone):

- **Seats & licensing**: assign/revoke per-app seats to members; see seats used/available;
  negotiated/enterprise pricing handled as a custom SKU (`enterprise` already in the SKU enum).
- **Permissions matrix**: per-member, per-project, per-app roles (owner/admin/member/viewer)
  + per-folder upload/download controls (already in `project_folders`).
- **Oversight/audit**: dashboards of who did what — walks captured, twins processed, tokens
  consumed by member/project, exports/shares created. Source data already exists in
  `*_usage_events` + activity logs; needs an admin reporting UI.
- **Org token pool**: enterprise tokens shared across seats with per-member/per-project caps
  and alerts.
- **Negotiation/quotes**: enterprise tier supports custom seat counts + token pools; surface a
  "Contact sales / request quote" path on the pricing page (not self-serve checkout).

---

## 8. Mobile-light vs desktop-power split (explicit)

| Capability | Mobile | Desktop |
|---|---|---|
| Capture (walk/twin), notes, ghost, queue | ✅ primary | view |
| Start walk / quick create project | ✅ short form | ✅ full wizard |
| Project mgmt (plans, branding, permissions) | view + light | ✅ full |
| Deliverable/report **building** | quick one-tap | ✅ full builder |
| Twin editor / cinematic / progression | view | ✅ power tools |
| Enterprise admin / oversight / analytics | ✗ | ✅ only |
| Token wallet / buy tokens | ✅ | ✅ |
| Billing / seat assignment | view | ✅ manage |

---

## 9. Recommended sequence

- **Phase 0 — Nav truth + dedupe** (locked decisions): bottom-nav module swap, active-tab fix,
  one capture header, delete confirmed-dead code, pick modular entitlements.
- **Phase 1 — Project spine + Start Walk**: real mobile project detail, one Start Walk sheet,
  branding/location flowing into apps.
- **Phase 2 — Cleanup + Ghost + Tokens-MVP**: archive-first cleanup; ghost plan-pin fallback +
  pairing; **pre-flight token check + estimate UX + buy-more flow + trial caps**.
- **Phase 3 — Deliverables + Pricing + Enterprise**: deliverable/report builder; **pricing/home
  tier page**; enterprise admin + oversight console; monthly token reset.
- **Phase 4 — Twin power + hygiene**: finish twin editor/cinematic/progression (desktop);
  retire v1 capture; route manifest + CI guard; amber→graphite rebrand.

---

## 10. Open strategic decisions (to discuss)

1. **Entitlements consolidation**: confirm modular (`entitlements-modular.ts`) is the system of
   record and legacy `entitlements.ts` is deprecated.
2. **Pricing source of truth**: the modular per-app prices ($79/$149 Site Walk, $99/$249 Twin,
   $349 bundle) — are these current, or should the pricing page drive new numbers?
3. **Token = credit rename** in UI only — confirm.
4. **Trial shape**: token cap + output limits acceptable? Card required to start trial?
5. **Enterprise pricing**: fully custom/quote-based (sales-assisted) vs published enterprise tier.
6. **Capture v1 retirement**: OK to plan v2-only once parity is verified?
