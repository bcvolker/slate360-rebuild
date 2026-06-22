"use client";

import { Camera, RotateCcw, RotateCw, Upload } from "lucide-react";
import type { DeviceCaptureInput } from "@/lib/hooks/useDeviceContext";
import { PHOTO_MARKUP_REDO_EVENT, PHOTO_MARKUP_UNDO_EVENT } from "./PhotoMarkupCanvas";
import { UnifiedVectorToolbar } from "./UnifiedVectorToolbar";
import { darkButtonClass } from "@/components/ui/dark-surface-styles";

type Props = {
  mode: "attachments" | "markup";
  hasItem: boolean;
  actionBusy: boolean;
  primaryCaptureInput: DeviceCaptureInput;
  primaryCaptureLabel: string;
  onCapture: (input?: DeviceCaptureInput) => void;
};

export function CaptureSheetUtilityPanel({ mode, hasItem, actionBusy, primaryCaptureInput, primaryCaptureLabel, onCapture }: Props) {
  if (mode === "attachments") {
    return (
      <div className="space-y-3 rounded-3xl border border-white/10 bg-white/[0.03] p-3">
        <button type="button" onClick={() => onCapture(primaryCaptureInput)} disabled={actionBusy} className={darkButtonClass("primary", "min-h-12 w-full rounded-2xl font-black disabled:opacity-60")}>
          {primaryCaptureInput === "camera" ? <Camera className="h-5 w-5" /> : <Upload className="h-5 w-5" />} {primaryCaptureLabel}
        </button>
        <button type="button" onClick={() => onCapture("upload")} disabled={actionBusy} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-black/25 px-4 text-sm font-black text-slate-200 disabled:opacity-60">
          <Upload className="h-5 w-5" /> Camera Roll
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-3xl border border-white/10 bg-white/[0.03] p-3">
      <div className="flex gap-2">
        <button type="button" onClick={() => window.dispatchEvent(new CustomEvent(PHOTO_MARKUP_UNDO_EVENT))} disabled={!hasItem} className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-black/25 px-3 text-xs font-black text-slate-200 disabled:opacity-40">
          <RotateCcw className="h-4 w-4" /> Undo
        </button>
        <button type="button" onClick={() => window.dispatchEvent(new CustomEvent(PHOTO_MARKUP_REDO_EVENT))} disabled={!hasItem} className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-black/25 px-3 text-xs font-black text-slate-200 disabled:opacity-40">
          <RotateCw className="h-4 w-4" /> Redo
        </button>
      </div>
      <UnifiedVectorToolbar disabled={!hasItem} />
      {!hasItem && <p className="text-xs font-bold text-slate-500">Capture a photo first.</p>}
    </div>
  );
}