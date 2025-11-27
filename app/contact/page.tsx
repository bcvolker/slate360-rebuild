import PageShell from "@/components/ui/PageShell";

export default function ContactPage() {
  return (
    <PageShell maxWidth="6xl" variant="graphite" className="p-0">
      <div className="relative z-10 grid gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] items-start">
        <div className="w-full min-h-[60vh] rounded-2xl border border-white/50 bg-white/80 backdrop-blur-md shadow-sm p-8 md:p-12 text-slate-800">
          <p className="mb-3 text-xs font-orbitron font-bold uppercase tracking-[0.35em] text-blue-600">
                  Contact
                </p>
                <h1 className="text-3xl md:text-4xl font-orbitron font-semibold tracking-tight text-slate-900 mb-3">
                  Contact Slate360
                </h1>
                <p className="text-sm sm:text-base text-slate-700 mb-8 max-w-xl">
                  Have a question about plans, workflows, or early access? Send us a note and we&apos;ll follow up with something actually useful—not a generic drip sequence.
                </p>

                  <form className="space-y-5 text-sm text-slate-700">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-orbitron uppercase tracking-[0.25em] text-slate-500">
                        Name
                      </label>
                      <input
                        type="text"
                        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 placeholder-slate-400"
                        placeholder="Alex Jensen"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-orbitron uppercase tracking-[0.25em] text-slate-500">
                        Organization
                      </label>
                      <input
                        type="text"
                        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 placeholder-slate-400"
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
                        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 placeholder-slate-400"
                        placeholder="you@company.com"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-orbitron uppercase tracking-[0.25em] text-slate-500">
                        What best describes you?
                      </label>
                      <select className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30">
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
                      className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 placeholder-slate-400"
                      placeholder="Share a quick snapshot of your projects or questions."
                    />
                  </div>

                  <button
                    type="submit"
                    className="inline-flex items-center justify-center rounded-full border border-transparent bg-blue-600 px-6 py-2.5 text-[11px] font-orbitron font-semibold uppercase tracking-[0.3em] text-white shadow-lg transition hover:bg-blue-700 hover:shadow-xl"
                  >
                    Send Message
                  </button>
                </form>
        </div>

        <aside className="space-y-6 rounded-2xl border border-slate-200 bg-slate-50/90 p-5 sm:p-6 shadow-sm">
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
    </PageShell>
  );
}
