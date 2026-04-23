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
    <Card className="relative flex flex-col bg-slate-900 text-white rounded-2xl ring-1 ring-slate-700 shadow-[0_20px_50px_rgba(15,23,42,0.20)]">
      <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white text-slate-900 shadow-md">
        Enterprise
      </Badge>
      <CardHeader className="text-center pb-2">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-cobalt mb-1">
          Custom
        </div>
        <CardTitle className="text-lg text-white">{bundle.name}</CardTitle>
        <CardDescription className="text-slate-400 text-xs min-h-[2.25rem]">
          {bundle.tagline}
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center flex flex-col flex-1">
        <div className="mb-1">
          <span className="text-3xl font-bold text-white tracking-tight">Let&apos;s talk</span>
        </div>
        <div className="text-[11px] text-slate-400 mb-5 min-h-[1rem]">
          Volume + custom caps
        </div>
        <ul className="space-y-2 mb-6 text-left flex-1">
          {bundle.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-xs">
              <Check className="h-3.5 w-3.5 text-cobalt flex-shrink-0 mt-0.5" />
              <span className="text-slate-200 leading-relaxed">{feature}</span>
            </li>
          ))}
        </ul>
        <Button
          onClick={onContact}
          className="w-full bg-white text-slate-900 hover:bg-slate-100 shadow-md"
        >
          Contact sales
        </Button>
      </CardContent>
    </Card>
  );
}
