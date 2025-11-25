import Footer from "@/components/ui/Footer";

export default function ContactPage() {
  return (
    <>
      <main className="min-h-[100dvh] px-6 py-24 md:py-28">
        <div className="mx-auto max-w-6xl">
          <section className="relative overflow-hidden rounded-3xl border border-brand-blue/20 bg-white/98 shadow-[0_26px_80px_rgba(15,23,42,0.55)] px-6 py-10 sm:px-10 sm:py-12 lg:px-14 lg:py-14">
            <div className="pointer-events-none absolute inset-0 opacity-[0.08]">
              <div className="absolute inset-0 bg-gradient-radial from-brand-blue/30 via-transparent to-transparent" />
              <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.35)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.28)_1px,transparent_1px)] bg-[size:40px_40px]" />
            </div>

            <div className="relative z-10 grid gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] items-start">
              <div>
                <p className="mb-3 text-[11px] font-orbitron uppercase tracking-[0.35em] text-[color:var(--slate360-copper)]">
                  Contact
                </p>
                <h1 className="text-3xl md:text-4xl font-orbitron font-semibold tracking-tight text-slate-900 mb-3">
                  Contact Slate360
                </h1>
                <p className="text-sm sm:text-base text-slate-700 mb-8 max-w-xl">
                  Have a question about plans, workflows, or early access? Send us a note and we&apos;ll follow up with something actually usefulnot a generic drip sequence.
                </p>

                <form className="space-y-5 text-sm text-slate-700">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-orbitron uppercase tracking-[0.25em] text-[color:var(--slate360-blue)]">
                        Name
                      </label>
                      <input
                        type="text"
                        className="rounded-xl border border-slate-300 bg-white/80 px-3 py-2 text-sm text-slate-800 shadow-sm outline-none focus:border-[color:var(--slate360-copper)] focus:ring-2 focus:ring-[color:var(--slate360-copper)]/30"
                        placeholder="Alex Jensen"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-orbitron uppercase tracking-[0.25em] text-[color:var(--slate360-blue)]">
                        Organization
                      </label>
                      <input
                        type="text"
                        className="rounded-xl border border-slate-300 bg-white/80 px-3 py-2 text-sm text-slate-800 shadow-sm outline-none focus:border-[color:var(--slate360-copper)] focus:ring-2 focus:ring-[color:var(--slate360-copper)]/30"
                        placeholder="Studio, GC, university, agency"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-orbitron uppercase tracking-[0.25em] text-slate-500">
                        Email
                      </label>
                      <input
                        type="email"
                        className="rounded-xl border border-slate-300 bg-white/80 px-3 py-2 text-sm text-slate-800 shadow-sm outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/30"
                        placeholder="you@company.com"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-orbitron uppercase tracking-[0.25em] text-slate-500">
                        What best describes you?
                      </label>
                      <select className="rounded-xl border border-slate-300 bg-white/80 px-3 py-2 text-sm text-slate-800 shadow-sm outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/30">
                        <option>General contractor / construction manager</option>
                        <option>Owner / owner&apos;s rep</option>
                        <option>Design firm / studio</option>
                        <option>University / training program</option>
                        <option>Drone / reality capture provider</option>
                        <option>Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-orbitron uppercase tracking-[0.25em] text-slate-500">
                      How can we help?
                    </label>
                    <textarea
                      rows={4}
                      className="rounded-xl border border-slate-300 bg-white/80 px-3 py-2 text-sm text-slate-800 shadow-sm outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/30"
                      placeholder="Share a quick snapshot of your projects or questions."
                    />
                  </div>

                  <button
                    type="submit"
                    className="inline-flex items-center justify-center rounded-full border border-brand-blue/50 bg-brand-blue/10 px-6 py-2.5 text-[11px] font-orbitron font-semibold uppercase tracking-[0.3em] text-brand-blue shadow-[0_0_18px_rgba(79,137,212,0.25)] transition hover:border-brand-blue hover:bg-brand-blue/20"
                  >
                    Send Message
                  </button>
                </form>
              </div>

              <aside className="space-y-6 rounded-2xl border border-slate-200/80 bg-slate-50/95 p-5 sm:p-6 shadow-[0_18px_40px_rgba(15,23,42,0.2)]">
                <div>
                  <h2 className="text-xs font-orbitron uppercase tracking-[0.3em] text-slate-500 mb-2">
                    Prefer email?
                  </h2>
                  <p className="text-sm text-slate-700 mb-2">
                    Reach us directly at
                    {" "}
                    <a
                      href="mailto:support@slate360.ai"
                      className="font-medium text-brand-blue underline-offset-2 hover:text-brand-copper hover:underline"
                    >
                      support@slate360.ai
                    </a>
                    {" "}
                    and we&apos;ll get back within one business day.
                  </p>
                </div>

                <div>
                  <h2 className="text-xs font-orbitron uppercase tracking-[0.3em] text-slate-500 mb-2">
                    Early access questions
                  </h2>
                  <p className="text-xs text-slate-600">
                    If you&apos;re part of our early access group, you can reply directly to any onboarding email and it routes straight to the team building Slate360.
                  </p>
                </div>
              </aside>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
