"use client";

import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { BundlePricing } from "@/components/home/pricing-data";

interface EnterpriseCardProps {
  bundle: BundlePricing; // expects bundle.enterpriseCustom === true
  onContact: () => void;
}

export function EnterpriseCard({ bundle, onContact }: EnterpriseCardProps) {
  return (
    <Card className="bg-glass border-glass shadow-glass relative flex flex-col">
      <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-foreground text-background">
        Enterprise
      </Badge>
      <CardHeader className="text-center pb-2">
        <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
          Custom
        </div>
        <CardTitle className="text-lg text-foreground">{bundle.name}</CardTitle>
        <CardDescription className="text-muted-foreground text-xs min-h-[2.25rem]">
          {bundle.tagline}
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center flex flex-col flex-1">
        <div className="mb-1">
          <span className="text-3xl font-bold text-foreground">Let&apos;s talk</span>
        </div>
        <div className="text-[11px] text-muted-foreground mb-5 min-h-[1rem]">
          Volume + custom caps
        </div>
        <ul className="space-y-2 mb-6 text-left flex-1">
          {bundle.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-xs">
              <Check className="h-3.5 w-3.5 text-primary flex-shrink-0 mt-0.5" />
              <span className="text-foreground">{feature}</span>
            </li>
          ))}
        </ul>
        <Button
          onClick={onContact}
          className="w-full bg-muted text-foreground hover:bg-muted/80"
        >
          Contact sales
        </Button>
      </CardContent>
    </Card>
  );
}
