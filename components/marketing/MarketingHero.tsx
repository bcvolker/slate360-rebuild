"use client";

import Link from "next/link";
import { Play } from "lucide-react";

interface MarketingHeroProps {
  isLoggedIn?: boolean;
}

export function MarketingHero({ isLoggedIn = false }: MarketingHeroProps) {
  return (
    <section
      className="pt-32 pb-24 px-4 sm:px-6 lg:px-8"
      style={{ backgroundColor: "#F8FAFC" }}
      aria-label="Hero"
    >
      <div className="mx-auto max-w-4xl text-center">
        {/* Eyebrow badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-sm font-medium text-blue-700 mb-8">
          <span
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: "#3B82F6" }}
          />
          The All-In-One Construction App Ecosystem
        </div>

        {/* H1 */}
        <h1
          className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-balance leading-[1.1] mb-6"
          style={{ color: "#0F172A" }}
        >
          The Ultimate App Ecosystem for{" "}
          <span style={{ color: "#3B82F6" }}>Construction.</span>
        </h1>

        {/* Subheadline */}
        <p
          className="text-lg sm:text-xl leading-relaxed max-w-2xl mx-auto mb-10 text-pretty"
          style={{ color: "#475569" }}
        >
          Don&apos;t buy bloated software. Choose the specific tools you need,
          or unlock the entire Slate360 platform and manage every project from
          one connected workspace.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href={isLoggedIn ? "/dashboard" : "/signup"}
            className="inline-flex items-center justify-center rounded-xl px-8 py-3.5 text-base font-semibold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl"
            style={{ backgroundColor: "#3B82F6" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "#2563EB")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "#3B82F6")
            }
          >
            Start Free Trial
          </Link>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-xl border px-8 py-3.5 text-base font-semibold transition-colors"
            style={{
              borderColor: "#CBD5E1",
              color: "#334155",
              backgroundColor: "transparent",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#94A3B8";
              e.currentTarget.style.backgroundColor = "#F1F5F9";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "#CBD5E1";
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <Play className="h-4 w-4 fill-current" style={{ color: "#3B82F6" }} />
            Watch Demo
          </button>
        </div>

        {/* Social proof micro-line */}
        <p
          className="mt-8 text-sm"
          style={{ color: "#94A3B8" }}
        >
          Free to start — no credit card required during beta.
        </p>
      </div>
    </section>
  );
}
