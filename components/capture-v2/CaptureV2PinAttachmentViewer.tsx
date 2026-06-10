"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { PhotoAttachmentFilePreviewModal } from "@/components/site-walk/capture/PhotoAttachmentFilePreviewModal";
import type { PhotoAttachmentFile } from "@/lib/site-walk/photo-attachments";

type Props = {
  file: PhotoAttachmentFile;
  onClose: () => void;
};

export function CaptureV2PinAttachmentViewer({ file, onClose }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[5000] touch-none bg-black/90" style={{ touchAction: "none" }}>
      <PhotoAttachmentFilePreviewModal file={file} onClose={onClose} />
    </div>,
    document.body,
  );
}
