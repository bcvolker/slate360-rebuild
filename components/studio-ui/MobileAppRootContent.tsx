"use client";

import { useCallback, useMemo } from "react";
import {
  Bell,
  ClipboardList,
  Clock,
  Cloud,
  FolderPlus,
  QrCode,
  Search,
} from "lucide-react";
import {
  MobileEmptyState,
  MobileExpandableTabbedPanel,
  MobileHomeListRow,
  mobileTokens,
  useMobileShellDock,
} from "@/components/mobile-system";
import type { MobilePanelTab } from "@/components/mobile-system";
import { useInviteShare } from "@/components/shared/InviteShareProvider";
import type { MobileAppHomeData } from "@/lib/mobile/load-app-home-data";
import type { MobileLauncherAppView } from "@/lib/mobile/mobile-launcher-app-types";
import { appHomeTokens } from "@/components/studio-ui/app-home-tokens";
import { buildAppHomeDockContent, MobileAppHomeFill } from "@/components/studio-ui/MobileAppHomeFill";
import { MobileAppHomeQuickActions } from "@/components/studio-ui/MobileAppHomeQuickActions";
import { MobileAppLauncherGrid } from "@/components/studio-ui/MobileAppLauncherGrid";
import { MobileAppSectionLabel } from "@/components/studio-ui/MobileAppSectionLabel";
import type { MobileQuickActionItem } from "@/components/mobile-system";

type MobileAppRootContentProps = {
  homeData: MobileAppHomeData;
  launcherApps: MobileLauncherAppView[];
};

function DockRowList({
  rows,
}: {
  rows: {
    key: string;
    title: string;
    meta?: string;
    href?: string;
    metaTone?: "neutral" | "primary" | "info";
  }[];
}) {
  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <MobileHomeListRow
          key={row.key}
          title={row.title}
          meta={row.meta}
          metaTone={row.metaTone}
          href={row.href}
        />
      ))}
    </div>
  );
}

export function MobileAppRootContent({ homeData, launcherApps }: MobileAppRootContentProps) {
  const { setOpen: setInviteOpen } = useInviteShare();

  const handleSearch = useCallback(() => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }),
    );
  }, []);

  const dockPayload = useMemo(() => buildAppHomeDockContent(homeData), [homeData]);

  const activityTabs: MobilePanelTab[] = useMemo(
    () => [
      {
        value: "alerts",
        label: "Alerts",
        content:
          dockPayload.alerts.length > 0 ? (
            <DockRowList rows={dockPayload.alerts} />
          ) : (
            <MobileEmptyState
              compact
              icon={Bell}
              title="No active alerts"
              actionLabel="View inbox"
              actionClassName={mobileTokens.mobileDockEmptyAction}
              actionHref="/coordination/inbox"
            />
          ),
      },
      {
        value: "tasks",
        label: "Tasks",
        content:
          dockPayload.assigned.length > 0 ? (
            <DockRowList
              rows={dockPayload.assigned.map((row) => ({
                ...row,
                metaTone: "primary" as const,
              }))}
            />
          ) : homeData.hubSummary.openItems > 0 ? (
            <DockRowList
              rows={[
                {
                  key: "open-items",
                  title: `${homeData.hubSummary.openItems} open field item${homeData.hubSummary.openItems !== 1 ? "s" : ""}`,
                  meta: "View assigned work",
                  metaTone: "primary" as const,
                  href: "/site-walk/assigned-work",
                },
              ]}
            />
          ) : (
            <MobileEmptyState
              compact
              icon={ClipboardList}
              title="No assigned tasks"
              actionLabel="View assigned work"
              actionClassName={mobileTokens.mobileDockEmptyAction}
              actionHref="/site-walk/assigned-work"
            />
          ),
      },
      {
        value: "recent",
        label: "Recent",
        content:
          dockPayload.recent.length > 0 ? (
            <DockRowList
              rows={dockPayload.recent.map((row) => ({
                key: row.key,
                title: row.title,
                meta: row.meta,
                href: row.href,
                metaTone: row.metaTone,
              }))}
            />
          ) : (
            <MobileEmptyState compact icon={Clock} title="No recent activity" />
          ),
      },
    ],
    [dockPayload, homeData.hubSummary.openItems],
  );

  const dockContent = useMemo(
    () => (
      <MobileExpandableTabbedPanel
        tabs={activityTabs}
        defaultTab="alerts"
        badgeCount={dockPayload.activityCount}
        collapsedHeightPx={40}
      />
    ),
    [activityTabs, dockPayload.activityCount],
  );

  useMobileShellDock(dockContent);

  const quickActions: MobileQuickActionItem[] = useMemo(
    () => [
      { label: "Invite & share", icon: QrCode, onClick: () => setInviteOpen(true) },
      { label: "New project", icon: FolderPlus, href: "/projects" },
      { label: "SlateDrop", icon: Cloud, href: "/slatedrop" },
      { label: "Search", icon: Search, onClick: handleSearch },
    ],
    [handleSearch, setInviteOpen],
  );

  return (
    <div data-mobile-route="app" className={appHomeTokens.scrollInner}>
      <section className={appHomeTokens.section}>
        <div className={appHomeTokens.sectionHeader}>
          <MobileAppSectionLabel data-testid="mobile-section-label">Your Apps</MobileAppSectionLabel>
        </div>
        <MobileAppLauncherGrid apps={launcherApps} />
      </section>

      <MobileAppHomeQuickActions className="mt-auto" actions={quickActions} />

      <MobileAppHomeFill data={homeData} />
    </div>
  );
}
