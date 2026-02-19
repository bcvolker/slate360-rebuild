import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";
import { Check } from "lucide-react";

const plans = [
  {
    name: "Starter",
    price: "$49",
    period: "/month",
    tagline: "For emerging teams getting off the ground.",
    cta: "Start Free Trial",
    href: "/login",
    features: [
      "5 active projects",
      "SlateDrop publishing",
      "Basic analytics",
      "2 team members",
      "1 GB storage",
      "Email support",
    ],
  },
  {
    name: "Pro",
    price: "$149",
    period: "/month",
    tagline: "For growing organizations that need more firepower.",
    cta: "Start Free Trial",
    href: "/login",
    featured: true,
    features: [
      "Unlimited projects",
      "Design Studio access",
      "Advanced analytics",
      "10 team members",
      "50 GB storage",
      "Priority support",
      "GPU rendering credits",
      "360° capture workflow",
    ],
  },
  {
    name: "Elite",
    price: "Custom",
    period: "",
    tagline: "Enterprise, multi-venue, and broadcast-level operations.",
    cta: "Contact Sales",
    href: "mailto:hello@slate360.io",
    features: [
      "Everything in Pro",
      "White-label options",
      "Unlimited team members",
      "Unlimited storage",
      "Dedicated engineer",
      "Custom integrations",
      "SLA guarantee",
      "Onboarding support",
    ],
  },
];

const faqs = [
  {
    q: "Is there a free trial?",
    a: "Yes — every Starter and Pro plan includes a 14-day free trial. No credit card required to get started.",
  },
  {
    q: "Can I change plans later?",
    a: "Absolutely. Upgrade, downgrade, or cancel anytime from your account settings. Changes take effect at the next billing cycle.",
  },
  {
    q: "What counts as a project?",
    a: "A project is any campaign, event, or content collection in your Project Hub. Drafts, archived, and active jobs each count separately.",
  },
  {
    q: "What payment methods do you accept?",
    a: "We accept all major credit and debit cards via Stripe. Enterprise customers can also pay by invoice.",
  },
];

export default function PlansPage() {
  return (
    <div className="bg-black min-h-screen text-white">
      <Navbar />

      {/* Hero */}
      <section className="pt-36 pb-20 px-6 md:px-8 text-center">
        <div className="max-w-2xl mx-auto">
          <span
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: "#FF4D00" }}
          >
            Pricing
          </span>
          <h1 className="mt-4 text-5xl md:text-7xl font-black tracking-tight">
            Simple, honest pricing.
          </h1>
          <p className="mt-6 text-white/50 text-xl leading-relaxed">
            Start free. Scale when you&apos;re ready. No surprise fees.
          </p>
        </div>
      </section>

      {/* Plans */}
      <section className="py-8 pb-28 px-6 md:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative p-8 rounded-2xl border flex flex-col gap-8 ${
                plan.featured
                  ? "border-[#FF4D00] bg-[#FF4D00]/[0.06] md:scale-[1.03]"
                  : "border-white/10 bg-white/[0.02]"
              }`}
            >
              {plan.featured && (
                <span
                  className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-semibold tracking-widest uppercase"
                  style={{ backgroundColor: "#FF4D00", color: "#fff" }}
                >
                  Most Popular
                </span>
              )}

              <div>
                <h2 className="text-2xl font-bold">{plan.name}</h2>
                <p className="text-white/40 text-sm mt-1">{plan.tagline}</p>
              </div>

              <div className="text-5xl font-black">
                {plan.price}
                <span className="text-lg font-normal text-white/40">
                  {plan.period}
                </span>
              </div>

              <ul className="space-y-3">
                {plan.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-3 text-sm text-white/70"
                  >
                    <Check
                      size={16}
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
                style={plan.featured ? { backgroundColor: "#FF4D00", color: "#fff" } : {}}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 px-6 md:px-8 bg-zinc-950/50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold mb-12 text-center">
            Frequently asked questions
          </h2>
          <div className="flex flex-col gap-8">
            {faqs.map((item) => (
              <div key={item.q} className="border-b border-white/10 pb-8">
                <h3 className="text-lg font-semibold mb-3">{item.q}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
