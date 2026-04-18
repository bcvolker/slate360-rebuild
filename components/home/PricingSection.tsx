"use client";

import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PRICING_PLANS } from "@/components/home/landing-data";
import { SlateCard, SlateCTA, SlateSectionHeader } from "@/lib/design-system";

interface PricingSectionProps {
  onGetStarted: () => void;
}

export default function PricingSection({ onGetStarted }: PricingSectionProps) {
  return (
    <section id="pricing" className="py-24 bg-surface">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
            Pricing
          </Badge>
          <div className="mx-auto max-w-2xl">
            <SlateSectionHeader
              title="Simple, transparent pricing"
              subtitle="Start free, scale as you grow. No hidden fees."
              className="flex-col items-center text-center"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {PRICING_PLANS.map((plan) => (
            <SlateCard
              key={plan.name}
              className={cn(
                "bg-card/60 border-glass relative p-6",
                plan.popular && "border-primary/50 shadow-gold-glow"
              )}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                  Most Popular
                </Badge>
              )}
              <div className="text-center pb-2">
                <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
                <p className="text-muted-foreground">
                  {plan.description}
                </p>
              </div>
              <div className="text-center">
                <div className="mb-6">
                  <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
                <ul className="space-y-3 mb-8 text-left">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary flex-shrink-0" />
                      <span className="text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
                <SlateCTA
                  onClick={onGetStarted}
                  variant={plan.popular ? "gold" : "outline"}
                  className={cn("w-full", !plan.popular && "shadow-none")}
                >
                  {plan.cta}
                </SlateCTA>
              </div>
            </SlateCard>
          ))}
        </div>
      </div>
    </section>
  );
}
