import type { CaptureV2SourcePickerRow } from "./source-picker-types";

export function buildCaptureV2SourcePickerRows(photo360Entitled: boolean): CaptureV2SourcePickerRow[] {
  return [
    {
      id: "take_photo",
      label: "Take photo",
      description: "Open the camera and capture a new shot",
    },
    {
      id: "camera_roll",
      label: "Upload from camera roll",
      description: "Choose an existing photo from your library",
    },
    {
      id: "upload_file",
      label: "Upload a file",
      description: "PDF, document, or any supported file",
    },
    {
      id: "photo_360",
      label: "Add 360 photo",
      description: photo360Entitled
        ? "Ingest a panoramic 360° photo"
        : "Add 360 Tours to attach panoramic photos",
      locked: !photo360Entitled,
      lockReason: "Upgrade",
    },
  ];
}
