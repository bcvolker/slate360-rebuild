"use client";

import Link from "next/link";
import { useState } from "react";
import {
  PRICING_BLOCK,
  PRICING_CTA,
  PRICING_INFO_PANEL,
  PRICING_LIMITS_PANEL,
  TILE_CONTENT,
  TILE_CONTENT_ACCENT,
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

function PrimaryPricingTile({ tier, cadence }: { tier: PricingTier; cadence: BillingCadence }) {
  const isAnnual = cadence === "annual";

  return (
    <article className={TILE_CONTENT}>
      <h3 className="text-xl font-bold text-[#FFFFFF] lg:text-2xl">{tier.name}</h3>
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
      <ul className="mt-6 flex flex-1 flex-col space-y-3">
        {tier.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5 text-base text-[#F8FAFC]">
            <span aria-hidden className={cn("mr-0 shrink-0 select-none text-xl font-bold leading-none", TILE_CONTENT_ACCENT)}>
              »
            </span>
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

function TierLimitsCard({ tier }: { tier: PricingTier }) {
  return (
    <article className={PRICING_LIMITS_PANEL}>
      <h3 className="text-lg font-bold text-[#FFFFFF]">{tier.name}</h3>
      <p className="mt-4 text-sm font-medium leading-snug text-[#F8FAFC]">
        {formatStorageLimit(tier.limits.storageGb)}
      </p>
      <p className="mt-2 text-sm font-medium leading-snug text-[#F8FAFC]">
        {formatCreditLimit(tier.limits.monthlyCredits)}
      </p>
      <p className="mt-4 text-xs leading-relaxed text-[#A3AED0]">
        Resets each billing cycle. Top up at cost when you exceed these allotments.
      </p>
    </article>
  );
}

function EnterpriseLimitsCard() {
  return (
    <article className={PRICING_LIMITS_PANEL}>
      <h3 className="text-lg font-bold text-[#FFFFFF]">{ENTERPRISE_PLAN.name}</h3>
      <p className="mt-4 text-sm font-medium leading-snug text-[#F8FAFC]">
        Tailored storage, credit pools, and seat volume
      </p>
      <p className="mt-2 text-sm font-medium leading-snug text-[#F8FAFC]">
        Custom processing pipelines and priority queues
      </p>
      <p className="mt-4 text-xs leading-relaxed text-[#A3AED0]">
        Volume caps and reset windows negotiated per organization.
      </p>
    </article>
  );
}

export function MarketingHomepagePricing() {
  const [cadence, setCadence] = useState<BillingCadence>("annual");

  return (
    <section id="pricing-matrix-section" className="marketing-flow-section">
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-16 lg:gap-24">
        <div className={PRICING_BLOCK}>
          <div className="mx-auto mb-8 max-w-3xl text-center lg:mb-10">
            <h2 className="text-3xl font-bold tracking-tight text-[#FFFFFF] lg:text-4xl">
              Plans &amp; Pricing
            </h2>
            <p className="mt-4 text-base leading-relaxed text-[#A3AED0] lg:text-lg">
              Choose the workspace that matches your field and studio workflows.
            </p>
          </div>

          <div className="mb-8 flex flex-col items-center gap-4 lg:mb-10 lg:gap-5">
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
            <div className="mt-8 grid gap-6 lg:mt-10 lg:grid-cols-2 lg:gap-8">
              <article className={TILE_CONTENT}>
                <h3 className="text-xl font-bold text-[#FFFFFF] lg:text-2xl">{BUNDLE_TIER.name}</h3>
                <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  {cadence === "annual" ? (
                    <>
                      <p className="text-4xl font-bold tracking-tight text-[#00E699]">
                        {formatAnnualPrice(BUNDLE_TIER)}
                      </p>
                      <p className="text-sm text-[#A3AED0]">
                        {formatEffectiveMonthly(BUNDLE_TIER)} billed annually
                      </p>
                    </>
                  ) : (
                    <p className="text-4xl font-bold tracking-tight text-[#00E699]">
                      ${BUNDLE_TIER.monthly}
                      <span className="text-lg font-medium text-[#A3AED0]">/mo</span>
                    </p>
                  )}
                </div>
                <ul className="mt-6 flex flex-1 flex-col space-y-3">
                  {BUNDLE_TIER.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-base text-[#F8FAFC]">
                      <span
                        aria-hidden
                        className={cn(
                          "mr-0 shrink-0 select-none text-xl font-bold leading-none",
                          TILE_CONTENT_ACCENT,
                        )}
                      >
                        »
                      </span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link href={`/signup?plan=${BUNDLE_TIER.id}`} className={PRICING_CTA}>
                  {BUNDLE_TIER.cta}
                </Link>
              </article>

              <article className={TILE_CONTENT}>
                <h3 className="text-xl font-bold text-[#FFFFFF] lg:text-2xl">{ENTERPRISE_PLAN.name}</h3>
                <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <p className="text-3xl font-bold tracking-tight text-[#00E699]">Custom</p>
                  <p className="text-sm text-[#A3AED0]">Volume pricing for 25+ seats</p>
                </div>
                <ul className="mt-6 flex flex-1 flex-col space-y-3">
                  {ENTERPRISE_PLAN.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-base text-[#F8FAFC]">
                      <span
                        aria-hidden
                        className={cn(
                          "mr-0 shrink-0 select-none text-xl font-bold leading-none",
                          TILE_CONTENT_ACCENT,
                        )}
                      >
                        »
                      </span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/contact" className={PRICING_CTA}>
                  {ENTERPRISE_PLAN.cta}
                </Link>
              </article>
            </div>
          ) : null}
        </div>

        <div className={PRICING_BLOCK}>
          <div className="mx-auto mb-8 max-w-3xl text-center lg:mb-10">
            <h2 className="text-3xl font-bold tracking-tight text-[#FFFFFF] lg:text-4xl">
              Data, Credits &amp; Fair Usage
            </h2>
            <p className="mt-4 text-base leading-relaxed text-[#A3AED0] lg:text-lg">
              Fixed storage and processing pools reset on your billing date. Top up at direct
              infrastructure cost when you need headroom.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            {PRICING_TIERS.map((tier) => (
              <TierLimitsCard key={tier.id} tier={tier} />
            ))}
            <EnterpriseLimitsCard />
          </div>

          <div className="mt-10 grid gap-8 lg:mt-12 lg:grid-cols-2 lg:gap-10">
            <div className={PRICING_INFO_PANEL}>
              <h3 className="text-lg font-semibold text-[#FFFFFF] lg:text-xl">{TOP_UP_POLICY.headline}</h3>
              <p className="mt-3 text-sm leading-relaxed text-[#A3AED0] lg:text-base">
                {TOP_UP_POLICY.body}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-[#A3AED0] lg:text-base">
                {TOP_UP_POLICY.creditNote}
              </p>
            </div>

            <div className={PRICING_INFO_PANEL}>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#00E699]/80">
                Processing credits are used for
              </p>
              <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
                {PROCESSING_CREDIT_USES.map((use) => (
                  <li key={use} className="flex items-start gap-2 text-sm text-[#F8FAFC]">
                    <span aria-hidden className="mt-0.5 shrink-0 text-[#00E699]">
                      »
                    </span>
                    <span>{use}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-8 grid gap-6 border-t border-white/[0.06] pt-8 lg:mt-10 lg:grid-cols-2 lg:gap-8 lg:pt-10">
            <div>
              <h3 className="text-lg font-semibold text-[#FFFFFF]">{BUNDLE_COMPARISON.headline}</h3>
              <p className="mt-3 text-sm leading-relaxed text-[#A3AED0] lg:text-base">
                {BUNDLE_COMPARISON.body}
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-[#FFFFFF]">{FAIR_USAGE.headline}</h3>
              <p className="mt-3 text-sm leading-relaxed text-[#A3AED0] lg:text-base">
                {FAIR_USAGE.body}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
