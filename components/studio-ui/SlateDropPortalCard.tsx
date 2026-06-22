"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { appHomeTokens } from "@/components/studio-ui/app-home-tokens";
import { MobileAppSectionLabel } from "@/components/studio-ui/MobileAppSectionLabel";

export type SlateDropPortalFolder = {
  id: string;
  label: string;
  href: string;
};

type Props = {
  folders: SlateDropPortalFolder[];
  openHref?: string;
  filesAddedToday?: number;
};

const DEFAULT_STORAGE_LIMIT_GB = 10;

function formatGb(value: number): string {
  if (value >= 1) return value.toFixed(1);
  return value.toFixed(2);
}

function StorageRing({ usedGb, limitGb }: { usedGb: number; limitGb: number }) {
  const ratio = limitGb > 0 ? Math.min(usedGb / limitGb, 1) : 0;
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - ratio);

  return (
    <svg width="48" height="48" viewBox="0 0 48 48" className="shrink-0" aria-hidden>
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

/** The /app SlateDrop portal card (storage ring + Open + folder chips), reusable on module hubs. */
export function SlateDropPortalCard({
  folders,
  openHref = "/slatedrop",
  filesAddedToday = 0,
}: Props) {
  const [storageUsedGb, setStorageUsedGb] = useState(0);
  const storageLimitGb = DEFAULT_STORAGE_LIMIT_GB;

  useEffect(() => {
    let cancelled = false;
    async function loadStorage() {
      try {
        const res = await fetch("/api/dashboard/summary", { cache: "no-store" });
        if (!res.ok) return;
        const payload = (await res.json()) as { storageUsedGb?: number };
        if (!cancelled) setStorageUsedGb(Number(payload.storageUsedGb ?? 0));
      } catch {
        // graceful fallback
      }
    }
    void loadStorage();
    return () => {
      cancelled = true;
    };
  }, []);

  const filesTodayLabel =
    filesAddedToday === 1 ? "1 file added today" : `${filesAddedToday} files added today`;

  return (
    <section className={appHomeTokens.section} aria-label="SlateDrop portal">
      <div className={appHomeTokens.sectionHeader}>
        <MobileAppSectionLabel>SlateDrop Portal</MobileAppSectionLabel>
      </div>
      <div className={appHomeTokens.slateDropCard} data-testid="slatedrop-portal-card">
        <div className={appHomeTokens.slateDropRow}>
          <div className={appHomeTokens.slateDropRingWrap}>
            <StorageRing usedGb={storageUsedGb} limitGb={storageLimitGb} />
          </div>
          <div className={appHomeTokens.slateDropStats}>
            <p className={appHomeTokens.slateDropUsage}>
              {formatGb(storageUsedGb)} GB of {storageLimitGb} GB
            </p>
            <p className={appHomeTokens.slateDropMeta}>{filesTodayLabel}</p>
          </div>
          <Link href={openHref} className={appHomeTokens.slateDropOpenPill}>
            Open
          </Link>
        </div>
        {folders.length > 0 ? (
          <div className={appHomeTokens.slateDropFolderRow}>
            {folders.slice(0, 3).map((folder) => (
              <Link key={folder.id} href={folder.href} className={appHomeTokens.slateDropFolderChip}>
                {folder.label}
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
