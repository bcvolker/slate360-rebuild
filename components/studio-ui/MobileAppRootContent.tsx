"use client";

import { useMemo } from "react";
import { Bell, ClipboardList, Clock, MessageSquare } from "lucide-react";
import {
  MobileEmptyState,
  MobileExpandableTabbedPanel,
  MobileHomeLayout,
} from "@/components/mobile-system";
import type { MobilePanelTab } from "@/components/mobile-system";
import { MobileAppLauncherGrid } from "@/components/studio-ui/MobileAppLauncherGrid";

export function MobileAppRootContent() {
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
    <MobileHomeLayout
      route="app"
      contentTop={
        <section className="shrink-0">
          <div className="mb-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#A3AED0]">
              Your Apps
            </p>
            <h1 className="mt-0.5 text-xl font-bold tracking-tight text-[#FFFFFF]">Field Hub</h1>
          </div>
          <MobileAppLauncherGrid />
        </section>
      }
      dock={
        <div className="flex min-h-0 w-full flex-1 flex-col">
          <MobileExpandableTabbedPanel tabs={activityTabs} defaultTab="alerts" />
        </div>
      }
    />
  );
}
