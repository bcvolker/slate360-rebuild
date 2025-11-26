import Footer from "@/components/ui/Footer";

export default function Terms() {
  return (
    <>
      <main className="snap-start min-h-[100dvh] px-6 py-24 md:py-28 bg-[color:var(--slate-bg-navy)] bg-[linear-gradient(to_right,rgba(107,168,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(107,168,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px]">
        <div className="mx-auto max-w-6xl">
          <section className="relative overflow-hidden rounded-3xl border border-[color:var(--slate-blueprint-soft)]/20 bg-[color:var(--slate-surface-primary)]/80 backdrop-blur-md shadow-2xl px-6 py-10 sm:px-10 sm:py-12 lg:px-14 lg:py-14">
            
            <div className="relative z-10 flex flex-col gap-8 max-w-4xl">
              <header>
                <p className="mb-3 text-[11px] font-orbitron uppercase tracking-[0.35em] text-[color:var(--slate-blueprint-soft)]">
                  Trust Center
                </p>
                <h1 className="text-3xl md:text-4xl font-orbitron font-semibold tracking-tight text-white mb-3">
                  Terms of Service
                </h1>
                <p className="text-sm sm:text-base text-[color:var(--slate-surface-light)]">
                  Effective September 19, 2025. By using Slate360, you agree to these terms. We provide SaaS for AEC; you must comply with laws.
                </p>
              </header>

              <div className="space-y-6 text-sm sm:text-base text-[color:var(--slate-surface-light)]">
                <section>
                  <h2 className="text-base sm:text-lg font-orbitron font-semibold text-white mb-2">1. Account and Use</h2>
                  <p>
                    You must be 18+; no unauthorized access. Subscriptions via PremiumPlus; no refunds after trial.
                  </p>
                </section>

                <section>
                  <h2 className="text-base sm:text-lg font-orbitron font-semibold text-white mb-2">2. Intellectual Property</h2>
                  <p>
                    We own the platform; your uploads grant us license for processing (e.g., 3D rendering).
                  </p>
                </section>

                <section>
                  <h2 className="text-base sm:text-lg font-orbitron font-semibold text-white mb-2">3. Limitations</h2>
                  <p>
                    No liability for data loss; service as-is. Disputes in [Jurisdiction].
                  </p>
                </section>

                <section>
                  <h2 className="text-base sm:text-lg font-orbitron font-semibold text-white mb-2">4. Termination</h2>
                  <p>
                    We can suspend for violations; contact <a href="mailto:terms@slate360.com" className="font-medium text-[color:var(--slate-blueprint-accent)] underline-offset-2 hover:text-[color:var(--slate-copper)] hover:underline">terms@slate360.com</a> for questions.
                  </p>
                </section>
              </div>
            </div>
          </section>
        </div>
      </main>
      <Footer variant="light" />
    </>
  );
}
