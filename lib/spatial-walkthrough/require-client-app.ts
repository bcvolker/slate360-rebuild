import "server-only";

import { notFound, redirect } from "next/navigation";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { resolveClientSurfaceFlags } from "@/lib/spatial-walkthrough/access";
import { visibleClientApps, type ClientSurfaceApp } from "./client-surface";

export async function requireClientAppPage(app: ClientSurfaceApp): Promise<void> {
  const ctx = await resolveServerOrgContext();
  if (!ctx.user) redirect("/login");
  const flags = await resolveClientSurfaceFlags(ctx.orgId, Boolean(ctx.isSlateCeo));
  if (!visibleClientApps(flags).includes(app)) notFound();
}
