"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Gauge, Percent, WalletCards, TrendingUp, Users2, SlidersHorizontal, CreditCard, ChevronLeft, ChevronDown, LayoutDashboard, FolderKanban, BarChart3, FolderOpen, Plug } from "lucide-react";

const QUICK_NAV = [
  { label: "Dashboard",    href: "/dashboard",    icon: LayoutDashboard },
  { label: "Project Hub",  href: "/project-hub",  icon: FolderKanban },
  { label: "Analytics",    href: "/analytics",    icon: BarChart3 },
  { label: "SlateDrop",    href: "/slatedrop",    icon: FolderOpen },
  { label: "Integrations", href: "/integrations", icon: Plug },
];

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
  const [quickNavOpen, setQuickNavOpen] = useState(false);
  const baseMrr = 128400;
  const projectedMrr = useMemo(() => Math.round(baseMrr + priceLift * 190), [priceLift]);

  return (
    <div className="min-h-screen bg-[#0B1220] text-slate-100">
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-[#0B1220]/95 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3 md:px-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="shrink-0">
              <img src="/logo.svg" alt="Slate360" className="h-7 w-auto brightness-0 invert" />
            </Link>
            <Link
              href="/dashboard"
              className="hidden sm:flex items-center gap-1.5 text-sm font-semibold text-slate-400 hover:text-[#FF4D00] transition-colors"
            >
              <ChevronLeft size={16} /> Dashboard
            </Link>
            <span className="hidden sm:block text-slate-700">·</span>
            <span className="hidden sm:block text-sm font-bold text-slate-200">CEO Command Center</span>
          </div>
          <div className="relative">
            <button
              onClick={() => setQuickNavOpen(!quickNavOpen)}
              className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:border-slate-600 transition-all"
            >
              <LayoutDashboard size={14} /> Navigate <ChevronDown size={12} />
            </button>
            {quickNavOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setQuickNavOpen(false)} />
                <div className="absolute right-0 top-12 z-50 w-56 rounded-2xl border border-slate-700 bg-slate-800 shadow-2xl py-2 overflow-hidden">
                  {QUICK_NAV.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setQuickNavOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-[#FF4D00]/10 hover:text-[#FF4D00] transition-colors"
                      >
                        <Icon size={14} /> {item.label}
                      </Link>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
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
    </div>
  );
}
