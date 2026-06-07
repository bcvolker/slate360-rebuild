"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useState } from "react";
import { IconCheck } from "@tabler/icons-react";
import { SLATE360_APPS } from "@/lib/apps-config";
import {
  ANNUAL_SAVINGS_PERCENT,
  BUNDLE_PRICING,
  ENTERPRISE_PRICING,
  SITE_WALK_PRICING,
  TWIN_360_PRICING,
  priceForCadence,
  type BillingCadence,
  type MarketingPricingTier,
} from "@/lib/marketing/pricing-config";
import {
  MKT_CONTAINER,
  MKT_GLASS_CARD,
  MKT_LABEL,
  MKT_SECTION,
  MKT_SECTION_TITLE,
  MKT_SUBHEAD,
  MKT_TOGGLE_GROUP,
  MKT_TOGGLE_IDLE,
} from "@/app/(public)/_components/marketing-styles";
import { cn } from "@/lib/utils";

function CadenceToggle({
  cadence,
  onChange,
  accentVar,
}: {
  cadence: BillingCadence;
  onChange: (c: BillingCadence) => void;
  accentVar: "--graphite-primary" | "--twin360-blue";
}) {
  const activeStyle = {
    borderColor: `color-mix(in srgb, var(${accentVar}) 35%, transparent)`,
    backgroundColor: `color-mix(in srgb, var(${accentVar}) 12%, transparent)`,
    color: `var(${accentVar})`,
  };

  return (
    <div className={MKT_TOGGLE_GROUP} role="group" aria-label="Billing cadence">
      <button
        type="button"
        onClick={() => onChange("monthly")}
        className={cn("rounded-lg border px-5 py-2.5 text-sm font-medium transition-colors", cadence !== "monthly" && MKT_TOGGLE_IDLE)}
        style={cadence === "monthly" ? activeStyle : undefined}
      >
        Monthly
      </button>
      <button
        type="button"
        onClick={() => onChange("annual")}
        className={cn("rounded-lg border px-5 py-2.5 text-sm font-medium transition-colors", cadence !== "annual" && MKT_TOGGLE_IDLE)}
        style={cadence === "annual" ? activeStyle : undefined}
      >
        Annual (save {ANNUAL_SAVINGS_PERCENT}%)
      </button>
    </div>
  );
}

function TierCard({
  tier,
  cadence,
  accentVar,
  highlighted,
}: {
  tier: MarketingPricingTier;
  cadence: BillingCadence;
  accentVar: "--graphite-primary" | "--twin360-blue";
  highlighted?: boolean;
}) {
  const price = priceForCadence(tier, cadence);
  const isEnterprise = tier.app === "enterprise";

  return (
    <article
      className={cn(
        MKT_GLASS_CARD,
        "flex h-full flex-col",
        highlighted && "ring-1",
      )}
      style={
        highlighted
          ? {
              borderColor: `color-mix(in srgb, var(${accentVar}) 35%, transparent)`,
              boxShadow: `0 0 24px color-mix(in srgb, var(${accentVar}) 12%, transparent)`,
            }
          : undefined
      }
    >
      {tier.badge ? (
        <span
          className="mb-3 inline-flex w-fit rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider"
          style={{
            backgroundColor: `color-mix(in srgb, var(${accentVar}) 18%, transparent)`,
            color: `var(${accentVar})`,
          }}
        >
          {tier.badge}
        </span>
      ) : null}

      <h3 className="text-xl font-bold text-[var(--graphite-text-header)]">{tier.name}</h3>

      {isEnterprise ? (
        <p className="mt-4 text-3xl font-bold tracking-tight text-[var(--graphite-text-header)]">Contact Sales</p>
      ) : price ? (
        <div className="mt-4">
          <p className="text-3xl font-bold tracking-tight text-[var(--graphite-text-header)] sm:text-4xl">{price.primary}</p>
          {price.meta ? <p className="mt-1 text-sm text-[var(--graphite-muted)]">{price.meta}</p> : null}
        </div>
      ) : null}

      <ul className="mt-5 flex flex-1 flex-col gap-2.5">
        {tier.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm text-[var(--graphite-muted)]">
            <IconCheck size={16} className="mt-0.5 shrink-0" style={{ color: `var(${accentVar})` }} stroke={2} />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <Link
        href={tier.ctaHref}
        className="mt-6 inline-flex w-full items-center justify-center rounded-xl border py-3.5 text-sm font-semibold transition-all active:scale-[0.99] lg:mt-8"
        style={{
          borderColor: `color-mix(in srgb, var(${accentVar}) 35%, transparent)`,
          backgroundColor: `color-mix(in srgb, var(${accentVar}) 10%, transparent)`,
          color: `var(${accentVar})`,
        }}
      >
        {tier.cta}
      </Link>
    </article>
  );
}

function AppPricingBlock({
  appName,
  accentVar,
  tiers,
  cadence,
}: {
  appName: string;
  accentVar: "--graphite-primary" | "--twin360-blue";
  tiers: MarketingPricingTier[];
  cadence: BillingCadence;
}) {
  return (
    <div className="space-y-5">
      <div>
        <p className={MKT_LABEL} style={{ color: `var(${accentVar})` }}>
          {appName}
        </p>
        <h3 className="mt-1 text-xl font-bold text-[var(--graphite-text-header)]">Choose your tier</h3>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:gap-6">
        {tiers.map((tier) => (
          <TierCard key={tier.id} tier={tier} cadence={cadence} accentVar={accentVar} />
        ))}
      </div>
    </div>
  );
}

export function MarketingPricing() {
  const [cadence, setCadence] = useState<BillingCadence>("annual");
  const siteWalkApp = SLATE360_APPS.find((a) => a.id === "site-walk")!;
  const twinApp = SLATE360_APPS.find((a) => a.id === "twin-360")!;

  return (
    <section id="pricing" className={cn(MKT_SECTION, "border-t border-white/[0.06] bg-white/[0.015]")}>
      <div className={MKT_CONTAINER}>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-3xl text-center"
        >
          <p className={MKT_LABEL}>Plans & pricing</p>
          <h2 className={cn(MKT_SECTION_TITLE, "mt-3")}>Subscribe per app or bundle both</h2>
          <p className={MKT_SUBHEAD}>
            Every paid tier includes a 14-day free trial. Annual billing saves {ANNUAL_SAVINGS_PERCENT}% versus
            month-to-month.
          </p>
        </motion.div>

        <div className="mt-8 flex flex-col items-center gap-3">
          <CadenceToggle cadence={cadence} onChange={setCadence} accentVar="--graphite-primary" />
        </div>

        <div className="mt-12 flex flex-col gap-12 lg:gap-14">
          <AppPricingBlock
            appName={siteWalkApp.name}
            accentVar={siteWalkApp.accentVar}
            tiers={SITE_WALK_PRICING}
            cadence={cadence}
          />
          <AppPricingBlock
            appName={twinApp.name}
            accentVar={twinApp.accentVar}
            tiers={TWIN_360_PRICING}
            cadence={cadence}
          />

          <div>
            <p className={MKT_LABEL}>Bundle</p>
            <h3 className="mt-1 text-xl font-bold text-[var(--graphite-text-header)]">Both apps, one subscription</h3>
            <div className="mt-5 grid gap-4 lg:max-w-xl">
              <TierCard tier={BUNDLE_PRICING} cadence={cadence} accentVar="--graphite-primary" highlighted />
            </div>
          </div>

          <div>
            <p className={MKT_LABEL}>Volume</p>
            <h3 className="mt-1 text-xl font-bold text-[var(--graphite-text-header)]">Enterprise</h3>
            <div className="mt-5 grid gap-4 lg:max-w-xl">
              <TierCard tier={ENTERPRISE_PRICING} cadence={cadence} accentVar="--twin360-blue" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
