import type { ReactNode } from "react";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { SiteWalkShell } from "@/components/site-walk/SiteWalkShell";

/**
 * Act 2 layout — wraps all input routes (walks, capture, assigned-work, progression)
 * with SiteWalkShell.
 *
 * Note: the capture sub-route has its own `fixed inset-0 z-50` layout that
 * visually overlays SiteWalkShell during active walk capture.
 */
export default async function Act2InputsLayout({ children }: { children: ReactNode }) {
  const context = await resolveServerOrgContext();
  return (
    <SiteWalkShell orgName={context.orgName}>{children}</SiteWalkShell>
  );
}
