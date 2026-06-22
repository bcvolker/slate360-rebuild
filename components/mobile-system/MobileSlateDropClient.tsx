"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Camera,
  ChevronRight,
  Cloud,
  Compass,
  FolderOpen,
  Plus,
  Search,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { mobileTokens } from "./mobileTokens";

type BrowseRow = {
  href: string;
  label: string;
  meta: string;
  icon: typeof FolderOpen;
};

type MobileSlateDropClientProps = {
  browseRows: BrowseRow[];
  storageLabel: string;
};

const SEGMENTS = [
  { href: "/slatedrop", label: "Browse" },
  { href: "/slatedrop/recents", label: "Recents" },
  { href: "/slatedrop/shared", label: "Shared" },
  { href: "/slatedrop/requests", label: "Requests" },
] as const;

export function MobileSlateDropClient({ browseRows, storageLabel }: MobileSlateDropClientProps) {
  const pathname = usePathname() ?? "/slatedrop";
  const [query, setQuery] = useState("");
  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return browseRows;
    return browseRows.filter(
      (row) => row.label.toLowerCase().includes(q) || row.meta.toLowerCase().includes(q),
    );
  }, [browseRows, query]);
  return (
    <div className={mobileTokens.mobilePageScrollInner}>
      <section className={cn(mobileTokens.panelBase, "p-5")}>
        <span className={cn(mobileTokens.mobileIconWell, "h-12 w-12")} aria-hidden>
          <Cloud className="h-6 w-6" strokeWidth={1.75} />
        </span>
        <span className={mobileTokens.sectionLabelAccentCool} aria-hidden />
        <p className={cn("mt-4", mobileTokens.mobileEyebrowLabel)}>SlateDrop</p>
        <h1 className={cn("mt-1", mobileTokens.moduleTitle)}>Files</h1>
        <p className={mobileTokens.moduleSubtitle}>
          Browse uploads, app folders, and shared project files.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/slatedrop/upload"
            className={cn(
              mobileTokens.mobilePrimaryButton,
              "inline-flex min-h-10 items-center gap-2 px-4 py-2 text-sm font-semibold",
            )}
          >
            <Upload className="h-4 w-4" aria-hidden />
            Upload
          </Link>
          <Link
            href="/slatedrop/new-folder"
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.05] px-4 text-sm font-semibold text-zinc-100 transition-colors hover:border-white/15 hover:bg-white/[0.08]"
          >
            <Plus className="h-4 w-4" aria-hidden />
            New folder
          </Link>
        </div>
      </section>

      <div className={cn(mobileTokens.mobileGlassCardSurface, "p-3")}>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
            aria-hidden
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search files"
            inputMode="search"
            aria-label="Search files"
            className="h-11 w-full rounded-xl border border-white/10 bg-[#0B0F15]/60 pl-10 pr-4 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-[var(--accent-border-blue)]"
          />
        </div>
      </div>

      <nav
        className="grid grid-cols-4 gap-1 rounded-xl border border-white/10 bg-white/[0.04] p-1"
        aria-label="SlateDrop sections"
      >
        {SEGMENTS.map((segment) => {
          const active = pathname === segment.href;
          return (
            <Link
              key={segment.href}
              href={segment.href}
              className={cn(
                "rounded-lg px-2 py-2 text-center text-[11px] font-semibold transition-colors",
                active
                  ? "bg-white/[0.08] text-zinc-100"
                  : "text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-200",
              )}
              aria-current={active ? "page" : undefined}
            >
              {segment.label}
            </Link>
          );
        })}
      </nav>

      <section className={cn(mobileTokens.panelBase, "overflow-hidden")}>
        {filteredRows.map((row) => {
          const Icon = row.icon;
          return (
            <Link key={row.href} href={row.href} className={mobileTokens.mobileGlassRowLink}>
              <span className={cn(mobileTokens.mobileIconWell, "h-9 w-9")}>
                <Icon className="h-4 w-4" strokeWidth={1.75} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-white">{row.label}</span>
                <span className="mt-0.5 block truncate text-xs text-zinc-400">{row.meta}</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-zinc-500" />
            </Link>
          );
        })}
        {filteredRows.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm font-medium text-zinc-400">
            No files match “{query.trim()}”.
          </div>
        ) : null}
        <div className="border-t border-white/[0.06] px-4 py-3 text-xs font-medium text-zinc-500">
          Storage: {storageLabel}
        </div>
      </section>
    </div>
  );
}

export const SLATEDROP_FOLDER_ICONS = {
  folder: FolderOpen,
  camera: Camera,
  compass: Compass,
} as const;
