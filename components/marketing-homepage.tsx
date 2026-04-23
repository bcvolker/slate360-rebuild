"use client";

/**
 * ==========================================================================
 * SLATE360 MARKETING HOMEPAGE — INTERACTIVE + MODULAR PRICING
 * ==========================================================================
 *
 * Design System:
 *   • Header: Dark #0B0F15, isolated (not affected by app's dark mode)
 *   • Section Backgrounds: Alternate white / slate-50 for depth
 *   • Text: High-contrast text-slate-900 (headings), text-slate-600 (body)
 *   • Cards: Crisp ring-1 ring-slate-200/60 shadow-xl rounded-2xl
 *   • Primary Accent: Cobalt Blue (#2563eb)
 *   • Interactive: React useState app showcases with dynamic mockups
 *   • Pricing: Modular (4 individual apps + Master Bundle)
 *
 * ==========================================================================
 */

import { useState } from "react";
import Link from "next/link";
import {
  Menu,
  X,
  Building2,
  MapPin,
  Palette,
  Check,
  ChevronRight,
  Zap,
  Mail,
  Twitter,
  Linkedin,
  ArrowRight,
  Sparkles,
  Code2,
  FileText,
  Camera,
  Mic,
  Video,
} from "lucide-react";
import { SlateLogo } from "@/components/shared/SlateLogo";

/* ==========================================================================
   TYPES & DATA
   ========================================================================== */

type AppKey = "sitewalk" | "tours360" | "design" | "content";

interface AppConfig {
  key: AppKey;
  label: string;
  shortLabel: string;
  icon: React.ElementType;
  tagline: string;
  description: string;
  features: string[];
  startingPrice: number;
}

interface IndividualApp {
  key: AppKey;
  name: string;
  icon: React.ElementType;
  tiers: { name: string; price: string }[];
}

interface PricingCard {
  name: string;
  description: string;
  startingPrice: number;
}

const APPS: AppConfig[] = [
  {
    key: "sitewalk",
    label: "Site Walk",
    shortLabel: "Site Walk",
    icon: MapPin,
    tagline: "Capture construction progress in real-time.",
    description:
      "Document every detail as you walk the site. AI transcription turns voice notes into structured reports instantly. Share branded client links in seconds.",
    features: [
      "Real-time photo + GPS capture",
      "AI voice-to-text transcription",
      "Auto-generated punch lists",
      "Branded PDF exports",
      "Client portal sharing",
    ],
    startingPrice: 29,
  },
  {
    key: "tours360",
    label: "360 Tours",
    shortLabel: "360 Tours",
    icon: Building2,
    tagline: "Immersive project walkthroughs.",
    description:
      "Create interactive 360° panorama tours with hotspots and annotations. Stakeholders explore remotely with full spatial context—no VR headset required.",
    features: [
      "Drag-to-explore panorama viewer",
      "Interactive hotspots & callouts",
      "Shareable client links",
      "Analytics & view tracking",
      "Multi-floor navigation",
    ],
    startingPrice: 19,
  },
  {
    key: "design",
    label: "Design Studio",
    shortLabel: "Design Studio",
    icon: Palette,
    tagline: "2D plans + 3D models in one workspace.",
    description:
      "Review blueprints, present 3D models, and collaborate on design decisions—all in a unified interface built for construction teams.",
    features: [
      "GLB / glTF model support",
      "Plan markup & annotation",
      "3D model viewer with layers",
      "Client-shareable links",
      "Version control",
    ],
    startingPrice: 39,
  },
  {
    key: "content",
    label: "Content Studio",
    shortLabel: "Content Studio",
    icon: FileText,
    tagline: "Document everything. Auto-organize. Instant export.",
    description:
      "Organize project photos, specs, and RFIs in one searchable library. AI auto-tags and structures everything for effortless retrieval.",
    features: [
      "AI-powered photo organization",
      "Auto-tagging & categorization",
      "Full-text search",
      "Bulk export to PDF",
      "Team collaboration",
    ],
    startingPrice: 24,
  },
];

const INDIVIDUAL_APPS: IndividualApp[] = [
  {
    key: "sitewalk",
    name: "Site Walk",
    icon: MapPin,
    tiers: [
      { name: "Lite", price: "$29/mo" },
      { name: "Pro", price: "$49/mo" },
    ],
  },
  {
    key: "tours360",
    name: "360 Tours",
    icon: Building2,
    tiers: [
      { name: "Lite", price: "$19/mo" },
      { name: "Pro", price: "$39/mo" },
    ],
  },
  {
    key: "design",
    name: "Design Studio",
    icon: Palette,
    tiers: [
      { name: "Lite", price: "$39/mo" },
      { name: "Pro", price: "$79/mo" },
    ],
  },
  {
    key: "content",
    name: "Content Studio",
    icon: FileText,
    tiers: [
      { name: "Lite", price: "$24/mo" },
      { name: "Pro", price: "$44/mo" },
    ],
  },
];

/* ==========================================================================
   HEADER / NAVBAR
   ========================================================================== */

function Header({ isLoggedIn = false }: { isLoggedIn?: boolean }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#0b0f15] border-b border-white/10">
      <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center shrink-0">
          <SlateLogo size="md" />
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8" aria-label="Main navigation">
          {[
            { label: "Product", href: "#apps" },
            { label: "Pricing", href: "#pricing" },
            { label: "Docs", href: "#" },
          ].map(({ label, href }) => (
            <a
              key={href}
              href={href}
              className="text-sm font-medium text-slate-400 hover:text-white transition-colors duration-200"
            >
              {label}
            </a>
          ))}
        </nav>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-3">
          {isLoggedIn ? (
            <>
              <a
                href="/dashboard"
                className="text-sm font-medium text-slate-400 hover:text-white transition-colors"
              >
                Dashboard
              </a>
              <a
                href="/logout"
                className="inline-flex items-center justify-center rounded-lg bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-sm font-semibold px-4 py-2 transition-colors"
              >
                Log Out
              </a>
            </>
          ) : (
            <a
              href="/login"
              className="inline-flex items-center justify-center rounded-lg bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-sm font-semibold px-4 py-2 transition-colors"
            >
              Log In
            </a>
          )}
        </div>

        {/* Mobile menu toggle */}
        <button
          className="md:hidden text-slate-400 hover:text-white"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-white/10 bg-[#0b0f15] px-6 py-4 space-y-3">
          {[
            { label: "Product", href: "#apps" },
            { label: "Pricing", href: "#pricing" },
            { label: "Docs", href: "#" },
          ].map(({ label, href }) => (
            <a
              key={href}
              href={href}
              className="block text-sm font-medium text-slate-400 hover:text-white transition-colors"
              onClick={() => setMobileOpen(false)}
            >
              {label}
            </a>
          ))}
          <a
            href={isLoggedIn ? "/dashboard" : "/login"}
            className="block w-full mt-3 text-center rounded-lg bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-sm font-semibold py-2 transition-colors"
            onClick={() => setMobileOpen(false)}
          >
            {isLoggedIn ? "Dashboard" : "Log In"}
          </a>
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
    <section className="bg-slate-50 pt-32 pb-20 px-6">
      <div className="mx-auto max-w-3xl text-center">
        {/* Eyebrow */}
        <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-1.5 border border-blue-200 text-blue-700 text-xs font-bold uppercase tracking-wider mb-6">
          <Zap className="h-3.5 w-3.5" aria-hidden="true" />
          Now in Beta — Special Founding Pricing
        </div>

        {/* Main Headline */}
        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-slate-900 leading-tight mb-6">
          The Ultimate App Ecosystem for Construction.
        </h1>

        {/* Subheadline */}
        <p className="text-lg sm:text-xl text-slate-600 leading-relaxed max-w-2xl mx-auto mb-10 text-pretty">
          Don&apos;t buy bloated software. Choose the specific tools you need, or unlock the entire Slate360 platform.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="/signup"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-base font-semibold px-8 py-3.5 shadow-lg shadow-blue-500/20 transition-all duration-300 hover:-translate-y-1"
          >
            Start Free Trial
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </a>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-base font-semibold px-8 py-3.5 transition-all duration-300 hover:-translate-y-1"
          >
            <Video className="h-4 w-4 text-[#2563eb]" aria-hidden="true" />
            Watch Demo
          </button>
        </div>

        <p className="mt-4 text-sm text-slate-500">
          14-day free trial. No credit card required.
        </p>
      </div>
    </section>
  );
}

/* ==========================================================================
   INTERACTIVE APP SHOWCASE — BENTO BOX WITH DYNAMIC MOCKUPS
   ========================================================================== */

/** Mock UI: Site Walk phone frame */
function SiteWalkMockup() {
  return (
    <div className="flex items-center justify-center h-full p-6">
      <div className="w-48 relative">
        {/* Phone body */}
        <div className="bg-slate-900 rounded-[2rem] p-[10px] shadow-2xl ring-1 ring-slate-800">
          <div className="rounded-[1.5rem] bg-white overflow-hidden">
            {/* Status bar */}
            <div className="bg-slate-900 h-6 flex items-center justify-between px-5 text-xs font-semibold text-white">
              <span>9:41</span>
              <div className="flex gap-1">
                <div className="h-1 w-2.5 bg-white/70 rounded-sm" />
              </div>
            </div>

            {/* Photo section */}
            <div className="relative h-40 bg-slate-700 overflow-hidden">
              <div
                className="absolute inset-0 bg-gradient-to-b from-blue-900/40 to-slate-900/60"
                aria-hidden="true"
              />
              <button className="absolute bottom-2 right-2 bg-[#2563eb] rounded-full p-2 shadow-lg">
                <Camera className="h-3.5 w-3.5 text-white" aria-hidden="true" />
              </button>
            </div>

            {/* Transcription area */}
            <div className="p-3 space-y-2">
              <div className="flex items-center gap-1.5">
                <div className="h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center">
                  <Mic className="h-2.5 w-2.5 text-[#2563eb]" aria-hidden="true" />
                </div>
                <span className="text-xs font-semibold text-slate-900">✨ Format with AI</span>
                <span className="ml-auto text-xs text-green-600 font-semibold">• Live</span>
              </div>
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-2">
                <p className="text-xs text-slate-700 leading-snug">
                  "Waterproofing incomplete on south wall. Needs re-inspection before drywall."
                </p>
              </div>
              <ul className="space-y-1 text-xs text-slate-600">
                <li className="flex items-center gap-1.5">
                  <Check className="h-3 w-3 text-green-600" aria-hidden="true" /> Add to punch list
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="h-3 w-3 text-green-600" aria-hidden="true" /> Export PDF
                </li>
              </ul>
            </div>
          </div>
        </div>
        {/* Notch */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-20 h-4 bg-slate-900 rounded-b-2xl" aria-hidden="true" />
      </div>
    </div>
  );
}

/** Mock UI: 360 Tours browser */
function ToursMockup() {
  return (
    <div className="flex items-center justify-center h-full p-6">
      <div className="w-full max-w-xs rounded-2xl border border-slate-300 shadow-xl overflow-hidden bg-white">
        {/* Browser chrome */}
        <div className="bg-slate-100 border-b border-slate-300 px-4 py-2.5 flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
            <div className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
            <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
          </div>
          <div className="flex-1 bg-white rounded px-2 py-1 text-xs text-slate-500 border border-slate-300 truncate">
            slate360.io/tours/project-2024
          </div>
        </div>

        {/* Panorama viewer */}
        <div className="relative h-48 bg-gradient-to-br from-slate-600 via-slate-500 to-slate-700 overflow-hidden">
          <svg className="absolute inset-0 w-full h-full opacity-30" viewBox="0 0 400 240" aria-hidden="true">
            <rect x="30" y="40" width="180" height="100" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
            <circle cx="100" cy="80" r="8" fill="rgba(255,255,255,0.2)" />
            <circle cx="150" cy="100" r="10" fill="rgba(255,255,255,0.15)" />
          </svg>

          {/* Hotspot */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative">
              <div
                className="h-6 w-6 rounded-full bg-[#2563eb] border-2 border-white shadow-lg flex items-center justify-center animate-pulse"
                aria-hidden="true"
              >
                <div className="h-1.5 w-1.5 rounded-full bg-white" />
              </div>
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] font-semibold px-2 py-1 rounded whitespace-nowrap">
                Lobby
              </div>
            </div>
          </div>

          <p className="absolute bottom-2 left-2 text-white/60 text-xs" aria-hidden="true">
            ← Drag to explore →
          </p>
        </div>

        {/* Stop list */}
        <div className="p-3 space-y-1.5 bg-slate-50">
          {["Lobby (Active)", "Level 2", "Rooftop"].map((label, i) => (
            <div
              key={label}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                i === 0
                  ? "bg-blue-100 border border-blue-300 text-[#2563eb]"
                  : "text-slate-600 hover:bg-white"
              }`}
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Mock UI: Design Studio */
function DesignMockup() {
  return (
    <div className="flex items-center justify-center h-full p-6">
      <div className="w-full max-w-xs rounded-2xl border border-slate-300 shadow-xl overflow-hidden bg-white">
        {/* Top bar */}
        <div className="bg-slate-900 px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Palette className="h-3.5 w-3.5 text-blue-400" aria-hidden="true" />
            <span className="text-white text-xs font-bold">Design Studio</span>
          </div>
          <div className="flex gap-1 bg-slate-700 rounded p-1">
            <button className="px-2 py-1 text-xs text-slate-300 font-medium">2D</button>
            <button className="px-2 py-1 text-xs text-white font-medium bg-[#2563eb] rounded">
              3D
            </button>
          </div>
        </div>

        {/* Blueprint canvas */}
        <div className="relative h-48 bg-slate-50 overflow-hidden p-6">
          <svg viewBox="0 0 300 160" className="w-full h-full" aria-hidden="true">
            {/* Grid */}
            <defs>
              <pattern
                id="grid"
                width="20"
                height="20"
                patternUnits="userSpaceOnUse"
              >
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(59,130,246,0.1)" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="300" height="160" fill="url(#grid)" />

            {/* Room outlines */}
            <rect x="20" y="20" width="130" height="80" fill="none" stroke="#2563eb" strokeWidth="1.5" opacity="0.7" />
            <rect x="25" y="25" width="55" height="35" fill="rgba(37,99,235,0.08)" stroke="#2563eb" strokeWidth="1" />
            <rect x="85" y="25" width="55" height="35" fill="rgba(37,99,235,0.05)" stroke="#2563eb" strokeWidth="1" />

            {/* Dimension line */}
            <line x1="20" y1="110" x2="150" y2="110" stroke="rgba(100,116,139,0.5)" strokeWidth="0.8" />
            <line x1="20" y1="106" x2="20" y2="114" stroke="rgba(100,116,139,0.5)" strokeWidth="0.8" />
            <line x1="150" y1="106" x2="150" y2="114" stroke="rgba(100,116,139,0.5)" strokeWidth="0.8" />
            <text x="85" y="130" fontSize="8" fill="#64748b" textAnchor="middle">
              24&apos;-0&quot;
            </text>
          </svg>
        </div>

        {/* Toolbar */}
        <div className="border-t border-slate-200 px-3 py-2 flex gap-1.5 bg-white">
          {["Annotate", "Measure", "3D View", "Share"].map((tool, i) => (
            <button
              key={tool}
              className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors ${
                i === 2
                  ? "bg-[#2563eb] text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {tool}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Mock UI: Content Studio */
function ContentMockup() {
  return (
    <div className="flex items-center justify-center h-full p-6">
      <div className="w-full max-w-xs rounded-2xl border border-slate-300 shadow-xl overflow-hidden bg-white">
        {/* Header */}
        <div className="bg-slate-900 px-4 py-3 flex items-center gap-2">
          <FileText className="h-4 w-4 text-blue-400" aria-hidden="true" />
          <span className="text-white text-xs font-bold flex-1">Content Library</span>
          <button className="text-slate-400 hover:text-white text-xs">⋮</button>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-slate-200 bg-slate-50">
          <input
            type="text"
            placeholder="Search photos..."
            className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs text-slate-900 placeholder-slate-400"
            disabled
          />
        </div>

        {/* Grid of photos */}
        <div className="p-3 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="aspect-square rounded-lg bg-gradient-to-br from-slate-300 to-slate-500 border border-slate-400"
                aria-label={`Photo ${i}`}
              />
            ))}
          </div>
          <div className="text-xs text-slate-600 text-center">
            Showing 6 of 247 photos
          </div>
        </div>

        {/* Tags */}
        <div className="px-3 py-2 border-t border-slate-200 bg-slate-50 flex gap-1 flex-wrap text-xs">
          {["Exterior", "Framing", "MEP"].map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-blue-100 text-[#2563eb] font-semibold px-2 py-1"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Interactive Bento Box App Showcase */
function AppShowcaseSection() {
  const [activeApp, setActiveApp] = useState<AppKey>("sitewalk");
  const config = APPS.find((a) => a.key === activeApp)!;

  return (
    <section id="apps" className="bg-white py-28 px-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-xs font-bold uppercase tracking-widest text-[#2563eb] mb-3">
            The App Suite
          </p>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-slate-900 mb-4">
            Every tool your team needs.
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto text-pretty">
            Slate360 is a connected platform. All apps share one project dashboard, one unified client portal.
          </p>
        </div>

        {/* Bento card */}
        <div className="rounded-2xl ring-1 ring-slate-200/60 shadow-xl overflow-hidden bg-white grid lg:grid-cols-[280px_1fr]">
          {/* Left menu */}
          <div className="border-b lg:border-b-0 lg:border-r border-slate-200 bg-slate-50/60 flex flex-col">
            <nav className="p-3 space-y-1 flex-1" aria-label="App selector">
              {APPS.map((app) => {
                const isActive = app.key === activeApp;
                return (
                  <button
                    key={app.key}
                    type="button"
                    onClick={() => setActiveApp(app.key)}
                    className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative border ${
                      isActive
                        ? "bg-white border-slate-200 shadow-sm"
                        : "border-transparent hover:bg-white/50"
                    }`}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-0.5 rounded-r bg-[#2563eb]" aria-hidden="true" />
                    )}
                    <div
                      className={`h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                        isActive
                          ? "bg-[#2563eb] text-white"
                          : "bg-slate-200 text-slate-600 group-hover:bg-slate-300"
                      }`}
                    >
                      <app.icon className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <p className={`text-sm font-semibold ${isActive ? "text-slate-900" : "text-slate-700"}`}>
                        {app.label}
                      </p>
                      <p className="text-xs text-slate-500 truncate">{app.tagline}</p>
                    </div>
                    {isActive && (
                      <ChevronRight className="ml-auto h-4 w-4 text-[#2563eb] flex-shrink-0" aria-hidden="true" />
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Promo card */}
            <div className="m-3 rounded-xl bg-[#2563eb] p-4 text-white">
              <p className="text-xs font-bold mb-1">All apps. One platform.</p>
              <p className="text-xs text-blue-100 leading-relaxed mb-3">
                Start your 14-day free trial and explore everything.
              </p>
              <a
                href="/signup"
                className="inline-flex items-center gap-1 text-xs font-bold text-white hover:text-blue-100 transition-colors"
              >
                Get started <ArrowRight className="h-3 w-3" aria-hidden="true" />
              </a>
            </div>
          </div>

          {/* Right: showcase */}
          <div className="grid lg:grid-cols-2">
            {/* Mockup */}
            <div className="bg-slate-50 border-b lg:border-b-0 lg:border-r border-slate-200 min-h-[400px] flex items-center justify-center">
              {activeApp === "sitewalk" && <SiteWalkMockup />}
              {activeApp === "tours360" && <ToursMockup />}
              {activeApp === "design" && <DesignMockup />}
              {activeApp === "content" && <ContentMockup />}
            </div>

            {/* Copy pane */}
            <div className="p-8 lg:p-10 flex flex-col justify-center">
              <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 border border-blue-200 text-[#2563eb] text-xs font-bold uppercase tracking-wider mb-5 self-start">
                <config.icon className="h-3.5 w-3.5" aria-hidden="true" />
                {config.shortLabel}
              </div>

              <h3 className="text-2xl font-bold text-slate-900 mb-3">
                {config.tagline}
              </h3>

              <p className="text-slate-600 text-sm leading-relaxed mb-6 text-pretty">
                {config.description}
              </p>

              <ul className="space-y-2.5 mb-8">
                {config.features.map((feat) => (
                  <li key={feat} className="flex items-start gap-2.5 text-sm text-slate-600">
                    <div className="mt-0.5 h-4 w-4 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center flex-shrink-0">
                      <Check className="h-2.5 w-2.5 text-[#2563eb]" aria-hidden="true" />
                    </div>
                    {feat}
                  </li>
                ))}
              </ul>

              <a
                href="/signup"
                className="self-start inline-flex items-center gap-2 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-sm font-semibold px-5 py-2.5 shadow-lg shadow-blue-500/20 transition-all duration-300 hover:-translate-y-1"
              >
                Start Free Trial
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ==========================================================================
   MODULAR PRICING — A LA CARTE + MASTER BUNDLE
   ========================================================================== */

function PricingSection() {
  return (
    <section id="pricing" className="bg-slate-50 py-28 px-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-xs font-bold uppercase tracking-widest text-[#2563eb] mb-3">
            Pricing
          </p>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-slate-900 mb-4">
            Only pay for what you use.
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto text-pretty">
            Mix and match individual apps, or go all-in with the Master Bundle and save 30%.
          </p>
        </div>

        {/* Individual apps grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {INDIVIDUAL_APPS.map((app) => (
            <article
              key={app.key}
              className="rounded-2xl ring-1 ring-slate-200/60 shadow-lg bg-white p-6 hover:shadow-xl transition-shadow duration-300"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center">
                  <app.icon className="h-5 w-5 text-[#2563eb]" aria-hidden="true" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">{app.name}</h3>
              </div>

              <div className="space-y-3 mb-5">
                {app.tiers.map((tier) => (
                  <div key={tier.name} className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-600">{tier.name}</span>
                    <span className="text-sm font-bold text-slate-900">{tier.price}</span>
                  </div>
                ))}
              </div>

              <a
                href="/signup"
                className="w-full block text-center rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-900 text-xs font-semibold py-2 transition-colors"
              >
                Learn More
              </a>
            </article>
          ))}
        </div>

        {/* Master Bundle — full width with glow */}
        <article
          className="relative rounded-2xl ring-1 ring-slate-200/60 shadow-[0_0_40px_rgba(59,130,246,0.3)] bg-white overflow-hidden"
        >
          {/* Accent bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#2563eb]" aria-hidden="true" />

          <div className="p-8 lg:p-12">
            <div className="grid lg:grid-cols-[1fr_auto] gap-8 items-start">
              {/* Left content */}
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 border border-blue-200 text-[#2563eb] text-xs font-bold uppercase tracking-wider mb-6">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                  Recommended
                </div>

                <h3 className="text-3xl font-bold text-slate-900 mb-3">
                  The Slate360 Master Bundle
                </h3>

                <p className="text-lg text-slate-600 mb-8 text-pretty">
                  All apps. All features. One unified project dashboard. Full team collaboration, unlimited storage, and priority support.
                </p>

                <div className="grid gap-6 sm:grid-cols-2 mb-8">
                  {[
                    "All 4 apps included",
                    "Unlimited storage",
                    "Team collaboration",
                    "Advanced analytics",
                    "White-label branding",
                    "Priority support",
                  ].map((feature) => (
                    <div key={feature} className="flex items-start gap-2.5">
                      <div className="mt-0.5 h-4 w-4 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center flex-shrink-0">
                        <Check className="h-2.5 w-2.5 text-[#2563eb]" aria-hidden="true" />
                      </div>
                      <span className="text-sm font-medium text-slate-700">{feature}</span>
                    </div>
                  ))}
                </div>

                <a
                  href="/signup"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-base font-semibold px-8 py-3 shadow-lg shadow-blue-500/20 transition-all duration-300 hover:-translate-y-1"
                >
                  Start Free Trial
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </a>
              </div>

              {/* Right: pricing */}
              <div className="lg:text-right">
                <p className="text-5xl font-bold text-slate-900 mb-2">$199</p>
                <p className="text-slate-600 text-sm mb-8">per month · Save 30% annually</p>

                <div className="rounded-xl bg-blue-50 border border-blue-200 p-4">
                  <p className="text-xs font-bold text-[#2563eb] uppercase tracking-wide">Early Adopter Bonus</p>
                  <p className="text-sm text-slate-700 mt-1">
                    Lock in pricing at <strong>$99/month</strong> for the first year.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </article>

        {/* Footer note */}
        <p className="text-center text-sm text-slate-600 mt-8">
          All plans include a 14-day free trial. Cancel anytime. All prices in USD, billed monthly.
        </p>
      </div>
    </section>
  );
}

/* ==========================================================================
   FOOTER
   ========================================================================== */

function Footer() {
  return (
    <footer className="bg-[#0b0f15] border-t border-white/10 py-16 px-6">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-[1fr_auto_auto_auto] mb-12">
          {/* Brand */}
          <div>
            <SlateLogo size="md" className="mb-4" />
            <p className="text-sm text-slate-400 max-w-xs text-pretty mb-6">
              The all-in-one platform for construction site documentation and collaboration.
            </p>
            <div className="flex gap-3">
              {[
                { Icon: Twitter, label: "Twitter" },
                { Icon: Linkedin, label: "LinkedIn" },
                { Icon: Mail, label: "Email" },
              ].map(({ Icon, label }) => (
                <a
                  key={label}
                  href="#"
                  aria-label={label}
                  className="h-8 w-8 rounded-lg border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:border-white/25 transition-all duration-200"
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          {[
            { heading: "Product", links: ["Site Walk", "360 Tours", "Design Studio", "Pricing"] },
            { heading: "Company", links: ["About", "Blog", "Careers", "Contact"] },
            { heading: "Legal", links: ["Privacy", "Terms", "Security"] },
          ].map(({ heading, links }) => (
            <div key={heading}>
              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">
                {heading}
              </h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-sm text-slate-400 hover:text-white transition-colors duration-200"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} Slate360. All rights reserved.
          </p>
          <a
            href="mailto:hello@slate360.io"
            className="text-sm text-slate-400 hover:text-white transition-colors duration-200"
          >
            hello@slate360.io
          </a>
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
    <div className="min-h-screen bg-white overflow-x-hidden">
      <Header isLoggedIn={isLoggedIn} />
      <main>
        <HeroSection />
        <AppShowcaseSection />
        <PricingSection />
      </main>
      <Footer />
    </div>
  );
}
