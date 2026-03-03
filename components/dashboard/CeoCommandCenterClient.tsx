"use client";

import { useMemo, useState } from "react";
import {
  Gauge,
  Percent,
  WalletCards,
  TrendingUp,
  Users2,
  SlidersHorizontal,
  CreditCard,
  Shield,
} from "lucide-react";
import DashboardTabShell from "@/components/shared/DashboardTabShell";
import type { Tier } from "@/lib/entitlements";

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

interface CeoProps {
  user: { name: string; email: string; avatar?: string };
  tier: Tier;
}

export default function CeoCommandCenterClient({ user, tier }: CeoProps) {
  const [priceLift, setPriceLift] = useState(10);
  const baseMrr = 128400;
  const projectedMrr = useMemo(() => Math.round(baseMrr + priceLift * 190), [priceLift]);

  return (
    <DashboardTabShell
      user={user}
      tier={tier}
      title="CEO Command Center"
      icon={Shield}
      accent="#1E3A8A"
      status="live"
      isCeo
    >
      {/* Hero card */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">CEO Command Center</p>
        <h2 className="text-2xl font-black text-gray-900">Executive Operations Console</h2>
        <p className="mt-1 text-sm text-gray-500">Internal financial health, experiments, and pricing controls.</p>
      </div>

      {/* Business Health */}
      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500">Business Health</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {MOCK_METRICS.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.label} className="rounded-2xl border border-gray-200 bg-white p-4">
                <div className="mb-2 inline-flex rounded-lg p-2" style={{ backgroundColor: `${item.accent}15` }}>
                  <Icon size={14} color={item.accent} />
                </div>
                <p className="text-xs uppercase tracking-wide text-gray-400">{item.label}</p>
                <p className="mt-1 text-xl font-black text-gray-900">{item.value}</p>
              </article>
            );
          })}
        </div>
      </section>

      {/* Experiments + Controls */}
      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-gray-700">
            <SlidersHorizontal size={15} className="text-[#FF6B35]" /> Actions &amp; Experiments
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            What-if model: If we increase price by ${priceLift}, projected MRR becomes:
          </p>
          <p className="mt-2 text-3xl font-black text-[#FF6B35]">${projectedMrr.toLocaleString()}</p>
          <div className="mt-4">
            <input
              type="range"
              min={0}
              max={100}
              value={priceLift}
              onChange={(e) => setPriceLift(Number(e.target.value))}
              className="w-full accent-[#FF6B35]"
            />
            <div className="mt-1 flex items-center justify-between text-xs text-gray-400">
              <span>$0 increase</span>
              <span>${priceLift} selected</span>
              <span>$100 increase</span>
            </div>
          </div>
        </article>

        <article className="rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-gray-700">
            <CreditCard size={15} className="text-[#3B82F6]" /> Controls
          </h2>
          <div className="mt-3 space-y-2">
            {PLANS.map((plan) => (
              <div key={plan.name} className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{plan.name}</p>
                  <p className="text-xs text-gray-400">{plan.price} · {plan.seats}</p>
                </div>
                <button className="rounded-md border border-gray-300 px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors">
                  Edit Pricing
                </button>
              </div>
            ))}
          </div>
        </article>
      </section>
    </DashboardTabShell>
  );
}
