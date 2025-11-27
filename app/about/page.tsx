import Footer from "@/components/ui/Footer";

export default function AboutPage(){
  return (
    <>
      <main className="min-h-[100dvh] px-6 py-24 md:py-28 bg-graphite">
        <div className="mx-auto max-w-6xl">
          <section className="relative overflow-hidden rounded-[32px] border border-slate-200/60 bg-white/90 backdrop-blur-md shadow-xl px-6 py-10 sm:px-10 sm:py-12 lg:px-14 lg:py-14">
            
            <div className="relative z-10 flex flex-col gap-10">
              <header className="max-w-3xl">
                <p className="mb-3 text-xs font-orbitron font-bold uppercase tracking-[0.35em] text-blue-600 drop-shadow-sm">
                  Company
                </p>
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-orbitron font-semibold tracking-tight text-slate-900 mb-3">
                  About Slate360
                </h1>
                <p className="max-w-2xl text-sm sm:text-base text-slate-600">
                  We&apos;re building a single, visual home for how the built world gets delivered—where scans, docs, and decisions stay in sync.
                </p>
              </header>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start text-sm sm:text-base text-slate-600">
            <div className="space-y-8 text-sm sm:text-base text-slate-600">
              <section>
                <h2 className="text-xl sm:text-2xl font-orbitron font-semibold text-blue-600 mb-3">
                  Our Mission
                </h2>
                <p>
                  Slate360 empowers built environment professionals—from contractors and realtors to universities and drone pilots—to bridge
                  administrative chaos and visual workflows in one secure platform. We turn raw data (LiDAR scans, 360 photos, project docs)
                  into actionable insights, designed to streamline multiple tools.
                </p>
              </section>

              <section>
                <h2 className="text-xl sm:text-2xl font-orbitron font-semibold text-blue-600 mb-3">
                  Who We Serve
                </h2>
                <p>
                  General contractors managing multi-site chaos, government teams tracking capital projects, trade partners needing quick 360 tours,
                  owners&apos; reps analyzing risks, and design teams visualizing models. Whether you&apos;re a solo freelancer, enterprise with 50+ users,
                  or student testing drone missions, Slate360 scales with you—individual profiles for quick setups, RBAC for teams.
                </p>
              </section>
            </div>

            <div className="space-y-6">
              <section>
                <h2 className="text-xl sm:text-2xl font-orbitron font-semibold text-slate-900 mb-3">
                  Why We Built It
                </h2>
                <p>
                  From years in construction project management and drone tech education, we&apos;ve seen siloed apps slow decisions and inflate costs.
                  Slate360 is the unified hub we needed: Admin docs flow to geospatial plans, models to virtual tours—all with AI toggles
                  (verify results; we&apos;re not liable for errors) and open exports (no lock-in).
                </p>
              </section>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg sm:text-xl font-orbitron font-semibold text-slate-900 mb-2">
                  What Sets Us Apart
                </h3>
                <ul className="space-y-2 text-sm text-slate-700">
                  <li>• Field + office sync: Offline uploads auto-file on reconnect.</li>
                  <li>• Physical-to-virtual: Scans to explorable views, no extra subs.</li>
                  <li>• Your data, your rules: Export anytime; we retain only for service (delete on request).
                  </li>
                  <li>• Transparent AI: Toggle features with disclaimers—built for real workflows.</li>
                </ul>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg sm:text-xl font-orbitron font-semibold text-slate-900 mb-2">
                  Roadmap
                </h3>
                <p className="text-sm text-slate-700 mb-3">
                  Early access: Core hubs (Project Hub, Design Studio, 360 Tour Builder, Analytics). Next: Full AI automation, Athlete 360 add-on,
                  and a mobile app for missions.
                </p>
                <ul className="space-y-1 text-xs text-slate-600">
                  <li>• Q4 2025: Beta launch + tiers.</li>
                  <li>• Q1 2026: Enterprise RBAC + integrations.</li>
                </ul>
              </div>
            </div>
              </div>

              <div className="text-center md:text-left mt-2">
                <a
                  href="/subscribe"
                  className="inline-flex items-center justify-center rounded-full border border-transparent bg-blue-600 px-8 py-3 text-sm sm:text-base font-orbitron font-semibold uppercase tracking-[0.3em] text-white shadow-lg transition hover:bg-blue-700 hover:shadow-xl"
                >
                  Join Early Access
                </a>
              </div>
            </div>
          </section>
        </div>
      </main>
      <Footer variant="light" />
    </>
  );
}
