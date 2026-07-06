"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { CREDIT_PACKS, type CreditPackId } from "@/lib/billing";
import { formatCreditPackPrice } from "@/lib/billing/credit-packs";
import { useIsNativePlatform } from "@/lib/capacitor/is-native-platform";
import { IAP_ENABLED } from "@/lib/iap";
import { configureRevenueCat, purchaseCreditPack } from "@/lib/iap/revenuecat";

type Props = {
  open: boolean;
  creditsRequired: number;
  returnTo?: string;
  onBeforeCheckout?: () => Promise<void>;
  onClose: () => void;
};

export function TwinCaptureCreditsSheet({
  open,
  creditsRequired,
  returnTo = "/digital-twin/capture/review",
  onBeforeCheckout,
  onClose,
}: Props) {
  const isNative = useIsNativePlatform();
  const [busyPack, setBusyPack] = useState<CreditPackId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [purchased, setPurchased] = useState<CreditPackId | null>(null);

  if (!open) return null;

  async function checkoutWeb(packId: CreditPackId) {
    setBusyPack(packId);
    setError(null);
    try {
      await onBeforeCheckout?.();
      const res = await fetch("/api/billing/credits/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId, return_to: returnTo }),
      });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Checkout failed");
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
      setBusyPack(null);
    }
  }

  // C7: native purchase — RevenueCat validates the receipt and fires
  // /api/billing/store-webhook, which grants the credits asynchronously.
  // This function only drives the on-device purchase sheet.
  async function checkoutNative(packId: CreditPackId) {
    setBusyPack(packId);
    setError(null);
    try {
      await onBeforeCheckout?.();
      const ctxRes = await fetch("/api/billing/iap/context");
      const ctx = (await ctxRes.json().catch(() => ({}))) as { orgId?: string; error?: string };
      if (!ctxRes.ok || !ctx.orgId) throw new Error(ctx.error ?? "Could not resolve account");
      await configureRevenueCat(ctx.orgId);
      const result = await purchaseCreditPack(packId);
      if (!result.ok) {
        if (!result.cancelled) setError(result.error ?? "Purchase failed");
        setBusyPack(null);
        return;
      }
      setPurchased(packId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Purchase failed");
    } finally {
      setBusyPack(null);
    }
  }

  // C3: purchase surfaces are platform-gated — native never reaches Stripe.
  const checkout = isNative ? checkoutNative : checkoutWeb;
  const nativeUnavailable = isNative && !IAP_ENABLED;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-[color-mix(in_srgb,var(--graphite-canvas)_55%,transparent)]">
      <div
        role="dialog"
        aria-modal="true"
        data-twin-review="credits-sheet"
        className="w-full max-w-lg rounded-t-2xl border border-[var(--mobile-app-card-border)] bg-[var(--surface-zinc)] p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-bold text-[var(--graphite-text-header)]">Add credits</p>
          <button type="button" onClick={onClose} aria-label="Close">
            <X className="h-5 w-5 text-[var(--graphite-muted)]" />
          </button>
        </div>

        {nativeUnavailable ? (
          <p
            className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 text-xs text-[var(--graphite-muted)]"
            data-twin-review="credits-native-unavailable"
          >
            Purchases aren&apos;t available in this build yet.
          </p>
        ) : purchased ? (
          <p className="rounded-xl border border-[var(--accent-border-blue)] bg-[color-mix(in_srgb,var(--twin360-blue)_10%,transparent)] px-3 py-3 text-xs text-[var(--graphite-text-body)]">
            {CREDIT_PACKS[purchased].credits.toLocaleString()} credits added — they may take a
            moment to appear.
          </p>
        ) : (
          <>
            <div className="space-y-2">
              {(["starter", "growth", "pro"] as CreditPackId[]).map((packId) => {
                const pack = CREDIT_PACKS[packId];
                const covers = pack.credits >= creditsRequired;
                const highlighted = packId === "growth";
                return (
                  <button
                    key={packId}
                    type="button"
                    disabled={busyPack !== null}
                    onClick={() => void checkout(packId)}
                    className={`flex w-full items-center justify-between rounded-xl border px-3 py-3 text-left transition disabled:opacity-50 ${
                      highlighted
                        ? "border-[var(--accent-border-blue)] bg-[color-mix(in_srgb,var(--twin360-blue)_10%,transparent)]"
                        : "border-[var(--mobile-app-card-border)]"
                    }`}
                  >
                    <span className="text-sm font-semibold text-[var(--graphite-text-header)]">
                      {pack.credits.toLocaleString()} · {formatCreditPackPrice(pack)}
                    </span>
                    {highlighted && covers ? (
                      <span className="text-[10px] font-semibold uppercase text-[var(--twin360-blue)]">
                        covers this job
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              disabled={busyPack !== null}
              onClick={() => void checkout("growth")}
              className="mt-3 flex min-h-11 w-full items-center justify-center rounded-xl bg-[var(--twin360-blue)] text-sm font-bold text-[var(--graphite-canvas)] disabled:opacity-50"
            >
              {busyPack
                ? isNative
                  ? "Opening purchase…"
                  : "Opening checkout…"
                : isNative
                  ? "Buy credits"
                  : "Continue to secure checkout"}
            </button>

            {error ? <p className="mt-2 text-xs text-red-300">{error}</p> : null}
            {!isNative ? (
              <p className="mt-2 text-center text-[11px] text-[var(--graphite-muted)]">
                you&apos;ll return here with your scan untouched
              </p>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
