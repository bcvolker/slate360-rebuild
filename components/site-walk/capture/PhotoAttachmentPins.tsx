"use client";

import { useEffect, useRef, useState } from "react";
import { FileUp, Loader2, Paperclip, Trash2, X } from "lucide-react";
import { PHOTO_ATTACHMENT_MAX_FILE_BYTES, PHOTO_ATTACHMENT_MAX_FILES, type PhotoAttachmentFile, type PhotoAttachmentPin } from "@/lib/site-walk/photo-attachments";

type DraftPin = { xPct: number; yPct: number } | null;
type Transform = { x: number; y: number; scale: number };
type UploadResponse = { uploadUrl?: string; fileId?: string; error?: string };

type Props = {
  sessionId: string;
  pins: PhotoAttachmentPin[];
  draftPin: DraftPin;
  transform: Transform;
  onDraftClose: () => void;
  onPinsChange: (pins: PhotoAttachmentPin[]) => void;
};

export function PhotoAttachmentPins({ sessionId, pins, draftPin, transform, onDraftClose, onPinsChange }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [localPins, setLocalPins] = useState(pins);
  const [label, setLabel] = useState("");
  const [note, setNote] = useState("");
  const [files, setFiles] = useState<PhotoAttachmentFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => setLocalPins(pins), [pins]);

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
    setLocalPins(nextPins);
    onPinsChange(nextPins);
  }

  return (
    <>
      <div className="pointer-events-none absolute inset-0" style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`, transformOrigin: "center" }}>
        {localPins.map((pin) => (
          <div key={pin.id} className="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${pin.xPct}%`, top: `${pin.yPct}%` }}>
            <div className="group flex h-9 min-w-9 items-center justify-center gap-1 rounded-full border-2 border-blue-200 bg-blue-600/90 px-2 text-[10px] font-black text-white shadow-[0_0_0_3px_rgba(0,0,0,0.45)] backdrop-blur-md">
              <Paperclip className="h-4 w-4 text-white" />
              <span className="max-w-24 truncate opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">{pin.label}</span>
              <button type="button" onClick={() => removePin(pin.id)} className="ml-1 rounded-full bg-white/15 p-1 text-white" aria-label={`Delete ${pin.label}`}><X className="h-3 w-3" /></button>
            </div>
          </div>
        ))}
      </div>

      {draftPin && (
        <div className="absolute inset-x-3 bottom-3 z-30 rounded-[1.5rem] border border-white/15 bg-zinc-950/88 p-3 text-white shadow-2xl backdrop-blur-xl">
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
      )}
    </>
  );
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
