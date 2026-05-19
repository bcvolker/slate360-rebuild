"use client";

import { SiteWalkV1ActionGrid } from "@/components/site-walk/v1/SiteWalkV1ActionGrid";
import { SiteWalkV1ListPanel } from "@/components/site-walk/v1/SiteWalkV1ListPanel";
import { WorksiteV1Row } from "@/components/site-walk/v1/WorksiteV1Row";
import { WalkV1Row } from "@/components/site-walk/v1/WalkV1Row";
import type { V1NavTab } from "@/components/site-walk/v1/SiteWalkV1BottomNav";
import type { HubProject, HubSummary, HubWalk } from "@/lib/types/site-walk";
import { cn } from "@/lib/utils";
import { type RouterLike, timeAgo, EmptyList } from "./v1-view-utils";

type HomeViewProps = {
  walks: HubWalk[];
  projects: HubProject[];
  summary: HubSummary;
  router: RouterLike;
  setTab: (t: V1NavTab) => void;
  /** Override for Quick Walk — parent provides session-creation + navigate logic. */
  onQuickCapture?: () => void;
};

export function HomeView({ walks, projects, summary, router, onQuickCapture }: HomeViewProps) {
  const recentWalks = walks.slice(0, 20);

  const walksByProject = new Map<string, number>();
  const lastActivityByProject = new Map<string, string>();
  for (const w of walks) {
    if (!w.projectId) continue;
    walksByProject.set(w.projectId, (walksByProject.get(w.projectId) ?? 0) + 1);
    const prev = lastActivityByProject.get(w.projectId);
    if (!prev || w.updatedAt > prev) lastActivityByProject.set(w.projectId, w.updatedAt);
  }

  return (
    <div
      className={cn(
        "grid h-full min-h-0 gap-y-3 px-4 pb-3",
        /* Portrait: stacked command + panel */
        "grid-rows-[1fr_minmax(285px,305px)]",
        /* Landscape: side-by-side when viewport is short */
        "landscape:grid-cols-2 landscape:grid-rows-[1fr] landscape:gap-x-4 landscape:gap-y-0",
      )}
    >
      {/* Zone 1: Command — grows to fill available space */}
      <div className="flex min-h-0 flex-col justify-start gap-y-5 pt-4">
        <p className="text-[14px] font-bold uppercase tracking-[0.18em] text-amber-400">
          Site Walk
        </p>
        <SiteWalkV1ActionGrid
          onNewWorksite={() => router.push("/site-walk/setup")}
          onStartWalk={() => router.push("/site-walk/walks")}
          onQuickCapture={onQuickCapture}
          className="!px-0"
        />
      </div>

      {/* Zone 2: Work panel — clamped 285–305px */}
      <SiteWalkV1ListPanel
        className="min-h-0 overflow-hidden"
        recentContent={
          recentWalks.length > 0 ? (
            <WalkList walks={recentWalks} router={router} />
          ) : (
            <EmptyList message="No recent walks. Start a walk or quick capture to see activity here." />
          )
        }
        worksitesContent={
          projects.length > 0 ? (
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
                />
              ))}
            </div>
          ) : (
            <EmptyList message="No worksites yet. Create a worksite to get started." />
          )
        }
        sharedContent={<EmptyList message="No shared work yet." />}
        reviewContent={
          summary.needsReview > 0 ? (
            <EmptyList
              message={`${summary.needsReview} item${summary.needsReview === 1 ? "" : "s"} need review. Open a walk to review resolved items.`}
            />
          ) : (
            <EmptyList message="Nothing needs review." />
          )
        }
      />
    </div>
  );
}

function WalkList({ walks, router }: { walks: HubWalk[]; router: RouterLike }) {
  return (
    <div className="flex flex-col gap-1.5">
      {walks.map((w) => (
        <WalkV1Row
          key={w.id}
          title={w.title}
          worksiteName={w.projectName}
          status={w.status}
          itemCount={w.itemCount}
          lastUpdated={timeAgo(w.updatedAt)}
          onOpen={() => router.push(`/site-walk/walks/${w.id}`)}
          onCreateReport={() => router.push(`/site-walk/deliverables?session=${w.id}`)}
        />
      ))}
    </div>
  );
}
