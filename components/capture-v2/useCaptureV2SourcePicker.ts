"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { resolveCaptureV2PreviewUrl } from "@/components/capture-v2/capture-v2-preview-url";
import { publishCaptureItemFocus } from "@/components/site-walk/capture/capture-item-events";
import { getCaptureType } from "@/lib/site-walk/capture-types/registry";
import "@/lib/site-walk/capture-types";
import { buildCaptureV2SourcePickerRows } from "@/lib/capture-v2/source-picker-rows";
import type {
  CaptureV2SourcePickerContext,
  CaptureV2SourcePickerRowId,
} from "@/lib/capture-v2/source-picker-types";
import {
  getItemPhotoAttachmentPins,
  PHOTO_ATTACHMENT_MAX_FILES,
  type PhotoAttachmentPin,
} from "@/lib/site-walk/photo-attachments";
import { uploadPhotoAttachmentFile } from "@/lib/site-walk/upload-photo-attachment-file";
import { triggerHapticSuccess } from "@/lib/utils/trigger-haptic";
import type { CaptureItemRecord } from "@/lib/types/site-walk-capture";
import type { CaptureV2Loop } from "./useCaptureV2Loop";
import type { useCamera } from "@/lib/hooks/useCamera";

type CameraApi = ReturnType<typeof useCamera>;

type Args = {
  sessionId: string;
  loop: CaptureV2Loop;
  camera: CameraApi;
  photo360Entitled: boolean;
  ingestLivePhoto: (file: File) => void;
};

function commitPersistedStop(
  loop: CaptureV2Loop,
  item: CaptureItemRecord,
  localPreviewUrl?: string | null,
) {
  publishCaptureItemFocus({ item, reason: "captured", focus: true });
  const previewUrl = resolveCaptureV2PreviewUrl(item, localPreviewUrl ?? null);
  if (previewUrl) {
    loop.setActivePreview({
      url: previewUrl,
      title: item.title?.trim() || "Captured item",
      itemId: item.id,
    });
  } else {
    loop.setActivePreview(null);
  }
  triggerHapticSuccess();
}

async function persistNewStop(
  rowId: "photo_360" | "file_attachment",
  file: File,
  sessionId: string,
  loop: CaptureV2Loop,
  applyIntent: (input: "camera" | "upload") => void,
) {
  const localPreviewUrl = rowId === "photo_360" ? URL.createObjectURL(file) : null;
  try {
    const { item } = await getCaptureType(rowId).persist(
      { mode: "create", meta: { kind: rowId }, blob: file },
      { sessionId, projectId: null, locationLabel: "" },
    );
    applyIntent("upload");
    commitPersistedStop(loop, item, localPreviewUrl);
  } catch (error) {
    if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
    loop.setExternalError(
      error instanceof Error ? error.message : "Capture upload failed.",
    );
  }
}

export function useCaptureV2SourcePicker({
  sessionId,
  loop,
  camera,
  photo360Entitled,
  ingestLivePhoto,
}: Args) {
  const [context, setContext] = useState<CaptureV2SourcePickerContext | null>(null);
  const contextRef = useRef<CaptureV2SourcePickerContext | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const rollInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photo360InputRef = useRef<HTMLInputElement>(null);

  const rows = useMemo(
    () => buildCaptureV2SourcePickerRows(photo360Entitled),
    [photo360Entitled],
  );

  const open = useCallback((next: CaptureV2SourcePickerContext) => {
    contextRef.current = next;
    setContext(next);
    loop.setExternalError(null);
  }, [loop]);

  const close = useCallback(() => {
    contextRef.current = null;
    setContext(null);
  }, []);

  const applyIntent = useCallback(
    (input: "camera" | "upload") => {
      const ctx = contextRef.current;
      if (!ctx) return;
      loop.setIntent({ source: ctx.source, input });
    },
    [loop],
  );

  const attachFileToPhoto = useCallback(
    async (file: File, attachPoint: { xPct: number; yPct: number }, existingPinId?: string) => {
      const item = loop.activeItem;
      if (!item) return;
      const uploaded = await uploadPhotoAttachmentFile(sessionId, file);
      const pins = getItemPhotoAttachmentPins(item);
      if (existingPinId) {
        const nextPins = pins.map((pin) =>
          pin.id === existingPinId
            ? { ...pin, files: [...pin.files, uploaded].slice(0, PHOTO_ATTACHMENT_MAX_FILES), label: pin.label || uploaded.name }
            : pin,
        );
        await loop.savePhotoAttachmentPins(item.id, nextPins);
        triggerHapticSuccess();
        return;
      }
      const nextPin: PhotoAttachmentPin = {
        id: `photo-pin-${Date.now()}`,
        xPct: attachPoint.xPct,
        yPct: attachPoint.yPct,
        label: uploaded.name,
        note: "",
        files: [uploaded],
        createdAt: new Date().toISOString(),
      };
      await loop.savePhotoAttachmentPins(item.id, [...pins, nextPin]);
      triggerHapticSuccess();
    },
    [loop, sessionId],
  );

  const handleNewStopFile = useCallback(
    async (file: File, rowId: CaptureV2SourcePickerRowId) => {
      if (rowId === "photo_360") {
        await persistNewStop("photo_360", file, sessionId, loop, applyIntent);
        return;
      }
      if (rowId === "upload_file" && !file.type.startsWith("image/")) {
        await persistNewStop("file_attachment", file, sessionId, loop, applyIntent);
        return;
      }
      applyIntent(rowId === "camera_roll" || rowId === "upload_file" ? "upload" : "camera");
      loop.handleFile(file, false);
      triggerHapticSuccess();
    },
    [applyIntent, loop, sessionId],
  );

  const handleSelectedFile = useCallback(
    async (file: File | undefined, rowId: CaptureV2SourcePickerRowId) => {
      const ctx = contextRef.current;
      if (!file || !ctx) return;
      close();
      if (ctx.mode === "attach" && ctx.attachPoint) {
        try {
          if (rowId === "take_photo") applyIntent("camera");
          await attachFileToPhoto(file, ctx.attachPoint, ctx.existingPinId);
        } catch (error) {
          loop.setExternalError(
            error instanceof Error ? error.message : "Attachment upload failed.",
          );
        }
        return;
      }
      await handleNewStopFile(file, rowId);
    },
    [applyIntent, attachFileToPhoto, close, handleNewStopFile, loop],
  );

  const onInputChange = useCallback(
    (rowId: CaptureV2SourcePickerRowId) => (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      void handleSelectedFile(file, rowId);
    },
    [handleSelectedFile],
  );

  const selectRow = useCallback(
    (rowId: CaptureV2SourcePickerRowId) => {
      const ctx = contextRef.current;
      if (!ctx) return;
      const row = rows.find((entry) => entry.id === rowId);
      if (row?.locked) return;

      if (rowId === "take_photo" && ctx.mode === "new_stop" && camera.isStreaming) {
        const result = camera.capturePhoto();
        close();
        if (!result) return;
        const file = new File([result.blob], `capture-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        applyIntent("camera");
        ingestLivePhoto(file);
        return;
      }

      const ref =
        rowId === "take_photo"
          ? cameraInputRef
          : rowId === "camera_roll"
            ? rollInputRef
            : rowId === "upload_file"
              ? fileInputRef
              : photo360InputRef;
      ref.current?.click();
    },
    [applyIntent, camera, close, ingestLivePhoto, rows],
  );

  const sheetTitle = context?.mode === "attach" ? "Attach here" : "Add capture source";
  const sheetSubtitle =
    context?.mode === "attach"
      ? "Choose what to pin to this spot on the photo"
      : "Choose how to create the next stop";

  return {
    open,
    close,
    isOpen: Boolean(context),
    rows,
    sheetTitle,
    sheetSubtitle,
    selectRow,
    cameraInputRef,
    rollInputRef,
    fileInputRef,
    photo360InputRef,
    onInputChange,
  };
}
