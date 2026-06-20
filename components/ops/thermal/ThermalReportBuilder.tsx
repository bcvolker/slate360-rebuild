"use client";

import { useMemo, useState } from "react";
import { ThermalReportPanel } from "@/components/ops/thermal/ThermalReportPanel";
import type { StudioCapture } from "@/components/ops/thermal/ThermalStudioWorkView";

type Conditions = {
  ambient_c?: number | string;
  wind_mph?: number | string;
  focal_mm?: number | string;
  operator_notes?: string;
};

/**
 * Report Builder — order the curated report set, capture site conditions, then
 * pick a template / signature and generate. The visual template gallery + live
 * section preview land in Slice 4; this is the ordered-set + conditions core.
 */
export function ThermalReportBuilder({
  sessionId,
  captures,
  reportOrder,
  onReorder,
  onRemove,
  initialTemplateId,
  initialSignature,
  initialConditions,
}: {
  sessionId: string;
  captures: StudioCapture[];
  reportOrder: string[];
  onReorder: (idx: number, dir: -1 | 1) => void;
  onRemove: (id: string) => void;
  initialTemplateId?: string | null;
  initialSignature?: string | null;
  initialConditions?: Record<string, unknown> | null;
}) {
  const byId = useMemo(() => new Map(captures.map((c) => [c.id, c])), [captures]);
  const order = reportOrder;
  const [conditions, setConditions] = useState<Conditions>((initialConditions ?? {}) as Conditions);
  const [savedNote, setSavedNote] = useState<string | null>(null);

  function setCond(patch: Conditions) {
    setConditions((prev) => ({ ...prev, ...patch }));
  }
  function saveConditions() {
    const clean: Conditions = {
      ambient_c: conditions.ambient_c === "" ? undefined : Number(conditions.ambient_c),
      wind_mph: conditions.wind_mph === "" ? undefined : Number(conditions.wind_mph),
      focal_mm: conditions.focal_mm === "" ? undefined : Number(conditions.focal_mm),
      operator_notes: conditions.operator_notes,
    };
    fetch(`/api/ops/thermal/sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ metadata: { conditions: clean } }),
    })
      .then(() => { setSavedNote("Conditions saved."); setTimeout(() => setSavedNote(null), 2500); })
      .catch(() => setSavedNote("Could not save conditions."));
  }

  const numInput =
    "mt-1 block w-full rounded-xl border border-[var(--mobile-app-card-border)] bg-[#111827] px-3 py-2 text-sm text-white";

  return (
    <div className="grid h-full min-h-0 gap-3 lg:grid-cols-2">
      {/* Left column: report set (scrolls) + conditions */}
      <div className="flex min-h-0 flex-col gap-3">
        {/* Ordered report set */}
        <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-[var(--mobile-app-card-border)] shadow-[var(--mobile-app-card-shadow)] p-3">
          <p className="shrink-0 text-xs font-semibold text-[var(--graphite-text-header)]">
            Report set · {order.length} image{order.length === 1 ? "" : "s"}
          </p>
          {order.length === 0 ? (
            <p className="mt-2 text-[11px] text-[var(--graphite-muted)]">
              No images yet — mark images with ★ in the Library to add them here.
            </p>
          ) : (
            <ul className="mt-2 min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
              {order.map((id, idx) => {
                const c = byId.get(id);
                if (!c) return null;
                return (
                  <li key={id} className="flex items-center gap-2 rounded-lg border border-[var(--mobile-app-card-border)] p-1.5">
                    <span className="w-5 shrink-0 text-center text-[11px] font-bold text-[var(--graphite-muted)]">{idx + 1}</span>
                    {c.previewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.previewUrl} alt={c.filename} className="h-9 w-12 shrink-0 rounded object-cover" />
                    ) : (
                      <span className="h-9 w-12 shrink-0 rounded bg-[#111827]" />
                    )}
                    <span className="min-w-0 flex-1 truncate text-xs text-[var(--graphite-text-body)]">{c.filename}</span>
                    <button type="button" onClick={() => onReorder(idx, -1)} disabled={idx === 0}
                      className="rounded border border-[var(--mobile-app-card-border)] px-1.5 text-xs text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)] disabled:opacity-30" title="Move up">↑</button>
                    <button type="button" onClick={() => onReorder(idx, 1)} disabled={idx === order.length - 1}
                      className="rounded border border-[var(--mobile-app-card-border)] px-1.5 text-xs text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)] disabled:opacity-30" title="Move down">↓</button>
                    <button type="button" onClick={() => onRemove(id)}
                      className="rounded border border-[var(--mobile-app-card-border)] px-1.5 text-xs text-[var(--graphite-muted)] hover:text-[#fca5a5]" title="Remove">✕</button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Conditions */}
        <div className="shrink-0 rounded-2xl border border-[var(--mobile-app-card-border)] shadow-[var(--mobile-app-card-shadow)] p-3">
          <p className="text-xs font-semibold text-[var(--graphite-text-header)]">Site conditions</p>
          <label className="mt-2 block text-[11px] text-[var(--graphite-muted)]">Ambient (°C)
            <input type="number" value={conditions.ambient_c ?? ""} onChange={(e) => setCond({ ambient_c: e.target.value })} className={numInput} />
          </label>
          <label className="mt-2 block text-[11px] text-[var(--graphite-muted)]">Wind (mph)
            <input type="number" value={conditions.wind_mph ?? ""} onChange={(e) => setCond({ wind_mph: e.target.value })} className={numInput} />
          </label>
          <label className="mt-2 block text-[11px] text-[var(--graphite-muted)]">Focal length (mm)
            <input type="number" value={conditions.focal_mm ?? ""} onChange={(e) => setCond({ focal_mm: e.target.value })} className={numInput} />
          </label>
          <label className="mt-2 block text-[11px] text-[var(--graphite-muted)]">Operator notes
            <textarea rows={2} value={conditions.operator_notes ?? ""} onChange={(e) => setCond({ operator_notes: e.target.value })} className={numInput} />
          </label>
          <div className="mt-2 flex items-center gap-2">
            <button type="button" onClick={saveConditions}
              className="rounded-lg border border-[var(--mobile-app-card-border)] px-2.5 py-1 text-xs font-semibold text-[var(--graphite-text-body)] hover:text-[var(--graphite-text-header)]">
              Save conditions
            </button>
            {savedNote ? <span className="text-[11px] text-[var(--graphite-muted)]">{savedNote}</span> : null}
          </div>
        </div>
      </div>

      {/* Right column: template gallery + signature + generate + history (scrolls) */}
      <div className="min-h-0 overflow-y-auto">
        <ThermalReportPanel
          sessionId={sessionId}
          initialTemplateId={initialTemplateId}
          initialSignature={initialSignature}
        />
      </div>
    </div>
  );
}
