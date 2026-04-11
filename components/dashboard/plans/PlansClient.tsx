"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ChevronLeft, ChevronRight, Loader2, Sparkles } from "lucide-react";
import type { Tier } from "@/lib/entitlements";

const PLANS = [
  {
    id: "trial" as const,
    name: "Trial",
    price: "Free",
    annualPrice: "Free",
    desc: "Explore the full platform with starter limits.",
    features: [
      "All tabs unlocked with restrictions",
      "2 GB SlateDrop storage",
      "250 processing credits",
      "1 seat",
      "Watermarked exports",
    ],
    cta: "Current Plan",
    disabled: true,
  },
  {
    id: "standard" as const,
    name: "Standard",
    price: "$149",
    annualPrice: "$124",
    desc: "For professionals who need reliable storage and tools.",
    features: [
      "Project Hub + SlateDrop + Tour Builder",
      "25 GB SlateDrop storage",
      "5,000 processing credits/mo",
      "3 seats",
      "Clean exports (no watermark)",
      "Share links for clients",
    ],
    cta: "Subscribe",
    highlight: true,
  },
  {
    id: "business" as const,
    name: "Business",
    price: "$499",
    annualPrice: "$416",
    desc: "Full platform for teams and contractors.",
    features: [
      "Everything in Standard",
      "100 GB SlateDrop storage",
      "25,000 processing credits/mo",
      "15 seats with seat management",
      "Analytics and reporting",
      "PDF and CSV exports",
    ],
    cta: "Subscribe",
  },
  {
    id: "enterprise" as const,
    name: "Enterprise",
    price: "Custom",
    annualPrice: "Custom",
    desc: "For large firms, multi-team orgs, and government.",
    features: [
      "Everything in Business",
      "500 GB+ storage",
      "100,000+ credits",
      "Unlimited seats",
      "White-label branding",
      "SSO and enterprise security",
      "Dedicated support SLA",
    ],
    cta: "Contact Us",
    enterprise: true,
  },
];

const FAQS = [
  { q: "Can I switch plans anytime?", a: "Yes — upgrade or downgrade at any time. Prorated billing is handled automatically by Stripe." },
  { q: "What are processing credits?", a: "Credits are consumed for GPU-intensive tasks like 360° stitching, photogrammetry, and rendering. Credits refresh monthly." },
  { q: "Is the trial really free?", a: "Yes — no credit card required. Trial gives full access to all tabs with starter limits so you can explore before committing." },
  { q: "What happens if I downgrade?", a: "Your data is never deleted. You lose access to features above your tier until you upgrade again." },
  { q: "Do you offer nonprofit or education pricing?", a: "Yes. Contact hello@slate360.ai for nonprofit, academic, and government pricing." },
];

interface Props {
  currentTier: Tier;
  currentLabel: string;
  isAdmin: boolean;
}

export default function PlansClient({ currentTier, currentLabel, isAdmin }: Props) {
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const [busyTierId, setBusyTierId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCheckout(tierId: string) {
    if (!isAdmin) {
      setError("Only organization admins can change the subscription.");
      return;
    }
    setError(null);
    setBusyTierId(tierId);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: tierId, billingCycle: billing }),
      });
      const data = await res.json();
      if (!res.ok || !data?.url) {
        setError(data?.error ?? "Unable to start checkout");
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Unable to start checkout. Please try again.");
    } finally {
      setBusyTierId(null);
    }
  }

  const tierOrder: Tier[] = ["trial", "standard", "business", "enterprise"];
  const currentIndex = tierOrder.indexOf(currentTier);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="px-4 sm:px-6 pt-6 pb-4 max-w-7xl mx-auto">
        <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-white transition-colors mb-6">
          <ChevronLeft size={16} /> Back to Dashboard
        </Link>
        <div className="text-center mb-8">
          <span className="inline-block text-[10px] font-semibold uppercase tracking-widest px-3 py-1 rounded-full mb-3 bg-orange-500/10 text-orange-400">
            Pricing
          </span>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-2">
            Choose your plan
          </h1>
          <p className="text-zinc-400 text-sm mb-1">
            Currently on <span className="text-white font-semibold">{currentLabel}</span>
          </p>
          <p className="text-zinc-500 text-xs">
            Credits are generous. Storage is real. No surprise bills.
          </p>
        </div>

        {/* Billing toggle */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center rounded-full border border-zinc-700 bg-zinc-900 p-1">
            {(["monthly", "annual"] as const).map((b) => (
              <button
                key={b}
                onClick={() => setBilling(b)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                  billing === b
                    ? "bg-zinc-800 text-white shadow"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {b === "monthly" ? "Monthly" : "Annual — save 17%"}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-400 text-center mb-4">{error}</p>
        )}
      </div>

      {/* Plan cards */}
      <section className="px-4 sm:px-6 pb-12">
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {PLANS.map((plan) => {
            const planIndex = tierOrder.indexOf(plan.id);
            const isCurrent = plan.id === currentTier;
            const isDowngrade = planIndex < currentIndex && planIndex >= 0;

            return (
              <div
                key={plan.id}
                className={`rounded-2xl p-6 relative flex flex-col ${
                  plan.highlight
                    ? "border-2 border-orange-500 bg-zinc-900 shadow-xl shadow-orange-500/5"
                    : "border border-zinc-800 bg-zinc-900"
                } ${isCurrent ? "ring-2 ring-orange-500/30" : ""}`}
              >
                {plan.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[9px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full text-white bg-orange-500 flex items-center gap-1">
                    <Sparkles size={10} /> Most popular
                  </span>
                )}
                {isCurrent && (
                  <span className="absolute -top-3 right-4 text-[9px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-zinc-700 text-zinc-300">
                    Current
                  </span>
                )}
                <div className="mb-auto">
                  <h2 className="text-lg font-black mb-1">{plan.name}</h2>
                  <p className="text-xs text-zinc-500 mb-3">{plan.desc}</p>
                  <div className="flex items-baseline gap-1 mb-4">
                    {plan.price === "Free" || plan.price === "Custom" ? (
                      <span className="text-2xl font-black text-orange-400">{plan.price}</span>
                    ) : (
                      <>
                        <span className="text-3xl font-black text-orange-400">
                          {billing === "annual" ? plan.annualPrice : plan.price}
                        </span>
                        <span className="text-zinc-500 text-xs">/mo</span>
                      </>
                    )}
                  </div>
                  <ul className="space-y-2 mb-5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-xs text-zinc-400">
                        <Check size={12} className="text-orange-400 flex-shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>

                {plan.enterprise ? (
                  <Link
                    href="mailto:hello@slate360.ai"
                    className="flex items-center justify-center w-full py-2.5 rounded-full text-sm font-semibold transition-all hover:bg-zinc-800 border border-zinc-700 text-zinc-300"
                  >
                    Contact Us
                  </Link>
                ) : isCurrent ? (
                  <button
                    disabled
                    className="flex items-center justify-center w-full py-2.5 rounded-full text-sm font-semibold bg-zinc-800 text-zinc-500 cursor-default"
                  >
                    Current Plan
                  </button>
                ) : isDowngrade ? (
                  <Link
                    href="/my-account?tab=billing"
                    className="flex items-center justify-center w-full py-2.5 rounded-full text-sm font-semibold transition-all hover:bg-zinc-800 border border-zinc-700 text-zinc-400"
                  >
                    Manage in Billing Portal
                  </Link>
                ) : (
                  <button
                    onClick={() => handleCheckout(plan.id)}
                    disabled={busyTierId !== null}
                    className={`flex items-center justify-center w-full py-2.5 rounded-full text-sm font-semibold transition-all hover:opacity-90 hover:scale-[1.02] disabled:opacity-60 disabled:hover:scale-100 ${
                      plan.highlight
                        ? "bg-orange-500 text-white"
                        : "border border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                    }`}
                  >
                    {busyTierId === plan.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <>
                        {plan.cta} <ChevronRight size={14} className="ml-1" />
                      </>
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-4 sm:px-6 border-t border-zinc-800">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-black mb-8 text-center">Frequently asked questions</h2>
          <div className="space-y-4">
            {FAQS.map((faq) => (
              <details key={faq.q} className="group border border-zinc-800 rounded-xl">
                <summary className="flex items-center justify-between px-5 py-4 cursor-pointer text-sm font-semibold text-zinc-200 hover:text-white">
                  {faq.q}
                  <ChevronRight size={14} className="text-zinc-500 transition-transform group-open:rotate-90" />
                </summary>
                <p className="px-5 pb-4 text-xs text-zinc-400 leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
