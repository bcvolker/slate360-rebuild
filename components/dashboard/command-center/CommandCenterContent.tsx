"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MapPin, Plus, Search, Bell, MessageSquare, ClipboardList, Clock, FolderOpen } from "lucide-react";
import type { Entitlements } from "@/lib/entitlements";
import {
  MobileActionGrid,
  MobileAppButton,
  MobileSection,
  MobileExpandableTabbedPanel,
  MobileEmptyState,
  MobileCreateSheet,
  MobileQuickActionStrip,
  MobileHomeLayout,
} from "@/components/mobile-system";
import type { MobilePanelTab, MobileQuickActionItem } from "@/components/mobile-system";

interface CommandCenterContentProps {
  entitlements?: Entitlements | null;
  isSlateCeo?: boolean;
}

export function CommandCenterContent({
  entitlements = null,
}: CommandCenterContentProps) {
  const router = useRouter();
  const [createSheetOpen, setCreateSheetOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (!params.has("blocked")) return;
    window.history.replaceState({}, "", "/app");
  }, []);

  const handleSearch = useCallback(() => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }),
    );
  }, []);

  const hasSiteWalk = entitlements?.canAccessStandalonePunchwalk ?? false;

  const activityTabs: MobilePanelTab[] = useMemo(
    () => [
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
    ],
    [],
  );

  const quickActions: MobileQuickActionItem[] = useMemo(
    () => [
      { label: "Create", icon: Plus, accent: "primary", onClick: () => setCreateSheetOpen(true) },
      { label: "SlateDrop", icon: FolderOpen, accent: "info", onClick: () => router.push("/slatedrop") },
      { label: "Search", icon: Search, accent: "muted", onClick: handleSearch },
    ],
    [handleSearch, router],
  );

  return (
    <>
      <MobileHomeLayout
        route="app"
        contentTop={
          <MobileSection label="Your Apps" showAccentLine className="shrink-0">
            {hasSiteWalk ? (
              <MobileActionGrid>
                <MobileAppButton
                  title="Site Walk"
                  subtitle="Field capture"
                  icon={MapPin}
                  href="/site-walk"
                  accent="primary"
                  className="col-span-2 mx-auto w-1/2"
                />
              </MobileActionGrid>
            ) : (
              <div className="rounded-xl border border-dashed border-white/10 px-4 py-5 text-center text-sm text-zinc-500">
                No apps in your plan.{" "}
                <Link href="/more/billing" className="text-amber-400/90 hover:underline">
                  View plans
                </Link>
              </div>
            )}
          </MobileSection>
        }
        primaryActions={
          <MobileSection label="Quick Actions" showAccentLine="cool" className="shrink-0">
            <MobileQuickActionStrip actions={quickActions} />
          </MobileSection>
        }
        dock={
          <MobileExpandableTabbedPanel
            tabs={activityTabs}
            defaultTab="notifications"
            homeDockVariant="app"
          />
        }
      />

      <MobileCreateSheet open={createSheetOpen} onOpenChange={setCreateSheetOpen} />
    </>
  );
}
