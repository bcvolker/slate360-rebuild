import type { Tier } from "@/lib/entitlements";

/**
 * Entitlement helpers for project type creation.
 *
 * These are SERVER-SIDE guards — imported both in API routes (hard gate)
 * and from the UI layer (soft gate for rendering decisions).
 */

/**
 * Returns true when the user may create a full Project.
 * Requires Business or Enterprise tier, OR Slate CEO override.
 */
export function canCreateFullProject(tier: Tier, isSlateCeo: boolean): boolean {
  if (isSlateCeo) return true;
  return tier === "business" || tier === "enterprise";
}

/**
 * Returns true when the user may create a Site Visit.
 * All active subscribers (including trial) can create Site Visits.
 */
export function canCreateFieldProject(): boolean {
  return true;
}
