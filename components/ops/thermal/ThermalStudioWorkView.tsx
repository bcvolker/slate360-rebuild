"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  /** Persist per-image operator findings. Defaults to the ops capture PATCH API. */
  saveFindings?: (captureId: string, findings: string) => void;
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

function defaultSaveFindings(captureId: string, findings: string): void {
  fetch(`/api/ops/thermal/captures/${captureId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ findings }),
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
  saveFindings = defaultSaveFindings,
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
  const findingsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [compareVisual, setCompareVisual] = useState(false);
  const [findingsText, setFindingsText] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [draftNote, setDraftNote] = useState<string | null>(null);

  const flaggedCount = captures.filter((c) => (c.anomalies?.length ?? 0) > 0).length;
  const visibleCaptures = flaggedOnly
    ? captures.filter((c) => (c.anomalies?.length ?? 0) > 0)
    : captures;

  const selected = captures.find((c) => c.id === selectedId) ?? captures[0] ?? null;

  const selectedMeta = (selected?.metadata ?? {}) as Record<string, unknown>;
  const anomalies = (selected?.anomalies ?? []) as ThermalAnomaly[];
  // Memoize per-capture so unrelated re-renders (e.g. async grid load) don't hand
  // the viewer a fresh array identity and wipe the spots the user just placed.
  const initialSpots = useMemo(
    () => (selectedMeta.spots ?? []) as ProbeSpot[],
    [selected?.id], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const initialTuning = useMemo(
    () => (selectedMeta.tuning ?? null) as ProbeTuning | null,
    [selected?.id], // eslint-disable-line react-hooks/exhaustive-deps
  );

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

  // Operator findings narrative — reset when the selected capture changes.
  useEffect(() => {
    setFindingsText(typeof selectedMeta.findings === "string" ? selectedMeta.findings : "");
  }, [selected?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const onFindingsChange = useCallback(
    (text: string) => {
      setFindingsText(text);
      if (!selected) return;
      if (findingsTimer.current) clearTimeout(findingsTimer.current);
      findingsTimer.current = setTimeout(() => saveFindings(selected.id, text), 700);
    },
    [selected, saveFindings],
  );

  const anomalyCountSel = (selected?.anomalies?.length ?? 0);
  async function draftFindings() {
    if (!selected) return;
    setDrafting(true);
    setDraftNote(null);
    try {
      const res = await fetch(`/api/ops/thermal/captures/${selected.id}/draft-findings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ standards: standards ?? [] }),
      });
      const json = await res.json();
      const draft = (json.data?.draft ?? json.draft ?? "").trim();
      if (!res.ok) throw new Error(json.error ?? "Draft failed");
      if (draft) {
        onFindingsChange(draft);
        setDraftNote("AI draft inserted — review and edit before issuing.");
      } else {
        setDraftNote(json.data?.note ?? json.note ?? "No draft produced.");
      }
    } catch (err) {
      setDraftNote(err instanceof Error ? err.message : "Draft failed");
    } finally {
      setDrafting(false);
    }
  }

  // Paired visual photo (from S2 auto-pairing) for the comparison toggle.
  const pairedVisual = useMemo(() => {
    const pairId = selectedMeta.visual_pair_id;
    if (typeof pairId !== "string") return null;
    return captures.find((c) => c.id === pairId) ?? null;
  }, [captures, selectedMeta.visual_pair_id]);

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

  // Keyboard shortcuts: ←/→ navigate filmstrip, "c" toggles visual compare.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const list = visibleCaptures;
      const idx = list.findIndex((c) => c.id === selected?.id);
      if (e.key === "ArrowRight" && idx < list.length - 1) { e.preventDefault(); selectCapture(list[idx + 1].id); }
      else if (e.key === "ArrowLeft" && idx > 0) { e.preventDefault(); selectCapture(list[idx - 1].id); }
      else if (e.key.toLowerCase() === "c" && pairedVisual) { setCompareVisual((v) => !v); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visibleCaptures, selected?.id, selectCapture, pairedVisual]);

  const q = (selected?.qualityMetrics ?? {}) as Record<string, unknown>;
  const meta = (selected?.metadata ?? {}) as Record<string, unknown>;
  const gps = (meta.gps ?? meta.gps_position ?? {}) as Record<string, unknown>;

  return (
    <div className="grid h-full min-h-0 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
      {/* Main: large viewer + filmstrip */}
      <section className="flex min-h-0 min-w-0 flex-col gap-3">
        <div
          className={`grid min-h-0 flex-1 gap-3 ${
            compareVisual && pairedVisual ? "grid-cols-2" : "grid-cols-1"
          }`}
        >
        <div className="min-h-0 rounded-2xl border border-[var(--mobile-app-card-border)] shadow-[var(--mobile-app-card-shadow)] p-3">
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

        {compareVisual && pairedVisual ? (
          <div className="flex min-h-0 flex-col rounded-2xl border border-[var(--mobile-app-card-border)] shadow-[var(--mobile-app-card-shadow)] p-3">
            <p className="shrink-0 pb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--graphite-muted)]">
              Visual · {pairedVisual.filename}
            </p>
            <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden">
              {pairedVisual.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={pairedVisual.previewUrl} alt={pairedVisual.filename} className="max-h-full max-w-full rounded-lg object-contain" />
              ) : (
                <span className="text-xs text-[var(--graphite-muted)]">No preview for the paired visual.</span>
              )}
            </div>
          </div>
        ) : null}
        </div>

        {/* Filmstrip header: navigation + flagged filter */}
        <div className="flex shrink-0 items-center justify-between gap-2">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--graphite-muted)]">
            {visibleCaptures.length} image{visibleCaptures.length === 1 ? "" : "s"}
          </p>
          {pairedVisual ? (
            <button
              type="button"
              onClick={() => setCompareVisual((v) => !v)}
              className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold transition-colors ${
                compareVisual
                  ? "border-[color-mix(in_srgb,var(--graphite-primary)_50%,transparent)] bg-[color-mix(in_srgb,var(--graphite-primary)_16%,transparent)] text-[var(--graphite-text-header)]"
                  : "border-[var(--mobile-app-card-border)] text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)]"
              }`}
              title="Show the paired visual photo side by side (shortcut: c)"
            >
              Compare visual
            </button>
          ) : null}
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
        <div className="flex shrink-0 snap-x gap-2 overflow-x-auto rounded-2xl border border-[var(--mobile-app-card-border)] shadow-[var(--mobile-app-card-shadow)] p-2">
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
      <aside className="min-h-0 space-y-3 overflow-y-auto rounded-2xl border border-[var(--mobile-app-card-border)] shadow-[var(--mobile-app-card-shadow)] p-3">
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

        {selected ? (
          <div className="border-t border-[var(--mobile-app-card-border)] pt-3">
            <div className="flex items-center justify-between">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--graphite-muted)]">
                Findings
              </p>
              <button
                type="button"
                onClick={draftFindings}
                disabled={drafting || anomalyCountSel === 0}
                title={anomalyCountSel === 0 ? "No detected anomalies to draft from" : "Draft findings from detected anomalies (AI)"}
                className="rounded border border-[var(--mobile-app-card-border)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)] disabled:opacity-40"
              >
                {drafting ? "Drafting…" : "Draft (AI)"}
              </button>
            </div>
            <textarea
              value={findingsText}
              onChange={(e) => onFindingsChange(e.target.value)}
              rows={5}
              placeholder="Operator findings for this image — what the thermal signature indicates, severity, and recommended action."
              className="mt-2 block w-full rounded-xl border border-[var(--mobile-app-card-border)] bg-[#111827] px-3 py-2 text-xs text-white"
            />
            <p className="mt-1 text-[10px] text-[var(--graphite-muted)]">
              {draftNote ?? "Saved per image · included in the report."}
            </p>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
