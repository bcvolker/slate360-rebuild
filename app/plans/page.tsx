"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";
import { Check, ChevronRight } from "lucide-react";

const plans = [
  {
    name: "Creator",
    monthlyPrice: "$79",
    annualPrice: "$790",
    tagline: "For individual creators and small teams just getting started.",
    cta: "Start Free Trial",
    href: "/login",
    features: [
      "3 active projects",
      "50 GB storage",
      "500 rendering credits / mo",
      "SlateDrop publishing",
      "Design Studio access",
      "360° viewer embeds",
      "1 team member",
      "Email support",
    ],
  },
  {
    name: "Model",
    monthlyPrice: "$199",
    annualPrice: "$1,990",
    tagline: "For growing organizations that need more power and projects.",
    cta: "Start Free Trial",
    href: "/login",
    featured: true,
    features: [
      "25 active projects",
      "250 GB storage",
      "2,500 rendering credits / mo",
      "Everything in Creator",
      "GPU-accelerated rendering",
      "Full Project Hub access",
      "Up to 10 team members",
      "Priority support",
      "Automated 3D processing",
      "Advanced analytics",
    ],
  },
  {
    name: "Business",
    monthlyPrice: "$499",
    annualPrice: "$4,990",
    tagline: "For professional operations running multiple venues and campaigns.",
    cta: "Start Free Trial",
    href: "/login",
    features: [
      "Unlimited projects",
      "2 TB storage",
      "10,000 rendering credits / mo",
      "Everything in Model",
      "Unlimited team members",
      "White-label exports",
      "Multi-venue management",
      "Custom brand kits (unlimited)",
      "Dedicated onboarding",
      "SLA response guarantee",
    ],
  },
  {
    name: "Enterprise",
    monthlyPrice: "Custom",
    annualPrice: null,
    tagline: "Broadcast-scale, enterprise integrations, and dedicated engineering support.",
    cta: "Contact Sales",
    href: "mailto:hello@slate360.ai",
    features: [
      "Everything in Business",
      "Unlimited storage & credits",
      "Custom integrations",
      "Dedicated engineer",
      "SSO / SAML authentication",
      "On-prem deployment option",
      "Custom SLA",
      "Executive onboarding",
    ],
  },
];

const faqs = [
  {
    q: "Is there a free trial?",
    a: "Yes — Creator, Model, and Business plans all include a 14-day free trial with full access. No credit card required to start.",
  },
  {
    q: "What are rendering credits?",
    a: "Credits are used for GPU-intensive jobs: 3D model processing, 360° stitching, and large-format image exports. Unused credits roll over to the next month. Most users never need to buy more.",
  },
  {
    q: "Can I change plans later?",
    a: "Absolutely. Upgrade, downgrade, or cancel anytime from your account settings. Changes take effect at the next billing cycle.",
  },
  {
    q: "What is the annual discount?",
    a: "Annual billing saves you approximately 17% compared to monthly. The price shown for annual is the total for the year.",
  },
  {
    q: "What payment methods do you accept?",
    a: "All major credit and debit cards via Stripe. Enterprise customers can also pay by invoice.",
  },
  {
    q: "What counts as a project?",
    a: "A project is any campaign, event, or content collection in your Project Hub. Archived and active projects each count separately.",
  },
];

export default function PlansPage() {
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");

  return (
    <div className="bg-black min-h-screen text-white antialiased">
      <Navbar />

      {/* Hero */}
      <section className="pt-36 pb-16 px-6 md:px-8 text-center">
        <div className="max-w-2xl mx-auto">
          <span
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: "#FF4D00" }}
          >
            Pricing
          </span>
          <h1 className="mt-4 text-5xl md:text-7xl font-black tracking-tight leading-none">
            Simple, honest pricing.
          </h1>
          <p className="mt-6 text-white/50 text-xl leading-relaxed">
            Start free. Scale when you&apos;re ready. No surprise fees, no
            credit card required to trial.
          </p>
        </div>
      </section>

      {/* Billing Toggle */}
      <div className="flex items-center justify-center gap-3 pb-10 px-6">
        <button
          onClick={() => setBilling("monthly")}
          className={`px-7 py-3 rounded-full text-sm font-semibold transition-all duration-200 ${
            billing === "monthly" ? "text-white shadow-lg" : "text-white/40 hover:text-white/70"
          }`}
          style={billing === "monthly" ? { backgroundColor: "#FF4D00" } : {}}
        >
          Monthly
        </button>
        <button
          onClick={() => setBilling("annual")}
          className={`px-7 py-3 rounded-full text-sm font-semibold flex items-center gap-2 transition-all duration-200 ${
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

      {/* Plans */}
      <section className="pb-28 px-6 md:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 items-start">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative p-7 rounded-2xl border flex flex-col gap-7 transition-all duration-300 ${
                plan.featured
                  ? "border-[#FF4D00] bg-[#FF4D00]/[0.06] shadow-[0_0_60px_rgba(255,77,0,0.12)]"
                  : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/20"
              }`}
            >
              {plan.featured && (
                <span
                  className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold tracking-widest uppercase whitespace-nowrap"
                  style={{ backgroundColor: "#FF4D00", color: "#fff" }}
                >
                  Most Popular
                </span>
              )}

              <div>
                <h2 className="text-2xl font-bold text-white">{plan.name}</h2>
                <p className="text-white/40 text-xs mt-1.5 leading-snug">{plan.tagline}</p>
              </div>

              <div>
                <div className="text-5xl font-black text-white leading-none">
                  {billing === "annual" && plan.annualPrice
                    ? plan.annualPrice
                    : plan.monthlyPrice}
                  {plan.monthlyPrice !== "Custom" && (
                    <span className="text-lg font-normal text-white/40 ml-1">
                      {billing === "annual" ? "/yr" : "/mo"}
                    </span>
                  )}
                </div>
                {billing === "annual" && plan.annualPrice && (
                  <p className="text-xs text-green-400 mt-1.5">
                    Billed annually — save vs monthly
                  </p>
                )}
              </div>

              <ul className="space-y-3 flex-1">
                {plan.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-3 text-sm text-white/65"
                  >
                    <Check
                      size={14}
                      className="mt-0.5 flex-shrink-0"
                      style={{ color: "#FF4D00" }}
                    />
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href={plan.href}
                className={`text-center py-4 rounded-full text-sm font-semibold transition-all duration-200 ${
                  plan.featured
                    ? "hover:opacity-90 hover:scale-105"
                    : "border border-white/20 hover:border-white/40 hover:bg-white/5"
                }`}
                style={
                  plan.featured
                    ? { backgroundColor: "#FF4D00", color: "#fff" }
                    : {}
                }
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        <p className="text-center mt-10 text-white/30 text-sm">
          All plans include a{" "}
          <span className="text-white/60 font-semibold">14-day free trial</span>
          {" "}· No credit card required
        </p>
      </section>

      {/* FAQ */}
      <section className="py-24 px-6 md:px-8 bg-zinc-950/50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold mb-12 text-center">
            Frequently asked questions
          </h2>
          <div className="flex flex-col gap-0 divide-y divide-white/8">
            {faqs.map((item) => (
              <div key={item.q} className="py-7">
                <h3 className="text-base font-semibold mb-3">{item.q}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 md:px-8 text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="text-4xl font-black mb-4">
            Ready to see{" "}
            <span style={{ color: "#FF4D00" }}>SLATE360</span> in action?
          </h2>
          <p className="text-white/50 mb-8">
            Start a free trial today. No credit card, no commitment.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 px-10 py-4 rounded-full font-semibold text-base transition-all hover:opacity-90 hover:scale-105"
              style={{ backgroundColor: "#FF4D00", color: "#fff" }}
            >
              Start Free Trial <ChevronRight size={16} />
            </Link>
            <Link
              href="mailto:hello@slate360.ai"
              className="inline-flex items-center justify-center gap-2 px-10 py-4 rounded-full font-semibold text-base border border-white/20 hover:bg-white/5 transition-all"
            >
              Contact Sales
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
