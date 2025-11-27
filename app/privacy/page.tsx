import Footer from "@/components/ui/Footer";

export default function Privacy() {
  return (
    <>
      <main className="snap-start min-h-[100dvh] px-6 py-24 md:py-28 bg-slate-50 bg-[linear-gradient(to_right,rgba(0,0,0,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.05)_1px,transparent_1px)] bg-[size:40px_40px]">
        <div className="mx-auto max-w-6xl">
          <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white/80 backdrop-blur-md shadow-xl px-6 py-10 sm:px-10 sm:py-12 lg:px-14 lg:py-14">
            
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
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}

