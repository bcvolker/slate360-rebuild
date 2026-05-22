import type { ReactNode } from "react";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { SiteWalkShell } from "@/components/site-walk/SiteWalkShell";

/**
 * Act 2 layout — MobileAppShell sub-route wrapper for walks, assigned-work, progression.
 * Capture keeps its own fixed task shell overlay (internals untouched).
 */
export default async function Act2InputsLayout({ children }: { children: ReactNode }) {
  const context = await resolveServerOrgContext();
  return (
    <SiteWalkShell orgName={context.orgName}>{children}</SiteWalkShell>
  );
}
