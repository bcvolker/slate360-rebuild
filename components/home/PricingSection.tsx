"use client";

import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  PRICING_PLANS,
  STANDALONE_APP_PRICES,
  STORAGE_ADDONS,
  CREDIT_PACKS,
  PRICING_DISCLAIMER,
} from "@/components/home/landing-data";

interface PricingSectionProps {
  onGetStarted: () => void;
}

export default function PricingSection({ onGetStarted }: PricingSectionProps) {
  return (
    <section id="pricing" className="py-24 bg-surface">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">Pricing</Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Simple, transparent pricing
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Subscribe to a single app, build your own stack, or save with a bundle. Cancel anytime.
          </p>
        </div>

        {/* Plan grid (per-app starter + bundles) */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {PRICING_PLANS.map((plan) => (
            <Card
              key={plan.name}
              className={cn(
                "bg-glass border-glass shadow-glass relative flex flex-col",
                plan.popular && "border-primary/50 shadow-gold-glow"
              )}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                  Most Popular
                </Badge>
              )}
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-lg text-foreground">{plan.name}</CardTitle>
                <CardDescription className="text-muted-foreground text-xs">
                  {plan.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center flex flex-col flex-1">
                <div className="mb-5">
                  <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                  <span className="text-muted-foreground text-sm">{plan.period}</span>
                </div>
                <ul className="space-y-2 mb-6 text-left flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-xs">
                      <Check className="h-3.5 w-3.5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={onGetStarted}
                  className={cn(
                    "w-full",
                    plan.popular
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "bg-muted text-foreground hover:bg-muted/80"
                  )}
                >
                  {plan.cta}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Per-app price table */}
        <div className="mt-16 max-w-5xl mx-auto">
          <h3 className="text-xl font-semibold text-foreground text-center mb-2">
            Or build your own — subscribe to apps individually
          </h3>
          <p className="text-center text-sm text-muted-foreground mb-6">
            Mix and match. Stacking apps that match a bundle? The bundle is always the better deal.
          </p>
          <div className="rounded-xl border border-glass bg-glass overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="text-left py-3 px-4 font-medium">App</th>
                  <th className="text-left py-3 px-4 font-medium hidden sm:table-cell">What it does</th>
                  <th className="text-right py-3 px-4 font-medium">Basic</th>
                  <th className="text-right py-3 px-4 font-medium">Pro</th>
                </tr>
              </thead>
              <tbody>
                {STANDALONE_APP_PRICES.map((app) => (
                  <tr key={app.name} className="border-t border-glass">
                    <td className="py-3 px-4 font-medium text-foreground">{app.name}</td>
                    <td className="py-3 px-4 text-muted-foreground hidden sm:table-cell">{app.summary}</td>
                    <td className="py-3 px-4 text-right text-foreground">
                      {app.basic}
                      {app.basic !== "Free" && <span className="text-xs text-muted-foreground"> /mo</span>}
                    </td>
                    <td className="py-3 px-4 text-right text-foreground">
                      {app.pro}<span className="text-xs text-muted-foreground"> /mo</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add-ons */}
        <div className="mt-12 grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          <div className="rounded-xl border border-glass bg-glass p-6">
            <h4 className="text-sm font-semibold text-foreground mb-1">Storage add-ons</h4>
            <p className="text-xs text-muted-foreground mb-4">Top up any plan, anytime.</p>
            <ul className="space-y-2">
              {STORAGE_ADDONS.map((a) => (
                <li key={a.label} className="flex items-center justify-between text-sm">
                  <span className="text-foreground">{a.label}</span>
                  <span className="text-foreground font-medium">{a.price}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-glass bg-glass p-6">
            <h4 className="text-sm font-semibold text-foreground mb-1">Processing credit packs</h4>
            <p className="text-xs text-muted-foreground mb-4">One-time purchase. Credits never expire.</p>
            <ul className="space-y-2">
              {CREDIT_PACKS.map((a) => (
                <li key={a.label} className="flex items-center justify-between text-sm">
                  <span className="text-foreground">{a.label}</span>
                  <span className="text-foreground font-medium">{a.price}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-10 max-w-4xl mx-auto">
          <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
            {PRICING_DISCLAIMER}
          </p>
        </div>
      </div>
    </section>
  );
}
