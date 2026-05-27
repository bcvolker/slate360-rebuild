"use client";

import Link from "next/link";
import { useState } from "react";
import {
  MARKETING_FLOW_SECTION,
  PRICING_BLOCK,
  PRICING_CTA,
  TILE_CONTENT,
  TILE_CONTENT_ACCENT,
  TILE_CONTENT_COMPACT,
  TOGGLE_GROUP,
} from "@/components/marketing/marketing-homepage-styles";
import {
  BUNDLE_COMPARISON,
  ENTERPRISE_PLAN,
  FAIR_USAGE,
  PRICING_TIERS,
  PROCESSING_CREDIT_USES,
  TOP_UP_POLICY,
  formatAnnualPrice,
  formatCreditLimit,
  formatEffectiveMonthly,
  formatStorageLimit,
  type BillingCadence,
  type PricingTier,
} from "@/components/marketing-launchpad/pricing-data";
import { cn } from "@/lib/utils";

const PRIMARY_TIERS = PRICING_TIERS.filter(
  (tier) => tier.id === "site-walk-pro" || tier.id === "digital-twin-pro",
);
const BUNDLE_TIER = PRICING_TIERS.find((tier) => tier.id === "bundle-pro");

const LIMITS_ROWS = [
  ...PRICING_TIERS.map((tier) => ({
    id: tier.id,
    name: tier.name,
    storageGb: tier.limits.storageGb,
    monthlyCredits: tier.limits.monthlyCredits,
  })),
  {
    id: "enterprise",
    name: ENTERPRISE_PLAN.name,
    storageGb: null as number | null,
    monthlyCredits: null as number | null,
  },
] as const;

type LimitsTabId = (typeof LIMITS_ROWS)[number]["id"];

function ToggleButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg px-5 py-2.5 text-sm font-medium transition-all duration-150",
        active
          ? "border border-[#00E699]/30 bg-[#00E699]/10 text-[#00E699]"
          : "border border-transparent text-slate-400 hover:text-slate-200",
      )}
    >
      {children}
    </button>
  );
}

function FeatureChevron() {
  return (
    <span
      aria-hidden
      className={cn("mr-0 shrink-0 select-none text-xl font-bold leading-none", TILE_CONTENT_ACCENT)}
    >
      »
    </span>
  );
}

function PriceBlock({ tier, cadence }: { tier: PricingTier; cadence: BillingCadence }) {
  const isAnnual = cadence === "annual";

  return (
    <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
      {isAnnual ? (
        <>
          <p className="text-4xl font-bold tracking-tight text-[#00E699]">
            {formatAnnualPrice(tier)}
          </p>
          <p className="text-sm text-[#A3AED0]">{formatEffectiveMonthly(tier)} billed annually</p>
        </>
      ) : (
        <p className="text-4xl font-bold tracking-tight text-[#00E699]">
          ${tier.monthly}
          <span className="text-lg font-medium text-[#A3AED0]">/mo</span>
        </p>
      )}
    </div>
  );
}

function PrimaryPricingTile({ tier, cadence }: { tier: PricingTier; cadence: BillingCadence }) {
  return (
    <article className={TILE_CONTENT}>
      <h3 className="text-xl font-bold text-[#FFFFFF] lg:text-2xl">{tier.name}</h3>
      <PriceBlock tier={tier} cadence={cadence} />
      <ul className="mt-5 flex flex-1 flex-col space-y-2.5">
        {tier.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5 text-sm text-[#F8FAFC] lg:text-base">
            <FeatureChevron />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <Link href={`/signup?plan=${tier.id}`} className={PRICING_CTA}>
        {tier.cta}
      </Link>
    </article>
  );
}

function SecondaryPricingTile({
  title,
  cadence,
  monthly,
  annual,
  annualEffectiveMonthly,
  priceLabel,
  priceSubtext,
  features,
  cta,
  ctaHref,
}: {
  title: string;
  cadence: BillingCadence;
  monthly?: number;
  annual?: number;
  annualEffectiveMonthly?: number;
  priceLabel?: string;
  priceSubtext?: string;
  features: string[];
  cta: string;
  ctaHref: string;
}) {
  return (
    <article className={TILE_CONTENT_COMPACT}>
      <h3 className="text-lg font-bold text-[#FFFFFF]">{title}</h3>
      <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        {priceLabel ? (
          <>
            <p className="text-2xl font-bold tracking-tight text-[#00E699]">{priceLabel}</p>
            {priceSubtext ? <p className="text-sm text-[#A3AED0]">{priceSubtext}</p> : null}
          </>
        ) : cadence === "annual" && annual != null && annualEffectiveMonthly != null ? (
          <>
            <p className="text-2xl font-bold tracking-tight text-[#00E699]">
              ${annual.toLocaleString("en-US")}/yr
            </p>
            <p className="text-sm text-[#A3AED0]">${annualEffectiveMonthly}/mo billed annually</p>
          </>
        ) : monthly != null ? (
          <p className="text-2xl font-bold tracking-tight text-[#00E699]">
            ${monthly}
            <span className="text-base font-medium text-[#A3AED0]">/mo</span>
          </p>
        ) : null}
      </div>
      <ul className="mt-4 space-y-2">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm text-[#F8FAFC]">
            <FeatureChevron />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <Link href={ctaHref} className={`${PRICING_CTA} mt-5 py-3`}>
        {cta}
      </Link>
    </article>
  );
}

function LimitsTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors",
        active
          ? "bg-[#00E699]/10 text-[#00E699]"
          : "text-[#A3AED0] hover:text-[#F8FAFC]",
      )}
    >
      {children}
    </button>
  );
}

function DataCreditsSection() {
  const [activeTab, setActiveTab] = useState<LimitsTabId>("site-walk-pro");
  const activeRow = LIMITS_ROWS.find((row) => row.id === activeTab) ?? LIMITS_ROWS[0];

  return (
    <div className={PRICING_BLOCK}>
      <div className="mx-auto mb-6 max-w-3xl text-center lg:mb-8">
        <h2 className="text-3xl font-bold tracking-tight text-[#FFFFFF] lg:text-4xl">
          Data, Credits &amp; Fair Usage
        </h2>
        <p className="mt-3 text-base leading-relaxed text-[#A3AED0] lg:text-lg">
          Fixed storage and processing pools reset on your billing date. Top up at direct
          infrastructure cost when you need headroom.
        </p>
      </div>

      <div className="rounded-xl border border-white/[0.06] bg-slate-900/20 p-4 lg:p-6">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#A3AED0]">
          Included allotments by plan
        </p>
        <div
          className="mb-5 flex flex-wrap gap-1 border-b border-white/[0.06] pb-4"
          role="tablist"
          aria-label="Plan allotments"
        >
          {LIMITS_ROWS.map((row) => (
            <LimitsTab
              key={row.id}
              active={activeTab === row.id}
              onClick={() => setActiveTab(row.id)}
            >
              {row.name.replace(" Workspace Pro", "").replace(" Reality Studio", "")}
            </LimitsTab>
          ))}
        </div>

        <div role="tabpanel" className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[#A3AED0]">Storage</p>
            <p className="mt-1 text-lg font-semibold text-[#F8FAFC]">
              {activeRow.storageGb != null
                ? formatStorageLimit(activeRow.storageGb)
                : "Custom volume negotiated per organization"}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[#A3AED0]">
              Processing credits
            </p>
            <p className="mt-1 text-lg font-semibold text-[#F8FAFC]">
              {activeRow.monthlyCredits != null
                ? formatCreditLimit(activeRow.monthlyCredits)
                : "Custom pools and priority queues"}
            </p>
          </div>
        </div>
        <p className="mt-4 text-xs leading-relaxed text-[#A3AED0]">
          Allotments reset each billing cycle. Unused storage and credits do not roll over.
        </p>
      </div>

      <div className="mt-8 grid gap-8 border-t border-white/[0.06] pt-8 lg:grid-cols-3 lg:gap-10">
        <div>
          <h3 className="text-base font-semibold text-[#FFFFFF]">{TOP_UP_POLICY.headline}</h3>
          <p className="mt-2 text-sm leading-relaxed text-[#A3AED0]">{TOP_UP_POLICY.body}</p>
          <p className="mt-2 text-sm leading-relaxed text-[#A3AED0]">{TOP_UP_POLICY.creditNote}</p>
        </div>

        <div>
          <h3 className="text-base font-semibold text-[#FFFFFF]">Processing credits are used for</h3>
          <ul className="mt-3 space-y-1.5">
            {PROCESSING_CREDIT_USES.map((use) => (
              <li key={use} className="flex items-start gap-2 text-sm text-[#F8FAFC]">
                <span aria-hidden className="shrink-0 text-[#00E699]">
                  »
                </span>
                <span>{use}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-base font-semibold text-[#FFFFFF]">{BUNDLE_COMPARISON.headline}</h3>
          <p className="mt-2 text-sm leading-relaxed text-[#A3AED0]">{BUNDLE_COMPARISON.body}</p>
          <h3 className="mt-5 text-base font-semibold text-[#FFFFFF]">{FAIR_USAGE.headline}</h3>
          <p className="mt-2 text-sm leading-relaxed text-[#A3AED0]">{FAIR_USAGE.body}</p>
        </div>
      </div>
    </div>
  );
}

export function MarketingHomepagePricing() {
  const [cadence, setCadence] = useState<BillingCadence>("annual");

  return (
    <section id="pricing-matrix-section" className={MARKETING_FLOW_SECTION}>
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-14 lg:gap-20">
        <div className={PRICING_BLOCK}>
          <div className="mx-auto mb-6 max-w-3xl text-center lg:mb-8">
            <h2 className="text-3xl font-bold tracking-tight text-[#FFFFFF] lg:text-4xl">
              Plans &amp; Pricing
            </h2>
            <p className="mt-3 text-base leading-relaxed text-[#A3AED0] lg:text-lg">
              Choose the workspace that matches your field and studio workflows.
            </p>
          </div>

          <div className="mb-6 flex flex-col items-center gap-3 lg:mb-8 lg:gap-4">
            <div className={TOGGLE_GROUP} role="group" aria-label="Billing cadence">
              <ToggleButton active={cadence === "monthly"} onClick={() => setCadence("monthly")}>
                Monthly Billing
              </ToggleButton>
              <ToggleButton active={cadence === "annual"} onClick={() => setCadence("annual")}>
                Annual Billing (Save 17%)
              </ToggleButton>
            </div>
            <p className="max-w-xl text-center text-sm text-[#A3AED0]">
              Annual billing applies a 17% discount versus paying month-to-month on the same tier.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
            {PRIMARY_TIERS.map((tier) => (
              <PrimaryPricingTile key={tier.id} tier={tier} cadence={cadence} />
            ))}
          </div>

          {BUNDLE_TIER ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:mt-8 lg:gap-6">
              <SecondaryPricingTile
                title={BUNDLE_TIER.name}
                cadence={cadence}
                monthly={BUNDLE_TIER.monthly}
                annual={BUNDLE_TIER.annual}
                annualEffectiveMonthly={BUNDLE_TIER.annualEffectiveMonthly}
                features={BUNDLE_TIER.features}
                cta={BUNDLE_TIER.cta}
                ctaHref={`/signup?plan=${BUNDLE_TIER.id}`}
              />
              <SecondaryPricingTile
                title={ENTERPRISE_PLAN.name}
                cadence={cadence}
                priceLabel="Custom"
                priceSubtext="Volume pricing for 25+ seats"
                features={ENTERPRISE_PLAN.features}
                cta={ENTERPRISE_PLAN.cta}
                ctaHref="/contact"
              />
            </div>
          ) : null}
        </div>

        <DataCreditsSection />
      </div>
    </section>
  );
}
