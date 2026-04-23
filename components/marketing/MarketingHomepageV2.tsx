"use client";

import Link from "next/link";
import { Shield, Users, Zap, Mail, Twitter, Linkedin, Github } from "lucide-react";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MarketingHero } from "@/components/marketing/MarketingHero";
import { AppShowcase } from "@/components/marketing/AppShowcase";
import { ModularPricing } from "@/components/marketing/ModularPricing";
import { SlateLogo } from "@/components/shared/SlateLogo";

/* ─────────────────────────────────────────────────────────────────
   Trust Bar
   ───────────────────────────────────────────────────────────────── */

const TRUST_CATEGORIES = [
  "General Contractors",
  "Architecture Firms",
  "Real Estate Developers",
  "Property Managers",
  "Construction Tech Teams",
];

function TrustBar() {
  return (
    <div
      className="py-6 border-y overflow-hidden"
      style={{ backgroundColor: "#FFFFFF", borderColor: "#E2E8F0" }}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p
          className="text-center text-xs font-semibold uppercase tracking-widest mb-5"
          style={{ color: "#94A3B8" }}
        >
          Built for teams across the AEC industry
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {TRUST_CATEGORIES.map((cat) => (
            <span
              key={cat}
              className="rounded-full px-4 py-1.5 text-sm font-medium"
              style={{
                backgroundColor: "#F8FAFC",
                color: "#475569",
                border: "1px solid #E2E8F0",
              }}
            >
              {cat}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Solutions / Why Slate360
   ───────────────────────────────────────────────────────────────── */

const WHY_ITEMS = [
  {
    icon: Zap,
    title: "Field to office in minutes",
    body: "Capture site conditions with your phone or 360 camera and turn them into reports, punch lists, and proposals without leaving the field.",
  },
  {
    icon: Users,
    title: "Keep teams aligned",
    body: "Projects, files, and permissions are shared across every app so the field team and the office always work from the same information.",
  },
  {
    icon: Shield,
    title: "Client links that never break",
    body: "Slate360's Downgrade Law protection ensures client-facing portals and share links continue working regardless of plan changes.",
  },
];

function WhySection() {
  return (
    <section
      id="solutions"
      className="py-24 px-4 sm:px-6 lg:px-8"
      style={{ backgroundColor: "#F8FAFC" }}
      aria-label="Why Slate360"
    >
      <div className="mx-auto max-w-7xl">
        <div className="text-center mb-14">
          <p
            className="text-sm font-semibold uppercase tracking-widest mb-3"
            style={{ color: "#3B82F6" }}
          >
            Why Slate360
          </p>
          <h2
            className="text-3xl sm:text-4xl font-bold tracking-tight text-balance"
            style={{ color: "#0F172A" }}
          >
            Replace four tools with one ecosystem.
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {WHY_ITEMS.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-2xl bg-white ring-1 shadow-xl p-8 flex flex-col gap-4"
              style={{ ["--tw-ring-color" as string]: "#E2E8F0" }}
            >
              <div
                className="flex h-12 w-12 items-center justify-center rounded-xl"
                style={{ backgroundColor: "#EFF6FF" }}
              >
                <Icon className="h-6 w-6" style={{ color: "#3B82F6" }} />
              </div>
              <h3 className="text-lg font-bold" style={{ color: "#0F172A" }}>
                {title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: "#475569" }}>
                {body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Final CTA Banner
   ───────────────────────────────────────────────────────────────── */

function FinalCTA({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <section
      className="py-24 px-4 sm:px-6 lg:px-8"
      style={{ backgroundColor: "#FFFFFF" }}
    >
      <div className="mx-auto max-w-3xl text-center">
        <h2
          className="text-3xl sm:text-4xl font-bold tracking-tight text-balance mb-4"
          style={{ color: "#0F172A" }}
        >
          Ready to transform your construction workflow?
        </h2>
        <p
          className="text-lg mb-10 text-pretty leading-relaxed"
          style={{ color: "#475569" }}
        >
          Start with one app or unlock the full platform. Free trial, no credit card required during beta.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href={isLoggedIn ? "/dashboard" : "/signup"}
            className="inline-flex items-center justify-center rounded-xl px-10 py-4 text-base font-semibold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl"
            style={{ backgroundColor: "#3B82F6" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "#2563EB")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "#3B82F6")
            }
          >
            {isLoggedIn ? "Go to Dashboard" : "Start Free Trial"}
          </Link>
          <Link
            href="#pricing"
            className="inline-flex items-center justify-center rounded-xl border px-10 py-4 text-base font-semibold transition-colors"
            style={{ borderColor: "#CBD5E1", color: "#334155" }}
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
            View Pricing
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Footer
   ───────────────────────────────────────────────────────────────── */

const FOOTER_LINKS = [
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "Contact", href: "mailto:hello@slate360.app" },
  { label: "Blog", href: "#" },
];

const SOCIAL_LINKS = [
  { icon: Twitter, href: "#", label: "Twitter" },
  { icon: Linkedin, href: "#", label: "LinkedIn" },
  { icon: Github, href: "#", label: "GitHub" },
  { icon: Mail, href: "mailto:hello@slate360.app", label: "Email" },
];

function Footer() {
  return (
    <footer
      className="border-t py-10 px-4 sm:px-6 lg:px-8"
      style={{ backgroundColor: "#0B0F15", borderColor: "rgba(255,255,255,0.08)" }}
    >
      <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <SlateLogo size="sm" />
          <nav className="flex flex-wrap items-center gap-5" aria-label="Footer navigation">
            {FOOTER_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-sm transition-colors"
                style={{ color: "#64748B" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#94A3B8")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#64748B")}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {SOCIAL_LINKS.map(({ icon: Icon, href, label }) => (
            <Link
              key={label}
              href={href}
              aria-label={label}
              className="transition-colors"
              style={{ color: "#64748B" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#94A3B8")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#64748B")}
            >
              <Icon className="h-4 w-4" />
            </Link>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-7xl mt-6 pt-6 border-t text-center" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
        <p className="text-xs" style={{ color: "#475569" }}>
          &copy; {new Date().getFullYear()} Slate360, Inc. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Page Root
   ───────────────────────────────────────────────────────────────── */

interface MarketingHomepageV2Props {
  isLoggedIn?: boolean;
}

export default function MarketingHomepageV2({ isLoggedIn = false }: MarketingHomepageV2Props) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FFFFFF" }}>
      <MarketingHeader isLoggedIn={isLoggedIn} />

      <main>
        <MarketingHero isLoggedIn={isLoggedIn} />
        <TrustBar />
        <AppShowcase />
        <WhySection />
        <ModularPricing />
        <FinalCTA isLoggedIn={isLoggedIn} />
      </main>

      <Footer />
    </div>
  );
}
