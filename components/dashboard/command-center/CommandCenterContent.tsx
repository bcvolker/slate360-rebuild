"use client";

import React from "react";
import Link from "next/link";
import { MapPin, Plus, Search, Upload, Share2, Bell, MessageSquare, ClipboardList, Clock, Box, FolderOpen } from "lucide-react";
import type { Entitlements } from "@/lib/entitlements";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useInviteShare } from "@/components/shared/InviteShareProvider";
import { cn } from "@/lib/utils";

interface CommandCenterContentProps {
  entitlements?: Entitlements | null;
  /**
   * True for Slate360 CEO/owner.
   * Reserved for when Track B provides a real /ceo/twin route.
   * Intentionally unused until that route exists.
   */
  isSlateCeo?: boolean;
}

export function CommandCenterContent({
  entitlements = null,
  isSlateCeo = false,
}: CommandCenterContentProps) {
  const { setOpen: openInviteShare } = useInviteShare();

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
        <div className="grid gap-3">
          {/* Site Walk — shown if entitlement present */}
          {hasSiteWalk && (
            <AppTile
              href="/site-walk"
              name="Site Walk"
              tagline="Field capture & deliverables"
              icon={MapPin}
            />
          )}
          {/*
           * Slate360 Twin tile intentionally omitted.
           * Track B must provide a real route (e.g. /ceo/twin) before this tile
           * can be wired. Once Track B ships:
           *   1. Add a real href here (e.g. href="/ceo/twin").
           *   2. Gate with isSlateCeo (already passed as prop).
           *   3. Remove this comment block.
           * Do NOT add a placeholder or Coming Soon tile.
           */}
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
        <div className="grid grid-cols-2 gap-3">
          <QuickActionCard
            label="Create"
            icon={Plus}
            href={hasSiteWalk ? "/site-walk/setup" : "#"}
          />
          <QuickActionCard
            label="SlateDrop"
            icon={FolderOpen}
            href="/slatedrop"
          />
          <QuickActionCard
            label="Deliverables"
            icon={Box}
            href="/projects"
          />
          <QuickActionCard
            label="Search"
            icon={Search}
            onClick={handleSearch}
          />
        </div>
      </section>

      {/* ── Section 3: Activity Panel ── */}
      <section className="min-h-0 flex-1">
        <div className="relative flex flex-col overflow-hidden rounded-xl border border-white/6 bg-zinc-900/40 min-h-[260px]">
          <Tabs defaultValue="notifications" className="flex min-h-0 flex-1 flex-col">
            <div className="shrink-0 border-b border-white/5 px-3">
              <TabsList className="h-9 w-full bg-transparent p-0">
                {ACTIVITY_TABS.map((tab) => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="flex-1 rounded-none border-b-2 border-transparent py-2 text-[12px] font-medium text-zinc-500 transition-colors data-[state=active]:border-amber-500 data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:shadow-none"
                  >
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
            {ACTIVITY_TABS.map((tab) => (
              <TabsContent
                key={tab.value}
                value={tab.value}
                className="min-h-0 flex-1 overflow-y-auto px-3 pt-2 pb-6"
              >
                <ActivityEmptyState icon={tab.icon} label={tab.emptyLabel} href={tab.href} />
              </TabsContent>
            ))}
          </Tabs>
          {/* Bottom fade — scroll affordance */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-zinc-900/90 to-transparent" />
        </div>
      </section>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

interface AppTileProps {
  href: string;
  name: string;
  tagline: string;
  icon: React.ElementType;
}

function AppTile({ href, name, tagline, icon: Icon }: AppTileProps) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4 transition-colors hover:border-amber-500/30 hover:bg-white/[0.06] active:bg-white/[0.09]"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-black text-white">{name}</p>
        <p className="text-xs text-zinc-500">{tagline}</p>
      </div>
    </Link>
  );
}

interface QuickActionCardProps {
  label: string;
  icon: React.ElementType;
  href?: string;
  onClick?: () => void;
}

function QuickActionCard({ label, icon: Icon, href, onClick }: QuickActionCardProps) {
  const className =
    "flex min-h-[90px] flex-col items-center justify-center gap-2 rounded-xl border border-white/8 bg-white/[0.04] text-zinc-300 transition-colors hover:border-amber-500/25 hover:bg-white/[0.08] hover:text-white active:bg-white/[0.12]";

  const inner = (
    <>
      <Icon className="h-6 w-6 text-amber-500" />
      <span className="text-[13px] font-medium leading-tight text-center">{label}</span>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {inner}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {inner}
    </button>
  );
}

function ActivityEmptyState({
  icon: Icon,
  label,
  href,
}: {
  icon: React.ElementType;
  label: string;
  href?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
      <Icon className="h-6 w-6 text-zinc-600" />
      <p className="text-xs text-zinc-600">{label}</p>
      {href && (
        <Link href={href} className="text-[11px] text-amber-500 hover:underline">
          View Alerts
        </Link>
      )}
    </div>
  );
}

const ACTIVITY_TABS = [
  { value: "notifications", label: "Alerts", icon: Bell, emptyLabel: "No new notifications", href: "/coordination/inbox" },
  { value: "messages", label: "Messages", icon: MessageSquare, emptyLabel: "No unread messages", href: "/coordination/inbox" },
  { value: "assigned", label: "Assigned", icon: ClipboardList, emptyLabel: "No assigned work", href: "/site-walk/assigned-work" },
  { value: "recent", label: "Recent", icon: Clock, emptyLabel: "No recent activity", href: undefined },
] as const;


