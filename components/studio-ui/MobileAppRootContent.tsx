"use client";

import { useCallback, useMemo, useState } from "react";
import {
  AppWindow,
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
  MobileComingSoonSheet,
  MobileCreateSheet,
  MobileEmptyState,
  MobileExpandableTabbedPanel,
  MobileHomeLayout,
  MobileQuickActionStrip,
  mobileTokens,
} from "@/components/mobile-system";
import type { MobilePanelTab, MobileQuickActionItem } from "@/components/mobile-system";
import { MobileAppLauncherGrid } from "@/components/studio-ui/MobileAppLauncherGrid";

export function MobileAppRootContent() {
  const [createSheetOpen, setCreateSheetOpen] = useState(false);
  const [digitalTwinSheetOpen, setDigitalTwinSheetOpen] = useState(false);

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
    <>
      <MobileHomeLayout
        route="app"
        contentTop={
          <section className="shrink-0 pb-1">
            <div className="mb-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#A3AED0]">
                Your Apps
              </p>
              <h1 className="text-xl font-bold tracking-tight text-[#FFFFFF]">Field Hub</h1>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <MobileAppLauncherGrid />
              <button
                type="button"
                onClick={() => setDigitalTwinSheetOpen(true)}
                className="flex min-h-[148px] flex-col gap-3 rounded-xl border border-[#6EA7A0]/35 bg-slate-900/40 p-4 text-left transition-all hover:bg-slate-900/55 active:scale-[0.99]"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#6EA7A0]/20 bg-[#6EA7A0]/10">
                  <AppWindow className="h-5 w-5 text-[#6EA7A0]" strokeWidth={1.75} />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-tight text-[#FFFFFF]">Digital Twin</p>
                  <p className="mt-1 line-clamp-1 text-xs leading-snug text-[#A3AED0]">
                    Interactive 3D reality studio.
                  </p>
                </div>
              </button>
            </div>
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
      <MobileComingSoonSheet
        open={digitalTwinSheetOpen}
        onOpenChange={setDigitalTwinSheetOpen}
        title="Digital Twin Studio — Coming in next update"
        description="Digital Twin field tools will arrive in a future app update. Site Walk remains available today."
      />
    </>
  );
}
