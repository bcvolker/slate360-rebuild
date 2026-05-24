"use client";

import Link from "next/link";
import { useState } from "react";
import { PRICING_CARD, PRICING_CTA } from "@/components/marketing-launchpad/marketing-styles";
import {
  ENTERPRISE_PLAN,
  PRICING_TIERS,
  formatAnnualPrice,
  formatEffectiveMonthly,
  type BillingCadence,
  type PricingTier,
} from "@/components/marketing-launchpad/pricing-data";
import { cn } from "@/lib/utils";

const TOGGLE_GROUP =
  "inline-flex flex-wrap items-center justify-center gap-1 rounded-xl border border-white/[0.08] bg-slate-900/40 p-1";

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
        "rounded-lg px-4 py-2 text-sm font-medium transition-all duration-150",
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

export function MarketingPricingSection() {
  const [cadence, setCadence] = useState<BillingCadence>("annual");

  return (
    <section
      id="pricing-matrix-section"
      className="w-full h-auto min-h-0 block relative bg-[#0B0F15] py-28 px-6 lg:px-12 border-none overflow-visible clear-both"
    >
      <div className="mx-auto w-full max-w-[1400px]">
        <h2 className="mb-10 text-center text-3xl font-bold tracking-tight text-[#FFFFFF] lg:text-4xl">
          Subscription Engine
        </h2>

        <div className="mb-8 flex flex-col items-center gap-4">
          <div className={TOGGLE_GROUP}>
            <ToggleButton active={cadence === "monthly"} onClick={() => setCadence("monthly")}>
              Monthly Billing
            </ToggleButton>
            <ToggleButton active={cadence === "annual"} onClick={() => setCadence("annual")}>
              Annual Billing (Save 17%)
            </ToggleButton>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
          {PRICING_TIERS.map((tier) => (
            <PricingCard key={tier.id} tier={tier} cadence={cadence} />
          ))}

          <article className={PRICING_CARD}>
            <h3 className="text-xl font-bold text-[#FFFFFF] lg:text-2xl">
              {ENTERPRISE_PLAN.name}
            </h3>
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

        <p className="mx-auto mt-8 max-w-3xl text-center text-sm leading-relaxed text-[#A3AED0]">
          Buy additional processing meters and credits at direct infrastructure cost with zero
          markups. Slate360 ensures total infrastructure data control — high-volume workflows can
          top up data or credit meters at cost. We never mark up raw cloud processing; you pay
          exactly what you process.
        </p>
      </div>
    </section>
  );
}
