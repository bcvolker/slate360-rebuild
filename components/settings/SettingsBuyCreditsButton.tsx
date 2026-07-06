"use client";

import { useCallback, useState } from "react";
import { Loader2 } from "lucide-react";
import { settingsTokens } from "./settings-tokens";
import { useIsNativePlatform } from "@/lib/capacitor/is-native-platform";
import { IAP_ENABLED } from "@/lib/iap";
import { configureRevenueCat, purchaseCreditPack } from "@/lib/iap/revenuecat";

type Props = {
  disabledReason?: string;
  returnPath?: string;
};

export function SettingsBuyCreditsButton({ disabledReason, returnPath = "/settings" }: Props) {
  const isNative = useIsNativePlatform();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [purchased, setPurchased] = useState(false);

  // C3: native never reaches Stripe checkout.
  const nativeUnavailable = isNative && !IAP_ENABLED;

  const handleBuyCreditsWeb = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/credits/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId: "starter", return_to: returnPath }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Unable to start credit checkout");
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start credit checkout");
      setBusy(false);
    }
  }, [returnPath]);

  const handleBuyCreditsNative = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const ctxRes = await fetch("/api/billing/iap/context");
      const ctx = (await ctxRes.json().catch(() => ({}))) as { orgId?: string; error?: string };
      if (!ctxRes.ok || !ctx.orgId) throw new Error(ctx.error ?? "Could not resolve account");
      await configureRevenueCat(ctx.orgId);
      const result = await purchaseCreditPack("starter");
      if (!result.ok) {
        if (!result.cancelled) setError(result.error ?? "Purchase failed");
        return;
      }
      setPurchased(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Purchase failed");
    } finally {
      setBusy(false);
    }
  }, []);

  const handleBuyCredits = useCallback(async () => {
    if (disabledReason || nativeUnavailable) return;
    await (isNative ? handleBuyCreditsNative() : handleBuyCreditsWeb());
  }, [disabledReason, handleBuyCreditsNative, handleBuyCreditsWeb, isNative, nativeUnavailable]);

  if (nativeUnavailable) {
    return (
      <p className="text-xs font-medium text-[var(--graphite-muted)]" data-settings="credits-native-unavailable">
        Purchases aren&apos;t available in this build yet.
      </p>
    );
  }

  if (purchased) {
    return <p className="text-xs font-medium text-[var(--graphite-muted)]">Credits added.</p>;
  }

  return (
    <div>
      <button
        type="button"
        className={settingsTokens.primaryButton}
        onClick={() => void handleBuyCredits()}
        disabled={busy || Boolean(disabledReason)}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Buy credits
      </button>
      {disabledReason ? (
        <p className="mt-2 text-xs font-medium text-[var(--graphite-muted)]">{disabledReason}</p>
      ) : null}
      {error ? <p className={settingsTokens.statusError}>{error}</p> : null}
    </div>
  );
}
