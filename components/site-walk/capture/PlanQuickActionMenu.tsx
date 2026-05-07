"use client";

import { Camera, StickyNote, Upload, X } from "lucide-react";
import { useDeviceContext } from "@/lib/hooks/useDeviceContext";
import { useOptionalCaptureContext } from "./CaptureContext";
import { requestCameraCapture } from "./capture-camera-events";
import { publishPlanCaptureTarget } from "./plan-capture-events";

type Props = {
  pinId?: string;
  planSheetId: string;
  xPct: number;
  yPct: number;
  screenX: number;
  screenY: number;
  captureDisabledReason?: string;
  onClose: () => void;
  onCaptureRequest?: (input: "camera" | "upload") => void;
};

export function PlanQuickActionMenu({ pinId, planSheetId, xPct, yPct, screenX, screenY, captureDisabledReason, onClose, onCaptureRequest }: Props) {
  const { isDesktop } = useDeviceContext();
  const captureCtx = useOptionalCaptureContext();
  const captureDisabled = Boolean(captureDisabledReason);

  function choose(action: "photo" | "note", input?: "camera" | "upload") {
    const target = { pinId, planSheetId, xPct, yPct };
    console.log("[capture]#1 choose", { input, target });
    if (captureDisabled) return;
    // Primary path: set plan target on the React context BEFORE requesting capture.
    if (captureCtx) {
      captureCtx.setPlanTarget(target);
      if (input) captureCtx.requestCapture(input, "plan_pin");
    } else {
      // Legacy fallback: window event bus (used by any caller still outside the provider).
      publishPlanCaptureTarget({ ...target, action });
      if (input) requestCameraCapture(input, "plan_pin");
    }
    if (input && onCaptureRequest) onCaptureRequest(input);
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
        {!isDesktop && <button type="button" onClick={() => choose("photo", "camera")} disabled={captureDisabled} className="flex min-h-11 items-center gap-2 rounded-xl bg-amber-500 px-3 py-2 text-sm font-black text-slate-950 hover:bg-amber-400 disabled:opacity-50"><Camera className="h-4 w-4" /> Take photo at this pin</button>}
        <button type="button" onClick={() => choose("photo", "upload")} disabled={captureDisabled} className="flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-black text-slate-200 hover:border-amber-400/50 hover:text-amber-200 disabled:opacity-50">
          <Upload className="h-4 w-4" /> Upload existing photo
        </button>
        {captureDisabledReason && <p className="rounded-xl border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-xs font-bold leading-5 text-amber-100">{captureDisabledReason}</p>}
        <button type="button" onClick={() => choose("note")} disabled={captureDisabled} className="flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-black text-slate-200 hover:border-amber-400/50 hover:text-amber-200 disabled:opacity-50">
          <StickyNote className="h-4 w-4" /> Attach next note
        </button>
      </div>
    </div>
  );
}
