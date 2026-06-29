/**
 * SlateDrop "deliverable link" sentinels.
 *
 * Some `slatedrop_uploads` rows aren't downloadable files — they're LINKS to an
 * interactive deliverable, marked by a non-S3 sentinel `s3_key`:
 *   - Site Walk: `deliverable://<deliverableId>`        (registered by register-deliverable.ts)
 *   - Twin 360:  `twin-deliverable://<spaceId>`          (registered by register-twin-deliverable.ts)
 *
 * The SlateDrop browser must OPEN these in their viewer instead of presigning a
 * (nonexistent) S3 object. This module is the single source of truth for the
 * prefixes + the open-target resolution, shared by client browsers and server routes
 * (no "server-only" — safe in both).
 */

export const DELIVERABLE_LINK_PREFIX = "deliverable://";
export const TWIN_DELIVERABLE_LINK_PREFIX = "twin-deliverable://";

/** True when the row is a deliverable LINK (not a real S3 file). */
export function isDeliverableSentinel(s3Key: string | null | undefined): boolean {
  if (!s3Key) return false;
  return s3Key.startsWith(DELIVERABLE_LINK_PREFIX) || s3Key.startsWith(TWIN_DELIVERABLE_LINK_PREFIX);
}

/**
 * The in-app href a deliverable sentinel should open, or null if not a sentinel.
 * Twin → the in-app twin viewer (exists + works). Site Walk → the deliverables list
 * (interim: an owner-scoped `/site-walk/deliverables/[id]` viewer is a follow-up — the
 * public viewer is token-gated, so an unshared deliverable has no owner-by-id route yet).
 */
export function resolveDeliverableSentinelHref(s3Key: string | null | undefined): string | null {
  if (!s3Key) return null;
  if (s3Key.startsWith(TWIN_DELIVERABLE_LINK_PREFIX)) {
    const spaceId = s3Key.slice(TWIN_DELIVERABLE_LINK_PREFIX.length).trim();
    return spaceId ? `/digital-twin/twins/${encodeURIComponent(spaceId)}` : null;
  }
  if (s3Key.startsWith(DELIVERABLE_LINK_PREFIX)) {
    const id = s3Key.slice(DELIVERABLE_LINK_PREFIX.length).trim();
    // Interim target until the owner-by-id viewer route exists; the list lets the
    // owner open/share the specific deliverable.
    return id ? `/site-walk/deliverables?open=${encodeURIComponent(id)}` : "/site-walk/deliverables";
  }
  return null;
}
