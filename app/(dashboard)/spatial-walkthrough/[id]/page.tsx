import { WalkthroughStudio } from "@/components/spatial-walkthrough/studio/WalkthroughStudio";
import { WalkthroughClientView } from "@/components/spatial-walkthrough/WalkthroughClientView";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { resolveSpatialAccess } from "@/lib/spatial-walkthrough/access";

export default async function SpatialWalkthroughDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { orgId, isSlateCeo, isAdmin } = await resolveServerOrgContext();
  const access = await resolveSpatialAccess(orgId, Boolean(isSlateCeo), Boolean(isAdmin));
  if (access.canAuthor) return <WalkthroughStudio walkthroughId={id} />;
  return <WalkthroughClientView walkthroughId={id} />;
}
