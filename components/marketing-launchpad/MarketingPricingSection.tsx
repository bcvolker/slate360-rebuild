"use client";

import Link from "next/link";
import { useState } from "react";
import {
  PRICING_BLOCK,
  PRICING_CARD,
  PRICING_CTA,
  PRICING_INFO_PANEL,
  PRICING_LIMITS_PANEL,
  TILE_SECTION_FLOW,
} from "@/components/marketing-launchpad/marketing-styles";
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

const TOGGLE_GROUP =
  "inline-flex flex-wrap items-center justify-center gap-1 rounded-xl border border-white/[0.08] bg-slate-900/30 p-1.5";

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

function PricingCard({ tier, cadence }: { tier: PricingTier; cadence: BillingCadence }) {
  const isAnnual = cadence === "annual";

  return (
    <article className={PRICING_CARD}>
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
            <span
              aria-hidden
              className="mr-0 shrink-0 select-none text-xl font-bold leading-none text-[#00E699] drop-shadow-[0_0_8px_rgba(0,230,153,0.6)]"
            >
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

export function MarketingPricingSection() {
  const [cadence, setCadence] = useState<BillingCadence>("annual");

  return (
    <section id="pricing-matrix-section" className={TILE_SECTION_FLOW}>
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

          <div className="grid gap-6 lg:grid-cols-2 lg:gap-7 xl:grid-cols-4 xl:gap-6">
            {PRICING_TIERS.map((tier) => (
              <PricingCard key={tier.id} tier={tier} cadence={cadence} />
            ))}

            <article className={PRICING_CARD}>
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
                      className="mr-0 shrink-0 select-none text-xl font-bold leading-none text-[#00E699] drop-shadow-[0_0_8px_rgba(0,230,153,0.6)]"
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
