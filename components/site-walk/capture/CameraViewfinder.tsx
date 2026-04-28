"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, FileImage, Loader2, Mic, PencilLine, RotateCcw } from "lucide-react";
import { useCaptureUpload } from "@/lib/hooks/useCaptureUpload";
import { createOfflineId } from "@/lib/site-walk/offline-db";
import type { CaptureItemRecord } from "@/lib/types/site-walk-capture";
import { publishCaptureItemFocus } from "./capture-item-events";
import { PhotoMarkupCanvas } from "./PhotoMarkupCanvas";
import { usePlanCaptureTarget } from "./plan-capture-events";
import { VECTOR_TOOL_EVENT } from "./UnifiedVectorToolbar";

type Props = {
  sessionId: string;
};

export function CameraViewfinder({ sessionId }: Props) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [activePreview, setActivePreview] = useState<{ url: string; title: string } | null>(null);
  const [noteText, setNoteText] = useState("");
  const { target, clearTarget } = usePlanCaptureTarget();
  const { status, savePhoto, saveTextNote, resetStatus } = useCaptureUpload({ sessionId, planTarget: target, onPlanTargetSaved: clearTarget, onSaved: (item) => publishCaptureItemFocus({ item, reason: "captured", focus: false }) });
  const busy = status.kind === "uploading" || status.kind === "saving";

  useEffect(() => setMounted(true), []);

  useEffect(() => () => {
    if (activePreview?.url) URL.revokeObjectURL(activePreview.url);
  }, [activePreview?.url]);

  function handleFile(file: File | undefined) {
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    const clientItemId = createOfflineId("item");
    const clientMutationId = createOfflineId("mutation");
    const localItem = buildLocalPhotoItem(sessionId, file, previewUrl, clientItemId, clientMutationId);
    setActivePreview((current) => {
      if (current?.url) URL.revokeObjectURL(current.url);
      return { url: previewUrl, title: file.name };
    });
    publishCaptureItemFocus({ item: localItem, reason: "captured", focus: true });
    window.dispatchEvent(new CustomEvent(VECTOR_TOOL_EVENT, { detail: { tool: "draw" } }));
    void savePhoto(file, { clientItemId, clientMutationId, previewUrl });
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
    if (busy) return;
    handleFile(event.dataTransfer.files[0]);
  }

  return (
    <section className="rounded-3xl border border-slate-300 bg-white p-4">
      {target && (
        <div className="mb-3 flex flex-col gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-900 sm:flex-row sm:items-center sm:justify-between">
          <span>Next capture attaches to the selected plan pin.</span>
          <button type="button" onClick={clearTarget} className="rounded-xl bg-white px-3 py-2 text-xs font-black text-blue-800 hover:bg-blue-100">Clear plan target</button>
        </div>
      )}

      <div className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-300">
        <div className="flex min-h-[280px] flex-col items-center justify-center text-center">
          {activePreview ? (
            <PhotoMarkupCanvas imageUrl={activePreview.url} title={activePreview.title} />
          ) : (
            <>
          <Camera className="h-12 w-12 text-blue-800 md:hidden" />
          <FileImage className="hidden h-12 w-12 text-blue-800 md:block" />
          <h2 className="mt-4 text-2xl font-black text-slate-950">Capture field proof</h2>
          <p className="mt-2 max-w-lg text-sm leading-6 text-slate-700">
            Photos are metered before upload, stored through SlateDrop, and saved to the active walk with timestamp and GPS metadata when available.
          </p>

          <div className="mt-6 grid w-full max-w-xl gap-3 md:hidden">
            <button type="button" onClick={() => cameraInputRef.current?.click()} disabled={busy || !mounted} className="min-h-16 rounded-3xl bg-blue-600 px-5 py-4 text-lg font-black text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60">
              <span className="inline-flex items-center gap-2"><Camera className="h-5 w-5" /> Take Photo</span>
            </button>
            <button type="button" onClick={() => uploadInputRef.current?.click()} disabled={busy || !mounted} className="min-h-16 rounded-3xl border border-slate-300 bg-white px-5 py-4 text-lg font-black text-slate-900 transition hover:border-blue-300 hover:text-blue-800 disabled:opacity-60">
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

      <div className="mt-4 rounded-2xl border border-slate-300 bg-white p-4">
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
      </div>

      <div className={`mt-4 flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm font-black ${statusClasses(status.kind)}`}>
        <span className="inline-flex items-center gap-2">{busy && <Loader2 className="h-4 w-4 animate-spin" />}{status.message}</span>
        {status.kind !== "idle" && <button type="button" onClick={resetStatus} className="rounded-lg p-1 hover:bg-white/60" aria-label="Reset status"><RotateCcw className="h-4 w-4" /></button>}
      </div>
    </section>
  );
}

function buildLocalPhotoItem(sessionId: string, file: File, previewUrl: string, clientItemId: string, clientMutationId: string): CaptureItemRecord {
  const now = new Date().toISOString();
  return {
    id: clientItemId,
    session_id: sessionId,
    client_item_id: clientItemId,
    client_mutation_id: clientMutationId,
    item_type: "photo",
    title: file.name,
    description: null,
    category: null,
    priority: "medium",
    item_status: "open",
    assigned_to: null,
    capture_mode: "camera",
    sync_state: "pending",
    upload_state: "queued",
    local_preview_url: previewUrl,
    created_at: now,
    updated_at: now,
  };
}

function statusClasses(kind: string) {
  if (kind === "complete") return "bg-emerald-50 text-emerald-800";
  if (kind === "error") return "bg-rose-50 text-rose-800";
  if (kind === "uploading" || kind === "saving") return "bg-blue-50 text-blue-900";
  return "bg-slate-50 text-slate-700";
}
