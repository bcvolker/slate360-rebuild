"use client";

import { useState } from "react";
import { CreditCard, ArrowRight, Loader2, Download, Zap, TrendingUp, Crown } from "lucide-react";
import type { DashboardAccountOverview } from "@/lib/types/dashboard";

interface Props {
  overview: DashboardAccountOverview | null;
  isAdmin: boolean;
  isCeo: boolean;
  tierLabel: string;
  loading: boolean;
}

const CREDIT_PACKS = [
  { id: "starter", name: "Starter Pack", credits: 5000, desc: "Good for small projects" },
  { id: "growth", name: "Growth Pack", credits: 15000, desc: "Best value for active teams" },
  { id: "pro", name: "Pro Pack", credits: 50000, desc: "High-volume workflows" },
] as const;

export default function AccountBillingTab({ overview, isAdmin, isCeo, tierLabel, loading }: Props) {
  const [portalBusy, setPortalBusy] = useState(false);
  const [creditBusy, setCreditBusy] = useState<string | null>(null);

  const billing = overview?.billing;

  async function openBillingPortal() {
    setPortalBusy(true);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = (await res.json()) as { url?: string };
      if (data.url) window.location.href = data.url;
    } finally {
      setPortalBusy(false);
    }
  }

  async function buyCredits(packId: string) {
    setCreditBusy(packId);
    try {
      const res = await fetch("/api/billing/credits/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId }),
      });
      const data = (await res.json()) as { url?: string };
      if (data.url) window.location.href = data.url;
    } finally {
      setCreditBusy(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-[#3B82F6]" size={24} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {isCeo && (
        <div className="rounded-2xl border border-[#3B82F6]/30 bg-[#3B82F6]/5 p-6">
          <h3 className="text-sm font-bold text-zinc-100 mb-2 flex items-center gap-2">
            <Crown size={16} className="text-[#3B82F6]" /> Internal Owner Account
          </h3>
          <p className="text-xs text-zinc-400">
            This account is treated as an internal Slate360 operator account for Phase 1 testing.
            Subscriber purchase flows, storage upsells, and credit pack prompts are intentionally hidden here.
          </p>
        </div>
      )}

      {/* Current Plan */}
      <div className="rounded-2xl border border-app bg-app-card p-6">
        <h3 className="text-sm font-bold text-zinc-100 mb-4 flex items-center gap-2">
          <Crown size={16} className="text-[#3B82F6]" /> Current Plan
        </h3>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black text-zinc-100">{tierLabel}</span>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                billing?.status === "active" ? "bg-emerald-900/50 text-emerald-400" :
                billing?.status === "past_due" ? "bg-amber-900/50 text-amber-400" :
                billing?.status === "canceled" ? "bg-red-900/50 text-red-400" :
                "bg-white/[0.04] text-zinc-400"
              }`}>
                {billing?.status ?? "trialing"}
              </span>
            </div>
            {billing?.renewsOn && (
              <p className="text-xs text-zinc-400 mt-1">
                Renews {new Date(billing.renewsOn).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </p>
            )}
          </div>
          {isAdmin && !isCeo && (
            <button
              onClick={openBillingPortal}
              disabled={portalBusy}
              className="inline-flex items-center gap-2 rounded-xl bg-white/[0.04] border border-app px-4 py-2 text-xs font-semibold text-zinc-200 hover:bg-white/[0.06] transition-colors disabled:opacity-50"
            >
              {portalBusy ? <Loader2 size={14} className="animate-spin" /> : <CreditCard size={14} />}
              Manage Subscription
            </button>
          )}
        </div>
      </div>

      {/* Payment Methods — admin only */}
      {isAdmin && !isCeo && (
        <div className="rounded-2xl border border-app bg-app-card p-6">
          <h3 className="text-sm font-bold text-zinc-100 mb-3 flex items-center gap-2">
            <CreditCard size={16} className="text-[#3B82F6]" /> Payment Methods
          </h3>
          <p className="text-xs text-zinc-400 mb-4">
            Payment methods are managed securely through Stripe. Update your card, add a backup, or change your billing address.
          </p>
          <button
            onClick={openBillingPortal}
            disabled={portalBusy}
            className="inline-flex items-center gap-2 rounded-xl bg-[#3B82F6] px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-[#3B82F6]/80 transition-colors disabled:opacity-50"
          >
            {portalBusy ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
            Update Payment Method
          </button>
        </div>
      )}

      {/* Buy Credits — admin only */}
      {isAdmin && !isCeo && (
        <div className="rounded-2xl border border-app bg-app-card p-6">
          <h3 className="text-sm font-bold text-zinc-100 mb-1 flex items-center gap-2">
            <Zap size={16} className="text-[#3B82F6]" /> Purchase Credits
          </h3>
          <p className="text-xs text-zinc-400 mb-4">
            Credits power data processing, model rendering, and AI features. Your current balance: <strong className="text-zinc-200">{billing?.totalCreditsBalance?.toLocaleString() ?? 0}</strong>
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {CREDIT_PACKS.map((pack) => (
              <button
                key={pack.id}
                onClick={() => buyCredits(pack.id)}
                disabled={creditBusy !== null}
                className="rounded-xl border border-app bg-white/[0.04] p-4 text-left hover:border-cobalt hover:bg-white/[0.04]/80 transition-all disabled:opacity-50"
              >
                <p className="text-sm font-bold text-zinc-100">{pack.name}</p>
                <p className="text-lg font-black text-[#3B82F6]">{pack.credits.toLocaleString()}</p>
                <p className="text-[10px] text-zinc-500">{pack.desc}</p>
                {creditBusy === pack.id && <Loader2 size={14} className="animate-spin text-[#3B82F6] mt-2" />}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Invoices — admin only */}
      {isAdmin && !isCeo && (
        <div className="rounded-2xl border border-app bg-app-card p-6">
          <h3 className="text-sm font-bold text-zinc-100 mb-3 flex items-center gap-2">
            <Download size={16} className="text-[#3B82F6]" /> Invoices & Receipts
          </h3>
          <p className="text-xs text-zinc-400 mb-4">
            View and download all past invoices, receipts, and credit purchase confirmations.
          </p>
          <button
            onClick={openBillingPortal}
            disabled={portalBusy}
            className="inline-flex items-center gap-2 rounded-xl bg-white/[0.04] border border-app px-4 py-2 text-xs font-semibold text-zinc-200 hover:bg-white/[0.06] transition-colors disabled:opacity-50"
          >
            {portalBusy ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            View Invoices
          </button>
        </div>
      )}

      {/* Upgrade CTA (non-enterprise) */}
      {tierLabel !== "Enterprise" && !isCeo && (
        <div className="rounded-2xl border border-[#3B82F6]/30 bg-[#3B82F6]/5 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                <TrendingUp size={16} className="text-[#3B82F6]" /> Upgrade Your Plan
              </h3>
              <p className="text-xs text-zinc-400 mt-1">Unlock more storage, credits, seats, and premium features.</p>
            </div>
            <a
              href="/plans"
              className="inline-flex items-center gap-2 rounded-xl bg-[#3B82F6] px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-[#3B82F6]/80 transition-colors"
            >
              View Plans <ArrowRight size={14} />
            </a>
          </div>
        </div>
      )}

      {/* Non-admin notice */}
      {!isAdmin && (
        <div className="rounded-2xl border border-app bg-app-card/50 p-4 text-center">
          <p className="text-xs text-zinc-500">
            Billing and payment information is managed by your organization&apos;s administrator.
          </p>
        </div>
      )}

      {isCeo && (
        <div className="rounded-2xl border border-app bg-app-card/50 p-4 text-center">
          <p className="text-xs text-zinc-500">
            Internal owner billing is managed outside the standard subscriber self-service flow.
          </p>
        </div>
      )}
    </div>
  );
}
