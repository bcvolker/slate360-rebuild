import Footer from "@/components/ui/Footer";

export default function SecurityPage() {
  return (
    <>
      <main className="min-h-[100dvh] px-6 py-24 md:py-28 bg-slate-50 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]">
        <div className="mx-auto max-w-6xl">
          <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white/80 backdrop-blur-md shadow-sm px-6 py-10 sm:px-10 sm:py-12 lg:px-14 lg:py-14">
            
            <div className="relative z-10 flex flex-col gap-8 max-w-4xl">
              <header>
                <p className="mb-3 text-[11px] font-orbitron uppercase tracking-[0.35em] text-slate-500">
                  Trust Center
                </p>
                <h1 className="text-3xl md:text-4xl font-orbitron font-semibold tracking-tight text-slate-900 mb-3">
                  Security Overview
                </h1>
                <p className="text-sm sm:text-base text-slate-700">
                  Slate360 is built for teams who ship real projects. Security, access control, and data separation are part of the product surface—not an afterthought.
                </p>
              </header>

              <div className="space-y-6 text-sm sm:text-base text-slate-800">
                <section>
                  <h2 className="text-base sm:text-lg font-orbitron font-semibold text-slate-900 mb-2">Infrastructure & isolation</h2>
                  <p>
                    We run on modern cloud infrastructure with strong isolation between workspaces. Access to environments is restricted to a small, audited team.
                  </p>
                </section>

                <section>
                  <h2 className="text-base sm:text-lg font-orbitron font-semibold text-slate-900 mb-2">Access & roles</h2>
                  <p>
                    Role-based access controls help ensure the right people see the right projects. Admins can manage seats, roles, and invitations from within the product.
                  </p>
                </section>

                <section>
                  <h2 className="text-base sm:text-lg font-orbitron font-semibold text-slate-900 mb-2">Data protection</h2>
                  <p>
                    Data in transit is protected with modern TLS. At-rest encryption and backups are used to reduce risk from hardware failures and recovery scenarios.
                  </p>
                </section>

                <section>
                  <h2 className="text-base sm:text-lg font-orbitron font-semibold text-slate-900 mb-2">Contact</h2>
                  <p>
                    For security questions, responsible disclosure, or vendor questionnaires, contact
                    {" "}
                    <a
                      href="mailto:security@slate360.ai"
                      className="font-medium text-[#4F89D4] underline-offset-2 hover:text-[#B37031] hover:underline"
                    >
                      security@slate360.ai
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
