import Link from "next/link";
import { ClipboardCheck, Camera } from "lucide-react";

export default function SiteWalkAssignedWorkPage() {
  return (
    <main className="min-h-[calc(100vh-160px)] bg-slate-50 px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-5">
        <section className="rounded-3xl border border-slate-300 bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-800">Collaborator path</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">Assigned Work</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-700">
            This route separates collaborator proof-of-work from subscriber project creation. Prompt 11 wires project-scoped assignments, permissions, and responses.
          </p>
        </section>

        <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
          <ClipboardCheck className="mx-auto h-8 w-8 text-blue-800" />
          <h2 className="mt-3 font-black">Assigned tasks will appear here</h2>
          <p className="mx-auto mt-1 max-w-xl text-sm leading-6 text-slate-600">
            Collaborators will open assigned items directly into capture for before/after photos, notes, status updates, and proof submission.
          </p>
          <Link href="/site-walk/capture" className="mt-5 inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-900 hover:border-blue-300 hover:text-blue-800">
            <Camera className="h-4 w-4" /> Open capture shell
          </Link>
        </section>
      </div>
    </main>
  );
}
