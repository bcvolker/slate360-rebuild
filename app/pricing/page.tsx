import PageShell from "@/components/ui/PageShell";

export default function PricingPage() {
  return (
    <PageShell variant="navy" maxWidth="6xl">
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white/80 backdrop-blur-md shadow-sm px-6 py-10 sm:px-10 sm:py-12 lg:px-14 lg:py-14">
            <div className="relative z-10 flex flex-col gap-8">
              <div className="text-center max-w-3xl mx-auto">
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-orbitron tracking-tight text-slate-900 mb-4">
                  Pricing Plans
                </h1>
                <p className="text-sm md:text-base text-slate-600 max-w-2xl mx-auto">
                  Flexible plans for individuals and businesses. Data limits apply; extra usage may incur charges.
                </p>
              </div>

              <div className="grid md:grid-cols-4 gap-6">
                {/* Single */}
                <div className="bg-white/50 rounded-2xl p-6 shadow-sm border border-slate-200">
                  <h2 className="text-xl font-orbitron font-bold mb-2 text-slate-900">Single</h2>
                  <p className="text-3xl font-extrabold mb-4 text-[#B37031]">$49<span className="text-sm text-slate-500 font-normal">/mo</span></p>
                  <ul className="text-slate-600 space-y-2 text-sm">
                    <li>✔ Project Hub</li>
                    <li>✔ Basic reports</li>
                  </ul>
                </div>
                {/* Double */}
                <div className="bg-white/50 rounded-2xl p-6 shadow-sm border border-slate-200">
                  <h2 className="text-xl font-orbitron font-bold mb-2 text-slate-900">Double</h2>
                  <p className="text-3xl font-extrabold mb-4 text-[#B37031]">$99<span className="text-sm text-slate-500 font-normal">/mo</span></p>
                  <ul className="text-slate-600 space-y-2 text-sm">
                    <li>✔ Everything in Single</li>
                    <li>✔ 2 users included</li>
                  </ul>
                </div>
                {/* Business */}
                <div className="bg-white/50 rounded-2xl p-6 shadow-md border-2 border-[#B37031]/50 relative">
                  <span className="absolute top-0 right-0 bg-[#B37031] text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg rounded-tr-lg uppercase tracking-wider">Popular</span>
                  <h2 className="text-xl font-orbitron font-bold mb-2 text-slate-900">Business</h2>
                  <p className="text-3xl font-extrabold mb-4 text-[#B37031]">$499<span className="text-sm text-slate-500 font-normal">/mo</span></p>
                  <ul className="text-slate-600 space-y-2 text-sm">
                    <li>✔ Project Hub</li>
                    <li>✔ BIM Studio</li>
                    <li>✔ Reports & Analytics</li>
                  </ul>
                </div>
                {/* Enterprise */}
                <div className="bg-white/50 rounded-2xl p-6 shadow-sm border border-slate-200">
                  <h2 className="text-xl font-orbitron font-bold mb-2 text-slate-900">Enterprise</h2>
                  <p className="text-3xl font-extrabold mb-4 text-[#B37031]">Custom</p>
                  <ul className="text-slate-600 space-y-2 text-sm">
                    <li>✔ Unlimited users</li>
                    <li>✔ White-label branding</li>
                    <li>✔ Dedicated SLA</li>
                  </ul>
                </div>
              </div>
            </div>
      </section>
    </PageShell>
  );
}