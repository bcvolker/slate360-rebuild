import Link from "next/link";
import { ClipboardList, PlayCircle } from "lucide-react";

export default function SiteWalksPage() {
  return (
    <main className="min-h-[calc(100vh-160px)] bg-slate-50 px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-5">
        <section className="rounded-3xl border border-slate-300 bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-800">Active walks</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">Walk sessions</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-700">
            This workspace will list active, draft, and recently completed sessions as resume behavior expands.
          </p>
        </section>

        <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
          <ClipboardList className="mx-auto h-8 w-8 text-blue-800" />
          <h2 className="mt-3 font-black">No walk sessions loaded yet</h2>
          <p className="mx-auto mt-1 max-w-xl text-sm leading-6 text-slate-600">
            The route is live and ready for real data. Start with the capture shell while session lists are connected.
          </p>
          <Link href="/site-walk/capture" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-black text-white hover:bg-blue-800">
            <PlayCircle className="h-4 w-4" /> Open capture shell
          </Link>
        </section>
      </div>
    </main>
  );
}
