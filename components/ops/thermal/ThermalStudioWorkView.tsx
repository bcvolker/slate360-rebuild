"use client";

import { useCallback, useEffect, useState } from "react";
import { ThermalProbeViewer, type ThermalProbeGrid } from "@/components/ops/thermal/ThermalProbeViewer";

export type StudioCapture = {
  id: string;
  filename: string;
  previewUrl?: string | null;
  qualityMetrics?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
};

type Props = {
  captures: StudioCapture[];
  /** Loads the per-pixel grid for a capture. Defaults to the ops grid API. */
  loadGrid?: (captureId: string) => Promise<ThermalProbeGrid | null>;
};

function defaultLoadGrid(captureId: string): Promise<ThermalProbeGrid | null> {
  return fetch(`/api/ops/thermal/captures/${captureId}/grid`)
    .then(async (res) => {
      if (!res.ok) return null;
      const json = await res.json();
      return (json.data ?? json) as ThermalProbeGrid;
    })
    .catch(() => null);
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1 text-sm">
      <span className="text-[var(--graphite-muted)]">{label}</span>
      <span className="text-right font-medium text-[var(--graphite-text-body)]">{value}</span>
    </div>
  );
}

function num(v: unknown, suffix = ""): string {
  return typeof v === "number" && Number.isFinite(v) ? `${v.toFixed(1)}${suffix}` : "—";
}

export function ThermalStudioWorkView({ captures, loadGrid = defaultLoadGrid }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(captures[0]?.id ?? null);
  const [grid, setGrid] = useState<ThermalProbeGrid | null>(null);
  const [gridState, setGridState] = useState<"loading" | "ready" | "none">("loading");

  const selected = captures.find((c) => c.id === selectedId) ?? captures[0] ?? null;

  const load = useCallback(
    (id: string) => {
      setGrid(null);
      setGridState("loading");
      loadGrid(id).then((g) => {
        setGrid(g);
        setGridState(g ? "ready" : "none");
      });
    },
    [loadGrid],
  );

  useEffect(() => {
    if (selected) load(selected.id);
  }, [selected, load]);

  const q = (selected?.qualityMetrics ?? {}) as Record<string, unknown>;
  const meta = (selected?.metadata ?? {}) as Record<string, unknown>;
  const gps = (meta.gps ?? meta.gps_position ?? {}) as Record<string, unknown>;

  return (
    <div className="grid h-full min-h-0 grid-cols-1 gap-4 lg:grid-cols-[220px_minmax(0,1fr)_260px]">
      {/* Left: file management */}
      <aside className="min-h-0 overflow-y-auto rounded-2xl border border-[var(--mobile-app-card-border)] p-2">
        <p className="px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--graphite-muted)]">
          Captures ({captures.length})
        </p>
        <ul className="space-y-1">
          {captures.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => setSelectedId(c.id)}
                className={`w-full truncate rounded-lg px-2 py-1.5 text-left text-xs transition-colors ${
                  selected?.id === c.id
                    ? "bg-[color-mix(in_srgb,var(--graphite-primary)_14%,transparent)] text-[var(--graphite-text-header)]"
                    : "text-[var(--graphite-muted)] hover:bg-[color-mix(in_srgb,var(--graphite-primary)_6%,transparent)]"
                }`}
              >
                {c.filename}
              </button>
            </li>
          ))}
        </ul>
      </aside>

      {/* Center: viewer + filmstrip */}
      <section className="flex min-h-0 min-w-0 flex-col gap-3">
        <div className="min-h-0 flex-1 rounded-2xl border border-[var(--mobile-app-card-border)] p-3">
          {gridState === "ready" && grid ? (
            <ThermalProbeViewer grid={grid} title={selected?.filename} />
          ) : (
            <div className="flex h-full min-h-[260px] items-center justify-center text-sm text-[var(--graphite-muted)]">
              {gridState === "loading"
                ? "Loading temperature data…"
                : "No per-pixel grid for this capture (run extraction, or use a radiometric file)."}
            </div>
          )}
        </div>

        {/* Horizontal filmstrip */}
        <div className="flex shrink-0 snap-x gap-2 overflow-x-auto rounded-2xl border border-[var(--mobile-app-card-border)] p-2">
          {captures.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedId(c.id)}
              className={`relative h-16 w-20 shrink-0 snap-start overflow-hidden rounded-lg border bg-[#111827] ${
                selected?.id === c.id
                  ? "border-[color-mix(in_srgb,var(--graphite-primary)_50%,transparent)]"
                  : "border-[var(--mobile-app-card-border)]"
              }`}
              title={c.filename}
            >
              {c.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.previewUrl} alt={c.filename} className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full items-center justify-center px-1 text-center text-[8px] text-[var(--graphite-muted)]">
                  {c.filename}
                </span>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* Right: per-photo data */}
      <aside className="min-h-0 space-y-3 overflow-y-auto rounded-2xl border border-[var(--mobile-app-card-border)] p-3">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--graphite-muted)]">
          Photo data
        </p>
        {selected ? (
          <div>
            <MetaRow label="File" value={selected.filename} />
            <MetaRow label="Max temp" value={num(grid?.maxC ?? q.max_temp_c, "°C")} />
            <MetaRow label="Min temp" value={num(grid?.minC ?? q.min_temp_c, "°C")} />
            <MetaRow label="Avg temp" value={num(q.avg_temp_c, "°C")} />
            <MetaRow label="Emissivity" value={num(grid?.emissivity ?? q.emissivity_used)} />
            <MetaRow label="Reflected" value={num(meta.reflected_temp_c, "°C")} />
            <MetaRow label="Humidity" value={num(meta.humidity_pct, "%")} />
            <MetaRow label="Ambient" value={num(meta.ambient_temp_c, "°C")} />
            <MetaRow
              label="GPS"
              value={
                gps.lat != null && gps.lon != null
                  ? `${Number(gps.lat).toFixed(4)}, ${Number(gps.lon).toFixed(4)}`
                  : "—"
              }
            />
            <MetaRow label="Radiometric" value={q.is_radiometric ? "Yes" : "No / pending"} />
          </div>
        ) : (
          <p className="text-sm text-[var(--graphite-muted)]">Select a capture.</p>
        )}
      </aside>
    </div>
  );
}
