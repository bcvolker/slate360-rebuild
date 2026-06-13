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

function CreditsEstimator() {
  const [twins, setTwins] = useState(5);
  const credits = twins * 100;
  const recommendation =
    credits <= 500 ? "Twin 360 Essential covers this" : credits <= 2000 ? "Twin 360 Professional covers this" : "Professional + a top-up pack, or talk to us";

  return (
    <div className={cn(MKT_GLASS_CARD, "mx-auto w-full max-w-2xl")}>
      <p className="text-sm font-bold text-[var(--graphite-text-header)]">How far do credits go?</p>
      <p className="mt-1 text-sm text-[var(--graphite-muted)]">
        Creating one standard twin uses about 100 credits. Slide to your typical month:
      </p>
      <div className="mt-5 flex items-center gap-4">
        <input
          type="range"
          min={1}
          max={25}
          value={twins}
          onChange={(event) => setTwins(Number(event.target.value))}
          className="h-1.5 flex-1 cursor-pointer accent-[var(--twin360-blue)]"
          aria-label="Twins per month"
        />
        <span className="w-24 shrink-0 text-right text-sm font-semibold tabular-nums text-[var(--graphite-text-header)]">
          {twins} {twins === 1 ? "twin" : "twins"}/mo
        </span>
      </div>
      <div className="mt-4 flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
        <p className="text-sm text-[var(--graphite-muted)]">
          ≈ <span className="font-semibold text-[var(--graphite-text-header)]">{credits.toLocaleString()} credits</span>
        </p>
        <p
          className="rounded-full px-3 py-1 text-xs font-semibold"
          style={{
            backgroundColor: "color-mix(in srgb, var(--twin360-blue) 14%, transparent)",
            color: "var(--twin360-blue)",
          }}
        >
          {recommendation}
        </p>
      </div>
      <p className="mt-3 text-xs text-[var(--graphite-muted)]">
        Big month? Top-up packs start at $19 — credits never interrupt a job.
      </p>
    </div>
  );
}

export function MarketingPricing() {
  const [cadence, setCadence] = useState<BillingCadence>("annual");
  const [activeAppId, setActiveAppId] = useState<"site-walk" | "twin-360">("site-walk");
  const activeApp = SLATE360_APPS.find((a) => a.id === activeAppId)!;
  const activeTiers = activeAppId === "site-walk" ? SITE_WALK_PRICING : TWIN_360_PRICING;
  const bundleCadencePrice = priceForCadence(BUNDLE_PRICING, cadence);

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
          <h2 className={cn(MKT_SECTION_TITLE, "mt-3")}>Each app has its own plans</h2>
          <p className={MKT_SUBHEAD}>
            Subscribe to the app you need — or both, and the Bundle saves you money. Every paid
            tier starts with a 14-day free trial. Annual billing saves {ANNUAL_SAVINGS_PERCENT}%.
          </p>
        </motion.div>

        {/* App switcher + cadence */}
        <div className="mt-8 flex flex-col items-center gap-4">
          <div className={MKT_TOGGLE_GROUP} role="tablist" aria-label="Choose an app">
            {SLATE360_APPS.map((app) => {
              const active = app.id === activeAppId;
              return (
                <button
                  key={app.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveAppId(app.id as "site-walk" | "twin-360")}
                  className={cn(
                    "rounded-lg border px-5 py-2.5 text-sm font-semibold transition-colors",
                    !active && MKT_TOGGLE_IDLE,
                  )}
                  style={
                    active
                      ? {
                          borderColor: `color-mix(in srgb, var(${app.accentVar}) 35%, transparent)`,
                          backgroundColor: `color-mix(in srgb, var(${app.accentVar}) 12%, transparent)`,
                          color: `var(${app.accentVar})`,
                        }
                      : undefined
                  }
                >
                  {app.name}
                </button>
              );
            })}
          </div>
          <CadenceToggle cadence={cadence} onChange={setCadence} accentVar={activeApp.accentVar} />
        </div>

        {/* Active app tiers */}
        <div className="mx-auto mt-10 grid max-w-3xl gap-4 sm:grid-cols-2 lg:gap-6">
          {activeTiers.map((tier, index) => (
            <TierCard
              key={tier.id}
              tier={tier}
              cadence={cadence}
              accentVar={activeApp.accentVar}
              highlighted={index === 1}
            />
          ))}
        </div>

        {/* Bundle band */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5 }}
          className="mx-auto mt-8 flex max-w-3xl flex-col items-start gap-4 rounded-2xl border p-5 sm:flex-row sm:items-center sm:justify-between"
          style={{
            borderColor: "color-mix(in srgb, var(--graphite-primary) 30%, transparent)",
            background:
              "linear-gradient(90deg, color-mix(in srgb, var(--graphite-primary) 8%, transparent), color-mix(in srgb, var(--twin360-blue) 8%, transparent))",
          }}
        >
          <div className="min-w-0">
            <p className="text-sm font-bold text-[var(--graphite-text-header)]">
              Run both apps? The Bundle is the best value.
            </p>
            <p className="mt-0.5 text-sm text-[var(--graphite-muted)]">
              Site Walk Pro + Twin 360 Professional, one subscription
              {bundleCadencePrice ? ` — ${bundleCadencePrice.primary}` : ""}.
            </p>
          </div>
          <Link
            href={BUNDLE_PRICING.ctaHref}
            className="shrink-0 rounded-xl bg-gradient-to-r from-[var(--graphite-primary)] to-[var(--twin360-blue)] px-5 py-3 text-sm font-bold text-[var(--graphite-canvas)] transition-all hover:brightness-110 active:scale-[0.99]"
          >
            {BUNDLE_PRICING.cta}
          </Link>
        </motion.div>

        {/* Enterprise row */}
        <p className="mx-auto mt-5 max-w-3xl text-center text-sm text-[var(--graphite-muted)]">
          Teams of 25+?{" "}
          <Link href={ENTERPRISE_PRICING.ctaHref} className="font-semibold text-[var(--graphite-text-header)] underline-offset-4 hover:underline">
            Talk to us about Enterprise
          </Link>{" "}
          — custom seats, pooled credits, your logo on everything clients see.
        </p>

        {/* Credits estimator */}
        <div className="mt-12">
          <CreditsEstimator />
        </div>
      </div>
    </section>
  );
}
