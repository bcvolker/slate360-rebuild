"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ThermalProbeViewer,
  type ThermalProbeGrid,
  type ProbeSpot,
  type ProbeTuning,
} from "@/components/ops/thermal/ThermalProbeViewer";
import type { ThermalAnomaly } from "@/lib/thermal/anomaly-describe";

export type StudioCapture = {
  id: string;
  filename: string;
  previewUrl?: string | null;
  qualityMetrics?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  anomalies?: unknown[] | null;
};

type Props = {
  captures: StudioCapture[];
  /** Standards from the active report template — drives finding descriptions. */
  standards?: string[];
  /** Controlled selection (shared across studio stages). Falls back to internal. */
  selectedId?: string;
  onSelect?: (id: string) => void;
  /** Loads the per-pixel grid for a capture. Defaults to the ops grid API. */
  loadGrid?: (captureId: string) => Promise<ThermalProbeGrid | null>;
  /** Persist user spots for a capture. Defaults to the ops capture PATCH API. */
  saveSpots?: (captureId: string, spots: ProbeSpot[]) => void;
  /** Persist per-image tuning. Defaults to the ops capture PATCH API. */
  saveTuning?: (captureId: string, tuning: ProbeTuning) => void;
};

function defaultSaveSpots(captureId: string, spots: ProbeSpot[]): void {
  fetch(`/api/ops/thermal/captures/${captureId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ spots }),
  }).catch(() => {});
}

function defaultSaveTuning(captureId: string, tuning: ProbeTuning): void {
  fetch(`/api/ops/thermal/captures/${captureId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tuning }),
  }).catch(() => {});
}

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

export function ThermalStudioWorkView({
  captures,
  standards,
  selectedId: controlledId,
  onSelect,
  loadGrid = defaultLoadGrid,
  saveSpots = defaultSaveSpots,
  saveTuning = defaultSaveTuning,
}: Props) {
  const [internalId, setInternalId] = useState<string | null>(captures[0]?.id ?? null);
  const selectedId = controlledId ?? internalId;
  const selectCapture = useCallback(
    (id: string) => (onSelect ? onSelect(id) : setInternalId(id)),
    [onSelect],
  );
  const [grid, setGrid] = useState<ThermalProbeGrid | null>(null);
  const [gridState, setGridState] = useState<"loading" | "ready" | "none">("loading");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tuningTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [flaggedOnly, setFlaggedOnly] = useState(false);

  const flaggedCount = captures.filter((c) => (c.anomalies?.length ?? 0) > 0).length;
  const visibleCaptures = flaggedOnly
    ? captures.filter((c) => (c.anomalies?.length ?? 0) > 0)
    : captures;

  const selected = captures.find((c) => c.id === selectedId) ?? captures[0] ?? null;

  const selectedMeta = (selected?.metadata ?? {}) as Record<string, unknown>;
  const anomalies = (selected?.anomalies ?? []) as ThermalAnomaly[];
  const initialSpots = (selectedMeta.spots ?? []) as ProbeSpot[];
  const initialTuning = (selectedMeta.tuning ?? null) as ProbeTuning | null;

  const onSpotsChange = useCallback(
    (spots: ProbeSpot[]) => {
      if (!selected) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => saveSpots(selected.id, spots), 600);
    },
    [selected, saveSpots],
  );

  const onTuningChange = useCallback(
    (tuning: ProbeTuning) => {
      if (!selected) return;
      if (tuningTimer.current) clearTimeout(tuningTimer.current);
      tuningTimer.current = setTimeout(() => saveTuning(selected.id, tuning), 600);
    },
    [selected, saveTuning],
  );

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
    <div className="grid h-full min-h-0 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
      {/* Main: large viewer + filmstrip */}
      <section className="flex min-h-0 min-w-0 flex-col gap-3">
        <div className="min-h-0 flex-1 rounded-2xl border border-[var(--mobile-app-card-border)] p-3">
          {gridState === "ready" && grid ? (
            <ThermalProbeViewer
              grid={grid}
              title={selected?.filename}
              anomalies={anomalies}
              standards={standards}
              initialSpots={initialSpots}
              onSpotsChange={onSpotsChange}
              initialTuning={initialTuning}
              onTuningChange={onTuningChange}
            />
          ) : gridState === "loading" ? (
            <div className="flex h-full min-h-[260px] items-center justify-center text-sm text-[var(--graphite-muted)]">
              Loading temperature data…
            </div>
          ) : (
            <div className="flex h-full min-h-[260px] flex-col items-center justify-center gap-3 p-4 text-center">
              {selected?.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selected.previewUrl}
                  alt={selected.filename}
                  className="max-h-[55%] rounded-lg border border-[var(--mobile-app-card-border)] object-contain"
                />
              ) : null}
              <div className="max-w-md">
                <p className="text-sm font-semibold text-[var(--graphite-text-header)]">
                  Per-pixel probing &amp; tuning not available yet
                </p>
                <p className="mt-1 text-xs text-[var(--graphite-muted)]">
                  Emissivity, spots, and temperature readouts unlock once this capture has been decoded.
                  Run <strong>Process images</strong> from the <strong>Library</strong> tab, then return here.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Filmstrip header: navigation + flagged filter */}
        <div className="flex shrink-0 items-center justify-between">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--graphite-muted)]">
            {visibleCaptures.length} image{visibleCaptures.length === 1 ? "" : "s"}
          </p>
          <button
            type="button"
            onClick={() => setFlaggedOnly((v) => !v)}
            disabled={flaggedCount === 0}
            className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold transition-colors disabled:opacity-40 ${
              flaggedOnly
                ? "border-[#fb923c]/50 bg-[#fb923c]/15 text-[#fdba74]"
                : "border-[var(--mobile-app-card-border)] text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)]"
            }`}
            title="Show only captures with detected anomalies"
          >
            Flagged ({flaggedCount})
          </button>
        </div>

        {/* Horizontal filmstrip */}
        <div className="flex shrink-0 snap-x gap-2 overflow-x-auto rounded-2xl border border-[var(--mobile-app-card-border)] p-2">
          {visibleCaptures.map((c) => {
            const anomalyCount = c.anomalies?.length ?? 0;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => selectCapture(c.id)}
                className={`relative h-20 w-28 shrink-0 snap-start overflow-hidden rounded-lg border bg-[#111827] ${
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
                {anomalyCount > 0 ? (
                  <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#fb923c] px-1 text-[9px] font-bold text-black">
                    {anomalyCount}
                  </span>
                ) : null}
              </button>
            );
          })}
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
            <MetaRow label="Camera" value={String(q.sensor_make ?? "—")} />
            <MetaRow label="Sensor" value={String(q.sensor_model ?? q.parser_id ?? "—")} />
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
