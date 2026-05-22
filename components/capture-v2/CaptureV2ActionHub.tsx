"use client";

import { Camera, FolderOpen } from "lucide-react";
import { CAPTURE_V2_LAYERS } from "./layers";
import type { CaptureV2Loop } from "./useCaptureV2Loop";

type Props = {
  loop: CaptureV2Loop;
};

export function CaptureV2ActionHub({ loop }: Props) {
  const { openPickerDirect, busy } = loop;

  return (
    <div
      className={`pointer-events-none absolute inset-x-0 bottom-0 ${CAPTURE_V2_LAYERS.fastTrack} px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-6`}
      aria-label="Capture actions"
    >
      <div className="pointer-events-auto mx-auto w-full max-w-md">
        <button
          type="button"
          onClick={() => openPickerDirect("camera", "quick_capture")}
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-3.5 font-semibold text-black shadow-lg transition-transform active:scale-[0.98] disabled:opacity-60"
        >
          <Camera className="h-5 w-5 shrink-0" aria-hidden />
          Take Photo
        </button>
        <button
          type="button"
          onClick={() => openPickerDirect("upload", "quick_capture")}
          disabled={busy}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3.5 font-medium text-slate-200 transition-colors hover:bg-white/[0.04] disabled:opacity-60"
        >
          <FolderOpen className="h-5 w-5 shrink-0" aria-hidden />
          Camera Roll
        </button>
      </div>
    </div>
  );
}
