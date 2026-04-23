"use client";

/**
 * ==========================================================================
 * SLATE360 MARKETING HOMEPAGE — PREMIUM LIGHT REDESIGN
 * ==========================================================================
 *
 * Design:
 *   • Isolated LIGHT theme — explicit utility classes only, never CSS vars
 *     that are overridden by the app's html.dark class.
 *   • Navbar: permanently dark (#0b0f15) per spec.
 *   • Primary accent: Cobalt Blue (#2563eb / #1d4ed8 hover).
 *   • Body surfaces: white / slate-50.
 *   • Typography: Geist (project font) with tracking-tight headlines.
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
  Palette,
  Check,
  ChevronRight,
  FolderSync,
  Shield,
  Zap,
  Globe,
  Mail,
  Twitter,
  Linkedin,
  ArrowRight,
  Mic,
  Camera,
  BarChart2,
} from "lucide-react";
import { SlateLogo } from "@/components/shared/SlateLogo";

/* ==========================================================================
   TYPES & DATA
   ========================================================================== */

type AppKey = "sitewalk" | "tours360" | "design";

interface App {
  key: AppKey;
  label: string;
  icon: React.ElementType;
  tagline: string;
  description: string;
  bullets: string[];
}

interface PricingPlan {
  name: string;
  desc: string;
  monthlyPrice: number | "Custom";
  annualPrice: number | "Custom";
  features: string[];
  highlight?: boolean;
  cta: string;
  badge?: string;
}

const MARKETING_NAV = [
  { label: "Product", href: "#product" },
  { label: "Apps", href: "#apps" },
  { label: "Pricing", href: "#pricing" },
];

const TRUST_LABELS = [
  "General Contractors",
  "Architecture Firms",
  "Real Estate Developers",
  "Property Managers",
  "Construction Tech Teams",
];

const APPS: App[] = [
  {
    key: "sitewalk",
    label: "Site Walk",
    icon: MapPin,
    tagline: "Field documentation, redefined.",
    description:
      "Capture site conditions in real time. Document observations as you walk, add AI-generated transcriptions, and turn field notes into branded reports in minutes.",
    bullets: [
      "Real-time geo-tagged photo capture",
      "AI voice-to-text transcription",
      "Auto-generated punch lists",
      "Branded PDF export in one tap",
    ],
  },
  {
    key: "tours360",
    label: "360 Tours",
    icon: Building2,
    tagline: "Immersive walkthroughs, anywhere.",
    description:
      "Create interactive 360° site tours with hotspots and branded share links. Let stakeholders explore remotely with full spatial context.",
    bullets: [
      "Drag-and-drop tour creation",
      "Interactive hotspots & annotations",
      "Shareable client portal link",
      "Analytics & view tracking",
    ],
  },
  {
    key: "design",
    label: "Design Studio",
    icon: Palette,
    tagline: "2D & 3D in one workspace.",
    description:
      "Review plans, present 3D models, and work through design decisions in a connected workspace built for construction professionals.",
    bullets: [
      "GLB / glTF model support",
      "Markup & annotation tools",
      "Client-shareable model links",
      "Version history tracking",
    ],
  },
];

const PLANS: PricingPlan[] = [
  {
    name: "Field",
    desc: "Site Walk only — perfect for solo field professionals.",
    monthlyPrice: 29,
    annualPrice: 24,
    features: [
      "Site Walk Pro (unlimited walks)",
      "5 GB secure storage",
      "250 AI credits / month",
      "PDF export & SlateDrop sharing",
      "1 user seat",
      "Email support",
    ],
    cta: "Start Free Trial",
  },
  {
    name: "Pro",
    desc: "Full project suite for growing teams.",
    monthlyPrice: 79,
    annualPrice: 66,
    features: [
      "Everything in Field",
      "360 Tour Builder (unlimited tours)",
      "Design Studio access",
      "25 GB pooled storage",
      "1,000 AI credits / month",
      "Client portal & white-label branding",
      "Priority support",
    ],
    highlight: true,
    badge: "Most Popular",
    cta: "Start Free Trial",
  },
  {
    name: "Master Bundle",
    desc: "Enterprise-grade for large construction organizations.",
    monthlyPrice: "Custom",
    annualPrice: "Custom",
    features: [
      "All Pro features",
      "Custom seat count",
      "Unlimited storage",
      "SSO & advanced security",
      "Dedicated success manager",
      "Full white-label branding",
      "SLA guarantee",
    ],
    cta: "Contact Sales",
  },
];

/* ==========================================================================
   NAVBAR  —  Permanently dark per spec (#0b0f15)
   ========================================================================== */

function Navbar({ isLoggedIn = false }: { isLoggedIn?: boolean }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#0b0f15] border-b border-white/[0.07]">
      <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center" aria-label="Slate360 home">
          <SlateLogo size="md" />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8" aria-label="Main navigation">
          {MARKETING_NAV.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-[#8a95a3] hover:text-white transition-colors duration-200"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-3">
          {isLoggedIn ? (
            <>
              <Link
                href="/dashboard"
                className="text-sm font-medium text-[#8a95a3] hover:text-white transition-colors duration-200"
              >
                Dashboard
              </Link>
              <Link
                href="/auth/logout"
                className="inline-flex items-center justify-center rounded-lg bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-sm font-semibold px-4 py-2 transition-all duration-300 ease-out"
              >
                Log Out
              </Link>
            </>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-lg bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-sm font-semibold px-4 py-2 transition-all duration-300 ease-out"
            >
              Log In
            </Link>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden text-[#8a95a3] hover:text-white p-2 transition-colors"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle navigation menu"
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <nav
          className="md:hidden border-t border-white/[0.07] bg-[#0b0f15] px-6 py-4 flex flex-col gap-1"
          aria-label="Mobile navigation"
        >
          {MARKETING_NAV.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="text-sm font-medium text-[#8a95a3] hover:text-white py-2.5 transition-colors"
            >
              {link.label}
            </Link>
          ))}
          <div className="border-t border-white/[0.07] pt-3 mt-2">
            <Link
              href={isLoggedIn ? "/dashboard" : "/login"}
              className="inline-flex items-center justify-center w-full rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-sm font-semibold py-3 transition-all duration-300"
              onClick={() => setMobileOpen(false)}
            >
              {isLoggedIn ? "Go to Dashboard" : "Log In"}
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}

/* ==========================================================================
   HERO SECTION  —  Light white background, centered layout
   ========================================================================== */

function HeroSection() {
  return (
    <section className="bg-white pt-36 pb-28 px-6" id="product">
      <div className="mx-auto max-w-3xl text-center">
        {/* Eyebrow badge */}
        <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-sm font-medium px-4 py-1.5 mb-8">
          <Zap className="h-3.5 w-3.5" aria-hidden="true" />
          Now in Beta — Foundational Member Pricing
        </div>

        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-slate-900 text-balance leading-[1.08] mb-6">
          Build with absolute clarity.
        </h1>

        <p className="text-lg sm:text-xl text-slate-500 leading-relaxed text-pretty max-w-2xl mx-auto mb-10">
          The all-in-one platform for site walks, 360 tours, and project coordination. Purpose-built for construction teams who demand precision.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/signup"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-base font-semibold px-8 py-3.5 transition-all duration-300 ease-out shadow-sm shadow-blue-200 hover:shadow-md hover:shadow-blue-200 hover:-translate-y-0.5"
          >
            Start Free Trial
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-base font-semibold px-8 py-3.5 transition-all duration-300 ease-out hover:-translate-y-0.5"
          >
            <Play className="h-4 w-4 text-[#2563eb]" aria-hidden="true" />
            Watch Demo
          </button>
        </div>

        <p className="mt-5 text-sm text-slate-400">
          Free 14-day trial. No credit card required during beta.
        </p>
      </div>

      {/* Trust bar */}
      <div className="mx-auto max-w-4xl mt-20 text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-5">
          Trusted by teams across
        </p>
        <div className="flex flex-wrap justify-center gap-x-8 gap-y-3">
          {TRUST_LABELS.map((label) => (
            <span key={label} className="flex items-center gap-2 text-sm font-medium text-slate-400">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-400" aria-hidden="true" />
              {label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ==========================================================================
   FEATURE STRIP
   ========================================================================== */

function FeatureStrip() {
  const features = [
    {
      Icon: Zap,
      title: "Real-Time Capture",
      desc: "Document as you walk. No backlogs, no missed details.",
    },
    {
      Icon: Shield,
      title: "Downgrade Law™",
      desc: "Client links always work, forever. Guaranteed.",
    },
    {
      Icon: FolderSync,
      title: "One Data Layer",
      desc: "Every app shares the same project context automatically.",
    },
    {
      Icon: BarChart2,
      title: "White-Label Portals",
      desc: "Client deliverables under your brand, not ours.",
    },
  ];

  return (
    <section className="bg-white border-y border-slate-100 py-16 px-6">
      <div className="mx-auto max-w-7xl grid sm:grid-cols-2 lg:grid-cols-4 gap-10">
        {features.map(({ Icon, title, desc }) => (
          <div key={title} className="flex flex-col gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
              <Icon className="h-5 w-5 text-[#2563eb]" aria-hidden="true" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">{title}</h3>
            <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ==========================================================================
   APP SHOWCASE  —  Interactive Bento Grid with mock UIs
   ========================================================================== */

/** Site Walk: phone frame + construction photo + AI transcription box */
function SiteWalkMockup() {
  return (
    <div className="flex items-center justify-center h-full py-8 px-6">
      <div className="relative mx-auto w-48">
        {/* Phone chassis */}
        <div className="relative bg-slate-900 rounded-[2rem] p-[10px] shadow-2xl shadow-slate-300/50 ring-1 ring-slate-800">
          {/* Screen contents */}
          <div className="rounded-[1.5rem] bg-slate-100 overflow-hidden">
            {/* Status bar */}
            <div className="bg-slate-900 h-7 flex items-center justify-between px-5 pt-1">
              <span className="text-white text-[9px] font-semibold">9:41</span>
              <div className="flex gap-1">
                <div className="h-1.5 w-3 rounded-sm bg-white/70" aria-hidden="true" />
              </div>
            </div>

            {/* Construction photo */}
            <div className="relative bg-slate-700 h-36 overflow-hidden">
              <img
                src="/uploads/pletchers.jpg"
                alt="Construction site — Site Walk capture"
                className="w-full h-full object-cover opacity-80"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent" aria-hidden="true" />
              <button
                aria-label="Capture photo"
                className="absolute bottom-2 right-2 bg-[#2563eb] rounded-full p-2 shadow-md"
              >
                <Camera className="h-3 w-3 text-white" aria-hidden="true" />
              </button>
              <div className="absolute top-2 left-2 bg-black/50 backdrop-blur-sm rounded-full flex items-center gap-1 px-2 py-0.5" aria-label="Location: Building 3 Level 2">
                <MapPin className="h-2.5 w-2.5 text-blue-400" aria-hidden="true" />
                <span className="text-white text-[8px] font-medium">Building 3 — Level 2</span>
              </div>
            </div>

            {/* AI transcription panel */}
            <div className="p-3 bg-white">
              <div className="flex items-center gap-1.5 mb-2">
                <div className="h-5 w-5 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center">
                  <Mic className="h-2.5 w-2.5 text-[#2563eb]" aria-hidden="true" />
                </div>
                <span className="text-[9px] font-bold text-slate-700">AI Transcription</span>
                <span className="ml-auto text-[8px] text-green-500 font-bold">• Live</span>
              </div>
              <div className="rounded-lg bg-slate-50 border border-slate-100 p-2 mb-2">
                <p className="text-[8px] text-slate-600 leading-relaxed">
                  &ldquo;Waterproofing on south wall incomplete. Flagged for re-inspection before drywall install.&rdquo;
                </p>
              </div>
              <div className="flex gap-1.5">
                <div className="flex-1 rounded-lg bg-slate-50 border border-slate-200 py-1.5 text-center">
                  <p className="text-[7px] text-slate-600 font-semibold">Export PDF</p>
                </div>
                <div className="flex-1 rounded-lg bg-[#2563eb] py-1.5 text-center">
                  <p className="text-[7px] text-white font-semibold">Add to Punch</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Dynamic island notch */}
        <div
          className="absolute top-[14px] left-1/2 -translate-x-1/2 h-4 w-20 bg-slate-900 rounded-b-xl z-10"
          aria-hidden="true"
        />
      </div>
    </div>
  );
}

/** 360 Tours: browser chrome + panorama viewer + stop list */
function ToursMockup() {
  return (
    <div className="flex items-center justify-center h-full p-6">
      <div className="w-full max-w-xs rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden">
        {/* Browser chrome */}
        <div className="bg-slate-100 border-b border-slate-200 px-4 py-2.5 flex items-center gap-2">
          <div className="flex gap-1.5" aria-hidden="true">
            <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
            <div className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
            <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
          </div>
          <div className="flex-1 bg-white rounded-md px-3 py-1 text-[10px] text-slate-400 font-medium border border-slate-200 truncate">
            slate360.io/tours/meridian-phase2
          </div>
        </div>

        {/* Panorama viewer */}
        <div
          className="relative h-40 bg-gradient-to-br from-slate-700 via-slate-600 to-slate-800 overflow-hidden"
          role="img"
          aria-label="360 degree panorama viewer showing construction site interior"
        >
          <div
            className="absolute inset-0 opacity-30"
            aria-hidden="true"
            style={{
              backgroundImage: `radial-gradient(circle at 30% 50%, rgba(59,130,246,0.4) 0%, transparent 50%), radial-gradient(circle at 70% 30%, rgba(100,150,255,0.3) 0%, transparent 40%)`,
            }}
          />
          {/* Active hotspot */}
          <div className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
            <div className="relative">
              <div className="h-6 w-6 rounded-full bg-[#2563eb]/90 border-2 border-white shadow-lg flex items-center justify-center animate-pulse">
                <div className="h-1.5 w-1.5 rounded-full bg-white" />
              </div>
              <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 bg-slate-900/90 text-white text-[9px] font-medium px-2 py-0.5 rounded whitespace-nowrap">
                Lobby Entrance
              </div>
            </div>
          </div>
          <div className="absolute bottom-3 left-3 bg-black/50 rounded-lg px-2 py-1 flex items-center gap-1.5" aria-hidden="true">
            <Building2 className="h-3 w-3 text-blue-300" />
            <span className="text-white text-[9px] font-medium">360° Interactive Tour</span>
          </div>
          <p className="absolute top-3 left-1/2 -translate-x-1/2 text-white/50 text-[8px] whitespace-nowrap" aria-hidden="true">
            ← Drag to explore →
          </p>
        </div>

        {/* Stop list */}
        <ul className="p-3 space-y-1" aria-label="Tour stops">
          {["Lobby Entrance", "Level 2 — South Wing", "Rooftop Access"].map((label, i) => (
            <li
              key={label}
              className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs cursor-pointer transition-colors ${
                i === 0
                  ? "bg-blue-50 border border-blue-100 text-[#2563eb] font-semibold"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              <div
                className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${i === 0 ? "bg-[#2563eb]" : "bg-slate-300"}`}
                aria-hidden="true"
              />
              {label}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** Design Studio: toolbar + 2D blueprint / 3D perspective view */
function DesignMockup() {
  return (
    <div className="flex items-center justify-center h-full p-6">
      <div className="w-full max-w-xs rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden">
        {/* App top bar */}
        <div className="bg-slate-900 px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Palette className="h-3.5 w-3.5 text-blue-400" aria-hidden="true" />
            <span className="text-white text-[10px] font-bold tracking-wide">Design Studio</span>
          </div>
          <div className="flex items-center gap-1.5" role="group" aria-label="View mode">
            <span className="h-5 rounded bg-slate-700 px-2 text-[9px] text-slate-300 flex items-center cursor-pointer">2D</span>
            <span className="h-5 rounded bg-[#2563eb] px-2 text-[9px] text-white flex items-center font-semibold">3D</span>
          </div>
        </div>

        {/* Blueprint canvas */}
        <div
          className="bg-slate-50 h-44 overflow-hidden relative"
          role="img"
          aria-label="Floor plan and 3D model preview"
        >
          <div
            className="absolute inset-0 opacity-40"
            aria-hidden="true"
            style={{
              backgroundImage: `linear-gradient(rgba(59,130,246,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.15) 1px, transparent 1px)`,
              backgroundSize: "20px 20px",
            }}
          />
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 176" aria-hidden="true">
            {/* Floor plan */}
            <rect x="20" y="20" width="120" height="80" fill="none" stroke="#2563eb" strokeWidth="1.5" opacity="0.7" />
            <rect x="20" y="20" width="60" height="35" fill="rgba(59,130,246,0.08)" stroke="#2563eb" strokeWidth="1" opacity="0.8" />
            <rect x="80" y="20" width="60" height="35" fill="rgba(59,130,246,0.05)" stroke="#2563eb" strokeWidth="1" opacity="0.8" />
            <rect x="20" y="55" width="120" height="45" fill="rgba(59,130,246,0.06)" stroke="#2563eb" strokeWidth="1" opacity="0.8" />
            <path d="M80 20 Q95 35 80 55" fill="none" stroke="#94a3b8" strokeWidth="0.8" strokeDasharray="3,2" opacity="0.6" />
            <line x1="20" y1="112" x2="140" y2="112" stroke="#94a3b8" strokeWidth="0.8" />
            <line x1="20" y1="108" x2="20" y2="116" stroke="#94a3b8" strokeWidth="0.8" />
            <line x1="140" y1="108" x2="140" y2="116" stroke="#94a3b8" strokeWidth="0.8" />
            <text x="80" y="124" fontSize="7" fill="#64748b" textAnchor="middle">24&apos;-0&quot;</text>
            {/* 3D isometric box */}
            <rect x="170" y="32" width="100" height="58" fill="rgba(59,130,246,0.08)" stroke="#2563eb" strokeWidth="1.5" opacity="0.8" />
            <polygon points="170,32 192,16 292,16 270,32" fill="rgba(59,130,246,0.12)" stroke="#2563eb" strokeWidth="1" opacity="0.8" />
            <polygon points="270,32 292,16 292,90 270,90" fill="rgba(59,130,246,0.15)" stroke="#2563eb" strokeWidth="1" opacity="0.8" />
          </svg>
        </div>

        {/* Toolbar */}
        <div className="border-t border-slate-200 px-3 py-2 flex items-center gap-1.5" role="toolbar" aria-label="Design tools">
          {["Annotate", "Measure", "3D View", "Share"].map((tool, i) => (
            <button
              key={tool}
              type="button"
              className={`text-[9px] font-semibold px-2.5 py-1 rounded-lg transition-colors ${
                i === 2 ? "bg-[#2563eb] text-white" : "text-slate-500 hover:bg-slate-100"
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

/** Full bento grid section */
function AppShowcaseSection() {
  const [activeKey, setActiveKey] = useState<AppKey>("sitewalk");
  const activeApp = APPS.find((a) => a.key === activeKey)!;

  return (
    <section id="apps" className="bg-slate-50 py-28 px-6">
      <div className="mx-auto max-w-7xl">
        {/* Section header */}
        <div className="text-center mb-16">
          <p className="text-xs font-bold uppercase tracking-widest text-[#2563eb] mb-3">The App Suite</p>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-slate-900 text-balance">
            Every tool your team needs.
          </h2>
          <p className="mt-4 text-lg text-slate-500 max-w-2xl mx-auto text-pretty">
            Slate360 is a connected platform of specialized apps — all sharing one data layer, one project context, and one client portal.
          </p>
        </div>

        {/* Bento card */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden grid lg:grid-cols-[280px_1fr]">

          {/* Left: vertical app menu */}
          <div className="border-b lg:border-b-0 lg:border-r border-slate-200 bg-slate-50/60 flex flex-col">
            <nav className="p-3 space-y-1 flex-1" aria-label="App selector">
              {APPS.map((app) => {
                const isActive = app.key === activeKey;
                return (
                  <button
                    key={app.key}
                    type="button"
                    onClick={() => setActiveKey(app.key)}
                    aria-pressed={isActive}
                    className={`w-full text-left flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 ease-out group relative ${
                      isActive
                        ? "bg-white shadow-sm border border-slate-200"
                        : "hover:bg-white/70"
                    }`}
                  >
                    {/* Active accent bar */}
                    {isActive && (
                      <div
                        className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-0.5 rounded-full bg-[#2563eb]"
                        aria-hidden="true"
                      />
                    )}
                    <div
                      className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors duration-300 ${
                        isActive
                          ? "bg-[#2563eb] text-white"
                          : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
                      }`}
                    >
                      <app.icon className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${isActive ? "text-slate-900" : "text-slate-600"}`}>
                        {app.label}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5 leading-tight">{app.tagline}</p>
                    </div>
                    {isActive && (
                      <ChevronRight className="ml-auto h-4 w-4 text-[#2563eb] flex-shrink-0" aria-hidden="true" />
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Bottom CTA promo */}
            <div className="m-3 rounded-xl bg-[#2563eb] p-4 text-white">
              <p className="text-xs font-bold mb-1">All apps. One platform.</p>
              <p className="text-[11px] text-blue-100 leading-relaxed mb-3">
                Start your 14-day free trial and explore the full suite.
              </p>
              <Link
                href="/signup"
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-white hover:text-blue-200 transition-colors"
              >
                Get started free <ArrowRight className="h-3 w-3" aria-hidden="true" />
              </Link>
            </div>
          </div>

          {/* Right: mock UI + copy */}
          <div className="grid lg:grid-cols-2">
            {/* Mock UI pane */}
            <div className="bg-slate-50 border-b lg:border-b-0 lg:border-r border-slate-200 min-h-[360px] flex items-center justify-center">
              {activeKey === "sitewalk" && <SiteWalkMockup />}
              {activeKey === "tours360" && <ToursMockup />}
              {activeKey === "design" && <DesignMockup />}
            </div>

            {/* Copy pane */}
            <div className="p-8 lg:p-10 flex flex-col justify-center">
              <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 border border-blue-100 text-[#2563eb] text-xs font-bold px-3 py-1 mb-5 self-start">
                <activeApp.icon className="h-3 w-3" aria-hidden="true" />
                {activeApp.label}
              </div>
              <h3 className="text-2xl font-bold text-slate-900 text-balance mb-3">
                {activeApp.tagline}
              </h3>
              <p className="text-slate-500 text-sm leading-relaxed mb-6 text-pretty">
                {activeApp.description}
              </p>
              <ul className="space-y-2.5 mb-8" aria-label={`${activeApp.label} features`}>
                {activeApp.bullets.map((bullet) => (
                  <li key={bullet} className="flex items-start gap-2.5 text-sm text-slate-600">
                    <div className="mt-0.5 h-4 w-4 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
                      <Check className="h-2.5 w-2.5 text-[#2563eb]" aria-hidden="true" />
                    </div>
                    {bullet}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className="self-start inline-flex items-center gap-2 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-sm font-semibold px-5 py-2.5 transition-all duration-300 ease-out hover:-translate-y-0.5"
              >
                Explore {activeApp.label}
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ==========================================================================
   PRICING SECTION  —  Monthly / Yearly toggle + 3 cards
   ========================================================================== */

function PricingSection() {
  const [annual, setAnnual] = useState(false);

  return (
    <section id="pricing" className="bg-white py-28 px-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="text-center mb-14">
          <p className="text-xs font-bold uppercase tracking-widest text-[#2563eb] mb-3">Pricing</p>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-slate-900 text-balance mb-4">
            Straightforward pricing.
          </h2>
          <p className="text-lg text-slate-500 max-w-xl mx-auto text-pretty mb-10">
            Pay for what you need. Upgrade or cancel at any time.
          </p>

          {/* Billing toggle */}
          <div
            className="inline-flex items-center gap-1 rounded-xl bg-slate-100 p-1"
            role="group"
            aria-label="Billing frequency"
          >
            <button
              type="button"
              onClick={() => setAnnual(false)}
              aria-pressed={!annual}
              className={`rounded-lg px-5 py-2 text-sm font-semibold transition-all duration-300 ease-out ${
                !annual ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setAnnual(true)}
              aria-pressed={annual}
              className={`rounded-lg px-5 py-2 text-sm font-semibold transition-all duration-300 ease-out flex items-center gap-2 ${
                annual ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Yearly
              <span className="rounded-full bg-green-100 text-green-700 text-[10px] font-bold px-1.5 py-0.5">
                Save 17%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing cards */}
        <div className="grid md:grid-cols-3 gap-6 items-start">
          {PLANS.map((plan) => {
            const price = annual ? plan.annualPrice : plan.monthlyPrice;
            return (
              <article
                key={plan.name}
                className={`relative rounded-2xl border bg-white flex flex-col overflow-hidden transition-all duration-300 ease-out ${
                  plan.highlight
                    ? "border-[#2563eb] shadow-[0_0_0_1px_rgba(37,99,235,0.2),0_12px_48px_-8px_rgba(37,99,235,0.18)] md:scale-[1.03]"
                    : "border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5"
                }`}
              >
                {/* Cobalt accent stripe on Pro */}
                {plan.highlight && (
                  <div className="h-1 w-full bg-[#2563eb]" aria-hidden="true" />
                )}

                {plan.badge && (
                  <div className="absolute top-4 right-4">
                    <span className="rounded-full bg-[#2563eb] text-white text-[10px] font-bold px-2.5 py-1 shadow-sm">
                      {plan.badge}
                    </span>
                  </div>
                )}

                <div className="p-7 flex flex-col h-full">
                  <header className="mb-6">
                    <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
                    <p className="text-sm text-slate-500 mt-1 leading-relaxed">{plan.desc}</p>
                  </header>

                  <div className="mb-7">
                    {typeof price === "number" ? (
                      <>
                        <span className="text-4xl font-bold text-slate-900">${price}</span>
                        <span className="text-slate-400 text-sm ml-1.5">
                          /mo{annual && <> · billed annually</>}
                        </span>
                      </>
                    ) : (
                      <span className="text-3xl font-bold text-slate-900">Custom</span>
                    )}
                  </div>

                  <ul className="space-y-3 mb-8 flex-1" aria-label={`${plan.name} plan features`}>
                    {plan.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2.5 text-sm text-slate-600">
                        <div
                          className={`mt-0.5 h-4 w-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                            plan.highlight ? "bg-blue-50 border border-blue-100" : "bg-slate-100"
                          }`}
                        >
                          <Check
                            className={`h-2.5 w-2.5 ${plan.highlight ? "text-[#2563eb]" : "text-slate-500"}`}
                            aria-hidden="true"
                          />
                        </div>
                        {feat}
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={plan.name === "Master Bundle" ? "/contact" : "/signup"}
                    className={`w-full inline-flex items-center justify-center rounded-xl py-3 text-sm font-bold transition-all duration-300 ease-out ${
                      plan.highlight
                        ? "bg-[#2563eb] hover:bg-[#1d4ed8] text-white shadow-sm shadow-blue-200 hover:-translate-y-0.5"
                        : "border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:-translate-y-0.5"
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              </article>
            );
          })}
        </div>

        <p className="text-center text-sm text-slate-400 mt-10">
          All plans include a 14-day free trial. No credit card required during beta.
        </p>
      </div>
    </section>
  );
}

/* ==========================================================================
   FOOTER  —  Dark to match navbar
   ========================================================================== */

function MarketingFooter() {
  return (
    <footer className="bg-[#0b0f15] border-t border-white/[0.07]">
      <div className="mx-auto max-w-7xl px-6 py-16 grid gap-12 sm:grid-cols-2 md:grid-cols-[1fr_auto_auto_auto]">
        {/* Brand column */}
        <div>
          <SlateLogo size="md" className="mb-4" />
          <p className="text-sm text-[#6b7585] leading-relaxed max-w-xs text-pretty">
            The all-in-one construction platform for site walks, 360 tours, and project coordination.
          </p>
          <div className="flex items-center gap-3 mt-6">
            {[
              { Icon: Twitter, label: "Twitter" },
              { Icon: Linkedin, label: "LinkedIn" },
              { Icon: Globe, label: "Website" },
            ].map(({ Icon, label }) => (
              <a
                key={label}
                href="#"
                aria-label={label}
                className="h-8 w-8 rounded-lg border border-white/10 flex items-center justify-center text-[#6b7585] hover:text-white hover:border-white/25 transition-all duration-200"
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
              </a>
            ))}
          </div>
        </div>

        {/* Link columns */}
        {[
          { heading: "Product", links: ["Site Walk", "360 Tours", "Design Studio", "Pricing"] },
          { heading: "Company", links: ["About", "Blog", "Careers", "Contact"] },
          { heading: "Legal", links: ["Privacy Policy", "Terms of Service", "Security"] },
        ].map(({ heading, links }) => (
          <div key={heading}>
            <h4 className="text-xs font-bold uppercase tracking-widest text-[#3d4a5a] mb-4">{heading}</h4>
            <ul className="space-y-3">
              {links.map((link) => (
                <li key={link}>
                  <a href="#" className="text-sm text-[#6b7585] hover:text-white transition-colors duration-200">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-white/[0.07]">
        <div className="mx-auto max-w-7xl px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-[#3d4a5a]">
            &copy; {new Date().getFullYear()} Slate360. All rights reserved.
          </p>
          <a
            href="mailto:hello@slate360.io"
            className="flex items-center gap-1.5 text-xs text-[#3d4a5a] hover:text-white transition-colors"
          >
            <Mail className="h-3.5 w-3.5" aria-hidden="true" />
            hello@slate360.io
          </a>
        </div>
      </div>
    </footer>
  );
}

/* ==========================================================================
   PAGE ASSEMBLY
   ========================================================================== */

export default function MarketingHomepage({ isLoggedIn = false }: { isLoggedIn?: boolean }) {
  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      <Navbar isLoggedIn={isLoggedIn} />
      <main>
        <HeroSection />
        <FeatureStrip />
        <AppShowcaseSection />
        <PricingSection />
      </main>
      <MarketingFooter />
    </div>
  );
}
