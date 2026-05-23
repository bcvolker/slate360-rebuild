import Link from "next/link";
import {
  TILE_SECTION,
  PRICING_CARD,
  PRICING_CTA,
} from "@/components/marketing-launchpad/marketing-styles";
import { SHOWCASE_PLANS } from "@/components/marketing-launchpad/pricing-data";

export function MarketingPricingSection() {
  return (
    <section id="pricing-matrix-section" className={`${TILE_SECTION} items-center`}>
      <div className="mx-auto w-full">
        <h2 className="mb-10 text-center text-3xl font-bold tracking-tight text-[#FFFFFF] lg:text-4xl">
          Subscription Engine
        </h2>

        <div className="grid gap-6 lg:grid-cols-2">
          {SHOWCASE_PLANS.map((plan) => (
            <article key={plan.id} className={PRICING_CARD}>
              <h3 className="text-xl font-bold text-[#FFFFFF] lg:text-2xl">{plan.name}</h3>
              <div className="mt-4 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <p className="text-4xl font-bold tracking-tight text-[#00E699]">
                  ${plan.annualMonthly}
                  <span className="text-lg font-medium text-[#A3AED0]">/mo</span>
                </p>
                <p className="text-sm text-[#A3AED0]">billed annually</p>
                <p className="text-sm text-[#A3AED0]">
                  or ${plan.monthly}/mo monthly
                </p>
              </div>
              <ul className="mt-6 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-base text-[#F8FAFC]">
                    <span aria-hidden className="shrink-0 text-[#00E699]">
                      »
                    </span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Link href={`/signup?plan=${plan.id}`} className={PRICING_CTA}>
                {plan.button}
              </Link>
            </article>
          ))}
        </div>

        <p className="mt-8 text-center text-sm leading-relaxed text-[#A3AED0]">
          Slate360 ensures total infrastructure data control. High-volume processing workflows requiring
          capacity beyond standard subscription allotments can top up data or credit meters at cost. We
          never mark up raw cloud processing costs; you pay exactly what you process.
        </p>
      </div>
    </section>
  );
}
