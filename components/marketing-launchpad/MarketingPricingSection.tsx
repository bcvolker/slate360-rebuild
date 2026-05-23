"use client";

import Link from "next/link";
import { useState } from "react";
import {
  TILE_SECTION,
  PRICING_CARD,
  TOGGLE_BTN,
  TOGGLE_BTN_ACTIVE,
  TOGGLE_BTN_IDLE,
} from "@/components/marketing-launchpad/marketing-styles";
import {
  type Billing,
  type ProductLine,
  PRODUCT_TABS,
  PLAN_CATALOG,
  formatPlanPrice,
} from "@/components/marketing-launchpad/pricing-data";

function ToggleRow({
  options,
  value,
  onChange,
}: {
  options: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={`${TOGGLE_BTN} ${value === opt.id ? TOGGLE_BTN_ACTIVE : TOGGLE_BTN_IDLE}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function MarketingPricingSection() {
  const [billing, setBilling] = useState<Billing>("annual");
  const [product, setProduct] = useState<ProductLine>("site-walk");
  const plans = PLAN_CATALOG[product];

  return (
    <section id="pricing-matrix-section" className={`${TILE_SECTION} items-center`}>
      <div className="mx-auto w-full max-w-5xl">
        <h2 className="mb-8 text-center text-3xl font-bold tracking-tight text-[#FFFFFF] lg:text-4xl">
          Subscription Engine
        </h2>

        <ToggleRow
          options={[
            { id: "monthly", label: "Monthly Billing" },
            { id: "annual", label: "Annual Billing (Save 17%)" },
          ]}
          value={billing}
          onChange={(id) => setBilling(id as Billing)}
        />

        <div className="mt-4">
          <ToggleRow
            options={PRODUCT_TABS}
            value={product}
            onChange={(id) => setProduct(id as ProductLine)}
          />
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {plans.map((plan) => (
            <article key={plan.id} className={PRICING_CARD}>
              <h3 className="text-xl font-bold text-[#FFFFFF]">{plan.name}</h3>
              <p className="mt-2 text-sm font-semibold text-[#00E699]">
                {formatPlanPrice(plan, billing)}
              </p>
              <p className="mt-4 flex-1 text-sm leading-relaxed text-slate-200">{plan.features}</p>
              <Link
                href={`/signup?plan=${plan.id}&billing=${billing}`}
                className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-[#00E699] py-3 text-sm font-semibold tracking-tight text-[#0B0F15] transition-all hover:bg-[#00CC88] active:scale-[0.99]"
              >
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
