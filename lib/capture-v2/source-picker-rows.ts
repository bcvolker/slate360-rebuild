import type { CaptureV2SourcePickerRow } from "./source-picker-types";

export function buildCaptureV2SourcePickerRows(
  photo360Entitled: boolean,
  hasProjectFolder = false,
): CaptureV2SourcePickerRow[] {
  const rows: CaptureV2SourcePickerRow[] = [
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
  ];

  // 360 sources. Primary = browse the project's SlateDrop 360 folder (the easy
  // field workflow: dump 360s from a camera/drone into the project, then pin them).
  // Secondary = a 360 file already on this device.
  if (hasProjectFolder) {
    rows.push({
      id: "photo_360_project",
      label: "Add 360 from project folder",
      description: photo360Entitled
        ? "Pick a 360 already uploaded to this project's SlateDrop"
        : "Add 360 Tours to attach panoramic photos",
      locked: !photo360Entitled,
      lockReason: "Upgrade",
    });
  }
  rows.push({
    id: "photo_360",
    label: hasProjectFolder ? "Add 360 from a file" : "Add 360 photo",
    description: photo360Entitled
      ? "Choose a 360° photo file on this device"
      : "Add 360 Tours to attach panoramic photos",
    locked: !photo360Entitled,
    lockReason: "Upgrade",
  });

  return rows;
}
