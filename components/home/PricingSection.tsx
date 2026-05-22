"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  APP_PRICING,
  CREDIT_PACK_OPTIONS,
  STORAGE_ADDON_OPTIONS,
  COLLABORATOR_ADDON_OPTIONS,
  PRICING_DISCLAIMER,
  type BillingPeriod,
  type AppPricing,
  type AppTier,
} from "@/components/home/pricing-data";
import { PricingTierCard } from "@/components/home/pricing/PricingTierCard";
import {
  BillingToggle,
  TierSwitch,
  AddonCard,
} from "@/components/home/pricing/PricingSectionParts";

interface PricingSectionProps {
  onGetStarted: () => void;
}

/** Per-app accent — matches the App Showcase border-t color on the homepage. */
const APP_ACCENT: Record<AppPricing["id"], string> = {
  site_walk: "border-t-amber-500",
  tours: "border-t-emerald-500",
  design_studio: "border-t-violet-500",
  content_studio: "border-t-amber-500",
};

export default function PricingSection({ onGetStarted }: PricingSectionProps) {
  const [period, setPeriod] = useState<BillingPeriod>("annual");
  // Per-app tier picker — Pro is the headline tier; users can flip to Basic.
  const [appTier, setAppTier] = useState<Record<string, "basic" | "pro">>({
    site_walk: "pro",
    tours: "pro",
    design_studio: "pro",
    content_studio: "pro",
  });

  const publicApps = APP_PRICING.filter((app) => app.id === "site_walk");

  return (
    <section id="pricing" className="py-24 bg-[#0B0F15] text-slate-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <Badge className="mb-4 border-amber-500/30 bg-amber-500/10 text-amber-200">
            Foundational Release
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-4">
            Site Walk access — approval-gated today
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-slate-400 leading-relaxed">
            Reference pricing for Site Walk is shown below. Self-serve billing is not active during the
            Foundational Release — request access and the team will onboard your workspace.
          </p>
        </div>

        <BillingToggle period={period} onChange={setPeriod} />

        <div className="mt-14">
          <div className="text-center mb-8">
            <h3 className="text-xl font-semibold text-white">Site Walk</h3>
            <p className="text-sm text-slate-500 mt-1">
              Tier reference for when billing is enabled for your account.
            </p>
          </div>

          <div className="mx-auto grid max-w-2xl gap-6 sm:grid-cols-2">
            {publicApps.map((app) => {
              const selected = appTier[app.id] ?? "pro";
              const tier: AppTier = selected === "pro" ? app.pro : app.basic;
              return (
                <div key={app.id} className="flex flex-col gap-2">
                  <TierSwitch
                    value={selected}
                    onChange={(v) =>
                      setAppTier((prev) => ({ ...prev, [app.id]: v }))
                    }
                  />
                  <PricingTierCard
                    groupName={app.name}
                    tagline={app.tagline}
                    tier={tier}
                    period={period}
                    cta="Request access"
                    onCta={onGetStarted}
                    highlight={selected === "pro"}
                    accentBorder={APP_ACCENT[app.id]}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Add-ons row */}
        <div className="mt-20 grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          <AddonCard title="Storage add-ons" subtitle="Top up any plan, monthly.">
            {STORAGE_ADDON_OPTIONS.map((a) => (
              <li key={a.label} className="flex items-center justify-between text-sm">
                <span className="text-slate-700">{a.label}</span>
                <span className="text-slate-900 font-medium">${a.monthlyUsd} / mo</span>
              </li>
            ))}
          </AddonCard>
          <AddonCard title="Processing credits" subtitle="One-time. Credits never expire.">
            {CREDIT_PACK_OPTIONS.map((p) => (
              <li key={p.label} className="flex items-center justify-between text-sm">
                <span className="text-slate-700">
                  {p.credits.toLocaleString()} credits
                </span>
                <span className="text-slate-900 font-medium">${p.priceUsd}</span>
              </li>
            ))}
          </AddonCard>
          <AddonCard title="Extra collaborators" subtitle="Add seats to any plan.">
            {COLLABORATOR_ADDON_OPTIONS.map((c) => (
              <li key={c.label} className="flex items-center justify-between text-sm">
                <span className="text-slate-700">{c.label}</span>
                <span className="text-slate-900 font-medium">${c.monthlyUsd} / mo</span>
              </li>
            ))}
          </AddonCard>
        </div>

        {/* Disclaimer */}
        <div className="mt-10 max-w-4xl mx-auto">
          <p className="text-[11px] text-slate-500 text-center leading-relaxed">
            {PRICING_DISCLAIMER}
          </p>
        </div>
      </div>
    </section>
  );
}
