import Link from "next/link";
import { FileUp, Layers3, Map } from "lucide-react";

export default function SiteWalkPlansPage() {
  return (
    <main className="min-h-[calc(100vh-160px)] bg-slate-50 px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-5">
        <section className="rounded-3xl border border-slate-300 bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-800">Master Plan Room</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">Project plan sets</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-700">
            This Act 1 route is reserved for reusable project plan sets and sheets. Prompt 4 wires uploads to `site_walk_plan_sets`, `site_walk_plan_sheets`, and SlateDrop-backed files.
          </p>
        </section>

        <section className="grid gap-3 md:grid-cols-3">
          {[
            { title: "Upload plan set", text: "Reserve a SlateDrop file and create plan-set metadata.", icon: FileUp },
            { title: "Review sheets", text: "List rendered sheets, thumbnails, and processing state.", icon: Layers3 },
            { title: "Attach to walk", text: "Choose the primary sheet for a capture session.", icon: Map },
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
