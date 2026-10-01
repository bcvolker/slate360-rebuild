import { SpatialWalkthroughIndex } from "@/components/spatial-walkthrough/SpatialWalkthroughIndex";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { resolveSpatialAccess } from "@/lib/spatial-walkthrough/access";

export const metadata = { title: "Spatial Walkthrough" };

export default async function SpatialWalkthroughLibraryPage() {
  const { orgId, isSlateCeo, isAdmin } = await resolveServerOrgContext();
  const access = await resolveSpatialAccess(orgId, Boolean(isSlateCeo), Boolean(isAdmin));
  return <SpatialWalkthroughIndex canAuthor={access.canAuthor} />;
}
