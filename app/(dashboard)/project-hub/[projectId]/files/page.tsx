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

  return <ProjectFileExplorer projectId={projectId} rootFolderId={projectId} />;
}
