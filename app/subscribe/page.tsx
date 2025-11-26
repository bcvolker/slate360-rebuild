const plans = [
  {
    name: "Creator Bundle",
    price: "$79",
    highlight: false,
    description: "For creators and field teams capturing the site.",
    features: [
      "Content Studio (Full Suite)",
      "360 Tour Builder",
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
  {
    name: "Enterprise",
    price: "Custom",
    highlight: false,
    description: "For larger organizations requiring custom solutions.",
    features: [
      "SSO",
      "Custom Integrations",
      "Dedicated Success Manager",
    ],
  },
];

import Footer from "@/components/ui/Footer";

export default function SubscribePage() {
  return (
    <>
      <main className="min-h-screen w-full flex items-center justify-center py-24 px-4 sm:px-6 lg:px-8 bg-slate-900 bg-[linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:160px_160px]">
        <div className="w-full max-w-7xl">
          <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white/80 backdrop-blur-md shadow-sm px-6 py-10 sm:px-10 sm:py-12 lg:px-14 lg:py-14">
            
            <div className="relative z-10 flex flex-col gap-8">
              <div className="text-center max-w-3xl mx-auto">
                <p className="mb-3 text-xs font-orbitron font-bold uppercase tracking-[0.35em] text-[color:var(--slate360-copper)] drop-shadow-sm">
                  Pricing &amp; Access
                </p>
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-orbitron tracking-tight text-slate-900 mb-4">
                  Plans &amp; Pricing
                </h1>
                <p className="text-sm md:text-base text-slate-600 max-w-2xl mx-auto mb-2">
                  Choose a plan that matches how your teams actually deliver work. 
                  Start small, scale as you standardize on Slate360.
                </p>
                <p className="text-xs font-bold text-[#B37031] uppercase tracking-widest">
                  Save 20% with yearly billing
                </p>
              </div>

              <div className="grid gap-6 md:gap-8 sm:grid-cols-2 lg:grid-cols-4 items-start">
                {plans.map((plan) => (
                  <div
                    key={plan.name}
                    className={`relative flex h-full flex-col rounded-2xl border bg-white/50 p-5 sm:p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md ${
                      plan.highlight
                        ? "border-[#B37031]/70 shadow-md ring-1 ring-[#B37031]/30"
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
                      <p className="mt-1 text-xs text-slate-500 min-h-[2.5em]">{plan.description}</p>
                    </div>
                    <div className="mb-4 flex items-baseline gap-1">
                      <span className="text-3xl font-semibold text-slate-900">
                        {plan.price}
                      </span>
                      {plan.price !== "Custom" && (
                        <span className="text-xs uppercase tracking-[0.25em] text-slate-500">
                          /month
                        </span>
                      )}
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
                    <button className="inline-flex items-center justify-center rounded-full border border-[#4F89D4]/60 bg-[#4F89D4]/5 px-4 py-2 text-[11px] font-orbitron font-semibold uppercase tracking-[0.25em] text-[#4F89D4] transition-colors hover:border-[#B37031] hover:bg-[#B37031]/10 hover:text-[#B37031] w-full">
                      {plan.price === "Custom" ? "Contact Us" : "Get Started"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
