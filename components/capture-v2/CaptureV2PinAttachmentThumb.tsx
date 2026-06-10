"use client";

import { useEffect, useState } from "react";
import { Check, FileText, Loader2 } from "lucide-react";
import type { PhotoAttachmentFile } from "@/lib/site-walk/photo-attachments";

type Props = {
  file: PhotoAttachmentFile;
  showSuccess?: boolean;
  onOpen: (file: PhotoAttachmentFile) => void;
};

export function CaptureV2PinAttachmentThumb({ file, showSuccess = false, onOpen }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const isImage = file.type.startsWith("image/");

  useEffect(() => {
    let cancelled = false;
    async function loadThumb() {
      if (!isImage) {
        setUrl(null);
        return;
      }
      setLoading(true);
      try {
        const response = await fetch(
          `/api/slatedrop/download?fileId=${encodeURIComponent(file.id)}&mode=preview`,
          { cache: "no-store" },
        );
        const data = (await response.json().catch(() => null)) as { url?: string } | null;
        if (!cancelled) setUrl(response.ok && data?.url ? data.url : null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadThumb();
    return () => {
      cancelled = true;
    };
  }, [file.id, isImage]);

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onOpen(file);
      }}
      className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_80%,transparent)]"
      aria-label={`View ${file.name}`}
      data-capture-chrome="pin-attach-thumb"
    >
      {loading ? (
        <span className="flex h-full items-center justify-center text-[var(--graphite-muted)]">
          <Loader2 className="h-4 w-4 animate-spin" />
        </span>
      ) : url ? (
        <img src={url} alt={file.name} className="h-full w-full object-cover" />
      ) : (
        <span className="flex h-full items-center justify-center text-[var(--graphite-muted)]">
          <FileText className="h-4 w-4" />
        </span>
      )}
      {showSuccess ? (
        <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--graphite-primary)] text-[var(--graphite-canvas)] shadow-md">
          <Check className="h-3 w-3" strokeWidth={3} />
        </span>
      ) : null}
    </button>
  );
}
