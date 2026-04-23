"use client";

import { ClipboardList, Bell } from "lucide-react";
import ProjectHubAllProjectsTab from "@/components/project-hub/ProjectHubAllProjectsTab";
import type { ProjectHubProject } from "@/lib/types/project-hub";

type ProjectHubTab = "all" | "my-work" | "activity";

type Props = {
  activeTab: ProjectHubTab;
  onTabChange: (tab: ProjectHubTab) => void;
  loading: boolean;
  projects: ProjectHubProject[];
  onOpenDeleteProject: (project: { id: string; name: string }) => void;
};

export default function ProjectHubWorkspaceTabs({
  activeTab,
  onTabChange,
  loading,
  projects,
  onOpenDeleteProject,
}: Props) {
  return (
    <>
      <div className="flex items-center gap-1 border-b border-app pb-px overflow-x-auto">
        {(["all", "my-work", "activity"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={`px-3 sm:px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px rounded-t-lg transition-all ${
              activeTab === tab
                ? "border-[#3B82F6] text-[#3B82F6] bg-[#3B82F6]/10"
                : "border-transparent text-zinc-400 hover:text-foreground hover:bg-white/[0.04]/50"
            }`}
          >
            {tab === "all" ? "All Projects" : tab === "my-work" ? "My Work" : "Activity Feed"}
          </button>
        ))}
      </div>

      {activeTab === "all" && (
        <ProjectHubAllProjectsTab
          loading={loading}
          projects={projects}
          onOpenDeleteProject={onOpenDeleteProject}
        />
      )}

      {activeTab === "my-work" && (
        <div className="rounded-2xl border border-app bg-app-card p-10 text-center text-zinc-400">
          <ClipboardList size={32} className="mx-auto mb-3 text-zinc-600" />
          <h3 className="text-lg font-bold text-foreground">Your Assigned Tasks</h3>
          <p className="text-sm mt-1">Items across all projects assigned to you will appear here.</p>
        </div>
      )}

      {activeTab === "activity" && (
        <div className="rounded-2xl border border-app bg-app-card p-10 text-center text-zinc-400">
          <Bell size={32} className="mx-auto mb-3 text-zinc-600" />
          <h3 className="text-lg font-bold text-foreground">Activity Feed</h3>
          <p className="text-sm mt-1">Recent events across all projects will appear here.</p>
        </div>
      )}
    </>
  );
}
