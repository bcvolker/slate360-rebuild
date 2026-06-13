"use client";

import Link from "next/link";
import { Search, Upload } from "lucide-react";
import { mobileTokens } from "@/components/mobile-system/mobileTokens";
import { cn } from "@/lib/utils";
import {
  SlateDropBrowserEmptyFiles,
  SlateDropBrowserFileRow,
} from "./SlateDropBrowserFileRows";
import { SlateDropBrowserFolderGrid } from "./SlateDropBrowserFolders";
import { formatStorageLabel, SlateDropStorageRing } from "./SlateDropStorageRing";
import { slatedropBrowserTokens as t } from "./slatedrop-browser-tokens";
import type { ReturnTypeUseSlateDropBrowserData } from "./useSlateDropBrowserData";

export function MobileSlateDropBrowser({
  folders,
  files,
  storageUsedGb,
  storageLimitGb,
  searchQuery,
  setSearchQuery,
  loading,
}: ReturnTypeUseSlateDropBrowserData) {
  return (
    <div className={cn(mobileTokens.mobilePageScrollInner, t.canvas, "pb-safe")}>
      <header className="flex items-center justify-between gap-3 px-0.5">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold text-[var(--graphite-text-header)]">SlateDrop</h1>
          <p className="text-xs text-[var(--graphite-muted)]">
            {formatStorageLabel(storageUsedGb, storageLimitGb)}
          </p>
        </div>
        <SlateDropStorageRing usedGb={storageUsedGb} limitGb={storageLimitGb} size="sm" />
      </header>

      <div className="relative">
        <Search
          className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--graphite-muted)]"
          aria-hidden
        />
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search files…"
          className={t.searchInput}
          aria-label="Search files"
        />
      </div>

      <section>
        <h2 className={cn(t.sectionLabel, "mb-2")}>Project folders</h2>
        <SlateDropBrowserFolderGrid folders={folders} />
      </section>

      <section>
        <h2 className={cn(t.sectionLabel, "mb-2")}>Recent files</h2>
        {files.length > 0 ? (
          <div className="space-y-1">
            {files.map((file) => (
              <SlateDropBrowserFileRow key={file.id} file={file} />
            ))}
          </div>
        ) : (
          <SlateDropBrowserEmptyFiles loading={loading} />
        )}
      </section>

      <Link href="/slatedrop/upload" className={t.uploadFab} aria-label="Upload files">
        <Upload className="h-6 w-6" strokeWidth={1.75} />
      </Link>
    </div>
  );
}
