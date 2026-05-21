"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { MapPin, Plus, Search, Bell, MessageSquare, ClipboardList, Clock, Box, FolderOpen } from "lucide-react";
import type { Entitlements } from "@/lib/entitlements";
import { cn } from "@/lib/utils";
import {
  MobileActionCard,
  MobileActionGrid,
  MobileAppButton,
  MobileSection,
  MobileTabbedPanel,
  MobileEmptyState,
  MobileComingSoonSheet,
  MobileCreateSheet,
  mobileTokens,
} from "@/components/mobile-system";
import type { MobilePanelTab } from "@/components/mobile-system";
import { MOBILE_BLOCKED_LABELS, type MobileBlockedModule } from "@/lib/mobile-route-policy";

interface CommandCenterContentProps {
  entitlements?: Entitlements | null;
  /**
   * True for Slate360 CEO/owner.
   * Reserved for when Track B provides a real /ceo/twin route.
   * Intentionally unused until that route exists.
   */
  isSlateCeo?: boolean;
}

// ── Activity tabs ─────────────────────────────────────────────────────────────

const ACTIVITY_TABS: MobilePanelTab[] = [
  {
    value: "notifications",
    label: "Alerts",
    content: <MobileEmptyState icon={Bell} title="No new notifications" actionLabel="View inbox" actionHref="/coordination/inbox" />,
  },
  {
    value: "messages",
    label: "Messages",
    content: <MobileEmptyState icon={MessageSquare} title="No unread messages" actionLabel="View inbox" actionHref="/coordination/inbox" />,
  },
  {
    value: "assigned",
    label: "Assigned",
    content: <MobileEmptyState icon={ClipboardList} title="No assigned work" actionLabel="View assigned" actionHref="/site-walk/assigned-work" />,
  },
  {
    value: "recent",
    label: "Recent",
    content: <MobileEmptyState icon={Clock} title="No recent activity" />,
  },
];

export function CommandCenterContent({
  entitlements = null,
  isSlateCeo = false,
}: CommandCenterContentProps) {
  const [comingSoonTitle, setComingSoonTitle] = useState<string | null>(null);
  const [createSheetOpen, setCreateSheetOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const blocked = params.get("blocked") as MobileBlockedModule | null;
    if (!blocked || !(blocked in MOBILE_BLOCKED_LABELS)) return;
    setComingSoonTitle(MOBILE_BLOCKED_LABELS[blocked]);
    window.history.replaceState({}, "", "/app");
  }, []);

  const handleSearch = () => {
    if (typeof window === "undefined") return;
    // Trigger the global ⌘K CommandPalette via the same keyboard event AppShell listens for.
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }),
    );
  };

  const hasSiteWalk = entitlements?.canAccessStandalonePunchwalk ?? false;
  const appCount = (hasSiteWalk ? 1 : 0) + (isSlateCeo ? 1 : 0);

  return (
    <div className={cn("mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col px-4 pt-4 pb-4", mobileTokens.mobileHomeSectionGap)}>

      {/* ── Section 1: Your Apps ── */}
      <MobileSection label="Your Apps" className="shrink-0">
        {appCount > 0 ? (
          <MobileActionGrid>
            {hasSiteWalk && (
              <MobileAppButton
                title="Site Walk"
                subtitle="Field capture"
                icon={MapPin}
                href="/site-walk"
                className={appCount === 1 ? "col-span-2 mx-auto w-1/2" : undefined}
              />
            )}
            {isSlateCeo && (
              <MobileAppButton
                title="Slate360 Twin"
                subtitle="Owner Preview"
                icon={Box}
                href="#"
                badge="CEO"
                className={appCount === 1 ? "col-span-2 mx-auto w-1/2" : undefined}
              />
            )}
          </MobileActionGrid>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-slate-500">
            No apps in your plan.{" "}
            <Link href="/more/billing" className="text-amber-400 hover:underline">
              View plans
            </Link>
          </div>
        )}
      </MobileSection>

      {/* ── Section 2: Quick Actions ── */}
      <MobileSection label="Quick Actions" className="shrink-0">
        <MobileActionGrid>
          <MobileActionCard
            label="Create"
            icon={Plus}
            onClick={() => setCreateSheetOpen(true)}
          />
          <MobileActionCard
            label="SlateDrop"
            icon={FolderOpen}
            onClick={() => setComingSoonTitle("SlateDrop")}
          />
          <MobileActionCard
            label="Deliverables"
            icon={Box}
            onClick={() => setComingSoonTitle("Deliverables")}
          />
          <MobileActionCard
            label="Search"
            icon={Search}
            onClick={handleSearch}
          />
        </MobileActionGrid>
      </MobileSection>

      {/* ── Section 3: Activity Panel ── */}
      <MobileSection className="flex-1 min-h-0 flex flex-col" contentClassName="flex-1 min-h-0 flex flex-col">
        <MobileTabbedPanel
          tabs={ACTIVITY_TABS}
          defaultTab="notifications"
          minHeight="min-h-0"
          className="flex-1 min-h-0"
        />
      </MobileSection>

      {comingSoonTitle && (
        <MobileComingSoonSheet
          open={!!comingSoonTitle}
          onOpenChange={(open) => !open && setComingSoonTitle(null)}
          title={`${comingSoonTitle} on Mobile`}
        />
      )}
      <MobileCreateSheet
        open={createSheetOpen}
        onOpenChange={setCreateSheetOpen}
      />
    </div>
  );
}

