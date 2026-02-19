import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Image from "next/image";
import Link from "next/link";
import Script from "next/script";
import {
  Camera,
  Layers,
  Zap,
  Globe,
  BarChart3,
  Share2,
  Play,
  ChevronRight,
} from "lucide-react";

const features = [
  {
    icon: Camera,
    title: "360° Capture",
    description:
      "Immersive panoramic capture workflow built for live events, giving every angle its due.",
  },
  {
    icon: Layers,
    title: "Design Studio",
    description:
      "Professional-grade graphic templates and a full composition editor — no design degree required.",
  },
  {
    icon: Zap,
    title: "Instant SlateDrop",
    description:
      "Drag-and-drop content distribution that gets your media in front of fans in seconds, not hours.",
  },
  {
    icon: Globe,
    title: "Project Hub",
    description:
      "Centralized campaign management linking every asset, brief, and deadline in one clean workspace.",
  },
  {
    icon: BarChart3,
    title: "Real-Time Analytics",
    description:
      "Engagement metrics across every piece of content, with reporting built for performance-driven teams.",
  },
  {
    icon: Share2,
    title: "Multi-Channel Publish",
    description:
      "Push to social, broadcast, and web from a single queue — on brand, on time, every time.",
  },
];

const tiers = [
  {
    name: "Starter",
    price: "$49",
    tagline: "Perfect for emerging teams",
    highlights: ["5 active projects", "SlateDrop publishing", "Basic analytics"],
  },
  {
    name: "Pro",
    price: "$149",
    tagline: "For growing organizations",
    highlights: [
      "Unlimited projects",
      "Design Studio access",
      "Priority support",
    ],
    featured: true,
  },
  {
    name: "Elite",
    price: "Custom",
    tagline: "Enterprise & multi-venue",
    highlights: [
      "White-label options",
      "Dedicated engineer",
      "SLA guarantee",
    ],
  },
];

export default function HomePage() {
  return (
    <div className="bg-black min-h-screen text-white">
      <Navbar />

      {/* ─── HERO ─── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 md:px-8 pt-24 pb-16 overflow-hidden">
        {/* Ambient glow */}
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
          aria-hidden
        >
          <div
            className="w-[600px] h-[600px] rounded-full blur-[160px] opacity-20"
            style={{ backgroundColor: "#FF4D00" }}
          />
        </div>

        <div className="relative z-10 flex flex-col items-center text-center max-w-5xl gap-8">
          {/* Eyebrow */}
          <span
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-semibold tracking-widest uppercase"
            style={{ borderColor: "#FF4D00", color: "#FF4D00" }}
          >
            Sports Media Infrastructure
          </span>

          {/* Logo wordmark */}
          <h1
            className="text-6xl sm:text-7xl md:text-9xl font-black tracking-tighter leading-none"
            style={{ color: "#FF4D00" }}
          >
            SLATE360
          </h1>

          <p className="text-lg sm:text-xl md:text-2xl text-white/60 max-w-2xl leading-relaxed">
            Capture, produce, and distribute elite sports content — all in one
            platform built for teams that refuse to settle.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 mt-2 w-full justify-center">
            <Link
              href="/plans"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full font-semibold text-base transition-all duration-200 hover:opacity-90 hover:scale-105"
              style={{ backgroundColor: "#FF4D00", color: "#fff" }}
            >
              Start Free Trial
              <ChevronRight size={16} />
            </Link>
            <Link
              href="/plans"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full font-semibold text-base border border-white/20 hover:border-white/50 hover:bg-white/5 transition-all duration-200"
            >
              View Plans &amp; Pricing
            </Link>
          </div>
        </div>

        {/* 3D Model */}
        <div className="relative z-10 mt-16 w-full max-w-4xl mx-auto rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
          {/* @ts-expect-error — custom web component from model-viewer */}
          <model-viewer
            src="/uploads/csbglbmodel-optimized.glb"
            alt="SLATE360 3D stadium model"
            auto-rotate
            camera-controls
            environment-image="neutral"
            exposure="0.8"
            style={{
              width: "100%",
              height: "480px",
              background: "transparent",
            }}
          />
        </div>
      </section>

      {/* ─── PLATFORM OVERVIEW ─── */}
      <section className="py-28 px-6 md:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div>
              <span
                className="text-xs font-semibold uppercase tracking-widest"
                style={{ color: "#FF4D00" }}
              >
                The Platform
              </span>
              <h2 className="mt-4 text-4xl md:text-5xl font-bold leading-tight">
                Everything your team needs to lead the story.
              </h2>
              <p className="mt-6 text-white/50 text-lg leading-relaxed">
                SLATE360 integrates content capture, post-production, asset
                management, and distribution into a single intelligent platform.
                No patchwork tools. No broken handoffs. Just elite output.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <Link
                  href="/features"
                  className="inline-flex items-center gap-2 text-sm font-semibold transition-colors hover:opacity-80"
                  style={{ color: "#FF4D00" }}
                >
                  Explore all features
                  <ChevronRight size={14} />
                </Link>
              </div>
            </div>

            {/* 360 Photo */}
            <div className="rounded-2xl overflow-hidden border border-white/10 shadow-xl">
              <div className="relative w-full aspect-video bg-zinc-900 flex items-center justify-center">
                <Image
                  src="/uploads/pletchers.jpg"
                  alt="360° stadium panorama"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <span className="absolute bottom-4 left-4 text-xs font-semibold uppercase tracking-widest text-white/70 bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm">
                  360° View
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section className="py-28 px-6 md:px-8 bg-zinc-950/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span
              className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: "#FF4D00" }}
            >
              What&apos;s Inside
            </span>
            <h2 className="mt-4 text-4xl md:text-5xl font-bold">
              Built for every role on your team.
            </h2>
            <p className="mt-4 text-white/50 text-lg leading-relaxed">
              From the sideline shooter to the broadcast director — SLATE360
              gives everyone the tools to do their best work.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((f) => (
              <div
                key={f.title}
                className="group relative p-8 rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20 transition-all duration-300"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-6"
                  style={{ backgroundColor: "#FF4D00" + "22" }}
                >
                  <f.icon size={20} style={{ color: "#FF4D00" }} />
                </div>
                <h3 className="text-lg font-semibold mb-3">{f.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">
                  {f.description}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link
              href="/features"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full border border-white/20 hover:border-white/40 hover:bg-white/5 font-semibold text-sm transition-all duration-200"
            >
              See all features
              <ChevronRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── DEMO VIDEO PLACEHOLDER ─── */}
      <section className="py-28 px-6 md:px-8">
        <div className="max-w-5xl mx-auto text-center">
          <span
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: "#FF4D00" }}
          >
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

      {/* ─── PRICING TEASER ─── */}
      <section className="py-28 px-6 md:px-8 bg-zinc-950/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span
              className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: "#FF4D00" }}
            >
              Simple Pricing
            </span>
            <h2 className="mt-4 text-4xl md:text-5xl font-bold">
              Plans that scale with you.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {tiers.map((t) => (
              <div
                key={t.name}
                className={`relative p-8 rounded-2xl border transition-all duration-300 flex flex-col gap-6 ${
                  t.featured
                    ? "border-[#FF4D00] bg-[#FF4D00]/[0.06] scale-[1.02]"
                    : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04]"
                }`}
              >
                {t.featured && (
                  <span
                    className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-semibold tracking-widest uppercase"
                    style={{ backgroundColor: "#FF4D00", color: "#fff" }}
                  >
                    Most Popular
                  </span>
                )}
                <div>
                  <h3 className="text-lg font-semibold">{t.name}</h3>
                  <p className="text-white/40 text-sm mt-1">{t.tagline}</p>
                </div>
                <div className="text-4xl font-black">
                  {t.price}
                  {t.price !== "Custom" && (
                    <span className="text-base font-normal text-white/40">
                      /mo
                    </span>
                  )}
                </div>
                <ul className="space-y-2">
                  {t.highlights.map((h) => (
                    <li key={h} className="flex items-center gap-2 text-sm text-white/60">
                      <span
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: "#FF4D00" }}
                      />
                      {h}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/plans"
                  className={`mt-auto text-center py-3 rounded-full text-sm font-semibold transition-all duration-200 ${
                    t.featured
                      ? "hover:opacity-90 hover:scale-105"
                      : "border border-white/20 hover:border-white/40 hover:bg-white/5"
                  }`}
                  style={t.featured ? { backgroundColor: "#FF4D00" } : {}}
                >
                  {t.price === "Custom" ? "Contact Sales" : "Get Started"}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section className="py-28 px-6 md:px-8">
        <div className="max-w-3xl mx-auto text-center flex flex-col items-center gap-8">
          <h2 className="text-4xl md:text-6xl font-black leading-tight">
            Ready to run your{" "}
            <span style={{ color: "#FF4D00" }}>media operation</span> like a
            pro?
          </h2>
          <p className="text-white/50 text-lg">
            Join hundreds of teams already using SLATE360 to own their story.
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
              href="/plans"
              className="inline-flex items-center justify-center gap-2 px-10 py-4 rounded-full font-semibold text-base border border-white/20 hover:border-white/50 hover:bg-white/5 transition-all duration-200"
            >
              View Plans &amp; Pricing
            </Link>
          </div>
        </div>
      </section>

      <Footer />

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

