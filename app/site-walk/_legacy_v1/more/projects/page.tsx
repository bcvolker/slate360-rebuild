import Link from "next/link";
import { FolderKanban, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Project Defaults — Site Walk",
};

export default async function ProjectDefaultsPickerPage() {
  const supabase = await createClient();
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name")
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Project Defaults</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Select a project to configure its default reporting settings.
        </p>
      </div>

      <div className="bg-card border border-border rounded-xl divide-y divide-border overflow-hidden">
        {!projects || projects.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No active projects found.</div>
        ) : (
          projects.map((project) => (
            <Link
              key={project.id}
              href={`/site-walk/more/projects/${project.id}`}
              className="flex items-center justify-between p-4 hover:bg-glass transition-colors group"
            >
              <div className="flex items-center gap-3 text-foreground font-medium">
                <FolderKanban className="w-5 h-5 text-cobalt/70 group-hover:text-cobalt transition-colors" />
                {project.name}
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
