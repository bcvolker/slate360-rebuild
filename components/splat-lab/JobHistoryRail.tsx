"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { stageDot } from "@/components/splat-lab/StageCard";
import type { SplatLabJob } from "@/lib/splat-lab/job-store";

export function JobHistoryRail({ activeId, onSelect }: { activeId: string | null; onSelect: (id: string) => void }) {
  const [jobs, setJobs] = useState<SplatLabJob[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/splat-lab/jobs", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setJobs((d.jobs ?? []) as SplatLabJob[]))
      .catch(() => undefined);
  }, [activeId]);

  if (jobs.length === 0) return null;

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] backdrop-blur">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between p-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--graphite-muted)]">
        Jobs ({jobs.length}) <span>{open ? "▾" : "▸"}</span>
      </button>
      {open ? (
        <div className="max-h-64 space-y-1 overflow-y-auto border-t border-white/10 p-2">
          {jobs.map((j) => (
            <button
              key={j.id}
              onClick={() => onSelect(j.id)}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition",
                j.id === activeId ? "bg-[color-mix(in_srgb,var(--twin360-blue)_18%,transparent)] text-white" : "text-[var(--graphite-text-body)] hover:bg-white/[0.06]",
              )}
            >
              <span className={cn("size-1.5 rounded-full", stageDot(j.status))} />
              <span className="truncate font-mono text-[10px]">{j.id}</span>
              <span className="ml-auto font-mono text-[9px] text-[var(--graphite-muted)]">
                {new Date(j.createdAt).toLocaleString()}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
