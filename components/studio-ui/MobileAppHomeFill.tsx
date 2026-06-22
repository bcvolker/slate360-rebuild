"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { MobileAppHomeData } from "@/lib/mobile/load-app-home-data";
import { buildWalkResumeUrl } from "@/lib/site-walk/capture-v2-config";
import { appHomeTokens } from "@/components/studio-ui/app-home-tokens";
import { MobileAppSectionLabel } from "@/components/studio-ui/MobileAppSectionLabel";
import type { HomeSlateDropFolder } from "@/components/studio-ui/MobileAppHomeSlateDropFolderGrid";

type MobileAppHomeFillProps = {
  data: MobileAppHomeData;
};

type StorageSummary = {
  storageUsedGb: number;
  storageLimitGb: number;
  filesAddedToday: number;
};

const DEFAULT_STORAGE_LIMIT_GB = 10;

function isToday(iso: string): boolean {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function countFilesAddedToday(data: MobileAppHomeData): number {
  const ids = new Set<string>();
  for (const file of data.recentSlateDrop) {
    if (isToday(file.createdAt)) ids.add(file.id);
  }
  for (const job of data.processingQueue) {
    if (isToday(job.createdAt)) ids.add(job.id);
  }
  return ids.size;
}

function formatGb(value: number): string {
  if (value >= 10) return value.toFixed(1);
  if (value >= 1) return value.toFixed(1);
  return value.toFixed(2);
}

function StorageRing({ usedGb, limitGb }: { usedGb: number; limitGb: number }) {
  const ratio = limitGb > 0 ? Math.min(usedGb / limitGb, 1) : 0;
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - ratio);

  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      className="shrink-0 text-[var(--mobile-shell-accent)]"
      aria-hidden
    >
      <circle cx="24" cy="24" r={radius} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="3" />
      <circle
        cx="24"
        cy="24"
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform="rotate(-90 24 24)"
      />
    </svg>
  );
}

/** SlateDrop folder chips for the /app home portal card. */
export function buildHomeSlateDropFolders(data: MobileAppHomeData): HomeSlateDropFolder[] {
  const folders: HomeSlateDropFolder[] = [];
  const seen = new Set<string>();

  const pushFolder = (folder: HomeSlateDropFolder) => {
    if (seen.has(folder.id)) return;
    seen.add(folder.id);
    folders.push(folder);
  };

  pushFolder({
    id: "general-files",
    label: "General Files",
    href: "/slatedrop/general-files",
    tone: "system",
  });

  pushFolder({
    id: "site-walk-files",
    label: "Site Walk Files",
    href: "/slatedrop/site-walk-files",
    tone: "project",
  });

  for (const walk of data.recentWalks.slice(0, 3)) {
    pushFolder({
      id: `walk-${walk.id}`,
      label: walk.title,
      href: "/slatedrop/site-walk-files",
      tone: "project",
    });
  }

  for (const upload of data.recentSlateDrop.slice(0, 3)) {
    const label = upload.filename.replace(/\.[^.]+$/, "") || upload.filename;
    pushFolder({
      id: `upload-${upload.id}`,
      label,
      href: "/slatedrop/general-files",
      tone: "workspace",
    });
  }

  return folders;
}

export function MobileAppHomeFill({ data }: MobileAppHomeFillProps) {
  const [storage, setStorage] = useState<StorageSummary>(() => ({
    storageUsedGb: 0,
    storageLimitGb: DEFAULT_STORAGE_LIMIT_GB,
    filesAddedToday: countFilesAddedToday(data),
  }));

  useEffect(() => {
    let cancelled = false;

    async function loadStorage() {
      try {
        const res = await fetch("/api/dashboard/summary", { cache: "no-store" });
        if (!res.ok) return;
        const payload = (await res.json()) as { storageUsedGb?: number };
        if (cancelled) return;
        setStorage((prev) => ({
          ...prev,
          storageUsedGb: Number(payload.storageUsedGb ?? 0),
          filesAddedToday: countFilesAddedToday(data),
        }));
      } catch {
        // keep graceful fallback
      }
    }

    void loadStorage();
    return () => {
      cancelled = true;
    };
  }, [data]);

  const folders = useMemo(() => buildHomeSlateDropFolders(data).slice(0, 3), [data]);
  const filesTodayLabel =
    storage.filesAddedToday === 1
      ? "1 file added today"
      : `${storage.filesAddedToday} files added today`;

  return (
    <section className={appHomeTokens.section} aria-label="SlateDrop portal">
      <div className={appHomeTokens.sectionHeader}>
        <MobileAppSectionLabel>SlateDrop Portal</MobileAppSectionLabel>
      </div>
      <div className={appHomeTokens.slateDropCard} data-testid="slatedrop-portal-card">
        <div className={appHomeTokens.slateDropRow}>
          <div className={appHomeTokens.slateDropRingWrap}>
            <StorageRing usedGb={storage.storageUsedGb} limitGb={storage.storageLimitGb} />
          </div>
          <div className={appHomeTokens.slateDropStats}>
            <p className={appHomeTokens.slateDropUsage}>
              {formatGb(storage.storageUsedGb)} GB of {storage.storageLimitGb} GB
            </p>
            <p className={appHomeTokens.slateDropMeta}>{filesTodayLabel}</p>
          </div>
          <Link href="/slatedrop" className={appHomeTokens.slateDropOpenPill}>
            Open
          </Link>
        </div>
        {folders.length > 0 ? (
          <div className={appHomeTokens.slateDropFolderRow}>
            {folders.map((folder) => (
              <Link
                key={folder.id}
                href={folder.href}
                className={appHomeTokens.slateDropFolderChip}
              >
                {folder.label}
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

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
      href: buildWalkResumeUrl(walk.id, walk.status),
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
      title: alert.title,
      meta: alert.message,
      metaTone: "neutral",
      href: alert.linkPath ?? "/coordination/inbox",
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
      href: buildWalkResumeUrl(item.sessionId, "in_progress"),
    })),
    recent: recentItems.map((item) => ({
      key: item.key,
      title: item.title,
      meta: item.meta,
      href: item.href,
      metaTone: item.tone,
    })),
    activityCount:
      activityRows.length + data.assignments.length + recentItems.length,
  };
}
