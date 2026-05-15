import type { ReactNode } from "react";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { SiteWalkShell } from "@/components/site-walk/SiteWalkShell";

export default async function SiteWalkSlateDropLayout({ children }: { children: ReactNode }) {
  const context = await resolveServerOrgContext();
  return (
    <SiteWalkShell orgName={context.orgName}>{children}</SiteWalkShell>
  );
}
