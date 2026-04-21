"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  APP_PRICING,
  BUNDLE_PRICING,
  CREDIT_PACK_OPTIONS,
  STORAGE_ADDON_OPTIONS,
  COLLABORATOR_ADDON_OPTIONS,
  PRICING_DISCLAIMER,
  type BillingPeriod,
} from "@/components/home/pricing-data";
import { PricingTierCard } from "@/components/home/pricing/PricingTierCard";
import { EnterpriseCard } from "@/components/home/pricing/EnterpriseCard";

interface PricingSectionProps {
  onGetStarted: () => void;
}

export default function PricingSection({ onGetStarted }: PricingSectionProps) {
  const [period, setPeriod] = useState<BillingPeriod>("monthly");

  return (
    <section id="pricing" className="py-24 bg-surface">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-10">
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
            Pricing
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Simple, transparent pricing
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Subscribe to a single app, build your own stack, or save with a bundle. Cancel anytime.
          </p>
        </div>

        {/* Monthly / Annual toggle */}
        <BillingToggle period={period} onChange={setPeriod} />

        {/* PER-APP TIERS — equal treatment, two cards per app */}
        <div className="mt-14">
          <h3 className="text-xl font-semibold text-foreground text-center mb-2">
            Per-app subscriptions
          </h3>
          <p className="text-center text-sm text-muted-foreground mb-8">
            Every app available standalone at Basic or Pro. Pick what your team needs.
          </p>
          <div className="space-y-10">
            {APP_PRICING.map((app) => (
              <div key={app.id}>
                <div className="text-center mb-4">
                  <div className="text-base font-semibold text-foreground">{app.name}</div>
                  <div className="text-xs text-muted-foreground">{app.tagline}</div>
                </div>
                <div className="grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
                  <PricingTierCard
                    groupName={app.name}
                    tagline=""
                    tier={app.basic}
                    period={period}
                    cta={`Start ${app.name} Basic`}
                    onCta={onGetStarted}
                  />
                  <PricingTierCard
                    groupName={app.name}
                    tagline=""
                    tier={app.pro}
                    period={period}
                    cta={`Start ${app.name} Pro`}
                    onCta={onGetStarted}
                    highlight
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* BUNDLES — equal treatment, Basic + Pro for each */}
        <div className="mt-20">
          <h3 className="text-xl font-semibold text-foreground text-center mb-2">
            Bundles
          </h3>
          <p className="text-center text-sm text-muted-foreground mb-8">
            Combine apps for a lower per-app cost. Every bundle has Basic and Pro options.
          </p>
          <div className="space-y-10">
            {BUNDLE_PRICING.filter((b) => !b.enterpriseCustom).map((bundle) => (
              <div key={bundle.id}>
                <div className="text-center mb-4">
                  <div className="text-base font-semibold text-foreground">{bundle.name}</div>
                  <div className="text-xs text-muted-foreground">{bundle.tagline}</div>
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

          {/* Enterprise standalone */}
          <div className="mt-10 max-w-md mx-auto">
            {BUNDLE_PRICING
              .filter((b) => b.enterpriseCustom)
              .map((bundle) => (
                <EnterpriseCard
                  key={bundle.id}
                  bundle={bundle}
                  onContact={onGetStarted}
                />
              ))}
          </div>
        </div>

        {/* Add-ons row */}
        <div className="mt-20 grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          <AddonCard title="Storage add-ons" subtitle="Top up any plan, monthly.">
            {STORAGE_ADDON_OPTIONS.map((a) => (
              <li key={a.label} className="flex items-center justify-between text-sm">
                <span className="text-foreground">{a.label}</span>
                <span className="text-foreground font-medium">${a.monthlyUsd} / mo</span>
              </li>
            ))}
          </AddonCard>
          <AddonCard title="Processing credits" subtitle="One-time. Credits never expire.">
            {CREDIT_PACK_OPTIONS.map((p) => (
              <li key={p.label} className="flex items-center justify-between text-sm">
                <span className="text-foreground">
                  {p.credits.toLocaleString()} credits
                </span>
                <span className="text-foreground font-medium">${p.priceUsd}</span>
              </li>
            ))}
          </AddonCard>
          <AddonCard title="Extra collaborators" subtitle="Add seats to any plan.">
            {COLLABORATOR_ADDON_OPTIONS.map((c) => (
              <li key={c.label} className="flex items-center justify-between text-sm">
                <span className="text-foreground">{c.label}</span>
                <span className="text-foreground font-medium">${c.monthlyUsd} / mo</span>
              </li>
            ))}
          </AddonCard>
        </div>

        {/* Disclaimer */}
        <div className="mt-10 max-w-4xl mx-auto">
          <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
            {PRICING_DISCLAIMER}
          </p>
        </div>
      </div>
    </section>
  );
}

function BillingToggle({
  period,
  onChange,
}: {
  period: BillingPeriod;
  onChange: (p: BillingPeriod) => void;
}) {
  return (
    <div className="flex justify-center">
      <div
        className="inline-flex items-center rounded-full border border-glass bg-glass p-1"
        role="tablist"
        aria-label="Billing period"
      >
        <ToggleButton
          active={period === "monthly"}
          onClick={() => onChange("monthly")}
          label="Monthly"
        />
        <ToggleButton
          active={period === "annual"}
          onClick={() => onChange("annual")}
          label="Annual"
          subtitle="Save 17%"
        />
      </div>
    </div>
  );
}

function ToggleButton({
  active,
  onClick,
  label,
  subtitle,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  subtitle?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "px-5 py-2 rounded-full text-sm font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
      {subtitle && (
        <span className="ml-2 text-[10px] uppercase tracking-wide opacity-80">
          {subtitle}
        </span>
      )}
    </button>
  );
}

function AddonCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-glass bg-glass p-6">
      <h4 className="text-sm font-semibold text-foreground mb-1">{title}</h4>
      <p className="text-xs text-muted-foreground mb-4">{subtitle}</p>
      <ul className="space-y-2">{children}</ul>
    </div>
  );
}
