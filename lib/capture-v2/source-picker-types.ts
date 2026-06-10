import type { CameraRequestSource } from "@/components/site-walk/capture/capture-camera-events";

export type CaptureV2SourcePickerMode = "new_stop" | "attach";

export type CaptureV2SourcePickerContext = {
  mode: CaptureV2SourcePickerMode;
  source: CameraRequestSource;
  attachPoint?: { xPct: number; yPct: number };
  existingPinId?: string;
};

export type CaptureV2SourcePickerRowId =
  | "take_photo"
  | "camera_roll"
  | "upload_file"
  | "photo_360";

export type CaptureV2SourcePickerRow = {
  id: CaptureV2SourcePickerRowId;
  label: string;
  description: string;
  locked?: boolean;
  lockReason?: string;
};
