import Link from "next/link";
import { TILE_SECTION, PRICING_CARD } from "@/components/marketing-launchpad/marketing-styles";

const PLANS = [
  {
    name: "Site Walk Pro Seat",
    price: "$108/mo billed annually",
    summary:
      "Single-handed capture, interactive photo mapping, and immediate automated PDF reporting loops for field teams who need organized visual documentation on every visit.",
    href: "/signup?plan=site-walk",
  },
  {
    name: "Enterprise Twin Studio",
    price: "Custom volume processing pricing",
    summary:
      "Advanced 3D property modeling streams, point-cloud engines, and unlimited manager seating accounts for organizations running large-scale reality capture programs.",
    href: "/signup?plan=enterprise",
  },
] as const;

export function MarketingPricingSection() {
  return (
    <section id="pricing-matrix-section" className={`${TILE_SECTION} items-center`}>
      <div className="mx-auto w-full max-w-5xl">
        <h2 className="mb-8 text-center text-3xl font-bold tracking-tight text-[#FFFFFF] lg:text-4xl">
          Subscription Engine
        </h2>
        <div className="grid gap-6 md:grid-cols-2">
          {PLANS.map((plan) => (
            <article key={plan.name} className={PRICING_CARD}>
              <h3 className="text-xl font-bold text-[#FFFFFF]">{plan.name}</h3>
              <p className="mt-2 text-sm font-semibold text-[#00E699]">{plan.price}</p>
              <p className="mt-4 flex-1 text-sm leading-relaxed text-[#F8FAFC]">{plan.summary}</p>
              <Link
                href={plan.href}
                className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-[#00E699] py-3 text-sm font-semibold tracking-tight text-[#0B0F15] transition-all hover:bg-[#00CC88] active:scale-[0.99]"
              >
                Request Access
              </Link>
            </article>
          ))}
        </div>
        <p className="mt-8 text-center text-sm leading-relaxed text-[#A3AED0]">
          Slate360 is built to ensure total infrastructure transparency. Heavy data workflows requiring
          processing capacity beyond included subscription caps can buy additional processing credits at
          cost. We never mark up raw infrastructure costs or charge extra overage fees; you pay exactly
          what you process.
        </p>
      </div>
    </section>
  );
}
