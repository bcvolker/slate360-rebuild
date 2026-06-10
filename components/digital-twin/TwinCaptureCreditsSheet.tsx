"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { CREDIT_PACKS, type CreditPackId } from "@/lib/billing";

const PACK_PRICES: Record<CreditPackId, string> = {
  starter: "$19",
  growth: "$49",
  pro: "$99",
};

type Props = {
  open: boolean;
  creditsRequired: number;
  onClose: () => void;
};

export function TwinCaptureCreditsSheet({ open, creditsRequired, onClose }: Props) {
  const [busyPack, setBusyPack] = useState<CreditPackId | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function checkout(packId: CreditPackId) {
    setBusyPack(packId);
    setError(null);
    try {
      const res = await fetch("/api/billing/credits/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId }),
      });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Checkout failed");
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
      setBusyPack(null);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-[color-mix(in_srgb,var(--graphite-canvas)_55%,transparent)]">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-lg rounded-t-2xl border border-[var(--mobile-app-card-border)] bg-[var(--surface-zinc)] p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-bold text-[var(--graphite-text-header)]">Add credits</p>
          <button type="button" onClick={onClose} aria-label="Close">
            <X className="h-5 w-5 text-[var(--graphite-muted)]" />
          </button>
        </div>

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
                  {pack.credits.toLocaleString()} · {PACK_PRICES[packId]}
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
          {busyPack ? "Opening checkout…" : "Continue to secure checkout"}
        </button>

        {error ? <p className="mt-2 text-xs text-red-300">{error}</p> : null}
        <p className="mt-2 text-center text-[11px] text-[var(--graphite-muted)]">
          you&apos;ll return here with your scan untouched
        </p>
      </div>
    </div>
  );
}
