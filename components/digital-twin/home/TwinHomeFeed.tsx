"use client";

import Link from "next/link";
import { Boxes, ChevronRight, Loader2, Check, AlertTriangle } from "lucide-react";
import type { HubTwin } from "@/lib/types/digital-twin-hub";
import type { TwinHubStatusChip } from "@/lib/digital-twin/twin-hub-status";
import { MobileEmptyState, mobileTokens } from "@/components/mobile-system";

/**
 * Slice 2 (new Twin 360 home): the live twins feed IS the home body. Each row
 * is content-first — a render placeholder + title + project context + an honest
 * live status chip. Replaces the old dock-tabs + quick-action-grid entirely.
 */

const STATUS_LABEL: Record<TwinHubStatusChip, string> = {
  PROCESSING: "Processing",
  READY: "Ready",
  FAILED: "Failed",
};

function StatusChip({ chip }: { chip: TwinHubStatusChip }) {
  if (chip === "PROCESSING") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--accent-border-blue)] bg-[color-mix(in_srgb,var(--twin360-blue)_10%,transparent)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--twin360-blue)]">
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
        {STATUS_LABEL.PROCESSING}
      </span>
    );
  }
  if (chip === "READY") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-100">
        <Check className="h-3 w-3" aria-hidden />
        {STATUS_LABEL.READY}
      </span>
    );
  }
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-red-400/30 bg-red-500/[0.08] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-red-300">
      <AlertTriangle className="h-3 w-3" aria-hidden />
      {STATUS_LABEL.FAILED}
    </span>
  );
}

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const mins = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
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
          {twin.projectName ? twin.projectName : "Not in a project"}
          <span className="text-white/20"> · </span>
          {timeAgo(twin.updatedAt)}
        </p>
      </div>
      <StatusChip chip={twin.statusChip} />
      <ChevronRight className="h-4 w-4 shrink-0 text-white/25" aria-hidden />
    </Link>
  );
}

export function TwinHomeFeed({
  twins,
  onStartScan,
}: {
  twins: HubTwin[];
  onStartScan: () => void;
}) {
  return (
    <section className="flex flex-col gap-2">
      <p className={mobileTokens.appHomeSectionLabel}>Your twins</p>
      {twins.length === 0 ? (
        <MobileEmptyState
          icon={Boxes}
          title="No twins yet"
          description="Scan a space to turn it into an interactive 3D twin you can share from a link."
          actionLabel="Start your first scan"
          onAction={onStartScan}
        />
      ) : (
        <div className="flex flex-col gap-2">
          {twins.map((twin) => (
            <TwinFeedRow key={twin.id} twin={twin} />
          ))}
        </div>
      )}
    </section>
  );
}
