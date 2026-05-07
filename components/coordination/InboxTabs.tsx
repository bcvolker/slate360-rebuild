"use client";

import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import type React from "react";
import GlassCard from "@/components/shared/GlassCard";
import { Inbox, Calendar as CalendarIcon, MessageSquare, AlertCircle } from "lucide-react";

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
    <GlassCard className="flex flex-col gap-4 p-4 h-full max-h-[70vh]">
      {/* Tab bar */}
      <div
        className="flex gap-1 rounded-2xl border border-white/10 bg-black/40 p-1 shrink-0"
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
              className={`flex-1 rounded-xl py-2 text-center text-xs font-black transition-colors ${
                isActive
                  ? "bg-amber-500 text-slate-950 shadow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
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
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-sm font-bold text-amber-500 leading-relaxed">
                  Welcome! To access walks assigned to you, click the Organization Dropdown next to the Slate360 logo in the top header and select your assigned project.
                </p>
              </div>
            </div>

            <GlassCard className="p-4 border-dashed border-white/5 opacity-50 flex items-center gap-3">
              <Inbox className="w-5 h-5 text-slate-500" />
              <p className="text-sm text-slate-400">No other notifications at this time.</p>
            </GlassCard>
            {children}
          </>
        )}

        {active === "milestones" && (
          <GlassCard className="py-12 text-center border-dashed">
            <CalendarIcon className="mx-auto h-8 w-8 text-slate-500" />
            <p className="mt-3 text-sm font-black text-slate-300">No upcoming milestones</p>
            <p className="mt-1 text-xs text-slate-500">Project milestone alerts will appear here.</p>
          </GlassCard>
        )}

        {active === "messages" && (
          <GlassCard className="py-12 text-center border-dashed">
            <MessageSquare className="mx-auto h-8 w-8 text-slate-500" />
            <p className="mt-3 text-sm font-black text-slate-300">No direct messages</p>
            <p className="mt-1 text-xs text-slate-500">Chat with team members here.</p>
          </GlassCard>
        )}
      </div>
    </GlassCard>
  );
}
