import { Button } from "@/components/ui/button";
import { FolderGit2, Plus, UploadCloud } from "lucide-react";

export function DashboardV3Hero({ project }: { project: any }) {
  // Always render the large hero structure
  const hasProject = !!project;
  const title = hasProject ? (project.name || "Untitled Workspace") : "Start your Slate360 workspace";
  const subtitle = hasProject ? "LAST ACTIVE WORKSPACE" : "DASHBOARD V3";

  return (
    <div className="relative overflow-hidden rounded-xl border border-white/10 bg-[#131820] min-h-[320px] flex flex-col p-8 group">
      {/* Visual background treatment (Grid / Blueprint style) */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none transition-opacity group-hover:opacity-[0.05]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F15] via-transparent to-transparent pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0B0F15] via-[#0B0F15]/80 to-transparent pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full justify-end max-w-2xl">
        <div className="mb-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-500 backdrop-blur-md">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse"></span>
            {subtitle}
          </span>
        </div>
        
        <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight leading-tight mb-6">
          {title}
        </h1>

        <div className="flex items-center gap-3">
          {hasProject ? (
            <Button className="bg-amber-500 text-[#0B0F15] hover:bg-amber-400 font-semibold gap-2 border-0">
              <FolderGit2 className="h-4 w-4" />
              Open Workspace
            </Button>
          ) : (
            <Button className="bg-amber-500 text-[#0B0F15] hover:bg-amber-400 font-semibold gap-2 border-0">
              <Plus className="h-4 w-4" />
              Create New
            </Button>
          )}
          <Button variant="outline" className="border-white/10 bg-white/5 text-white hover:bg-white/10 gap-2">
            <UploadCloud className="h-4 w-4" />
            Upload Files
          </Button>
        </div>
      </div>
    </div>
  );
}
