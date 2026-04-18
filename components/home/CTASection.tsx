"use client";

import { ArrowRight } from "lucide-react";
import { SlateCard, SlateCTA } from "@/lib/design-system";

interface CTASectionProps {
  onGetStarted: () => void;
}

export default function CTASection({ onGetStarted }: CTASectionProps) {
  return (
    <section className="py-24 bg-background">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
        <SlateCard elevation="hero" className="border-glass bg-card/50 px-8 py-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Ready to transform your project documentation?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Join 500+ construction teams already using Slate360. Start your free
            trial today.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <SlateCTA
            onClick={onGetStarted}
            className="text-base px-8"
          >
            Start Free Trial
            <ArrowRight className="ml-2 h-4 w-4" />
          </SlateCTA>
          <SlateCTA
            variant="outline"
            className="text-base px-8"
          >
            Schedule Demo
          </SlateCTA>
          </div>
        </SlateCard>
      </div>
    </section>
  );
}
