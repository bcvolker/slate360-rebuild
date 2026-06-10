"use client";

import type { TwinCaptureMode } from "@/hooks/useTwinCaptureSession";
import type { SlateDropPickerFile } from "@/lib/slatedrop/file-picker-types";

export type TwinCaptureClipReview = {
  id: string;
  index: number;
  mode: TwinCaptureMode;
  durationSeconds: number;
  frameCount: number;
  files: File[];
  thumbnailUrl: string | null;
};

export type TwinReviewLocalSource = {
  id: string;
  origin: "camera_roll" | "files";
  file: File;
};

export type TwinReviewSlateDropSource = {
  id: string;
  origin: "slatedrop";
  pickerFile: SlateDropPickerFile;
};

export type TwinReviewAddedSource = TwinReviewLocalSource | TwinReviewSlateDropSource;

export type TwinCapturePendingSession = {
  selection: {
    spaceId: string;
    projectId: string;
    spaceTitle: string;
  };
  projectName: string | null;
  quickMode: boolean;
  clips: TwinCaptureClipReview[];
};

let pendingSession: TwinCapturePendingSession | null = null;

export function setTwinCapturePendingSession(session: TwinCapturePendingSession): void {
  pendingSession = session;
}

export function getTwinCapturePendingSession(): TwinCapturePendingSession | null {
  return pendingSession;
}

export function clearTwinCapturePendingSession(): void {
  pendingSession = null;
}
