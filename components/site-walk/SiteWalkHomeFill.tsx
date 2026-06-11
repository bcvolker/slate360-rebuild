"use client";

import type { MobileHomeAssignment } from "@/lib/mobile/load-mobile-assignments";
import { type HomeSlateDropFolder } from "@/components/studio-ui/MobileAppHomeSlateDropFolderGrid";
import { SlateDropPortalCard } from "@/components/studio-ui/SlateDropPortalCard";
import { mobileTokens } from "@/components/mobile-system";
import { buildWalkResumeUrl } from "@/lib/site-walk/capture-v2-config";
import type { HubDeliverableRow } from "@/lib/types/site-walk-hub";
import type { HubProject, HubSummary, HubWalk } from "@/lib/types/site-walk";

type SiteWalkHomeFillProps = {
  projects: HubProject[];
  walks: HubWalk[];
  summary: HubSummary;
  deliverables: HubDeliverableRow[];
  assignments: MobileHomeAssignment[];
};

/** SlateDrop folder row for Site Walk home — walks, projects, and deliverables. */
export function buildSiteWalkSlateDropFolders(
  walks: HubWalk[],
  projects: HubProject[],
  deliverables: HubDeliverableRow[],
): HomeSlateDropFolder[] {
  const folders: HomeSlateDropFolder[] = [];
  const seen = new Set<string>();

  const pushFolder = (folder: HomeSlateDropFolder) => {
    if (seen.has(folder.id)) return;
    seen.add(folder.id);
    folders.push(folder);
  };

  pushFolder({
    id: "site-walk-files",
    label: "Site Walk Files",
    href: "/slatedrop/site-walk-files",
    tone: "system",
  });

  pushFolder({
    id: "general-files",
    label: "General Files",
    href: "/slatedrop/general-files",
    tone: "system",
  });

  for (const walk of walks.slice(0, 4)) {
    pushFolder({
      id: `walk-${walk.id}`,
      label: walk.title,
      href: buildWalkResumeUrl(walk.id, walk.status),
      tone: "project",
    });
  }

  for (const project of projects.slice(0, 4)) {
    pushFolder({
      id: `project-${project.id}`,
      label: project.name,
      href: `/project-hub/${project.id}`,
      tone: "workspace",
    });
  }

  for (const deliverable of deliverables.slice(0, 3)) {
    pushFolder({
      id: `deliverable-${deliverable.id}`,
      label: deliverable.title,
      href: "/site-walk/deliverables",
      tone: "project",
    });
  }

  return folders;
}

export function SiteWalkHomeFill({
  projects,
  walks,
  deliverables,
}: SiteWalkHomeFillProps) {
  const folders = buildSiteWalkSlateDropFolders(walks, projects, deliverables);

  return (
    <SlateDropPortalCard
      folders={folders}
      openHref="/site-walk/slatedrop"
      labelAccentClassName={mobileTokens.siteWalkHomeSectionLabelAccent}
    />
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
      metaTone: "primary",
      href: "/site-walk/walks",
    });
  }

  for (const assignment of assignments.slice(0, 4)) {
    rows.push({
      key: `assignment-${assignment.id}`,
      title: assignment.title,
      meta: assignment.status.replace(/_/g, " "),
      metaTone: "primary",
      href: buildWalkResumeUrl(assignment.sessionId, "in_progress"),
    });
  }

  for (const item of deliverables.slice(0, 3)) {
    rows.push({
      key: `deliverable-${item.id}`,
      title: item.title,
      meta: "Deliverable",
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
      href: buildWalkResumeUrl(walk.id, walk.status),
    })),
    projects: projects.slice(0, 8).map((project) => ({
      key: project.id,
      title: project.name,
      meta: project.status,
      href: `/project-hub/${project.id}`,
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
