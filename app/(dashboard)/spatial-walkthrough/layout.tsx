import { notFound, redirect } from "next/navigation";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { resolveSpatialAccess } from "@/lib/spatial-walkthrough/access";

export default async function SpatialWalkthroughLayout({ children }: { children: React.ReactNode }) {
  const { user, orgId, isSlateCeo, isAdmin } = await resolveServerOrgContext();
  if (!user) redirect("/login");
  const access = await resolveSpatialAccess(orgId, Boolean(isSlateCeo), Boolean(isAdmin));
  if (!access.canView) notFound();
  return <>{children}</>;
}
