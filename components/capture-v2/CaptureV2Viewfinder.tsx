"use client";

import { useState, type DragEvent } from "react";
import { Camera, FileImage } from "lucide-react";
import { CaptureUploadBadge } from "@/components/site-walk/capture/CaptureUploadBadge";
import { CAPTURE_V2_LAYER_IDS, CAPTURE_V2_LAYERS } from "./layers";
import { CaptureV2PrimaryAction } from "./CaptureV2PrimaryAction";
import type { CaptureV2Loop } from "./useCaptureV2Loop";

type Props = {
  loop: CaptureV2Loop;
};

export function CaptureV2Viewfinder({ loop }: Props) {
  const [dragActive, setDragActive] = useState(false);
  const {
    activePreview,
    busy,
    status,
    machineState,
    isDesktop,
    cameraInputRef,
    uploadInputRef,
    openPickerDirect,
    handlePrimaryAction,
    handleDirectFileChange,
    resetFileInputClick,
    handleDrop,
  } = loop;

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    handleDrop(event.dataTransfer.files[0]);
  }

  return (
    <div
      id={CAPTURE_V2_LAYER_IDS.canvasBase}
      className={`relative ${CAPTURE_V2_LAYERS.canvas} flex min-h-0 flex-1 flex-col overflow-hidden bg-zinc-950`}
    >
      {activePreview ? (
        <div className="relative min-h-0 flex-1 overflow-hidden">
          <img
            src={activePreview.url}
            alt={activePreview.title}
            className="h-full w-full object-contain"
            draggable={false}
          />
          <CaptureUploadBadge kind={status.kind} />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-10">
            <p className="truncate text-sm font-black text-white">{activePreview.title}</p>
            <p className="mt-1 text-xs font-semibold text-slate-300">{status.message}</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => openPickerDirect("camera", "next_item")}
                disabled={busy}
                className="min-h-12 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-black text-white disabled:opacity-60"
              >
                <span className="inline-flex items-center gap-2">
                  <Camera className="h-4 w-4" /> Another photo
                </span>
              </button>
              <CaptureV2PrimaryAction
                state={machineState}
                isDesktop={isDesktop}
                onAction={handlePrimaryAction}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-5 pb-[max(env(safe-area-inset-bottom),1rem)] pt-4 text-center">
          <Camera className="h-12 w-12 text-amber-400 md:hidden" />
          <FileImage className="hidden h-12 w-12 text-amber-400 md:block" />
          <h2 className="mt-4 text-2xl font-black text-white">Capture field proof</h2>
          <p className="mt-2 max-w-lg text-sm leading-6 text-slate-400">
            One tap opens the native picker in this gesture. Preview appears immediately while upload
            and offline sync continue in the background.
          </p>

          <div className="mt-6 grid w-full max-w-xl gap-3 md:hidden">
            <button
              type="button"
              onClick={() => openPickerDirect("camera", "quick_capture")}
              disabled={busy}
              className="min-h-16 rounded-3xl bg-amber-500 px-5 py-4 text-lg font-black text-slate-950 shadow-lg shadow-amber-500/20 disabled:opacity-60"
            >
              <span className="inline-flex items-center gap-2">
                <Camera className="h-5 w-5" /> Take Photo
              </span>
            </button>
            <button
              type="button"
              onClick={() => openPickerDirect("upload", "quick_capture")}
              disabled={busy}
              className="min-h-16 rounded-3xl border border-white/15 bg-white/10 px-5 py-4 text-lg font-black text-white disabled:opacity-60"
            >
              <span className="inline-flex items-center gap-2">
                <FileImage className="h-5 w-5" /> Camera Roll
              </span>
            </button>
          </div>

          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={onDrop}
            className={`mt-6 hidden w-full max-w-2xl rounded-3xl border-2 border-dashed p-10 transition md:flex md:min-h-64 md:flex-col md:items-center md:justify-center ${
              dragActive ? "border-amber-500 bg-amber-500/10" : "border-white/15 bg-white/[0.04]"
            }`}
          >
            <p className="text-2xl font-black text-white">Drag &amp; Drop Photos Here</p>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Desktop mode is upload-first for job-trailer workflows.
            </p>
            <button
              type="button"
              onClick={() => openPickerDirect("upload", "quick_capture")}
              disabled={busy}
              className="mt-6 min-h-12 rounded-2xl bg-amber-500 px-6 py-3 text-sm font-black text-slate-950 hover:bg-amber-400 disabled:opacity-60"
            >
              <span className="inline-flex items-center gap-2">
                <FileImage className="h-5 w-5" /> Select Photos from Computer
              </span>
            </button>
          </div>

          <div className="mt-6 w-full max-w-xl md:max-w-2xl">
            <CaptureV2PrimaryAction
              state={machineState}
              isDesktop={isDesktop}
              onAction={handlePrimaryAction}
            />
          </div>
        </div>
      )}

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onClick={resetFileInputClick}
        onChange={(event) => handleDirectFileChange(event, false)}
      />
      <input
        ref={uploadInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onClick={resetFileInputClick}
        onChange={(event) => handleDirectFileChange(event, true)}
      />
    </div>
  );
}
