"use client";

/**
 * ==========================================================================
 * SLATE360 MARKETING HOMEPAGE
 * ==========================================================================
 * 
 * A complete, production-ready marketing page following the Dark Glass aesthetic
 * with Industrial Gold (#D4AF37 / hsl(45 82% 55%)) accents.
 * 
 * Design System Rules Applied:
 * - All surfaces use bg-glass (semi-transparent with backdrop-blur)
 * - Primary buttons, CTAs, and accents use Industrial Gold
 * - No orange or navy anywhere - strictly gold, charcoal, and zinc
 * - Heavy glassmorphism (16px blur) on all cards
 * - Gold hover states with subtle glow effects
 * 
 * ==========================================================================
 */

import { useState } from "react";
import Link from "next/link";
import {
  Menu,
  X,
  Play,
  Building2,
  MapPin,
  Check,
  ChevronRight,
  Sparkles,
  FolderSync,
  Shield,
  Users,
  Zap,
  Globe,
  Mail,
  Twitter,
  Linkedin,
  Github,
  ArrowRight,
  Quote,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

/* ==========================================================================
   TYPES
   ========================================================================== */

interface PricingTier {
  name: string;
  description: string;
  monthlyPrice: number | "Custom";
  annualPrice: number | "Custom";
  storage: string;
  features: string[];
  popular?: boolean;
  cta: string;
}

interface Testimonial {
  quote: string;
  author: string;
  role: string;
  company: string;
  avatar?: string;
}

interface AppShowcase {
  name: string;
  description: string;
  icon: typeof Building2;
  features: string[];
}

/* ==========================================================================
   MOCK DATA
   ========================================================================== */

const NAV_LINKS = [
  { label: "Product", href: "#product" },
  { label: "Apps", href: "#apps" },
  { label: "Solutions", href: "#slatedrop" },
  { label: "Pricing", href: "#pricing" },
];

const TRUST_LOGOS = [
  "Turner Construction",
  "Skanska",
  "PCL Construction",
  "DPR Construction",
  "Mortenson",
];

const APP_SHOWCASE: AppShowcase[] = [
  {
    name: "Tour Builder",
    description: "Create stunning 360° virtual tours with interactive hotspots, floor plans, and seamless client sharing.",
    icon: Building2,
    features: [
      "Drag-and-drop tour creation",
      "Interactive hotspots & annotations",
      "Embed anywhere with one link",
      "Client portal auto-generation",
      "Analytics & view tracking",
    ],
  },
  {
    name: "Site Walk",
    description: "Document construction progress with GPS-tagged photos, automated timelines, and instant client reports.",
    icon: MapPin,
    features: [
      "GPS-tagged photo capture",
      "Automated progress timelines",
      "Weather & date stamping",
      "One-click client sharing",
      "Compare views over time",
    ],
  },
];

const PRICING_TIERS: PricingTier[] = [
  {
    name: "Core – Free Starter",
    description: "Perfect for small projects and getting started",
    monthlyPrice: 0,
    annualPrice: 0,
    storage: "5 GB",
    features: [
      "Slate360 Core access",
      "5 GB SlateDrop storage",
      "Basic client portals",
      "Email support",
      "Downgrade Law protection",
    ],
    cta: "Start Free",
  },
  {
    name: "Professional Bundle",
    description: "For growing teams with multiple active projects",
    monthlyPrice: 79,
    annualPrice: 790,
    storage: "40 GB pooled",
    features: [
      "All Core features",
      "Tour Builder + Site Walk",
      "40 GB pooled storage",
      "Priority support",
      "Custom branding",
      "Advanced analytics",
    ],
    popular: true,
    cta: "Start 14-Day Trial",
  },
  {
    name: "Enterprise",
    description: "Unlimited scale with dedicated support",
    monthlyPrice: "Custom",
    annualPrice: "Custom",
    storage: "Unlimited",
    features: [
      "All Professional features",
      "Unlimited storage",
      "SSO & advanced security",
      "Dedicated success manager",
      "Custom integrations",
      "SLA guarantee",
    ],
    cta: "Contact Sales",
  },
];

const TESTIMONIALS: Testimonial[] = [
  {
    quote: "Slate360 transformed how we share deliverables with clients. The portal system is incredibly intuitive, and our clients love it.",
    author: "Sarah Chen",
    role: "Project Director",
    company: "Meridian Construction",
  },
  {
    quote: "The Downgrade Law protection gives us confidence that client links will always work. It's a game-changer for long-term projects.",
    author: "Marcus Johnson",
    role: "VP of Operations",
    company: "Summit Builders",
  },
  {
    quote: "We switched from 4 different tools to Slate360. Everything in one place, beautifully organized. Our team is more productive than ever.",
    author: "Emily Rodriguez",
    role: "Technology Manager",
    company: "Cascade Development",
  },
];

/* ==========================================================================
   HEADER COMPONENT
   Sticky header with glass background, logo, navigation, and CTAs
   ========================================================================== */

function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-glass border-b border-[hsla(45,82%,55%,0.12)] backdrop-blur-lg">
      <div className="container mx-auto h-full px-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <span className="text-xl font-bold text-primary">Slate360</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-3">
          <Button variant="ghost" asChild className="text-muted-foreground hover:text-primary hover:bg-primary/10">
            <Link href="/login">Login</Link>
          </Button>
          <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_hsla(45,82%,55%,0.3)]">
            <Link href="/signup">Get Started Free</Link>
          </Button>
        </div>

        {/* Mobile Menu Trigger */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon" className="hover:bg-primary/10">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Open menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72 bg-glass border-l border-[hsla(45,82%,55%,0.12)] backdrop-blur-xl">
            <div className="flex flex-col gap-6 mt-8">
              <nav className="flex flex-col gap-4">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-lg font-medium text-foreground hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
              <div className="flex flex-col gap-3 pt-4 border-t border-border">
                <Button variant="outline" asChild className="border-border hover:border-primary hover:text-primary">
                  <Link href="/login">Login</Link>
                </Button>
                <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
                  <Link href="/signup">Get Started Free</Link>
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}

/* ==========================================================================
   HERO SECTION
   Full viewport height with headline, subheadline, demo placeholder, and CTAs
   ========================================================================== */

function HeroSection() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center pt-16 pb-12 px-4 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-[hsl(240,6%,8%)]" />
      
      {/* Subtle grid pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(hsla(45,82%,55%,0.3) 1px, transparent 1px), linear-gradient(90deg, hsla(45,82%,55%,0.3) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative z-10 max-w-5xl mx-auto text-center space-y-8">
        {/* Badge */}
        <Badge variant="outline" className="border-primary/30 text-primary px-4 py-1.5">
          <Zap className="mr-1.5 h-3.5 w-3.5" />
          Now with AI-powered tour generation
        </Badge>

        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-foreground leading-tight text-balance">
          The Nervous System for{" "}
          <span className="text-primary">Construction Deliverables</span>
        </h1>

        {/* Subheadline */}
        <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto text-pretty">
          Slate360 Core + powerful add-ons. One place for tours, site walks, client portals, 
          and secure file sharing. <span className="text-primary font-medium">Client links never break.</span>
        </p>

        {/* Interactive Demo Placeholder */}
        <Card className="max-w-4xl mx-auto bg-glass border-[hsla(45,82%,55%,0.2)] shadow-[0_8px_32px_hsla(0,0%,0%,0.4),0_0_0_1px_hsla(45,82%,55%,0.1)]">
          <CardContent className="p-8 sm:p-12">
            <div className="aspect-video rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 flex flex-col items-center justify-center gap-4">
              <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center">
                <Play className="h-8 w-8 text-primary ml-1" />
              </div>
              <div className="text-center">
                <p className="font-medium text-foreground">Interactive 3D Model / 360 Tour Demo</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Replace with React Three Fiber or Pannellum
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button 
            size="lg" 
            asChild 
            className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_30px_hsla(45,82%,55%,0.4)] hover:shadow-[0_0_40px_hsla(45,82%,55%,0.5)] transition-all px-8"
          >
            <Link href="/signup">
              Start Building Free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button 
            size="lg" 
            variant="outline" 
            className="border-primary/50 text-primary hover:bg-primary/10 hover:border-primary px-8"
          >
            <Play className="mr-2 h-4 w-4" />
            Watch Demo
          </Button>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="h-8 w-5 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center p-1">
          <div className="h-2 w-1 rounded-full bg-primary animate-pulse" />
        </div>
      </div>
    </section>
  );
}

/* ==========================================================================
   TRUST BAR
   Horizontal display of trusted company logos
   ========================================================================== */

function TrustBar() {
  return (
    <section className="py-12 px-4 border-y border-border bg-muted/20">
      <div className="container mx-auto">
        <p className="text-center text-sm font-medium text-muted-foreground uppercase tracking-wider mb-8">
          Trusted by the best in construction
        </p>
        <div className="flex flex-wrap items-center justify-center gap-8 lg:gap-16">
          {TRUST_LOGOS.map((company) => (
            <div
              key={company}
              className="px-4 py-2 rounded-lg bg-muted/30 border border-border text-muted-foreground font-medium text-sm"
            >
              {company}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ==========================================================================
   APP SHOWCASE
   Two large glass cards for Tour Builder and Site Walk
   ========================================================================== */

function AppShowcaseSection() {
  return (
    <section id="apps" className="py-20 px-4">
      <div className="container mx-auto max-w-6xl">
        {/* Section Header */}
        <div className="text-center mb-12">
          <Badge variant="outline" className="border-primary/30 text-primary mb-4">
            Powerful Add-ons
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Apps that work together seamlessly
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Each app is powerful on its own, but when bundled together they share storage 
            and create a unified client experience.
          </p>
        </div>

        {/* App Cards */}
        <div className="grid gap-6 lg:grid-cols-2">
          {APP_SHOWCASE.map((app) => {
            const Icon = app.icon;
            return (
              <Card
                key={app.name}
                className="bg-glass border-[hsla(45,82%,55%,0.12)] shadow-[0_8px_32px_hsla(0,0%,0%,0.4)] hover:shadow-[0_12px_40px_hsla(0,0%,0%,0.5),0_0_20px_hsla(45,82%,55%,0.15)] transition-all duration-300 group"
              >
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-2xl text-foreground">{app.name}</CardTitle>
                  </div>
                  <CardDescription className="text-muted-foreground text-base">
                    {app.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Screenshot Placeholder */}
                  <div className="aspect-video rounded-lg border border-border bg-muted/20 flex items-center justify-center">
                    <p className="text-sm text-muted-foreground">App Screenshot Placeholder</p>
                  </div>

                  {/* Features */}
                  <ul className="space-y-2">
                    {app.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm text-foreground">
                        <Check className="h-4 w-4 text-primary flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                    Try Live Demo
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Interoperability Note */}
        <Card className="mt-8 bg-primary/5 border-primary/20">
          <CardContent className="py-4 px-6">
            <p className="text-sm text-center text-foreground">
              <span className="text-primary font-medium">Bundle & Save:</span> Apps purchased 
              together share pooled storage. Standalone apps have isolated storage allocations.
            </p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

/* ==========================================================================
   SLATEDROP NERVOUS SYSTEM SECTION
   Visual representation of the connected ecosystem
   ========================================================================== */

function SlateDropSection() {
  return (
    <section id="slatedrop" className="py-20 px-4 bg-muted/10">
      <div className="container mx-auto max-w-6xl">
        {/* Section Header */}
        <div className="text-center mb-12">
          <Badge variant="outline" className="border-primary/30 text-primary mb-4">
            <FolderSync className="mr-1.5 h-3.5 w-3.5" />
            SlateDrop Technology
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            One Nervous System for All Deliverables
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            SlateDrop auto-provisions folders for every project. Set permissions once, 
            and every deliverable inherits client email access automatically.
          </p>
        </div>

        {/* Visual Placeholder - Connected Glass Cards */}
        <Card className="bg-glass border-[hsla(45,82%,55%,0.12)] shadow-[0_8px_32px_hsla(0,0%,0%,0.4)] overflow-hidden">
          <CardContent className="p-8">
            <div className="relative">
              {/* Connection lines (decorative) */}
              <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="gold-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="hsla(45,82%,55%,0.1)" />
                    <stop offset="50%" stopColor="hsla(45,82%,55%,0.4)" />
                    <stop offset="100%" stopColor="hsla(45,82%,55%,0.1)" />
                  </linearGradient>
                </defs>
                {/* Horizontal lines */}
                <line x1="20%" y1="50%" x2="80%" y2="50%" stroke="url(#gold-gradient)" strokeWidth="2" />
                {/* Vertical lines */}
                <line x1="50%" y1="20%" x2="50%" y2="80%" stroke="url(#gold-gradient)" strokeWidth="2" />
              </svg>

              {/* Grid of connected nodes */}
              <div className="relative grid grid-cols-3 gap-4 md:gap-8">
                {/* Top row */}
                <div className="flex justify-center">
                  <Card className="w-full max-w-[140px] bg-muted/30 border-border">
                    <CardContent className="p-4 text-center">
                      <Building2 className="h-6 w-6 text-primary mx-auto mb-2" />
                      <p className="text-xs font-medium text-foreground">Tours</p>
                    </CardContent>
                  </Card>
                </div>
                <div className="flex justify-center">
                  <Card className="w-full max-w-[140px] bg-primary/10 border-primary/30 shadow-[0_0_20px_hsla(45,82%,55%,0.2)]">
                    <CardContent className="p-4 text-center">
                      <Sparkles className="h-6 w-6 text-primary mx-auto mb-2" />
                      <p className="text-xs font-medium text-primary">SlateDrop</p>
                    </CardContent>
                  </Card>
                </div>
                <div className="flex justify-center">
                  <Card className="w-full max-w-[140px] bg-muted/30 border-border">
                    <CardContent className="p-4 text-center">
                      <MapPin className="h-6 w-6 text-primary mx-auto mb-2" />
                      <p className="text-xs font-medium text-foreground">Site Walks</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Middle row */}
                <div className="flex justify-center">
                  <Card className="w-full max-w-[140px] bg-muted/30 border-border">
                    <CardContent className="p-4 text-center">
                      <Users className="h-6 w-6 text-primary mx-auto mb-2" />
                      <p className="text-xs font-medium text-foreground">Client Portal</p>
                    </CardContent>
                  </Card>
                </div>
                <div className="flex justify-center items-center">
                  <div className="h-3 w-3 rounded-full bg-primary animate-pulse" />
                </div>
                <div className="flex justify-center">
                  <Card className="w-full max-w-[140px] bg-muted/30 border-border">
                    <CardContent className="p-4 text-center">
                      <Shield className="h-6 w-6 text-primary mx-auto mb-2" />
                      <p className="text-xs font-medium text-foreground">Permissions</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Bottom row */}
                <div className="flex justify-center">
                  <Card className="w-full max-w-[140px] bg-muted/30 border-border">
                    <CardContent className="p-4 text-center">
                      <Globe className="h-6 w-6 text-primary mx-auto mb-2" />
                      <p className="text-xs font-medium text-foreground">Share Links</p>
                    </CardContent>
                  </Card>
                </div>
                <div className="flex justify-center">
                  <Card className="w-full max-w-[140px] bg-muted/30 border-border">
                    <CardContent className="p-4 text-center">
                      <FolderSync className="h-6 w-6 text-primary mx-auto mb-2" />
                      <p className="text-xs font-medium text-foreground">Auto-Folders</p>
                    </CardContent>
                  </Card>
                </div>
                <div className="flex justify-center">
                  <Card className="w-full max-w-[140px] bg-muted/30 border-border">
                    <CardContent className="p-4 text-center">
                      <Zap className="h-6 w-6 text-primary mx-auto mb-2" />
                      <p className="text-xs font-medium text-foreground">Instant Sync</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="text-center mt-8">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                See Folder Permissions in Action
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

/* ==========================================================================
   PRICING SECTION
   Three pricing cards with toggle for annual/monthly
   ========================================================================== */

function PricingSection() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("annual");

  return (
    <section id="pricing" className="py-20 px-4">
      <div className="container mx-auto max-w-6xl">
        {/* Section Header */}
        <div className="text-center mb-12">
          <Badge variant="outline" className="border-primary/30 text-primary mb-4">
            Transparent Pricing
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Simple pricing that scales with your projects
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-6">
            <span className="text-primary font-medium">Downgrade Law protected</span> – client links always work, 
            even if you change plans.
          </p>

          {/* Billing Toggle */}
          <ToggleGroup
            type="single"
            value={billingCycle}
            onValueChange={(value) => value && setBillingCycle(value as "monthly" | "annual")}
            className="bg-muted/30 border border-border rounded-lg p-1"
          >
            <ToggleGroupItem
              value="monthly"
              className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground px-4"
            >
              Monthly
            </ToggleGroupItem>
            <ToggleGroupItem
              value="annual"
              className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground px-4"
            >
              Annual
              <Badge className="ml-2 bg-primary/20 text-primary text-[10px]">Save 17%</Badge>
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        {/* Pricing Cards */}
        <div className="grid gap-6 lg:grid-cols-3">
          {PRICING_TIERS.map((tier) => (
            <Card
              key={tier.name}
              className={cn(
                "relative bg-glass border-[hsla(45,82%,55%,0.12)] shadow-[0_8px_32px_hsla(0,0%,0%,0.4)] transition-all duration-300",
                tier.popular && "border-primary/50 shadow-[0_8px_32px_hsla(0,0%,0%,0.4),0_0_30px_hsla(45,82%,55%,0.2)]"
              )}
            >
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground shadow-[0_0_20px_hsla(45,82%,55%,0.4)]">
                    Most Popular
                  </Badge>
                </div>
              )}
              <CardHeader className="pt-8">
                <CardTitle className="text-xl text-foreground">{tier.name}</CardTitle>
                <CardDescription className="text-muted-foreground">
                  {tier.description}
                </CardDescription>
                <div className="pt-4">
                  <span className="text-4xl font-bold text-foreground">
                    {typeof tier.monthlyPrice === "number"
                      ? `$${billingCycle === "annual" ? tier.annualPrice : tier.monthlyPrice}`
                      : "Custom"}
                  </span>
                  {typeof tier.monthlyPrice === "number" && tier.monthlyPrice > 0 && (
                    <span className="text-muted-foreground">
                      /{billingCycle === "annual" ? "year" : "month"}
                    </span>
                  )}
                </div>
                <p className="text-sm text-primary font-medium">{tier.storage} storage</p>
              </CardHeader>
              <CardContent className="space-y-6">
                <ul className="space-y-3">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-foreground">
                      <Check className="h-4 w-4 text-primary flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  className={cn(
                    "w-full",
                    tier.popular
                      ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_hsla(45,82%,55%,0.3)]"
                      : "bg-muted hover:bg-muted/80 text-foreground"
                  )}
                >
                  {tier.cta}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Comparison Table */}
        <Card className="mt-12 bg-glass border-[hsla(45,82%,55%,0.12)]">
          <CardHeader>
            <CardTitle className="text-lg text-foreground">Standalone vs Bundle Pricing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 text-muted-foreground font-medium">Option</th>
                    <th className="text-left py-3 text-muted-foreground font-medium">Apps</th>
                    <th className="text-left py-3 text-muted-foreground font-medium">Storage</th>
                    <th className="text-right py-3 text-muted-foreground font-medium">Price/mo</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border/50">
                    <td className="py-3 text-foreground">Tour Builder Standalone</td>
                    <td className="py-3 text-muted-foreground">Tour Builder only</td>
                    <td className="py-3 text-muted-foreground">15 GB isolated</td>
                    <td className="py-3 text-right text-foreground">$39</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-3 text-foreground">Site Walk Standalone</td>
                    <td className="py-3 text-muted-foreground">Site Walk only</td>
                    <td className="py-3 text-muted-foreground">15 GB isolated</td>
                    <td className="py-3 text-right text-foreground">$39</td>
                  </tr>
                  <tr className="bg-primary/5">
                    <td className="py-3 text-primary font-medium">Professional Bundle</td>
                    <td className="py-3 text-foreground">Both apps</td>
                    <td className="py-3 text-foreground">40 GB pooled</td>
                    <td className="py-3 text-right text-primary font-bold">$79</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

/* ==========================================================================
   TESTIMONIALS SECTION
   Grid of quote cards
   ========================================================================== */

function TestimonialsSection() {
  return (
    <section className="py-20 px-4 bg-muted/10">
      <div className="container mx-auto max-w-6xl">
        {/* Section Header */}
        <div className="text-center mb-12">
          <Badge variant="outline" className="border-primary/30 text-primary mb-4">
            Customer Stories
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Loved by construction teams everywhere
          </h2>
        </div>

        {/* Testimonial Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {TESTIMONIALS.map((testimonial, index) => (
            <Card
              key={index}
              className="bg-glass border-[hsla(45,82%,55%,0.12)] shadow-[0_8px_32px_hsla(0,0%,0%,0.4)]"
            >
              <CardContent className="pt-6">
                <Quote className="h-8 w-8 text-primary/30 mb-4" />
                <p className="text-foreground mb-6 leading-relaxed">&ldquo;{testimonial.quote}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/20 text-primary text-sm">
                      {testimonial.author.split(" ").map((n) => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-foreground">{testimonial.author}</p>
                    <p className="text-sm text-muted-foreground">
                      {testimonial.role}, {testimonial.company}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ==========================================================================
   FINAL CTA SECTION
   Full-width banner with email signup
   ========================================================================== */

function FinalCTASection() {
  return (
    <section className="py-20 px-4">
      <div className="container mx-auto max-w-4xl">
        <Card className="bg-glass border-[hsla(45,82%,55%,0.2)] shadow-[0_8px_32px_hsla(0,0%,0%,0.4),0_0_40px_hsla(45,82%,55%,0.1)]">
          <CardContent className="py-12 px-8 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Ready to connect your entire project ecosystem?
            </h2>
            <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join thousands of construction professionals who trust Slate360 for their 
              deliverables. Start free, upgrade when you&apos;re ready.
            </p>

            {/* Email Signup */}
            <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <Input
                type="email"
                placeholder="Enter your work email"
                className="bg-muted/30 border-border focus:border-primary h-12"
              />
              <Button 
                size="lg" 
                className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_hsla(45,82%,55%,0.3)] h-12 px-8"
              >
                Create Your Free Account
              </Button>
            </div>

            <p className="text-xs text-muted-foreground mt-4">
              No credit card required. 5 GB free forever.
            </p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

/* ==========================================================================
   FOOTER
   Dark glass footer with navigation columns
   ========================================================================== */

function Footer() {
  return (
    <footer className="bg-glass border-t border-[hsla(45,82%,55%,0.12)] backdrop-blur-lg">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <span className="text-xl font-bold text-primary">Slate360</span>
            </Link>
            <p className="text-sm text-muted-foreground mb-4">
              The nervous system for construction deliverables.
            </p>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-primary/10 hover:text-primary">
                <Twitter className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-primary/10 hover:text-primary">
                <Linkedin className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-primary/10 hover:text-primary">
                <Github className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Product</h4>
            <ul className="space-y-2">
              <li>
                <Link href="#apps" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Tour Builder
                </Link>
              </li>
              <li>
                <Link href="#apps" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Site Walk
                </Link>
              </li>
              <li>
                <Link href="#slatedrop" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  SlateDrop
                </Link>
              </li>
              <li>
                <Link href="#pricing" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Pricing
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Company</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/about" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/careers" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Careers
                </Link>
              </li>
              <li>
                <Link href="/blog" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Legal</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/terms" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/security" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Security
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            <span className="text-primary">© 2026 Slate360.</span> All rights reserved.
          </p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="h-4 w-4 text-primary" />
            support@slate360.com
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ==========================================================================
   MAIN MARKETING HOMEPAGE COMPONENT
   Assembles all sections in the specified vertical order
   ========================================================================== */

export default function MarketingHomepage() {
  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <Header />
      <main>
        <HeroSection />
        <TrustBar />
        <AppShowcaseSection />
        <SlateDropSection />
        <PricingSection />
        <TestimonialsSection />
        <FinalCTASection />
      </main>
      <Footer />
    </div>
  );
}
