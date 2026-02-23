import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProjectFileExplorer from "@/components/slatedrop/ProjectFileExplorer";
import { getScopedProjectForUser } from "@/lib/projects/access";

export default async function ProjectFilesPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirectTo=${encodeURIComponent(`/project-hub/${projectId}/files`)}`);
  }

  const { project } = await getScopedProjectForUser(user.id, projectId, "id, name");

  if (!project) {
    notFound();
  }

  return <ProjectFileExplorer projectId={projectId} rootFolderId={projectId} />;
}
