const plans = [
  {
    name: "Starter",
    price: "$49",
    highlight: false,
    description: "For individuals exploring Slate360 on real projects.",
    features: [
      "Single user",
      "Project Hub access",
      "Simple progress snapshots",
      "Email support",
    ],
  },
  {
    name: "Team",
    price: "$99",
    highlight: false,
    description: "For small project teams and boutique studios.",
    features: [
      "Up to 3 users",
      "Project Hub + task lanes",
      "Baseline analytics",
      "Standard support",
    ],
  },
  {
    name: "Studio",
    price: "$199",
    highlight: false,
    description: "For studios managing multiple active projects.",
    features: [
      "Up to 8 users",
      "BIM Studio previews",
      "Reporting templates",
      "Priority support window",
    ],
  },
  {
    name: "Firm",
    price: "$299",
    highlight: true,
    description: "Best for growing firms standardizing delivery.",
    features: [
      "Up to 20 users",
      "Advanced analytics & trends",
      "Portfolio-level dashboards",
      "Scheduled exports",
    ],
  },
  {
    name: "Pro",
    price: "$499",
    highlight: false,
    description: "For high-volume teams and complex programs.",
    features: [
      "Up to 40 users",
      "API access (beta)",
      "Advanced permissions",
      "Dedicated onboarding",
    ],
  },
];

import Footer from "@/components/ui/Footer";

export default function SubscribePage() {
  return (
    <>
      <main className="min-h-screen w-full bg-slate-50 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]">
        <div className="mx-auto max-w-6xl">
          <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white/80 backdrop-blur-md shadow-sm px-6 py-10 sm:px-10 sm:py-12 lg:px-14 lg:py-14">
            
            <div className="relative z-10 flex flex-col gap-8">
              <div className="text-center max-w-3xl mx-auto">
                <p className="mb-3 text-xs font-orbitron font-bold uppercase tracking-[0.35em] text-[color:var(--slate360-copper)] drop-shadow-sm">
                  Pricing &amp; Access
                </p>
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-orbitron tracking-tight text-slate-900 mb-4">
                  Plans &amp; Pricing
                </h1>
                <p className="text-sm md:text-base text-slate-600 max-w-2xl mx-auto">
                  Choose a plan that matches how your teams actually deliver work. 
                  Start small, scale as you standardize on Slate360.
                </p>
              </div>

              <div className="grid gap-6 md:gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] items-start">
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-2">
                  {plans.map((plan) => (
                    <div
                      key={plan.name}
                      className={`relative flex h-full flex-col rounded-2xl border bg-white/50 p-5 sm:p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md ${
                        plan.highlight
                          ? "border-[#B37031]/70 shadow-md"
                          : "border-slate-200/80"
                      }`}
                    >
                      {plan.highlight && (
                        <span className="absolute right-4 top-4 rounded-full bg-[#B37031]/90 px-3 py-1 text-[10px] font-orbitron font-semibold uppercase tracking-[0.2em] text-white">
                          Most Popular
                        </span>
                      )}
                      <div className="mb-3">
                        <h2 className="text-lg font-orbitron tracking-wide text-slate-900">
                          {plan.name}
                        </h2>
                        <p className="mt-1 text-xs text-slate-500">{plan.description}</p>
                      </div>
                      <div className="mb-4 flex items-baseline gap-1">
                        <span className="text-3xl font-semibold text-slate-900">
                          {plan.price}
                        </span>
                        <span className="text-xs uppercase tracking-[0.25em] text-slate-500">
                          /month
                        </span>
                      </div>
                      <ul className="mb-5 flex-1 space-y-1.5 text-xs text-slate-600">
                        {plan.features.map((feature) => (
                          <li key={feature} className="flex items-start gap-2">
                            <span className="mt-[2px] inline-flex h-3 w-3 flex-shrink-0 items-center justify-center rounded-full bg-[#4F89D4]/10 text-[9px] text-[#4F89D4]">
                              •
                            </span>
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                      <button className="inline-flex items-center justify-center rounded-full border border-[#4F89D4]/60 bg-[#4F89D4]/5 px-4 py-2 text-[11px] font-orbitron font-semibold uppercase tracking-[0.25em] text-[#4F89D4] transition-colors hover:border-[#B37031] hover:bg-[#B37031]/10 hover:text-[#B37031]">
                        Get Started
                      </button>
                    </div>
                  ))}
                </div>

                <aside className="flex flex-col gap-5 rounded-2xl border border-slate-200/80 bg-slate-50/50 p-5 sm:p-6 shadow-sm">
                  <div>
                    <h2 className="text-sm font-orbitron uppercase tracking-[0.3em] text-[#B37031] mb-2">
                      Enterprise &amp; Programs
                    </h2>
                    <p className="text-2xl font-orbitron tracking-tight text-slate-900 mb-1">
                      Enterprise
                    </p>
                    <p className="text-sm text-slate-600 mb-3">
                      For larger organizations, multi-region programs, and highly customized workflows.
                    </p>
                    <p className="text-xs text-slate-500 mb-4">
                      Pricing is tailored based on number of teams, integrations, and rollout complexity. 
                      We work closely with you to design a rollout that actually lands.
                    </p>
                    <div className="rounded-xl border border-dashed border-slate-300/80 bg-white/50 p-4">
                      <p className="text-xs text-slate-600 mb-3">
                        Share a bit about your portfolio and we&apos;ll follow up with a short working session.
                      </p>
                      <a
                        href="mailto:support@slate360.ai?subject=Slate360%20Enterprise%20Pricing"
                        className="inline-flex items-center justify-center rounded-full border border-[#B37031]/70 bg-[#B37031]/10 px-4 py-2 text-[11px] font-orbitron font-semibold uppercase tracking-[0.25em] text-[#B37031] transition-colors hover:bg-[#B37031]/20"
                      >
                        Talk to us about Enterprise
                      </a>
                    </div>
                  </div>

                  <div className="pt-1 border-t border-slate-200/70 mt-2">
                    <h3 className="text-xs font-orbitron uppercase tracking-[0.3em] text-slate-500 mb-2">
                      Early Access Details
                    </h3>
                    <ul className="space-y-1.5 text-xs text-slate-600">
                      <li>No long-term contracts during early access.</li>
                      <li>Cancel anytime; you&apos;re billed month-to-month.</li>
                      <li>We&apos;ll review pricing and packaging before general release.</li>
                    </ul>
                  </div>
                </aside>
              </div>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
