"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { FileUp, Loader2, Paperclip, Trash2, X } from "lucide-react";
import { PHOTO_ATTACHMENT_MAX_FILE_BYTES, PHOTO_ATTACHMENT_MAX_FILES, type PhotoAttachmentFile, type PhotoAttachmentPin } from "@/lib/site-walk/photo-attachments";
import { PhotoAttachmentFilePreviewModal } from "./PhotoAttachmentFilePreviewModal";
import { PhotoAttachmentFileThumbnail } from "./PhotoAttachmentFileThumbnail";

type DraftPin = { xPct: number; yPct: number } | null;
type Transform = { x: number; y: number; scale: number };
type UploadResponse = { uploadUrl?: string; fileId?: string; error?: string };
type PinDragState = { pinId: string; pointerId: number; startX: number; startY: number; dragging: boolean } | null;

type Props = {
  sessionId: string;
  pins: PhotoAttachmentPin[];
  draftPin: DraftPin;
  transform: Transform;
  onDraftClose: () => void;
  onPinsChange: (pins: PhotoAttachmentPin[]) => void;
};

export function PhotoAttachmentPins({ sessionId, pins, draftPin, transform, onDraftClose, onPinsChange }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const localPinsRef = useRef(pins);
  const dragRef = useRef<PinDragState>(null);
  const [localPins, setLocalPins] = useState(pins);
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [editingPinId, setEditingPinId] = useState<string | null>(null);
  const [draggingPinId, setDraggingPinId] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<PhotoAttachmentFile | null>(null);
  const [label, setLabel] = useState("");
  const [note, setNote] = useState("");
  const [files, setFiles] = useState<PhotoAttachmentFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    localPinsRef.current = pins;
    setLocalPins(pins);
  }, [pins]);

  async function uploadFiles(fileList: FileList | null) {
    const selectedFiles = Array.from(fileList ?? []).slice(0, PHOTO_ATTACHMENT_MAX_FILES - files.length);
    if (selectedFiles.length === 0) return;
    setUploading(true);
    setMessage(null);
    try {
      const uploaded: PhotoAttachmentFile[] = [];
      for (const file of selectedFiles) {
        if (file.size > PHOTO_ATTACHMENT_MAX_FILE_BYTES) throw new Error(`${file.name} is over 25MB.`);
        const prepared = await prepareUpload(sessionId, file);
        await putFile(prepared.uploadUrl, file);
        await completeUpload(prepared.fileId);
        uploaded.push({ id: prepared.fileId, name: file.name, size: file.size, type: file.type || "application/octet-stream" });
      }
      const savedFiles = [...files, ...uploaded].slice(0, PHOTO_ATTACHMENT_MAX_FILES);
      setFiles(savedFiles);
      if (draftPin) savePin(savedFiles);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "File upload failed.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function savePin(pinFiles = files) {
    if (!draftPin) return;
    const nextPin: PhotoAttachmentPin = {
      id: `photo-pin-${Date.now()}`,
      xPct: draftPin.xPct,
      yPct: draftPin.yPct,
      label: label.trim() || pinFiles[0]?.name || "Pinned file",
      note: note.trim(),
      files: pinFiles,
      createdAt: new Date().toISOString(),
    };
    const nextPins = [...localPins, nextPin];
    localPinsRef.current = nextPins;
    setLocalPins(nextPins);
    onPinsChange(nextPins);
    resetModal();
  }

  function resetModal() {
    setLabel("");
    setNote("");
    setFiles([]);
    setMessage(null);
    onDraftClose();
  }

  function removePin(pinId: string) {
    const nextPins = localPins.filter((pin) => pin.id !== pinId);
    localPinsRef.current = nextPins;
    setLocalPins(nextPins);
    onPinsChange(nextPins);
    if (selectedPinId === pinId) setSelectedPinId(null);
    if (editingPinId === pinId) setEditingPinId(null);
  }

  function startEdit(pin: PhotoAttachmentPin) {
    setEditingPinId(pin.id);
    setLabel(pin.label);
    setNote(pin.note);
  }

  function savePinEdits() {
    if (!editingPinId) return;
    const nextPins = localPins.map((pin) => pin.id === editingPinId ? { ...pin, label: label.trim() || pin.label, note: note.trim() } : pin);
    localPinsRef.current = nextPins;
    setLocalPins(nextPins);
    onPinsChange(nextPins);
    setEditingPinId(null);
    setLabel("");
    setNote("");
  }

  function beginPinPress(event: ReactPointerEvent<HTMLButtonElement>, pin: PhotoAttachmentPin) {
    event.stopPropagation();
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { pinId: pin.id, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, dragging: false };
  }

  function movePressedPin(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.stopPropagation();
    event.preventDefault();
    if (!drag.dragging && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 3) {
      drag.dragging = true;
      setDraggingPinId(drag.pinId);
      setSelectedPinId(null);
      setEditingPinId(null);
    }
    if (!drag.dragging) return;
    updatePinPosition(drag.pinId, event.clientX, event.clientY);
  }

  function endPinPress(event: ReactPointerEvent<HTMLButtonElement>, pin: PhotoAttachmentPin) {
    const drag = dragRef.current;
    event.stopPropagation();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    dragRef.current = null;
    setDraggingPinId(null);
    if (drag?.dragging) {
      onPinsChange(localPinsRef.current);
      return;
    }
    setSelectedPinId((current) => current === pin.id ? null : pin.id);
  }

  function updatePinPosition(pinId: string, clientX: number, clientY: number) {
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return;
    const xPct = clamp(((clientX - rect.left) / rect.width) * 100, 0, 100);
    const yPct = clamp(((clientY - rect.top) / rect.height) * 100, 0, 100);
    setLocalPins((currentPins) => {
      const nextPins = currentPins.map((pin) => pin.id === pinId ? { ...pin, xPct, yPct } : pin);
      localPinsRef.current = nextPins;
      return nextPins;
    });
  }

  return (
    <>
      <div ref={overlayRef} className="pointer-events-none absolute inset-0" style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`, transformOrigin: "center" }}>
        {localPins.map((pin) => (
          <div key={pin.id} className="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${pin.xPct}%`, top: `${pin.yPct}%` }}>
            <button type="button" onPointerDown={(event) => beginPinPress(event, pin)} onPointerMove={movePressedPin} onPointerUp={(event) => endPinPress(event, pin)} onPointerCancel={(event) => endPinPress(event, pin)} className={`flex h-7 w-7 touch-none items-center justify-center rounded-full border text-white shadow-[0_0_0_2px_rgba(0,0,0,0.55),0_8px_22px_rgba(8,145,178,0.35)] backdrop-blur-md ${draggingPinId === pin.id ? "scale-110 border-white bg-cyan-300 text-slate-950" : "border-cyan-100 bg-cyan-500/95"}`} aria-label={`Hold and drag attachment ${pin.label}`}><Paperclip className="h-3.5 w-3.5" /></button>
            {selectedPinId === pin.id && (
              <div className="absolute left-1/2 top-8 z-40 flex w-60 -translate-x-1/2 gap-2 rounded-2xl border border-cyan-300/25 bg-slate-950/95 p-2 text-white shadow-2xl backdrop-blur-xl">
                <button type="button" onClick={(event) => { event.stopPropagation(); startEdit(pin); }} className="min-w-0 flex-1 text-left">
                  <p className="truncate text-xs font-black text-cyan-100">{pin.label}</p>
                  <p className="mt-1 line-clamp-2 text-[11px] font-bold text-white/65">{pin.note || `${pin.files.length} attached file${pin.files.length === 1 ? "" : "s"}`}</p>
                  <p className="mt-2 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-200/80">Tap to edit</p>
                </button>
                <PhotoAttachmentFileThumbnail file={pin.files[0]} onOpen={setPreviewFile} />
              </div>
            )}
          </div>
        ))}
      </div>

      {draftPin && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/25 p-4">
        <div className="max-h-[78dvh] w-full max-w-md overflow-y-auto rounded-[1.5rem] border border-white/15 bg-zinc-950/94 p-3 text-white shadow-2xl backdrop-blur-xl no-scrollbar">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-blue-100">Pin files to photo</p>
              <p className="mt-1 text-xs font-semibold text-white/70">Add up to {PHOTO_ATTACHMENT_MAX_FILES} files, max 25MB each.</p>
            </div>
            <button type="button" onClick={resetModal} className="rounded-full border border-white/15 p-2 text-white/80"><X className="h-4 w-4" /></button>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <input value={label} onChange={(event) => setLabel(event.target.value)} className="rounded-2xl border border-white/15 bg-white/10 px-3 py-2 text-sm font-bold outline-none placeholder:text-white/40" placeholder="Proposal, submittal, quote…" />
            <input value={note} onChange={(event) => setNote(event.target.value)} className="rounded-2xl border border-white/15 bg-white/10 px-3 py-2 text-sm font-bold outline-none placeholder:text-white/40" placeholder="Brief note" />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(event) => void uploadFiles(event.target.files)} />
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading || files.length >= PHOTO_ATTACHMENT_MAX_FILES} className="inline-flex min-h-10 items-center gap-2 rounded-2xl bg-blue-600 px-3 text-sm font-black text-white disabled:opacity-50">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />} Add files
            </button>
            <button type="button" onClick={() => savePin()} disabled={!label.trim() && files.length === 0} className="min-h-10 rounded-2xl bg-white px-4 text-sm font-black text-zinc-950 disabled:opacity-50">Save pin</button>
            {message && <span className="text-xs font-bold text-rose-200">{message}</span>}
          </div>
          {files.length > 0 && <div className="mt-3 flex gap-2 overflow-x-auto pb-1 no-scrollbar">{files.map((file) => <FileChip key={file.id} file={file} onRemove={() => setFiles((current) => current.filter((item) => item.id !== file.id))} />)}</div>}
        </div>
        </div>
      )}

      {editingPinId && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/25 p-4">
        <div className="max-h-[78dvh] w-full max-w-md overflow-y-auto rounded-[1.5rem] border border-cyan-300/20 bg-slate-950/95 p-3 text-white shadow-2xl backdrop-blur-xl no-scrollbar">
          <div className="flex items-start justify-between gap-3">
            <div><p className="text-[11px] font-black uppercase tracking-[0.16em] text-cyan-100">Edit pinned file</p><p className="mt-1 text-xs font-semibold text-white/60">Update the marker name or field note.</p></div>
            <button type="button" onClick={() => setEditingPinId(null)} className="rounded-full border border-white/15 p-2 text-white/80"><X className="h-4 w-4" /></button>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <input value={label} onChange={(event) => setLabel(event.target.value)} className="rounded-2xl border border-white/15 bg-white/10 px-3 py-2 text-sm font-bold outline-none placeholder:text-white/40" placeholder="Attachment name" />
            <input value={note} onChange={(event) => setNote(event.target.value)} className="rounded-2xl border border-white/15 bg-white/10 px-3 py-2 text-sm font-bold outline-none placeholder:text-white/40" placeholder="Brief note" />
          </div>
          <div className="mt-3 flex gap-2"><button type="button" onClick={savePinEdits} className="min-h-10 rounded-2xl bg-cyan-300 px-4 text-sm font-black text-slate-950">Save changes</button><button type="button" onClick={() => editingPinId && removePin(editingPinId)} className="min-h-10 rounded-2xl border border-rose-300/30 bg-rose-500/10 px-4 text-sm font-black text-rose-100">Remove pin</button></div>
        </div>
        </div>
      )}

      {previewFile && <PhotoAttachmentFilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />}
    </>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function FileChip({ file, onRemove }: { file: PhotoAttachmentFile; onRemove: () => void }) {
  return <span className="inline-flex max-w-56 shrink-0 items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-xs font-black text-white"><Paperclip className="h-3.5 w-3.5 text-blue-300" /><span className="truncate">{file.name}</span><button type="button" onClick={onRemove} aria-label={`Remove ${file.name}`}><Trash2 className="h-3.5 w-3.5" /></button></span>;
}

async function prepareUpload(sessionId: string, file: File): Promise<{ uploadUrl: string; fileId: string }> {
  const response = await fetch("/api/site-walk/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename: file.name, contentType: file.type || "application/octet-stream", sessionId, fileSizeBytes: file.size }),
  });
  const data = (await response.json().catch(() => null)) as UploadResponse | null;
  if (!response.ok || !data?.uploadUrl || !data.fileId) throw new Error(data?.error ?? "Could not prepare upload.");
  return { uploadUrl: data.uploadUrl, fileId: data.fileId };
}

async function putFile(uploadUrl: string, file: File) {
  const response = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": file.type || "application/octet-stream" }, body: file });
  if (!response.ok) throw new Error(`Upload failed for ${file.name}.`);
}

async function completeUpload(fileId: string) {
  const response = await fetch("/api/slatedrop/complete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fileId }) });
  if (!response.ok) throw new Error("Could not finalize upload.");
}
