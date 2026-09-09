"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { TwinPoster } from "@/components/digital-twin/home/TwinPoster";
import { TwinStateChip } from "@/components/digital-twin/home/TwinStateChip";
import { formatTwinWhen, hubStateOf } from "@/lib/digital-twin/twin-hub-state";
import type { HubTwin } from "@/lib/types/digital-twin-hub";

const VERB: Record<string, string> = {
  uploading: "Finish upload",
  saved: "Review",
  processing: "Open",
  failed: "See why",
};

/** S1 §3 — the one unfinished thing, with one verb. Hidden when nothing is pending. */
export function TwinHomeContinue({ twin }: { twin: HubTwin | null }) {
  if (!twin) return null;
  const state = hubStateOf(twin);
  return (
    <Link
      href={`/digital-twin/twins/${twin.id}`}
      className="flex shrink-0 items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-2.5 transition active:scale-[0.99] hover:border-[var(--accent-border-blue)]"
      data-twin-home="continue"
    >
      <TwinPoster spaceId={twin.id} hasPoster={Boolean(twin.hasPoster)} width={160} className="h-14 w-14 shrink-0 rounded-lg" />
      <span className="min-w-0 flex-1">
        <span className="block font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--graphite-muted)]">Continue</span>
        <span className="block truncate text-sm font-semibold text-zinc-100">{twin.title}</span>
        <span className="mt-0.5 flex items-center gap-2 text-[11px] text-[var(--graphite-muted)]">
          <TwinStateChip state={state} />
          <span className="truncate">{formatTwinWhen(twin.updatedAt)}</span>
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-[var(--twin360-blue)]">
        {VERB[state] ?? "Open"}
        <ChevronRight className="h-4 w-4" aria-hidden />
      </span>
    </Link>
  );
}
