"use client";

import { useCallback, useState } from "react";
import { captureMetadata } from "@/lib/site-walk/metadata";
import { createCaptureItem, presignCaptureUpload } from "@/lib/site-walk/capture-item-client";
import { createOfflineId } from "@/lib/site-walk/offline-db";
import { queueOfflineCapture } from "@/lib/site-walk/offline-capture";
import type { CaptureItemRecord } from "@/lib/types/site-walk-capture";

type CaptureStatus =
  | { kind: "idle"; message: string }
  | { kind: "uploading"; message: string }
  | { kind: "saving"; message: string }
  | { kind: "complete"; message: string }
  | { kind: "error"; message: string };

type UseCaptureUploadParams = {
  sessionId: string;
  planTarget?: PlanCaptureTarget | null;
  onPlanTargetSaved?: () => void;
  onSaved?: (item: CaptureItemRecord) => void;
};

type SavePhotoOptions = {
  clientItemId?: string;
  clientMutationId?: string;
  previewUrl?: string;
};

export type PlanCaptureTarget = {
  planSheetId: string;
  xPct: number;
  yPct: number;
  pinId?: string;
};

export function useCaptureUpload({ sessionId, planTarget, onPlanTargetSaved, onSaved }: UseCaptureUploadParams) {
  const [status, setStatus] = useState<CaptureStatus>({ kind: "idle", message: "Ready to capture." });

  const savePhoto = useCallback(async (file: File, options?: SavePhotoOptions) => {
    const clientItemId = options?.clientItemId ?? createOfflineId("item");
    const clientMutationId = options?.clientMutationId ?? createOfflineId("mutation");
    const previewUrl = options?.previewUrl;
    setStatus({ kind: "uploading", message: "Uploading (1/1)..." });
    const metadata = await captureMetadata();
    if (isOffline()) {
      const local = await queueOfflineCapture({ sessionId, itemType: "photo", title: file.name, metadata, file, captureMode: "camera", clientItemId, clientMutationId, planTarget, previewUrl });
      setStatus({ kind: "complete", message: "Working offline — photo queued and ready to sync." });
      if (planTarget) onPlanTargetSaved?.();
      onSaved?.(local);
      return;
    }
    try {
      const upload = await presignCaptureUpload(sessionId, file);

      const put = await fetch(upload.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "image/jpeg" },
        body: file,
      });
      if (!put.ok) throw new Error("Storage upload failed");

      setStatus({ kind: "saving", message: "Saving capture to the walk..." });
      const item = await createCaptureItem({ sessionId, itemType: "photo", title: file.name, fileId: upload.fileId, s3Key: upload.s3Key, metadata, file, captureMode: "camera", clientItemId, clientMutationId });
      if (planTarget) await attachItemToPlanPin(item.id, planTarget);
      setStatus({ kind: "complete", message: planTarget ? "Photo saved and attached to the selected plan pin." : "Photo saved to Site Walk Files / Photos." });
      if (planTarget) onPlanTargetSaved?.();
      onSaved?.({ ...item, local_preview_url: previewUrl });
    } catch {
      const local = await queueOfflineCapture({ sessionId, itemType: "photo", title: file.name, metadata, file, captureMode: "camera", clientItemId, clientMutationId, planTarget, previewUrl });
      setStatus({ kind: "complete", message: "Connection dropped — photo saved offline and queued." });
      if (planTarget) onPlanTargetSaved?.();
      onSaved?.(local);
    }
  }, [onPlanTargetSaved, onSaved, planTarget, sessionId]);

  const saveTextNote = useCallback(async (text: string, mode: "text" | "voice") => {
    if (!text.trim()) return;
    const clientItemId = createOfflineId("item");
    const clientMutationId = createOfflineId("mutation");
    setStatus({ kind: "saving", message: mode === "voice" ? "Saving voice/dictation note..." : "Saving text note..." });
    const metadata = await captureMetadata();
    const noteParams = {
      sessionId,
      itemType: mode === "voice" ? "voice_note" as const : "text_note" as const,
      title: text.trim().slice(0, 80),
      description: text.trim(),
      metadata: { ...metadata, note_mode: mode, captured_from: "prompt_6_capture_engine", plan_target: planTarget ?? undefined },
      captureMode: mode === "voice" ? "voice" as const : "text" as const,
      clientItemId,
      clientMutationId,
      planTarget,
    };
    if (isOffline()) {
      const local = await queueOfflineCapture(noteParams);
      setStatus({ kind: "complete", message: "Working offline — note queued and ready to sync." });
      if (planTarget) onPlanTargetSaved?.();
      onSaved?.(local);
      return;
    }
    try {
      const item = await createCaptureItem(noteParams);
      if (planTarget) await attachItemToPlanPin(item.id, planTarget);
      setStatus({ kind: "complete", message: planTarget ? "Note saved and attached to the selected plan pin." : mode === "voice" ? "Voice/dictation note saved." : "Text note saved." });
      if (planTarget) onPlanTargetSaved?.();
      onSaved?.(item);
    } catch {
      const local = await queueOfflineCapture(noteParams);
      setStatus({ kind: "complete", message: "Connection dropped — note saved offline and queued." });
      if (planTarget) onPlanTargetSaved?.();
      onSaved?.(local);
    }
  }, [onPlanTargetSaved, onSaved, planTarget, sessionId]);

  return { status, savePhoto, saveTextNote, resetStatus: () => setStatus({ kind: "idle", message: "Ready to capture." }) };
}

async function attachItemToPlanPin(itemId: string, target: PlanCaptureTarget) {
  if (target.pinId) {
    const response = await fetch(`/api/site-walk/pins/${encodeURIComponent(target.pinId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item_id: itemId, pin_status: "active" }),
    });
    if (!response.ok) throw new Error("Saved the item, but could not attach it to the plan pin");
    return;
  }

  const response = await fetch("/api/site-walk/pins", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      plan_sheet_id: target.planSheetId,
      item_id: itemId,
      x_pct: target.xPct,
      y_pct: target.yPct,
      pin_status: "active",
      pin_color: "blue",
      label: "Plan-linked capture",
    }),
  });
  if (!response.ok) throw new Error("Saved the item, but could not create the plan pin");
}

export type { CaptureStatus };

function isOffline() {
  return typeof navigator !== "undefined" && !navigator.onLine;
}
