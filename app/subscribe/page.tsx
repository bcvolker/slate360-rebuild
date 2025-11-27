"use client";

import Footer from "@/components/ui/Footer";
import Link from "next/link";

const plans = [
  {
    name: "Trial / Explore",
    price: "Free",
    highlight: false,
    description: "Explore the platform.",
    features: [
      "Single User",
      "Project Hub Access",
      "View-Only Mode",
      "Community Support",
    ],
  },
  {
    name: "Creator Bundle",
    price: "$79",
    highlight: false,
    description: "For creators and field teams capturing the site.",
    features: [
      "Content Studio (Full Suite)",
      "360 Tour Builder",
      "Basic Storage",
      "Email Support",
    ],
  },
  {
    name: "Model Bundle",
    price: "$199",
    highlight: false,
    description: "For designers and engineers shaping the built environment.",
    features: [
      "Design Studio (Model Editing)",
      "3D Print Studio",
      "Basic Content Studio",
      "Photogrammetry/GNSS Processing",
    ],
  },
  {
    name: "God Mode",
    price: "$499",
    highlight: true,
    description: "Complete access to the entire Slate360 ecosystem.",
    features: [
      "All Apps",
      "All Processing",
      "Priority Support",
      "Unlimited Projects",
    ],
  },
];

export default function SubscribePage() {
  return (
    <>
      <main className="min-h-[100dvh] px-6 py-24 md:py-28 bg-graphite">
        <div className="mx-auto max-w-7xl my-auto w-full">
          <section className="relative overflow-hidden rounded-[32px] border border-slate-200/60 bg-white/90 backdrop-blur-md shadow-xl px-6 py-10 sm:px-10 sm:py-12 lg:px-14 lg:py-14">
            
            <div className="relative z-10 flex flex-col gap-8">
              <div className="text-center max-w-3xl mx-auto">
                <p className="mb-3 text-xs font-orbitron font-bold uppercase tracking-[0.35em] text-blue-600 drop-shadow-sm">
                  Pricing &amp; Access
                </p>
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-orbitron tracking-tight text-slate-900 mb-4">
                  Plans &amp; Pricing
                </h1>
                <p className="text-sm md:text-base text-slate-600 max-w-2xl mx-auto mb-2">
                  Choose a plan that matches how your teams actually deliver work. 
                  Start small, scale as you standardize on Slate360.
                </p>
                <p className="text-xs font-bold text-[#B87333] uppercase tracking-widest">
                  Introductory pricing. Subject to change. Data rates apply for usage over set thresholds.
                </p>
              </div>

              <div className="grid gap-6 md:gap-8 sm:grid-cols-2 lg:grid-cols-4 items-start">
                {plans.map((plan) => (
                  <div
                    key={plan.name}
                    className={`relative flex h-full flex-col rounded-2xl border p-5 sm:p-6 shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl ${
                      plan.highlight
                        ? "bg-slate-50 border-[#B87333] shadow-md"
                        : "bg-white border-slate-200"
                    }`}
                  >
                    {plan.highlight && (
                      <span className="absolute right-4 top-4 rounded-full bg-[#B87333] px-3 py-1 text-[10px] font-orbitron font-semibold uppercase tracking-[0.2em] text-white">
                        Most Popular
                      </span>
                    )}
                    <div className="mb-3">
                      <h2 className="text-lg font-orbitron tracking-wide text-slate-900">
                        {plan.name}
                      </h2>
                      <p className="mt-1 text-xs text-slate-500 min-h-[2.5em]">{plan.description}</p>
                    </div>
                    <div className="mb-4 flex items-baseline gap-1">
                      <span className="text-3xl font-semibold text-slate-900 font-orbitron">
                        {plan.price}
                      </span>
                      {plan.price !== "Free" && plan.price !== "Custom" && (
                        <span className="text-xs uppercase tracking-[0.25em] text-slate-400">
                          /month
                        </span>
                      )}
                    </div>
                    <ul className="mb-5 flex-1 space-y-1.5 text-xs text-slate-600">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2">
                          <span className="mt-[2px] inline-flex h-3 w-3 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-[9px] text-blue-600">
                            •
                          </span>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <button className={`inline-flex items-center justify-center rounded-full border px-4 py-2 text-[11px] font-orbitron font-semibold uppercase tracking-[0.25em] transition-colors w-full ${
                        plan.highlight
                          ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
                          : "border-slate-200 bg-slate-50 text-slate-600 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700"
                      }`}>
                      {plan.price === "Custom" ? "Contact Us" : "Get Started"}
                    </button>
                    
                    <div className="mt-4 pt-3 border-t border-slate-100 flex justify-center gap-3 text-[9px] text-slate-400">
                      <Link href="/terms" className="hover:text-slate-600 hover:underline">Terms of Service</Link>
                      <Link href="/terms" className="hover:text-slate-600 hover:underline">No Refund Policy</Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>
      <Footer variant="light" />
    </>
  );
}



