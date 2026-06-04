"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpDown, Folder, Plus } from "lucide-react";
import { mobileTokens } from "@/components/mobile-system";
import { cn } from "@/lib/utils";

export type HomeSlateDropFolder = {
  id: string;
  label: string;
  href: string;
  tone: "project" | "workspace" | "system";
};

type SortMode = "name" | "type";

type MobileAppHomeSlateDropFolderGridProps = {
  folders: HomeSlateDropFolder[];
};

const TYPE_ORDER: Record<HomeSlateDropFolder["tone"], number> = {
  project: 0,
  workspace: 1,
  system: 2,
};

function sortFolders(folders: HomeSlateDropFolder[], mode: SortMode): HomeSlateDropFolder[] {
  const next = [...folders];
  if (mode === "name") {
    next.sort((a, b) => a.label.localeCompare(b.label));
    return next;
  }
  return next.sort((a, b) => {
    const toneDiff = TYPE_ORDER[a.tone] - TYPE_ORDER[b.tone];
    return toneDiff !== 0 ? toneDiff : a.label.localeCompare(b.label);
  });
}

const folderCardSurface = mobileTokens.appHomeSlateDropTileProject;

export function MobileAppHomeSlateDropFolderGrid({
  folders,
}: MobileAppHomeSlateDropFolderGridProps) {
  const [sortMode, setSortMode] = useState<SortMode>("type");
  const sortedFolders = useMemo(
    () => sortFolders(folders, sortMode),
    [folders, sortMode],
  );
  const showScrollAffordance = sortedFolders.length >= 3;

  return (
    <section className={mobileTokens.appHomeSlateDropSection} aria-label="SlateDrop">
      <div className={mobileTokens.appHomeSectionLabelRow}>
        <div className={mobileTokens.appHomeSectionLabelBlock}>
          <span className={mobileTokens.appHomeSectionLabelAccent} aria-hidden />
          <p className={mobileTokens.appHomeSectionLabel}>SlateDrop</p>
        </div>
        <div className={mobileTokens.appHomeSectionLabelActions}>
          <button
            type="button"
            className={mobileTokens.appHomeSectionLabelIconButton}
            aria-label={`Sort folders by ${sortMode === "name" ? "type" : "name"}`}
            onClick={() => setSortMode((mode) => (mode === "name" ? "type" : "name"))}
          >
            <ArrowUpDown className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
          </button>
          <Link href="/slatedrop" className={mobileTokens.appHomeSectionLabelTextLink}>
            Open
          </Link>
        </div>
      </div>

      <div className={mobileTokens.appHomeSlateDropWindow}>
        <div className={mobileTokens.appHomeSlateDropBody}>
          <div className={mobileTokens.appHomeSlateDropRow}>
            {sortedFolders.map((folder) => (
              <Link
                key={folder.id}
                href={folder.href}
                className={cn(mobileTokens.appHomeSlateDropCard, folderCardSurface)}
                aria-label={`Open ${folder.label} in SlateDrop`}
              >
                <Folder
                  className={mobileTokens.appHomeSlateDropTileIcon}
                  strokeWidth={1.75}
                />
                <span className={mobileTokens.appHomeSlateDropTileLabel}>{folder.label}</span>
              </Link>
            ))}
            <Link
              href="/slatedrop/new-folder"
              className={cn(
                mobileTokens.appHomeSlateDropCard,
                mobileTokens.appHomeSlateDropTileNew,
              )}
              aria-label="Create new folder in SlateDrop"
            >
              <Plus className={mobileTokens.appHomeSlateDropTileIconNew} strokeWidth={1.75} />
              <span className={mobileTokens.appHomeSlateDropTileLabel}>New folder</span>
            </Link>
          </div>
        </div>
        {showScrollAffordance ? (
          <span className={mobileTokens.appHomeSlateDropScrollFade} aria-hidden />
        ) : null}
      </div>
    </section>
  );
}
