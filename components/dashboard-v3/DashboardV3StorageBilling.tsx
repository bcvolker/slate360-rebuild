"use client";

import { useCallback, useState } from "react";
import { DashboardV3EmptyState } from "./DashboardV3EmptyState";
import { HardDrive, Zap, CreditCard, Loader2 } from "lucide-react";

export function DashboardV3StorageBilling({ usage }: { usage: any }) {
  const [creditsBusy, setCreditsBusy] = useState(false);

  const handleBuyCredits = useCallback(async () => {
    setCreditsBusy(true);
    try {
      const res = await fetch("/api/billing/credits/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId: "starter" }),
      });
      const data = await res.json();
      if (!res.ok || !data?.url) {
        throw new Error(data?.error ?? "Unable to start credit checkout");
      }
      window.location.href = data.url;
    } catch (error) {
      console.error("[DashboardV3StorageBilling] credit checkout failed", error);
      setCreditsBusy(false);
    }
  }, []);

  if (!usage) {
    return (
      <div className="relative flex h-full flex-col overflow-hidden rounded-xl border border-white/5 bg-[#131820] p-6">
        <h3 className="mb-4 text-sm font-semibold tracking-tight text-white">Storage & Billing</h3>
        <div className="flex min-h-[140px] flex-1 flex-col justify-center">
          <DashboardV3EmptyState message="Usage data unavailable" actionText="Manage Billing" />
        </div>
        <button
          type="button"
          onClick={() => void handleBuyCredits()}
          disabled={creditsBusy}
          className="mt-4 flex items-center justify-center rounded-lg bg-[#00E699] px-4 py-2 text-xs font-bold text-[#0B0F15] transition-all hover:bg-[#00CC88] disabled:opacity-60"
        >
          {creditsBusy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "[ ✦ Purchase Additional Telemetry Credits ]"
          )}
        </button>
      </div>
    );
  }

  const percent = Math.min(100, Math.round((parseFloat(usage.storageGbUsed) / usage.storageGbLimit) * 100)) || 0;

  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-white/5 bg-[#131820] p-6">
      <div className="absolute right-0 top-0 p-6 opacity-5 transition-opacity group-hover:opacity-10">
        <HardDrive className="h-24 w-24" />
      </div>

      <h3 className="relative z-10 mb-4 text-sm font-semibold tracking-tight text-white">Storage & Billing</h3>
      
      <div className="relative z-10 flex flex-1 flex-col justify-between">
        <div>
          <div className="mb-2 flex items-end gap-2">
            <span className="text-3xl font-black text-[#F8FAFC]">{usage.storageGbUsed}</span>
            <span className="mb-1 text-sm font-medium text-zinc-400">/ {usage.storageGbLimit} GB</span>
          </div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Total Volume Used</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-zinc-400">Current Plan</span>
              <span className="flex items-center gap-1 text-[#00E699]"><Zap className="h-3 w-3" /> Pro Tier</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-xl bg-white/5">
              <div className="h-full rounded-xl bg-[#00E699]" style={{ width: `${percent}%` }} />
            </div>
            <p className="text-[10px] font-medium text-zinc-500">{percent}% of limit</p>
          </div>

          <div className="flex items-center gap-3 border-t border-white/5 pt-4">
            <button type="button" className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300 transition-colors hover:text-[#F8FAFC]">
              <CreditCard className="h-3.5 w-3.5" /> Manage Billing
            </button>
          </div>

          <button
            type="button"
            onClick={() => void handleBuyCredits()}
            disabled={creditsBusy}
            className="mt-4 flex w-full items-center justify-center rounded-lg bg-[#00E699] px-4 py-2 text-xs font-bold text-[#0B0F15] transition-all hover:bg-[#00CC88] disabled:opacity-60"
          >
            {creditsBusy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "[ ✦ Purchase Additional Telemetry Credits ]"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
