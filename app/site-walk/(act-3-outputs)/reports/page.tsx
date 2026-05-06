import Link from "next/link";
import { Blocks, FileText, Plus } from "lucide-react";
import GlassCard from "@/components/shared/GlassCard";

export const metadata = {
  title: "Site Walk Reports — Slate360",
};

export default function SiteWalkReportsPage() {
  return (
    <main className="min-h-[calc(100dvh-160px)] overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.07),transparent_34%),#0B0F15] px-4 py-4 pb-24 text-slate-50 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-4">
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
                <h2 className="text-lg font-black text-white">Dynamic builder</h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  The next build connects selected walks, plan sheets, photos, and issue tables into reusable report blocks.
                </p>
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <BuilderStep label="1" title="Select walks" />
              <BuilderStep label="2" title="Choose blocks" />
              <BuilderStep label="3" title="Review photos" />
              <BuilderStep label="4" title="Export / share" />
            </div>
          </GlassCard>

          <GlassCard className="p-5">
            <FileText className="h-6 w-6 text-amber-400" />
            <h2 className="mt-4 text-lg font-black text-white">Existing deliverables</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Generated walk deliverables remain available while the new block builder is wired.
            </p>
            <Link href="/site-walk/deliverables" className="mt-5 inline-flex min-h-10 items-center rounded-2xl border border-white/10 px-4 text-sm font-black text-slate-200 transition hover:border-amber-400/60 hover:text-amber-200">
              Open deliverables
            </Link>
          </GlassCard>
        </div>
      </div>
    </main>
  );
}

function BuilderStep({ label, title }: { label: string; title: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-amber-500 text-xs font-black text-slate-950">{label}</span>
      <p className="mt-3 text-sm font-black text-slate-100">{title}</p>
    </div>
  );
}
