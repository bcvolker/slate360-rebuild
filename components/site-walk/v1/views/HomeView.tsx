"use client";

import { SiteWalkV1ActionGrid } from "@/components/site-walk/v1/SiteWalkV1ActionGrid";
import { SiteWalkV1ListPanel } from "@/components/site-walk/v1/SiteWalkV1ListPanel";
import { WorksiteV1Row } from "@/components/site-walk/v1/WorksiteV1Row";
import { WalkV1Row } from "@/components/site-walk/v1/WalkV1Row";
import type { V1NavTab } from "@/components/site-walk/v1/SiteWalkV1BottomNav";
import type { HubProject, HubSummary, HubWalk } from "@/lib/types/site-walk";
import {
  MobileEmptyState,
  MobileShellBackToApp,
  mobileTokens,
  MobileComingSoonSheet,
} from "@/components/mobile-system";
import { type RouterLike, timeAgo } from "./v1-view-utils";
import { useState } from "react";
import { cn } from "@/lib/utils";

type HomeViewProps = {
  walks: HubWalk[];
  projects: HubProject[];
  summary: HubSummary;
  router: RouterLike;
  setTab: (t: V1NavTab) => void;
  onQuickCapture?: () => void;
};

export function HomeView({ walks, projects, summary, router, onQuickCapture }: HomeViewProps) {
  const [comingSoonTitle, setComingSoonTitle] = useState<string | null>(null);

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
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <SiteWalkV1ListPanel
        className="min-h-0 flex-1"
        upper={
          <div
            className={cn(
              "mx-auto flex w-full max-w-2xl flex-col",
              mobileTokens.mobileHomeSectionGap,
              mobileTokens.mobileHomeUpperBottomPad,
            )}
          >
            <div className="flex items-center gap-3" data-testid="site-walk-module-intro">
              <MobileShellBackToApp />
              <div className="min-w-0">
                <h1 className={mobileTokens.moduleTitle}>SITE WALK</h1>
                <p className={mobileTokens.moduleSubtitle}>Field capture &amp; deliverables</p>
              </div>
            </div>
            <SiteWalkV1ActionGrid
              onNewWorksite={() => router.push("/site-walk/setup")}
              onStartWalk={() => router.push("/site-walk/walks")}
              onQuickCapture={onQuickCapture}
            />
          </div>
        }
        recentContent={
          recentWalks.length > 0 ? (
            <WalkList walks={recentWalks} router={router} setComingSoonTitle={setComingSoonTitle} />
          ) : (
            <MobileEmptyState
              compact
              title="No recent walks."
              description="Start a walk or quick capture to see activity here."
            />
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
                  onOpen={() => setComingSoonTitle("Project Dashboard")}
                  onStartWalk={() => router.push("/site-walk/setup")}
                  onPlansAndDocs={() => setComingSoonTitle("Plans & Docs")}
                  onSlateDrop={() => setComingSoonTitle("SlateDrop")}
                  onCollaborators={() => setComingSoonTitle("Collaborators")}
                  onDeliverables={() => setComingSoonTitle("Deliverables")}
                />
              ))}
            </div>
          ) : (
            <MobileEmptyState compact title="No worksites yet." description="Create a worksite to get started." />
          )
        }
        sharedContent={<MobileEmptyState compact title="No shared work yet." />}
        reviewContent={
          summary.needsReview > 0 ? (
            <MobileEmptyState
              compact
              title={`${summary.needsReview} item${summary.needsReview === 1 ? "" : "s"} need review.`}
              description="Open a walk to review resolved items."
            />
          ) : (
            <MobileEmptyState compact title="Nothing needs review." />
          )
        }
      />
      {comingSoonTitle && (
        <MobileComingSoonSheet
          open={!!comingSoonTitle}
          onOpenChange={(open) => !open && setComingSoonTitle(null)}
          title={`${comingSoonTitle} on Mobile`}
        />
      )}
    </div>
  );
}

function WalkList({
  walks,
  router,
  setComingSoonTitle,
}: {
  walks: HubWalk[];
  router: RouterLike;
  setComingSoonTitle: (title: string) => void;
}) {
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
          onCreateReport={() => setComingSoonTitle("Deliverables")}
        />
      ))}
    </div>
  );
}
