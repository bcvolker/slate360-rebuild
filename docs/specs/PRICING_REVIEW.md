# Critical Pricing Review & Recommendations

Status: **planning / review** (no app code). Critical review of tiers, bundles, competitiveness,
and margin, per CEO request. Decision: keep placeholder numbers unless a change is warranted —
recommendations below.

## 0. ⚠️ Blocking finding: two conflicting price tables
| App / tier | `entitlements-modular.ts` | `lib/billing/cost-model.ts` |
|---|---|---|
| Site Walk basic/std | $79 | $79 |
| Site Walk pro | **$149** | **$129** |
| Twin basic / pro | $99 / $249 | (not present) |
| Tours std / pro | $49 / $99 | **$119 / $199** |
| Design / Content | $49 / $99 | $119 / $199 |
| Bundle (SW+Twin) | $349 | (project/studio/total bundles, different) |
**Action:** during entitlement consolidation, collapse to ONE table = the numbers the **live
website** shows (CEO to confirm which). Everything below assumes the **modular** table as the
working baseline (it matches the two-app focus + the system-of-record decision).

## 1. Competitor landscape (2026)
| Product | Model | Price | Focus |
|---|---|---|---|
| **CompanyCam** | per user, **3-user min** | Pro **$79**/user, Premium **$129**/user (+$29/extra) | photo/video documentation (closest to Site Walk) |
| **Fieldwire** | per user | Free; Pro **$39**, Business **$64**, Business+ **$89** (annual) | plans/tasks/punch |
| **Raken** | per user | ~**$12–15**/user start, quote above | daily reports |
| **Procore** | ACV-based | **$375–3,000**/user-equiv (~$15k–80k/yr) | enterprise GC platform |
| **Matterport / reality capture** | per license + capture | ~$10–69+/mo plus capture/credits | 3D twins (closest to Twin 360) |

Sources: [CompanyCam review](https://fieldcamp.ai/reviews/companycam/),
[CompanyCam pricing](https://companycam.com/pricing),
[Fieldwire pricing](https://projul.com/blog/fieldwire-pricing-breakdown/),
[Raken](https://research.com/software/reviews/raken),
[Procore](https://projul.com/blog/procore-pricing-analysis-2026/).

## 2. Critical analysis
**Site Walk is competitively priced — and structurally better for small crews.** CompanyCam (the
closest comp) starts at a **3-user minimum** → ~$237/mo floor (Pro) or ~$387 (Premium). Slate360
Site Walk includes **1 seat from $79**, so solo operators and 2-person crews pay far less to start.
Site Walk Pro at $129–149 (1 seat) undercuts CompanyCam Premium's $387 floor. **Verdict: keep; lead
marketing with "starts at 1 seat," not 3.**

**Twin 360 is the differentiator and the margin risk.** Nobody in the photo-doc comp set sells
phone/drone Gaussian-splat twins at this price; Matterport is the rough comp. $249 Pro is defensible
**only if the token allowance is sized so a full-burn month stays ≤10% of net revenue** (twins carry
real GPU COGS). This is exactly why the **at-cost overage token** model matters (see §3).

**Bundle ($349 = SW Pro $149 + Twin Pro $249 → saves $49 / 12%).** Reasonable; could go to ~$329 to
push bundle adoption. Keep $349 for now.

**Gaps vs competitors:**
- **No annual option in the modular table.** Competitors lean annual. **Add annual = 2 months free**
  (cost-model already encodes 10× monthly). Recommend everywhere.
- **No cheap entry tier** (Fieldwire free/$39, Raken ~$12) for solo trades. Slate360's $79 floor is
  defensible because of GPU COGS, but consider a future **"Solo/Lite"** capture-only tier (no/low
  tokens) to capture price-sensitive small operators without exposing compute margin.

## 3. Margin model — why monthly stays competitive AND margin holds ~90%
**Margin lives in the subscription allowance; overage is at cost.** Keep monthly prices in the
CompanyCam band ($79–149 Site Walk) and size the included token allowance so a **typical** user
stays within it → near-100% margin on light usage. **Heavy users buy more tokens at cost** → you
never go upside-down on GPU, and the headline price stays competitive.

Worked logic (illustrative, pending real per-token COGS):
- Token retail ≈ **$0.10**; GPU COGS ≈ **$0.01–0.018/token**.
- Twin Pro $249, allowance 2,000 tokens. Full-burn COGS ≈ $20–36 → **86–92% gross** even before
  overage. With web (Stripe ~3%) net ≈ $241; with iOS IAP at 15% (Small Business Program) net ≈
  $212 → still **~83–90%** at full burn, higher at typical usage.
- **To finalize:** I need the **real per-twin/per-job GPU COGS** to set each tier's allowance so
  full-burn ≤ 10% of net. Until then, the config numbers are safe placeholders.

## 4. Stripe vs in-app purchase (compliance — important)
CEO wants **Stripe live (business account, not sandbox)**. Correct for **web**. But:
- **Web checkout → Stripe** (subscriptions + at-cost token packs + enterprise invoicing). ~2.9%+30¢.
- **In-app (iOS/Android) → must use StoreKit / Play Billing** (Apple/Google require IAP for digital
  goods consumed in-app; selling via Stripe inside the app violates Apple 3.1.1). Use **RevenueCat**
  to unify both into one entitlement.
- **Don't steer iOS users to web checkout from inside the app.** Marketing site can.
- Both Stripe and IAP feed the **same entitlement layer** (`org_subscriptions` + `token_wallet`).

## 5. Launch sequencing (CEO decision)
1. **TestFlight / invite-only beta:** monetization **dormant** (no purchases); test capture, offline,
   reports with seeded orgs. Matches existing V1 doctrine for the beta phase.
2. **On App Store / Play acceptance → monetized public launch:** flip on entitlements + token ledger
   + pre-flight + trial caps; **Stripe live (business account)** for web; StoreKit/Play (RevenueCat)
   for in-app. Loss-protection is live from the first paid day.

## 6. Recommendations summary
1. **Reconcile to one price table** (confirm which the website shows; retire the other).
2. **Keep Site Walk $79 / $129–149** — competitive; lead with "1 seat included."
3. **Add annual (2 months free)** across all tiers.
4. **Keep Twin $99 / $249 + bundle $349**, but **size token allowances from real GPU COGS** so
   full-burn ≤10% of net.
5. **Web=Stripe, in-app=IAP via RevenueCat**, one entitlement layer; enterprise = Stripe invoice + quote.
6. **Consider a future Solo/Lite tier** to compete with Fieldwire/Raken at the low end.
7. **What I need from you:** which table the website uses, and **real per-job GPU COGS** to lock allowances.
