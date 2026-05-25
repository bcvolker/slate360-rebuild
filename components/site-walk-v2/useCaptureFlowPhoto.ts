"use client";

import { useCallback, useRef, useState, type ChangeEvent } from "react";
import {
  uploadCaptureDraftPhoto,
  type CaptureDraftPhotoUpload,
} from "@/lib/site-walk-v2/capture-photo-upload";

type Args = {
  sessionId: string;
  onUploaded: (upload: CaptureDraftPhotoUpload) => void;
};

export function useCaptureFlowPhoto({ sessionId, onUploaded }: Args) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const resetInput = useCallback((event: React.MouseEvent<HTMLInputElement>) => {
    (event.target as HTMLInputElement).value = "";
  }, []);

  const processFile = useCallback(
    async (file: File | undefined) => {
      if (!file || !file.type.startsWith("image/")) return;
      setUploadError(null);
      setUploading(true);
      try {
        const upload = await uploadCaptureDraftPhoto(sessionId, file);
        onUploaded(upload);
      } catch (error) {
        setUploadError(error instanceof Error ? error.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [onUploaded, sessionId],
  );

  const handleFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      void processFile(event.target.files?.[0]);
    },
    [processFile],
  );

  const openCamera = useCallback(() => {
    if (uploading) return;
    cameraInputRef.current?.click();
  }, [uploading]);

  const openGallery = useCallback(() => {
    if (uploading) return;
    galleryInputRef.current?.click();
  }, [uploading]);

  return {
    cameraInputRef,
    galleryInputRef,
    uploading,
    uploadError,
    resetInput,
    handleFileChange,
    openCamera,
    openGallery,
  };
}
