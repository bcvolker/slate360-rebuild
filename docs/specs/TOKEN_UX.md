# Spec: Token UX (wallet, pre-flight estimate, buy-more, trial caps)

Status: **spec / planning** (no app code). The user-facing layer over the existing credit ledger.
Decisions locked: **UI says "tokens", backend stays "credits" (1:1)**; **subscription = margin,
overage tokens = at cost**; **trial = capped + card required**. See `PLATFORM_PRODUCT_PLAN.md` §6.

## 1. What exists vs the gap
- Exists: `credit_balance` (+ `monthly_allowance`), idempotent `deductCredits`/`addCredits`,
  `credit_transactions`, per-app + per-job metering (`*_usage_events`), and twin jobs already
  **charge on callback** (`computeTwinProcessingCredits`).
- **Gaps:** (1) **pre-flight check + estimate** before dispatch; (2) **buy-more** flow; (3) monthly
  **allowance reset**; (4) **trial hard-caps**; (5) low-balance notification.

## 2. Token wallet (surface)
A wallet reachable from the **header token chip** (all apps) and Account:
- Balance, this period's **allowance + used + remaining**, reset date.
- **Buy tokens** (at cost) — one tap.
- **Usage history** (from `credit_transactions` / `*_usage_events`): what consumed tokens, when.
- Enterprise: org pool + per-member/per-project consumption (links to Enterprise console).

## 3. Pre-flight estimate + confirm (the key gap)
Before dispatching ANY metered job, show an estimate and confirm:
> "This twin will cost **≈120 tokens**. You have **750**. [Process] [Cancel]"

Metered actions: twin processing, thermal processing, **voice transcription**, **AI enhancement**,
**PDF render**, media transcode, large/bulk exports, plan rasterization at scale.
Flow: client calls `POST /api/tokens/estimate` (reuses `computeTwinProcessingCredits`-style
estimators) → confirm → server **re-checks balance** and **reserves/decrements** before enqueuing
to Trigger → on success the existing callback reconciles actual vs estimate (idempotent). If
balance < estimate → block with a **buy-more** CTA.

## 4. Buy-more (at cost, frictionless)
Stripe **consumable** top-up priced at the underlying compute cost (no markup) → webhook →
`addCredits` (idempotent). One-tap from the estimate modal and the wallet. Optional **auto-refill**
threshold for power users/enterprise.

## 5. Trial caps (loss protection)
14-day trial = **card required** + a **small token cap** + **job size/count limits** +
**watermarked / low-res outputs**. Enforce at the pre-flight gate (trial users get a hard ceiling
and reduced output quality), so a flood of trials can't drain compute. Trial state + caps live with
entitlements (modular system).

## 6. Allowance reset & low-balance
- Scheduled Trigger task resets `monthly_allowance` at period boundary (idempotent;
  writes a `credit_transactions` reset row).
- **`token.low`** notification (via notification service) at configurable thresholds (e.g. 15%, 0).

## 7. UI components
- `TokenChip` (header, all apps) — balance + tap → wallet.
- `EstimateModal` — cost vs balance + confirm/buy-more.
- `WalletPage` — balance, usage history, buy, auto-refill.
- `LowBalanceBanner` — gentle nudge when near zero.

## 8. Build order
1. `estimate` endpoint + `EstimateModal` + **pre-flight gate** wired into job dispatch.
2. `TokenChip` + `WalletPage` (read existing ledger).
3. Buy-more (Stripe consumable → `addCredits`).
4. Trial caps at the gate (size/count/quality) + card-required.
5. Allowance reset task + `token.low` notification + auto-refill.

## 9. Open items
- Exact token↔compute pricing (CEO providing new numbers); keep all amounts **config-driven**.
- Reservation vs charge-on-callback for long jobs (lean: soft-reserve at dispatch, reconcile on
  callback).
