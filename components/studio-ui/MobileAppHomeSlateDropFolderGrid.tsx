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

function tileToneClass(tone: HomeSlateDropFolder["tone"]) {
  switch (tone) {
    case "project":
      return {
        tile: mobileTokens.appHomeSlateDropTileProject,
        icon: mobileTokens.appHomeSlateDropTileIconProject,
      };
    case "workspace":
      return {
        tile: mobileTokens.appHomeSlateDropTileWorkspace,
        icon: mobileTokens.appHomeSlateDropTileIconWorkspace,
      };
    default:
      return {
        tile: mobileTokens.appHomeSlateDropTileSystem,
        icon: mobileTokens.appHomeSlateDropTileIconSystem,
      };
  }
}

export function MobileAppHomeSlateDropFolderGrid({
  folders,
}: MobileAppHomeSlateDropFolderGridProps) {
  const [sortMode, setSortMode] = useState<SortMode>("type");
  const sortedFolders = useMemo(
    () => sortFolders(folders, sortMode),
    [folders, sortMode],
  );
  const tileCount = sortedFolders.length + 1;
  const showScrollAffordance = tileCount > 4;

  return (
    <section className={mobileTokens.mobileHomeSection} aria-label="SlateDrop">
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
        <div
          className={cn(
            mobileTokens.appHomeSlateDropBody,
            mobileTokens.appHomeSlateDropBodyScrollCap,
          )}
        >
          <div className={mobileTokens.appHomeSlateDropGrid}>
            {sortedFolders.map((folder) => {
              const tone = tileToneClass(folder.tone);
              return (
                <Link
                  key={folder.id}
                  href={folder.href}
                  className={cn(mobileTokens.appHomeSlateDropTile, tone.tile)}
                  aria-label={`Open ${folder.label} in SlateDrop`}
                >
                  <Folder className={cn("h-5 w-5 shrink-0", tone.icon)} strokeWidth={1.75} />
                  <span className={mobileTokens.appHomeSlateDropTileLabel}>{folder.label}</span>
                </Link>
              );
            })}
            <Link
              href="/slatedrop/new-folder"
              className={cn(
                mobileTokens.appHomeSlateDropTile,
                mobileTokens.appHomeSlateDropTileNew,
              )}
              aria-label="Create new folder in SlateDrop"
            >
              <Plus
                className={cn("h-5 w-5 shrink-0", mobileTokens.appHomeSlateDropTileIconNew)}
                strokeWidth={1.75}
              />
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
