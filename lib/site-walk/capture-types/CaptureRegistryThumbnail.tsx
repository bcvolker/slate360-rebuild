"use client";

import { getCaptureType } from "./registry";
import { resolveCaptureTypeId } from "./resolve-item-type";
import type { CaptureThumbnailProps } from "./types";

/** Filmstrip / stop-tracker thumbnail — delegates to the registered type plugin. */
export function CaptureRegistryThumbnail(props: CaptureThumbnailProps) {
  const typeId = resolveCaptureTypeId(props.item);
  const plugin = getCaptureType(typeId);
  const Thumbnail = plugin.Thumbnail;
  return <Thumbnail {...props} />;
}
