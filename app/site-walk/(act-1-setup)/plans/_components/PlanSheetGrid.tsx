"use client";

import { Grid3X3, ImageOff } from "lucide-react";
import type { SiteWalkPlanSet, SiteWalkPlanSheet } from "@/lib/types/site-walk";

type Props = {
  activePlanSet: SiteWalkPlanSet | null;
  sheets: SiteWalkPlanSheet[];
};

export function PlanSheetGrid({ activePlanSet, sheets }: Props) {
  const visibleSheets = activePlanSet ? sheets.filter((sheet) => sheet.plan_set_id === activePlanSet.id) : [];

  return (
    <section className="rounded-3xl border border-slate-300 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-800">Sheets</p>
          <h2 className="mt-1 text-xl font-black text-slate-900">{activePlanSet?.title ?? "Select a plan set"}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-700">Individual sheet rows are stored in the project-level plan sheet table.</p>
        </div>
        <Grid3X3 className="h-5 w-5 text-blue-700" />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {visibleSheets.map((sheet) => (
          <article key={sheet.id} className="overflow-hidden rounded-2xl bg-slate-50 ring-1 ring-slate-300">
            <div className="flex aspect-[4/3] items-center justify-center bg-white">
              {sheet.thumbnail_s3_key || sheet.image_s3_key ? (
                <img src={`/api/site-walk/plan-sheets/${sheet.id}/image`} alt={sheet.sheet_name ?? `Sheet ${sheet.sheet_number}`} className="h-full w-full object-contain" />
              ) : (
                <div className="text-center text-slate-500">
                  <ImageOff className="mx-auto h-8 w-8 text-slate-400" />
                  <p className="mt-2 text-xs font-bold">Thumbnail queued</p>
                </div>
              )}
            </div>
            <div className="border-t border-slate-300 p-3">
              <p className="text-sm font-black text-slate-900">Sheet {sheet.sheet_number}</p>
              <p className="mt-1 truncate text-xs font-semibold text-slate-600">{sheet.sheet_name ?? "Untitled sheet"}</p>
              <p className="mt-2 text-[11px] font-bold text-slate-500">{sheet.scale_label ?? "Scale pending"}</p>
            </div>
          </article>
        ))}
        {!activePlanSet && <EmptyState text="Choose a plan set from the list to review sheets." />}
        {activePlanSet && visibleSheets.length === 0 && <EmptyState text="No sheets have been stored for this plan set yet." />}
      </div>
    </section>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-2xl bg-slate-50 p-6 text-center text-sm font-semibold text-slate-700 ring-1 ring-slate-300 sm:col-span-2 xl:col-span-3">{text}</div>;
}
