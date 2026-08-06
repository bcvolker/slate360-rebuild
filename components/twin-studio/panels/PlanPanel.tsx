"use client";

import { useEffect, useState } from "react";
import { Download, Loader2, Ruler, TriangleAlert } from "lucide-react";
import { twinAccent } from "@/lib/digital-twin/twin-accent";

type FloorPlanAreas = {
  closed?: boolean;
  floorAreaM2?: number | null;
  floorAreaFt2?: number | null;
  usableAreaM2?: number | null;
  roomCount?: number | null;
  wallAreaGrossM2?: number | null;
  wallAreaGrossFt2?: number | null;
  wallAreaNetM2?: number | null;
  wallAreaNetFt2?: number | null;
  ceilingHeightM?: number | null;
  notes?: string[];
  accuracy?: string;
} | null;

type FloorPlanResponse = { areas: FloorPlanAreas; svgUrl: string | null; dxfUrl: string | null };

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
      <p className="text-[10px] uppercase tracking-wide text-[var(--graphite-muted)]">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-zinc-100">{value}</p>
    </div>
  );
}

/**
 * F3 — floor plan + areas, fed by compute_vector_floor_plan (worker.py), which
 * wires the previously-dormant floorplan.py/openings.py into the export
 * stage. Net wall area is shown but explicitly labeled unvalidated — the plan
 * (TWIN_SERVICE_STUDIO_PLAN.md F3) holds back "ready for paint takeoffs"
 * framing until it's been checked against a tape measure on real captures.
 */
export function PlanPanel({ modelId }: { modelId: string | null }) {
  const [data, setData] = useState<FloorPlanResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!modelId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`/api/digital-twin/models/${modelId}/floor-plan-data`)
      .then((res) => res.json())
      .then((json) => setData(json as FloorPlanResponse))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [modelId]);

  if (!modelId) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
        <Ruler className="size-6 text-[var(--graphite-muted)]" aria-hidden />
        <p className="text-sm font-medium text-zinc-200">No splat model ready yet</p>
        <p className="max-w-sm text-xs text-[var(--graphite-muted)]">
          A floor plan is generated automatically once a reconstruction completes.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="size-5 animate-spin text-[var(--graphite-muted)]" aria-hidden />
      </div>
    );
  }

  const areas = data?.areas ?? null;
  if (!areas || !areas.closed) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
        <Ruler className="size-6 text-[var(--graphite-muted)]" aria-hidden />
        <p className="text-sm font-medium text-zinc-200">No floor plan for this capture</p>
        <p className="max-w-sm text-xs text-[var(--graphite-muted)]">
          {areas?.notes?.[0] ??
            "The walk didn't close into an enclosed room, or the wall slice was too sparse to extract walls."}
        </p>
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 overflow-y-auto p-4">
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Stat label="Floor area" value={areas.floorAreaFt2 != null ? `${areas.floorAreaFt2.toLocaleString()} ft²` : "—"} />
          <Stat label="Rooms" value={areas.roomCount != null ? String(areas.roomCount) : "—"} />
          <Stat
            label="Ceiling height"
            value={areas.ceilingHeightM != null ? `${areas.ceilingHeightM.toFixed(2)} m` : "—"}
          />
          <Stat
            label="Wall area (gross)"
            value={areas.wallAreaGrossFt2 != null ? `${areas.wallAreaGrossFt2.toLocaleString()} ft²` : "—"}
          />
          <Stat
            label="Wall area (net)"
            value={areas.wallAreaNetFt2 != null ? `${areas.wallAreaNetFt2.toLocaleString()} ft²` : "not computed"}
          />
          <Stat
            label="Usable area"
            value={areas.usableAreaM2 != null ? `${(areas.usableAreaM2 * 10.7639).toFixed(0)} ft²` : "—"}
          />
        </div>

        {areas.wallAreaNetM2 != null ? (
          <div className={`flex items-start gap-2 rounded-lg border px-3 py-2.5 text-xs ${twinAccent.iconChip}`}>
            <TriangleAlert className="size-4 shrink-0" aria-hidden />
            <span>
              Net wall area (openings subtracted) is <strong className="font-semibold">not yet validated</strong>{" "}
              against a tape measure on real captures — treat it as approximate, not ready for material orders
              or paint takeoffs.
            </span>
          </div>
        ) : null}

        <p className="text-[11px] leading-relaxed text-[var(--graphite-muted)]">
          {areas.accuracy ??
            "Estimating-grade — not survey or permit grade. Verify critical dimensions with a laser."}
        </p>

        {(data?.svgUrl || data?.dxfUrl) ? (
          <div className="flex flex-wrap gap-2">
            {data?.svgUrl ? (
              <a
                href={data.svgUrl}
                download
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-zinc-200 transition hover:border-[var(--accent-border-blue)] hover:text-[var(--twin360-blue)]"
              >
                <Download className="size-3.5" aria-hidden /> Download SVG
              </a>
            ) : null}
            {data?.dxfUrl ? (
              <a
                href={data.dxfUrl}
                download
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-zinc-200 transition hover:border-[var(--accent-border-blue)] hover:text-[var(--twin360-blue)]"
              >
                <Download className="size-3.5" aria-hidden /> Download DXF
              </a>
            ) : null}
          </div>
        ) : null}

        {areas.notes?.length ? (
          <p className="text-[11px] text-[var(--graphite-muted)]">Notes: {areas.notes.join("; ")}</p>
        ) : null}
      </div>
    </div>
  );
}
