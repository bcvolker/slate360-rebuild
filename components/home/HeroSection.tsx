"use client";

import { ArrowRight, ChevronRight, Play, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { STATS } from "@/components/home/landing-data";

interface HeroSectionProps {
  onGetStarted: () => void;
}

export default function HeroSection({ onGetStarted }: HeroSectionProps) {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-card" />

      {/* Subtle grid */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `linear-gradient(hsla(45,82%,55%,0.1) 1px, transparent 1px),
                            linear-gradient(90deg, hsla(45,82%,55%,0.1) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 text-center">
        {/* Badge */}
        <Badge className="mb-6 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">
          <Zap className="mr-1 h-3 w-3" />
          The Nervous System
        </Badge>

        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight text-foreground mb-6 text-balance">
          for Construction Deliverables
        </h1>

        {/* Subheadline */}
        <p className="mx-auto max-w-2xl text-lg sm:text-xl text-muted-foreground mb-10 text-pretty">
          Slate360 Core + powerful add-ons. One place for tours, site walks, client portals, and secure file sharing. Client links never break.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <Button
            size="lg"
            onClick={onGetStarted}
            className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-gold-glow text-base px-8"
          >
            Start Free Trial
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="border-border text-foreground hover:bg-muted/50 text-base px-8"
          >
            <Play className="mr-2 h-4 w-4" />
            Watch Demo
          </Button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
          {STATS.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-3xl sm:text-4xl font-bold text-primary mb-1">
                {stat.value}
              </div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <ChevronRight className="h-6 w-6 text-muted-foreground rotate-90" />
      </div>
    </section>
  );
}

