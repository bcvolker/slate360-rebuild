"use client";

import { useMemo, useState } from "react";
import { Gauge, Percent, WalletCards, TrendingUp, Users2, SlidersHorizontal, CreditCard } from "lucide-react";

const MOCK_METRICS = [
  { label: "MRR", value: "$128,400", icon: TrendingUp, accent: "#FF6B35" },
  { label: "Churn", value: "2.8%", icon: Percent, accent: "#3B82F6" },
  { label: "Margin", value: "67%", icon: Gauge, accent: "#1E3A8A" },
  { label: "Runway", value: "22 months", icon: WalletCards, accent: "#F97316" },
  { label: "Active Subscribers", value: "1,942", icon: Users2, accent: "#60A5FA" },
];

const PLANS = [
  { name: "Creator", price: "$79/mo", seats: "1 seat" },
  { name: "Model", price: "$199/mo", seats: "1 seat" },
  { name: "Business", price: "$499/mo", seats: "25 seats" },
  { name: "Enterprise", price: "Custom", seats: "Unlimited" },
];

export default function CeoCommandCenterClient() {
  const [priceLift, setPriceLift] = useState(10);
  const baseMrr = 128400;
  const projectedMrr = useMemo(() => Math.round(baseMrr + priceLift * 190), [priceLift]);

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 bg-[#0B1220] text-slate-100 min-h-screen">
      <header className="rounded-2xl border border-slate-800 bg-[#121A2B] p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">CEO Command Center</p>
        <h1 className="text-2xl font-black text-white">Executive Operations Console</h1>
        <p className="mt-1 text-sm text-slate-300">Internal financial health, experiments, and pricing controls.</p>
      </header>

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-300">Business Health</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {MOCK_METRICS.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.label} className="rounded-2xl border border-slate-800 bg-[#121A2B] p-4">
                <div className="mb-2 inline-flex rounded-lg p-2" style={{ backgroundColor: `${item.accent}20` }}>
                  <Icon size={14} color={item.accent} />
                </div>
                <p className="text-xs uppercase tracking-wide text-slate-400">{item.label}</p>
                <p className="mt-1 text-xl font-black text-white">{item.value}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-2xl border border-slate-800 bg-[#121A2B] p-5">
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-200">
            <SlidersHorizontal size={15} className="text-[#FF6B35]" /> Actions & Experiments
          </h2>
          <p className="mt-2 text-sm text-slate-300">What-if model: If we increase price by ${priceLift}, projected MRR becomes:</p>
          <p className="mt-2 text-3xl font-black text-[#FF6B35]">${projectedMrr.toLocaleString()}</p>
          <div className="mt-4">
            <input
              type="range"
              min={0}
              max={100}
              value={priceLift}
              onChange={(event) => setPriceLift(Number(event.target.value))}
              className="w-full accent-[#FF6B35]"
            />
            <div className="mt-1 flex items-center justify-between text-xs text-slate-400">
              <span>$0 increase</span>
              <span>${priceLift} selected</span>
              <span>$100 increase</span>
            </div>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-800 bg-[#121A2B] p-5">
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-200">
            <CreditCard size={15} className="text-[#3B82F6]" /> Controls
          </h2>
          <div className="mt-3 space-y-2">
            {PLANS.map((plan) => (
              <div key={plan.name} className="flex items-center justify-between rounded-lg border border-slate-700 bg-[#0F172A] px-3 py-2">
                <div>
                  <p className="text-sm font-semibold text-slate-100">{plan.name}</p>
                  <p className="text-xs text-slate-400">{plan.price} · {plan.seats}</p>
                </div>
                <button className="rounded-md border border-slate-600 px-2.5 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-800">
                  Edit Pricing
                </button>
              </div>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}
