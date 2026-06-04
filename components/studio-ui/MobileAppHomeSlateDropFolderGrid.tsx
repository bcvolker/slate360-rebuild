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

export type MobileHomeSlateDropFolderGridProps = {
  folders: HomeSlateDropFolder[];
  sectionLabel?: string;
  openHref?: string;
  newFolderHref?: string;
  sectionAriaLabel?: string;
  folderIconClassName?: string;
  newFolderIconClassName?: string;
  labelAccentClassName?: string;
};

const TYPE_ORDER: Record<HomeSlateDropFolder["tone"], number> = {
  project: 0,
  workspace: 1,
  system: 2,
};

const SLATEDROP_DEFAULTS = {
  sectionLabel: "SlateDrop",
  openHref: "/slatedrop",
  newFolderHref: "/slatedrop/new-folder",
  sectionAriaLabel: "SlateDrop",
  folderIconClassName: mobileTokens.appHomeSlateDropTileIcon,
  newFolderIconClassName: mobileTokens.appHomeSlateDropTileIconNew,
  labelAccentClassName: mobileTokens.appHomeSectionLabelAccent,
} as const;

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

export function MobileHomeSlateDropFolderGrid({
  folders,
  sectionLabel = SLATEDROP_DEFAULTS.sectionLabel,
  openHref = SLATEDROP_DEFAULTS.openHref,
  newFolderHref = SLATEDROP_DEFAULTS.newFolderHref,
  sectionAriaLabel = SLATEDROP_DEFAULTS.sectionAriaLabel,
  folderIconClassName = SLATEDROP_DEFAULTS.folderIconClassName,
  newFolderIconClassName = SLATEDROP_DEFAULTS.newFolderIconClassName,
  labelAccentClassName = SLATEDROP_DEFAULTS.labelAccentClassName,
}: MobileHomeSlateDropFolderGridProps) {
  const [sortMode, setSortMode] = useState<SortMode>("type");
  const sortedFolders = useMemo(
    () => sortFolders(folders, sortMode),
    [folders, sortMode],
  );
  const showScrollAffordance = sortedFolders.length >= 3;

  return (
    <section className={mobileTokens.appHomeSlateDropSection} aria-label={sectionAriaLabel}>
      <div className={mobileTokens.appHomeSectionLabelRow}>
        <div className={mobileTokens.appHomeSectionLabelBlock}>
          <span className={labelAccentClassName} aria-hidden />
          <p className={mobileTokens.appHomeSectionLabel}>{sectionLabel}</p>
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
          <Link href={openHref} className={mobileTokens.appHomeSectionLabelTextLink}>
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
                aria-label={`Open ${folder.label} in ${sectionLabel}`}
              >
                <Folder className={folderIconClassName} strokeWidth={1.75} />
                <span className={mobileTokens.appHomeSlateDropTileLabel}>{folder.label}</span>
              </Link>
            ))}
            <Link
              href={newFolderHref}
              className={cn(
                mobileTokens.appHomeSlateDropCard,
                mobileTokens.appHomeSlateDropTileNew,
              )}
              aria-label={`Create new folder in ${sectionLabel}`}
            >
              <Plus className={newFolderIconClassName} strokeWidth={1.75} />
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

/** Slate360 /app home — default blue folder icons and /slatedrop links. */
export function MobileAppHomeSlateDropFolderGrid({
  folders,
}: {
  folders: HomeSlateDropFolder[];
}) {
  return <MobileHomeSlateDropFolderGrid folders={folders} />;
}
