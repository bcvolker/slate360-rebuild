import { DashboardV3EmptyState } from "./DashboardV3EmptyState";

export function DashboardV3Hero({ project }: { project: any }) {
  if (!project) return <DashboardV3EmptyState message="Start your Slate360 workspace" actionText="Create New Project" />;
  
  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-950 p-6 flex flex-col justify-end min-h-[160px] border border-white/10">
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
      <div className="relative z-10">
        <h2 className="text-sm font-semibold text-white/70 tracking-wider uppercase mb-1">LAST ACTIVE</h2>
        <h1 className="text-2xl font-bold text-white tracking-tight">{project.name || "Untitled Workspace"}</h1>
      </div>
    </div>
  );
}
