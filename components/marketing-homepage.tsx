"use client";

/**
 * ==========================================================================
 * SLATE360 MARKETING HOMEPAGE — v2 (2026 Redesign)
 * ==========================================================================
 *
 * Ultra-premium SaaS aesthetic inspired by Linear, Vercel, and Stripe.
 * Dark glass shell. Cobalt blue brand accent. Geist typography.
 *
 * Key sections:
 *   1. Header        — dark #0B0F15, crisp white logo, cobalt Log In CTA
 *   2. Hero          — headline, subheadline, dual CTAs
 *   3. App Showcase  — interactive bento box with useState tab switcher
 *   4. Pricing       — 4 a-la-carte cards + full-width Master Bundle
 *   5. Footer        — navigation columns + legal
 * ==========================================================================
 */

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Menu,
  X,
  MapPin,
  Camera,
  Palette,
  FileVideo,
  Check,
  ChevronRight,
  Zap,
  Mail,
  Twitter,
  Linkedin,
  Play,
  Layers,
  Star,
  ArrowRight,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { SlateLogo } from "@/components/shared/SlateLogo";
import { BetaGatedButton } from "@/components/billing/BetaGatedButton";

/* ==========================================================================
   TYPES
   ========================================================================== */

interface AppTab {
  id: string;
  label: string;
  icon: React.ElementType;
  tagline: string;
  features: string[];
  mockContent: React.ReactNode;
}

interface AppPricingCard {
  id: string;
  name: string;
  icon: React.ElementType;
  price: string;
  description: string;
  features: string[];
  accent: string;
  bg: string;
}

/* ==========================================================================
   STATIC DATA
   ========================================================================== */

const NAV_LINKS = [
  { label: "Product", href: "#product" },
  { label: "Apps", href: "#apps" },
  { label: "Pricing", href: "#pricing" },
];

const TRUST_CATEGORIES = [
  "General Contractors",
  "Architecture Firms",
  "Real Estate Developers",
  "Property Managers",
  "Construction Tech Teams",
];

const APP_PRICING_CARDS: AppPricingCard[] = [
  {
    id: "site-walk",
    name: "Site Walk",
    icon: MapPin,
    price: "Starting at $29/mo",
    description: "Field documentation, AI punch lists, and branded reports.",
    features: [
      "Geolocated photo capture",
      "AI transcription & formatting",
      "Branded PDF reports",
      "Punch list generation",
    ],
    accent: "text-blue-400",
    bg: "bg-blue-500/10",
  },
  {
    id: "360-tours",
    name: "360 Tours",
    icon: Camera,
    price: "Starting at $39/mo",
    description: "Immersive 360° walkthroughs with hotspots and client portals.",
    features: [
      "Drag-and-drop tour creation",
      "Interactive hotspot annotations",
      "Branded share links",
      "Analytics & view tracking",
    ],
    accent: "text-cyan-400",
    bg: "bg-cyan-500/10",
  },
  {
    id: "design-studio",
    name: "Design Studio",
    icon: Palette,
    price: "Starting at $49/mo",
    description: "Review plans, 3D models, and design decisions in one workspace.",
    features: [
      "GLB / glTF model viewer",
      "Annotation & markup tools",
      "Client-shareable model links",
      "Version history tracking",
    ],
    accent: "text-violet-400",
    bg: "bg-violet-500/10",
  },
  {
    id: "content-studio",
    name: "Content Studio",
    icon: FileVideo,
    price: "Starting at $29/mo",
    description: "Edit video, organize media, and produce branded deliverables.",
    features: [
      "Photo, video & document library",
      "Client-shareable galleries",
      "Smart search & filters",
      "CDN-powered delivery",
    ],
    accent: "text-pink-400",
    bg: "bg-pink-500/10",
  },
];

/* ==========================================================================
   MOCK UI COMPONENTS — used inside the App Showcase viewer
   ========================================================================== */

function SiteWalkMockUI() {
  return (
    <div className="h-full flex flex-col gap-3 p-4 overflow-hidden">
      {/* Photo strip */}
      <div className="rounded-xl overflow-hidden bg-slate-800 flex-shrink-0 h-36 relative">
        <div className="absolute inset-0 flex items-end p-3">
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="w-14 h-10 rounded-lg bg-slate-700 border border-white/10 animate-pulse"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-slate-700/60 to-slate-900/80" />
        <div className="absolute top-3 left-3 flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 text-blue-400" />
          <span className="text-[10px] font-medium text-blue-300">Site Walk Active</span>
        </div>
      </div>

      {/* AI transcription box */}
      <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-3 flex-shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500/20">
            <Star className="h-3 w-3 text-blue-400" />
          </span>
          <span className="text-xs font-semibold text-blue-300">Format with AI</span>
          <span className="ml-auto rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-medium text-blue-300">
            Processing...
          </span>
        </div>
        <div className="space-y-1.5">
          {["North elevation crack — hairline, 3rd floor", "HVAC unit access panel missing hardware", "Exterior caulking deteriorated at window sills"].map(
            (line, i) => (
              <div
                key={i}
                className="h-2.5 rounded bg-blue-500/20"
                style={{ width: `${85 - i * 12}%` }}
              />
            )
          )}
        </div>
      </div>

      {/* Feature bullets */}
      <ul className="space-y-2 flex-1">
        {[
          "Geolocated, time-stamped capture",
          "AI punch list generation in seconds",
          "Branded PDF reports in one click",
          "Share with your team instantly",
        ].map((f) => (
          <li key={f} className="flex items-center gap-2 text-xs text-slate-300">
            <Check className="h-3.5 w-3.5 flex-shrink-0 text-blue-400" />
            {f}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ToursMockUI() {
  return (
    <div className="h-full flex flex-col gap-3 p-4 overflow-hidden">
      {/* 360 panorama strip */}
      <div className="rounded-xl overflow-hidden bg-slate-800 flex-shrink-0 h-36 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700 animate-pulse" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-cyan-400/40 bg-cyan-400/10">
              <Camera className="h-5 w-5 text-cyan-400" />
            </div>
            <span className="text-[10px] text-cyan-300 font-medium">360° Panorama Preview</span>
          </div>
        </div>
        {/* Hotspot dots */}
        {[
          { top: "30%", left: "25%" },
          { top: "55%", left: "60%" },
          { top: "40%", left: "80%" },
        ].map((pos, i) => (
          <div
            key={i}
            className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-cyan-400 bg-cyan-400/30"
            style={pos}
          />
        ))}
      </div>

      {/* Hotspot list */}
      <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-3 flex-shrink-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-cyan-400 mb-2">
          Hotspots
        </p>
        {["Entrance Lobby", "Main Hall — Level 2", "Roof Access"].map((h, i) => (
          <div key={h} className="flex items-center gap-2 py-1">
            <div className="h-2 w-2 rounded-full bg-cyan-400" />
            <span className="text-xs text-slate-300">{h}</span>
            <span className="ml-auto text-[10px] text-slate-500">View {i + 1}</span>
          </div>
        ))}
      </div>

      <ul className="space-y-2 flex-1">
        {[
          "Drag-and-drop tour builder",
          "Interactive annotations & hotspots",
          "Embed anywhere with one link",
          "Client portal auto-generation",
        ].map((f) => (
          <li key={f} className="flex items-center gap-2 text-xs text-slate-300">
            <Check className="h-3.5 w-3.5 flex-shrink-0 text-cyan-400" />
            {f}
          </li>
        ))}
      </ul>
    </div>
  );
}

function DesignStudioMockUI() {
  return (
    <div className="h-full flex flex-col gap-3 p-4 overflow-hidden">
      {/* 3D viewport */}
      <div className="rounded-xl overflow-hidden bg-slate-900 flex-shrink-0 h-36 relative border border-violet-500/20">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            {/* Wireframe cube suggestion */}
            <div className="h-16 w-16 border-2 border-violet-400/40 rounded-lg rotate-12" />
            <div className="absolute top-2 left-2 h-16 w-16 border border-violet-300/20 rounded-lg -rotate-6" />
          </div>
        </div>
        <div className="absolute top-3 right-3 flex gap-1">
          {["3D", "2D", "AR"].map((mode) => (
            <span
              key={mode}
              className="rounded px-1.5 py-0.5 text-[9px] font-bold border border-violet-500/30 text-violet-300 bg-violet-500/10"
            >
              {mode}
            </span>
          ))}
        </div>
        <div className="absolute bottom-2 left-3 text-[10px] text-violet-300 font-medium">
          CSB Stadium — v3.2
        </div>
      </div>

      {/* Layer panel */}
      <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-3 flex-shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <Layers className="h-3.5 w-3.5 text-violet-400" />
          <span className="text-[10px] font-semibold text-violet-300">Layers</span>
        </div>
        {["Structure", "MEP Systems", "Finishes"].map((l) => (
          <div key={l} className="flex items-center gap-2 py-1">
            <div className="h-2 w-2 rounded-sm border border-violet-400/50 bg-violet-400/20" />
            <span className="text-xs text-slate-300">{l}</span>
          </div>
        ))}
      </div>

      <ul className="space-y-2 flex-1">
        {[
          "GLB / glTF model support",
          "Interactive rotate, zoom & pan",
          "Annotation & markup tools",
          "Client-shareable model links",
        ].map((f) => (
          <li key={f} className="flex items-center gap-2 text-xs text-slate-300">
            <Check className="h-3.5 w-3.5 flex-shrink-0 text-violet-400" />
            {f}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ContentStudioMockUI() {
  return (
    <div className="h-full flex flex-col gap-3 p-4 overflow-hidden">
      {/* Media grid */}
      <div className="rounded-xl overflow-hidden bg-slate-900 flex-shrink-0 h-36 relative border border-pink-500/20">
        <div className="grid grid-cols-3 gap-1 p-2 h-full">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className={cn(
                "rounded-lg flex items-center justify-center",
                i % 3 === 0 ? "bg-pink-500/20 border border-pink-500/30" : "bg-slate-800"
              )}
            >
              {i % 3 === 0 ? (
                <Play className="h-4 w-4 text-pink-400" />
              ) : (
                <div className="h-3 w-3 rounded-sm bg-slate-600" />
              )}
            </div>
          ))}
        </div>
        <div className="absolute top-2 right-2">
          <span className="rounded-full bg-pink-500/20 border border-pink-400/30 px-2 py-0.5 text-[9px] font-medium text-pink-300">
            47 assets
          </span>
        </div>
      </div>

      {/* Search bar */}
      <div className="rounded-xl border border-pink-500/30 bg-pink-500/5 p-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex-1 rounded-lg bg-slate-800 border border-slate-700 px-3 py-1.5">
            <span className="text-xs text-slate-500">Search media library...</span>
          </div>
          <span className="rounded-lg bg-pink-500 px-3 py-1.5 text-[10px] font-semibold text-white">
            Filter
          </span>
        </div>
      </div>

      <ul className="space-y-2 flex-1">
        {[
          "Photo, video & document library",
          "Collection-based organization",
          "Client-shareable galleries",
          "CDN-powered delivery",
        ].map((f) => (
          <li key={f} className="flex items-center gap-2 text-xs text-slate-300">
            <Check className="h-3.5 w-3.5 flex-shrink-0 text-pink-400" />
            {f}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ==========================================================================
   APP TABS DATA  (defined after mock UI components so they can reference them)
   ========================================================================== */

const APP_TABS: AppTab[] = [
  {
    id: "site-walk",
    label: "Site Walk",
    icon: MapPin,
    tagline: "Field documentation that turns into deliverables instantly.",
    features: [
      "Geolocated, time-stamped photo capture",
      "AI-powered punch list generation",
      "Branded PDF reports in one click",
      "Share with your team instantly",
    ],
    mockContent: <SiteWalkMockUI />,
  },
  {
    id: "360-tours",
    label: "360 Tours",
    icon: Camera,
    tagline: "Immersive walkthroughs clients can explore from anywhere.",
    features: [
      "Drag-and-drop tour creation",
      "Interactive hotspot annotations",
      "Branded embed links",
      "Client portal auto-generation",
    ],
    mockContent: <ToursMockUI />,
  },
  {
    id: "design-studio",
    label: "Design Studio",
    icon: Palette,
    tagline: "Review plans and 3D models in one connected workspace.",
    features: [
      "GLB / glTF model support",
      "Interactive rotate, zoom & pan",
      "Annotation & markup tools",
      "Version history tracking",
    ],
    mockContent: <DesignStudioMockUI />,
  },
  {
    id: "content-studio",
    label: "Content Studio",
    icon: FileVideo,
    tagline: "Organize media and produce branded deliverables at speed.",
    features: [
      "Photo, video & document library",
      "Client-shareable galleries",
      "Smart search & filters",
      "CDN-powered delivery",
    ],
    mockContent: <ContentStudioMockUI />,
  },
];

/* ==========================================================================
   HEADER
   Permanently dark #0B0F15 — isolated from any future light-theme migration.
   ========================================================================== */

function Header({ isLoggedIn = false }: { isLoggedIn?: boolean }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 h-16"
      style={{ backgroundColor: "#0B0F15", borderBottom: "1px solid rgba(255,255,255,0.08)" }}
    >
      <div className="mx-auto h-full max-w-7xl px-4 sm:px-6 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex-shrink-0">
          <SlateLogo size="md" />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-7" aria-label="Main navigation">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-slate-400 transition-colors hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-3">
          {isLoggedIn ? (
            <Link
              href="/dashboard"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
              >
                Log In
              </Link>
              <Link
                href="/signup"
                className="rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-slate-300 transition-colors hover:border-white/30 hover:text-white"
              >
                Start Free Trial
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden flex-shrink-0 rounded-lg p-2 text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div
          className="md:hidden absolute top-16 left-0 right-0 border-b border-white/8 px-4 py-4 flex flex-col gap-3"
          style={{ backgroundColor: "#0B0F15" }}
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="text-sm font-medium text-slate-400 hover:text-white transition-colors py-1"
            >
              {link.label}
            </Link>
          ))}
          <div className="flex flex-col gap-2 pt-2 border-t border-white/8">
            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
              className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white text-center hover:bg-blue-500 transition-colors"
            >
              Log In
            </Link>
            <Link
              href="/signup"
              onClick={() => setMobileOpen(false)}
              className="rounded-lg border border-white/15 px-4 py-2.5 text-sm font-semibold text-slate-300 text-center hover:text-white hover:border-white/30 transition-colors"
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

/* ==========================================================================
   HERO SECTION
   ========================================================================== */

function HeroSection() {
  return (
    <section className="relative flex flex-col items-center justify-center px-4 sm:px-6 pt-32 pb-24 text-center overflow-hidden bg-background">
      {/* Subtle radial glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(59,130,246,0.12) 0%, transparent 60%)",
        }}
      />

      {/* Subtle grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />

      <div className="relative z-10 mx-auto max-w-3xl flex flex-col items-center gap-6">
        {/* Badge */}
        <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 px-3.5 py-1.5 text-xs font-semibold text-blue-400">
          <Zap className="h-3 w-3" />
          Now in Beta — Foundational Member Pricing
        </span>

        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white text-balance leading-[1.1]">
          The Ultimate App Ecosystem{" "}
          <span className="text-blue-400">for Construction.</span>
        </h1>

        {/* Subheadline */}
        <p className="max-w-xl text-lg text-slate-400 leading-relaxed text-pretty">
          {"Don't buy bloated software. Choose the specific tools you need, or unlock the entire Slate360 platform."}
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <BetaGatedButton
            action="subscribe"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-7 py-3.5 text-sm font-semibold text-white shadow-[0_0_24px_rgba(59,130,246,0.35)] transition-all hover:bg-blue-500 hover:shadow-[0_0_32px_rgba(59,130,246,0.45)] hover:-translate-y-px"
            renderEnabled={() => (
              <a
                href="/signup"
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-7 py-3.5 text-sm font-semibold text-white shadow-[0_0_24px_rgba(59,130,246,0.35)] transition-all hover:bg-blue-500 hover:shadow-[0_0_32px_rgba(59,130,246,0.45)] hover:-translate-y-px"
              >
                Start Free Trial
                <ArrowRight className="h-4 w-4" />
              </a>
            )}
          >
            Start Free Trial
          </BetaGatedButton>

          <Link
            href="#apps"
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-7 py-3.5 text-sm font-semibold text-slate-300 transition-all hover:border-white/30 hover:text-white hover:-translate-y-px"
          >
            <Play className="h-4 w-4" />
            Watch Demo
          </Link>
        </div>

        <p className="text-xs text-slate-500">
          Free to try. No credit card required. 14-day all-access trial.
        </p>
      </div>
    </section>
  );
}

/* ==========================================================================
   TRUST BAR
   ========================================================================== */

function TrustBar() {
  return (
    <section className="border-y border-white/6 bg-white/[0.02] py-8 px-4">
      <div className="mx-auto max-w-5xl">
        <p className="mb-6 text-center text-xs font-semibold uppercase tracking-widest text-slate-600">
          Built for teams across the AEC industry
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {TRUST_CATEGORIES.map((cat) => (
            <span
              key={cat}
              className="rounded-full border border-white/8 bg-white/4 px-4 py-1.5 text-xs font-medium text-slate-400"
            >
              {cat}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ==========================================================================
   APP SHOWCASE — interactive bento box
   ========================================================================== */

function AppShowcaseSection() {
  const [activeTab, setActiveTab] = useState<string>("site-walk");
  const active = APP_TABS.find((t) => t.id === activeTab)!;
  const ActiveIcon = active.icon;

  return (
    <section id="apps" className="py-24 px-4 sm:px-6 bg-background">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-12 text-center">
          <span className="mb-3 inline-block rounded-full border border-blue-500/30 bg-blue-500/10 px-3.5 py-1.5 text-xs font-semibold text-blue-400">
            Connected Ecosystem
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white text-balance">
            One platform. Every construction workflow.
          </h2>
          <p className="mt-4 mx-auto max-w-2xl text-slate-400 text-pretty leading-relaxed">
            Slate360 is a modular ecosystem. Start with the tools your team needs today — add more as you grow, without losing context or continuity.
          </p>
        </div>

        {/* Bento box */}
        <div className="grid lg:grid-cols-[280px_1fr] gap-4 rounded-2xl border border-white/8 bg-white/[0.02] p-3">

          {/* LEFT — Tab menu */}
          <div className="flex flex-col gap-1 lg:border-r lg:border-white/6 lg:pr-3">
            <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-slate-600">
              Select App
            </p>
            {APP_TABS.map((tab) => {
              const TabIcon = tab.icon;
              const isActive = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-3 text-left transition-all",
                    isActive
                      ? "border-l-2 border-blue-500 bg-blue-500/10 pl-[10px] text-white"
                      : "border-l-2 border-transparent text-slate-400 hover:bg-white/5 hover:text-slate-200"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg",
                      isActive ? "bg-blue-500/20" : "bg-white/5"
                    )}
                  >
                    <TabIcon
                      className={cn("h-4 w-4", isActive ? "text-blue-400" : "text-slate-500")}
                    />
                  </span>
                  <div>
                    <p className="text-sm font-semibold leading-tight">{tab.label}</p>
                    <p className="mt-0.5 text-[11px] leading-tight text-slate-500 line-clamp-1">
                      {tab.tagline}
                    </p>
                  </div>
                  {isActive && (
                    <ChevronRight className="ml-auto h-4 w-4 flex-shrink-0 text-blue-400" />
                  )}
                </button>
              );
            })}
          </div>

          {/* RIGHT — Viewer */}
          <div className="flex flex-col gap-4">
            {/* Browser chrome */}
            <div className="flex-1 rounded-xl border border-white/8 bg-slate-900 overflow-hidden min-h-[420px]">
              {/* Browser bar */}
              <div className="flex items-center gap-2 border-b border-white/6 bg-slate-950 px-4 py-2.5">
                <div className="flex gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-red-500/60" />
                  <span className="h-3 w-3 rounded-full bg-yellow-500/60" />
                  <span className="h-3 w-3 rounded-full bg-green-500/60" />
                </div>
                <div className="mx-4 flex-1 flex items-center gap-2 rounded-md border border-white/6 bg-white/4 px-3 py-1">
                  <ActiveIcon className="h-3 w-3 text-blue-400 flex-shrink-0" />
                  <span className="text-[11px] text-slate-500 font-mono truncate">
                    slate360.app / {activeTab}
                  </span>
                </div>
              </div>

              {/* Dynamic content */}
              <div className="h-[calc(100%-40px)]">{active.mockContent}</div>
            </div>

            {/* Feature pills row */}
            <div className="flex flex-wrap gap-2">
              {active.features.map((feat) => (
                <span
                  key={feat}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/8 bg-white/4 px-3 py-1.5 text-xs font-medium text-slate-300"
                >
                  <Check className="h-3 w-3 text-blue-400 flex-shrink-0" />
                  {feat}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ==========================================================================
   MODULAR PRICING SECTION
   Top: 4 a-la-carte app cards in a CSS grid
   Bottom: full-width Master Bundle card with cobalt glow
   ========================================================================== */

function PricingSection() {
  return (
    <section id="pricing" className="py-24 px-4 sm:px-6 bg-slate-950/50">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-14 text-center">
          <span className="mb-3 inline-block rounded-full border border-blue-500/30 bg-blue-500/10 px-3.5 py-1.5 text-xs font-semibold text-blue-400">
            Transparent Pricing
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white text-balance">
            Pay for what you need. Bundle to save.
          </h2>
          <p className="mt-4 mx-auto max-w-xl text-slate-400 text-pretty leading-relaxed">
            Subscribe to individual apps, or unlock the complete platform at a fraction of the combined cost.
          </p>
        </div>

        {/* A LA CARTE — 4-column grid */}
        <div>
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-600 text-center">
            Individual apps
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {APP_PRICING_CARDS.map((app) => {
              const AppIcon = app.icon;
              return (
                <div
                  key={app.id}
                  className="group flex flex-col rounded-2xl border border-white/8 bg-white/[0.03] p-5 ring-1 ring-slate-800 shadow-xl transition-all hover:ring-blue-500/30 hover:shadow-blue-500/5 hover:-translate-y-0.5"
                >
                  {/* Icon + name */}
                  <div className="flex items-center gap-3 mb-4">
                    <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl", app.bg)}>
                      <AppIcon className={cn("h-4.5 w-4.5", app.accent)} />
                    </span>
                    <span className="font-semibold text-sm text-white">{app.name}</span>
                  </div>

                  {/* Price */}
                  <p className={cn("text-base font-bold mb-1", app.accent)}>{app.price}</p>
                  <p className="text-xs text-slate-500 mb-4 leading-snug">{app.description}</p>

                  {/* Features */}
                  <ul className="flex-1 space-y-2 mb-5">
                    {app.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-xs text-slate-400">
                        <Check className={cn("h-3.5 w-3.5 flex-shrink-0 mt-0.5", app.accent)} />
                        {f}
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <BetaGatedButton
                    action="subscribe"
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-2 text-xs font-semibold text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                    renderEnabled={() => (
                      <Link
                        href="/signup"
                        className="block w-full rounded-xl border border-white/10 bg-white/5 py-2 text-center text-xs font-semibold text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                      >
                        Get started
                      </Link>
                    )}
                  >
                    Get started
                  </BetaGatedButton>
                </div>
              );
            })}
          </div>
        </div>

        {/* MASTER BUNDLE — full-width hero card */}
        <div className="mt-6">
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-600 text-center">
            Or go all-in
          </p>
          <div
            className="relative overflow-hidden rounded-2xl border border-blue-500/25 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-8 sm:p-10"
            style={{ boxShadow: "0 0 40px rgba(59,130,246,0.3), 0 1px 3px rgba(0,0,0,0.5)" }}
          >
            {/* Glow orb */}
            <div
              className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 h-40 w-96 rounded-full"
              style={{ background: "radial-gradient(ellipse, rgba(59,130,246,0.18) 0%, transparent 70%)" }}
            />

            <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center gap-8">
              {/* Left: title + tag + description */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20 border border-blue-500/30">
                    <Star className="h-5 w-5 text-blue-400" />
                  </span>
                  <div>
                    <span className="rounded-full bg-blue-600 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                      Best Value
                    </span>
                  </div>
                </div>

                <h3 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                  The Slate360 Master Bundle
                </h3>
                <p className="text-slate-400 leading-relaxed max-w-xl">
                  All Apps. All Features. One unified project dashboard. Get Site Walk, 360 Tours, Design Studio, and Content Studio — plus pooled storage, shared projects, and priority support.
                </p>

                {/* Feature grid */}
                <div className="mt-5 grid sm:grid-cols-2 gap-x-8 gap-y-2">
                  {[
                    "Site Walk Pro",
                    "360 Tours Pro",
                    "Design Studio Pro",
                    "Content Studio Pro",
                    "Unified project dashboard",
                    "Pooled storage across all apps",
                    "Priority support & onboarding",
                    "White-label branding",
                  ].map((f) => (
                    <div key={f} className="flex items-center gap-2 text-sm text-slate-300">
                      <Check className="h-3.5 w-3.5 flex-shrink-0 text-blue-400" />
                      {f}
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: pricing + CTA */}
              <div className="flex-shrink-0 flex flex-col items-center sm:items-end gap-4 w-full lg:w-auto">
                <div className="text-center lg:text-right">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Starting at
                  </p>
                  <p className="text-4xl font-bold text-white">
                    $99
                    <span className="text-lg font-normal text-slate-400">/mo</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-1">per seat · billed monthly</p>
                  <p className="text-xs font-semibold text-blue-400 mt-0.5">
                    Save 40% vs. individual apps
                  </p>
                </div>

                <BetaGatedButton
                  action="subscribe"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-8 py-3.5 text-sm font-semibold text-white shadow-[0_0_24px_rgba(59,130,246,0.4)] transition-all hover:bg-blue-500 hover:shadow-[0_0_32px_rgba(59,130,246,0.5)] hover:-translate-y-px"
                  renderEnabled={() => (
                    <Link
                      href="/signup"
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-8 py-3.5 text-sm font-semibold text-white shadow-[0_0_24px_rgba(59,130,246,0.4)] transition-all hover:bg-blue-500 hover:shadow-[0_0_32px_rgba(59,130,246,0.5)] hover:-translate-y-px"
                    >
                      Start Free Trial
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  )}
                >
                  Start Free Trial
                </BetaGatedButton>

                <p className="text-[11px] text-slate-600 text-center lg:text-right">
                  14-day free trial. No credit card required.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ==========================================================================
   FOOTER
   ========================================================================== */

function Footer() {
  return (
    <footer
      className="border-t border-white/8"
      style={{ backgroundColor: "#0B0F15" }}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-14">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Link href="/" className="mb-5 block">
              <SlateLogo size="md" />
            </Link>
            <p className="text-sm text-slate-500 mb-5 leading-relaxed">
              The real-time interactive bridge between the field and the office.
            </p>
            <div className="flex items-center gap-2">
              {[
                { Icon: Twitter, label: "Twitter" },
                { Icon: Linkedin, label: "LinkedIn" },
                { Icon: Github, label: "GitHub" },
              ].map(({ Icon, label }) => (
                <a
                  key={label}
                  href="#"
                  aria-label={label}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/8 text-slate-500 transition-colors hover:border-white/15 hover:text-slate-300"
                >
                  <Icon className="h-3.5 w-3.5" />
                </a>
              ))}
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-600">
              Product
            </h4>
            <ul className="space-y-2.5">
              {["Site Walk", "360 Tours", "Design Studio", "Content Studio", "Pricing"].map((label) => (
                <li key={label}>
                  <Link
                    href="#"
                    className="text-sm text-slate-500 transition-colors hover:text-slate-300"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-600">
              Company
            </h4>
            <ul className="space-y-2.5">
              {["About Us", "Blog", "Careers", "Contact"].map((label) => (
                <li key={label}>
                  <Link
                    href="#"
                    className="text-sm text-slate-500 transition-colors hover:text-slate-300"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-600">
              Legal
            </h4>
            <ul className="space-y-2.5">
              {["Terms of Service", "Privacy Policy", "Security"].map((label) => (
                <li key={label}>
                  <Link
                    href="#"
                    className="text-sm text-slate-500 transition-colors hover:text-slate-300"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-white/6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-600">
            <span className="text-blue-500">© 2026 Slate360.</span> All rights reserved.
          </p>
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <Mail className="h-3.5 w-3.5 text-blue-500" />
            support@slate360.com
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ==========================================================================
   MAIN EXPORT
   ========================================================================== */

export default function MarketingHomepage({ isLoggedIn = false }: { isLoggedIn?: boolean }) {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Header isLoggedIn={isLoggedIn} />
      <main>
        <HeroSection />
        <TrustBar />
        <AppShowcaseSection />
        <PricingSection />
      </main>
      <Footer />
    </div>
  );
}
