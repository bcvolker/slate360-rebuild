"use client";

/**
 * C7: RevenueCat wiring for native credit-pack purchases.
 * Per docs/specs/STORE_IAP_ENTITLEMENTS.md — RevenueCat + StoreKit 2, no
 * hand-rolled receipt logic. Only ever imported/used behind IAP_ENABLED &&
 * isNativePlatform() checks — never touches web.
 *
 * Configure once per app session with the org's id as RevenueCat's appUserID,
 * so the store-webhook can map a purchase straight back to org_id without a
 * separate lookup table.
 */
import { Purchases, LOG_LEVEL } from "@revenuecat/purchases-capacitor";
import type { CreditPackId } from "@/lib/billing/credit-packs";
import { CREDIT_PACKS } from "@/lib/billing/credit-packs";

let configured = false;

export async function configureRevenueCat(orgId: string): Promise<void> {
  const apiKey = process.env.NEXT_PUBLIC_REVENUECAT_IOS_API_KEY;
  if (!apiKey) {
    console.warn("[revenuecat] NEXT_PUBLIC_REVENUECAT_IOS_API_KEY not set — IAP unavailable");
    return;
  }
  if (configured) return;
  await Purchases.setLogLevel({ level: LOG_LEVEL.WARN });
  await Purchases.configure({ apiKey, appUserID: orgId });
  configured = true;
}

export type PurchaseCreditPackResult =
  | { ok: true; credits: number }
  | { ok: false; cancelled: boolean; error?: string };

/**
 * Purchases the StoreKit consumable mapped to this credit pack. RevenueCat
 * validates the receipt with Apple and fires a webhook to
 * /api/billing/store-webhook, which is what actually grants the credits —
 * this function's success just means the on-device purchase sheet completed;
 * the ledger update happens server-side, asynchronously, off the webhook.
 */
export async function purchaseCreditPack(packId: CreditPackId): Promise<PurchaseCreditPackResult> {
  const pack = CREDIT_PACKS[packId];
  try {
    const offerings = await Purchases.getOfferings();
    const pkg = offerings.current?.availablePackages.find(
      (p) => p.product.identifier === pack.iapProductId,
    );
    if (!pkg) {
      return { ok: false, cancelled: false, error: `Product ${pack.iapProductId} not found in current offering` };
    }
    await Purchases.purchasePackage({ aPackage: pkg });
    return { ok: true, credits: pack.credits };
  } catch (err) {
    const error = err as { userCancelled?: boolean; message?: string };
    if (error?.userCancelled) return { ok: false, cancelled: true };
    return { ok: false, cancelled: false, error: error?.message ?? "Purchase failed" };
  }
}
