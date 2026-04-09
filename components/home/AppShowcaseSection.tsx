"use client";

import { ChevronRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { InteractiveDemo } from "@/components/home/AppDemos";
import { APPS } from "@/components/home/landing-data";
import type { AppItem } from "@/components/home/landing-data";

// ──────────────────────────────────────────────────────────────────────────────
// SECTION WRAPPER
// ──────────────────────────────────────────────────────────────────────────────

export default function AppShowcaseSection() {
  return (
    <section id="apps" className="py-24 bg-surface">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
            Our Products
          </Badge>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Three powerful apps, one platform
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Everything you need to document, visualize, and present construction
            projects professionally.
          </p>
        </div>

        <div className="space-y-24">
          {APPS.map((app, index) => (
            <AppShowcase key={app.id} app={app} reversed={index % 2 === 1} />
          ))}
        </div>
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// SINGLE APP SHOWCASE
// ──────────────────────────────────────────────────────────────────────────────

function AppShowcase({ app, reversed }: { app: AppItem; reversed: boolean }) {
  const Icon = app.icon;

  return (
    <div className={cn("grid lg:grid-cols-2 gap-12 items-center", reversed && "lg:grid-flow-dense")}>
      {/* Content */}
      <div className={cn(reversed && "lg:col-start-2")}>
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <h3 className="text-2xl font-bold text-foreground">{app.name}</h3>
        </div>
        <p className="text-xl text-primary mb-4">{app.tagline}</p>
        <p className="text-muted-foreground mb-6 text-lg">{app.description}</p>
        <ul className="space-y-3 mb-8">
          {app.features.map((feature) => (
            <li key={feature} className="flex items-center gap-3">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20">
                <Check className="h-3 w-3 text-primary" />
              </div>
              <span className="text-foreground">{feature}</span>
            </li>
          ))}
        </ul>
        <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
          Learn More
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>

      {/* Demo */}
      <div className={cn(reversed && "lg:col-start-1 lg:row-start-1")}>
        <InteractiveDemo app={app} />
      </div>
    </div>
  );
}
