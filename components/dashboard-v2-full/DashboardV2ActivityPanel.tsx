"use client";

/**
 * DashboardV2ActivityPanel — Mission Feed / Activity panel.
 *
 * Tab order: Alerts | Messages | Assigned | Recent
 *
 * Real data policy:
 *   Alerts   — HubSummary.needsReview + unsyncedItems (real counts from loadSiteWalkHubData)
 *   Messages — links to /coordination/inbox (real route); no fake message rows
 *   Assigned — HubSummary.openItems (real count)
 *   Recent   — last 6 HubWalk records
 *
 * Slice 3 deferred:
 *   - project_notifications → Alerts rows
 *   - site_walk_assignments → Assigned rows (replace count-link with real rows)
 *   - coordination messages → Messages tab rows
 */

import { useState } from "react";
import Link from "next/link";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HubSummary, HubWalk } from "@/lib/types/site-walk";

type Tab = "alerts" | "messages" | "assigned" | "recent";

const TABS: { id: Tab; label: string }[] = [
  { id: "alerts", label: "Alerts" },
  { id: "messages", label: "Messages" },
  { id: "assigned", label: "Assigned" },
  { id: "recent", label: "Recent" },
];

function EmptyRow({ message }: { message: string }) {
  return <p className="py-8 text-center text-sm text-zinc-600">{message}</p>;
}

function AlertsTab({ summary }: { summary: HubSummary }) {
  const hasReview = summary.needsReview > 0;
  const hasUnsynced = summary.unsyncedItems > 0;
  if (!hasReview && !hasUnsynced) return <EmptyRow message="No active alerts" />;

  return (
    <div className="space-y-2 py-3">
      {hasReview && (
        <Link
          href="/site-walk/deliverables"
          className="flex items-center justify-between rounded-xl border border-amber-500/15 bg-amber-500/[0.06] px-3 py-2.5 hover:border-amber-500/30 hover:bg-amber-500/10 transition-colors"
        >
          <span className="text-sm text-zinc-200">
            {summary.needsReview} item{summary.needsReview !== 1 ? "s" : ""} need review
          </span>
          <span className="shrink-0 text-xs text-amber-400">Review →</span>
        </Link>
      )}
      {hasUnsynced && (
        <Link
          href="/site-walk"
          className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2.5 hover:border-white/[0.12] transition-colors"
        >
          <span className="text-sm text-zinc-400">
            {summary.unsyncedItems} item{summary.unsyncedItems !== 1 ? "s" : ""} unsynced
          </span>
          <span className="shrink-0 text-xs text-zinc-500">Sync →</span>
        </Link>
      )}
    </div>
  );
}

function MessagesTab() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04]">
        <Inbox className="h-5 w-5 text-zinc-600" />
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-zinc-500">No unread messages</p>
        <p className="mt-0.5 text-xs text-zinc-700">
          Field coordination and team messages live in your inbox
        </p>
      </div>
      <Link
        href="/coordination/inbox"
        className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:border-white/[0.14] hover:text-white transition-colors"
      >
        Open Inbox
      </Link>
    </div>
  );
}

function AssignedTab({ summary }: { summary: HubSummary }) {
  if (summary.openItems === 0) return <EmptyRow message="No assigned work" />;
  return (
    <div className="py-3">
      <Link
        href="/site-walk/assigned-work"
        className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2.5 hover:border-amber-500/20 hover:bg-white/[0.06] transition-colors"
      >
        <span className="text-sm text-zinc-200">
          {summary.openItems} open item{summary.openItems !== 1 ? "s" : ""}
        </span>
        <span className="shrink-0 text-xs text-amber-400">View →</span>
      </Link>
    </div>
  );
}

function RecentTab({ walks }: { walks: HubWalk[] }) {
  if (walks.length === 0) return <EmptyRow message="No recent worksites" />;
  return (
    <div className="space-y-0.5 py-2">
      {walks.slice(0, 6).map((walk) => (
        <Link
          key={walk.id}
          href={`/site-walk/walks/${walk.id}`}
          className="flex items-center justify-between rounded-lg px-2 py-2.5 hover:bg-white/[0.04] transition-colors"
        >
          <span className="truncate text-sm text-zinc-300 mr-3">{walk.title}</span>
          <span className="shrink-0 text-[11px] text-zinc-600">
            {walk.status === "in_progress"
              ? "In progress"
              : walk.status === "completed"
                ? "Done"
                : "Draft"}
          </span>
        </Link>
      ))}
    </div>
  );
}

interface DashboardV2ActivityPanelProps {
  summary: HubSummary;
  walks: HubWalk[];
}

export function DashboardV2ActivityPanel({
  summary,
  walks,
}: DashboardV2ActivityPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>("alerts");

  return (
    <section
      className="rounded-[1.4rem] border border-white/[0.09] bg-white/[0.03] backdrop-blur-xl overflow-hidden"
      aria-label="Activity"
    >
      {/* Tab strip */}
      <div className="flex border-b border-white/[0.07]">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex-1 py-3 text-[11px] font-semibold uppercase tracking-wide transition-colors",
              activeTab === tab.id
                ? "text-amber-400 border-b-2 border-amber-400 -mb-px"
                : "text-zinc-600 hover:text-zinc-400",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="min-h-[140px] max-h-[340px] overflow-y-auto px-3">
        {activeTab === "alerts" && <AlertsTab summary={summary} />}
        {activeTab === "messages" && <MessagesTab />}
        {activeTab === "assigned" && <AssignedTab summary={summary} />}
        {activeTab === "recent" && <RecentTab walks={walks} />}
      </div>
    </section>
  );
}

