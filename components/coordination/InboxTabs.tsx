"use client";

import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import type React from "react";
import GlassCard from "@/components/shared/GlassCard";
import { Inbox, Calendar as CalendarIcon, MessageSquare, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { mobileTokens } from "@/components/mobile-system/mobileTokens";

const TABS = [
  { key: "notifications", label: "Notifications" },
  { key: "milestones",    label: "Milestones & Upcoming" },
  { key: "messages",      label: "Direct Messages" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function InboxTabs({ children }: { children?: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = ((searchParams?.get("tab") ?? "notifications")) as TabKey;

  return (
    <GlassCard className="flex h-full max-h-[70vh] flex-col gap-4 rounded-xl p-4 shadow-none">
      {/* Tab bar */}
      <div
        className={cn(mobileTokens.panelTabStripWrapper, "flex shrink-0 gap-0 border-b border-white/5 px-0")}
        role="tablist"
        aria-label="Inbox filter"
      >
        {TABS.map((tab) => {
          const isActive = active === tab.key;
          const params = new URLSearchParams(searchParams?.toString() ?? "");
          if (tab.key === "notifications") {
            params.delete("tab");
          } else {
            params.set("tab", tab.key);
          }
          const paramStr = params.toString();
          const href: string = paramStr.length > 0 ? `${pathname}?${paramStr}` : (pathname ?? "/coordination/inbox");
          return (
            <Link
              key={tab.key}
              href={href}
              role="tab"
              aria-selected={isActive}
              className={cn(
                "flex-1 border-b-2 py-2 text-center text-[13px] font-medium transition-colors",
                isActive
                  ? "border-[#6EA7A0] text-zinc-100"
                  : "border-transparent text-zinc-500 hover:text-zinc-300",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto rounded-xl pr-2 space-y-3 custom-scrollbar">
        {active === "notifications" && (
          <>
            {/* The Collaborator Onboarding Message */}
            <div className="rounded-xl border border-[#6EA7A0]/25 bg-[#6EA7A0]/10 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#6EA7A0]" strokeWidth={1.75} />
                <p className="text-sm font-medium leading-relaxed text-zinc-200">
                  Welcome! To access walks assigned to you, click the Organization Dropdown next to the Slate360 logo in the top header and select your assigned project.
                </p>
              </div>
            </div>

            <GlassCard className="flex items-center gap-3 rounded-xl border-dashed border-white/5 p-4 opacity-50 shadow-none">
              <Inbox className="h-5 w-5 text-zinc-500" />
              <p className="text-sm text-zinc-400">No other notifications at this time.</p>
            </GlassCard>
            {children}
          </>
        )}

        {active === "milestones" && (
          <GlassCard className="rounded-xl border-dashed py-12 text-center shadow-none">
            <CalendarIcon className={cn(mobileTokens.emptyStateIcon, "mx-auto")} />
            <p className="mt-3 text-sm font-medium text-zinc-300">No upcoming milestones</p>
            <p className="mt-1 text-xs text-zinc-500">Project milestone alerts will appear here.</p>
          </GlassCard>
        )}

        {active === "messages" && (
          <GlassCard className="rounded-xl border-dashed py-12 text-center shadow-none">
            <MessageSquare className={cn(mobileTokens.emptyStateIcon, "mx-auto")} />
            <p className="mt-3 text-sm font-medium text-zinc-300">No direct messages</p>
            <p className="mt-1 text-xs text-zinc-500">Chat with team members here.</p>
          </GlassCard>
        )}
      </div>
    </GlassCard>
  );
}
