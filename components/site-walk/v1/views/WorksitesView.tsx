"use client";

import { Plus } from "lucide-react";
import { WorksiteV1Row } from "@/components/site-walk/v1/WorksiteV1Row";
import { Button } from "@/components/ui/button";
import type { HubProject, HubWalk } from "@/lib/types/site-walk";
import { type RouterLike, timeAgo } from "./v1-view-utils";
import { MobileEmptyState } from "@/components/mobile-system";

type WorksitesViewProps = {
  projects: HubProject[];
  walks: HubWalk[];
  router: RouterLike;
};

export function WorksitesView({ projects, walks, router }: WorksitesViewProps) {
  const walksByProject = new Map<string, number>();
  const lastActivityByProject = new Map<string, string>();
  for (const w of walks) {
    if (!w.projectId) continue;
    walksByProject.set(w.projectId, (walksByProject.get(w.projectId) ?? 0) + 1);
    const existing = lastActivityByProject.get(w.projectId);
    if (!existing || w.updatedAt > existing) {
      lastActivityByProject.set(w.projectId, w.updatedAt);
    }
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-zinc-300">
          All Worksites ({projects.length})
        </p>
        <Button
          size="sm"
          className="gap-1.5 rounded-lg bg-amber-600 text-white hover:bg-amber-700"
          onClick={() => router.push("/site-walk/setup")}
        >
          <Plus className="size-3.5" />
          New Worksite
        </Button>
      </div>

      {projects.length === 0 ? (
        <MobileEmptyState title="No worksites yet." description="Create a worksite to organize plans, captures, deliverables, and team collaboration." />
      ) : (
        <div className="flex flex-col gap-1.5">
          {projects.map((p) => (
            <WorksiteV1Row
              key={p.id}
              name={p.name}
              walkCount={walksByProject.get(p.id) ?? 0}
              lastActivity={timeAgo(lastActivityByProject.get(p.id) ?? null)}
              onOpen={() => router.push(`/projects/${p.id}`)}
              onStartWalk={() => router.push("/site-walk/setup")}
              onPlansAndDocs={() => router.push(`/projects/${p.id}/slatedrop`)}
              onSlateDrop={() => router.push(`/projects/${p.id}/slatedrop`)}
              onCollaborators={() => router.push(`/projects/${p.id}/people`)}
              onDeliverables={() => router.push("/site-walk/deliverables")}
              onRename={() => {}}
              onArchive={() => {}}
              onDelete={() => {}}
            />
          ))}
        </div>
      )}
    </div>
  );
}
