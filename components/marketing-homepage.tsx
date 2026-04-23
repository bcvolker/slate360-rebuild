"use client";

/**
 * ==========================================================================
 * SLATE360 MARKETING HOMEPAGE
 * ==========================================================================
 * 
 * A complete, production-ready marketing page following the Dark Glass aesthetic
 * with Industrial Gold (#3B82F6 / hsl(45 82% 55%)) accents.
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
import { useRouter } from "next/navigation";
import PricingSectionV2 from "@/components/home/PricingSection";
import {
  Menu,
  X,
  Play,
  Building2,
  MapPin,
  Palette,
  FileText,
  Check,
  ChevronRight,
  ChevronDown,
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
  Maximize2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";
import { SlateLogo } from "@/components/shared/SlateLogo";
import { SlateLogoOnLight } from "@/components/shared/SlateLogoOnLight";
import { BetaGatedButton } from "@/components/billing/BetaGatedButton";
import GetTheAppButton from "@/components/home/GetTheAppButton";

const HeroDemo = dynamic(() => import("@/components/home/HeroDemo"), { ssr: false });
const AppDemo = dynamic(() => import("@/components/home/AppDemo"), { ssr: false });

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
  slug: string;
  description: string;
  icon: typeof Building2;
  features: string[];
  demoType: "panorama" | "model" | "placeholder";
  demoSrc?: string;
  demoLabel?: string;
  comingSoon?: boolean;
  statusLabel?: string;
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

const TRUST_CATEGORIES = [
  "General Contractors",
  "Architecture Firms",
  "Real Estate Developers",
  "Property Managers",
  "Construction Tech Teams",
];

const APP_SHOWCASE: AppShowcase[] = [
  {
    name: "Site Walk",
    slug: "site-walk",
    description: "Capture site conditions in context, document observations as you walk, and turn field documentation into punch lists, branded reports, and proposals.",
    icon: MapPin,
    comingSoon: true,
    statusLabel: "On the Way — Coming Soon",
    demoType: "placeholder",
    demoLabel: "Live demo coming soon",
    features: [
      "Capture project context in real time",
      "Document observations as you walk",
      "Preserve geolocated, time-stamped records",
      "Create client-ready deliverables fast",
      "Keep project files tied to the right context",
      "Share outputs within minutes",
      "Reduce photo clutter on mobile devices",
      "Turn field capture into usable reports",
    ],
  },
  {
    name: "360 Tours",
    slug: "360-tour-builder",
    description: "Create immersive 360 walkthroughs with hotspots, floor plans, and branded share links so clients and stakeholders can explore remotely with context.",
    icon: Building2,
    comingSoon: true,
    statusLabel: "Under Development — Coming Soon",
    demoType: "panorama",
    demoSrc: "/uploads/pletchers.jpg",
    demoLabel: "Drag to explore — 360° panorama",
    features: [
      "Drag-and-drop tour creation",
      "Interactive hotspots & annotations",
      "Embed anywhere with one link",
      "Client portal auto-generation",
      "Analytics & view tracking",
      "Floor plan integration",
      "Before / after comparisons",
      "White-label branding",
    ],
  },
  {
    name: "Design Studio",
    slug: "design-studio",
    description: "Review plans, generate and present 3D models, and work through design decisions in connected 2D and 3D workspaces.",
    icon: Palette,
    comingSoon: true,
    statusLabel: "Under Development — Coming Soon",
    demoType: "model",
    demoSrc: "/uploads/csb-stadium-model.glb",
    demoLabel: "Rotate & zoom — 3D model",
    features: [
      "GLB / glTF model support",
      "Interactive rotate, zoom & pan",
      "Client-shareable model links",
      "Annotation & markup tools",
      "Before / after comparisons",
      "Material & texture editing",
      "Measurement overlays",
      "Version history tracking",
    ],
  },
  {
    name: "Content Studio",
    slug: "content-studio",
    description: "Edit standard and 360 video, organize project media, and produce branded client and marketing deliverables from one content workspace.",
    icon: FileText,
    comingSoon: true,
    statusLabel: "Under Development — Coming Soon",
    demoType: "placeholder",
    demoLabel: "Asset management preview coming soon",
    features: [
      "Photo, video & document library",
      "Collection-based organization",
      "Client-shareable galleries",
      "Bulk upload & tagging",
      "Smart search & filters",
      "Version history tracking",
      "Download permissions",
      "CDN-powered delivery",
    ],
  },
];

const PRICING_TIERS: PricingTier[] = [
  {
    name: "Free Trial",
    description: "Explore every app with limited storage and credits",
    monthlyPrice: 0,
    annualPrice: 0,
    storage: "2 GB",
    features: [
      "Access all apps (limited)",
      "2 GB storage",
      "250 credits / month",
      "1 user / 1 license",
      "Basic client portals",
      "SlateDrop file sharing",
    ],
    cta: "Start Free",
  },
  {
    name: "Field Pro Bundle",
    description: "Site Walk Pro + 360 Tours Pro — everything for field teams",
    monthlyPrice: "Custom",
    annualPrice: "Custom",
    storage: "TBD",
    features: [
      "Site Walk Pro",
      "360 Tour Builder Pro",
      "Pooled storage (TBD)",
      "Credits / month (TBD)",
      "1 user / 1 license",
      "Priority support",
      "Full SlateDrop access",
    ],
    popular: true,
    cta: "Start 14-Day Trial",
  },
  {
    name: "Enterprise",
    description: "Custom plans for teams — seats, storage, and features negotiated directly",
    monthlyPrice: "Custom",
    annualPrice: "Custom",
    storage: "Negotiated",
    features: [
      "All apps at Pro tier",
      "Custom seat count",
      "Custom storage allocation",
      "SSO & advanced security",
      "Dedicated success manager",
      "White-label branding",
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

function Header({ isLoggedIn = false }: { isLoggedIn?: boolean }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [appsOpen, setAppsOpen] = useState(false);

  return (
    <header className="dark fixed top-0 left-0 right-0 z-50 h-16 border-b border-white/10 bg-[#0B0F15]/85 backdrop-blur-lg text-white">
      <div className="container mx-auto h-full pl-3 pr-2 sm:px-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center -ml-1 sm:ml-0">
          <SlateLogo />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) =>
            link.label === "Apps" ? (
              <div key={link.href} className="relative">
                <button
                  onClick={() => setAppsOpen(!appsOpen)}
                  className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-teal transition-colors"
                >
                  Apps
                  <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", appsOpen && "rotate-180")} />
                </button>
                {appsOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setAppsOpen(false)} />
                    <div className="absolute left-1/2 top-8 z-50 w-52 -translate-x-1/2 rounded-xl border border-primary/15 bg-card/95 py-2 shadow-xl backdrop-blur-xl">
                      {APP_SHOWCASE.map((app) => (
                        <Link
                          key={app.slug}
                          href={`/apps/${app.slug}`}
                          onClick={() => setAppsOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-teal-soft hover:text-teal"
                        >
                          <app.icon className="h-4 w-4 flex-shrink-0" />
                          {app.name}
                        </Link>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-muted-foreground hover:text-teal transition-colors"
              >
                {link.label}
              </Link>
            )
          )}
        </nav>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-3">
          {isLoggedIn ? (
            <>
              <Button variant="ghost" asChild className="text-muted-foreground hover:text-cobalt hover:bg-cobalt-soft">
                <Link href="/dashboard">Dashboard</Link>
              </Button>
              <Button variant="outline" asChild className="border-border text-muted-foreground hover:text-cobalt hover:border-cobalt">
                <Link href="/auth/logout">Logout</Link>
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" asChild className="text-muted-foreground hover:text-cobalt hover:bg-cobalt-soft">
                <Link href="/login">Login</Link>
              </Button>
              <Button asChild className="btn-amber-soft">
                <Link href="/signup">Get Started Free</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile Menu Trigger */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon" className="text-white hover:text-cobalt hover:bg-white/10">
              <Menu className="h-6 w-6" />
              <span className="sr-only">Open menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[280px] !h-auto !inset-y-auto !top-0 !right-0 !rounded-bl-2xl border-b border-l border-slate-200 !bg-white backdrop-blur-xl [&>button]:text-slate-900">
            <div className="flex flex-col gap-4 py-4 px-5">
              {/* Logo (cobalt variant for light sheet) */}
              <SlateLogoOnLight className="h-6 w-auto self-start" />
              <nav className="flex flex-col gap-1">
                <Link
                  href="#product"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-[15px] font-medium text-foreground transition-colors hover:bg-teal-soft hover:text-teal"
                >
                  Product
                </Link>
                {/* Apps — with sub-links */}
                <div>
                  <Link
                    href="#apps"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block rounded-lg px-3 py-2.5 text-[15px] font-medium text-foreground transition-colors hover:bg-teal-soft hover:text-teal"
                  >
                    Apps
                  </Link>
                  <div className="ml-4 mt-1 flex flex-col gap-0.5 border-l border-border pl-3">
                    {APP_SHOWCASE.map((app) => (
                      <Link
                        key={app.slug}
                        href={`/apps/${app.slug}`}
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-2 rounded px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-teal-soft hover:text-teal"
                      >
                        <app.icon className="h-3.5 w-3.5 flex-shrink-0" />
                        {app.name}
                      </Link>
                    ))}
                  </div>
                </div>
                <Link
                  href="#slatedrop"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-[15px] font-medium text-foreground transition-colors hover:bg-teal-soft hover:text-teal"
                >
                  Solutions
                </Link>
                <Link
                  href="#pricing"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-[15px] font-medium text-foreground transition-colors hover:bg-teal-soft hover:text-teal"
                >
                  Pricing
                </Link>
              </nav>
              <div className="flex flex-col gap-3 border-t border-border pt-3">
                {isLoggedIn ? (
                  <>
                    <Button asChild className="btn-amber-soft">
                      <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}>Go to Dashboard</Link>
                    </Button>
                    <Button variant="outline" asChild className="border-border text-foreground hover:border-teal hover:text-teal">
                      <Link href="/auth/logout" onClick={() => setMobileMenuOpen(false)}>Logout</Link>
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" asChild className="border-border text-foreground hover:border-teal hover:text-teal">
                      <Link href="/login" onClick={() => setMobileMenuOpen(false)}>Login</Link>
                    </Button>
                    <Button asChild className="btn-amber-soft">
                      <Link href="/signup" onClick={() => setMobileMenuOpen(false)}>Subscribe Now</Link>
                    </Button>
                  </>
                )}
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
    <section className="relative lg:min-h-[calc(100vh-4rem)] flex items-center px-4 sm:px-6 lg:px-10 overflow-hidden bg-gradient-to-b from-white via-slate-50 to-blue-50/40">
      {/* Subtle grid pattern — slate, very low opacity for light surface */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `linear-gradient(rgba(15,23,42,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.6) 1px, transparent 1px)`,
          backgroundSize: "64px 64px",
        }}
      />

      <div className="relative z-10 mx-auto max-w-7xl w-full grid lg:grid-cols-[1fr_1.15fr] gap-4 lg:gap-12 items-center pt-20 sm:pt-24 lg:pt-24 pb-8 sm:pb-12">
        {/* LEFT (desktop) / SECOND (mobile): copy + CTAs */}
        <div className="order-2 lg:order-1 space-y-4 sm:space-y-5 text-center lg:text-left">
          <Badge variant="outline" className="border-cobalt text-cobalt px-3.5 py-1.5 bg-cobalt/10 text-sm shadow-sm shadow-cobalt/10">
            <Zap className="mr-1.5 h-3.5 w-3.5" />
            Now in Beta — Foundational Member Pricing
          </Badge>

          <h1 className="text-[2rem] leading-[1.15] sm:text-4xl lg:text-4xl xl:text-5xl font-bold text-slate-900 text-balance tracking-tight">
            The real-time interactive bridge between{" "}
            <span className="bg-gradient-to-r from-cobalt to-cobalt-hover bg-clip-text text-transparent">the field and the office</span>
          </h1>

          <p className="text-base sm:text-base lg:text-base text-slate-600 max-w-xl mx-auto lg:mx-0 text-pretty leading-relaxed">
            Capture site conditions with your phone or 360 camera, add comments as you walk, and automatically preserve a time-stamped, geolocated record. Turn it into punch lists, reports, or proposals — and share with your team in minutes.
          </p>

          {/* CTAs: side-by-side on ALL screens (50/50 on mobile, auto on desktop) */}
          <div className="grid grid-cols-2 sm:flex sm:flex-row sm:items-center sm:justify-center lg:justify-start gap-3 pt-1">
            <GetTheAppButton className="w-full sm:w-auto" />
            <Button variant="outline" asChild className="h-12 px-4 sm:px-6 text-base font-semibold w-full sm:w-auto bg-white border-slate-300 text-slate-900 hover:border-cobalt hover:text-cobalt hover:bg-cobalt/5 shadow-sm">
              <Link href="#apps">
                <span className="truncate">Explore Apps</span>
                <ChevronRight className="ml-1 h-4 w-4 shrink-0" />
              </Link>
            </Button>
          </div>
          <p className="text-sm text-slate-500 pt-1 leading-relaxed">
            Free to download. 14-day all-access trial. Subscribe anytime — no credit card required during beta.
          </p>
        </div>

        {/* RIGHT (desktop) / FIRST (mobile): interactive demo. HeroDemo manages
            its own expand button and fullscreen overlay. Wrapped as a premium
            showcase frame — outer ring + soft outer glow, inner hairline + inset
            highlight so 3D models, 360s, and video sit in an "expensive" frame. */}
        <div className="order-1 lg:order-2 w-full max-w-[22rem] sm:max-w-md lg:max-w-none mx-auto">
          <div className="relative rounded-3xl bg-gradient-to-br from-white via-blue-50/60 to-white p-2 ring-1 ring-slate-200/80 shadow-[0_30px_80px_-20px_rgba(15,23,42,0.25),0_0_0_1px_rgba(59,130,246,0.06)]">
            <div className="rounded-2xl overflow-hidden ring-1 ring-slate-900/5 bg-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
              <div className="p-1.5 sm:p-3 lg:p-3">
                <HeroDemo />
              </div>
            </div>
          </div>
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
    <section className="py-12 px-4 border-y border-slate-200 bg-blue-50/40">
      <div className="container mx-auto">
        <p className="text-center text-sm font-semibold text-slate-500 uppercase tracking-wider mb-8">
          Built for teams across the AEC industry
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 lg:gap-8">
          {TRUST_CATEGORIES.map((category) => (
            <div
              key={category}
              className="px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 font-medium text-sm shadow-sm"
            >
              {category}
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
  // Per-card module accent — used for the colored top border + icon halo so
  // each card has its own identity and the row of white cards still pops.
  const ACCENTS: Record<string, { border: string; bg: string; ring: string; text: string }> = {
    "site-walk":       { border: "border-t-cobalt",       bg: "bg-cobalt/10",       ring: "ring-cobalt/30",       text: "text-cobalt" },
    "360-tour-builder":{ border: "border-t-emerald-500",  bg: "bg-emerald-500/10",  ring: "ring-emerald-500/30",  text: "text-emerald-600" },
    "design-studio":   { border: "border-t-violet-500",   bg: "bg-violet-500/10",   ring: "ring-violet-500/30",   text: "text-violet-600" },
    "content-studio":  { border: "border-t-amber-500",    bg: "bg-amber-500/10",    ring: "ring-amber-500/30",    text: "text-amber-600" },
  };

  return (
    <section id="apps" className="py-20 px-4 bg-slate-50">
      <div className="container mx-auto max-w-6xl">
        {/* Section Header */}
        <div className="text-center mb-12">
          <Badge variant="outline" className="border-cobalt/40 text-cobalt bg-cobalt/5 mb-4">
            Connected Ecosystem
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4 tracking-tight">
            One platform. An expanding ecosystem of interactive workflows.
          </h2>
          <p className="text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Slate360 is built as an expanding ecosystem of connected apps that share projects, files, permissions, and deliverables. Start with any app, then expand into other capabilities as your workflows grow without losing continuity or context.
          </p>
        </div>

        {/* App Cards */}
        <div className="grid gap-6 lg:grid-cols-2">
          {APP_SHOWCASE.map((app) => {
            const Icon = app.icon;
            const accent = ACCENTS[app.slug] ?? ACCENTS["site-walk"];
            return (
              <Card
                key={app.name}
                className={cn(
                  "bg-white rounded-2xl ring-1 ring-slate-200/80 shadow-[0_20px_50px_rgba(15,23,42,0.08)]",
                  "transition-transform duration-300 hover:-translate-y-1 hover:shadow-[0_30px_70px_rgba(15,23,42,0.12)]",
                  "border-t-4 group",
                  accent.border,
                )}
              >
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center ring-1 transition-colors", accent.bg, accent.ring)}>
                      <Icon className={cn("h-6 w-6", accent.text)} />
                    </div>
                    <CardTitle className="text-2xl text-slate-900">{app.name}</CardTitle>
                    {app.comingSoon && (
                      <span className="ml-auto rounded-full border border-cobalt/30 bg-cobalt/10 px-2.5 py-0.5 text-xs font-semibold text-cobalt">
                        {app.statusLabel || "Coming Soon"}
                      </span>
                    )}
                  </div>
                  <CardDescription className="text-slate-600 text-base leading-relaxed">
                    {app.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Interactive Demo */}
                  <AppDemo
                    type={app.demoType}
                    modelSrc={app.demoType === "model" ? app.demoSrc : undefined}
                    panoramaSrc={app.demoType === "panorama" ? app.demoSrc : undefined}
                    label={app.demoLabel}
                  />

                  {/* Features - 2 columns */}
                  <ul className="grid grid-cols-2 gap-x-4 gap-y-2">
                    {app.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm text-slate-700">
                        <Check className={cn("h-4 w-4 flex-shrink-0", accent.text)} />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  {/* CTAs */}
                  <div className="flex gap-3">
                    <BetaGatedButton
                      action="subscribe"
                      className="flex-1 inline-flex items-center justify-center rounded-lg h-10 px-4 text-sm font-medium bg-cobalt hover:bg-cobalt-hover text-white shadow-md shadow-cobalt/30 transition-shadow hover:shadow-lg hover:shadow-cobalt/40"
                      renderEnabled={() => (
                        <Button asChild className="flex-1 bg-cobalt hover:bg-cobalt-hover text-white shadow-md shadow-cobalt/30 transition-shadow hover:shadow-lg hover:shadow-cobalt/40">
                          <Link href="/signup">
                            {app.comingSoon ? "Join Waitlist" : "Subscribe"}
                            <ArrowRight className="ml-1 h-4 w-4" />
                          </Link>
                        </Button>
                      )}
                    >
                      {app.comingSoon ? "Join Waitlist" : "Subscribe"}
                    </BetaGatedButton>
                    <Button asChild variant="outline" className="flex-1 bg-white border-slate-300 text-slate-700 hover:border-cobalt hover:text-cobalt hover:bg-cobalt/5">
                      <Link href={`/apps/${app.slug}`}>
                        Learn More
                        <ChevronRight className="ml-1 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Interoperability Note */}
        <Card className="mt-8 bg-cobalt/5 border-cobalt/20 ring-1 ring-cobalt/10 shadow-sm">
          <CardContent className="py-4 px-6">
            <p className="text-sm text-center text-slate-700">
              Connected apps share projects, files, permissions, and deliverables so your workflow can expand without losing context.
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
    <section id="slatedrop" className="py-20 px-4 bg-blue-50/40">
      <div className="container mx-auto max-w-6xl">
        {/* Section Header */}
        <div className="text-center mb-12">
          <Badge variant="outline" className="border-cobalt/40 text-cobalt bg-cobalt/5 mb-4">
            <FolderSync className="mr-1.5 h-3.5 w-3.5" />
            Workflow Impact
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4 tracking-tight">
            Why Slate360 changes the workflow
          </h2>
          <p className="text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Slate360 keeps the field capture, project context, and office outputs connected so teams can work from the same current information instead of reconstructing it later.
          </p>
        </div>

        {/* Visual Placeholder - Connected Glass Cards */}
        <Card className="bg-white rounded-2xl ring-1 ring-slate-200/80 shadow-[0_20px_50px_rgba(15,23,42,0.08)] overflow-hidden">
          <CardContent className="p-8">
            <div className="relative">
              {/* Connection lines (decorative) */}
              <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="cobalt-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="rgba(59,130,246,0.05)" />
                    <stop offset="50%" stopColor="rgba(59,130,246,0.35)" />
                    <stop offset="100%" stopColor="rgba(59,130,246,0.05)" />
                  </linearGradient>
                </defs>
                {/* Horizontal lines */}
                <line x1="20%" y1="50%" x2="80%" y2="50%" stroke="url(#cobalt-gradient)" strokeWidth="2" />
                {/* Vertical lines */}
                <line x1="50%" y1="20%" x2="50%" y2="80%" stroke="url(#cobalt-gradient)" strokeWidth="2" />
              </svg>

              {/* Grid of workflow outcomes */}
              <div className="relative grid gap-4 md:grid-cols-3 md:gap-8">
                <Card className="bg-slate-50 border-slate-200 ring-1 ring-slate-200/60 shadow-sm">
                  <CardContent className="p-6 text-center">
                    <FolderSync className="h-7 w-7 text-cobalt mx-auto mb-3" />
                    <p className="text-sm font-semibold text-slate-900 mb-2">Stop losing project meaning</p>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      Photos, notes, and documents are only valuable if they stay tied to the project context that explains them.
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-cobalt/5 border-cobalt/30 ring-1 ring-cobalt/20 shadow-md shadow-cobalt/10">
                  <CardContent className="p-6 text-center">
                    <Sparkles className="h-7 w-7 text-cobalt mx-auto mb-3" />
                    <p className="text-sm font-semibold text-slate-900 mb-2">Create polished outputs faster</p>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      Slate360 helps teams turn site documentation into professional, branded deliverables in minutes instead of spending hours rebuilding the story later.
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-slate-50 border-slate-200 ring-1 ring-slate-200/60 shadow-sm">
                  <CardContent className="p-6 text-center">
                    <Users className="h-7 w-7 text-cobalt mx-auto mb-3" />
                    <p className="text-sm font-semibold text-slate-900 mb-2">Keep the field and office aligned</p>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      Make it easier for the people walking the project and the people reviewing it in real-time to work from the same current, contextualized information.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* CTA */}
            <div className="text-center mt-8">
              <Button className="bg-cobalt hover:bg-cobalt-hover text-white shadow-md shadow-cobalt/30 hover:shadow-lg hover:shadow-cobalt/40">
                See the workflow in action
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
                  <Badge className="bg-primary text-primary-foreground ">
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
                <BetaGatedButton
                  action={tier.popular ? "subscribe" : "upgrade"}
                  className={cn(
                    "w-full inline-flex items-center justify-center rounded-lg h-10 px-4 text-sm font-medium",
                    tier.popular ? "btn-amber-soft" : "bg-muted hover:bg-muted/80 text-foreground"
                  )}
                  renderEnabled={() => (
                    <Button
                      className={cn(
                        "w-full",
                        tier.popular
                          ? "btn-amber-soft"
                          : "bg-muted hover:bg-muted/80 text-foreground"
                      )}
                    >
                      {tier.cta}
                    </Button>
                  )}
                >
                  {tier.cta}
                </BetaGatedButton>
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
                    <td className="py-3 text-muted-foreground">TBD</td>
                    <td className="py-3 text-right text-foreground">TBD</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-3 text-foreground">Site Walk Standalone</td>
                    <td className="py-3 text-muted-foreground">Site Walk only</td>
                    <td className="py-3 text-muted-foreground">TBD</td>
                    <td className="py-3 text-right text-foreground">TBD</td>
                  </tr>
                  <tr className="bg-primary/5">
                    <td className="py-3 text-primary font-medium">Professional Bundle</td>
                    <td className="py-3 text-foreground">Both apps</td>
                    <td className="py-3 text-foreground">TBD</td>
                    <td className="py-3 text-right text-primary font-bold">TBD</td>
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
    <section className="py-20 px-4 bg-blue-50/40">
      <div className="container mx-auto max-w-6xl">
        {/* Section Header */}
        <div className="text-center mb-12">
          <Badge variant="outline" className="border-cobalt/40 text-cobalt bg-cobalt/5 mb-4">
            Customer Stories
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4 tracking-tight">
            What our customers will say
          </h2>
          <p className="text-slate-600 max-w-2xl mx-auto leading-relaxed">
            We&apos;re just getting started. As teams adopt Slate360, their stories will appear here.
          </p>
        </div>

        {/* Placeholder cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card
              key={i}
              className="bg-white rounded-2xl ring-1 ring-slate-200/80 shadow-[0_20px_50px_rgba(15,23,42,0.08)] transition-transform duration-300 hover:-translate-y-1"
            >
              <CardContent className="pt-6 flex flex-col items-center justify-center min-h-[200px]">
                <Quote className="h-8 w-8 text-cobalt/30 mb-4" />
                <p className="text-slate-600 text-center text-sm">
                  Your story could be here.
                </p>
                <Button variant="link" asChild className="mt-3 text-cobalt hover:text-cobalt-hover text-sm">
                  <Link href="/signup">Be an early adopter →</Link>
                </Button>
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
    <section className="py-20 px-4 bg-slate-50">
      <div className="container mx-auto max-w-4xl">
        <Card className="bg-white rounded-3xl ring-1 ring-cobalt/20 shadow-[0_30px_80px_-20px_rgba(59,130,246,0.25),0_20px_50px_rgba(15,23,42,0.08)] overflow-hidden">
          {/* subtle cobalt glow strip on top edge */}
          <div className="h-1 bg-gradient-to-r from-cobalt/0 via-cobalt to-cobalt/0" />
          <CardContent className="py-12 px-8 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4 tracking-tight">
              Ready to connect your entire project ecosystem?
            </h2>
            <p className="text-slate-600 mb-8 max-w-2xl mx-auto leading-relaxed">
              Join thousands of construction professionals who trust Slate360 for their
              deliverables. Start free, upgrade when you&apos;re ready.
            </p>

            {/* Email Signup */}
            <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <Input
                type="email"
                placeholder="Enter your work email"
                className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-cobalt h-12"
              />
              <Button
                size="lg"
                className="h-12 px-8 bg-cobalt hover:bg-cobalt-hover text-white shadow-md shadow-cobalt/30 hover:shadow-lg hover:shadow-cobalt/40"
              >
                Create Your Free Account
              </Button>
            </div>

            <p className="text-xs text-slate-500 mt-4">
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
    <footer className="border-t border-primary/15 bg-glass backdrop-blur-lg">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Link href="/" className="flex items-center mb-4">
              <SlateLogo />
            </Link>
            <p className="text-sm text-muted-foreground mb-4">
              The real-time interactive bridge between the field and the office.
            </p>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-teal-soft hover:text-teal">
                <Twitter className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-teal-soft hover:text-teal">
                <Linkedin className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-teal-soft hover:text-teal">
                <Github className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Product</h4>
            <ul className="space-y-2">
              <li>
                <Link href="#apps" className="text-sm text-muted-foreground hover:text-teal transition-colors">
                  360 Tours
                </Link>
              </li>
              <li>
                <Link href="#apps" className="text-sm text-muted-foreground hover:text-teal transition-colors">
                  Site Walk
                </Link>
              </li>
              <li>
                <Link href="#slatedrop" className="text-sm text-muted-foreground hover:text-teal transition-colors">
                  SlateDrop
                </Link>
              </li>
              <li>
                <Link href="#pricing" className="text-sm text-muted-foreground hover:text-teal transition-colors">
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
                <Link href="/about" className="text-sm text-muted-foreground hover:text-teal transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/careers" className="text-sm text-muted-foreground hover:text-teal transition-colors">
                  Careers
                </Link>
              </li>
              <li>
                <Link href="/blog" className="text-sm text-muted-foreground hover:text-teal transition-colors">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-sm text-muted-foreground hover:text-teal transition-colors">
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
                <Link href="/terms" className="text-sm text-muted-foreground hover:text-teal transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-sm text-muted-foreground hover:text-teal transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/security" className="text-sm text-muted-foreground hover:text-teal transition-colors">
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

export default function MarketingHomepage({ isLoggedIn = false }: { isLoggedIn?: boolean }) {
  const router = useRouter();
  return (
    // Root keeps `dark` so the fixed Header's glass/header tokens still resolve
    // dark — the isolated dark top bar must stay intact.
    <div className="dark min-h-screen overflow-x-hidden">
      <Header isLoggedIn={isLoggedIn} />
      {/* Light marketing surface scoped to <main>. The `not-dark` wrapper +
          explicit slate utilities override the dark token cascade so headings
          render crisp slate-900 and bodies render slate-600. */}
      <main className="bg-slate-50 text-slate-900 [color-scheme:light]">
        <HeroSection />
        <TrustBar />
        <AppShowcaseSection />
        <SlateDropSection />
        <PricingSectionV2 onGetStarted={() => router.push(isLoggedIn ? "/dashboard" : "/signup")} />
        <TestimonialsSection />
        <FinalCTASection />
      </main>
      <Footer />
    </div>
  );
}
