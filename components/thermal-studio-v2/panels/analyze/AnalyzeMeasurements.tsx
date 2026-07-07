"use client";

import { useState } from "react";
import { spotStats } from "@/lib/thermal/spot-stats";
import { fmtDelta, fmtTemp } from "@/lib/thermal/probe-palettes";
import type { ThermalV2Grid } from "@/components/thermal-studio-v2/lib/grid-api";
import type { ThermalV2Spot } from "@/components/thermal-studio-v2/types";

const KIND_WORD: Record<string, string> = { point: "Point", area: "Area", line: "Line" };

/**
 * Right rail — Measurements accordion, open first (doc §1, Tab 2 + §0.1):
 * badge #, type word, temp, Δ vs reference, rename, delete, set-reference
 * star, group stats, Copy table. Every row here mirrors an on-canvas object.
 */
export function AnalyzeMeasurements({
  spots,
  grid,
  unit,
  referenceId,
  selectedId,
  onSelect,
  onSetReference,
  onRename,
  onDelete,
}: {
  spots: ThermalV2Spot[];
  grid: ThermalV2Grid | null;
  unit: "C" | "F";
  referenceId: string | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onSetReference: (id: string) => void;
  onRename: (id: string, label: string) => void;
  onDelete: (id: string) => void;
}) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  if (!grid) {
    return <div className="p-3 text-xs text-[var(--graphite-muted)]">Open an image to measure it.</div>;
  }
  if (!spots.length) {
    return (
      <div className="p-3 text-xs text-[var(--graphite-muted)]">
        No measurements yet — pick Point, Area, or Line above and click the image.
      </div>
    );
  }

  const values = spots.map((s) => spotStats(s, grid.temps, grid.width, grid.height).value);
  const refIndex = spots.findIndex((s) => s.id === referenceId);
  const refValue = refIndex >= 0 ? values[refIndex] : null;

  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const spread = Math.max(...values) - Math.min(...values);

  async function copyTable() {
    const rows = spots.map((s, i) => {
      const v = values[i];
      const delta = refValue !== null && s.id !== referenceId ? v - refValue : null;
      return [s.label ?? `${KIND_WORD[s.kind ?? "point"]} ${i + 1}`, fmtTemp(v, unit, false), delta !== null ? fmtDelta(delta, unit) : ""].join("\t");
    });
    const text = ["Label\tTemp\tΔ vs reference", ...rows].join("\n");
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // clipboard unavailable — silently ignore, non-critical
    }
  }

  return (
    <div className="flex h-full flex-col gap-2">
      <ul className="flex flex-1 flex-col gap-1 overflow-y-auto">
        {spots.map((s, i) => {
          const v = values[i];
          const isRef = s.id === referenceId;
          const delta = refValue !== null && !isRef ? v - refValue : null;
          return (
            <li
              key={s.id}
              onClick={() => onSelect(s.id)}
              className={`flex cursor-pointer items-center gap-2 rounded-md border px-2 py-1.5 text-[11px] ${
                s.id === selectedId ? "border-[var(--graphite-primary)]" : "border-[var(--mobile-app-card-border)]"
              }`}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSetReference(s.id);
                }}
                title={isRef ? "Reference measurement" : "Set as reference"}
                className={`shrink-0 rounded-sm px-1 text-[9px] font-bold ${
                  isRef ? "bg-[var(--graphite-primary)] text-[var(--graphite-canvas)]" : "bg-black/40 text-[var(--graphite-muted)]"
                }`}
              >
                {i + 1}
              </button>
              <span className="w-10 shrink-0 text-[var(--graphite-muted)]">{KIND_WORD[s.kind ?? "point"]}</span>
              {renamingId === s.id ? (
                <input
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onBlur={() => {
                    onRename(s.id, draft);
                    setRenamingId(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      onRename(s.id, draft);
                      setRenamingId(null);
                    }
                  }}
                  className="min-w-0 flex-1 rounded border border-[var(--mobile-app-card-border)] bg-transparent px-1 text-[var(--graphite-text-header)]"
                />
              ) : (
                <span className="min-w-0 flex-1 truncate text-[var(--graphite-text-header)]">{s.label ?? ""}</span>
              )}
              <span className="shrink-0 font-semibold text-[var(--graphite-text-header)]">{fmtTemp(v, unit)}</span>
              <span className="w-14 shrink-0 text-right text-[var(--graphite-muted)]">
                {isRef ? "ref" : delta !== null ? fmtDelta(delta, unit) : "—"}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setDraft(s.label ?? "");
                  setRenamingId(s.id);
                }}
                title="Rename"
                className="shrink-0 text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)]"
              >
                ✎
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(s.id);
                }}
                title="Delete this measurement"
                className="shrink-0 text-[var(--graphite-muted)] hover:text-red-400"
              >
                ✕
              </button>
            </li>
          );
        })}
      </ul>
      {spots.length > 1 ? (
        <div className="shrink-0 border-t border-[var(--mobile-app-card-border)] pt-2 text-[11px] text-[var(--graphite-muted)]">
          Average {fmtTemp(avg, unit)} · Spread {fmtDelta(spread, unit)}
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => void copyTable()}
        className="shrink-0 rounded-md border border-[var(--mobile-app-card-border)] px-2 py-1 text-[11px] font-medium text-[var(--graphite-text-header)] hover:border-[var(--graphite-primary)]"
      >
        Copy table
      </button>
    </div>
  );
}
