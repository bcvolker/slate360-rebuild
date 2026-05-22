"use client";

import { Camera, FolderOpen, Mic } from "lucide-react";
import { CAPTURE_V2_LAYERS } from "./layers";
import type { CaptureV2Loop } from "./useCaptureV2Loop";

type Props = {
  loop: CaptureV2Loop;
  onVoiceNoteOnly: () => void;
};

export function CaptureV2ActionHub({ loop, onVoiceNoteOnly }: Props) {
  const { openPickerDirect, busy } = loop;

  return (
    <div
      className={`pointer-events-none absolute inset-x-0 bottom-0 ${CAPTURE_V2_LAYERS.fastTrack} px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-6`}
      aria-label="Capture actions"
    >
      <div className="pointer-events-auto mx-auto flex w-full max-w-md flex-col gap-3">
        <button
          type="button"
          onClick={() => openPickerDirect("camera", "quick_capture")}
          disabled={busy}
          className="inline-flex min-h-11 items-center justify-center gap-2.5 rounded-2xl bg-amber-500 px-4 py-3 text-base font-semibold text-black shadow-lg shadow-amber-500/25 backdrop-blur-md disabled:opacity-60"
        >
          <Camera className="h-5 w-5 shrink-0" aria-hidden />
          Take Photo
        </button>
        <button
          type="button"
          onClick={() => openPickerDirect("upload", "quick_capture")}
          disabled={busy}
          className="inline-flex min-h-11 items-center justify-center gap-2.5 rounded-2xl border border-white/[0.07] bg-white/[0.05] px-4 py-3 text-base font-semibold text-white backdrop-blur-xl disabled:opacity-60"
        >
          <FolderOpen className="h-5 w-5 shrink-0" aria-hidden />
          Camera Roll
        </button>
        <button
          type="button"
          onClick={onVoiceNoteOnly}
          disabled={busy}
          className="inline-flex min-h-11 items-center justify-center gap-2.5 rounded-2xl border border-white/[0.07] bg-white/[0.05] px-4 py-3 text-base font-semibold text-white backdrop-blur-xl disabled:opacity-60"
        >
          <Mic className="h-5 w-5 shrink-0" aria-hidden />
          Voice Note Only
        </button>
      </div>
    </div>
  );
}
