"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Image from "next/image";
import Link from "next/link";
import Script from "next/script";
import { ChevronRight, X, Maximize2, Play, Check } from "lucide-react";

/* ─── Feature tiles ─── */
const features = [
  {
    key: "design-studio",
    label: "Design",
    title: "Design Studio",
    description:
      "A professional-grade composition environment with sports-specific templates, brand kit management, layer controls, and one-click exports. No design degree required.",
    href: "/features/design-studio",
    accent: "#FF4D00",
  },
  {
    key: "project-hub",
    label: "Manage",
    title: "Project Hub",
    description:
      "Centralized campaign and project management linking every asset, brief, milestone, and deadline in one clean, role-aware workspace.",
    href: "/features/project-hub",
    accent: "#1E3A8A",
  },
  {
    key: "slatedrop",
    label: "Distribute",
    title: "SlateDrop",
    description:
      "Finder-style drag-and-drop publishing. Right-click any file and hit Secure Send. Content hits every channel in seconds — sized, formatted, and on brand.",
    href: "/features/slatedrop",
    accent: "#FF4D00",
  },
  {
    key: "360-capture",
    label: "Capture",
    title: "360° Capture",
    description:
      "Immersive panoramic capture workflows built for live events. Shoot, stitch, and serve interactive 360° tours directly from the platform.",
    href: "/features/360-capture",
    accent: "#1E3A8A",
  },
  {
    key: "analytics",
    label: "Measure",
    title: "Real-Time Analytics",
    description:
      "Engagement metrics across every published asset. Know what's working the moment it goes live, with exportable reports and send-to-owner PDFs.",
    href: "/features/analytics",
    accent: "#FF4D00",
  },
  {
    key: "rendering",
    label: "Process",
    title: "GPU Rendering",
    description:
      "Cloud GPU workers handle heavy 3D and 360° processing so your laptop stays fast and your turnaround stays tight — even for broadcast-quality output.",
    href: "/features/rendering",
    accent: "#1E3A8A",
  },
];

/* ─── Pricing tiers ─── */
const tiers = [
  {
    name: "Creator",
    price: "$79",
    priceCents: 79,
    annual: "$790",
    tagline: "For creators & small teams",
    features: [
      "3 active projects",
      "50 GB storage",
      "500 rendering credits / mo",
      "SlateDrop publishing",
      "Design Studio access",
      "360° viewer embeds",
      "Email support",
    ],
  },
  {
    name: "Model",
    price: "$199",
    priceCents: 199,
    annual: "$1,990",
    tagline: "For growing organizations",
    featured: true,
    features: [
      "25 active projects",
      "250 GB storage",
      "2,500 rendering credits / mo",
      "Everything in Creator",
      "GPU-accelerated rendering",
      "Full Project Hub",
      "Priority support",
      "Automated 3D processing",
    ],
  },
  {
    name: "Business",
    price: "$499",
    priceCents: 499,
    annual: "$4,990",
    tagline: "For professional operations",
    features: [
      "Unlimited projects",
      "2 TB storage",
      "10,000 rendering credits / mo",
      "Everything in Model",
      "White-label exports",
      "Multi-venue management",
      "Advanced analytics",
      "Dedicated onboarding",
    ],
  },
  {
    name: "Enterprise",
    price: "Custom",
    priceCents: null,
    annual: null,
    tagline: "Broadcast & enterprise scale",
    features: [
      "Everything in Business",
      "Unlimited storage & credits",
      "Custom integrations",
      "Dedicated engineer",
      "SLA guarantee",
      "SSO / SAML",
      "On-prem option",
    ],
  },
];

export default function HomePage() {
  const [show360, setShow360] = useState(false);
  const [show3D, setShow3D] = useState(false);
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");

  return (
    <div className="bg-black min-h-screen text-white antialiased">
      <Navbar />

      {/* ─── HERO ─── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 md:px-8 pt-28 pb-20 overflow-hidden">
        {/* Ambient glow */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
          <div className="w-[700px] h-[700px] rounded-full blur-[200px] opacity-15" style={{ backgroundColor: "#FF4D00" }} />
        </div>

        <div className="relative z-10 flex flex-col items-center text-center max-w-5xl gap-8">
          {/* Eyebrow badge */}
          <span
            className="inline-flex items-center gap-2 px-5 py-1.5 rounded-full border text-xs font-semibold tracking-widest uppercase"
            style={{ borderColor: "#FF4D00", color: "#FF4D00" }}
          >
            Sports Media Infrastructure
          </span>

          {/* Logo */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.svg"
            alt="SLATE360"
            className="w-56 sm:w-80 md:w-[480px] h-auto"
          />

          <p className="text-lg sm:text-xl md:text-2xl text-white/55 max-w-2xl leading-relaxed">
            Capture, produce, and distribute elite sports content — all in one
            platform built for teams that refuse to settle.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 mt-4 w-full justify-center">
            <Link
              href="/plans"
              className="inline-flex items-center justify-center gap-2 px-10 py-4 rounded-full font-semibold text-base transition-all duration-200 hover:opacity-90 hover:scale-105"
              style={{ backgroundColor: "#FF4D00", color: "#fff" }}
            >
              Start Free Trial
              <ChevronRight size={16} />
            </Link>
            <Link
              href="/features"
              className="inline-flex items-center justify-center gap-2 px-10 py-4 rounded-full font-semibold text-base border border-white/20 hover:border-white/40 hover:bg-white/5 transition-all duration-200"
            >
              Explore the Platform
            </Link>
          </div>
        </div>
      </section>

      {/* ─── INTERACTIVE VIEWERS ─── */}
      <section className="py-24 px-6 md:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#FF4D00" }}>
              Live Preview
            </span>
            <h2 className="mt-3 text-3xl md:text-5xl font-bold leading-tight">
              See it. Experience it. Own it.
            </h2>
            <p className="mt-4 text-white/50 text-lg max-w-xl mx-auto">
              Interact with a real 360° panorama and 3D model — powered by SLATE360.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 360° Photo Viewer */}
            <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-zinc-950 shadow-2xl flex flex-col">
              <div className="relative w-full aspect-video flex-shrink-0">
                <Image
                  src="/uploads/pletchers.jpg"
                  alt="360° stadium panorama preview"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />
                <span className="absolute top-4 left-4 text-xs font-semibold uppercase tracking-widest text-white/80 bg-black/50 px-3 py-1 rounded-full backdrop-blur-sm border border-white/10">
                  360° Photo
                </span>
                <button
                  onClick={() => setShow360(true)}
                  className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-7 py-3 rounded-full font-semibold text-sm text-white transition-all duration-200 hover:scale-105 hover:opacity-90 min-w-[140px] justify-center"
                  style={{ backgroundColor: "#FF4D00" }}
                >
                  <Play size={14} fill="white" className="text-white flex-shrink-0" />
                  Interact
                </button>
              </div>
              <div className="p-6">
                <h3 className="text-base font-bold text-white">Interactive 360° Tour</h3>
                <p className="text-white/40 text-sm mt-1 leading-relaxed">
                  Click Interact to explore every angle in full-screen with pan, zoom, and navigation.
                </p>
              </div>
            </div>

            {/* 3D Model Viewer */}
            <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-zinc-950 shadow-2xl flex flex-col">
              <div className="relative w-full aspect-video flex-shrink-0 bg-zinc-900">
                {/* @ts-expect-error — custom web component */}
                <model-viewer
                  src="/uploads/csbglbmodel-optimized.glb"
                  alt="SLATE360 3D stadium model"
                  auto-rotate
                  camera-controls
                  environment-image="neutral"
                  exposure="0.8"
                  style={{ width: "100%", height: "100%", background: "transparent" }}
                />
                <span className="absolute top-4 left-4 text-xs font-semibold uppercase tracking-widest text-white/80 bg-black/50 px-3 py-1 rounded-full backdrop-blur-sm border border-white/10 pointer-events-none">
                  3D Model
                </span>
                <button
                  onClick={() => setShow3D(true)}
                  className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-7 py-3 rounded-full font-semibold text-sm text-white border border-white/20 bg-black/60 backdrop-blur-sm transition-all duration-200 hover:bg-white/10 hover:scale-105 min-w-[140px] justify-center z-10"
                >
                  <Maximize2 size={14} className="flex-shrink-0" />
                  Expand
                </button>
              </div>
              <div className="p-6">
                <h3 className="text-base font-bold text-white">Interactive 3D Model</h3>
                <p className="text-white/40 text-sm mt-1 leading-relaxed">
                  Rotate, zoom, and inspect the model. Click Expand for a full-screen immersive view.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section className="py-28 px-6 md:px-8 bg-zinc-950/60">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#FF4D00" }}>
              The Platform
            </span>
            <h2 className="mt-4 text-4xl md:text-5xl font-bold leading-tight">
              Every tool your team needs.
            </h2>
            <p className="mt-4 text-white/50 text-lg leading-relaxed">
              From sideline capture to broadcast distribution — one platform,
              zero broken handoffs.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <Link
                key={f.key}
                href={f.href}
                className="group relative p-8 rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/25 transition-all duration-300 flex flex-col gap-5 min-h-[200px]"
              >
                <span
                  className="inline-block text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full w-fit"
                  style={{ backgroundColor: f.accent + "22", color: f.accent }}
                >
                  {f.label}
                </span>
                <div className="flex-1">
                  <h3 className="text-lg font-bold mb-2 text-white group-hover:opacity-90 transition-opacity">
                    {f.title}
                  </h3>
                  <p className="text-white/50 text-sm leading-relaxed">{f.description}</p>
                </div>
                <span
                  className="inline-flex items-center gap-1 text-xs font-semibold mt-auto"
                  style={{ color: f.accent }}
                >
                  Learn more <ChevronRight size={12} />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── DEMO VIDEO PLACEHOLDER ─── */}
      <section className="py-28 px-6 md:px-8">
        <div className="max-w-5xl mx-auto text-center">
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#FF4D00" }}>
            See It In Action
          </span>
          <h2 className="mt-4 text-4xl md:text-5xl font-bold mb-12">
            Watch the platform walkthrough.
          </h2>
          <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-zinc-900 aspect-video flex items-center justify-center group cursor-pointer">
            <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 to-black" />
            <div
              className="relative z-10 w-20 h-20 rounded-full flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
              style={{ backgroundColor: "#FF4D00" }}
            >
              <Play size={30} className="text-white ml-1" fill="white" />
            </div>
            <span className="absolute bottom-6 left-1/2 -translate-x-1/2 text-xs font-medium tracking-widest uppercase text-white/30">
              Demo coming soon
            </span>
          </div>
        </div>
      </section>

      {/* ─── PRICING ─── */}
      <section className="py-28 px-6 md:px-8 bg-zinc-950/60">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#FF4D00" }}>
              Simple Pricing
            </span>
            <h2 className="mt-4 text-4xl md:text-5xl font-bold leading-tight">
              Plans that scale with you.
            </h2>
            <p className="mt-4 text-white/50 text-lg">
              Start free. Scale when you&apos;re ready. No surprise fees.
            </p>
          </div>

          {/* Billing toggle */}
          <div className="flex items-center justify-center gap-3 mb-12">
            <button
              onClick={() => setBilling("monthly")}
              className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 ${
                billing === "monthly" ? "text-white shadow-lg" : "text-white/40 hover:text-white/70"
              }`}
              style={billing === "monthly" ? { backgroundColor: "#FF4D00" } : {}}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling("annual")}
              className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
                billing === "annual" ? "text-white shadow-lg" : "text-white/40 hover:text-white/70"
              }`}
              style={billing === "annual" ? { backgroundColor: "#FF4D00" } : {}}
            >
              Annual
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 font-bold">
                Save 17%
              </span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
            {tiers.map((t) => (
              <div
                key={t.name}
                className={`relative p-7 rounded-2xl border flex flex-col gap-6 transition-all duration-300 ${
                  t.featured
                    ? "border-[#FF4D00] bg-[#FF4D00]/[0.06] shadow-[0_0_60px_rgba(255,77,0,0.12)]"
                    : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/20"
                }`}
              >
                {t.featured && (
                  <span
                    className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold tracking-widest uppercase whitespace-nowrap"
                    style={{ backgroundColor: "#FF4D00", color: "#fff" }}
                  >
                    Most Popular
                  </span>
                )}
                <div>
                  <h3 className="text-xl font-bold text-white">{t.name}</h3>
                  <p className="text-white/40 text-xs mt-1 leading-snug">{t.tagline}</p>
                </div>
                <div>
                  <div className="text-4xl font-black text-white leading-none">
                    {billing === "annual" && t.annual ? t.annual : t.price}
                    {t.price !== "Custom" && (
                      <span className="text-sm font-normal text-white/40 ml-1">
                        {billing === "annual" ? "/yr" : "/mo"}
                      </span>
                    )}
                  </div>
                  {billing === "annual" && t.annual && (
                    <p className="text-xs text-green-400 mt-1.5">Billed annually — save vs monthly</p>
                  )}
                </div>
                <ul className="space-y-2.5 flex-1">
                  {t.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-3 text-sm text-white/60">
                      <Check
                        size={13}
                        className="mt-0.5 flex-shrink-0"
                        style={{ color: "#FF4D00" }}
                      />
                      {feat}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/plans"
                  className={`text-center py-3.5 rounded-full text-sm font-semibold transition-all duration-200 ${
                    t.featured
                      ? "hover:opacity-90 hover:scale-105"
                      : "border border-white/20 hover:border-white/40 hover:bg-white/5"
                  }`}
                  style={
                    t.featured ? { backgroundColor: "#FF4D00", color: "#fff" } : {}
                  }
                >
                  {t.price === "Custom" ? "Contact Sales" : "Start Free Trial"}
                </Link>
              </div>
            ))}
          </div>

          <p className="text-center mt-8">
            <Link
              href="/plans"
              className="inline-flex items-center gap-1.5 text-sm font-semibold hover:opacity-80 transition-opacity"
              style={{ color: "#FF4D00" }}
            >
              Compare all plans in detail <ChevronRight size={14} />
            </Link>
          </p>
        </div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section className="py-32 px-6 md:px-8">
        <div className="max-w-3xl mx-auto text-center flex flex-col items-center gap-8">
          <h2 className="text-4xl md:text-6xl font-black leading-tight">
            Ready to run your{" "}
            <span style={{ color: "#FF4D00" }}>media operation</span> like a
            pro?
          </h2>
          <p className="text-white/50 text-lg max-w-xl leading-relaxed">
            Join hundreds of teams already using SLATE360 to own their story.
            Start free — no credit card required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
            <Link
              href="/plans"
              className="inline-flex items-center justify-center gap-2 px-10 py-4 rounded-full font-semibold text-base transition-all duration-200 hover:opacity-90 hover:scale-105"
              style={{ backgroundColor: "#FF4D00", color: "#fff" }}
            >
              Start Free Trial
              <ChevronRight size={16} />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 px-10 py-4 rounded-full font-semibold text-base border border-white/20 hover:border-white/50 hover:bg-white/5 transition-all duration-200"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      <Footer />

      {/* ─── 360° FULLSCREEN MODAL ─── */}
      {show360 && (
        <div
          className="fixed inset-0 z-[200] bg-black flex flex-col"
          style={{ touchAction: "none" }}
        >
          <div className="flex items-center justify-between px-5 py-3 bg-black/90 backdrop-blur-md border-b border-white/10 flex-shrink-0">
            <span className="text-sm font-semibold text-white/80 tracking-wide">
              360° Interactive Viewer
            </span>
            <button
              onClick={() => setShow360(false)}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              aria-label="Close 360 viewer"
            >
              <X size={18} />
            </button>
          </div>
          <div className="flex-1 relative min-h-0">
            <iframe
              src={`https://cdn.pannellum.org/2.5/pannellum.htm#panorama=${
                typeof window !== "undefined"
                  ? encodeURIComponent(window.location.origin + "/uploads/pletchers.jpg")
                  : "%2Fuploads%2Fpletchers.jpg"
              }&autoLoad=true&title=360%C2%B0%20View&showFullscreenCtrl=false&showZoomCtrl=true`}
              className="w-full h-full border-0"
              title="360° Panorama Viewer"
              allowFullScreen
            />
          </div>
        </div>
      )}

      {/* ─── 3D MODEL FULLSCREEN MODAL ─── */}
      {show3D && (
        <div
          className="fixed inset-0 z-[200] bg-black flex flex-col"
          style={{ touchAction: "none" }}
        >
          <div className="flex items-center justify-between px-5 py-3 bg-black/90 backdrop-blur-md border-b border-white/10 flex-shrink-0">
            <span className="text-sm font-semibold text-white/80 tracking-wide">
              3D Model Viewer
            </span>
            <button
              onClick={() => setShow3D(false)}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              aria-label="Close 3D model viewer"
            >
              <X size={18} />
            </button>
          </div>
          <div className="flex-1 relative min-h-0">
            {/* @ts-expect-error — custom web component */}
            <model-viewer
              src="/uploads/csbglbmodel-optimized.glb"
              alt="SLATE360 3D stadium model full screen"
              auto-rotate
              camera-controls
              environment-image="neutral"
              exposure="0.9"
              style={{ width: "100%", height: "100%", background: "#0a0a0a" }}
            />
          </div>
        </div>
      )}

      {/* model-viewer — loaded only on this page */}
      <Script
        type="module"
        src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js"
        strategy="lazyOnload"
        crossOrigin="anonymous"
      />
    </div>
  );
}
