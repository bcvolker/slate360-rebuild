"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronRight, MoreHorizontal, Scan } from "lucide-react";

import { TwinNewScanSheet } from "@/components/digital-twin/home/TwinNewScanSheet";
import { TwinPoster } from "@/components/digital-twin/home/TwinPoster";
import { TwinStateChip } from "@/components/digital-twin/home/TwinStateChip";
import { TwinRowActionsSheet } from "@/components/digital-twin/project/TwinRowActionsSheet";
import {
  groupTwinsByDay,
  hubStateOf,
  matchesTwinListFilter,
  type TwinListFilter,
} from "@/lib/digital-twin/twin-hub-state";
import type { HubTwin, HubTwinProject } from "@/lib/types/digital-twin-hub";

type Props = {
  projectId: string | null;
  projectName: string;
  twins: HubTwin[];
  projects: HubTwinProject[];
};

const FILTERS: { id: TwinListFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "saved", label: "Saved" },
  { id: "ready", label: "Ready" },
];

function timeOf(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

/**
 * S2 Project twins: the twins of one project (or the unfiled Quick Scans),
 * grouped by day, filtered All · Saved · Ready, each row with Rename / Move /
 * Delete, and "Scan into this project" pinned at the bottom.
 */
export function TwinProjectScreen({ projectId, projectName, twins, projects }: Props) {
  const [filter, setFilter] = useState<TwinListFilter>("all");
  const [actionTwin, setActionTwin] = useState<HubTwin | null>(null);
  const [scanOpen, setScanOpen] = useState(false);

  const visible = useMemo(() => twins.filter((t) => matchesTwinListFilter(hubStateOf(t), filter)), [filter, twins]);
  const groups = useMemo(() => groupTwinsByDay(visible), [visible]);

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-2xl flex-col gap-3 px-4 pt-3 pb-3">
      <div className="flex shrink-0 items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--graphite-muted)]">Project</p>
          <h1 className="truncate text-lg font-bold text-zinc-100">{projectName}</h1>
        </div>
        <span className="shrink-0 font-mono text-[10px] uppercase tracking-wide text-[var(--graphite-muted)]">
          {twins.length} twin{twins.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="flex shrink-0 gap-1 rounded-xl border border-white/10 bg-white/[0.04] p-1" role="tablist">
        {FILTERS.map((f) => {
          const active = f.id === filter;
          return (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(f.id)}
              className={`min-h-[40px] flex-1 rounded-lg text-xs font-semibold uppercase tracking-wide transition ${
                active ? "bg-[var(--twin360-blue)] text-[var(--graphite-canvas)]" : "text-[var(--graphite-muted)]"
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {groups.length === 0 ? (
          <p className="rounded-xl border border-white/10 bg-white/[0.04] p-4 text-sm text-[var(--graphite-muted)]">
            {filter === "all" ? "No twins in this project yet." : `No ${filter} twins here.`}
          </p>
        ) : (
          <div className="flex flex-col gap-3 pb-2">
            {groups.map((group) => (
              <div key={group.label} className="flex flex-col gap-2" data-twin-day-group={group.label}>
                <p className="px-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--graphite-muted)]">{group.label}</p>
                {group.twins.map((twin) => (
                  <div
                    key={twin.id}
                    className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] p-2 pr-1"
                    data-twin-row={twin.id}
                  >
                    <Link href={`/digital-twin/twins/${twin.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                      <TwinPoster spaceId={twin.id} hasPoster={Boolean(twin.hasPoster)} width={160} className="h-14 w-14 shrink-0 rounded-lg" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-zinc-100">{twin.title}</span>
                        <span className="mt-1 flex items-center gap-2 text-[11px] text-[var(--graphite-muted)]">
                          <TwinStateChip state={hubStateOf(twin)} />
                          <span>{timeOf(twin.updatedAt)}</span>
                        </span>
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-white/25" aria-hidden />
                    </Link>
                    <button
                      type="button"
                      aria-label={`Actions for ${twin.title}`}
                      onClick={() => setActionTwin(twin)}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[var(--graphite-muted)] hover:text-zinc-100"
                    >
                      <MoreHorizontal className="h-5 w-5" aria-hidden />
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => setScanOpen(true)}
        className="flex min-h-[56px] w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--twin360-blue)] text-base font-bold text-[var(--graphite-canvas)] transition active:scale-[0.99]"
        data-twin-project="scan"
      >
        <Scan className="h-6 w-6" strokeWidth={2} aria-hidden />
        {projectId ? "Scan into this project" : "Quick scan"}
      </button>

      <TwinRowActionsSheet twin={actionTwin} onClose={() => setActionTwin(null)} projects={projects} />
      <TwinNewScanSheet open={scanOpen} onOpenChange={setScanOpen} projects={projects} preselectProjectId={projectId} />
    </div>
  );
}
