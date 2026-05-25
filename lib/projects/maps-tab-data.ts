import { notFound } from "next/navigation";
import { getScopedProjectForUser } from "@/lib/projects/access";
import { resolveProjectLocation, type ResolvedProjectLocation } from "@/lib/projects/location";
import { resolveServerOrgContext } from "@/lib/server/org-context";

export type ProjectMapsTabData = {
  projectId: string;
  projectName: string;
  location: ResolvedProjectLocation;
};

export async function loadProjectMapsTabData(projectId: string): Promise<ProjectMapsTabData> {
  const { user } = await resolveServerOrgContext();
  if (!user) notFound();

  const { project: scopedProject } = await getScopedProjectForUser(
    user.id,
    projectId,
    "id, name, metadata",
  );

  if (!scopedProject) notFound();

  const project = scopedProject as unknown as {
    id: string;
    name: string;
    metadata?: unknown;
  };

  return {
    projectId: project.id,
    projectName: project.name,
    location: resolveProjectLocation(project.metadata),
  };
}
