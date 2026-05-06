"use client";

import { Camera, StickyNote, Upload, X } from "lucide-react";
import { requestCameraCapture } from "./capture-camera-events";
import { publishPlanCaptureTarget } from "./plan-capture-events";

type Props = {
  pinId?: string;
  planSheetId: string;
  xPct: number;
  yPct: number;
  screenX: number;
  screenY: number;
  onClose: () => void;
  onCaptureRequest?: (input: "camera" | "upload") => void;
};

export function PlanQuickActionMenu({ pinId, planSheetId, xPct, yPct, screenX, screenY, onClose, onCaptureRequest }: Props) {
  function choose(action: "photo" | "note", input?: "camera" | "upload") {
    publishPlanCaptureTarget({ pinId, planSheetId, xPct, yPct, action });
    if (input) {
      if (onCaptureRequest) onCaptureRequest(input);
      else requestCameraCapture(input, "plan_pin");
    }
    onClose();
  }

  return (
    <div
      className="absolute z-20 w-64 rounded-2xl border border-white/10 bg-slate-900 p-3 text-left text-slate-50 shadow-2xl shadow-black/50"
      style={{ left: Math.min(screenX, 520), top: Math.max(12, screenY) }}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-400">Draft pin</p>
          <p className="mt-1 text-sm font-bold text-slate-400">Attach the next capture to this plan point.</p>
        </div>
        <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-500 hover:bg-white/[0.06]" aria-label="Close pin actions">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-3 grid gap-2">
        <button type="button" onClick={() => choose("photo", "camera")} className="flex min-h-11 items-center gap-2 rounded-xl bg-amber-500 px-3 py-2 text-sm font-black text-slate-950 hover:bg-amber-400">
          <Camera className="h-4 w-4" /> Take photo at this pin
        </button>
        <button type="button" onClick={() => choose("photo", "upload")} className="flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-black text-slate-200 hover:border-amber-400/50 hover:text-amber-200">
          <Upload className="h-4 w-4" /> Upload existing photo
        </button>
        <button type="button" onClick={() => choose("note")} className="flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-black text-slate-200 hover:border-amber-400/50 hover:text-amber-200">
          <StickyNote className="h-4 w-4" /> Attach next note
        </button>
      </div>
    </div>
  );
}
