"use client";

import { useRouter } from "next/navigation";
import { Bell, ClipboardList, Clock, FolderOpen, MapPin, MessageSquare, Plus, Search } from "lucide-react";
import {
  MobileActionGrid,
  MobileAppButton,
  MobileEmptyState,
  MobileExpandableTabbedPanel,
  MobileHomeLayout,
  MobileQuickActionStrip,
  mobileTokens,
} from "@/components/mobile-system";
import type { MobilePanelTab, MobileQuickActionItem } from "@/components/mobile-system";

function AppSectionHeader({ label }: { label: string }) {
  return (
    <div className="mb-2">
      <span className={mobileTokens.appHomeSectionLabelAccent} aria-hidden />
      <p className={mobileTokens.appHomeSectionLabel}>{label}</p>
    </div>
  );
}

export function MobileAppRootContent() {
  const router = useRouter();

  const activityTabs: MobilePanelTab[] = [
    {
      value: "notifications",
      label: "Alerts",
      content: (
        <MobileEmptyState
          compact
          icon={Bell}
          title="No new notifications"
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
      label: "Assigned",
      content: (
        <MobileEmptyState
          compact
          icon={ClipboardList}
          title="No assigned work"
          actionLabel="View assigned"
          actionHref="/site-walk/assigned-work"
        />
      ),
    },
    {
      value: "recent",
      label: "Recent",
      content: <MobileEmptyState compact icon={Clock} title="No recent activity" />,
    },
  ];

  const quickActions: MobileQuickActionItem[] = [
    { label: "Create", icon: Plus, accent: "primary", onClick: () => router.push("/projects") },
    { label: "SlateDrop", icon: FolderOpen, accent: "info", onClick: () => router.push("/slatedrop") },
    {
      label: "Search",
      icon: Search,
      accent: "muted",
      onClick: () => {
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }));
      },
    },
  ];

  return (
    <MobileHomeLayout
      route="app"
      contentTop={
        <section className="shrink-0">
          <AppSectionHeader label="Your Apps" />
          <MobileActionGrid>
            <MobileAppButton
              title="Site Walk"
              subtitle="Field capture"
              icon={MapPin}
              href="/site-walk"
              accent="primary"
            />
          </MobileActionGrid>
          <p className="mt-4 text-sm leading-relaxed text-[#A3AED0]">
            Launch Site Walk to capture geolocated field conditions, plan pins, and deliverable reports from
            your device.
          </p>
        </section>
      }
      primaryActions={
        <section className="shrink-0">
          <div className="mb-2">
            <span className={mobileTokens.appHomeSectionLabelAccentCool} aria-hidden />
            <p className={mobileTokens.appHomeSectionLabel}>Quick Actions</p>
          </div>
          <MobileQuickActionStrip actions={quickActions} />
        </section>
      }
      dock={
        <MobileExpandableTabbedPanel tabs={activityTabs} defaultTab="notifications" homeDockVariant="app" />
      }
    />
  );
}
