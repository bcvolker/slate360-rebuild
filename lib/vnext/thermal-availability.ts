import { filterCapturesByLayerConfig } from "@/lib/thermal/layer-config";

export type ThermalShareLike = {
  sessionId: string;
  isRevoked: boolean;
  expiresAt: string | null;
  layerConfig: Record<string, unknown> | null;
};

export type ThermalCaptureLike = {
  id: string;
  sessionId: string;
  previewPath: string | null;
  storagePath: string | null;
};

/** A share is "currently published" when it hasn't been revoked and, if it carries an expiry,
 *  that expiry hasn't passed. A token can be un-revoked but still time-expired. */
export function isSharePublished(share: Pick<ThermalShareLike, "isRevoked" | "expiresAt">, now = Date.now()): boolean {
  if (share.isRevoked) return false;
  if (share.expiresAt && Date.parse(share.expiresAt) < now) return false;
  return true;
}

function hasUsablePath(capture: Pick<ThermalCaptureLike, "previewPath" | "storagePath">): boolean {
  return Boolean(capture.previewPath || capture.storagePath);
}

/** True when at least one capture is both usable (has a preview/storage path) and allowed by the
 *  share's layer_config (its capture_ids scoping, when present). */
export function hasViewableCaptureUnderShare(
  captures: readonly Pick<ThermalCaptureLike, "id" | "previewPath" | "storagePath">[],
  layerConfig: Record<string, unknown> | null,
): boolean {
  const usable = captures.filter(hasUsablePath);
  return filterCapturesByLayerConfig(usable, layerConfig ?? {}).length > 0;
}

/**
 * The single effective Thermal-availability predicate — Overview (load-portfolio-evidence.ts) and
 * Explore (resolve-thermal-source.ts) both defer to this so they cannot drift again. A session is
 * Thermal-available only when it has at least one currently published (non-revoked, non-expired)
 * share AND that share's layer_config leaves at least one genuinely viewable capture — a published
 * session with zero remaining captures (all excluded by layer_config, or none have a usable path)
 * must not be reported as available.
 */
export function isThermalSessionAvailable(
  sessionId: string,
  shares: readonly ThermalShareLike[],
  captures: readonly ThermalCaptureLike[],
  now = Date.now(),
): boolean {
  const sessionCaptures = captures.filter((c) => c.sessionId === sessionId);
  return shares
    .filter((share) => share.sessionId === sessionId)
    .some((share) => isSharePublished(share, now) && hasViewableCaptureUnderShare(sessionCaptures, share.layerConfig));
}
