import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ProjectDefaultsClient } from "./ProjectDefaultsClient";

export const metadata = {
  title: "Project Settings — Site Walk",
};

export default async function ProjectDefaultsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("name")
    .eq("id", projectId)
    .single();

  if (!project) return notFound();

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6">
      <Link
        href="/site-walk/more/projects"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to projects
      </Link>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Settings: {project.name}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure default values for deliverables in this project.
        </p>
      </div>
      <ProjectDefaultsClient projectId={projectId} projectName={project.name} />
    </div>
  );
}
