"use client";

import Link from "next/link";
import {
  MobileHomeContainedList,
  MobileHomeListRow,
  MobileHomeSectionBlock,
  mobileTokens,
} from "@/components/mobile-system";
import type { MobileAppHomeData } from "@/lib/mobile/load-app-home-data";

type MobileAppHomeFillProps = {
  data: MobileAppHomeData;
};

type RecentRailItem = {
  key: string;
  title: string;
  meta: string;
  href: string;
  tone: "primary" | "info" | "neutral";
};

function buildRecentRailItems(data: MobileAppHomeData): RecentRailItem[] {
  const items: RecentRailItem[] = [];

  for (const walk of data.recentWalks.slice(0, 4)) {
    items.push({
      key: `walk-${walk.id}`,
      title: walk.title,
      meta: "Walk",
      href: `/site-walk/walks/${walk.id}`,
      tone: "primary",
    });
  }

  for (const item of data.recentDeliverables.slice(0, 3)) {
    items.push({
      key: `deliverable-${item.id}`,
      title: item.title,
      meta: "Deliverable",
      href: "/site-walk/deliverables",
      tone: "primary",
    });
  }

  for (const file of data.recentSlateDrop.slice(0, 3)) {
    items.push({
      key: `file-${file.id}`,
      title: file.filename,
      meta: "SlateDrop",
      href: "/slatedrop",
      tone: "info",
    });
  }

  for (const job of data.processingQueue.slice(0, 2)) {
    items.push({
      key: `processing-${job.id}`,
      title: job.filename,
      meta: job.status,
      href: "/slatedrop",
      tone: "info",
    });
  }

  return items;
}

function buildActivityRows(data: MobileAppHomeData) {
  const rows: {
    key: string;
    title: string;
    meta?: string;
    metaTone?: "neutral" | "primary" | "info";
    href?: string;
  }[] = [];

  for (const alert of data.alerts.slice(0, 5)) {
    rows.push({
      key: `alert-${alert.id}`,
      title: alert.message,
      meta: alert.severity,
      metaTone: "neutral",
      href: "/coordination/inbox",
    });
  }

  if (data.hubSummary.needsReview > 0) {
    rows.push({
      key: "hub-review",
      title: `${data.hubSummary.needsReview} Site Walk item${data.hubSummary.needsReview !== 1 ? "s" : ""} need review`,
      meta: "Review",
      metaTone: "primary",
      href: "/site-walk/deliverables",
    });
  }

  if (data.hubSummary.unsyncedItems > 0) {
    rows.push({
      key: "hub-unsynced",
      title: `${data.hubSummary.unsyncedItems} unsynced capture item${data.hubSummary.unsyncedItems !== 1 ? "s" : ""}`,
      meta: "Sync",
      metaTone: "info",
      href: "/site-walk/walks",
    });
  }

  if (data.hubSummary.openItems > 0) {
    rows.push({
      key: "hub-open",
      title: `${data.hubSummary.openItems} open field item${data.hubSummary.openItems !== 1 ? "s" : ""}`,
      meta: "Assigned",
      metaTone: "primary",
      href: "/site-walk/assigned-work",
    });
  }

  return rows;
}

export function MobileAppHomeFill({ data }: MobileAppHomeFillProps) {
  const recentItems = buildRecentRailItems(data);
  const activityRows = buildActivityRows(data);

  return (
    <div className={mobileTokens.mobileHomeFillRegion}>
      {recentItems.length > 0 ? (
        <MobileHomeSectionBlock label="Recent" accent="info">
          <div className={mobileTokens.mobileHomeRailScroll}>
            {recentItems.map((item) => (
              <Link key={item.key} href={item.href} className={mobileTokens.mobileHomeRailCard}>
                <span className={mobileTokens.mobileHomeRailCardTitle}>{item.title}</span>
                <span className={mobileTokens.mobileHomeRailCardMeta}>{item.meta}</span>
              </Link>
            ))}
          </div>
        </MobileHomeSectionBlock>
      ) : null}

      <MobileHomeSectionBlock label="Activity" accent="primary">
        {activityRows.length > 0 ? (
          <MobileHomeContainedList>
            {activityRows.map((row) => (
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
          <p className="px-1 py-4 text-sm text-zinc-400">No recent activity.</p>
        )}
      </MobileHomeSectionBlock>
    </div>
  );
}

/** Dock tab payloads for /app — mirrors fill data sources. */
export function buildAppHomeDockContent(data: MobileAppHomeData) {
  const activityRows = buildActivityRows(data);
  const recentItems = buildRecentRailItems(data);

  return {
    alerts: activityRows.filter((row) => row.key.startsWith("alert-") || row.key.startsWith("hub-")),
    assigned: data.assignments.slice(0, 8).map((item) => ({
      key: item.id,
      title: item.title,
      meta: item.status.replace(/_/g, " "),
      href: `/site-walk/walks/${item.sessionId}`,
    })),
    recent: recentItems.map((item) => ({
      key: item.key,
      title: item.title,
      meta: item.meta,
      href: item.href,
      metaTone: item.tone,
    })),
    hasAlerts: activityRows.some((row) => row.key.startsWith("alert-") || row.key.startsWith("hub-")),
    hasAssigned: data.assignments.length > 0 || data.hubSummary.openItems > 0,
    hasRecent: recentItems.length > 0,
  };
}
