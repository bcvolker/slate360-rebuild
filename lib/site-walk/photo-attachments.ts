export const PHOTO_ATTACHMENT_METADATA_KEY = "photo_attachment_pins";
export const PHOTO_ATTACHMENT_MAX_FILES = 4;
export const PHOTO_ATTACHMENT_MAX_FILE_BYTES = 25 * 1024 * 1024;

export type PhotoAttachmentFile = {
  id: string;
  name: string;
  size: number;
  type: string;
};

export type PhotoAttachmentPin = {
  id: string;
  xPct: number;
  yPct: number;
  label: string;
  note: string;
  files: PhotoAttachmentFile[];
  createdAt: string;
};

export function getPhotoAttachmentPins(metadata: unknown): PhotoAttachmentPin[] {
  if (!metadata || typeof metadata !== "object") return [];
  const record = metadata as Record<string, unknown>;
  const pins = record[PHOTO_ATTACHMENT_METADATA_KEY];
  if (!Array.isArray(pins)) return [];
  return pins.filter(isPhotoAttachmentPin).slice(0, 20);
}

export function getItemPhotoAttachmentPins(item: { metadata?: unknown; photo_attachment_pins?: unknown } | null | undefined): PhotoAttachmentPin[] {
  const metadataPins = getPhotoAttachmentPins(item?.metadata);
  if (metadataPins.length > 0) return metadataPins;
  return Array.isArray(item?.photo_attachment_pins) ? item.photo_attachment_pins.filter(isPhotoAttachmentPin).slice(0, 20) : [];
}

export function withPhotoAttachmentPins(metadata: unknown, pins: PhotoAttachmentPin[]): Record<string, unknown> {
  const base = metadata && typeof metadata === "object" ? { ...(metadata as Record<string, unknown>) } : {};
  base[PHOTO_ATTACHMENT_METADATA_KEY] = pins;
  return base;
}

function isPhotoAttachmentPin(value: unknown): value is PhotoAttachmentPin {
  if (!value || typeof value !== "object") return false;
  const pin = value as Partial<PhotoAttachmentPin>;
  return typeof pin.id === "string" &&
    typeof pin.xPct === "number" &&
    typeof pin.yPct === "number" &&
    typeof pin.label === "string" &&
    typeof pin.note === "string" &&
    typeof pin.createdAt === "string" &&
    Array.isArray(pin.files) &&
    pin.files.every(isPhotoAttachmentFile);
}

function isPhotoAttachmentFile(value: unknown): value is PhotoAttachmentFile {
  if (!value || typeof value !== "object") return false;
  const file = value as Partial<PhotoAttachmentFile>;
  return typeof file.id === "string" && typeof file.name === "string" && typeof file.size === "number" && typeof file.type === "string";
}
