import PageShell from "@/components/ui/PageShell";

export default function Privacy() {
  return (
    <PageShell maxWidth="3xl" variant="graphite">
      
        <section className="w-full">
        <header className="mb-8">
          <p className="mb-3 text-[11px] font-orbitron uppercase tracking-[0.35em] text-blue-600">
            Trust Center
          </p>
          <h1 className="text-3xl md:text-4xl font-orbitron font-semibold tracking-tight text-slate-900 mb-3">
            Privacy Policy
          </h1>
          <p className="text-sm sm:text-base">
            Your data is your work product. We treat it accordinglyno selling, limited retention, and controls that match how project teams actually operate.
          </p>
        </header>

        <div className="space-y-6 text-sm sm:text-base">
          <section>
            <h2 className="text-base sm:text-lg font-orbitron font-semibold text-slate-900 mb-2">What we collect</h2>
            <p>
              We collect account details (like name, email, organization), usage data (how features are used), and project content you choose to upload (files, models, images, scans).
            </p>
          </section>

          <section>
            <h2 className="text-base sm:text-lg font-orbitron font-semibold text-slate-900 mb-2">How we use it</h2>
            <p>
              We use data to provide and improve Slate360from rendering 3D views and 360 tours to sending critical status emails. We don&apos;t sell your data to third parties.
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
      </section>
    </PageShell>
  );
}

