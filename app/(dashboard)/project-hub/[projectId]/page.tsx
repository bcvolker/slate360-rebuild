import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProjectDashboardGrid from "@/components/project-hub/ProjectDashboardGrid";

export default async function ProjectOverviewPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("id, name, status, metadata")
    .eq("id", projectId)
    .single();

  if (!project) {
    notFound();
  }

  return <ProjectDashboardGrid projectId={projectId} project={project} />;
}
