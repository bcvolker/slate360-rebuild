"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Loader2, X } from "lucide-react";
import type { PhotoAttachmentFile } from "@/lib/site-walk/photo-attachments";

type PreviewState = { url: string | null; loading: boolean; error: string | null };

type Props = {
  file: PhotoAttachmentFile;
  onClose: () => void;
};

export function PhotoAttachmentFilePreviewModal({ file, onClose }: Props) {
  const [preview, setPreview] = useState<PreviewState>({ url: null, loading: true, error: null });
  const isImage = file.type.startsWith("image/");

  useEffect(() => {
    let cancelled = false;
    async function loadPreview() {
      setPreview({ url: null, loading: true, error: null });
      try {
        const response = await fetch(`/api/slatedrop/download?fileId=${encodeURIComponent(file.id)}&mode=preview`, { cache: "no-store" });
        const data = (await response.json().catch(() => null)) as { url?: string; error?: string } | null;
        if (!response.ok || !data?.url) throw new Error(data?.error ?? "Preview unavailable.");
        if (!cancelled) setPreview({ url: data.url, loading: false, error: null });
      } catch (error) {
        if (!cancelled) setPreview({ url: null, loading: false, error: error instanceof Error ? error.message : "Preview unavailable." });
      }
    }
    void loadPreview();
    return () => { cancelled = true; };
  }, [file.id]);

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 p-3" role="dialog" aria-label={`Preview ${file.name}`} onClick={onClose}>
      <div className="flex max-h-[86dvh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-950 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-3 py-2">
          <p className="min-w-0 truncate text-sm font-black text-white">{file.name}</p>
          <button type="button" onClick={onClose} className="rounded-full border border-white/15 p-2 text-white/80" aria-label="Close preview"><X className="h-4 w-4" /></button>
        </div>
        <div className="min-h-72 flex-1 bg-black">
          {preview.loading ? <div className="flex h-72 items-center justify-center text-white"><Loader2 className="h-6 w-6 animate-spin" /></div> : preview.error ? <div className="flex h-72 items-center justify-center p-6 text-center text-sm font-bold text-rose-100">{preview.error}</div> : isImage ? <img src={preview.url ?? ""} alt={file.name} className="max-h-[70dvh] w-full object-contain" /> : <iframe src={preview.url ?? ""} title={file.name} className="h-[70dvh] w-full bg-white" />}
        </div>
        {preview.url && <a href={preview.url} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 border-t border-white/10 px-4 py-3 text-sm font-black text-cyan-100"><ExternalLink className="h-4 w-4" /> Open full file</a>}
      </div>
    </div>
  );
}
