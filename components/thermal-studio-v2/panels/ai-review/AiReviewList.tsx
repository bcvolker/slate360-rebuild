"use client";

import { severityLabel, severityRank } from "@/lib/thermal/severity-labels";
import type { ThermalV2Capture } from "@/components/thermal-studio-v2/types";

type Filter = "all" | "action" | "watch" | "info";

/** Left rail — severity-sorted images with detections (doc §1, Tab 3). */
export function AiReviewList({
  captures,
  activeId,
  onOpen,
  filter,
  onFilterChange,
}: {
  captures: ThermalV2Capture[];
  activeId: string | null;
  onOpen: (id: string) => void;
  filter: Filter;
  onFilterChange: (f: Filter) => void;
}) {
  const withFindings = captures.filter((c) => (c.anomalies?.length ?? 0) > 0);
  const filtered = filter === "all" ? withFindings : withFindings.filter((c) => c.anomalies?.some((a) => (a as { severity?: string }).severity === filter));
  const sorted = [...filtered].sort((a, b) => {
    const rankA = Math.min(...(a.anomalies ?? []).map((x) => severityRank((x as { severity?: string }).severity ?? "info")));
    const rankB = Math.min(...(b.anomalies ?? []).map((x) => severityRank((x as { severity?: string }).severity ?? "info")));
    return rankA - rankB;
  });

  const FILTERS: { id: Filter; label: string }[] = [
    { id: "all", label: `All (${withFindings.length})` },
    { id: "action", label: severityLabel("action") },
    { id: "watch", label: severityLabel("watch") },
    { id: "info", label: severityLabel("info") },
  ];

  return (
    <div className="flex h-full flex-col gap-2 overflow-hidden">
      <div className="flex shrink-0 flex-wrap gap-1">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => onFilterChange(f.id)}
            className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
              filter === f.id
                ? "bg-[color-mix(in_srgb,var(--graphite-primary)_18%,transparent)] text-[var(--graphite-text-header)]"
                : "text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)]"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div data-testid="ai-review-detections-list" className="min-h-0 flex-1 overflow-y-auto">
        {sorted.length === 0 ? (
          <div className="p-2 text-xs text-[var(--graphite-muted)]">No detections yet — run AI on some images first.</div>
        ) : (
          sorted.map((c) => {
            const count = c.anomalies?.length ?? 0;
            const worst = Math.min(...(c.anomalies ?? []).map((x) => severityRank((x as { severity?: string }).severity ?? "info")));
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onOpen(c.id)}
                className={`flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors ${
                  c.id === activeId
                    ? "bg-[color-mix(in_srgb,var(--graphite-primary)_14%,transparent)] text-[var(--graphite-text-header)]"
                    : "text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)]"
                }`}
              >
                <span className="truncate">{c.filename}</span>
                <span
                  className={`shrink-0 rounded px-1 text-[9px] font-bold ${
                    worst === 0 ? "bg-red-500/20 text-red-400" : worst === 1 ? "bg-sky-400/20 text-sky-300" : "bg-black/40 text-[var(--graphite-muted)]"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
