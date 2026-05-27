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
  MobileHomeLayout,
  MobileQuickActionStrip,
  mobileTokens,
} from "@/components/mobile-system";
import type { MobilePanelTab, MobileQuickActionItem } from "@/components/mobile-system";
import { MobileAppLauncherGrid } from "@/components/studio-ui/MobileAppLauncherGrid";

const DOCK_EMPTY_ACTION =
  "text-[12px] font-medium text-[#85CBC3] hover:text-[#85CBC3]/85 hover:underline";

export function MobileAppRootContent() {
  const [createSheetOpen, setCreateSheetOpen] = useState(false);

  const handleSearch = useCallback(() => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }),
    );
  }, []);

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
        content: (
          <MobileEmptyState
            compact
            icon={Bell}
            title="No active alerts"
            actionLabel="View inbox"
            actionClassName={DOCK_EMPTY_ACTION}
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
            actionClassName={DOCK_EMPTY_ACTION}
            actionHref="/coordination/inbox"
          />
        ),
      },
      {
        value: "assigned",
        label: "Assigned Tasks",
        content: (
          <MobileEmptyState
            compact
            icon={ClipboardList}
            title="No assigned tasks"
            actionLabel="View assigned work"
            actionClassName={DOCK_EMPTY_ACTION}
            actionHref="/site-walk/assigned-work"
          />
        ),
      },
      {
        value: "recent",
        label: "Recent Activity",
        content: (
          <MobileEmptyState compact icon={Clock} title="No recent activity" />
        ),
      },
    ],
    [],
  );

  return (
    <>
      <MobileHomeLayout
        route="app"
        contentTop={
          <section className="shrink-0 pb-1">
            <div className="mb-1.5">
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-300">
                Your Apps
              </p>
            </div>
            <MobileAppLauncherGrid />
          </section>
        }
        primaryActions={
          <section className="mt-1 shrink-0">
            <div className="mb-2">
              <span className={mobileTokens.appHomeSectionLabelAccentCool} aria-hidden />
              <p className={mobileTokens.appHomeSectionLabel}>Quick Actions</p>
            </div>
            <MobileQuickActionStrip actions={quickActions} />
          </section>
        }
        dock={
          <MobileExpandableTabbedPanel
            tabs={activityTabs}
            defaultTab="alerts"
            className="pt-1"
          />
        }
      />
      <MobileCreateSheet open={createSheetOpen} onOpenChange={setCreateSheetOpen} />
    </>
  );
}
