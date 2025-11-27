import Footer from "@/components/ui/Footer";
import PageShell from "@/components/ui/PageShell";
import GlassCard from "@/components/ui/GlassCard";

export default function Terms() {
  return (
    <PageShell variant="light" maxWidth="6xl" footer={<Footer />}>
      <GlassCard variant="graphite" className="px-6 py-10 sm:px-10 sm:py-12 lg:px-14 lg:py-14">
            
            <div className="relative z-10 flex flex-col gap-8 max-w-4xl">
              <header>
                <p className="mb-3 text-[11px] font-orbitron uppercase tracking-[0.35em] text-blue-600">
                  Trust Center
                </p>
                <h1 className="text-3xl md:text-4xl font-orbitron font-semibold tracking-tight text-slate-900 mb-3">
                  Terms of Service
                </h1>
                <p className="text-sm sm:text-base text-slate-600">
                  Effective September 19, 2025. By using Slate360, you agree to these terms. We provide SaaS for AEC; you must comply with laws.
                </p>
              </header>

              <div className="space-y-6 text-sm sm:text-base text-slate-600">
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
                    We can suspend for violations; contact <a href="mailto:terms@slate360.com" className="font-medium text-blue-600 underline-offset-2 hover:text-[#B37031] hover:underline">terms@slate360.com</a> for questions.
                  </p>
                </section>
              </div>
            </div>
      </GlassCard>
    </PageShell>
  );
}
