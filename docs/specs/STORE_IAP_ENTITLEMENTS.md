# Spec: Store Shipping, IAP, Pricing & Entitlement Consolidation (Prompts D·E·F·G·H)

Status: **spec / planning** (no app code). Consolidates the tightly-coupled store/monetization
work. Aligns with `docs/APP_STORE_AND_OFFLINE_STRATEGY.md` + `docs/audit/APP_STORE_READINESS_AUDIT.md`.
**Note:** existing repo doctrine assumed a "Site Walk only, invite-only, no-IAP V1." CEO has since
decided **both apps ship visibly**; the launch-monetization question (IAP at launch vs later) is
**open — see §6**.

## 1. Store path (D) — Capacitor
Capacitor (not TWA/PWABuilder) for camera + filesystem + push + native IAP, one Next.js codebase.
Review-build must demonstrate real native capture + offline queue (not a web wrapper).

| Guideline | Risk | Mitigation |
|---|---|---|
| 4.2 minimum functionality | web-wrapper rejection | native camera + offline queue + real deliverable in review build |
| 4.2 placeholder UI | empty/unfinished tabs | route manifest hides unfinished; no dead buttons (see UI spec) |
| 3.1.1 IAP | selling digital outside IAP | consumer tiers + tokens via StoreKit/Play Billing; Enterprise via quote |
| 5.1.1 privacy | camera/location strings | clear usage strings before capture |
| 2.5.4 push | push without value | opt-in after first deliverable, behind a tap |

## 2. IAP SKUs (E)
**Auto-renewable subs** (grant tier + monthly token allowance): `sitewalk.low/high`, `twin.low/high`,
`bundle` (monthly + annual). **Consumables** (at-cost tokens): `tokens.100/500/2000`.
**Trial** = StoreKit/Play intro offer, **card required**, **hard caps enforced server-side**.
**Enterprise seats** = NOT a consumer SKU → sales quote + manual provisioning / Apple Business Manager.
Use **RevenueCat** + StoreKit 2 (don't hand-roll receipt logic).

**Receipt → entitlement:** purchase → RevenueCat webhook / App Store Server Notifications v2 / Play
RTDN → `/api/billing/store-webhook` (idempotent) → verify → upsert `org_subscriptions` +
`token_wallet` (grant allowance) → Supabase Realtime refreshes client. Daily reconcile cron.

## 3. Token economics (F)
- **1 token = $0.10 retail** (config-driven). Map jobs to tokens via GPU-seconds × resolution.
- **Margin lives in the subscription allowance, not overage** (unused allowance = pure margin);
  overage sold near cost (~$0.12/token). Target ≥90% gross margin on the subscription.
- Illustrative job costs: Site Walk report ~1–5 tokens; twin draft ~9–18; twin HQ ~120; thermal ~35.
- Pricing table is **illustrative + config-driven** — CEO provides final numbers; keep in
  `lib/billing/*` config, never hardcoded in UI.

## 4. Trial caps (G) — recommended default
```yaml
duration_days: 14
requires_payment_method: true     # card on file
token_ceiling: 150                # HARD STOP in dispatcher
max_twin_jobs: 2
max_photos_per_job: 150
twin_quality: draft_only          # + watermark
queue_priority: low
fraud: { email_domain_blocklist: true, device_fingerprint: true, one_trial_per_org: true }
```
Cap expensive actions (twin/HQ), not habit-forming ones (capture/walks/files).

## 5. Entitlement consolidation (H) — the big cleanup
**Collapse the three existing models** (`lib/entitlements.ts`, `lib/entitlements-modular.ts`,
`lib/billing/cost-model.ts`, + `entitlements-collaborator.ts`) into **one config-driven layer**.

Data model:
```sql
products(id, slug, name, accent_var)
plans(id, product_id, tier, store_product_ids jsonb, monthly_tokens, limits jsonb)
org_subscriptions(org_id, plan_id, status, period_end, source)   -- apple|google|manual|trial
org_seats(org_id, user_id, product_id, role)
token_wallets(org_id, balance, allowance_monthly, allowance_reset_at)
token_ledger(id, org_id, delta, reason, job_id, idempotency_key, created_at)  -- append-only
token_holds(job_id, org_id, amount, status, expires_at)
trial_state(org_id, started_at, ends_at, tokens_used, jobs jsonb, caps jsonb)
store_receipts(platform, transaction_id, org_id, payload jsonb, verified_at)
```
- **Single resolver:** `resolveEntitlements(orgId,userId) → { products, tokens, trial, features, seats }`.
  UI reads a hook only; never raw columns.
- **RLS:** `org_id` on all rows; policies check membership AND `has_product(org_id, slug)`.
- **Job dispatcher pre-flight (Trigger.dev):** estimate tokens → assert entitled + (trial caps) +
  balance → **reserve hold** → enqueue Modal → on success **capture hold**, on failure **refund**.
- **Config-driven products:** adding a product = config + plan rows, not new `if` chains.

## 6. Open decision (CEO) — launch monetization
Existing doctrine = invite-only / no-IAP first release. But the model is "free download + IAP" with
**expensive GPU jobs**, so launching without token metering/trial caps = **financial exposure**.
**Recommendation:** ship monetization (entitlements + token ledger + pre-flight + trial caps) **at
launch** so loss-protection is live from day one. **Confirm.**

## 7. Build order
1. Entitlement consolidation: schema + `resolveEntitlements` + RLS + dispatcher pre-flight/holds.
2. Token wallet + pre-flight UX (see `TOKEN_UX.md`).
3. RevenueCat + StoreKit/Play SKUs + receipt→entitlement webhook + reconcile cron.
4. Trial caps in dispatcher.
5. Capacitor store build + review hardening; enterprise quote → manual provisioning.
