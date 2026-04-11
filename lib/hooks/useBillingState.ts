"use client";

import { useState, useCallback, useEffect } from "react";
import type { Entitlements } from "@/lib/entitlements";

export function useBillingState(ent: Entitlements) {
  const [billingBusy, setBillingBusy] = useState<"portal" | "credits" | "upgrade" | null>(null);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [billingNotice, setBillingNotice] = useState<{ ok: boolean; text: string } | null>(null);

  // Billing URL params (success/cancel redirects)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("billing") === "success") {
      setBillingNotice({ ok: true, text: "Subscription updated successfully." });
    } else if (params.get("billing") === "cancelled") {
      setBillingNotice({ ok: false, text: "Checkout was cancelled." });
    } else if (params.get("credits") === "success") {
      setBillingNotice({ ok: true, text: "Credit purchase completed successfully." });
    } else if (params.get("credits") === "cancelled") {
      setBillingNotice({ ok: false, text: "Credit checkout was cancelled." });
    }
  }, []);

  const launchBillingFlow = useCallback(async (endpoint: string, body?: Record<string, unknown>) => {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });
    const data = await res.json();
    if (!res.ok || !data?.url) {
      throw new Error(data?.error ?? "Unable to open billing flow");
    }
    window.location.href = data.url;
  }, []);

  const handleOpenBillingPortal = useCallback(async () => {
    setBillingError(null);
    setBillingBusy("portal");
    try {
      await launchBillingFlow("/api/billing/portal");
    } catch (error) {
      setBillingError(error instanceof Error ? error.message : "Unable to open billing portal");
      setBillingBusy(null);
    }
  }, [launchBillingFlow]);

  const handleBuyCredits = useCallback(async () => {
    setBillingError(null);
    setBillingBusy("credits");
    try {
      await launchBillingFlow("/api/billing/credits/checkout", { packId: "starter" });
    } catch (error) {
      setBillingError(error instanceof Error ? error.message : "Unable to start credit checkout");
      setBillingBusy(null);
    }
  }, [launchBillingFlow]);

  const handleUpgradePlan = useCallback(async () => {
    setBillingError(null);
    setBillingBusy("upgrade");
    try {
      const nextTier = ent.tier === "trial" ? "standard" : ent.tier === "standard" ? "business" : "business";
      await launchBillingFlow("/api/billing/checkout", { tier: nextTier, billingCycle: "monthly" });
    } catch (error) {
      setBillingError(error instanceof Error ? error.message : "Unable to start upgrade checkout");
      setBillingBusy(null);
    }
  }, [ent.tier, launchBillingFlow]);

  return {
    billingBusy,
    billingError,
    billingNotice, setBillingNotice,
    launchBillingFlow,
    handleOpenBillingPortal,
    handleBuyCredits,
    handleUpgradePlan,
  };
}
