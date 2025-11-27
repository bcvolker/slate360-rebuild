import PageShell from "@/components/ui/PageShell";

export default function CookiesPage() {
  return (
    <PageShell maxWidth="3xl" variant="graphite" className="pt-32 pb-48">
      
        <section className="w-full">
        <header className="mb-8">
          <p className="mb-3 text-[11px] font-orbitron uppercase tracking-[0.35em] text-blue-600">
            Trust Center
          </p>
          <h1 className="text-3xl md:text-4xl font-orbitron font-semibold tracking-tight text-slate-900 mb-3">
            Cookie Policy
          </h1>
          <p className="text-sm sm:text-base">
            We use cookies and similar technologies to keep you signed in, remember preferences, and understand how Slate360 is used so we can improve it.
          </p>
        </header>

        <div className="space-y-6 text-sm sm:text-base">
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
      </section>
    </PageShell>
  );
}
