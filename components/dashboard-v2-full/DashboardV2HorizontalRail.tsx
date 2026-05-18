/**
 * DashboardV2HorizontalRail — "Continue Work" visual scroll rail.
 *
 * Server component. Renders real HubWalk records from loadSiteWalkHubData.
 * Cards are visual (top accent bar + status badge + project name + counts).
 * Empty state is clean and actionable — no fake rows.
 *
 * Slice 3 deferred card types:
 *   - Project cards (HubProject[])
 *   - SlateDrop recent uploads
 *   - Deliverable cards
 */

import Link from "next/link";
import { ArrowRight, Clock, MapPin, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HubWalk } from "@/lib/types/site-walk";

interface DashboardV2HorizontalRailProps {
  walks: HubWalk[];
}

type StatusKey = "in_progress" | "completed";

const STATUS_CONFIG: Record<StatusKey, { label: string; badge: string; bar: string }> = {
  in_progress: {
    label: "In Progress",
    badge: "text-amber-300 bg-amber-500/10 border-amber-500/20",
    bar: "bg-amber-400/55",
  },
  completed: {
    label: "Completed",
    badge: "text-emerald-300 bg-emerald-500/10 border-emerald-500/20",
    bar: "bg-emerald-400/50",
  },
};

const DEFAULT_STATUS = {
  label: "Draft",
  badge: "text-zinc-400 bg-white/[0.05] border-white/[0.09]",
  bar: "bg-white/[0.08]",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function DashboardV2HorizontalRail({ walks }: DashboardV2HorizontalRailProps) {
  return (
    <section aria-label="Continue Work">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-400/90">
          Continue Work
        </p>
        {walks.length > 0 && (
          <Link
            href="/site-walk/walks"
            className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>

      {/* Horizontal scroll — scrollbar hidden on all browsers */}
      <div className="flex gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {walks.length === 0 ? (
          /* Empty state — actionable, no fake rows */
          <div className="flex min-w-full items-center justify-center rounded-2xl border border-dashed border-white/[0.07] bg-white/[0.015] py-10">
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04]">
                <MapPin className="h-5 w-5 text-zinc-600" />
              </div>
              <p className="text-sm font-semibold text-zinc-500">No recent worksites</p>
              <p className="mt-0.5 text-xs text-zinc-700">Your field work will appear here</p>
              <Link
                href="/site-walk/setup"
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-400 hover:border-amber-500/35 transition-colors"
              >
                Start a worksite
              </Link>
            </div>
          </div>
        ) : (
          walks.slice(0, 10).map((walk) => {
            const cfg =
              STATUS_CONFIG[walk.status as StatusKey] ?? DEFAULT_STATUS;

            return (
              <Link
                key={walk.id}
                href={`/site-walk/walks/${walk.id}`}
                className="group flex min-w-[240px] max-w-[240px] flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] transition-all hover:border-amber-500/20 hover:bg-white/[0.07] hover:shadow-[0_4px_24px_rgba(245,158,11,0.05)]"
              >
                {/* Status accent bar across the top */}
                <div className={cn("h-[3px] w-full shrink-0", cfg.bar)} />

                <div className="flex flex-1 flex-col p-4">
                  {/* Title */}
                  <p className="mb-1 line-clamp-2 text-sm font-bold leading-snug text-white transition-colors group-hover:text-amber-50">
                    {walk.title}
                  </p>

                  {/* Project label */}
                  {walk.projectName && (
                    <p className="mb-2 truncate text-[11px] text-zinc-600">
                      {walk.projectName}
                    </p>
                  )}

                  {/* Footer: badge + meta */}
                  <div className="mt-auto space-y-2.5">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                        cfg.badge,
                      )}
                    >
                      {cfg.label}
                    </span>
                    <div className="flex items-center justify-between text-[11px] text-zinc-600">
                      <span className="flex items-center gap-1">
                        <Package className="h-3 w-3" />
                        {walk.itemCount} item{walk.itemCount !== 1 ? "s" : ""}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {timeAgo(walk.updatedAt)}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </section>
  );
}

