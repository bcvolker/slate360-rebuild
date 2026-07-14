import { getEntitlements } from "@/lib/entitlements";
import { canInviteProjectCollaborators } from "@/lib/projects/project-collaborator-entitlement";
import { loadProjectTeamTabData } from "@/lib/projects/team-tab-data";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { SW360TeamTabClient } from "@/components/sw360/SW360TeamTabClient";

export default async function SW360ProjectTeamPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const [data, context] = await Promise.all([
    loadProjectTeamTabData(projectId),
    resolveServerOrgContext(),
  ]);
  const ent = getEntitlements(context.tier, { isSlateCeo: context.isSlateCeo });

  return (
    <SW360TeamTabClient
      data={data}
      canInvite={canInviteProjectCollaborators(ent)}
      projectName={data.projectName}
    />
  );
}
