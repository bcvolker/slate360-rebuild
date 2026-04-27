"use client";

import { Camera, StickyNote, X } from "lucide-react";
import { publishPlanCaptureTarget } from "./plan-capture-events";

type Props = {
  pinId?: string;
  planSheetId: string;
  xPct: number;
  yPct: number;
  screenX: number;
  screenY: number;
  onClose: () => void;
};

export function PlanQuickActionMenu({ pinId, planSheetId, xPct, yPct, screenX, screenY, onClose }: Props) {
  function choose(action: "photo" | "note") {
    publishPlanCaptureTarget({ pinId, planSheetId, xPct, yPct, action });
    onClose();
  }

  return (
    <div
      className="absolute z-20 w-64 rounded-2xl border border-slate-300 bg-white p-3 text-left shadow-xl"
      style={{ left: Math.min(screenX, 520), top: Math.max(12, screenY) }}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-800">Draft pin</p>
          <p className="mt-1 text-sm font-bold text-slate-700">Attach the next capture to this plan point.</p>
        </div>
        <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-500 hover:bg-slate-100" aria-label="Close pin actions">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-3 grid gap-2">
        <button type="button" onClick={() => choose("photo")} className="flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-black text-white hover:bg-blue-700">
          <Camera className="h-4 w-4" /> Attach next photo
        </button>
        <button type="button" onClick={() => choose("note")} className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-black text-slate-900 hover:border-blue-300 hover:text-blue-800">
          <StickyNote className="h-4 w-4" /> Attach next note
        </button>
      </div>
    </div>
  );
}
