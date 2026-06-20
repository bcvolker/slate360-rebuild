# Slate360 Mobile — Locked Decisions, Monetization Model & Open Research

Status: **planning / research-gathering** (no nav refactor started yet — building is on hold
pending external fact-finding). This file is the durable source of truth for the mobile
realignment effort so decisions aren't lost between sessions.

## Locked product decisions (from CEO, 2026-06)

| # | Decision | Choice |
|---|----------|--------|
| 1 | Shell identity / switching | **Bottom-nav module swap** — inside Site Walk / Twin 360 the bottom nav swaps to that module's tabs with an accent strip; a top-bar app switcher may also remain. |
| 2 | Twin 360 in v1 | **Visible as a purchasable product, entitlement-gated** (not "hidden", not "coming soon"). |
| 3 | Bulk cleanup default | **Archive-first + Undo** (soft-delete recoverable); hard delete is the guarded secondary. |
| 4 | Build timing | **Hold** — gather research before the nav-truth refactor. |

## Monetization model (drives entitlements + home page)

- **Slate360 app is a FREE download.** Revenue is in-app purchase only.
- **Products / tiers:**
  - Site Walk — lower tier + higher tier
  - Twin 360 — lower tier + higher tier
  - **Bundle** — Site Walk + Twin 360
  - **Enterprise** — multi-seat; org admin assigns seats and controls permissions
- **14-day free trial, deliberately limited.** Cloud GPU processing is the dominant COGS;
  trial cost must be hard-capped so a flood of trial signups can't blow the budget.
- **Token / credit metering** for expensive cloud processing; each tier includes a token
  allotment, with overage pricing.
- **Target gross margin ≥ 90%.** Pricing and token economics must be modeled to hit this.
- **Home/marketing page must present real tiers, pricing, and token/processing economics**,
  and the platform enforces what the page advertises.
- **No "coming soon" surfaces** for future apps (App Store rejects unfinished UI). But the
  **entitlement architecture must scale** to add new products later with zero rework.

### Architectural implications (to design, not yet build)
- An **entitlement/licensing layer**: products → plans/tiers → org/user entitlements →
  per-org **seats** → **token wallet/ledger** for metered jobs → trial state with caps.
- **Receipt reconciliation** from Apple StoreKit + Google Play server notifications into
  entitlements.
- **Feature/route gating** keyed off entitlements (Twin 360, higher-tier features, token
  balance) — generic enough that adding "App N" later is config, not new gating code.
- **Trial cost controls** wired into the Trigger.dev → Modal dispatch path (hard token
  caps, job size/count limits, possibly watermarked/low-res trial outputs).

## Consensus blueprint (from 5 external AI reviews — high confidence)

1. **Two-layer chrome.** Bottom nav = shell identity; top bar = context + back/exit;
   capture strips both and uses a minimal header with a *confirmed* Exit (never raw
   browser-back).
2. **One "Start Walk" sheet:** pick/create project → optional plan → mode → camera. Retire
   `/site-walk/setup` as the primary path.
3. **Archive-first cleanup** with Undo, multi-select, "Move to project"; soft-delete
   (`deleted_at`) under the hood.
4. **Ghost = project-scoped progression:** GPS **+ plan-pin fallback** indoors, date-grouped
   large thumbnails, opacity overlay, **before/after pairing → server-generated progression
   report**; compass/angle hint is P2.
5. **Merge concepts:** quick-walk vs project-walk = one flow with variants; "Worksite" =
   "Project"; one capture stack (retire v1); tiers share UI with different required fields.
6. **Route manifest + CI guard** so nothing renders outside the shell or off-brand; blocked
   routes redirect (no dead buttons / no 404 placeholders).
7. **Twin 360 mobile = capture + upload + job status only.** No on-device reconstruction.

## Reconciliation with what's already shipped (branch `claude/app-screenshot-issues-j7poa8`)

| Shipped | Consensus | Follow-up |
|---------|-----------|-----------|
| Top-bar shell switcher (`MobileShellSwitcher`) | Identity belongs in bottom nav | Add **bottom-nav module swap**; keep switcher as secondary |
| Bulk delete defaults to **permanent** | Archive-first + undo | **Flip default to archive**, add Undo toast + "Move to project" |
| Ghost: GPS picker + opacity (`useGhostProgression`, `CaptureCanvasGhostPicker`) | + plan-pin fallback, date grouping, pairing, report | Roadmap extensions (current = the MVP they describe) |
| Amber `WalkStartChoice` removed + auto-select | ✅; but amber is pervasive | Schedule **graphite token rebrand** (amber used across ~10+ capture-v2 files + `/site-walk/walks`) |
| — | Active-tab bug; dead components | Fix `resolveMainMobileTabKey` (`/site-walk` & `/digital-twin` fall through to `home`); remove confirmed-dead `components/shared/MobileBottomNav.tsx` + `DashboardV3Shell` |

### Corrections to external reviewers' repo claims (verified in-repo)
- **`SiteWalkNav` is NOT dead** — imported by legacy `Session*Client` (v1 capture). Only
  removable after v1 capture is retired.
- **Amber is not isolated** to one screen; it's a token-level accent across capture-v2 +
  walks page → it's a rebrand, not a delete.
- **Active-tab bug confirmed** (`mainMobileTabs.ts` returns `"home"` for module routes).

## Recommended build sequence (when un-held)
- **Phase 0 — Nav truth:** active-tab fix; one capture task-header w/ Back-vs-Exit contract;
  bottom-nav module swap + accent strip; delete confirmed-dead components.
- **Phase 1 — Start Walk:** single sheet; mobile project detail + Start-Walk CTA; remember
  last project (≤4 taps to camera).
- **Phase 2 — Cleanup + Ghost:** archive-first + undo + move-to-project; ghost plan-pin
  fallback + date grouping + pairing.
- **Phase 3 — Reports + hygiene + commerce:** progression report (server PDF); route
  manifest + CI guard; amber→graphite rebrand; **entitlement layer + pricing home page +
  token metering + trial caps**.

## Open research (fact-finding prompts to send to external AI tools)

### UX / architecture (sent)
- A — Competitive nav patterns (Fieldwire, Autodesk Build, Procore, Raken, CompanyCam, OpenSpace, Disperse).
- B — PWA offline capture queue (IndexedDB + Background Sync + iOS limits).
- C — Indoor photo re-localization for ghost mode (plan-pin, EXIF heading, compass, server VPR).
- D — Shipping a capture PWA to App Store / Play (Capacitor vs TWA vs PWABuilder; review pitfalls).

### Monetization / entitlements (new — see chat for full text)
- E — App Store / Play IAP & subscription compliance for metered cloud + B2B/enterprise seats + consumable tokens.
- F — Usage-metered pricing & packaging to hit ≥90% gross margin (token model + unit economics).
- G — Free-trial abuse prevention & hard cost-capping for expensive GPU jobs.
- H — Multi-product / multi-tier / seat / token **entitlement architecture** (Supabase + IAP receipt reconciliation, scalable to future apps).
