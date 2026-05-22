import Link from "next/link";
import { Blocks, FileText, Plus } from "lucide-react";
import GlassCard from "@/components/shared/GlassCard";

export const metadata = {
  title: "Site Walk Reports — Slate360",
};

export default function SiteWalkReportsPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden text-slate-50">
      <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col gap-4 overflow-y-auto px-4 py-4 pb-[max(env(safe-area-inset-bottom),1rem)] no-scrollbar sm:px-6 lg:px-8">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-400">Site Walk</p>
            <h1 className="mt-1 text-2xl font-black text-white">Reports</h1>
          </div>
          <Link href="/site-walk/walks" className="inline-flex min-h-10 w-fit items-center gap-2 rounded-2xl bg-amber-500 px-4 text-sm font-black text-slate-950 transition hover:bg-amber-400">
            <Plus className="h-4 w-4" /> Select Walks
          </Link>
        </header>

        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <GlassCard className="p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-slate-950">
                <Blocks className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h2 className="text-lg font-black text-white">Report builder</h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Select walks from your worksite list, then open deliverables to assemble and share field reports.
                </p>
              </div>
            </div>
            <Link href="/site-walk/walks" className="mt-5 inline-flex min-h-10 w-fit items-center gap-2 rounded-2xl bg-amber-500 px-4 text-sm font-black text-slate-950 transition hover:bg-amber-400">
              Open walks
            </Link>
          </GlassCard>

          <GlassCard className="p-5">
            <FileText className="h-6 w-6 text-amber-400" />
            <h2 className="mt-4 text-lg font-black text-white">Existing deliverables</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              View and share deliverables generated from completed walks.
            </p>
            <Link href="/site-walk/deliverables" className="mt-5 inline-flex min-h-10 items-center rounded-2xl border border-white/10 px-4 text-sm font-black text-slate-200 transition hover:border-amber-400/60 hover:text-amber-200">
              Open deliverables
            </Link>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

