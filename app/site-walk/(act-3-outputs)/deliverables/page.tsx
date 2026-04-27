import Link from "next/link";
import { ExternalLink, FileText, Presentation } from "lucide-react";

export default function SiteWalkDeliverablesPage() {
  return (
    <main className="min-h-[calc(100vh-160px)] bg-slate-50 px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-5">
        <section className="rounded-3xl border border-slate-300 bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-800">Deliverables</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">Deliverables</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-700">
            This route is the future home for hosted previews, client reviews, cinematic presentations, PDF exports, and email snapshots. Prompt 12 begins normalized deliverable building.
          </p>
        </section>

        <section className="grid gap-3 md:grid-cols-3">
          {[
            { title: "Hosted preview", text: "Interactive link with thumbnails, navigation, and response sidebar.", icon: ExternalLink },
            { title: "PDF/email", text: "Attachment, inline images, and immutable email snapshots.", icon: FileText },
            { title: "Presentation", text: "Dark cinematic mode for guided client reviews.", icon: Presentation },
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

        <Link href="/site-walk" className="inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-900 hover:border-blue-300 hover:text-blue-800">
          Back to Site Walk
        </Link>
      </div>
    </main>
  );
}
