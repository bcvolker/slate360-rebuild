"use client";

import type { HybridMeasureTool } from "@/hooks/useHybridMeasureTool";
import { formatMeasured } from "@/lib/digital-twin/measurement-math";

const CHIP =
  "min-h-[36px] rounded-lg border border-white/10 px-2 text-[10px] font-semibold uppercase tracking-wide text-white/70 hover:text-white";

export function HybridMeasureHud({
  tool,
  metricAvailable,
}: {
  tool: HybridMeasureTool;
  metricAvailable: boolean;
}) {
  if (!tool.active && tool.rows.length === 0) return null;

  return (
    <div
      className="pointer-events-auto absolute right-3 top-3 z-20 w-[min(100%-1.5rem,18rem)] space-y-2 rounded-xl border border-white/10 bg-[color-mix(in_srgb,var(--graphite-canvas)_88%,transparent)] p-3 backdrop-blur-xl"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <p className="font-mono text-[10px] uppercase tracking-wide text-white/50">Measure</p>
      {!metricAvailable ? (
        <p className="text-[11px] leading-relaxed text-zinc-400">
          Metric measurement unavailable. Raycasts require a registered LiDAR/TSDF mesh — Gaussian
          splats are appearance only.
        </p>
      ) : null}

      {tool.active ? (
        <>
          <div className="flex flex-wrap gap-1">
            {tool.kinds.map((k) => (
              <button
                key={k.id}
                type="button"
                onClick={() => tool.setKind(k.id)}
                className={`${CHIP} ${tool.kind === k.id ? "border-[var(--accent-border-blue)] text-[var(--twin360-blue)]" : ""}`}
              >
                {k.label}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            {(["m", "mm", "ft", "in"] as const).map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => tool.setUnit(u)}
                className={`${CHIP} ${tool.unit === u ? "text-[var(--twin360-blue)]" : ""}`}
              >
                {u}
              </button>
            ))}
            <button
              type="button"
              onClick={() => tool.setScope(tool.scope === "project" ? "epoch" : "project")}
              className={CHIP}
            >
              {tool.scope === "project" ? "Project" : "This scan"}
            </button>
          </div>
          <p className="text-[11px] text-zinc-400">
            {tool.draft.length} point{tool.draft.length === 1 ? "" : "s"} · tap the metric surface.
            Undo last, then Finish.
          </p>
          <div className="flex flex-wrap gap-1">
            <button type="button" className={CHIP} onClick={tool.undo} disabled={tool.draft.length === 0}>
              Undo
            </button>
            <button type="button" className={CHIP} onClick={tool.cancel}>
              Cancel
            </button>
            <button
              type="button"
              className={`${CHIP} text-[var(--twin360-blue)]`}
              onClick={() => tool.finish()}
              disabled={!tool.canFinish}
            >
              Finish
            </button>
          </div>
        </>
      ) : null}

      {tool.error ? <p className="text-[11px] text-red-300">{tool.error}</p> : null}

      <ul className="max-h-40 space-y-1 overflow-y-auto">
        {tool.rows.map((m) => (
          <li key={m.id} className="rounded-lg border border-white/10 px-2 py-1.5 text-[11px] text-zinc-200">
            <div className="flex items-center justify-between gap-2">
              <input
                aria-label="Rename measurement"
                value={m.label}
                onChange={(e) => tool.rename(m.id, e.target.value)}
                className="min-w-0 flex-1 bg-transparent text-[11px] font-medium outline-none"
              />
              <span className="shrink-0 font-mono text-[10px] text-[var(--twin360-blue)]">
                {formatMeasured(m.value, m.unit, m.kind)}
              </span>
            </div>
            <div className="mt-1 flex gap-2 text-[10px] uppercase tracking-wide text-white/40">
              <button type="button" onClick={() => tool.toggleHidden(m.id)}>
                {m.hidden ? "Show" : "Hide"}
              </button>
              {tool.pendingDeleteId === m.id ? (
                <button type="button" className="text-red-300" onClick={() => tool.remove(m.id)}>
                  Confirm delete
                </button>
              ) : (
                <button type="button" onClick={() => tool.setPendingDeleteId(m.id)}>
                  Delete
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
