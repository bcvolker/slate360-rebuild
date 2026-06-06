import "server-only";

import { isBetaMode } from "@/lib/beta-mode";
import { resolveOrgEntitlements } from "@/lib/server/org-feature-flags";
import type { ServerOrgContext } from "@/lib/server/org-context";
import { isDigitalTwinDesktopEnabled } from "./desktop-feature";

/** CEO, beta mode, or entitled org — plus desktop feature flag. */
export async function canAccessTwinDesktop(ctx: ServerOrgContext): Promise<boolean> {
  if (!isDigitalTwinDesktopEnabled()) return false;
  if (!ctx.user || !ctx.orgId) return false;
  if (ctx.isSlateCeo || isBetaMode()) return true;

  const entitlements = await resolveOrgEntitlements(ctx.orgId);
  return entitlements.canAccessStandaloneDigitalTwin === true;
}
