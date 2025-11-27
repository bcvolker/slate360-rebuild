import Footer from "@/components/ui/Footer";
import PageShell from "@/components/ui/PageShell";
import GlassCard from "@/components/ui/GlassCard";

export default function Privacy() {
  return (
    <PageShell variant="light" maxWidth="6xl" footer={<Footer />}>
      <GlassCard variant="graphite" className="px-6 py-10 sm:px-10 sm:py-12 lg:px-14 lg:py-14">
            
            <div className="relative z-10 flex flex-col gap-8 max-w-4xl">
              <header>
                <p className="mb-3 text-[11px] font-orbitron uppercase tracking-[0.35em] text-blue-600">
                  Trust Center
                </p>
                <h1 className="text-3xl md:text-4xl font-orbitron font-semibold tracking-tight text-slate-900 mb-3">
                  Privacy Policy
                </h1>
                <p className="text-sm sm:text-base text-slate-600">
                  Your data is your work product. We treat it accordingly—no selling, limited retention, and controls that match how project teams actually operate.
                </p>
              </header>

              <div className="space-y-6 text-sm sm:text-base text-slate-600">
                <section>
                  <h2 className="text-base sm:text-lg font-orbitron font-semibold text-slate-900 mb-2">What we collect</h2>
                  <p>
                    We collect account details (like name, email, organization), usage data (how features are used), and project content you choose to upload (files, models, images, scans).
                  </p>
                </section>

                <section>
                  <h2 className="text-base sm:text-lg font-orbitron font-semibold text-slate-900 mb-2">How we use it</h2>
                  <p>
                    We use data to provide and improve Slate360—from rendering 3D views and 360 tours to sending critical status emails. We don&apos;t sell your data to third parties.
                  </p>
                </section>

                <section>
                  <h2 className="text-base sm:text-lg font-orbitron font-semibold text-slate-900 mb-2">Retention and deletion</h2>
                  <p>
                    You can request deletion of projects or your entire workspace. We may retain limited logs and backups for a short period to meet legal, security, and billing obligations.
                  </p>
                </section>

                <section>
                  <h2 className="text-base sm:text-lg font-orbitron font-semibold text-slate-900 mb-2">Contact</h2>
                  <p>
                    Questions about privacy or data handling?
                    {" "}
                    <a
                      href="mailto:privacy@slate360.com"
                      className="font-medium text-blue-600 underline-offset-2 hover:text-[#B37031] hover:underline"
                    >
                      privacy@slate360.com
                    </a>
                  </p>
                </section>
              </div>
            </div>
      </GlassCard>
    </PageShell>
  );
}

