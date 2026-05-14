"use client";

import { useEffect } from "react";
import { Camera, StickyNote, Upload, X } from "lucide-react";
import { useDeviceContext } from "@/lib/hooks/useDeviceContext";
import { useOptionalCaptureContext } from "./CaptureContext";
import { requestCameraCapture } from "./capture-camera-events";
import { publishPlanCaptureTarget } from "./plan-capture-events";

type Props = {
  pinId?: string | null;
  clientPinId?: string | null;
  isSavedPin?: boolean;
  planSheetId: string;
  xPct: number;
  yPct: number;
  captureDisabledReason?: string;
  onClose: () => void;
  onCaptureRequest?: (input: "camera" | "upload") => void;
};

export function PlanQuickActionMenu({ pinId, clientPinId, isSavedPin = false, planSheetId, xPct, yPct, captureDisabledReason, onClose, onCaptureRequest }: Props) {
  const { isDesktop } = useDeviceContext();
  const captureCtx = useOptionalCaptureContext();
  const captureDisabled = Boolean(captureDisabledReason);

  useEffect(() => {
    console.log("[PLAN_WALK] action sheet visible", { planSheetId, xPct, yPct, clientPinId, pinId });
  }, [clientPinId, pinId, planSheetId, xPct, yPct]);

  function choose(action: "photo" | "note", input?: "camera" | "upload") {
    const target = { pinId: pinId && isUuid(pinId) ? pinId : null, clientPinId: clientPinId ?? null, planSheetId, xPct, yPct };
    if (captureDisabled) return;
    // Primary path: set plan target on the React context BEFORE requesting capture.
    if (captureCtx) {
      captureCtx.setPlanTarget(target);
      console.log("[PLAN_WALK] capture context target set", target);
      if (input) {
        console.log(input === "camera" ? "[PLAN_WALK] Take Photo tapped" : "[PLAN_WALK] Upload tapped", { target });
        console.log("[PLAN_WALK] capture requested", { input, target });
        if (onCaptureRequest) onCaptureRequest(input);
        else captureCtx.requestCapture(input, "plan_pin");
      }
    } else {
      // Legacy fallback: window event bus (used by any caller still outside the provider).
      publishPlanCaptureTarget({ ...target, action });
      if (input) {
        console.log(input === "camera" ? "[PLAN_WALK] Take Photo tapped" : "[PLAN_WALK] Upload tapped", { target });
        console.log("[PLAN_WALK] capture requested", { input, target });
        requestCameraCapture(input, "plan_pin");
      }
    }
    onClose();
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[2000] flex justify-center px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] sm:inset-0 sm:items-center sm:px-4 sm:pb-0">
      <div className="pointer-events-auto w-full max-w-sm rounded-[1.75rem] border border-amber-400/25 bg-slate-900/95 p-4 text-left text-slate-50 shadow-2xl shadow-black/70 backdrop-blur-xl">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-400">{isSavedPin ? "Saved Stop" : "Draft pin"}</p>
            <p className="mt-1 text-sm font-bold text-slate-400">{isSavedPin ? "Location locked. Add evidence from this saved location." : "Drag the pin to adjust it, then attach the next capture."}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-500 hover:bg-white/[0.06]" aria-label="Close pin actions">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-3 grid gap-2">
          {isSavedPin && <button type="button" disabled className="flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-black text-slate-500 opacity-70" title="No linked stop details are available in this walk view."><StickyNote className="h-4 w-4" /> Open details unavailable</button>}
          {!isDesktop && <button type="button" onClick={() => choose("photo", "camera")} disabled={captureDisabled} className="flex min-h-11 items-center gap-2 rounded-xl bg-amber-500 px-3 py-2 text-sm font-black text-slate-950 hover:bg-amber-400 disabled:opacity-50"><Camera className="h-4 w-4" /> Take photo at this pin</button>}
          <button type="button" onClick={() => choose("photo", "upload")} disabled={captureDisabled} className="flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-black text-slate-200 hover:border-amber-400/50 hover:text-amber-200 disabled:opacity-50">
            <Upload className="h-4 w-4" /> Upload existing photo
          </button>
          {captureDisabledReason && <p className="rounded-xl border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-xs font-bold leading-5 text-amber-100">{captureDisabledReason}</p>}
          <button type="button" disabled className="flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-black text-slate-500 opacity-70" title="Add notes after capturing or uploading a photo for this plan stop.">
            <StickyNote className="h-4 w-4" /> Add Note after photo/upload
          </button>
          <button type="button" onClick={onClose} className="flex min-h-11 items-center justify-center rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm font-black text-slate-200 hover:border-white/20 hover:text-white">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
