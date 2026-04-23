"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  APP_PRICING,
  BUNDLE_PRICING,
  CREDIT_PACK_OPTIONS,
  STORAGE_ADDON_OPTIONS,
  COLLABORATOR_ADDON_OPTIONS,
  PRICING_DISCLAIMER,
  type BillingPeriod,
  type AppPricing,
  type AppTier,
} from "@/components/home/pricing-data";
import { PricingTierCard } from "@/components/home/pricing/PricingTierCard";
import { EnterpriseCard } from "@/components/home/pricing/EnterpriseCard";
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
  site_walk: "border-t-cobalt",
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

  const masterBundle = BUNDLE_PRICING.find((b) => b.id === "total");
  const otherBundles = BUNDLE_PRICING.filter(
    (b) => b.id !== "total" && !b.enterpriseCustom,
  );
  const enterpriseBundle = BUNDLE_PRICING.find((b) => b.enterpriseCustom);

  return (
    <section id="pricing" className="py-24 bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-10">
          <Badge className="mb-4 bg-cobalt/10 text-cobalt border border-cobalt/30 hover:bg-cobalt/15">
            Pricing
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-4">
            Subscribe to one app, build a stack, or unlock the platform
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-slate-600 leading-relaxed">
            Every app available standalone. Bundle for a lower per-app cost. Cancel anytime.
          </p>
        </div>

        {/* Monthly / Annual toggle */}
        <BillingToggle period={period} onChange={setPeriod} />

        {/* ──────────────────────────────────────────────────────────────
            A LA CARTE APPS — single card per app with Basic/Pro mini-toggle
            ────────────────────────────────────────────────────────────── */}
        <div className="mt-14">
          <div className="text-center mb-8">
            <h3 className="text-xl font-semibold text-slate-900">À la carte apps</h3>
            <p className="text-sm text-slate-500 mt-1">
              Pick the app you need. Switch tier inside each card.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {APP_PRICING.map((app) => {
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
                    cta={`Start ${app.name}`}
                    onCta={onGetStarted}
                    highlight={selected === "pro"}
                    accentBorder={APP_ACCENT[app.id]}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* ──────────────────────────────────────────────────────────────
            THE MASTER BUNDLE — Total Platform, prominent, cobalt halo
            ────────────────────────────────────────────────────────────── */}
        {masterBundle?.pro && masterBundle?.basic && (
          <div className="mt-20">
            <div className="text-center mb-8">
              <Badge className="mb-3 bg-cobalt text-white shadow-md shadow-cobalt/30">
                Best Value
              </Badge>
              <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                {masterBundle.name}
              </h3>
              <p className="text-sm text-slate-600 mt-2 max-w-xl mx-auto leading-relaxed">
                The full ecosystem in one subscription — every app, shared
                storage, shared credits, one bill.
              </p>
            </div>

            <div className="relative max-w-4xl mx-auto">
              {/* Cobalt halo behind the featured card */}
              <div
                aria-hidden
                className="absolute inset-0 -m-2 rounded-3xl bg-gradient-to-br from-cobalt/20 via-cobalt/10 to-transparent blur-2xl"
              />
              <div className="relative grid gap-6 sm:grid-cols-2">
                <PricingTierCard
                  groupName={masterBundle.name}
                  tagline={masterBundle.tagline}
                  tier={masterBundle.basic}
                  period={period}
                  cta="Get Total Platform Basic"
                  onCta={onGetStarted}
                />
                <PricingTierCard
                  groupName={masterBundle.name}
                  tagline={masterBundle.tagline}
                  tier={masterBundle.pro}
                  period={period}
                  cta="Get Total Platform Pro"
                  onCta={onGetStarted}
                  feature
                  badge="Most Popular"
                />
              </div>
            </div>
          </div>
        )}

        {/* ──────────────────────────────────────────────────────────────
            OTHER BUNDLES + ENTERPRISE
            ────────────────────────────────────────────────────────────── */}
        <div className="mt-20">
          <div className="text-center mb-8">
            <h3 className="text-xl font-semibold text-slate-900">More bundles</h3>
            <p className="text-sm text-slate-500 mt-1">
              Pair related apps for a lower per-app cost.
            </p>
          </div>

          <div className="space-y-10">
            {otherBundles.map((bundle) => (
              <div key={bundle.id}>
                <div className="text-center mb-4">
                  <div className="text-base font-semibold text-slate-900">{bundle.name}</div>
                  <div className="text-xs text-slate-500">{bundle.tagline}</div>
                </div>
                <div className="grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
                  {bundle.basic && (
                    <PricingTierCard
                      groupName={bundle.name}
                      tagline=""
                      tier={bundle.basic}
                      period={period}
                      cta={`Get ${bundle.name} Basic`}
                      onCta={onGetStarted}
                    />
                  )}
                  {bundle.pro && (
                    <PricingTierCard
                      groupName={bundle.name}
                      tagline=""
                      tier={bundle.pro}
                      period={period}
                      cta={`Get ${bundle.name} Pro`}
                      onCta={onGetStarted}
                      highlight
                    />
                  )}
                </div>
              </div>
            ))}
          </div>

          {enterpriseBundle && (
            <div className="mt-12 max-w-md mx-auto">
              <EnterpriseCard bundle={enterpriseBundle} onContact={onGetStarted} />
            </div>
          )}
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
