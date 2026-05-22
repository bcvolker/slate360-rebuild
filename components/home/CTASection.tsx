"use client";

import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CTASectionProps {
  onGetStarted: () => void;
}

export default function CTASection({ onGetStarted }: CTASectionProps) {
  return (
    <section className="py-24 bg-background">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
          Ready to connect field capture with office delivery?
        </h2>
        <p className="text-lg text-muted-foreground mb-8">
          Request Foundational Release access for Site Walk and the Slate360 platform.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button
            size="lg"
            onClick={onGetStarted}
            className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-gold-glow text-base px-8"
          >
            Request access
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            asChild
            className="border-border text-foreground hover:bg-muted/50 text-base px-8"
          >
            <a href="/install">Install on device</a>
          </Button>
        </div>
      </div>
    </section>
  );
}
