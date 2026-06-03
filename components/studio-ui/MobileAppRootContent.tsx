"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Bell,
  ClipboardList,
  Clock,
  FolderOpen,
  MessageSquare,
  Package,
  Plus,
  Search,
} from "lucide-react";
import {
  MobileCreateSheet,
  MobileEmptyState,
  MobileExpandableTabbedPanel,
  MobileHomeListRow,
  MobileQuickActionsSection,
  MobileQuickActionStrip,
  mobileTokens,
  useMobileShellDock,
} from "@/components/mobile-system";
import type { MobilePanelTab, MobileQuickActionItem } from "@/components/mobile-system";
import type { MobileAppHomeData } from "@/lib/mobile/load-app-home-data";
import type { MobileLauncherAppView } from "@/lib/mobile/mobile-launcher-app-types";
import { buildAppHomeDockContent, MobileAppHomeFill } from "@/components/studio-ui/MobileAppHomeFill";
import { MobileAppLauncherGrid } from "@/components/studio-ui/MobileAppLauncherGrid";

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
  const [createSheetOpen, setCreateSheetOpen] = useState(false);

  const handleSearch = useCallback(() => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }),
    );
  }, []);

  const dockPayload = useMemo(() => buildAppHomeDockContent(homeData), [homeData]);

  const quickActions: MobileQuickActionItem[] = useMemo(
    () => [
      { label: "Create", icon: Plus, accent: "primary", onClick: () => setCreateSheetOpen(true) },
      { label: "SlateDrop", icon: FolderOpen, accent: "info", href: "/slatedrop" },
      { label: "Search", icon: Search, accent: "muted", onClick: handleSearch },
      {
        label: "Deliverables",
        icon: Package,
        accent: "neutral",
        href: "/site-walk/deliverables",
      },
    ],
    [handleSearch],
  );

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
        value: "messages",
        label: "Messages",
        content: (
          <MobileEmptyState
            compact
            icon={MessageSquare}
            title="No unread messages"
            actionLabel="View inbox"
            actionClassName={mobileTokens.mobileDockEmptyAction}
            actionHref="/coordination/inbox"
          />
        ),
      },
      {
        value: "assigned",
        label: "Assigned Tasks",
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
        label: "Recent Activity",
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
    () => <MobileExpandableTabbedPanel tabs={activityTabs} defaultTab="alerts" />,
    [activityTabs],
  );

  useMobileShellDock(dockContent);

  return (
    <>
      <div data-mobile-route="app" className={mobileTokens.appHomeScrollInner}>
        <section className={mobileTokens.mobileHomeSection}>
          <div className={mobileTokens.mobileHomeSectionHeader}>
            <span className={mobileTokens.appHomeSectionLabelAccent} aria-hidden />
            <p className={mobileTokens.appHomeSectionLabel}>Your Apps</p>
          </div>
          <MobileAppLauncherGrid apps={launcherApps} />
        </section>

        <MobileQuickActionsSection>
          <MobileQuickActionStrip
            actions={quickActions}
            className={mobileTokens.appHomeQuickActionGrid}
            cardClassName={mobileTokens.appHomeQuickActionCard}
            iconWrapperClassName={mobileTokens.appHomeQuickActionIconWrapper}
            iconClassName={mobileTokens.appHomeQuickActionIcon}
            titleClassName={mobileTokens.appHomeQuickActionTitle}
          />
        </MobileQuickActionsSection>

        <MobileAppHomeFill data={homeData} />
      </div>
      <MobileCreateSheet open={createSheetOpen} onOpenChange={setCreateSheetOpen} />
    </>
  );
}
