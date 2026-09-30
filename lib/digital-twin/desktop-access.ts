import "server-only";

import type { ServerOrgContext } from "@/lib/server/org-context";
import { isDigitalTwinDesktopEnabled } from "./desktop-feature";
import { loadClientSurfaceFlags } from "@/lib/spatial-walkthrough/purchased-flags";

/** CEO or purchased Twin — never beta-widen into a Spatial Walkthrough-only org. */
export async function canAccessTwinDesktop(ctx: ServerOrgContext): Promise<boolean> {
  if (!isDigitalTwinDesktopEnabled()) return false;
  if (!ctx.user || !ctx.orgId) return false;
  const flags = await loadClientSurfaceFlags(ctx.orgId, Boolean(ctx.isSlateCeo));
  return flags.twin360;
}
