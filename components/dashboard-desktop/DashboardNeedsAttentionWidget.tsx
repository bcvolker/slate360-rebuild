"use client";

import Link from "next/link";
import { Bell, CheckCircle2 } from "lucide-react";
import type { DashboardNeedsAttentionItem } from "@/lib/dashboard/load-dashboard-home-data";

function timeAgo(value: string): string {
  const ms = Date.now() - new Date(value).getTime();
  const mins = Math.round(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

/**
 * Real unread notifications (project_notifications), not a fake KPI tile.
 * Each row deep-links via link_path and is markable read on click.
 */
export function DashboardNeedsAttentionWidget({ items }: { items: DashboardNeedsAttentionItem[] }) {
  if (items.length === 0) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center gap-2 py-6 text-center">
        <CheckCircle2 className="h-6 w-6 text-[var(--graphite-muted)]" />
        <p className="text-sm font-medium text-[var(--graphite-text-header)]">All caught up</p>
        <p className="text-xs text-[var(--graphite-muted)]">No items need your attention right now.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 overflow-y-auto">
      {items.slice(0, 6).map((item) => (
        <Link
          key={item.id}
          href={item.linkPath ?? "#"}
          className="flex items-start gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 transition-colors hover:border-[color-mix(in_srgb,var(--graphite-primary)_42%,transparent)]"
        >
          <Bell className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--graphite-primary)]" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-[var(--graphite-text-header)]">{item.title}</span>
            <span className="block truncate text-xs text-[var(--graphite-muted)]">{item.message}</span>
          </span>
          <span className="shrink-0 text-[10px] text-[var(--graphite-muted)]">{timeAgo(item.createdAt)}</span>
        </Link>
      ))}
    </div>
  );
}
