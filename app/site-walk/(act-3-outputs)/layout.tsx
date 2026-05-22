import type { ReactNode } from "react";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { SiteWalkShell } from "@/components/site-walk/SiteWalkShell";

/** Deliverables and reports — MobileAppShell sub-route wrapper. */
export default async function Act3OutputsLayout({ children }: { children: ReactNode }) {
  const context = await resolveServerOrgContext();
  return (
    <SiteWalkShell orgName={context.orgName}>{children}</SiteWalkShell>
  );
}
