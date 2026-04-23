"use client";

import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AppTier, BillingPeriod } from "@/components/home/pricing-data";

interface PricingTierCardProps {
  groupName: string;
  tagline: string;
  tier: AppTier;
  period: BillingPeriod;
  cta: string;
  onCta: () => void;
  /** Pro-tier visual emphasis: cobalt rim + soft cobalt glow. */
  highlight?: boolean;
  /** Master-bundle treatment: stronger cobalt halo + cobalt CTA. */
  feature?: boolean;
  /** Optional ribbon ("Most Popular", "Best Value"). */
  badge?: string;
  /** Optional colored top accent (e.g. "border-t-cobalt"). */
  accentBorder?: string;
}

/**
 * Single tier card. Light premium styling — used for both per-app tiers
 * (Basic/Pro) and bundle tiers (Basic/Pro). Treats every app/bundle equally.
 */
export function PricingTierCard({
  groupName,
  tagline,
  tier,
  period,
  cta,
  onCta,
  highlight = false,
  feature = false,
  badge,
  accentBorder,
}: PricingTierCardProps) {
  const isAnnual = period === "annual";
  const displayPrice = isAnnual
    ? Math.round(tier.annualUsd / 12)
    : tier.monthlyUsd;
  const totalAnnual = tier.annualUsd;

  return (
    <Card
      className={cn(
        "relative flex flex-col bg-white rounded-2xl ring-1 ring-slate-200/80 shadow-[0_10px_30px_rgba(15,23,42,0.06)]",
        "transition-transform duration-300 hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(15,23,42,0.10)]",
        highlight && "ring-cobalt/40 shadow-[0_15px_40px_rgba(59,130,246,0.15)]",
        feature && "ring-2 ring-cobalt/50 shadow-[0_10px_40px_rgba(59,130,246,0.20)]",
        accentBorder && `border-t-4 ${accentBorder}`,
      )}
    >
      {badge && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-cobalt text-white shadow-md shadow-cobalt/30">
          {badge}
        </Badge>
      )}
      <CardHeader className="text-center pb-2">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-cobalt mb-1">
          {tier.label}
        </div>
        <CardTitle className="text-lg text-slate-900">{groupName}</CardTitle>
        {tagline && (
          <CardDescription className="text-slate-500 text-xs min-h-[2.25rem]">
            {tagline}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="text-center flex flex-col flex-1">
        <div className="mb-1">
          <span className="text-4xl font-bold text-slate-900 tracking-tight">${displayPrice}</span>
          <span className="text-slate-500 text-sm"> /mo</span>
        </div>
        <div className="text-[11px] text-slate-500 mb-5 min-h-[1rem]">
          {isAnnual ? `Billed annually · $${totalAnnual.toLocaleString()}/yr` : "Billed monthly"}
        </div>
        <ul className="space-y-2 mb-6 text-left flex-1">
          {tier.features.map((featureItem) => (
            <li key={featureItem} className="flex items-start gap-2 text-xs">
              <Check className="h-3.5 w-3.5 text-cobalt flex-shrink-0 mt-0.5" />
              <span className="text-slate-700 leading-relaxed">{featureItem}</span>
            </li>
          ))}
        </ul>
        <Button
          onClick={onCta}
          className={cn(
            "w-full",
            highlight || feature
              ? "bg-cobalt hover:bg-cobalt-hover text-white shadow-md shadow-cobalt/30 hover:shadow-lg hover:shadow-cobalt/40"
              : "bg-slate-900 hover:bg-slate-800 text-white",
          )}
        >
          {cta}
        </Button>
      </CardContent>
    </Card>
  );
}
