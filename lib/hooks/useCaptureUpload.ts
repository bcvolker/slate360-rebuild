"use client";

import { useCallback, useState } from "react";
import { captureMetadata } from "@/lib/site-walk/metadata";
import type { CaptureMetadata } from "@/lib/site-walk/metadata";

type CaptureStatus =
  | { kind: "idle"; message: string }
  | { kind: "uploading"; message: string }
  | { kind: "saving"; message: string }
  | { kind: "complete"; message: string }
  | { kind: "error"; message: string };

type UploadResponse = { uploadUrl?: string; s3Key?: string; fileId?: string; error?: string };
type ItemResponse = { item?: { id: string }; error?: string; warnings?: string[] };

type UseCaptureUploadParams = {
  sessionId: string;
  onSaved?: () => void;
};

export function useCaptureUpload({ sessionId, onSaved }: UseCaptureUploadParams) {
  const [status, setStatus] = useState<CaptureStatus>({ kind: "idle", message: "Ready to capture." });

  const savePhoto = useCallback(async (file: File) => {
    setStatus({ kind: "uploading", message: "Uploading (1/1)..." });
    try {
      const metadata = await captureMetadata();
      const presign = await fetch("/api/site-walk/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || "image/jpeg",
          sessionId,
          fileSizeBytes: file.size,
        }),
      });
      const upload = (await presign.json().catch(() => null)) as UploadResponse | null;
      if (!presign.ok || !upload?.uploadUrl || !upload.s3Key) {
        throw new Error(upload?.error ?? "Upload preflight failed");
      }

      const put = await fetch(upload.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "image/jpeg" },
        body: file,
      });
      if (!put.ok) throw new Error("Storage upload failed");

      setStatus({ kind: "saving", message: "Saving capture to the walk..." });
      await createItem({ sessionId, itemType: "photo", title: file.name, fileId: upload.fileId, s3Key: upload.s3Key, metadata, file });
      setStatus({ kind: "complete", message: "Photo saved to Site Walk Files / Photos." });
      onSaved?.();
    } catch (error) {
      setStatus({ kind: "error", message: error instanceof Error ? error.message : "Photo upload failed." });
    }
  }, [onSaved, sessionId]);

  const saveTextNote = useCallback(async (text: string, mode: "text" | "voice") => {
    if (!text.trim()) return;
    setStatus({ kind: "saving", message: mode === "voice" ? "Saving voice/dictation note..." : "Saving text note..." });
    try {
      const metadata = await captureMetadata();
      await createItem({
        sessionId,
        itemType: mode === "voice" ? "voice_note" : "text_note",
        title: text.trim().slice(0, 80),
        description: text.trim(),
        metadata: { ...metadata, note_mode: mode, captured_from: "prompt_6_capture_engine" },
      });
      setStatus({ kind: "complete", message: mode === "voice" ? "Voice/dictation note saved." : "Text note saved." });
      onSaved?.();
    } catch (error) {
      setStatus({ kind: "error", message: error instanceof Error ? error.message : "Note save failed." });
    }
  }, [onSaved, sessionId]);

  return { status, savePhoto, saveTextNote, resetStatus: () => setStatus({ kind: "idle", message: "Ready to capture." }) };
}

async function createItem(params: {
  sessionId: string;
  itemType: "photo" | "text_note" | "voice_note";
  title: string;
  description?: string;
  fileId?: string | null;
  s3Key?: string | null;
  metadata: CaptureMetadata | Record<string, unknown>;
  file?: File;
}) {
  const metadataRecord = params.metadata as Record<string, unknown>;
  const gps = isGps(metadataRecord.gps) ? metadataRecord.gps : null;
  const body = {
    session_id: params.sessionId,
    item_type: params.itemType,
    title: params.title,
    description: params.description,
    file_id: params.fileId ?? null,
    s3_key: params.s3Key ?? null,
    latitude: gps?.latitude ?? null,
    longitude: gps?.longitude ?? null,
    weather: metadataRecord.weather ?? null,
    metadata: {
      ...params.metadata,
      file_size: params.file?.size,
      mime_type: params.file?.type,
    },
    capture_mode: params.itemType === "photo" ? "camera" : params.itemType === "voice_note" ? "voice" : "text",
    sync_state: "synced",
    local_created_at: new Date().toISOString(),
    local_updated_at: new Date().toISOString(),
  };

  const response = await fetch("/api/site-walk/items", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await response.json().catch(() => null)) as ItemResponse | null;
  if (!response.ok || !data?.item) throw new Error(data?.error ?? "Could not save item");
  return data.item;
}

function isGps(value: unknown): value is { latitude: number; longitude: number } {
  return !!value && typeof value === "object" &&
    typeof (value as { latitude?: unknown }).latitude === "number" &&
    typeof (value as { longitude?: unknown }).longitude === "number";
}

export type { CaptureStatus };
