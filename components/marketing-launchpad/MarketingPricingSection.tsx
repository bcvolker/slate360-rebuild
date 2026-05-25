"use client";

import Link from "next/link";
import { useState } from "react";
import { PRICING_CARD, PRICING_CTA, TILE_SECTION_FLOW } from "@/components/marketing-launchpad/marketing-styles";
import {
  ENTERPRISE_PLAN,
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
  "inline-flex flex-wrap items-center justify-center gap-1 rounded-xl border border-white/[0.08] bg-slate-900/40 p-1.5";

const LIMITS_STRIP =
  "mt-4 rounded-lg border border-[#00E699]/15 bg-[#00E699]/[0.04] px-4 py-3";

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

function TierLimitsStrip({ tier }: { tier: PricingTier }) {
  return (
    <div className={LIMITS_STRIP}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#00E699]/80">
        Included every billing cycle
      </p>
      <p className="mt-1.5 text-sm font-medium leading-snug text-[#F8FAFC]">
        {formatStorageLimit(tier.limits.storageGb)}
        <span className="mx-2 text-[#A3AED0]/60">·</span>
        {formatCreditLimit(tier.limits.monthlyCredits)}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-[#A3AED0]">
        Top up storage or credits at cost when you exceed these allotments.
      </p>
    </div>
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
      <TierLimitsStrip tier={tier} />
      <ul className="mt-5 flex flex-1 flex-col space-y-3">
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

export function MarketingPricingSection() {
  const [cadence, setCadence] = useState<BillingCadence>("annual");

  return (
    <section id="pricing-matrix-section" className={TILE_SECTION_FLOW}>
      <div className="mx-auto w-full max-w-[1400px]">
        <div className="mx-auto mb-8 max-w-3xl text-center lg:mb-10">
          <h2 className="text-3xl font-bold tracking-tight text-[#FFFFFF] lg:text-4xl">
            Subscription Engine
          </h2>
          <p className="mt-3 text-base leading-relaxed text-[#A3AED0] lg:mt-4 lg:text-lg">
            Every tier includes a fixed monthly storage allotment and processing credit pool. Limits
            reset on your billing date — buy more at direct infrastructure cost whenever you need
            headroom.
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
            <div className={`${LIMITS_STRIP} mt-4`}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#00E699]/80">
                Custom infrastructure caps
              </p>
              <p className="mt-1.5 text-sm font-medium leading-snug text-[#F8FAFC]">
                Tailored storage, credit pools, and seat volume for large portfolios
              </p>
            </div>
            <ul className="mt-5 flex flex-1 flex-col space-y-3">
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

        <div className="mx-auto mt-10 max-w-4xl rounded-xl border border-white/[0.08] bg-slate-900/40 p-6 lg:mt-12 lg:p-8">
          <h3 className="text-lg font-semibold text-[#FFFFFF] lg:text-xl">{TOP_UP_POLICY.headline}</h3>
          <p className="mt-3 text-sm leading-relaxed text-[#A3AED0] lg:text-base">{TOP_UP_POLICY.body}</p>
          <p className="mt-3 text-sm leading-relaxed text-[#A3AED0] lg:text-base">
            {TOP_UP_POLICY.creditNote}
          </p>
          <div className="mt-5 border-t border-white/[0.06] pt-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#00E699]/80">
              Processing credits are used for
            </p>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
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
      </div>
    </section>
  );
}
