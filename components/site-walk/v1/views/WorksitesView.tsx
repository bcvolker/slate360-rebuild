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
  setTab?: (tab: "deliverables" | "slatedrop") => void;
};

export function WorksitesView({ projects, walks, router, setTab }: WorksitesViewProps) {
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
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4 pb-[max(env(safe-area-inset-bottom),1rem)]">
      <div className="flex shrink-0 items-center justify-between">
        <p className="text-sm font-medium text-zinc-300">All Worksites ({projects.length})</p>
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
        <MobileEmptyState
          title="No worksites yet."
          description="Create a worksite to organize plans, captures, deliverables, and team collaboration."
          actionLabel="Create worksite"
          actionHref="/site-walk/setup"
        />
      ) : (
        <div className="flex flex-col gap-1.5">
          {projects.map((p) => (
            <WorksiteV1Row
              key={p.id}
              name={p.name}
              walkCount={walksByProject.get(p.id) ?? 0}
              lastActivity={timeAgo(lastActivityByProject.get(p.id) ?? null)}
              onOpen={() => router.push("/site-walk/walks")}
              onStartWalk={() => router.push("/site-walk/setup")}
              onPlansAndDocs={() => router.push("/site-walk/setup")}
              onSlateDrop={() => router.push(`/projects/${encodeURIComponent(p.id)}/slatedrop`)}
              onCollaborators={() => router.push("/site-walk/setup")}
              onDeliverables={() =>
                setTab ? setTab("deliverables") : router.push("/site-walk/deliverables")
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
