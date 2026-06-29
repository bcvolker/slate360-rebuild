# Slate360 — Pricing, Tier Differentiation & Cost-Protection Strategy (Jun 29 2026)

**Status: STRATEGY + LAUNCH CHECKLIST.** Synthesized from a full read-only audit of the live
entitlement/credit/cost code. Most fixes below live in **forbidden-edit zones** (billing, entitlements,
Stripe, migrations) — Brian applies them; Claude prepares SQL/spec. Numbers are the CURRENT in-code
values (`lib/entitlements-modular.ts`), to be confirmed/tuned against real Modal GPU + R2 costs.

## 1. Current tier values (in code today)
| Plan | Storage | Credits/mo | Price | Notes |
|---|---|---|---|---|
| **Trial (14-day)** | 0.5 GB | 25 (intended) | $0 | every app `active` but `tier:none` |
| **Site Walk basic** | 5 GB | 200 | $79 | |
| **Site Walk pro** | 25 GB | 750 | $149 | +360 photos, walks-with-plans, collaborators, 360-on-plan |
| **Twin 360 basic** | 25 GB | 500 | $99 | |
| **Twin 360 pro** | 125 GB | 2000 | $249 | high-quality reconstruction |
| **Bundle (field_pro / all_access)** | 150 GB | 2750 | $349 | = SW Pro + Twin Pro; saves $49/mo |
| Storage add-ons | +10 GB / $9 · +50 GB / $29 | | | |

## 2. Tier DIFFERENTIATION — what the lower vs higher tier should mean (recommendation)
The differentiator must be **capability + capacity**, gated server-side, visible-but-locked in UI.

**Site Walk — lower (basic):** no-plan walks, photos, notes, voice, basic deliverables (PDF + share
link), single user, 5 GB. **higher (pro):** **360 photos**, **walks-with-plans** (plan pinning,
additive, **360-on-plan**), **collaborators** (start 3), bigger storage + credits, evidentiary
Certified Export. *(These pro gates already exist + are enforced — `can360OnPlans`, `canWalkWithPlans`,
`canAssignCollaborators`.)*

**Twin 360 — lower (basic):** standard-quality reconstruction, smaller capture sets, single user,
25 GB, model file + basic share link. **higher (pro):** **high-quality reconstruction** (1.35× credits /
1.82× GPU time — the real cost driver), larger captures, LiDAR fusion, more credits, 125 GB, advanced
share (annotate/measure roles), progression/cinematic. *(High-quality is already entitlement-gated to
Twin Pro.)*

**Bundle value:** today it's only a $49/mo discount over buying both pros. **Recommendation:** make the
bundle compelling beyond price — e.g. a **shared storage pool**, **cross-app credits**, a **seat**, or
**cross-app workflows** (a Site Walk → Twin handoff). Otherwise the bundle is a weak SKU.

**Free 14-day trial:** must be genuinely limited — tiny storage (0.5 GB), a small one-time credit grant
(enough for ONE small twin or a few AI actions), watermarked/limited deliverables, no high-quality
processing. The trial's job is to demonstrate value, not absorb GPU cost.

## 3. COST-PROTECTION — the audit's findings (heavy-user / money-loss risks)
Ranked. Items 1–6 are the defensible-pricing prerequisites before `NEXT_PUBLIC_BETA_MODE=false`.

1. **No credit HOLD at enqueue + no per-org GPU concurrency/spend cap (TOP RISK).** Twin credits are
   checked at enqueue but only DEBITED at the completion callback — the A10G GPU work (up to a
   1-GPU-hour Modal timeout) runs BEFORE the charge. A user can fire many concurrent jobs whose credits
   are only reconciled after the dollars are spent. **Fix:** reserve/hold credits on the `jobs` insert
   (debit, refund on failure); cap concurrent Twin jobs per org; add a per-org monthly GPU-$ ceiling in
   the Modal worker (mirror the thermal worker's `cap_usd`, which already exists).
2. **High-quality jobs charged the standard (lower) credit price.** `job-callback` computes the charge
   WITHOUT the quality multiplier the estimate/gate apply → ~26% structural undercharge on the most
   expensive jobs. **Fix:** charge `applyTwinQualityCredits(...)` and floor to the confirmed estimate
   (persist `estimated_credits` on the job; charge `max(estimated, computed)`).
3. **R2 cleanup queue never runs.** `processTwinR2CleanupBatch` has no caller/cron, so deletions never
   decrement storage and R2 objects accumulate unbilled/undeleted (storage counter drifts up forever).
   **Fix (NOT in a forbidden zone — Claude can do this):** wire a Trigger.dev schedule (or cron) to drain
   `digital_twin_r2_cleanup_queue`. *Recommended as a near-term Claude slice.*
4. **Monthly credits are never granted + trial credits never seeded.** Stripe webhook handles
   checkout/subscription events but NOT `invoice.payment_succeeded`, so `creditsPerMonth` is fictional —
   nothing tops up monthly; `credits_balance` defaults to 0. **Fix:** add an `invoice.payment_succeeded`
   handler that sets/tops `credits_balance` to the plan's monthly grant; seed trial credits on org create.
5. **Storage limit resolved from the wrong (legacy) model.** `assertStorageQuota` + the SlateDrop
   upload gate read `getEntitlements(organizations.tier)` (legacy trial/standard/business), but modular
   subscriptions never set `organizations.tier` → a Twin Pro (intended 125 GB) is enforced at the 5 GB
   fallback. **Fix:** resolve the limit from `resolveModularEntitlements(org_app_subscriptions)` + add-ons.
6. **Beta/approval entitlement bypass grants Twin "pro" to everyone when `isBetaMode()`.** Verify
   `NEXT_PUBLIC_BETA_MODE=false` in production before launch or the whole Twin gate is open.
7. **Share-link / viewer egress + AI-notes formatting are unmetered.** Cap or meter before launch.

## 4. Token/credit model calibration (the cost-safety math)
- Twin charge today: `credits = max(1, round(8 + GB*35))` + per-kind surcharge × output multiplier
  (spz 1.0 / ply 1.12 / glb 1.28), × quality (standard 1.0 / high 1.35). Time: `frames × 17/124 ×
  qualityMult`.
- **Calibrate $/credit to real Modal A10G cost:** have the twin worker emit `cost_usd` (the thermal
  worker already does) so we measure actual GPU minutes per job. Confirm `8 + GB*35` + surcharges
  covers worst-case (1-GPU-hour) jobs at margin, **especially high quality (1.82× time)**. Set credit
  pack prices so the marginal credit always exceeds marginal GPU cost.
- **Calculator is already good:** the submit wizard shows credits + estimated time pre-submit and
  recomputes live as sources change (`useTwinProcessingEstimate`). Gap: the plain desktop
  `TwinUploadPanel` shows credits only, no live time — add the live time estimate there too.

## 5. Performance / form-factor strategy (Brian, Jun 29)
- **Apps = lightweight capture + basic deliverables.** Keep them high-performing — no heavy
  browser/WASM/GPU compute on-device (crash + battery risk). Heavy work dispatches to cloud
  (Trigger→Modal). This is already the architecture; preserve it.
- **Desktop = the heavy-lifting surface:** upload large photogrammetry/drone sets, submit processing,
  author, manage. Must look like a **well-designed web app** — NO large empty spaces, NOT app
  components forced into a wide viewport. Use the rail + center + context layout (see
  [[slate360-slatedrop-and-desktop-shell]]).

## 6. Launch billing checklist (before `NEXT_PUBLIC_BETA_MODE=false`)
- [ ] Credit hold at enqueue + refund-on-failure (#1)
- [ ] Per-org concurrent-job cap + Modal per-org GPU $ ceiling (#1)
- [ ] Charge quality-adjusted credits, floored to estimate (#2)
- [ ] Drain the R2 cleanup queue on a schedule (#3) ← Claude can do
- [ ] `invoice.payment_succeeded` monthly credit grant + trial seed (#4)
- [ ] Storage limit from the modular model (#5)
- [ ] Confirm beta flag off in prod (#6)
- [ ] Meter/cap share egress + AI formatting (#7)
- [ ] Calibrate $/credit against measured Modal cost (worker emits cost_usd)
- [ ] Finalize tier feature matrix + bundle value-add + trial limits (§2)

See [[slate360-cross-app-project-pipeline]] (roadmap: limits→pricing→Stripe→pro testing→App Store),
[[slate360-business-model-projects]], [[slate360-twin-pipeline-plan]].
