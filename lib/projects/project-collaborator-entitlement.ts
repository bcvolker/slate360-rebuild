import type { Entitlements } from "@/lib/entitlements";

export const COLLABORATOR_UPGRADE_TOOLTIP =
  "Collaborators are available on higher-tier Site Walk plans — upgrade in billing.";

/** Higher-tier Site Walk plans may invite outside collaborators (maxCollaborators > 0). */
export function canInviteProjectCollaborators(ent: Entitlements): boolean {
  return Number.isFinite(ent.maxCollaborators) && ent.maxCollaborators > 0;
}
