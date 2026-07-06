"use client";

import type { PublicPlanSheet } from "@/lib/types/tours";

export function PlanSheetStrip({
  sheets,
  activeSheetId,
  onSelectSheet,
}: {
  sheets: PublicPlanSheet[];
  activeSheetId: string;
  onSelectSheet: (sheetId: string) => void;
}) {
  if (sheets.length <= 1) return null;

  return (
    <div className="absolute inset-x-0 bottom-0 z-10 flex gap-2 overflow-x-auto bg-gradient-to-t from-black/80 to-transparent p-4 pt-10">
      {sheets.map((sheet) => (
        <button
          key={sheet.id}
          type="button"
          onClick={() => onSelectSheet(sheet.id)}
          className={[
            "flex h-12 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border text-[10px] text-white/70",
            activeSheetId === sheet.id ? "border-white" : "border-white/20",
          ].join(" ")}
        >
          {sheet.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={sheet.imageUrl} alt={sheet.sheetName ?? `Sheet ${sheet.sheetNumber}`} className="h-full w-full object-cover" />
          ) : (
            <span>{sheet.sheetNumber}</span>
          )}
        </button>
      ))}
    </div>
  );
}
