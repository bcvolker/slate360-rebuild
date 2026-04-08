"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FOOTER_LINKS } from "./landing-data";

// ==========================================================================
// FOOTER
// ==========================================================================

export function LandingFooter() {
  return (
    <footer className="bg-surface border-t border-border py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          {/* Brand Column */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/uploads/SLATE 360-Color Reversed Lockup.svg"
                className="h-8"
                alt="Slate360"
              />
            </Link>
            <p className="text-sm text-muted-foreground mb-4">
              The complete platform for construction documentation.
            </p>
          </div>

          {/* Link Columns */}
          {Object.entries(FOOTER_LINKS).map(([category, links]) => (
            <div key={category}>
              <h4 className="font-semibold text-foreground mb-4">{category}</h4>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground mb-4 md:mb-0">
            &copy; {new Date().getFullYear()} Slate360. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground">
              Privacy
            </Link>
            <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground">
              Terms
            </Link>
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground">
              Security
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ==========================================================================
// CTA SECTION — re-exported as named export for backward compatibility
// (full version lives in CTASection.tsx)
// ==========================================================================

interface FooterCTAProps {
  onGetStarted: () => void;
}

export function FooterCTA({ onGetStarted }: FooterCTAProps) {
  return (
    <section className="py-24 bg-background">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
          Ready to transform your project documentation?
        </h2>
        <p className="text-lg text-muted-foreground mb-8">
          Join 500+ construction teams already using Slate360. Start your free trial today.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
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
            Schedule Demo
          </Button>
        </div>
      </div>
    </section>
  );
}
