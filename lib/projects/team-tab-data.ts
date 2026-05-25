import { notFound } from "next/navigation";
import { getEntitlements } from "@/lib/entitlements";
import { getScopedProjectForUser } from "@/lib/projects/access";
import {
  loadProjectPeople,
  type PendingInviteRow,
  type ProjectMemberRow,
} from "@/lib/server/collaborator-data";
import { countActiveCollaborators } from "@/lib/server/collaborators";
import { resolveServerOrgContext } from "@/lib/server/org-context";

export type ProjectTeamTabData = {
  projectId: string;
  projectName: string;
  members: ProjectMemberRow[];
  pendingInvites: PendingInviteRow[];
  seatUsage: { used: number; limit: number | null };
};

export async function loadProjectTeamTabData(projectId: string): Promise<ProjectTeamTabData> {
  const context = await resolveServerOrgContext();
  if (!context.user) notFound();

  const { project: scopedProject } = await getScopedProjectForUser(
    context.user.id,
    projectId,
    "id, name, org_id",
  );

  if (!scopedProject) notFound();

  const project = scopedProject as unknown as {
    id: string;
    name: string;
    org_id?: string | null;
  };

  const orgId = project.org_id ?? context.orgId;

  const [people, used] = await Promise.all([
    loadProjectPeople(projectId, orgId ?? null),
    countActiveCollaborators(context.user.id),
  ]);

  const ent = getEntitlements(context.tier, { isSlateCeo: context.isSlateCeo });
  const limit = Number.isFinite(ent.maxCollaborators) ? ent.maxCollaborators : null;

  return {
    projectId: project.id,
    projectName: project.name,
    members: people.members,
    pendingInvites: people.pendingInvites,
    seatUsage: { used, limit },
  };
}
