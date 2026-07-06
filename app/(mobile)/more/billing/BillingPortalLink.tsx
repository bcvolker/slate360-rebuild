"use client";

import { BillingPortalButton } from "@/components/account/BillingPortalButton";
import { useIsNativePlatform } from "@/lib/capacitor/is-native-platform";
import { mobileTokens } from "@/components/mobile-system";
import { cn } from "@/lib/utils";

/**
 * C3: the Stripe billing-portal link must not be reachable from inside the
 * native app — no purchase surface should be able to steer to web checkout.
 * Web (including mobile browsers) keeps the existing "Manage subscription"
 * link; native renders nothing here (plan + balance above are already
 * read-only).
 */
export function BillingPortalLink() {
  const isNative = useIsNativePlatform();
  if (isNative) return null;

  return (
    <section className={cn("mt-4 overflow-hidden", mobileTokens.panelBase)}>
      <BillingPortalButton />
    </section>
  );
}
