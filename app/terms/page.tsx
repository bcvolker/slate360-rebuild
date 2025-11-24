import Footer from "@/components/ui/Footer";

export default function Terms() {
  return (
    <>
      <main className="min-h-[100dvh] px-6 py-24 md:py-28">
        <div className="mx-auto max-w-6xl">
          <section className="relative overflow-hidden rounded-3xl border border-brand-blue/20 bg-white/98 shadow-[0_26px_80px_rgba(15,23,42,0.55)] px-6 py-10 sm:px-10 sm:py-12 lg:px-14 lg:py-14">
            <div className="pointer-events-none absolute inset-0 opacity-[0.08]">
              <div className="absolute inset-0 bg-gradient-radial from-brand-blue/30 via-transparent to-transparent" />
              <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.35)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.28)_1px,transparent_1px)] bg-[size:40px_40px]" />
            </div>

            <div className="relative z-10 flex flex-col gap-8 max-w-4xl">
              <header>
                <p className="mb-3 text-[11px] font-orbitron uppercase tracking-[0.35em] text-slate-500">
                  Trust Center
                </p>
                <h1 className="text-3xl md:text-4xl font-orbitron font-semibold tracking-tight text-slate-900 mb-3">
                  Terms of Service
                </h1>
                <p className="text-sm sm:text-base text-slate-700">
                  Effective September 19, 2025. By using Slate360, you agree to these terms. We provide SaaS for AEC; you must comply with laws.
                </p>
              </header>

              <div className="space-y-6 text-sm sm:text-base text-slate-800">
                <section>
                  <h2 className="text-base sm:text-lg font-orbitron font-semibold text-slate-900 mb-2">1. Account and Use</h2>
                  <p>
                    You must be 18+; no unauthorized access. Subscriptions via PremiumPlus; no refunds after trial.
                  </p>
                </section>

                <section>
                  <h2 className="text-base sm:text-lg font-orbitron font-semibold text-slate-900 mb-2">2. Intellectual Property</h2>
                  <p>
                    We own the platform; your uploads grant us license for processing (e.g., 3D rendering).
                  </p>
                </section>

                <section>
                  <h2 className="text-base sm:text-lg font-orbitron font-semibold text-slate-900 mb-2">3. Limitations</h2>
                  <p>
                    No liability for data loss; service as-is. Disputes in [Jurisdiction].
                  </p>
                </section>

                <section>
                  <h2 className="text-base sm:text-lg font-orbitron font-semibold text-slate-900 mb-2">4. Termination</h2>
                  <p>
                    We can suspend for violations; contact <a href="mailto:terms@slate360.com" className="font-medium text-brand-blue underline-offset-2 hover:text-brand-copper hover:underline">terms@slate360.com</a> for questions.
                  </p>
                </section>
              </div>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
