import { notFound, redirect } from "next/navigation";
import { getScopedProjectForUser } from "@/lib/projects/access";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { loadProjectPeople } from "@/lib/server/collaborator-data";
import { countActiveCollaborators } from "@/lib/server/collaborators";
import { getEntitlements } from "@/lib/entitlements";
import { ProjectPeopleView } from "@/components/projects/ProjectPeopleView";

type RouteParams = { projectId: string };

export default async function ProjectPeoplePage({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const { projectId } = await params;
  const context = await resolveServerOrgContext();

  if (!context.user) {
    redirect(`/login?next=${encodeURIComponent(`/projects/${projectId}/people`)}`);
  }

  const { project } = await getScopedProjectForUser(
    context.user.id,
    projectId,
    "id, name, org_id",
  );

  if (!project) {
    notFound();
  }

  const orgId = (project as unknown as { org_id?: string | null }).org_id ?? context.orgId;
  const projectName = (project as unknown as { name: string }).name;

  const [people, used] = await Promise.all([
    loadProjectPeople(projectId, orgId ?? null),
    countActiveCollaborators(context.user.id),
  ]);

  const ent = getEntitlements(context.tier, { isSlateCeo: context.isSlateCeo });
  const limit = Number.isFinite(ent.maxCollaborators) ? ent.maxCollaborators : null;

  return (
    <ProjectPeopleView
      projectId={projectId}
      projectName={projectName}
      members={people.members}
      pendingInvites={people.pendingInvites}
      leadershipViewers={people.leadershipViewers}
      seatUsage={{ used, limit }}
      canManage={!context.isViewer}
    />
  );
}
