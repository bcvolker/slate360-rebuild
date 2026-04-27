"use client";

import { ChevronDown, FileText } from "lucide-react";
import type { SiteWalkPlanSet, SiteWalkPlanSheet } from "@/lib/types/site-walk";

type Props = {
  planSets: SiteWalkPlanSet[];
  sheets: SiteWalkPlanSheet[];
  activePlanSetId: string | null;
  onSelectPlanSet: (planSetId: string) => void;
};

export function PlanSetList({ planSets, sheets, activePlanSetId, onSelectPlanSet }: Props) {
  return (
    <section className="rounded-3xl border border-slate-300 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-800">Plan sets</p>
          <h2 className="mt-1 text-xl font-black text-slate-900">Uploaded drawing packages</h2>
          <p className="mt-1 text-sm leading-6 text-slate-700">Open a set to review its extracted sheet rows.</p>
        </div>
        <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-black text-slate-700 ring-1 ring-slate-300">{planSets.length} sets</span>
      </div>

      <div className="mt-5 space-y-3">
        {planSets.map((planSet) => {
          const open = planSet.id === activePlanSetId;
          const count = sheets.filter((sheet) => sheet.plan_set_id === planSet.id).length;
          return (
            <article key={planSet.id} className="rounded-2xl bg-slate-50 ring-1 ring-slate-300">
              <button type="button" onClick={() => onSelectPlanSet(planSet.id)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
                <span className="flex min-w-0 items-center gap-3">
                  <FileText className="h-5 w-5 shrink-0 text-blue-700" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-black text-slate-900">{planSet.title}</span>
                    <span className="block text-xs font-semibold text-slate-600">{count} sheet{count === 1 ? "" : "s"} · {formatBytes(planSet.file_size)}</span>
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <StatusPill status={planSet.processing_status} />
                  <ChevronDown className={`h-4 w-4 text-slate-600 transition ${open ? "rotate-180" : ""}`} />
                </span>
              </button>
              {open && (
                <div className="border-t border-slate-300 px-4 py-3 text-sm text-slate-700">
                  <p>{planSet.description || planSet.original_file_name || "No description yet."}</p>
                  {planSet.processing_error && <p className="mt-2 font-bold text-rose-700">{planSet.processing_error}</p>}
                </div>
              )}
            </article>
          );
        })}
        {planSets.length === 0 && <p className="rounded-2xl bg-slate-50 p-5 text-sm font-semibold text-slate-700 ring-1 ring-slate-300">No plan sets yet. Upload a PDF to begin the Master Plan Room.</p>}
      </div>
    </section>
  );
}

function StatusPill({ status }: { status: SiteWalkPlanSet["processing_status"] }) {
  const label = status === "ready" ? "Complete" : status === "processing" ? "Processing Sheets" : status === "pending" ? "Uploading" : status;
  const color = status === "ready" ? "bg-emerald-100 text-emerald-800" : status === "failed" ? "bg-rose-100 text-rose-800" : "bg-blue-100 text-blue-900";
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-black capitalize ${color}`}>{label}</span>;
}

function formatBytes(value: number) {
  if (!value) return "0 MB";
  const mb = value / (1024 * 1024);
  return `${mb.toFixed(mb >= 10 ? 0 : 1)} MB`;
}
