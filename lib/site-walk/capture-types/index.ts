import "./plugins/photo.plugin";
import "./plugins/text-note.plugin";
import "./plugins/voice-note.plugin";
import "./plugins/photo-360.plugin";
import "./plugins/file-attachment.plugin";
import "./plugins/forward-compat.plugin";
import { hasCaptureType } from "./registry";

let installed = false;

/** Register all capture type plugins. Safe to call multiple times. */
export function installCaptureTypes(): void {
  if (installed) return;
  installed = true;
}

/** Ensure registry is populated before thumbnail / persist lookups. */
export function ensureCaptureTypesInstalled(): void {
  installCaptureTypes();
  if (!hasCaptureType("photo")) {
    throw new Error("Capture type registry failed to install photo plugin");
  }
}

export { registerCaptureType, getCaptureType, listCaptureTypes, hasCaptureType } from "./registry";
export { resolveCaptureTypeId } from "./resolve-item-type";
export { CaptureRegistryThumbnail } from "./CaptureRegistryThumbnail";
export type {
  CaptureTypeId,
  CaptureTypePlugin,
  CapturePersistContext,
  CapturePersistInput,
  CapturePersistResult,
  CaptureThumbnailProps,
  CaptureViewfinderProps,
} from "./types";

installCaptureTypes();
