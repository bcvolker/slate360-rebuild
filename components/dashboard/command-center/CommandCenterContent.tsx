"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MapPin, Plus, Search, Bell, MessageSquare, ClipboardList, Clock, Box, FolderOpen } from "lucide-react";
import type { Entitlements } from "@/lib/entitlements";
import {
  MobileActionGrid,
  MobileAppButton,
  MobileSection,
  MobileExpandableTabbedPanel,
  MobileEmptyState,
  MobileComingSoonSheet,
  MobileCreateSheet,
  MobileQuickActionStrip,
  MobileHomeLayout,
} from "@/components/mobile-system";
import type { MobilePanelTab, MobileQuickActionItem } from "@/components/mobile-system";
import {
  MOBILE_BLOCKED_DESCRIPTIONS,
  MOBILE_BLOCKED_LABELS,
  type MobileBlockedModule,
} from "@/lib/mobile-route-policy";
import { useIsMobile } from "@/hooks/use-mobile";

interface CommandCenterContentProps {
  entitlements?: Entitlements | null;
  isSlateCeo?: boolean;
}

export function CommandCenterContent({
  entitlements = null,
  isSlateCeo = false,
}: CommandCenterContentProps) {
  const isMobile = useIsMobile();
  const [comingSoonTitle, setComingSoonTitle] = useState<string | null>(null);
  const [comingSoonDescription, setComingSoonDescription] = useState<string | undefined>();
  const [createSheetOpen, setCreateSheetOpen] = useState(false);

  const openBlockedNotice = useCallback((module: MobileBlockedModule) => {
    setComingSoonTitle(MOBILE_BLOCKED_LABELS[module]);
    setComingSoonDescription(MOBILE_BLOCKED_DESCRIPTIONS[module]);
  }, []);

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
            actionLabel={isMobile ? "Coordination on desktop" : "View inbox"}
            actionHref={isMobile ? undefined : "/coordination/inbox"}
            onAction={isMobile ? () => openBlockedNotice("coordination") : undefined}
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
            actionLabel={isMobile ? "Coordination on desktop" : "View inbox"}
            actionHref={isMobile ? undefined : "/coordination/inbox"}
            onAction={isMobile ? () => openBlockedNotice("coordination") : undefined}
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
    [isMobile, openBlockedNotice],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const blocked = params.get("blocked") as MobileBlockedModule | null;
    if (!blocked || !(blocked in MOBILE_BLOCKED_LABELS)) return;
    openBlockedNotice(blocked);
    window.history.replaceState({}, "", "/app");
  }, [openBlockedNotice]);

  const handleSearch = useCallback(() => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }),
    );
  }, []);

  const hasSiteWalk = entitlements?.canAccessStandalonePunchwalk ?? false;
  const appCount = (hasSiteWalk ? 1 : 0) + (isSlateCeo ? 1 : 0);

  const quickActions: MobileQuickActionItem[] = useMemo(
    () => [
      { label: "Create", icon: Plus, accent: "primary", onClick: () => setCreateSheetOpen(true) },
      { label: "SlateDrop", icon: FolderOpen, accent: "info", onClick: () => openBlockedNotice("slatedrop") },
      {
        label: "Deliverables",
        icon: Box,
        accent: "warm",
        onClick: () => {
          setComingSoonTitle("Deliverables");
          setComingSoonDescription(
            "Deliverables are being rebuilt for mobile. Use Site Walk on desktop to manage reports until the new experience ships.",
          );
        },
      },
      { label: "Search", icon: Search, accent: "muted", onClick: handleSearch },
    ],
    [openBlockedNotice, handleSearch],
  );

  return (
    <>
      <MobileHomeLayout
        route="app"
        contentTop={
          <MobileSection label="Your Apps" showAccentLine className="shrink-0">
            {appCount > 0 ? (
              <MobileActionGrid>
                {hasSiteWalk && (
                  <MobileAppButton
                    title="Site Walk"
                    subtitle="Field capture"
                    icon={MapPin}
                    href="/site-walk"
                    accent="primary"
                    className={appCount === 1 ? "col-span-2 mx-auto w-1/2" : undefined}
                  />
                )}
                {isSlateCeo && (
                  <MobileAppButton
                    title="Slate360 Twin"
                    subtitle="Digital Twin"
                    icon={Box}
                    href="#"
                    badge="CEO"
                    accent="info"
                    className={appCount === 1 ? "col-span-2 mx-auto w-1/2" : undefined}
                  />
                )}
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

      {comingSoonTitle && (
        <MobileComingSoonSheet
          open={!!comingSoonTitle}
          onOpenChange={(open) => {
            if (!open) {
              setComingSoonTitle(null);
              setComingSoonDescription(undefined);
            }
          }}
          title={`${comingSoonTitle} on Mobile`}
          description={comingSoonDescription}
        />
      )}
      <MobileCreateSheet open={createSheetOpen} onOpenChange={setCreateSheetOpen} />
    </>
  );
}
