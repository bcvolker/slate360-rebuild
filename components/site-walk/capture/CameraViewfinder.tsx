"use client";

import { useEffect, useRef, useState, type ChangeEvent, type MouseEvent } from "react";
import { Camera, FileImage, Loader2, RotateCcw } from "lucide-react";
import { isMarkupData, type MarkupData } from "@/lib/site-walk/markup-types";
import { getItemPhotoAttachmentPins, type PhotoAttachmentPin } from "@/lib/site-walk/photo-attachments";
import { getCaptureImageUrl } from "@/lib/site-walk/capture-image-url";
import { readQuickCaptureLaunch, removeQuickCaptureLaunch } from "@/lib/site-walk/quick-capture-launch";
import type { PhotoAngleCaptureMode, PhotoAngleRecord } from "@/lib/site-walk/photo-angles";
import type { CaptureItemRecord } from "@/lib/types/site-walk-capture";
import { requestCameraCapture, type CameraRequestDetail } from "./capture-camera-events";
import { CaptureQuickNotePanel } from "./CaptureQuickNotePanel";
import { CaptureUploadBadge } from "./CaptureUploadBadge";
import { statusClasses } from "./cameraViewfinderHelpers";
import { useOptionalCaptureContext } from "./CaptureContext";
import { PendingUploadPreviewModal } from "./PendingUploadPreviewModal";
import { PhotoMarkupCanvas } from "./PhotoMarkupCanvas";
import { usePlanCaptureTarget } from "./plan-capture-events";
import { VECTOR_TOOL_EVENT } from "./UnifiedVectorToolbar";
import { useCaptureFileHandler, type CaptureIntent } from "./useCaptureFileHandler";

type Props = {
  sessionId: string;
  autoOpenCamera?: boolean;
  launchId?: string | null;
  layout?: "full" | "visual";
  activeItem?: CaptureItemRecord | null;
  activeImageUrl?: string | null;
  activeImageTitle?: string | null;
  activeImageKey?: string | null;
  markupEnabled?: boolean;
  onPlanCaptureSaved?: () => void;
  onAngleCaptureFile?: (itemId: string, file: File, previewUrl: string, captureMode: PhotoAngleCaptureMode) => Promise<PhotoAngleRecord | null>;
  onPreviewStateChange?: (active: boolean) => void;
  onMarkupChange?: (itemId: string, markup: MarkupData) => void;
  onAttachmentPinsChange?: (itemId: string, pins: PhotoAttachmentPin[]) => void;
};

export function CameraViewfinder({ sessionId, autoOpenCamera = false, launchId = null, layout = "full", activeItem = null, activeImageUrl = null, activeImageTitle = null, activeImageKey = null, markupEnabled = true, onPlanCaptureSaved, onAngleCaptureFile, onPreviewStateChange, onMarkupChange, onAttachmentPinsChange }: Props) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const consumedLaunchRef = useRef<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const captureCtx = useOptionalCaptureContext();
  const { target: legacyTarget, clearTarget: clearLegacyTarget } = usePlanCaptureTarget();
  const target = captureCtx?.planTarget ?? legacyTarget;
  const clearTarget = captureCtx ? captureCtx.clearPlanTarget : clearLegacyTarget;

  const fileHandler = useCaptureFileHandler({ sessionId, planTarget: target, clearTarget, activeItem, onPlanCaptureSaved, onAngleCaptureFile });
  const { status, busy, activePreview, setActivePreview, pendingUpload, pendingUploadError } = fileHandler;
  const visualOnly = layout === "visual";

  useEffect(() => setMounted(true), []);
  useEffect(() => onPreviewStateChange?.(Boolean(activePreview)), [activePreview, onPreviewStateChange]);
  useEffect(() => () => fileHandler.cleanupPendingUpload(), []);

  // Listen for files from the colocated direct picker in CaptureClientIsland
  useEffect(() => {
    function handleDirectFile(event: Event) {
      const detail = (event as CustomEvent).detail;
      if (!detail?.file) return;
      fileHandler.setIntent({ source: detail.source ?? "quick_capture", input: detail.input ?? "camera" });
      const confirmBeforeAttach = detail.input === "upload";
      fileHandler.handleFile(detail.file as File, confirmBeforeAttach);
    }
    window.addEventListener("site-walk:direct-capture-file", handleDirectFile);
    return () => window.removeEventListener("site-walk:direct-capture-file", handleDirectFile);
  }, [fileHandler]);

  useEffect(() => {
    if (!mounted || !autoOpenCamera || captureCtx) return;
    const timeout = window.setTimeout(() => cameraInputRef.current?.click(), 350);
    return () => window.clearTimeout(timeout);
  }, [autoOpenCamera, captureCtx, mounted]);

  useEffect(() => {
    if (!mounted || !launchId || consumedLaunchRef.current === launchId) return;
    consumedLaunchRef.current = launchId;
    void readQuickCaptureLaunch(launchId).then((launch) => {
      if (launch?.file) fileHandler.handleFile(launch.file);
      return removeQuickCaptureLaunch(launchId);
    });
  }, [launchId, mounted]);

  useEffect(() => {
    if (!activeItem) return;
    const url = activeImageUrl ?? getCaptureImageUrl(activeItem);
    if (!url) return;
    setActivePreview((current) => {
      const title = activeImageTitle ?? activeItem.title ?? "Captured photo";
      if (current?.url === url && current.itemId === activeItem.id) return { ...current, title, itemId: activeItem.id };
      return { url, title, itemId: activeItem.id };
    });
  }, [activeImageKey, activeImageTitle, activeImageUrl, activeItem, setActivePreview]);

  function resetFileInputClick(event: MouseEvent<HTMLInputElement>) {
    event.stopPropagation();
    event.currentTarget.value = "";
  }

  function handleFileInputChange(event: ChangeEvent<HTMLInputElement>, confirmBeforeAttach: boolean) {
    event.stopPropagation();
    fileHandler.handleFile(event.currentTarget.files?.[0], confirmBeforeAttach);
    event.currentTarget.value = "";
  }

  function openCaptureInput(intent: CaptureIntent) {
    fileHandler.setIntent(intent);
    if (intent.input === "camera") cameraInputRef.current?.click();
    else uploadInputRef.current?.click();
  }

  function triggerCapture(input: "camera" | "upload", source: CameraRequestDetail["source"]) {
    if (captureCtx) {
      captureCtx.requestCapture(input, source);
      return;
    }
    requestCameraCapture(input, source);
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    if (busy) return;
    fileHandler.setIntent({ source: "quick_capture", input: "upload" });
    fileHandler.handleFile(event.dataTransfer.files[0], true);
  }

  return (
    <section className={visualOnly ? "flex h-full min-h-0 flex-col overflow-hidden bg-zinc-950" : "rounded-3xl border border-white/10 bg-slate-900/70 p-4 text-slate-50 shadow-lg shadow-black/30"}>
      {target && (
        <div className="mb-3 flex flex-col gap-2 rounded-2xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm font-bold text-amber-100 sm:flex-row sm:items-center sm:justify-between">
          <span>Next capture attaches to the selected plan pin.</span>
          <button type="button" onClick={clearTarget} className="rounded-xl bg-amber-500 px-3 py-2 text-xs font-black text-zinc-950 hover:bg-amber-400">Clear plan target</button>
        </div>
      )}

      <div className={visualOnly ? "min-h-0 flex-1 bg-zinc-950" : "rounded-3xl bg-slate-950/55 p-4 ring-1 ring-white/10"}>
        <div className={visualOnly ? "flex h-full min-h-0 flex-col items-center justify-center text-center" : "flex min-h-[280px] flex-col items-center justify-center text-center"}>
          {activePreview ? (
            <div className={visualOnly ? "relative h-full w-full" : "w-full space-y-3"}>
              <PhotoMarkupCanvas imageUrl={activePreview.url} title={activePreview.title} sessionId={sessionId} markupEnabled={markupEnabled} initialMarkup={isMarkupData(activeItem?.markup_data) ? activeItem.markup_data : undefined} attachmentPins={getItemPhotoAttachmentPins(activeItem)} onAttachmentPinsChange={(pins) => onAttachmentPinsChange?.(activePreview.itemId, pins)} onMarkupChange={(markup) => onMarkupChange?.(activePreview.itemId, markup)} />
              {visualOnly && <CaptureUploadBadge kind={status.kind} />}
              {!visualOnly && <div className="grid gap-2 sm:grid-cols-2">
                <button type="button" onClick={() => triggerCapture("camera", "next_item")} disabled={busy || !mounted} className="min-h-12 rounded-2xl bg-amber-500 px-4 py-3 text-base font-black text-slate-950 shadow-sm transition hover:bg-amber-400 disabled:opacity-60"><span className="inline-flex items-center gap-2"><Camera className="h-5 w-5" /> Capture next item</span></button>
                <button type="button" onClick={() => triggerCapture("upload", "next_item")} disabled={busy || !mounted} className="min-h-12 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-base font-black text-slate-200 transition hover:border-amber-400/50 hover:text-amber-200 disabled:opacity-60"><span className="inline-flex items-center gap-2"><FileImage className="h-5 w-5" /> Upload next image</span></button>
              </div>}
            </div>
          ) : (
            <>
          <Camera className="h-12 w-12 text-amber-400 md:hidden" />
          <FileImage className="hidden h-12 w-12 text-amber-400 md:block" />
          <h2 className="mt-4 text-2xl font-black text-white">Capture field proof</h2>
          <p className={`mt-2 max-w-lg text-sm leading-6 ${visualOnly ? "px-5 text-slate-300" : "text-slate-400"}`}>One tap opens the camera. The image appears immediately, the drawer opens for notes/classification, and upload/offline sync continues in the background.</p>
          <div className="mt-6 grid w-full max-w-xl gap-3 md:hidden">
            <button type="button" onClick={() => openCaptureInput({ source: "quick_capture", input: "camera" })} disabled={busy || !mounted} className="min-h-16 rounded-3xl bg-amber-500 px-5 py-4 text-lg font-black text-slate-950 shadow-lg shadow-amber-500/20 transition hover:bg-amber-400 disabled:opacity-60"><span className="inline-flex items-center gap-2"><Camera className="h-5 w-5" /> Take Photo</span></button>
            <button type="button" onClick={() => openCaptureInput({ source: "quick_capture", input: "upload" })} disabled={busy || !mounted} className="min-h-16 rounded-3xl border border-white/15 bg-white/10 px-5 py-4 text-lg font-black text-white transition hover:border-amber-400 disabled:opacity-60"><span className="inline-flex items-center gap-2"><FileImage className="h-5 w-5" /> Camera Roll</span></button>
          </div>
          <div onDragOver={(event) => { event.preventDefault(); setDragActive(true); }} onDragLeave={() => setDragActive(false)} onDrop={handleDrop} className={`mt-6 hidden w-full max-w-2xl rounded-3xl border-2 border-dashed p-10 transition md:flex md:min-h-64 md:flex-col md:items-center md:justify-center ${dragActive ? "border-amber-500 bg-amber-500/10" : "border-white/15 bg-white/[0.04]"}`}>
            <p className="text-2xl font-black text-white">Drag &amp; Drop Photos Here</p>
            <p className="mt-2 text-sm leading-6 text-slate-400">Desktop mode is upload-first for job trailer workflows.</p>
            <button type="button" onClick={() => openCaptureInput({ source: "quick_capture", input: "upload" })} disabled={busy || !mounted} className="mt-6 min-h-12 rounded-2xl bg-amber-500 px-6 py-3 text-sm font-black text-slate-950 transition hover:bg-amber-400 disabled:opacity-60"><span className="inline-flex items-center gap-2"><FileImage className="h-5 w-5" /> Select Photos from Computer</span></button>
          </div>
            </>
          )}
        </div>
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onClick={resetFileInputClick} onChange={(event) => handleFileInputChange(event, false)} />
        <input ref={uploadInputRef} type="file" accept="image/*" className="hidden" onClick={resetFileInputClick} onChange={(event) => handleFileInputChange(event, true)} />
      </div>

      {pendingUpload && <PendingUploadPreviewModal fileName={pendingUpload.file.name} imageUrl={pendingUpload.url} busy={busy} errorMessage={pendingUploadError} onCancel={fileHandler.cancelPendingUpload} onConfirmAttach={fileHandler.confirmPendingUpload} />}
      {!visualOnly && <CaptureQuickNotePanel busy={busy} onSaveTextNote={fileHandler.saveTextNote} />}
      {!visualOnly && <div className={`mt-4 flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm font-black ${statusClasses(status.kind)}`}><span className="inline-flex items-center gap-2">{busy && <Loader2 className="h-4 w-4 animate-spin" />}{status.message}</span>{status.kind !== "idle" && <button type="button" onClick={fileHandler.resetStatus} className="rounded-lg p-1 hover:bg-white/10" aria-label="Reset status"><RotateCcw className="h-4 w-4" /></button>}</div>}
    </section>
  );
}
