"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MobileHomeContainedList,
  MobileHomeListRow,
  MobileHomeSectionBlock,
  mobileTokens,
} from "@/components/mobile-system";
import { buildCaptureLaunchUrl } from "@/lib/site-walk/capture-v2-config";
import type { MobileHomeAssignment } from "@/lib/mobile/load-mobile-assignments";
import type { HubDeliverableRow } from "@/lib/types/site-walk-hub";
import type { HubProject, HubSummary, HubWalk } from "@/lib/types/site-walk";

type ActiveWorksite = {
  label: string;
  projectId: string | null;
  walkId: string | null;
};

type SiteWalkHomeFillProps = {
  projects: HubProject[];
  walks: HubWalk[];
  summary: HubSummary;
  deliverables: HubDeliverableRow[];
  assignments: MobileHomeAssignment[];
};

function pickActiveWorksite(walks: HubWalk[], projects: HubProject[]): ActiveWorksite | null {
  if (walks.length > 0) {
    const latest = walks[0]!;
    return {
      label: latest.projectName ?? latest.title,
      projectId: latest.projectId,
      walkId: latest.id,
    };
  }
  if (projects.length > 0) {
    return { label: projects[0]!.name, projectId: projects[0]!.id, walkId: null };
  }
  return null;
}

function formatRelativeDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function SiteWalkHomeFill({
  projects,
  walks,
  summary,
  deliverables,
  assignments,
}: SiteWalkHomeFillProps) {
  const router = useRouter();
  const worksite = pickActiveWorksite(walks, projects);

  async function startWalkAtWorksite() {
    const dateLabel = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const res = await fetch("/api/site-walk/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: worksite ? `${worksite.label} — ${dateLabel}` : `Quick Walk — ${dateLabel}`,
        session_type: "general",
        project_id: worksite?.projectId ?? undefined,
        metadata: {
          started_at: new Date().toISOString(),
          started_from: "hub_hero",
        },
      }),
    });
    if (!res.ok) return;
    const body = (await res.json()) as { session?: { id?: string } };
    if (!body.session?.id) return;
    router.push(buildCaptureLaunchUrl({ session: body.session.id, quick: "camera" }));
  }

  const attentionRows = buildAttentionRows(summary, assignments, deliverables);

  return (
    <div className={mobileTokens.mobileHomeFillRegion}>
      {worksite ? (
        <MobileHomeSectionBlock label="Start walk" accent="primary">
          <button
            type="button"
            onClick={() => void startWalkAtWorksite()}
            className={mobileTokens.mobileHomeHeroCard}
          >
            <span className={mobileTokens.mobileHomeHeroTitle}>{worksite.label}</span>
            <span className={mobileTokens.mobileHomeHeroSubtext}>
              Tap to capture at this worksite
            </span>
          </button>
        </MobileHomeSectionBlock>
      ) : null}

      {walks.length > 0 ? (
        <MobileHomeSectionBlock label="Continue" accent="info">
          <div className={mobileTokens.mobileHomeRailScroll}>
            {walks.slice(0, 8).map((walk) => (
              <Link
                key={walk.id}
                href={`/site-walk/walks/${walk.id}`}
                className={mobileTokens.mobileHomeRailCard}
              >
                <span className={mobileTokens.mobileHomeRailCardTitle}>{walk.title}</span>
                <span className={mobileTokens.mobileHomeRailCardMeta}>
                  {walk.itemCount} items · {walk.status.replace(/_/g, " ")}
                </span>
              </Link>
            ))}
          </div>
        </MobileHomeSectionBlock>
      ) : null}

      <MobileHomeSectionBlock label="Needs attention" accent="primary">
        {attentionRows.length > 0 ? (
          <MobileHomeContainedList>
            {attentionRows.map((row) => (
              <MobileHomeListRow
                key={row.key}
                title={row.title}
                meta={row.meta}
                metaTone={row.metaTone}
                href={row.href}
              />
            ))}
          </MobileHomeContainedList>
        ) : (
          <p className="px-1 py-4 text-sm text-zinc-400">All caught up — no open items.</p>
        )}
      </MobileHomeSectionBlock>
    </div>
  );
}

type AttentionRow = {
  key: string;
  title: string;
  meta?: string;
  metaTone?: "neutral" | "primary" | "info";
  href?: string;
};

function buildAttentionRows(
  summary: HubSummary,
  assignments: MobileHomeAssignment[],
  deliverables: HubDeliverableRow[],
): AttentionRow[] {
  const rows: AttentionRow[] = [];

  if (summary.needsReview > 0) {
    rows.push({
      key: "needs-review",
      title: `${summary.needsReview} item${summary.needsReview !== 1 ? "s" : ""} need review`,
      meta: "Review",
      metaTone: "primary",
      href: "/site-walk/deliverables",
    });
  }

  if (summary.unsyncedItems > 0) {
    rows.push({
      key: "unsynced",
      title: `${summary.unsyncedItems} unsynced field item${summary.unsyncedItems !== 1 ? "s" : ""}`,
      meta: "Sync",
      metaTone: "info",
      href: "/site-walk/walks",
    });
  }

  for (const assignment of assignments.slice(0, 4)) {
    rows.push({
      key: `assignment-${assignment.id}`,
      title: assignment.title,
      meta: assignment.status.replace(/_/g, " "),
      metaTone: "primary",
      href: `/site-walk/walks/${assignment.sessionId}`,
    });
  }

  for (const item of deliverables.slice(0, 3)) {
    rows.push({
      key: `deliverable-${item.id}`,
      title: item.title,
      meta: formatRelativeDate(item.created_at),
      metaTone: "neutral",
      href: "/site-walk/deliverables",
    });
  }

  return rows;
}

/** Rows for expandable dock tabs — reuses the same data contracts. */
export function buildSiteWalkDockRows(
  walks: HubWalk[],
  projects: HubProject[],
  deliverables: HubDeliverableRow[],
  assignments: MobileHomeAssignment[],
  summary: HubSummary,
) {
  return {
    walks: walks.slice(0, 8).map((walk) => ({
      key: walk.id,
      title: walk.title,
      meta: `${walk.itemCount} items`,
      href: `/site-walk/walks/${walk.id}`,
    })),
    projects: projects.slice(0, 8).map((project) => ({
      key: project.id,
      title: project.name,
      meta: project.status,
      href: "/projects",
    })),
    deliverables: deliverables.slice(0, 8).map((item) => ({
      key: item.id,
      title: item.title,
      meta: item.status,
      href: "/site-walk/deliverables",
    })),
    attention: buildAttentionRows(summary, assignments, deliverables),
  };
}
