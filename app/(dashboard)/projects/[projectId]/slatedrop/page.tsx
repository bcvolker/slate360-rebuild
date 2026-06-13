import { notFound, redirect } from "next/navigation";
import { getScopedProjectForUser } from "@/lib/projects/access";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { ProjectFilesTab } from "@/components/projects/ProjectFilesTab";

export default async function ProjectSlateDropPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { user, tier } = await resolveServerOrgContext();

  if (!user) {
    redirect(`/login?redirectTo=${encodeURIComponent(`/projects/${projectId}/slatedrop`)}`);
  }

  const { project } = await getScopedProjectForUser(user.id, projectId, "id, name");
  if (!project) notFound();

  const projectName = (project as { name?: string }).name ?? "Project";

  return (
    <ProjectFilesTab
      projectId={projectId}
      projectName={projectName}
      user={{
        name:
          (user.user_metadata?.full_name as string | undefined) ??
          user.email?.split("@")[0] ??
          "User",
        email: user.email ?? "",
      }}
      tier={tier}
    />
  );
}
