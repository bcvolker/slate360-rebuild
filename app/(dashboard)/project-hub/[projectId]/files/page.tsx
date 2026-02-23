import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProjectFileExplorer from "@/components/slatedrop/ProjectFileExplorer";

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

  const { data: project } = await supabase
    .from("projects")
    .select("id, name")
    .eq("id", projectId)
    .single();

  if (!project) {
    notFound();
  }

  const { data: projectFolderCandidate } = await supabase
    .from("project_folders")
    .select("id")
    .eq("parent_id", projectId)
    .eq("name", project.name)
    .maybeSingle();

  const rootFolderId = projectFolderCandidate?.id ?? projectId;

  return <ProjectFileExplorer projectId={projectId} rootFolderId={rootFolderId} />;
}
