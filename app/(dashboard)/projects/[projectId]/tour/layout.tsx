import { notFound, redirect } from "next/navigation";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { resolveSpatialAccess } from "@/lib/spatial-walkthrough/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadDirectedTourEnabled } from "@/lib/spatial-experience/portal-package-load";

/** Operator-only: authors, in orgs with the Directed Tour rollout switch on. */
export default async function ProjectTourLayout({ children }: { children: React.ReactNode }) {
  const { user, orgId, isSlateCeo, isAdmin } = await resolveServerOrgContext();
  if (!user) redirect("/login");
  const access = await resolveSpatialAccess(orgId, Boolean(isSlateCeo), Boolean(isAdmin));
  if (!access.canAuthor || !orgId) notFound();
  if (!(await loadDirectedTourEnabled(createAdminClient(), orgId))) notFound();
  return <>{children}</>;
}
