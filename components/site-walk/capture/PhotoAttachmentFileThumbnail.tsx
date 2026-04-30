"use client";

import { useEffect, useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import type { PhotoAttachmentFile } from "@/lib/site-walk/photo-attachments";

type Props = {
  file: PhotoAttachmentFile | undefined;
  onOpen: (file: PhotoAttachmentFile) => void;
};

export function PhotoAttachmentFileThumbnail({ file, onOpen }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const isImage = Boolean(file?.type.startsWith("image/"));

  useEffect(() => {
    let cancelled = false;
    async function loadThumb() {
      if (!file || !isImage) {
        setUrl(null);
        return;
      }
      setLoading(true);
      try {
        const response = await fetch(`/api/slatedrop/download?fileId=${encodeURIComponent(file.id)}&mode=preview`, { cache: "no-store" });
        const data = (await response.json().catch(() => null)) as { url?: string } | null;
        if (!cancelled) setUrl(response.ok && data?.url ? data.url : null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadThumb();
    return () => { cancelled = true; };
  }, [file, isImage]);

  if (!file) return null;

  return (
    <button type="button" onClick={(event) => { event.stopPropagation(); onOpen(file); }} className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-cyan-200/30 bg-slate-950 text-cyan-100" aria-label={`Preview ${file.name}`}>
      {loading ? <span className="flex h-full items-center justify-center"><Loader2 className="h-4 w-4 animate-spin" /></span> : url ? <img src={url} alt={file.name} className="h-full w-full object-cover" /> : <span className="flex h-full items-center justify-center"><FileText className="h-5 w-5" /></span>}
    </button>
  );
}
