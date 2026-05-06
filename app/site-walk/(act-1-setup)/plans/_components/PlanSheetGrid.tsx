"use client";

import { Grid3X3, ImageOff } from "lucide-react";
import GlassCard from "@/components/shared/GlassCard";
import { PlanPdfPage } from "@/components/site-walk/capture/PlanPdfPage";
import type { SiteWalkPlanSet, SiteWalkPlanSheet } from "@/lib/types/site-walk";

type Props = {
  activePlanSet: SiteWalkPlanSet | null;
  sheets: SiteWalkPlanSheet[];
};

export function PlanSheetGrid({ activePlanSet, sheets }: Props) {
  const visibleSheets = activePlanSet ? sheets.filter((sheet) => sheet.plan_set_id === activePlanSet.id) : [];

  return (
    <GlassCard className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-400">Sheets</p>
          <h2 className="mt-1 text-xl font-black text-white">{activePlanSet?.title ?? "Select a plan set"}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-400">Individual sheet rows are stored in the project-level plan sheet table.</p>
        </div>
        <Grid3X3 className="h-5 w-5 text-amber-400" />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {visibleSheets.map((sheet) => (
          <article key={sheet.id} className="overflow-hidden rounded-2xl bg-white/[0.04] ring-1 ring-white/10">
            <div className="flex aspect-[4/3] items-center justify-center bg-slate-950/60">
              {sheet.thumbnail_s3_key || sheet.image_s3_key ? (
                <img src={`/api/site-walk/plan-sheets/${sheet.id}/image`} alt={sheet.sheet_name ?? `Sheet ${sheet.sheet_number}`} className="h-full w-full object-contain" />
              ) : activePlanSet?.source_s3_key ? (
                <PlanPdfPage fileUrl={`/api/site-walk/plan-sets/${activePlanSet.id}/file`} pageNumber={sheet.sheet_number} label={sheet.sheet_name ?? `Sheet ${sheet.sheet_number}`} compact maxWidth={280} />
              ) : (
                <div className="text-center text-slate-500">
                  <ImageOff className="mx-auto h-8 w-8 text-slate-400" />
                  <p className="mt-2 text-xs font-bold">Thumbnail queued</p>
                </div>
              )}
            </div>
            <div className="border-t border-white/10 p-3">
              <p className="text-sm font-black text-white">Sheet {sheet.sheet_number}</p>
              <p className="mt-1 truncate text-xs font-semibold text-slate-400">{sheet.sheet_name ?? "Untitled sheet"}</p>
              <p className="mt-2 text-[11px] font-bold text-slate-500">{sheet.scale_label ?? "Scale pending"}</p>
            </div>
          </article>
        ))}
        {!activePlanSet && <EmptyState text="Choose a plan set from the list to review sheets." />}
        {activePlanSet && visibleSheets.length === 0 && <EmptyState text="No sheets have been stored for this plan set yet." />}
      </div>
    </GlassCard>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-2xl bg-white/[0.04] p-6 text-center text-sm font-semibold text-slate-400 ring-1 ring-white/10 sm:col-span-2 xl:col-span-3">{text}</div>;
}
