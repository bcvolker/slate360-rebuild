"use client";

import Link from "next/link";
import { useState } from "react";
import {
  MARKETING_FLOW_SECTION,
  MARKETING_HEADING,
  MARKETING_PRICE,
  MARKETING_PRICE_META,
  MARKETING_SECTION_LABEL,
  MARKETING_SUBHEAD,
  PRICING_BLOCK,
  PRICING_CTA,
  PRICING_CTA_SECONDARY,
  TILE_CONTENT,
  TILE_CONTENT_ACCENT,
  TILE_CONTENT_COMPACT,
  TOGGLE_BUTTON_ACTIVE,
  TOGGLE_BUTTON_IDLE,
  TOGGLE_GROUP,
} from "@/components/marketing/marketing-homepage-styles";
import {
  BUNDLE_COMPARISON,
  DIGITAL_TWIN_TIERS,
  ENTERPRISE_PLAN,
  FAIR_USAGE,
  PROCESSING_CREDIT_USES,
  SITE_WALK_TIERS,
  TOP_UP_POLICY,
  formatAnnualPrice,
  formatCreditLimit,
  formatEffectiveMonthly,
  formatMonthlyPrice,
  formatStorageLimit,
  type BillingCadence,
  type PricingTier,
} from "@/components/marketing-launchpad/pricing-data";
import { cn } from "@/lib/utils";

const ALL_TIERS = [...SITE_WALK_TIERS, ...DIGITAL_TWIN_TIERS];

function CadenceToggle({
  cadence,
  onChange,
}: {
  cadence: BillingCadence;
  onChange: (cadence: BillingCadence) => void;
}) {
  return (
    <div className={TOGGLE_GROUP} role="group" aria-label="Billing cadence">
      <button
        type="button"
        onClick={() => onChange("monthly")}
        className={cadence === "monthly" ? TOGGLE_BUTTON_ACTIVE : TOGGLE_BUTTON_IDLE}
      >
        Monthly
      </button>
      <button
        type="button"
        onClick={() => onChange("annual")}
        className={cadence === "annual" ? TOGGLE_BUTTON_ACTIVE : TOGGLE_BUTTON_IDLE}
      >
        Annual (save 17%)
      </button>
    </div>
  );
}

function FeatureLine({ feature }: { feature: string }) {
  return (
    <li className="flex items-start gap-2.5 text-sm text-zinc-200 lg:text-base">
      <span aria-hidden className={cn("mt-0.5 shrink-0 select-none text-base font-semibold", TILE_CONTENT_ACCENT)}>
        ›
      </span>
      <span>{feature}</span>
    </li>
  );
}

function PriceDisplay({ tier, cadence }: { tier: PricingTier; cadence: BillingCadence }) {
  if (cadence === "annual") {
    return (
      <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p className={MARKETING_PRICE}>{formatAnnualPrice(tier)}</p>
        <p className={MARKETING_PRICE_META}>{formatEffectiveMonthly(tier)} billed annually</p>
      </div>
    );
  }

  return (
    <div className="mt-4 flex flex-wrap items-baseline gap-x-2 gap-y-1">
      <p className={MARKETING_PRICE}>
        {formatMonthlyPrice(tier)}
        <span className="text-lg font-medium text-zinc-400">/mo</span>
      </p>
    </div>
  );
}

function TierCard({ tier, cadence }: { tier: PricingTier; cadence: BillingCadence }) {
  return (
    <article className={TILE_CONTENT}>
      <p className={MARKETING_SECTION_LABEL}>{tier.tier === "basic" ? "Essential" : "Professional"}</p>
      <h3 className="mt-1 text-xl font-bold text-white lg:text-2xl">{tier.name}</h3>
      <PriceDisplay tier={tier} cadence={cadence} />
      <ul className="mt-5 flex flex-1 flex-col gap-2.5">
        {tier.features.map((feature) => (
          <FeatureLine key={feature} feature={feature} />
        ))}
      </ul>
      <Link href={`/signup?plan=${tier.id}`} className={PRICING_CTA}>
        {tier.cta}
      </Link>
    </article>
  );
}

function AppPricingGroup({
  title,
  description,
  tiers,
  cadence,
}: {
  title: string;
  description: string;
  tiers: PricingTier[];
  cadence: BillingCadence;
}) {
  return (
    <div className="space-y-5">
      <div className="max-w-2xl">
        <p className={MARKETING_SECTION_LABEL}>{title}</p>
        <h3 className="mt-1 text-xl font-bold text-white lg:text-2xl">{description}</h3>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:gap-6">
        {tiers.map((tier) => (
          <TierCard key={tier.id} tier={tier} cadence={cadence} />
        ))}
      </div>
    </div>
  );
}

function EnterpriseCard() {
  return (
    <article className={TILE_CONTENT_COMPACT}>
      <p className={MARKETING_SECTION_LABEL}>Negotiated</p>
      <h3 className="mt-1 text-lg font-bold text-white lg:text-xl">{ENTERPRISE_PLAN.name}</h3>
      <p className="mt-3 text-2xl font-bold tracking-tight text-white">Custom pricing</p>
      <p className="mt-1 text-sm text-zinc-400">Volume agreements for 25+ seats</p>
      <ul className="mt-4 space-y-2">
        {ENTERPRISE_PLAN.features.map((feature) => (
          <FeatureLine key={feature} feature={feature} />
        ))}
      </ul>
      <Link href="/contact" className={PRICING_CTA_SECONDARY}>
        {ENTERPRISE_PLAN.cta}
      </Link>
    </article>
  );
}

function LimitsTable() {
  return (
    <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/[0.03]">
      <table className="w-full min-w-[520px] text-left text-sm">
        <thead>
          <tr className="border-b border-white/10 text-zinc-400">
            <th className="px-4 py-3 font-semibold">Plan</th>
            <th className="px-4 py-3 font-semibold">Storage</th>
            <th className="px-4 py-3 font-semibold">Processing credits</th>
          </tr>
        </thead>
        <tbody>
          {ALL_TIERS.map((tier) => (
            <tr key={tier.id} className="border-b border-white/[0.06] last:border-b-0">
              <td className="px-4 py-3 font-medium text-zinc-100">{tier.name}</td>
              <td className="px-4 py-3 text-zinc-300">{formatStorageLimit(tier.limits.storageGb)}</td>
              <td className="px-4 py-3 text-zinc-300">{formatCreditLimit(tier.limits.monthlyCredits)}</td>
            </tr>
          ))}
          <tr>
            <td className="px-4 py-3 font-medium text-zinc-100">{ENTERPRISE_PLAN.name}</td>
            <td className="px-4 py-3 text-zinc-300" colSpan={2}>
              Custom pools negotiated per organization
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function DataCreditsSection() {
  return (
    <div className={PRICING_BLOCK}>
      <div className="mx-auto mb-6 max-w-3xl lg:mb-8">
        <h2 className={MARKETING_HEADING}>Data, credits &amp; fair usage</h2>
        <p className={MARKETING_SUBHEAD}>
          Fixed storage and processing pools reset on your billing date. Top up at direct infrastructure
          cost when you need headroom.
        </p>
      </div>

      <LimitsTable />

      <div className="mt-8 grid gap-8 border-t border-white/10 pt-8 lg:grid-cols-3 lg:gap-10">
        <div>
          <h3 className="text-base font-semibold text-white">{TOP_UP_POLICY.headline}</h3>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">{TOP_UP_POLICY.body}</p>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">{TOP_UP_POLICY.creditNote}</p>
        </div>
        <div>
          <h3 className="text-base font-semibold text-white">Processing credits are used for</h3>
          <ul className="mt-3 space-y-1.5">
            {PROCESSING_CREDIT_USES.map((use) => (
              <FeatureLine key={use} feature={use} />
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-base font-semibold text-white">{BUNDLE_COMPARISON.headline}</h3>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">{BUNDLE_COMPARISON.body}</p>
          <h3 className="mt-5 text-base font-semibold text-white">{FAIR_USAGE.headline}</h3>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">{FAIR_USAGE.body}</p>
        </div>
      </div>
    </div>
  );
}

export function MarketingHomepagePricing() {
  const [cadence, setCadence] = useState<BillingCadence>("annual");

  return (
    <section id="pricing-matrix-section" className={cn(MARKETING_FLOW_SECTION, "marketing-flow-section")}>
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-12 lg:gap-16">
        <div className={PRICING_BLOCK}>
          <div className="mx-auto mb-6 max-w-3xl text-center lg:mb-8">
            <h2 className={MARKETING_HEADING}>Plans &amp; pricing</h2>
            <p className={MARKETING_SUBHEAD}>
              Two native apps — each with an essential tier and a professional tier. Enterprise agreements
              are negotiated for larger organizations.
            </p>
          </div>

          <div className="mb-8 flex flex-col items-center gap-3 lg:gap-4">
            <CadenceToggle cadence={cadence} onChange={setCadence} />
            <p className="max-w-xl text-center text-sm text-zinc-400">
              Annual billing applies a 17% discount versus paying month-to-month on the same tier.
            </p>
          </div>

          <div className="flex flex-col gap-10 lg:gap-12">
            <AppPricingGroup
              title="Field documentation"
              description="Site Walk"
              tiers={SITE_WALK_TIERS}
              cadence={cadence}
            />
            <AppPricingGroup
              title="Spatial inspection"
              description="Digital Twin"
              tiers={DIGITAL_TWIN_TIERS}
              cadence={cadence}
            />
          </div>

          <div className="mt-8 lg:mt-10">
            <EnterpriseCard />
          </div>
        </div>

        <DataCreditsSection />
      </div>
    </section>
  );
}
