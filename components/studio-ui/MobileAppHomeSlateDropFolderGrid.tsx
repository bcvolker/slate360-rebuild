"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpDown, Cloud, Folder, Plus } from "lucide-react";
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
  const scrollInside = tileCount > 6;

  return (
    <section className={mobileTokens.appHomeSlateDropWindow} aria-label="SlateDrop folders">
      <header className={mobileTokens.appHomeSlateDropHeader}>
        <span className={mobileTokens.appHomeSlateDropHeaderIcon} aria-hidden>
          <Cloud className="h-4 w-4" strokeWidth={1.75} />
        </span>
        <div className="min-w-0">
          <p className={mobileTokens.appHomeSlateDropHeaderTitle}>SlateDrop</p>
          <p className={mobileTokens.appHomeSlateDropHeaderMeta}>
            {folders.length} folder{folders.length === 1 ? "" : "s"}
          </p>
        </div>
        <span className={mobileTokens.appHomeSlateDropHeaderSpacer} aria-hidden />
        <button
          type="button"
          className={mobileTokens.appHomeSlateDropHeaderControl}
          aria-label={`Sort folders by ${sortMode === "name" ? "type" : "name"}`}
          onClick={() => setSortMode((mode) => (mode === "name" ? "type" : "name"))}
        >
          <ArrowUpDown className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
          {sortMode === "name" ? "Name" : "Type"}
        </button>
        <Link href="/slatedrop" className={mobileTokens.appHomeSlateDropHeaderControl}>
          Open
        </Link>
      </header>

      <div
        className={cn(
          mobileTokens.appHomeSlateDropBody,
          scrollInside && mobileTokens.appHomeSlateDropBodyTwoRows,
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
                <Folder className={cn("h-6 w-6 shrink-0", tone.icon)} strokeWidth={1.75} />
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
              className={cn("h-6 w-6 shrink-0", mobileTokens.appHomeSlateDropTileIconNew)}
              strokeWidth={1.75}
            />
            <span className={mobileTokens.appHomeSlateDropTileLabel}>New folder</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
