"use client";

import { Camera, FileImage, PenLine } from "lucide-react";
import type { CaptureV2Session } from "./session-types";
import type { CaptureV2Loop } from "./useCaptureV2Loop";
import { CaptureV2PrimaryAction } from "./CaptureV2PrimaryAction";

type Props = {
  session: CaptureV2Session;
  loop: CaptureV2Loop;
  capturedCount: number;
  onOpenDrawer: () => void;
};

export function CaptureV2ActionHub({ session, loop, capturedCount, onOpenDrawer }: Props) {
  const { openPickerDirect, machineState, isDesktop, handlePrimaryAction, busy } = loop;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-5 pb-[max(env(safe-area-inset-bottom),1rem)] pt-4">
      <p className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-300/80">Action Hub</p>
      <h2 className="mt-2 text-2xl font-black text-white">{session.title}</h2>
      <p className="mt-1 text-sm font-semibold text-slate-400">
        {session.is_ad_hoc ? "Quick Walk" : session.project_name ?? "Plan Walk"} · {capturedCount}{" "}
        capture{capturedCount === 1 ? "" : "s"}
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => openPickerDirect(isDesktop ? "upload" : "camera", "quick_capture")}
          disabled={busy}
          className="flex min-h-24 flex-col items-start justify-between rounded-3xl border border-white/10 bg-white/[0.05] p-4 text-left shadow-lg shadow-black/20 disabled:opacity-60"
        >
          <Camera className="h-6 w-6 text-amber-400" />
          <span>
            <span className="block text-base font-black text-white">
              {isDesktop ? "Upload photo" : "Take photo"}
            </span>
            <span className="mt-1 block text-xs font-semibold text-slate-400">
              Opens native picker in this tap
            </span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => openPickerDirect("upload", "quick_capture")}
          disabled={busy}
          className="flex min-h-24 flex-col items-start justify-between rounded-3xl border border-white/10 bg-white/[0.05] p-4 text-left shadow-lg shadow-black/20 disabled:opacity-60"
        >
          <FileImage className="h-6 w-6 text-amber-400" />
          <span>
            <span className="block text-base font-black text-white">Choose file</span>
            <span className="mt-1 block text-xs font-semibold text-slate-400">
              Camera roll or desktop file picker
            </span>
          </span>
        </button>

        {loop.activeItem && (
          <button
            type="button"
            onClick={onOpenDrawer}
            className="flex min-h-24 flex-col items-start justify-between rounded-3xl border border-amber-400/25 bg-amber-500/10 p-4 text-left sm:col-span-2"
          >
            <PenLine className="h-6 w-6 text-amber-300" />
            <span>
              <span className="block text-base font-black text-white">Edit active stop</span>
              <span className="mt-1 block text-xs font-semibold text-amber-100/70">
                {loop.activeItem.title || "Open details drawer"}
              </span>
            </span>
          </button>
        )}
      </div>

      <div className="mt-auto pt-6">
        <CaptureV2PrimaryAction
          state={machineState}
          isDesktop={isDesktop}
          onAction={handlePrimaryAction}
        />
      </div>
    </div>
  );
}
