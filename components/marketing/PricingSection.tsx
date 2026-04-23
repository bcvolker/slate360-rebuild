import Link from "next/link";
import { Check, MapPin, Building2, Palette, FileText, Zap } from "lucide-react";

const INDIVIDUAL_APPS = [
  {
    name: "Site Walk",
    icon: MapPin,
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-100",
    price: "Starting at $29/mo",
    features: [
      "Geolocated photo capture",
      "Voice-to-text notes",
      "AI punch list generation",
      "Branded PDF reports",
      "5 GB storage",
    ],
  },
  {
    name: "360 Tours",
    icon: Building2,
    color: "text-indigo-600",
    bg: "bg-indigo-50",
    border: "border-indigo-100",
    price: "Starting at $39/mo",
    features: [
      "Unlimited tours",
      "Interactive hotspots",
      "Client portals",
      "Floor plan integration",
      "10 GB storage",
    ],
  },
  {
    name: "Design Studio",
    icon: Palette,
    color: "text-violet-600",
    bg: "bg-violet-50",
    border: "border-violet-100",
    price: "Starting at $49/mo",
    features: [
      "3D model viewer",
      "Annotation tools",
      "Markup & redlines",
      "Version history",
      "15 GB storage",
    ],
  },
  {
    name: "Content Studio",
    icon: FileText,
    color: "text-sky-600",
    bg: "bg-sky-50",
    border: "border-sky-100",
    price: "Starting at $29/mo",
    features: [
      "Unlimited asset library",
      "Collection organization",
      "Shareable galleries",
      "Bulk upload & tagging",
      "20 GB storage",
    ],
  },
];

const BUNDLE_FEATURES = [
  "Site Walk — Full access",
  "360 Tours — Full access",
  "Design Studio — Full access",
  "Content Studio — Full access",
  "Unified project dashboard",
  "Shared files, permissions & deliverables",
  "White-label branding",
  "Priority support & SLA",
  "Unlimited storage (pooled)",
  "SSO & advanced security",
  "Dedicated success manager",
  "Custom seat count",
];

export default function PricingSection() {
  return (
    <section id="pricing" className="bg-slate-50 px-6 py-24">
      <div className="mx-auto max-w-7xl">
        {/* Section header */}
        <div className="mb-14 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-blue-600">
            Pricing
          </p>
          <h2 className="mb-4 text-balance text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Buy what you need. Bundle when ready.
          </h2>
          <p className="mx-auto max-w-2xl text-pretty text-lg text-slate-600">
            {"Subscribe to individual apps or unlock the full platform. Every plan includes a 14-day free trial — no credit card required."}
          </p>
        </div>

        {/* A La Carte: 4-column grid */}
        <div className="mb-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {INDIVIDUAL_APPS.map((app) => {
            const Icon = app.icon;
            return (
              <div
                key={app.name}
                className={`flex flex-col rounded-2xl border ${app.border} bg-white p-6 ring-1 ring-slate-200 shadow-xl`}
              >
                {/* Icon + name */}
                <div className="mb-4 flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${app.bg}`}>
                    <Icon className={`h-5 w-5 ${app.color}`} />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">{app.name}</h3>
                </div>

                {/* Price */}
                <p className={`mb-4 text-sm font-semibold ${app.color}`}>{app.price}</p>

                {/* Features */}
                <ul className="mb-6 flex-1 space-y-2">
                  {app.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-slate-700">
                      <Check className={`mt-0.5 h-4 w-4 flex-shrink-0 ${app.color}`} />
                      {f}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Link
                  href="/signup"
                  className={`block w-full rounded-xl border ${app.border} ${app.bg} px-4 py-2.5 text-center text-sm font-semibold ${app.color} transition hover:opacity-90`}
                >
                  Start Free Trial
                </Link>
              </div>
            );
          })}
        </div>

        {/* Master Bundle — full-width glowing card */}
        <div
          className="relative overflow-hidden rounded-3xl border border-blue-200 bg-white ring-1 ring-slate-200 shadow-xl"
          style={{ boxShadow: "0 0 40px rgba(59,130,246,0.3), 0 20px 60px rgba(0,0,0,0.08)" }}
        >
          {/* Top accent bar */}
          <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500" />

          <div className="p-8 md:p-10 lg:p-12">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-16">
              {/* Left: Title + pitch */}
              <div className="lg:w-80 lg:flex-shrink-0">
                {/* Badge */}
                <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-1.5">
                  <Zap className="h-3.5 w-3.5 text-white" />
                  <span className="text-sm font-semibold text-white">Best Value</span>
                </div>

                <h3 className="mb-3 text-3xl font-bold tracking-tight text-slate-900">
                  The Slate360 Master Bundle
                </h3>
                <p className="mb-6 text-lg text-slate-600 leading-relaxed">
                  All Apps. All Features. One unified project dashboard.
                </p>

                <div className="mb-6">
                  <span className="text-5xl font-bold text-slate-900">Custom</span>
                  <p className="mt-1 text-sm text-slate-500">Pricing negotiated for your team size & needs</p>
                </div>

                <div className="flex flex-col gap-3">
                  <Link
                    href="/signup"
                    className="block w-full rounded-xl bg-blue-600 px-6 py-4 text-center text-base font-bold text-white shadow-lg shadow-blue-500/30 transition hover:-translate-y-0.5 hover:bg-blue-500"
                  >
                    Start Free Trial
                  </Link>
                  <Link
                    href="/contact"
                    className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-6 py-4 text-center text-base font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-white"
                  >
                    Contact Sales
                  </Link>
                </div>
              </div>

              {/* Right: Feature grid */}
              <div className="flex-1">
                <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-400">
                  Everything included
                </p>
                <ul className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
                  {BUNDLE_FEATURES.map((feature) => (
                    <li key={feature} className="flex items-center gap-3 text-sm text-slate-700">
                      <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-blue-100">
                        <Check className="h-3 w-3 text-blue-600" />
                      </div>
                      {feature}
                    </li>
                  ))}
                </ul>

                {/* App logos row */}
                <div className="mt-8 flex items-center gap-3 border-t border-slate-100 pt-6">
                  <span className="text-xs text-slate-400">Includes:</span>
                  {[
                    { name: "Site Walk", icon: MapPin, color: "bg-blue-100 text-blue-600" },
                    { name: "360 Tours", icon: Building2, color: "bg-indigo-100 text-indigo-600" },
                    { name: "Design Studio", icon: Palette, color: "bg-violet-100 text-violet-600" },
                    { name: "Content Studio", icon: FileText, color: "bg-sky-100 text-sky-600" },
                  ].map((app) => {
                    const AppIcon = app.icon;
                    return (
                      <div key={app.name} className={`flex items-center gap-1.5 rounded-lg ${app.color} px-3 py-1.5`}>
                        <AppIcon className="h-3.5 w-3.5" />
                        <span className="text-xs font-semibold">{app.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
