import { filterCapturesByLayerConfig } from "@/lib/thermal/layer-config";

export type ThermalShareLike = {
  id: string;
  sessionId: string;
  isRevoked: boolean;
  expiresAt: string | null;
  layerConfig: Record<string, unknown> | null;
  /** Not used by the availability predicate itself — carried here so resolve-thermal-source.ts can
   *  get layer_config and branding_snapshot from the SAME qualifying row, never paired across two
   *  different shares. Overview (load-portfolio-evidence.ts) doesn't need this but selects it too,
   *  since it's the same cheap query either way and keeps one shared shape. */
  brandingSnapshot: Record<string, unknown> | null;
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
 * Finds the ACTUAL qualifying share for a session — not just whether one exists. A session can
 * have more than one share token; a session is renderable if ANY of its shares qualifies, but the
 * specific share chosen must be the SAME row whose own layer_config produced that "yes" — pairing
 * one share's layer_config with a different share's branding_snapshot (or picking merely the first
 * non-revoked/non-expired share regardless of whether ITS layer_config leaves anything viewable)
 * is exactly the bug this function exists to prevent. Both isThermalSessionAvailable (below) and
 * resolve-thermal-source.ts's actual data resolution defer to this one selection.
 */
export function findRenderableThermalShare(
  sessionId: string,
  shares: readonly ThermalShareLike[],
  captures: readonly ThermalCaptureLike[],
  now = Date.now(),
): ThermalShareLike | null {
  const sessionCaptures = captures.filter((c) => c.sessionId === sessionId);
  const match = shares
    .filter((share) => share.sessionId === sessionId)
    .find((share) => isSharePublished(share, now) && hasViewableCaptureUnderShare(sessionCaptures, share.layerConfig));
  return match ?? null;
}

/**
 * The single effective Thermal-availability predicate — Overview (load-portfolio-evidence.ts) and
 * Explore (resolve-thermal-source.ts) both defer to this so they cannot drift again. A session is
 * Thermal-available only when at least one of its shares is both currently published (non-revoked,
 * non-expired) AND that SAME share's layer_config leaves at least one genuinely viewable capture.
 */
export function isThermalSessionAvailable(
  sessionId: string,
  shares: readonly ThermalShareLike[],
  captures: readonly ThermalCaptureLike[],
  now = Date.now(),
): boolean {
  return findRenderableThermalShare(sessionId, shares, captures, now) !== null;
}
