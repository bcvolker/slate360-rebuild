import { getEntitlements } from "@/lib/entitlements";
import { canInviteProjectCollaborators } from "@/lib/projects/project-collaborator-entitlement";
import { loadProjectTeamTabData } from "@/lib/projects/team-tab-data";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { ProjectTeamTab } from "@/components/projects/ProjectTeamTab";

export default async function ProjectHubTeamPage({
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
    <ProjectTeamTab
      data={data}
      basePath="/project-hub"
      canManage={!context.isViewer}
      canInviteCollaborators={canInviteProjectCollaborators(ent)}
    />
  );
}
