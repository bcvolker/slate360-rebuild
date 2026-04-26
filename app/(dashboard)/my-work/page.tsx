import Link from "next/link";
import { ClipboardCheck, FolderOpen, MessageSquare, Plus, Search } from "lucide-react";

export const metadata = {
  title: "My Work — Slate360",
};

const WORK_BUCKETS = [
  {
    label: "Assigned to me",
    description: "Tasks, walk items, and reviews that need your response.",
  },
  {
    label: "Created by me",
    description: "Work you assigned, requested, or started and need to track.",
  },
  {
    label: "Due soon",
    description: "Upcoming follow-ups, approvals, reports, and project actions.",
  },
] as const;

export default function MyWorkPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
      <section className="rounded-3xl border border-slate-300 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-700">My Work</p>
        <h1 className="mt-2 text-2xl font-black text-slate-950 sm:text-3xl">Tasks, to-dos, and reviews</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          One place for work assigned to you, work you assigned to others, self to-dos, and due-soon follow-ups.
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        {WORK_BUCKETS.map((bucket) => (
          <div key={bucket.label} className="rounded-3xl border border-slate-300 bg-white p-4 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
              <ClipboardCheck className="h-5 w-5" />
            </div>
            <h2 className="mt-4 text-sm font-black text-slate-950">{bucket.label}</h2>
            <p className="mt-1 text-xs leading-5 text-slate-600">{bucket.description}</p>
          </div>
        ))}
      </section>

      <section className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center">
        <ClipboardCheck className="mx-auto h-7 w-7 text-slate-400" />
        <p className="mt-3 text-sm font-bold text-slate-800">No active work yet</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-slate-600">
          As Site Walk items, project tasks, approvals, and deliverable reviews are assigned or created, they will appear here.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Link href="/projects" className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-900 hover:border-blue-600">
            <FolderOpen className="h-4 w-4" /> Open Projects
          </Link>
          <Link href="/coordination" className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-900 hover:border-blue-600">
            <MessageSquare className="h-4 w-4" /> Coordination
          </Link>
          <Link href="/dashboard" className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700">
            <Plus className="h-4 w-4" /> Quick Start
          </Link>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-300 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3 text-sm text-slate-600">
          <Search className="h-4 w-4 text-blue-700" />
          Use the top search icon or Command Palette to jump directly to apps, files, projects, contacts, and settings.
        </div>
      </section>
    </div>
  );
}
