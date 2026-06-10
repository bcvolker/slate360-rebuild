"use client";

import { useMemo, useState } from "react";
import type { SiteWalkPlanSheet } from "@/lib/types/site-walk";
import { CAPTURE_PLAN_CANVAS_CHROME } from "@/lib/site-walk/capture-plan-canvas-tokens";
import { CAPTURE_V2_LAYERS } from "../layers";

type Props = {
  open: boolean;
  sheets: SiteWalkPlanSheet[];
  activeSheetId: string | null;
  sheetImageUrls?: Record<string, string>;
  onClose: () => void;
  onSelectSheet: (sheetId: string) => void;
};

export function CapturePlanSheetPickerSheet({
  open,
  sheets,
  activeSheetId,
  sheetImageUrls,
  onClose,
  onSelectSheet,
}: Props) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return sheets;
    return sheets.filter((sheet) => {
      const name = sheet.sheet_name?.toLowerCase() ?? "";
      return name.includes(trimmed) || String(sheet.sheet_number).includes(trimmed);
    });
  }, [query, sheets]);

  if (!open) return null;

  return (
    <div className={`${CAPTURE_V2_LAYERS.drawer} fixed inset-0 z-50 flex items-end bg-[color-mix(in_srgb,var(--graphite-canvas)_55%,transparent)]`}>
      <button type="button" className="absolute inset-0" aria-label="Close sheet picker" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="capture-plan-sheet-picker-title"
        className="relative w-full rounded-t-3xl border border-[var(--mobile-app-card-border)] bg-[var(--surface-zinc)] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 shadow-[var(--mobile-app-card-shadow)]"
        data-capture-chrome="plan-sheet-picker"
      >
        <p id="capture-plan-sheet-picker-title" className="text-sm font-bold text-[var(--graphite-text-header)]">
          Plan sheets
        </p>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search sheets"
          className="mt-3 w-full rounded-xl border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_65%,transparent)] px-3 py-2 text-sm text-[var(--graphite-text-body)] outline-none"
          data-capture-chrome="plan-sheet-search"
        />
        <div className="mt-3 max-h-[min(52vh,420px)] space-y-2 overflow-y-auto">
          {filtered.map((sheet, index) => {
            const thumbUrl = sheetImageUrls?.[sheet.id] ?? null;
            const selected = sheet.id === activeSheetId;
            return (
              <button
                key={sheet.id}
                type="button"
                onClick={() => {
                  onSelectSheet(sheet.id);
                  onClose();
                }}
                className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-2 text-left transition ${
                  selected
                    ? "border-[color-mix(in_srgb,var(--graphite-primary)_35%,transparent)] bg-[color-mix(in_srgb,var(--graphite-primary)_10%,transparent)]"
                    : "border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_55%,transparent)]"
                }`}
                data-capture-chrome="plan-sheet-row"
              >
                <div
                  className="shrink-0 overflow-hidden bg-[var(--graphite-canvas)]"
                  style={{
                    width: CAPTURE_PLAN_CANVAS_CHROME.planSheetPickerThumbPx,
                    height: CAPTURE_PLAN_CANVAS_CHROME.planSheetPickerThumbPx,
                    borderRadius: CAPTURE_PLAN_CANVAS_CHROME.planSheetPickerThumbRadiusPx,
                  }}
                >
                  {thumbUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumbUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] font-bold text-[var(--graphite-muted)]">
                      {sheet.sheet_number}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[var(--graphite-text-header)]">
                    {sheet.sheet_name?.trim() || `Sheet ${sheet.sheet_number}`}
                  </p>
                  <p className="text-[11px] text-[var(--graphite-muted)]">
                    {index + 1}/{sheets.length}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
