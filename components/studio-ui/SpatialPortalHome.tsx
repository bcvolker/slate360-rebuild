"use client";

import Link from "next/link";
import { FolderOpen, FolderPlus, Scan, Search, UserPlus } from "lucide-react";
import { appHomeTokens } from "@/components/studio-ui/app-home-tokens";
import { MobileAppSectionLabel } from "@/components/studio-ui/MobileAppSectionLabel";
import { MobileAppHomeQuickActions } from "@/components/studio-ui/MobileAppHomeQuickActions";
import type { MobileQuickActionItem } from "@/components/mobile-system";

export function SpatialPortalHome({
  projectCount,
  onSearch,
  onInvite,
}: {
  projectCount: number;
  onSearch?: () => void;
  onInvite?: () => void;
}) {
  const actions: MobileQuickActionItem[] = [
    { label: "New project", icon: FolderPlus, href: "/projects?new=1" },
    { label: "Walkthroughs", icon: Scan, href: "/spatial-walkthrough" },
    { label: "Search", icon: Search, href: "/spatial-walkthrough" },
  ];
  if (onInvite) actions.push({ label: "Invite", icon: UserPlus, onClick: onInvite });
  void onSearch;

  return (
    <div data-mobile-route="app" className={appHomeTokens.scrollInner}>
      <section className={appHomeTokens.section}>
        <div className={appHomeTokens.sectionHeader}>
          <MobileAppSectionLabel>Spatial Walkthrough</MobileAppSectionLabel>
        </div>
        <div className="grid gap-3">
          <Link
            href="/projects"
            className="flex min-h-11 items-center gap-3 border border-white/10 bg-white/[0.04] px-4 py-4"
          >
            <FolderOpen className="h-5 w-5 text-[var(--graphite-primary)]" />
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-[var(--graphite-text-header)]">Projects</span>
              <span className="block text-xs text-[var(--graphite-muted)]">
                {projectCount === 0 ? "Open your project portal" : `${projectCount} project${projectCount === 1 ? "" : "s"}`}
              </span>
            </span>
          </Link>
          <Link
            href="/spatial-walkthrough"
            className="flex min-h-11 items-center gap-3 border border-white/10 bg-white/[0.04] px-4 py-4"
          >
            <Scan className="h-5 w-5 text-[var(--graphite-primary)]" />
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-[var(--graphite-text-header)]">Walkthrough library</span>
              <span className="block text-xs text-[var(--graphite-muted)]">Browse by building, floor, and date</span>
            </span>
          </Link>
        </div>
      </section>
      <MobileAppHomeQuickActions actions={actions} />
    </div>
  );
}
