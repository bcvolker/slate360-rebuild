import Footer from "@/components/ui/Footer";

export default function CookiesPage() {
  return (
    <>
      <main className="min-h-[100dvh] px-6 py-24 md:py-28 bg-blueprint-dark">
        <div className="mx-auto max-w-6xl">
          <section className="relative overflow-hidden rounded-3xl border border-brand-blue/20 bg-white shadow-[0_26px_80px_rgba(15,23,42,0.55)] px-6 py-10 sm:px-10 sm:py-12 lg:px-14 lg:py-14">
            
            <div className="relative z-10 flex flex-col gap-8 max-w-4xl">
              <header>
                <p className="mb-3 text-[11px] font-orbitron uppercase tracking-[0.35em] text-slate-500">
                  Trust Center
                </p>
                <h1 className="text-3xl md:text-4xl font-orbitron font-semibold tracking-tight text-slate-900 mb-3">
                  Cookie Policy
                </h1>
                <p className="text-sm sm:text-base text-slate-700">
                  We use cookies and similar technologies to keep you signed in, remember preferences, and understand how Slate360 is used so we can improve it.
                </p>
              </header>

              <div className="space-y-6 text-sm sm:text-base text-slate-800">
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
                      className="font-medium text-brand-blue underline-offset-2 hover:text-brand-copper hover:underline"
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
      <Footer />
    </>
  );
}
