import { notFound, redirect } from "next/navigation";
import { getScopedProjectForUser } from "@/lib/projects/access";
import {
  resolveProjectDetailVariant,
  type ProjectDetailVariant,
} from "@/components/projects/projectDetailTabs";
import { resolveServerOrgContext } from "@/lib/server/org-context";

export type ProjectDetailMeta = {
  projectId: string;
  projectName: string;
  status: string;
  variant: ProjectDetailVariant;
  projectType: string | null;
};

export async function loadProjectDetailMeta(
  projectId: string,
  basePath: "/projects" | "/project-hub",
): Promise<ProjectDetailMeta> {
  const { user } = await resolveServerOrgContext();

  if (!user) {
    redirect(`/login?redirectTo=${encodeURIComponent(`${basePath}/${projectId}`)}`);
  }

  const { project: scopedProject } = await getScopedProjectForUser(
    user.id,
    projectId,
    "id, name, status, project_type",
  );

  if (!scopedProject) {
    notFound();
  }

  const project = scopedProject as unknown as {
    id: string;
    name: string;
    status: string;
    project_type?: string | null;
  };

  const projectType = project.project_type ?? null;

  return {
    projectId,
    projectName: project.name,
    status: project.status,
    projectType,
    variant: resolveProjectDetailVariant(projectType),
  };
}
