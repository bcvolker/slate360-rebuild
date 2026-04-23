"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ChevronLeft, ChevronRight, Loader2, Sparkles, Package, Plus, Zap } from "lucide-react";
import type { Tier } from "@/lib/entitlements";
import {
  PLAN_TABS,
  SITE_WALK_PLANS,
  TOURS_PLANS,
  BUNDLE_PLANS_DISPLAY,
  ADDONS_DISPLAY,
  PLAN_FAQS,
  type PlanTab,
  type AppPlanDisplay,
  type BundlePlanDisplay,
} from "./plan-data";

interface Props {
  currentTier: Tier;
  currentLabel: string;
  isAdmin: boolean;
}

export default function PlansClient({ currentTier, currentLabel, isAdmin }: Props) {
  const [tab, setTab] = useState<PlanTab>("site_walk");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCheckout(planKey: string) {
    if (!isAdmin) {
      setError("Only organization admins can change the subscription.");
      return;
    }
    setError(null);
    setBusyId(planKey);
    try {
      const res = await fetch("/api/billing/app-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planKey }),
      });
      const data = await res.json();
      if (!res.ok || !data?.url) {
        setError(data?.error ?? "Unable to start checkout");
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Unable to start checkout. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  const appPlans = tab === "site_walk" ? SITE_WALK_PLANS : tab === "tours" ? TOURS_PLANS : [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="px-4 sm:px-6 pt-6 pb-4 max-w-7xl mx-auto">
        <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-foreground transition-colors mb-6">
          <ChevronLeft size={16} /> Back to Dashboard
        </Link>
        <div className="text-center mb-8">
          <span className="inline-block text-[10px] font-semibold uppercase tracking-widest px-3 py-1 rounded-full mb-3 bg-orange-500/10 text-orange-400">
            Pricing
          </span>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-2">
            Build your toolkit
          </h1>
          <p className="text-zinc-400 text-sm">
            Subscribe per app, or save with a bundle. Currently on{" "}
            <span className="text-foreground font-semibold">{currentLabel}</span>
          </p>
        </div>

        {/* Tab bar */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center rounded-full border border-app bg-app-card p-1 gap-0.5 overflow-x-auto">
            {PLAN_TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap ${
                  tab === t.id ? "bg-white/[0.04] text-foreground shadow" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-400 text-center mb-4">{error}</p>}
      </div>

      {/* Plan cards */}
      <section className="px-4 sm:px-6 pb-12">
        <div className="max-w-4xl mx-auto">
          {(tab === "site_walk" || tab === "tours") && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {appPlans.map((plan) => (
                <AppCard key={`${plan.appId}_${plan.tier}`} plan={plan} busyId={busyId} onCheckout={handleCheckout} />
              ))}
            </div>
          )}

          {tab === "bundles" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {BUNDLE_PLANS_DISPLAY.map((b) => (
                <BundleCard key={b.bundleId} bundle={b} busyId={busyId} onCheckout={handleCheckout} />
              ))}
            </div>
          )}

          {tab === "addons" && <AddonsSection busyId={busyId} onCheckout={handleCheckout} />}
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-4 sm:px-6 border-t border-app">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-black mb-8 text-center">Frequently asked questions</h2>
          <div className="space-y-4">
            {PLAN_FAQS.map((faq) => (
              <details key={faq.q} className="group border border-app rounded-xl">
                <summary className="flex items-center justify-between px-5 py-4 cursor-pointer text-sm font-semibold text-zinc-200 hover:text-foreground">
                  {faq.q}
                  <ChevronRight size={14} className="text-zinc-500 transition-transform group-open:rotate-90" />
                </summary>
                <p className="px-5 pb-4 text-xs text-zinc-400 leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

// --- Sub-components ---

function AppCard({ plan, busyId, onCheckout }: { plan: AppPlanDisplay; busyId: string | null; onCheckout: (k: string) => void }) {
  const key = `${plan.appId}_${plan.tier}`;
  return (
    <div className={`rounded-2xl p-6 relative flex flex-col ${plan.highlight ? "border-2 border-orange-500 bg-app-card shadow-xl shadow-orange-500/5" : "border border-app bg-app-card"}`}>
      {plan.highlight && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[9px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full text-foreground bg-orange-500 flex items-center gap-1">
          <Sparkles size={10} /> Recommended
        </span>
      )}
      <div className="mb-auto">
        <h2 className="text-lg font-black mb-1">{plan.name}</h2>
        <p className="text-xs text-zinc-500 mb-3">{plan.desc}</p>
        <div className="flex items-baseline gap-1 mb-4">
          <span className="text-3xl font-black text-orange-400">{plan.price}</span>
          <span className="text-zinc-500 text-xs">/mo</span>
        </div>
        <ul className="space-y-2 mb-5">
          {plan.features.map((f) => (
            <li key={f} className="flex items-start gap-2 text-xs text-zinc-400">
              <Check size={12} className="text-orange-400 flex-shrink-0 mt-0.5" />{f}
            </li>
          ))}
        </ul>
      </div>
      <button onClick={() => onCheckout(key)} disabled={busyId !== null} className={`flex items-center justify-center w-full py-2.5 rounded-full text-sm font-semibold transition-all hover:opacity-90 hover:scale-[1.02] disabled:opacity-60 ${plan.highlight ? "bg-orange-500 text-foreground" : "border border-app text-zinc-300 hover:bg-white/[0.04]"}`}>
        {busyId === key ? <Loader2 size={14} className="animate-spin" /> : <>Subscribe <ChevronRight size={14} className="ml-1" /></>}
      </button>
    </div>
  );
}

function BundleCard({ bundle, busyId, onCheckout }: { bundle: BundlePlanDisplay; busyId: string | null; onCheckout: (k: string) => void }) {
  const key = `bundle_${bundle.bundleId}`;
  return (
    <div className={`rounded-2xl p-6 relative flex flex-col ${bundle.highlight ? "border-2 border-orange-500 bg-app-card shadow-xl shadow-orange-500/5" : "border border-app bg-app-card"}`}>
      {bundle.highlight && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[9px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full text-foreground bg-orange-500 flex items-center gap-1">
          <Package size={10} /> Best value
        </span>
      )}
      <div className="mb-auto">
        <h2 className="text-lg font-black mb-1">{bundle.name}</h2>
        <p className="text-xs text-zinc-500 mb-3">{bundle.desc}</p>
        <div className="flex items-baseline gap-1 mb-1">
          <span className="text-3xl font-black text-orange-400">{bundle.price}</span>
          <span className="text-zinc-500 text-xs">/mo</span>
        </div>
        <p className="text-xs text-emerald-400 font-semibold mb-4">{bundle.savings}</p>
        <ul className="space-y-2 mb-5">
          {bundle.features.map((f) => (
            <li key={f} className="flex items-start gap-2 text-xs text-zinc-400">
              <Check size={12} className="text-orange-400 flex-shrink-0 mt-0.5" />{f}
            </li>
          ))}
        </ul>
      </div>
      <button onClick={() => onCheckout(key)} disabled={busyId !== null} className="flex items-center justify-center w-full py-2.5 rounded-full text-sm font-semibold transition-all bg-orange-500 text-foreground hover:opacity-90 hover:scale-[1.02] disabled:opacity-60">
        {busyId === key ? <Loader2 size={14} className="animate-spin" /> : <>Get Bundle <ChevronRight size={14} className="ml-1" /></>}
      </button>
    </div>
  );
}

function AddonsSection({ busyId, onCheckout }: { busyId: string | null; onCheckout: (k: string) => void }) {
  return (
    <div className="space-y-6">
      {/* SlateDrop Pro */}
      <div className="rounded-2xl border border-app bg-app-card p-6">
        <div className="flex items-center gap-2 mb-2">
          <Zap size={16} className="text-orange-400" />
          <h3 className="text-base font-black">{ADDONS_DISPLAY.slatedropPro.name}</h3>
          <span className="text-orange-400 font-black text-sm ml-auto">{ADDONS_DISPLAY.slatedropPro.price}/mo</span>
        </div>
        <p className="text-xs text-zinc-500 mb-3">{ADDONS_DISPLAY.slatedropPro.desc}</p>
        <ul className="grid grid-cols-2 gap-2 mb-4">
          {ADDONS_DISPLAY.slatedropPro.features.map((f) => (
            <li key={f} className="flex items-start gap-2 text-xs text-zinc-400"><Check size={12} className="text-orange-400 flex-shrink-0 mt-0.5" />{f}</li>
          ))}
        </ul>
        <button onClick={() => onCheckout("slatedrop_pro")} disabled={busyId !== null} className="px-6 py-2 rounded-full text-sm font-semibold border border-app text-zinc-300 hover:bg-white/[0.04] transition-all disabled:opacity-60">
          {busyId === "slatedrop_pro" ? <Loader2 size={14} className="animate-spin" /> : <>Add <Plus size={12} className="ml-1" /></>}
        </button>
      </div>

      {/* Storage add-ons */}
      <div className="rounded-2xl border border-app bg-app-card p-6">
        <h3 className="text-base font-black mb-3">Extra Storage</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ADDONS_DISPLAY.storage.map((s) => (
            <div key={s.label} className="flex items-center justify-between border border-app rounded-xl px-4 py-3">
              <span className="text-sm text-zinc-300">{s.label}</span>
              <span className="text-sm font-bold text-orange-400">{s.price}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Credit packs */}
      <div className="rounded-2xl border border-app bg-app-card p-6">
        <h3 className="text-base font-black mb-3">Credit Packs</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {ADDONS_DISPLAY.credits.map((c) => (
            <div key={c.label} className="flex items-center justify-between border border-app rounded-xl px-4 py-3">
              <span className="text-sm text-zinc-300">{c.label}</span>
              <span className="text-sm font-bold text-orange-400">{c.price}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
