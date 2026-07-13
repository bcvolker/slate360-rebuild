"use client";

import { useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ViewerPlanSheet, ViewerPlanPin } from "@/lib/site-walk/viewer-types";

type Props = {
  sheets: ViewerPlanSheet[];
  pins: ViewerPlanPin[];
  /** Called with the pin's linked item id when a captured pin is tapped. */
  onSelectItem: (itemId: string) => void;
  onClose: () => void;
};

/**
 * Recipient-facing plan stage — the payoff of walks-with-plans: a delivered
 * report shows WHERE every stop was, not just a flat photo list. Full-bleed
 * plan sheet, numbered pins positioned by x/y percent, tap a pin to jump to
 * its stop in the main item deck. Deliberately simple (no dive/pano
 * choreography) so it works uniformly whether a pin's stop is a photo, a
 * 360, a video, or a note — those all already render via PublicItemStage.
 */
export function DeliverablePlanStage({ sheets, pins, onSelectItem, onClose }: Props) {
  const [sheetIndex, setSheetIndex] = useState(0);
  const activeSheet = sheets[sheetIndex] ?? sheets[0];
  const sheetPins = pins.filter((p) => p.planSheetId === activeSheet?.id);

  if (!activeSheet) return null;

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-black">
      <div className="flex items-center justify-between gap-2 border-b border-white/10 bg-[#151A23] px-4 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-semibold text-white">{activeSheet.sheetName}</span>
          {sheets.length > 1 ? (
            <span className="shrink-0 text-xs text-slate-400">
              {sheetIndex + 1}/{sheets.length}
            </span>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {sheets.length > 1 ? (
            <>
              <button
                type="button"
                onClick={() => setSheetIndex((i) => Math.max(0, i - 1))}
                disabled={sheetIndex === 0}
                className="rounded-lg p-2 text-slate-300 hover:bg-white/10 disabled:opacity-30"
                aria-label="Previous sheet"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={() => setSheetIndex((i) => Math.min(sheets.length - 1, i + 1))}
                disabled={sheetIndex === sheets.length - 1}
                className="rounded-lg p-2 text-slate-300 hover:bg-white/10 disabled:opacity-30"
                aria-label="Next sheet"
              >
                <ChevronRight size={16} />
              </button>
            </>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-300 hover:bg-white/10"
            aria-label="Close plan view"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="relative flex-1 overflow-auto bg-[#0B0F15]">
        <div className="relative mx-auto my-4 w-fit max-w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={activeSheet.imageUrl}
            alt={activeSheet.sheetName}
            className="max-w-full select-none"
            draggable={false}
          />
          {sheetPins.map((pin) => (
            <button
              key={pin.id}
              type="button"
              disabled={!pin.itemId}
              onClick={() => pin.itemId && onSelectItem(pin.itemId)}
              className={cn(
                "absolute -translate-x-1/2 -translate-y-full p-1 transition-transform",
                pin.itemId ? "cursor-pointer hover:scale-110" : "cursor-default opacity-50",
              )}
              style={{ left: `${pin.xPct}%`, top: `${pin.yPct}%` }}
              aria-label={pin.itemId ? `Open stop ${pin.pinNumber ?? ""}` : `Stop ${pin.pinNumber ?? ""}`}
            >
              <span className="relative flex flex-col items-center">
                <span
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full border-2 text-[11px] font-black shadow-xl shadow-black/50",
                    pin.itemId
                      ? "border-[color-mix(in_srgb,var(--graphite-primary)_60%,white)] bg-[var(--graphite-primary)] text-[var(--graphite-canvas)]"
                      : "border-slate-500 bg-slate-700 text-slate-300",
                  )}
                >
                  {pin.pinNumber != null ? String(pin.pinNumber).padStart(2, "0") : "•"}
                </span>
                <span
                  className={cn("h-3 w-0.5", pin.itemId ? "bg-[var(--graphite-primary)]" : "bg-slate-700")}
                />
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
