"use client";

import { useState, type ChangeEvent, type DragEvent } from "react";
import type { CaptureV2Session } from "./session-types";
import type { CaptureV2Loop } from "./useCaptureV2Loop";

type Props = {
  session: CaptureV2Session;
  loop: CaptureV2Loop;
  capturedCount: number;
  onOpenDrawer: () => void;
  onVoiceNoteOnly: () => void;
};

export function CaptureV2ActionHub({
  session,
  loop,
  capturedCount,
  onOpenDrawer,
  onVoiceNoteOnly,
}: Props) {
  const [dragActive, setDragActive] = useState(false);
  const {
    openPickerDirect,
    handleMultiFileDrop,
    busy,
    desktopMultiInputRef,
  } = loop;

  function onDesktopFilesChange(event: ChangeEvent<HTMLInputElement>) {
    event.stopPropagation();
    const files = event.currentTarget.files;
    event.currentTarget.value = "";
    if (!files?.length) return;
    handleMultiFileDrop(Array.from(files));
  }

  function onDesktopDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    const files = Array.from(event.dataTransfer.files).filter((file) => file.type.startsWith("image/"));
    if (files.length === 0) return;
    handleMultiFileDrop(files);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pb-safe pt-4">
      <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.22)] backdrop-blur-md">
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-300/80">
          Action Hub
        </p>
        <h2 className="mt-2 truncate text-2xl font-black text-white">{session.title}</h2>
        <p className="mt-1 text-sm font-semibold text-slate-400">
          {session.is_ad_hoc ? "Quick Walk" : session.project_name ?? "Plan Walk"} · {capturedCount}{" "}
          capture{capturedCount === 1 ? "" : "s"}
        </p>

        <div className="mt-6 flex flex-col gap-3 md:hidden">
          <button
            type="button"
            onClick={() => openPickerDirect("camera", "quick_capture")}
            disabled={busy}
            className="min-h-11 rounded-2xl bg-amber-500 px-4 py-3 text-base font-black text-slate-950 shadow-lg shadow-amber-500/20 disabled:opacity-60"
          >
            📷 Take Photo
          </button>
          <button
            type="button"
            onClick={() => openPickerDirect("upload", "quick_capture")}
            disabled={busy}
            className="min-h-11 rounded-2xl border border-white/15 bg-white/[0.08] px-4 py-3 text-base font-black text-white disabled:opacity-60"
          >
            📁 Choose File
          </button>
          <button
            type="button"
            onClick={onVoiceNoteOnly}
            disabled={busy}
            className="min-h-11 rounded-2xl border border-cyan-400/25 bg-cyan-500/10 px-4 py-3 text-base font-black text-cyan-100 disabled:opacity-60"
          >
            🎙️ Voice Note Only
          </button>
        </div>

        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={onDesktopDrop}
          className={`mt-6 hidden min-h-0 flex-1 flex-col items-center justify-center rounded-3xl border-2 border-dashed p-8 text-center transition md:flex ${
            dragActive ? "border-amber-500 bg-amber-500/10" : "border-white/15 bg-black/20"
          }`}
        >
          <p className="text-2xl font-black text-white">Drag &amp; Drop Photos Here</p>
          <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">
            Drop one or many images from your desktop explorer. Each file opens in the viewfinder
            immediately while upload continues in the background.
          </p>
          <button
            type="button"
            onClick={() => desktopMultiInputRef.current?.click()}
            disabled={busy}
            className="mt-6 min-h-11 rounded-2xl bg-amber-500 px-6 py-3 text-sm font-black text-slate-950 hover:bg-amber-400 disabled:opacity-60"
          >
            Select Photos from Computer
          </button>
        </div>

        {loop.activeItem && (
          <button
            type="button"
            onClick={onOpenDrawer}
            className="mt-4 min-h-11 rounded-2xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-left text-sm font-black text-amber-100 md:mt-auto"
          >
            Edit active stop · {loop.activeItem.title || "Open log drawer"}
          </button>
        )}
      </div>
    </div>
  );
}
