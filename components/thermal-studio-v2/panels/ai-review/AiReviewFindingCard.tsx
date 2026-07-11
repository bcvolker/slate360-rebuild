"use client";

import { useState } from "react";
import { severityChipClass, severityLabel } from "@/lib/thermal/severity-labels";
import { fmtTemp } from "@/lib/thermal/probe-palettes";
import type { ThermalAnomaly } from "@/lib/thermal/anomaly-describe";

/** One AI-proposed finding: Accept ✓ / Edit ✎ / Dismiss ✕ — never auto-committed (doc §0.1). */
export function AiReviewFindingCard({
  anomaly,
  index,
  unit,
  selected,
  accepted,
  editedText,
  onSelect,
  onAccept,
  onDismiss,
  onEdit,
}: {
  anomaly: ThermalAnomaly;
  index: number;
  unit: "C" | "F";
  selected: boolean;
  accepted: boolean;
  editedText: string | null;
  onSelect: () => void;
  onAccept: () => void;
  onDismiss: () => void;
  onEdit: (text: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const noteText = editedText ?? anomaly.observation ?? "";

  return (
    <div
      onClick={onSelect}
      className={`flex cursor-pointer flex-col gap-2 rounded-md border p-2 text-xs transition-colors ${
        selected ? "border-[var(--graphite-primary)]" : "border-[var(--mobile-app-card-border)]"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-[var(--graphite-text-header)]">
          #{index + 1} {anomaly.type.replace(/_/g, " ")}
        </span>
        <span className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${severityChipClass(anomaly.severity)}`}>
          {severityLabel(anomaly.severity)}
        </span>
      </div>
      <div className="text-[11px] text-[var(--graphite-muted)]">
        {typeof anomaly.temp_c === "number" ? `Peak ${fmtTemp(anomaly.temp_c, unit)}` : null}
        {typeof anomaly.delta_c === "number" ? ` · Δ ${fmtTemp(anomaly.delta_c, unit, false)}` : null}
      </div>
      {editing ? (
        <textarea
          value={noteText}
          onChange={(e) => onEdit(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          rows={3}
          className="rounded-md border border-[var(--mobile-app-card-border)] bg-transparent px-2 py-1 text-[11px] text-[var(--graphite-text-header)] focus:border-[var(--graphite-primary)] focus:outline-none"
        />
      ) : noteText ? (
        <p className="text-[11px] text-[var(--graphite-text-header)]">{noteText}</p>
      ) : (
        <p className="text-[11px] italic text-[var(--graphite-muted)]">No AI explanation yet — run AI review on this image.</p>
      )}
      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={onAccept}
          className={`rounded-md border px-2 py-1 text-[11px] font-semibold ${
            accepted
              ? "border-[var(--graphite-primary)] text-[var(--graphite-text-header)]"
              : "border-[var(--mobile-app-card-border)] text-[var(--graphite-muted)] hover:border-[var(--graphite-primary)]"
          }`}
        >
          Accept ✓
        </button>
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          className="rounded-md border border-[var(--mobile-app-card-border)] px-2 py-1 text-[11px] font-semibold text-[var(--graphite-muted)] hover:border-[var(--graphite-primary)]"
        >
          Edit ✎
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-md border border-[var(--mobile-app-card-border)] px-2 py-1 text-[11px] font-semibold text-[var(--graphite-muted)] hover:border-red-500/60 hover:text-red-400"
        >
          Dismiss ✕
        </button>
      </div>
    </div>
  );
}
