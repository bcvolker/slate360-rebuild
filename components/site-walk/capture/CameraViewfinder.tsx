"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Check, FileImage, Loader2, Mic, PencilLine, RotateCcw } from "lucide-react";
import { useCaptureUpload } from "@/lib/hooks/useCaptureUpload";
import { isMarkupData, type MarkupData } from "@/lib/site-walk/markup-types";
import { getPhotoAttachmentPins, type PhotoAttachmentPin } from "@/lib/site-walk/photo-attachments";
import { createOfflineId } from "@/lib/site-walk/offline-db";
import { compressCaptureFile } from "@/lib/site-walk/image-compression";
import { getCaptureImageUrl } from "@/lib/site-walk/capture-image-url";
import { readQuickCaptureLaunch, removeQuickCaptureLaunch } from "@/lib/site-walk/quick-capture-launch";
import type { CaptureItemRecord } from "@/lib/types/site-walk-capture";
import { requestCameraCapture, subscribeCameraCapture } from "./capture-camera-events";
import { publishCaptureItemFocus } from "./capture-item-events";
import { PhotoMarkupCanvas } from "./PhotoMarkupCanvas";
import { usePlanCaptureTarget } from "./plan-capture-events";
import { VECTOR_TOOL_EVENT } from "./UnifiedVectorToolbar";

type Props = {
  sessionId: string;
  autoOpenCamera?: boolean;
  launchId?: string | null;
  layout?: "full" | "visual";
  activeItem?: CaptureItemRecord | null;
  markupEnabled?: boolean;
  onMarkupChange?: (itemId: string, markup: MarkupData) => void;
  onAttachmentPinsChange?: (itemId: string, pins: PhotoAttachmentPin[]) => void;
};

export function CameraViewfinder({ sessionId, autoOpenCamera = false, launchId = null, layout = "full", activeItem = null, markupEnabled = true, onMarkupChange, onAttachmentPinsChange }: Props) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const consumedLaunchRef = useRef<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [activePreview, setActivePreview] = useState<{ url: string; title: string; itemId: string } | null>(null);
  const [noteText, setNoteText] = useState("");
  const { target, clearTarget } = usePlanCaptureTarget();
  const { status, savePhoto, saveTextNote, resetStatus } = useCaptureUpload({ sessionId, planTarget: target, onPlanTargetSaved: clearTarget, onSaved: (item) => publishCaptureItemFocus({ item, reason: "captured", focus: false }) });
  const busy = status.kind === "uploading" || status.kind === "saving";
  const visualOnly = layout === "visual";

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    return subscribeCameraCapture((detail) => {
      if (detail.input === "camera") cameraInputRef.current?.click();
      else uploadInputRef.current?.click();
    });
  }, [mounted]);

  useEffect(() => {
    if (!mounted || !autoOpenCamera) return;
    const timeout = window.setTimeout(() => cameraInputRef.current?.click(), 350);
    return () => window.clearTimeout(timeout);
  }, [autoOpenCamera, mounted]);

  useEffect(() => {
    if (!mounted || !launchId || consumedLaunchRef.current === launchId) return;
    consumedLaunchRef.current = launchId;
    void readQuickCaptureLaunch(launchId).then((launch) => {
      if (launch?.file) handleFile(launch.file);
      return removeQuickCaptureLaunch(launchId);
    });
  }, [launchId, mounted]);

  useEffect(() => {
    if (!activeItem || activePreview?.itemId === activeItem.id) return;
    const url = getCaptureImageUrl(activeItem);
    if (!url) return;
    setActivePreview((current) => {
      if (current?.url === url) return { ...current, title: activeItem.title || current.title, itemId: activeItem.id };
      return { url, title: activeItem.title || "Captured photo", itemId: activeItem.id };
    });
  }, [activeItem, activePreview?.itemId]);

  function handleFile(file: File | undefined) {
    if (!file) return;
    void prepareCaptureFile(file);
  }

  async function prepareCaptureFile(file: File) {
    const captureFile = await compressCaptureFile(file);
    const previewUrl = URL.createObjectURL(captureFile);
    const clientItemId = createOfflineId("item");
    const clientMutationId = createOfflineId("mutation");
    const title = readLastTitle(sessionId);
    const localItem = buildLocalPhotoItem(sessionId, title, previewUrl, clientItemId, clientMutationId);
    setActivePreview({ url: previewUrl, title: title || "Captured photo", itemId: clientItemId });
    publishCaptureItemFocus({ item: localItem, reason: "captured", focus: true });
    window.dispatchEvent(new CustomEvent(VECTOR_TOOL_EVENT, { detail: { tool: "select" } }));
    void savePhoto(captureFile, { clientItemId, clientMutationId, previewUrl, title });
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
    if (busy) return;
    handleFile(event.dataTransfer.files[0]);
  }

  return (
    <section className={visualOnly ? "flex h-full min-h-0 flex-col overflow-hidden bg-zinc-950" : "rounded-3xl border border-slate-300 bg-white p-4"}>
      {target && (
        <div className="mb-3 flex flex-col gap-2 rounded-2xl border border-blue-500/35 bg-blue-500/10 px-4 py-3 text-sm font-bold text-blue-100 sm:flex-row sm:items-center sm:justify-between">
          <span>Next capture attaches to the selected plan pin.</span>
          <button type="button" onClick={clearTarget} className="rounded-xl bg-white px-3 py-2 text-xs font-black text-zinc-950 hover:bg-blue-50">Clear plan target</button>
        </div>
      )}

      <div className={visualOnly ? "min-h-0 flex-1 bg-zinc-950" : "rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-300"}>
        <div className={visualOnly ? "flex h-full min-h-0 flex-col items-center justify-center text-center" : "flex min-h-[280px] flex-col items-center justify-center text-center"}>
          {activePreview ? (
            <div className={visualOnly ? "relative h-full w-full" : "w-full space-y-3"}>
              <PhotoMarkupCanvas
                imageUrl={activePreview.url}
                title={activePreview.title}
                sessionId={sessionId}
                markupEnabled={markupEnabled}
                initialMarkup={isMarkupData(activeItem?.markup_data) ? activeItem.markup_data : undefined}
                attachmentPins={getPhotoAttachmentPins(activeItem?.metadata)}
                onAttachmentPinsChange={(pins) => onAttachmentPinsChange?.(activePreview.itemId, pins)}
                onMarkupChange={(markup) => onMarkupChange?.(activePreview.itemId, markup)}
              />
              {visualOnly && <UploadBadge kind={status.kind} />}
              {!visualOnly && <div className="grid gap-2 sm:grid-cols-2">
                <button type="button" onClick={() => requestCameraCapture("camera", "next_item")} disabled={busy || !mounted} className="min-h-12 rounded-2xl bg-blue-600 px-4 py-3 text-base font-black text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60">
                  <span className="inline-flex items-center gap-2"><Camera className="h-5 w-5" /> Capture next item</span>
                </button>
                <button type="button" onClick={() => requestCameraCapture("upload", "next_item")} disabled={busy || !mounted} className="min-h-12 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base font-black text-slate-900 transition hover:border-blue-300 hover:text-blue-800 disabled:opacity-60">
                  <span className="inline-flex items-center gap-2"><FileImage className="h-5 w-5" /> Upload next image</span>
                </button>
              </div>}
            </div>
          ) : (
            <>
          <Camera className="h-12 w-12 text-blue-400 md:hidden" />
          <FileImage className="hidden h-12 w-12 text-blue-400 md:block" />
          <h2 className={`mt-4 text-2xl font-black ${visualOnly ? "text-white" : "text-slate-950"}`}>Capture field proof</h2>
          <p className={`mt-2 max-w-lg text-sm leading-6 ${visualOnly ? "px-5 text-slate-300" : "text-slate-700"}`}>
            One tap opens the camera. The image appears immediately, the drawer opens for notes/classification, and upload/offline sync continues in the background.
          </p>

          <div className="mt-6 grid w-full max-w-xl gap-3 md:hidden">
            <button type="button" onClick={() => cameraInputRef.current?.click()} disabled={busy || !mounted} className="min-h-16 rounded-3xl bg-blue-600 px-5 py-4 text-lg font-black text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-700 disabled:opacity-60">
              <span className="inline-flex items-center gap-2"><Camera className="h-5 w-5" /> Take Photo</span>
            </button>
            <button type="button" onClick={() => uploadInputRef.current?.click()} disabled={busy || !mounted} className="min-h-16 rounded-3xl border border-white/15 bg-white/10 px-5 py-4 text-lg font-black text-white transition hover:border-blue-400 disabled:opacity-60">
              <span className="inline-flex items-center gap-2"><FileImage className="h-5 w-5" /> Camera Roll</span>
            </button>
          </div>

          <div
            onDragOver={(event) => { event.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            className={`mt-6 hidden w-full max-w-2xl rounded-3xl border-2 border-dashed p-10 transition md:flex md:min-h-64 md:flex-col md:items-center md:justify-center ${dragActive ? "border-blue-500 bg-blue-50" : "border-slate-300 bg-white"}`}
          >
            <p className="text-2xl font-black text-slate-950">Drag &amp; Drop Photos Here</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">Desktop mode is upload-first for job trailer workflows.</p>
            <button type="button" onClick={() => uploadInputRef.current?.click()} disabled={busy || !mounted} className="mt-6 min-h-12 rounded-2xl bg-blue-600 px-6 py-3 text-sm font-black text-white transition hover:bg-blue-700 disabled:opacity-60">
              <span className="inline-flex items-center gap-2"><FileImage className="h-5 w-5" /> Select Photos from Computer</span>
            </button>
          </div>
            </>
          )}
        </div>

        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => { handleFile(event.target.files?.[0]); event.target.value = ""; }} />
        <input ref={uploadInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => { handleFile(event.target.files?.[0]); event.target.value = ""; }} />
      </div>

      {!visualOnly && <div className="mt-4 rounded-2xl border border-slate-300 bg-white p-4">
        <div className="flex items-center gap-2 text-sm font-black text-slate-900"><PencilLine className="h-4 w-4 text-blue-700" /> Quick text / voice note</div>
        <textarea
          value={noteText}
          onChange={(event) => setNoteText(event.target.value)}
          rows={5}
          inputMode="text"
          placeholder="Tap here to type, or use the native iOS/Android microphone on the keyboard to dictate a field note…"
          className="mt-3 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-base leading-6 text-slate-900 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-700/15"
        />
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <button type="button" onClick={() => void saveTextNote(noteText, "text")} disabled={busy || !noteText.trim()} className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-900 hover:border-blue-300 disabled:opacity-60">Save Text Note</button>
          <button type="button" onClick={() => void saveTextNote(noteText, "voice")} disabled={busy || !noteText.trim()} className="min-h-11 rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-60"><span className="inline-flex items-center gap-2"><Mic className="h-4 w-4" /> Save Voice Note</span></button>
        </div>
      </div>}

      {!visualOnly && <div className={`mt-4 flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm font-black ${statusClasses(status.kind)}`}>
        <span className="inline-flex items-center gap-2">{busy && <Loader2 className="h-4 w-4 animate-spin" />}{status.message}</span>
        {status.kind !== "idle" && <button type="button" onClick={resetStatus} className="rounded-lg p-1 hover:bg-white/60" aria-label="Reset status"><RotateCcw className="h-4 w-4" /></button>}
      </div>}
    </section>
  );
}

function buildLocalPhotoItem(sessionId: string, title: string, previewUrl: string, clientItemId: string, clientMutationId: string): CaptureItemRecord {
  const now = new Date().toISOString();
  return {
    id: clientItemId,
    session_id: sessionId,
    client_item_id: clientItemId,
    client_mutation_id: clientMutationId,
    item_type: "photo",
    title,
    description: null,
    category: null,
    priority: "medium",
    item_status: "open",
    assigned_to: null,
    due_date: null,
    capture_mode: "camera",
    sync_state: "pending",
    upload_state: "queued",
    metadata: {},
    photo_attachment_pins: [],
    local_preview_url: previewUrl,
    created_at: now,
    updated_at: now,
  };
}

function readLastTitle(sessionId: string) {
  if (typeof sessionStorage === "undefined") return "";
  return sessionStorage.getItem(`site-walk:current-location:${sessionId}`) ?? sessionStorage.getItem(`site-walk:last-title:${sessionId}`) ?? "";
}

function statusClasses(kind: string) {
  if (kind === "complete") return "bg-blue-50 text-blue-900 ring-1 ring-blue-200";
  if (kind === "error") return "bg-rose-50 text-rose-800";
  if (kind === "uploading" || kind === "saving") return "bg-blue-50 text-blue-900";
  return "bg-zinc-900/80 text-zinc-200 ring-1 ring-white/10";
}

function UploadBadge({ kind }: { kind: string }) {
  const active = kind === "uploading" || kind === "saving";
  return <div className="absolute right-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/60 text-white shadow-xl backdrop-blur-xl" aria-label={active ? "Uploading capture" : "Capture upload ready"}>{active ? <Loader2 className="h-5 w-5 animate-spin text-blue-300" /> : <Check className="h-5 w-5 text-blue-300" />}</div>;
}
