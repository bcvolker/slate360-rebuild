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

type Billing = "monthly" | "annual";
type ProductLine = "site-walk" | "digital-twin" | "bundle" | "enterprise";

const PRODUCT_TABS: { id: ProductLine; label: string }[] = [
  { id: "site-walk", label: "📷 Site Walk" },
  { id: "digital-twin", label: "🌐 Digital Twin" },
  { id: "bundle", label: "📦 Connected Bundle" },
  { id: "enterprise", label: "🏢 Enterprise" },
];

const PRICING: Record<
  Exclude<ProductLine, "enterprise">,
  { basic: { monthly: number; annual: number }; pro: { monthly: number; annual: number } }
> = {
  "site-walk": { basic: { monthly: 66, annual: 790 }, pro: { monthly: 108, annual: 1290 } },
  "digital-twin": { basic: { monthly: 99, annual: 1180 }, pro: { monthly: 166, annual: 1990 } },
  bundle: { basic: { monthly: 133, annual: 1590 }, pro: { monthly: 224, annual: 2690 } },
};

function formatPrice(amount: number, billing: Billing) {
  if (billing === "monthly") return `$${amount}/mo`;
  return `$${amount.toLocaleString()}/yr`;
}

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
  const [billing, setBilling] = useState<Billing>("monthly");
  const [product, setProduct] = useState<ProductLine>("site-walk");

  return (
    <section id="pricing-matrix-section" className={`${TILE_SECTION} items-center`}>
      <div className="mx-auto w-full max-w-5xl">
        <h2 className="mb-8 text-center text-3xl font-bold tracking-tight text-[#FFFFFF] lg:text-4xl">
          Subscription Engine
        </h2>

        <ToggleRow
          options={[
            { id: "monthly", label: "Monthly" },
            { id: "annual", label: "Annual (Save 17%)" },
          ]}
          value={billing}
          onChange={(id) => setBilling(id as Billing)}
        />

        <div className="mt-4">
          <ToggleRow options={PRODUCT_TABS} value={product} onChange={(id) => setProduct(id as ProductLine)} />
        </div>

        {product === "enterprise" ? (
          <article className={`${PRICING_CARD} mt-8 text-center`}>
            <h3 className="text-xl font-bold text-[#FFFFFF]">Enterprise Monolith</h3>
            <p className="mt-4 text-lg font-semibold text-[#00E699]">Custom Volume Pricing // Let&apos;s Talk</p>
            <p className="mt-4 text-sm leading-relaxed text-[#F8FAFC]">
              Unlimited organizational seats, dedicated processing channels, and custom volume pricing
              for large-scale reality capture programs.
            </p>
            <Link
              href="/contact"
              className="mt-6 inline-flex w-full max-w-xs items-center justify-center rounded-xl bg-[#00E699] py-3 text-sm font-semibold tracking-tight text-[#0B0F15] transition-all hover:bg-[#00CC88] active:scale-[0.99]"
            >
              Contact Sales
            </Link>
          </article>
        ) : (
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {(["basic", "pro"] as const).map((tier) => {
              const row = PRICING[product][tier];
              const price = billing === "monthly" ? row.monthly : row.annual;
              const label = tier === "basic" ? "Basic" : "Pro";
              return (
                <article key={tier} className={PRICING_CARD}>
                  <h3 className="text-xl font-bold capitalize text-[#FFFFFF]">
                    {PRODUCT_TABS.find((t) => t.id === product)?.label.replace(/^[^\s]+\s/, "")} {label}
                  </h3>
                  <p className="mt-2 text-sm font-semibold text-[#00E699]">
                    {formatPrice(price, billing)}
                    {billing === "annual" ? " value row" : ""}
                  </p>
                  <Link
                    href={`/signup?plan=${product}&tier=${tier}&billing=${billing}`}
                    className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-[#00E699] py-3 text-sm font-semibold tracking-tight text-[#0B0F15] transition-all hover:bg-[#00CC88] active:scale-[0.99]"
                  >
                    Request Access
                  </Link>
                </article>
              );
            })}
          </div>
        )}

        <p className="mt-8 text-center text-sm leading-relaxed text-[#A3AED0]">
          Slate360 ensures total infrastructure data control. High-volume processing workflows requiring
          capacity beyond standard subscription allotments can top up data or credit meters at cost. We
          never mark up raw cloud processing costs; you pay exactly what you process.
        </p>
      </div>
    </section>
  );
}
