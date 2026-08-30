import type { PinLocator, PinVisibility, SharePolicy } from "./types";

export function serializePinLocator(locator: PinLocator): PinLocator {
  return {
    walkthroughId: locator.walkthroughId,
    clipId: locator.clipId,
    tSeconds: locator.tSeconds == null ? null : Number(locator.tSeconds),
    yawDeg: locator.yawDeg == null ? null : Number(locator.yawDeg),
    pitchDeg: locator.pitchDeg == null ? null : Number(locator.pitchDeg),
  };
}

export function isCompleteLocator(locator: PinLocator): boolean {
  return Boolean(
    locator.walkthroughId &&
      locator.clipId &&
      locator.tSeconds != null &&
      locator.yawDeg != null &&
      locator.pitchDeg != null,
  );
}

export function pinVisibleOnPolicy(visibility: PinVisibility, policy: SharePolicy): boolean {
  if (policy === "public") return visibility === "public";
  return visibility === "public" || visibility === "client";
}

export function attachmentVisibleOnPolicy(
  visibleOnPublic: boolean,
  policy: SharePolicy,
): boolean {
  if (policy === "public") return visibleOnPublic;
  return true;
}
