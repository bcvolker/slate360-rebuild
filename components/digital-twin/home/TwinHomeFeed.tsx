"use client";

import Link from "next/link";
import { Boxes, ChevronRight, Loader2, Check, AlertTriangle, CloudUpload } from "lucide-react";
import type { HubTwin } from "@/lib/types/digital-twin-hub";
import type { TwinHubStatusChip } from "@/lib/digital-twin/twin-hub-status";
import { MobileEmptyState, mobileTokens } from "@/components/mobile-system";

/**
 * Slice 2 (new Twin 360 home): the live twins feed IS the home body. Rows are
 * grouped by project (most recently active project first) so a day of scanning
 * reads as a job list, not a random pile. Each row is content-first — a render
 * placeholder + title + when + an honest live status chip.
 */

const STATUS_LABEL: Record<TwinHubStatusChip, string> = {
  PROCESSING: "Processing",
  READY: "Ready",
  FAILED: "Failed",
  DRAFT: "Draft",
};

const CHIP_BASE =
  "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide";

function StatusChip({ chip, hasCapture }: { chip: TwinHubStatusChip; hasCapture?: boolean }) {
  if (chip === "DRAFT") {
    // A draft holding an uploaded capture is SAVED work waiting for a processing
    // decision — say so. A draft with nothing in it stays a quiet neutral.
    if (hasCapture) {
      return (
        <span className={`${CHIP_BASE} border-white/15 bg-white/[0.06] text-zinc-200`}>
          <CloudUpload className="h-3 w-3" aria-hidden />
          Saved
        </span>
      );
    }
    return (
      <span className={`${CHIP_BASE} border-white/10 bg-white/[0.04] text-[var(--graphite-muted)]`}>
        {STATUS_LABEL.DRAFT}
      </span>
    );
  }
  if (chip === "PROCESSING") {
    return (
      <span
        className={`${CHIP_BASE} border-[var(--accent-border-blue)] bg-[color-mix(in_srgb,var(--twin360-blue)_10%,transparent)] text-[var(--twin360-blue)]`}
      >
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
        {STATUS_LABEL.PROCESSING}
      </span>
    );
  }
  if (chip === "READY") {
    return (
      <span className={`${CHIP_BASE} border-white/15 bg-white/[0.06] text-zinc-100`}>
        <Check className="h-3 w-3" aria-hidden />
        {STATUS_LABEL.READY}
      </span>
    );
  }
  return (
    <span className={`${CHIP_BASE} border-red-400/30 bg-red-500/[0.08] text-red-300`}>
      <AlertTriangle className="h-3 w-3" aria-hidden />
      {STATUS_LABEL.FAILED}
    </span>
  );
}

/** "Today · 3:42 PM" for today, "Sep 8 · 3:42 PM" otherwise — a scan list needs the clock. */
function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const today = new Date();
  const sameDay =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
  if (sameDay) return `Today · ${time}`;
  return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })} · ${time}`;
}

function TwinFeedRow({ twin }: { twin: HubTwin }) {
  return (
    <Link
      href={`/digital-twin/twins/${twin.id}`}
      className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-2.5 transition active:scale-[0.99] hover:border-[var(--accent-border-blue)]"
      data-twin-feed-row={twin.id}
    >
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-[color-mix(in_srgb,var(--graphite-canvas)_60%,transparent)] text-[var(--twin360-blue)]">
        <Boxes className="h-6 w-6" strokeWidth={1.6} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-zinc-100">{twin.title}</p>
        <p className="mt-0.5 truncate text-xs text-[var(--graphite-muted)]">
          {formatWhen(twin.updatedAt)}
          {twin.readyModels > 0 ? (
            <>
              <span className="text-white/20"> · </span>
              {twin.readyModels} model{twin.readyModels === 1 ? "" : "s"}
            </>
          ) : null}
        </p>
      </div>
      <StatusChip chip={twin.statusChip} hasCapture={twin.hasCapture} />
      <ChevronRight className="h-4 w-4 shrink-0 text-white/25" aria-hidden />
    </Link>
  );
}

type Group = { key: string; label: string; latest: number; twins: HubTwin[] };

/** Group by project, ordered by each project's most recent activity. */
function groupByProject(twins: HubTwin[]): Group[] {
  const groups = new Map<string, Group>();
  for (const twin of twins) {
    const key = twin.projectId ?? "none";
    const label = twin.projectName ?? "Not in a project";
    const at = new Date(twin.updatedAt).getTime() || 0;
    const g = groups.get(key);
    if (g) {
      g.twins.push(twin);
      g.latest = Math.max(g.latest, at);
    } else {
      groups.set(key, { key, label, latest: at, twins: [twin] });
    }
  }
  return [...groups.values()].sort((a, b) => b.latest - a.latest);
}

export function TwinHomeFeed({
  twins,
  onStartScan,
}: {
  twins: HubTwin[];
  onStartScan: () => void;
}) {
  const groups = groupByProject(twins);
  return (
    <section className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex shrink-0 items-baseline justify-between">
        <p className={mobileTokens.appHomeSectionLabel}>Your twins</p>
        {twins.length > 0 ? (
          <span className="font-mono text-[10px] uppercase tracking-wide text-[var(--graphite-muted)]">
            {twins.length}
          </span>
        ) : null}
      </div>
      {twins.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <MobileEmptyState
            icon={Boxes}
            title="No twins yet"
            description="Scan a space to turn it into an interactive 3D twin you can share from a link."
            actionLabel="Start your first scan"
            onAction={onStartScan}
          />
        </div>
      ) : (
        // Contained scroll: the list stays inside its own area and scrolls
        // internally instead of running off the page as it grows.
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="flex flex-col gap-3 pb-2">
            {groups.map((group) => (
              <div key={group.key} className="flex flex-col gap-2" data-twin-feed-group={group.key}>
                <p className="px-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--graphite-muted)]">
                  {group.label}
                  <span className="text-white/25"> · {group.twins.length}</span>
                </p>
                {group.twins.map((twin) => (
                  <TwinFeedRow key={twin.id} twin={twin} />
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
