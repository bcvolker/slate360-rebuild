"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface LandingHeaderProps {
  onLoginClick: () => void;
  isScrolled: boolean;
}

export default function LandingHeader({ onLoginClick, isScrolled }: LandingHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        isScrolled
          ? "bg-glass border-b border-border/50 shadow-glass"
          : "bg-transparent"
      )}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <img
              src="/uploads/slate360-logo-reversed-v2.svg?v=cobalt-2026-04-19"
              alt="Slate360"
              className="h-7 sm:h-8 w-auto"
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="#apps" className="text-sm text-muted-foreground hover:text-teal transition-colors">
              Products
            </a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-teal transition-colors">
              Pricing
            </a>
            <a href="#testimonials" className="text-sm text-muted-foreground hover:text-teal transition-colors">
              Customers
            </a>
            <a href="mailto:hello@slate360.ai" className="text-sm text-muted-foreground hover:text-teal transition-colors">
              Contact
            </a>
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-4">
            <Button variant="ghost" onClick={onLoginClick} className="text-foreground hover:bg-primary/10">
              Log In
            </Button>
            <Button onClick={onLoginClick} className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-gold-glow">
              Get Started
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-foreground"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border/50">
            <nav className="flex flex-col gap-4">
              <a href="#apps" onClick={() => setMobileMenuOpen(false)} className="text-sm text-muted-foreground hover:text-teal">
                Products
              </a>
              <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="text-sm text-muted-foreground hover:text-teal">
                Pricing
              </a>
              <a href="#testimonials" onClick={() => setMobileMenuOpen(false)} className="text-sm text-muted-foreground hover:text-teal">
                Customers
              </a>
              <a href="mailto:hello@slate360.ai" className="text-sm text-muted-foreground hover:text-teal">
                Contact
              </a>
              <div className="flex flex-col gap-2 pt-4 border-t border-border/50">
                <Button variant="ghost" onClick={() => { setMobileMenuOpen(false); onLoginClick(); }} className="justify-start">
                  Log In
                </Button>
                <Button onClick={() => { setMobileMenuOpen(false); onLoginClick(); }} className="bg-primary text-primary-foreground">
                  Get Started
                </Button>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
