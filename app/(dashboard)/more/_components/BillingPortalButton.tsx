"use client";

import { useState } from "react";
import { ChevronRight, CreditCard, Loader2 } from "lucide-react";

type Props = {
  disabledReason?: string;
};

export function BillingPortalButton({ disabledReason }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openPortal() {
    if (disabledReason) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Billing portal unavailable");
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Billing portal unavailable");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={openPortal}
      disabled={busy || Boolean(disabledReason)}
      className="flex w-full min-h-16 items-center gap-3 border-b border-white/10 px-4 text-left transition last:border-b-0 hover:bg-amber-500/10 disabled:cursor-not-allowed disabled:opacity-65"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-slate-950">
        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <CreditCard className="h-5 w-5" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-black text-white">Manage subscription</span>
        <span className="mt-0.5 block text-xs font-bold text-slate-400">
          {disabledReason ?? "Open Stripe to update cards, invoices, and plan details."}
        </span>
        {error ? <span className="mt-1 block text-xs font-bold text-rose-300">{error}</span> : null}
      </span>
      <ChevronRight className="h-4 w-4 text-slate-500" />
    </button>
  );
}