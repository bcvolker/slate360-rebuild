"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

export default function CTASection() {
  return (
    <section
      className="py-24 px-4 sm:px-6 text-white"
      style={{ backgroundColor: "#18181b" }}
    >
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight mb-4">
          Your next project, fully managed.
        </h2>
        <p className="text-zinc-400 text-lg mb-10 leading-relaxed">
          Join professionals who manage, visualize, and deliver projects with
          Slate360. No credit card required.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/signup?plan=creator&billing=monthly"
            className="inline-flex items-center justify-center gap-2 px-9 py-4 rounded-full font-semibold text-base text-white transition-all hover:opacity-90 hover:scale-105"
            style={{ backgroundColor: "#FF4D00" }}
          >
            Start free trial <ChevronRight size={16} />
          </Link>
          <Link
            href="/features/design-studio"
            className="inline-flex items-center justify-center gap-2 px-9 py-4 rounded-full font-semibold text-base text-white border border-white/30 hover:bg-white/10 transition-all"
          >
            Explore Design Studio
          </Link>
        </div>
      </div>
    </section>
  );
}
