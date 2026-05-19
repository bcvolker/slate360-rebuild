"use client";

import React from "react";
import Link from "next/link";
import { MapPin, Plus, Search, Bell, MessageSquare, ClipboardList, Clock, Box, FolderOpen } from "lucide-react";
import type { Entitlements } from "@/lib/entitlements";
import {
  MobileActionCard,
  MobileActionGrid,
  MobileAppCard,
  MobileTabbedPanel,
  MobileEmptyState,
} from "@/components/mobile-system";
import type { MobilePanelTab } from "@/components/mobile-system";

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
  const handleSearch = () => {
    if (typeof window === "undefined") return;
    // Trigger the global ⌘K CommandPalette via the same keyboard event AppShell listens for.
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }),
    );
  };

  const hasSiteWalk = entitlements?.canAccessStandalonePunchwalk ?? false;

  return (
    <div className="mx-auto flex h-full w-full max-w-2xl flex-col gap-4 overflow-y-auto px-4 pb-6 pt-4 no-scrollbar">

      {/* ── Section 1: Your Apps ── */}
      <section>
        <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-amber-400">
          Your Apps
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {/* Site Walk — shown if entitlement present */}
          {hasSiteWalk && (
            <MobileAppCard
              title="Site Walk"
              subtitle="Field capture & deliverables"
              icon={MapPin}
              href="/site-walk"
            />
          )}
          {isSlateCeo && (
            <MobileAppCard
              title="Slate360 Twin"
              subtitle="Owner Preview"
              icon={Box}
              href="#"
            />
          )}
          {/* No apps available */}
          {!hasSiteWalk && (
            <div className="col-span-full rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-slate-500">
              No apps in your plan.{" "}
              <Link href="/more/billing" className="text-amber-400 hover:underline">
                View plans
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ── Section 2: Quick Actions ── */}
      <section>
        <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-amber-400">
          Quick Actions
        </p>
        <MobileActionGrid>
          <MobileActionCard
            label="Create"
            icon={Plus}
            href={hasSiteWalk ? "/site-walk/setup" : "#"}
          />
          <MobileActionCard
            label="SlateDrop"
            icon={FolderOpen}
            href="/slatedrop"
          />
          <MobileActionCard
            label="Deliverables"
            icon={Box}
            href="/projects"
          />
          <MobileActionCard
            label="Search"
            icon={Search}
            onClick={handleSearch}
          />
        </MobileActionGrid>
      </section>

      {/* ── Section 3: Activity Panel ── */}
      <section className="min-h-0 flex-1">
        <MobileTabbedPanel
          tabs={ACTIVITY_TABS}
          defaultTab="notifications"
          minHeight="min-h-[260px]"
        />
      </section>
    </div>
  );
}

