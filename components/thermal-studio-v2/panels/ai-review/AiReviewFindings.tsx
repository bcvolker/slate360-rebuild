"use client";

import { useState } from "react";
import { AiReviewFindingCard } from "@/components/thermal-studio-v2/panels/ai-review/AiReviewFindingCard";
import type { useFindingsReview } from "@/components/thermal-studio-v2/lib/useFindingsReview";
import type { ThermalAnomaly } from "@/lib/thermal/anomaly-describe";

/** Right rail — finding cards + a collapsed, restorable Dismissed group (doc §1, Tab 3). */
export function AiReviewFindings({
  anomalies,
  unit,
  selectedIndex,
  onSelectIndex,
  review,
}: {
  anomalies: ThermalAnomaly[];
  unit: "C" | "F";
  selectedIndex: number | null;
  onSelectIndex: (i: number) => void;
  review: ReturnType<typeof useFindingsReview>;
}) {
  const [dismissedOpen, setDismissedOpen] = useState(false);

  if (!anomalies.length) {
    return <div className="p-2 text-xs text-[var(--graphite-muted)]">No findings on this image yet.</div>;
  }

  const active = anomalies.map((a, i) => ({ a, i })).filter(({ i }) => !review.dismissed.has(i));
  const dismissed = anomalies.map((a, i) => ({ a, i })).filter(({ i }) => review.dismissed.has(i));
  const severeIndexes = anomalies.map((a, i) => ({ a, i })).filter(({ a }) => a.severity === "action").map(({ i }) => i);

  return (
    <div className="flex h-full flex-col gap-2 overflow-y-auto p-1">
      {severeIndexes.length > 1 ? (
        <button
          type="button"
          onClick={() => review.acceptAllSevere(severeIndexes)}
          className="self-start rounded-md border border-[var(--mobile-app-card-border)] px-2 py-1 text-[11px] font-semibold text-[var(--graphite-text-header)] hover:border-[var(--graphite-primary)]"
        >
          Accept all severe ({severeIndexes.length})
        </button>
      ) : null}
      {active.map(({ a, i }) => (
        <AiReviewFindingCard
          key={a.id ?? i}
          anomaly={a}
          index={i}
          unit={unit}
          selected={selectedIndex === i}
          accepted={review.accepted.has(i)}
          editedText={review.edits.get(i) ?? null}
          onSelect={() => onSelectIndex(i)}
          onAccept={() => review.accept(i)}
          onDismiss={() => review.dismiss(i)}
          onEdit={(text) => review.setEdit(i, text)}
        />
      ))}
      {dismissed.length ? (
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => setDismissedOpen((v) => !v)}
            className="flex items-center justify-between px-1 py-1 text-left text-[11px] text-[var(--graphite-muted)]"
          >
            <span>Dismissed ({dismissed.length})</span>
            <span>{dismissedOpen ? "▾" : "▸"}</span>
          </button>
          {dismissedOpen
            ? dismissed.map(({ a, i }) => (
                <div key={a.id ?? i} className="flex items-center justify-between rounded-md border border-[var(--mobile-app-card-border)] px-2 py-1.5 text-[11px] text-[var(--graphite-muted)]">
                  <span className="truncate">
                    #{i + 1} {a.type.replace(/_/g, " ")}
                  </span>
                  <button type="button" onClick={() => review.restore(i)} className="shrink-0 text-[var(--graphite-primary)] underline">
                    Restore
                  </button>
                </div>
              ))
            : null}
        </div>
      ) : null}
    </div>
  );
}
