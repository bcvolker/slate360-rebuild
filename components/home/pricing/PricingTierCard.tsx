"use client";

import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AppTier, BillingPeriod } from "@/components/home/pricing-data";

interface PricingTierCardProps {
  groupName: string;          // "Site Walk" / "Project Bundle" / etc.
  tagline: string;
  tier: AppTier;
  period: BillingPeriod;
  cta: string;
  onCta: () => void;
  highlight?: boolean;        // Pro tier visual emphasis
  badge?: string;             // optional ribbon ("Most Popular", "Best Value")
}

/**
 * Single tier card. Used for both per-app tiers (Basic/Pro) and
 * bundle tiers (Basic/Pro). Treats every app/bundle equally — same
 * footprint, same chrome, same button style.
 */
export function PricingTierCard({
  groupName,
  tagline,
  tier,
  period,
  cta,
  onCta,
  highlight = false,
  badge,
}: PricingTierCardProps) {
  const isAnnual = period === "annual";
  const displayPrice = isAnnual
    ? Math.round(tier.annualUsd / 12)
    : tier.monthlyUsd;
  const totalAnnual = tier.annualUsd;

  return (
    <Card
      className={cn(
        "bg-glass border-glass shadow-glass relative flex flex-col",
        highlight && "border-primary/60 shadow-gold-glow",
      )}
    >
      {badge && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
          {badge}
        </Badge>
      )}
      <CardHeader className="text-center pb-2">
        <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
          {tier.label}
        </div>
        <CardTitle className="text-lg text-foreground">{groupName}</CardTitle>
        <CardDescription className="text-muted-foreground text-xs min-h-[2.25rem]">
          {tagline}
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center flex flex-col flex-1">
        <div className="mb-1">
          <span className="text-4xl font-bold text-foreground">${displayPrice}</span>
          <span className="text-muted-foreground text-sm"> /mo</span>
        </div>
        <div className="text-[11px] text-muted-foreground mb-5 min-h-[1rem]">
          {isAnnual ? `Billed annually · $${totalAnnual.toLocaleString()}/yr` : "Billed monthly"}
        </div>
        <ul className="space-y-2 mb-6 text-left flex-1">
          {tier.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-xs">
              <Check className="h-3.5 w-3.5 text-primary flex-shrink-0 mt-0.5" />
              <span className="text-foreground">{feature}</span>
            </li>
          ))}
        </ul>
        <Button
          onClick={onCta}
          className={cn(
            "w-full",
            highlight
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "bg-muted text-foreground hover:bg-muted/80",
          )}
        >
          {cta}
        </Button>
      </CardContent>
    </Card>
  );
}
