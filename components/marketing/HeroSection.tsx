import Link from "next/link";
import { Play, ArrowRight } from "lucide-react";

export default function HeroSection() {
  return (
    <section className="bg-slate-50 px-6 pb-24 pt-40 text-center">
      <div className="mx-auto max-w-4xl">
        {/* Eyebrow badge */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5">
          <span className="h-2 w-2 rounded-full bg-blue-500" />
          <span className="text-sm font-medium text-blue-700">Now in Beta — Foundational Member Pricing</span>
        </div>

        {/* H1 */}
        <h1 className="mb-6 text-balance text-5xl font-bold tracking-tight text-slate-900 sm:text-6xl lg:text-7xl">
          The Ultimate App Ecosystem{" "}
          <span className="text-blue-600">for Construction.</span>
        </h1>

        {/* Subheadline */}
        <p className="mx-auto mb-10 max-w-2xl text-pretty text-lg leading-relaxed text-slate-600">
          {"Don't buy bloated software. Choose the specific tools you need, or unlock the entire Slate360 platform."}
        </p>

        {/* CTAs */}
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/signup"
            className="inline-flex h-14 items-center gap-2 rounded-xl bg-blue-600 px-8 text-base font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:-translate-y-0.5 hover:bg-blue-500 hover:shadow-blue-500/40"
          >
            Start Free Trial
            <ArrowRight className="h-4 w-4" />
          </Link>
          <button className="inline-flex h-14 items-center gap-3 rounded-xl border border-slate-200 bg-white px-8 text-base font-semibold text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100">
              <Play className="h-3.5 w-3.5 fill-slate-700 text-slate-700" />
            </span>
            Watch Demo
          </button>
        </div>

        {/* Social proof */}
        <p className="mt-8 text-sm text-slate-500">
          Free to start. No credit card required during beta.
        </p>

        {/* Hero visual — browser mockup strip */}
        <div className="mt-16 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-200/60">
          {/* Browser chrome */}
          <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-5 py-3.5">
            <span className="h-3 w-3 rounded-full bg-red-400" />
            <span className="h-3 w-3 rounded-full bg-amber-400" />
            <span className="h-3 w-3 rounded-full bg-green-400" />
            <div className="mx-4 flex-1 rounded-md bg-slate-200 px-3 py-1.5 text-xs text-slate-500">
              app.slate360.com/dashboard
            </div>
          </div>
          {/* Mock dashboard strip */}
          <div className="grid grid-cols-4 gap-0 divide-x divide-slate-100">
            {[
              { label: "Site Walk", color: "bg-blue-50", accent: "bg-blue-500", count: "24 walks" },
              { label: "360 Tours", color: "bg-indigo-50", accent: "bg-indigo-500", count: "8 tours" },
              { label: "Design Studio", color: "bg-violet-50", accent: "bg-violet-500", count: "12 plans" },
              { label: "Content Studio", color: "bg-sky-50", accent: "bg-sky-500", count: "140 assets" },
            ].map((app) => (
              <div key={app.label} className={`${app.color} px-5 py-8 text-left`}>
                <div className={`mb-3 h-2.5 w-2.5 rounded-full ${app.accent}`} />
                <p className="text-sm font-semibold text-slate-700">{app.label}</p>
                <p className="mt-1 text-xs text-slate-500">{app.count}</p>
                <div className="mt-4 space-y-1.5">
                  <div className="h-1.5 w-full rounded-full bg-slate-200/80" />
                  <div className="h-1.5 w-3/4 rounded-full bg-slate-200/80" />
                  <div className="h-1.5 w-1/2 rounded-full bg-slate-200/80" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
