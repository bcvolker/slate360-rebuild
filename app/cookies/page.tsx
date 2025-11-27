import Footer from "@/components/ui/Footer";
import PageShell from "@/components/ui/PageShell";
import GlassCard from "@/components/ui/GlassCard";

export default function CookiesPage() {
  return (
    <PageShell variant="light" maxWidth="6xl" footer={<Footer />}>
      <GlassCard variant="graphite" className="px-6 py-10 sm:px-10 sm:py-12 lg:px-14 lg:py-14">
            
            <div className="relative z-10 flex flex-col gap-8 max-w-4xl">
              <header>
                <p className="mb-3 text-[11px] font-orbitron uppercase tracking-[0.35em] text-blue-600">
                  Trust Center
                </p>
                <h1 className="text-3xl md:text-4xl font-orbitron font-semibold tracking-tight text-slate-900 mb-3">
                  Cookie Policy
                </h1>
                <p className="text-sm sm:text-base text-slate-600">
                  We use cookies and similar technologies to keep you signed in, remember preferences, and understand how Slate360 is used so we can improve it.
                </p>
              </header>

              <div className="space-y-6 text-sm sm:text-base text-slate-600">
                <section>
                  <h2 className="text-base sm:text-lg font-orbitron font-semibold text-slate-900 mb-2">Types of cookies</h2>
                  <p>
                    We use strictly necessary cookies (for login and security), functional cookies (preferences and layout), and limited analytics cookies to understand usage patterns. We don&apos;t use cookies to sell your data.
                  </p>
                </section>

                <section>
                  <h2 className="text-base sm:text-lg font-orbitron font-semibold text-slate-900 mb-2">Your choices</h2>
                  <p>
                    You can control cookies via your browser settings. Disabling some cookies may affect core functionality like staying signed in or loading large models.
                  </p>
                </section>

                <section>
                  <h2 className="text-base sm:text-lg font-orbitron font-semibold text-slate-900 mb-2">Contact</h2>
                  <p>
                    Questions about cookies or tracking?
                    {" "}
                    <a
                      href="mailto:cookies@slate360.ai"
                      className="font-medium text-blue-600 underline-offset-2 hover:text-[#B37031] hover:underline"
                    >
                      cookies@slate360.ai
                    </a>
                    .
                  </p>
                </section>
              </div>
            </div>
      </GlassCard>
    </PageShell>
  );
}
