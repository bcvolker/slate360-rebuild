import Footer from "@/components/ui/Footer";

export default function CookiesPage() {
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
                  Cookie Policy
                </h1>
                <p className="text-sm sm:text-base text-[color:var(--slate-surface-light)]">
                  We use cookies and similar technologies to keep you signed in, remember preferences, and understand how Slate360 is used so we can improve it.
                </p>
              </header>

              <div className="space-y-6 text-sm sm:text-base text-[color:var(--slate-surface-light)]">
                <section>
                  <h2 className="text-base sm:text-lg font-orbitron font-semibold text-white mb-2">Types of cookies</h2>
                  <p>
                    We use strictly necessary cookies (for login and security), functional cookies (preferences and layout), and limited analytics cookies to understand usage patterns. We don&apos;t use cookies to sell your data.
                  </p>
                </section>

                <section>
                  <h2 className="text-base sm:text-lg font-orbitron font-semibold text-white mb-2">Your choices</h2>
                  <p>
                    You can control cookies via your browser settings. Disabling some cookies may affect core functionality like staying signed in or loading large models.
                  </p>
                </section>

                <section>
                  <h2 className="text-base sm:text-lg font-orbitron font-semibold text-white mb-2">Contact</h2>
                  <p>
                    Questions about cookies or tracking?
                    {" "}
                    <a
                      href="mailto:cookies@slate360.ai"
                      className="font-medium text-[#4F89D4] underline-offset-2 hover:text-[#B37031] hover:underline"
                    >
                      cookies@slate360.ai
                    </a>
                    .
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
