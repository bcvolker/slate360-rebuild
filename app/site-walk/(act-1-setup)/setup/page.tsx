import Link from "next/link";
import { ArrowRight, Building2, MapPin, Users } from "lucide-react";

export default function SiteWalkSetupPage() {
  return (
    <main className="min-h-[calc(100vh-160px)] bg-slate-50 px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-5">
        <section className="rounded-3xl border border-slate-300 bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-800">Act 1 setup</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">Field project setup</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-700">
            This route is the Act 1 home for company identity, location, stakeholders, and deliverable defaults. Detailed forms are wired in Prompt 3 after the metering and shell safeguards are complete.
          </p>
        </section>

        <section className="grid gap-3 md:grid-cols-3">
          {[
            { title: "Identity", text: "Company logo, brand color, address, and signature defaults.", icon: Building2 },
            { title: "Location", text: "Project address, site context, and geofence-ready metadata.", icon: MapPin },
            { title: "Stakeholders", text: "Contacts, recipients, collaborators, and assigned responders.", icon: Users },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className="rounded-2xl border border-slate-300 bg-white p-5 shadow-sm">
                <Icon className="h-5 w-5 text-blue-800" />
                <h2 className="mt-3 font-black">{item.title}</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">{item.text}</p>
              </article>
            );
          })}
        </section>

        <Link href="/site-walk" className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-900 hover:border-blue-300 hover:text-blue-800">
          Back to Site Walk <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </main>
  );
}
