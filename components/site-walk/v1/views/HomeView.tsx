"use client";

import { SiteWalkV1ActionGrid } from "@/components/site-walk/v1/SiteWalkV1ActionGrid";
import { SiteWalkV1ListPanel, type ListTab } from "@/components/site-walk/v1/SiteWalkV1ListPanel";
import { WorksiteV1Row } from "@/components/site-walk/v1/WorksiteV1Row";
import { WalkV1Row } from "@/components/site-walk/v1/WalkV1Row";
import type { V1NavTab } from "@/components/site-walk/v1/SiteWalkV1BottomNav";
import type { HubProject, HubSummary, HubWalk } from "@/lib/types/site-walk";
import {
  MobileEmptyState,
  MobileShellBackToApp,
  MobileSection,
  mobileTokens,
  MobileHomeLayout,
} from "@/components/mobile-system";
import { buildCaptureLaunchUrl } from "@/lib/site-walk/capture-v2-config";
import { type RouterLike, timeAgo } from "./v1-view-utils";

type HomeViewProps = {
  walks: HubWalk[];
  projects: HubProject[];
  summary: HubSummary;
  router: RouterLike;
  setTab?: (t: V1NavTab) => void;
  dockTab?: ListTab;
  openHomeDock?: (panel: ListTab) => void;
  onQuickCapture?: () => void;
};

export function HomeView({
  walks,
  projects,
  summary,
  router,
  setTab,
  dockTab = "recent",
  openHomeDock,
  onQuickCapture,
}: HomeViewProps) {
  const openDeliverables = () =>
    setTab ? setTab("deliverables") : router.push("/site-walk?tab=deliverables");
  const openWorksites = () =>
    setTab ? setTab("worksites") : router.push("/site-walk?tab=worksites");
  const openRecent = () =>
    openHomeDock ? openHomeDock("recent") : router.push("/site-walk?tab=recent");
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
    <MobileHomeLayout
      route="site-walk"
      className="flex min-h-0 h-full flex-1 flex-col flex-grow justify-between pb-safe"
      contentTop={
        <MobileSection showAccentLine className="shrink-0">
          <div className="flex items-center gap-3" data-testid="site-walk-module-intro">
            <MobileShellBackToApp />
            <div className="min-w-0">
              <h1 className={mobileTokens.moduleTitle}>
                SITE <span className={mobileTokens.moduleTitleAccent}>WALK</span>
              </h1>
              <p className={mobileTokens.moduleSubtitle}>Field capture &amp; deliverables</p>
            </div>
          </div>
        </MobileSection>
      }
      primaryActions={
        <MobileSection label="Actions" showAccentLine="cool" className="shrink-0">
          <SiteWalkV1ActionGrid
            onQuickCapture={onQuickCapture}
            onNewWorksite={() => router.push("/site-walk/setup")}
            onWalkFromWorksite={openWorksites}
            onReviewDeliver={openDeliverables}
          />
        </MobileSection>
      }
      dock={
        <SiteWalkV1ListPanel
          key={dockTab}
          defaultTab={dockTab}
          recentContent={
            recentWalks.length > 0 ? (
              <WalkList walks={recentWalks} router={router} onDeliverables={openDeliverables} />
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
                    onOpen={openWorksites}
                    onStartWalk={() => router.push("/site-walk/setup")}
                    onPlansAndDocs={() => router.push("/site-walk/setup")}
                    onSlateDrop={() => router.push(`/projects/${encodeURIComponent(p.id)}/slatedrop`)}
                    onCollaborators={() => router.push("/site-walk/setup")}
                    onDeliverables={openDeliverables}
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
                actionLabel="Open walks"
                onAction={openRecent}
              />
            ) : (
              <MobileEmptyState compact title="Nothing needs review." />
            )
          }
        />
      }
    />
  );
}

function WalkList({
  walks,
  router,
  onDeliverables,
}: {
  walks: HubWalk[];
  router: RouterLike;
  onDeliverables: () => void;
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
          onOpen={() => router.push(buildCaptureLaunchUrl({ session: w.id }))}
          onCreateReport={onDeliverables}
        />
      ))}
    </div>
  );
}
