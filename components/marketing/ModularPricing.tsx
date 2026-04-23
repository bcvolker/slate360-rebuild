"use client";

import Link from "next/link";
import { Check, MapPin, Building2, Palette, FileText, Zap } from "lucide-react";

/* ─────────────────────────────────────────────────────────────────
   Data
   ───────────────────────────────────────────────────────────────── */

const ALA_CARTE_APPS = [
  {
    name: "Site Walk",
    icon: MapPin,
    price: "Coming soon",
    tagline: "Field capture & reporting",
    features: [
      "Geolocated photo capture",
      "AI transcription & formatting",
      "Punch list generation",
      "PDF report export",
    ],
  },
  {
    name: "360 Tours",
    icon: Building2,
    price: "Coming soon",
    tagline: "Immersive walkthroughs",
    features: [
      "Drag-and-drop tour builder",
      "Interactive hotspots",
      "Shareable client portals",
      "View analytics",
    ],
  },
  {
    name: "Design Studio",
    icon: Palette,
    price: "Coming soon",
    tagline: "3D model review & markup",
    features: [
      "GLB / glTF model viewer",
      "Annotation & markup tools",
      "Before / after comparison",
      "Version history",
    ],
  },
  {
    name: "Content Studio",
    icon: FileText,
    price: "Coming soon",
    tagline: "Media library & delivery",
    features: [
      "Photo, video & document library",
      "Bulk upload & tagging",
      "Client-shareable galleries",
      "CDN-powered delivery",
    ],
  },
];

const BUNDLE_FEATURES = [
  "Site Walk — full Pro access",
  "360 Tours — full Pro access",
  "Design Studio — full Pro access",
  "Content Studio — full Pro access",
  "Unified project dashboard",
  "Cross-app shared files & permissions",
  "Priority support & onboarding",
  "White-label client branding",
  "Unlimited collaborators",
  "Custom storage allocation",
];

/* ─────────────────────────────────────────────────────────────────
   Sub-components
   ───────────────────────────────────────────────────────────────── */

function AlaCarteCard({
  app,
}: {
  app: (typeof ALA_CARTE_APPS)[0];
}) {
  const Icon = app.icon;
  return (
    <div
      className="rounded-2xl bg-white ring-1 shadow-xl flex flex-col p-6 transition-shadow hover:shadow-2xl"
      style={{ "--tw-ring-color": "#E2E8F0" } as React.CSSProperties}
    >
      {/* Icon + name */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0"
          style={{ backgroundColor: "#EFF6FF" }}
        >
          <Icon className="h-5 w-5" style={{ color: "#3B82F6" }} />
        </div>
        <div>
          <p className="text-sm font-bold" style={{ color: "#0F172A" }}>
            {app.name}
          </p>
          <p className="text-xs" style={{ color: "#94A3B8" }}>
            {app.tagline}
          </p>
        </div>
      </div>

      {/* Price */}
      <div className="mb-5">
        <span className="text-2xl font-bold" style={{ color: "#0F172A" }}>
          {app.price}
        </span>
      </div>

      {/* Features */}
      <ul className="flex-1 space-y-2 mb-6">
        {app.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-xs" style={{ color: "#475569" }}>
            <Check
              className="mt-0.5 h-3.5 w-3.5 flex-shrink-0"
              style={{ color: "#3B82F6" }}
            />
            {f}
          </li>
        ))}
      </ul>

      {/* CTA */}
      <Link
        href="/signup"
        className="block w-full text-center rounded-xl border py-2.5 text-sm font-semibold transition-colors"
        style={{ borderColor: "#CBD5E1", color: "#334155", backgroundColor: "transparent" }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "#3B82F6";
          e.currentTarget.style.color = "#1D4ED8";
          e.currentTarget.style.backgroundColor = "#EFF6FF";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "#CBD5E1";
          e.currentTarget.style.color = "#334155";
          e.currentTarget.style.backgroundColor = "transparent";
        }}
      >
        Get Started
      </Link>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Main Export
   ───────────────────────────────────────────────────────────────── */

export function ModularPricing() {
  return (
    <section
      id="pricing"
      className="py-24 px-4 sm:px-6 lg:px-8"
      style={{ backgroundColor: "#F8FAFC" }}
    >
      <div className="mx-auto max-w-7xl">
        {/* Section header */}
        <div className="text-center mb-14">
          <p
            className="text-sm font-semibold uppercase tracking-widest mb-3"
            style={{ color: "#3B82F6" }}
          >
            Pricing
          </p>
          <h2
            className="text-3xl sm:text-4xl font-bold tracking-tight text-balance"
            style={{ color: "#0F172A" }}
          >
            Choose the apps you need,
            <br className="hidden sm:block" /> or unlock everything.
          </h2>
          <p
            className="mt-4 text-lg max-w-2xl mx-auto text-pretty leading-relaxed"
            style={{ color: "#475569" }}
          >
            Subscribe to individual apps or save significantly with the Slate360 Master Bundle.
            Cancel or change plans anytime.
          </p>
        </div>

        {/* ── À La Carte grid ── */}
        <div className="mb-6">
          <h3
            className="text-xs font-semibold uppercase tracking-widest mb-5"
            style={{ color: "#94A3B8" }}
          >
            À La Carte — Individual Apps
          </h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {ALA_CARTE_APPS.map((app) => (
              <AlaCarteCard key={app.name} app={app} />
            ))}
          </div>
        </div>

        {/* ── Master Bundle card ── */}
        <div>
          <h3
            className="text-xs font-semibold uppercase tracking-widest mb-5"
            style={{ color: "#94A3B8" }}
          >
            The Bundle
          </h3>
          <div
            className="relative rounded-2xl bg-white ring-1 overflow-hidden"
            style={{
              boxShadow: "0 0 40px rgba(59,130,246,0.30), 0 8px 32px rgba(0,0,0,0.10)",
              ["--tw-ring-color" as string]: "#BFDBFE",
            }}
          >
            {/* Top cobalt accent bar */}
            <div
              className="h-1 w-full"
              style={{ background: "linear-gradient(90deg, #3B82F6, #2563EB, #1D4ED8)" }}
            />

            <div className="p-8 sm:p-10">
              {/* Header row */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 mb-8">
                <div className="flex items-center gap-4">
                  <div
                    className="flex h-14 w-14 items-center justify-center rounded-2xl flex-shrink-0"
                    style={{ backgroundColor: "#EFF6FF" }}
                  >
                    <Zap className="h-7 w-7" style={{ color: "#3B82F6" }} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3
                        className="text-2xl font-bold"
                        style={{ color: "#0F172A" }}
                      >
                        The Slate360 Master Bundle
                      </h3>
                      <span
                        className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                        style={{ backgroundColor: "#EFF6FF", color: "#3B82F6", border: "1px solid #BFDBFE" }}
                      >
                        Best Value
                      </span>
                    </div>
                    <p className="text-base" style={{ color: "#64748B" }}>
                      All Apps. All Features. One unified project dashboard.
                    </p>
                  </div>
                </div>

                {/* Price block */}
                <div className="flex-shrink-0 text-right">
                  <p className="text-4xl font-bold" style={{ color: "#0F172A" }}>
                    Coming Soon
                  </p>
                  <p className="text-sm mt-1" style={{ color: "#94A3B8" }}>
                    Join the waitlist for founding member pricing
                  </p>
                </div>
              </div>

              {/* Feature grid */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-8">
                {BUNDLE_FEATURES.map((f) => (
                  <div
                    key={f}
                    className="flex items-start gap-2 rounded-xl px-3 py-2.5"
                    style={{ backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0" }}
                  >
                    <div
                      className="mt-0.5 flex h-4 w-4 items-center justify-center rounded-full flex-shrink-0"
                      style={{ backgroundColor: "#DBEAFE" }}
                    >
                      <Check className="h-2.5 w-2.5" style={{ color: "#3B82F6" }} />
                    </div>
                    <span className="text-xs font-medium leading-tight" style={{ color: "#334155" }}>
                      {f}
                    </span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center rounded-xl px-10 py-3.5 text-base font-semibold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl"
                  style={{ backgroundColor: "#3B82F6" }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = "#2563EB")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = "#3B82F6")
                  }
                >
                  Join the Waitlist
                </Link>
                <p className="text-sm" style={{ color: "#94A3B8" }}>
                  No commitment. Be first to know when pricing goes live.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
