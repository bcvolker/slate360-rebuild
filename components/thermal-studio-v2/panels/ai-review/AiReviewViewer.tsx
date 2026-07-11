"use client";

import { useEffect, useRef, useState } from "react";
import { fetchThermalGrid, type ThermalV2Grid } from "@/components/thermal-studio-v2/lib/grid-api";
import { renderHeatmap } from "@/lib/thermal/probe-palettes";
import type { ThermalAnomaly } from "@/lib/thermal/anomaly-describe";

const SEVERITY_BORDER: Record<string, string> = {
  action: "border-red-500",
  watch: "border-sky-400",
  info: "border-[var(--graphite-muted)]",
};

/**
 * Read-only viewer for AI Review (doc §1, Tab 3): renders the decoded grid at
 * a static fit (no measurement tools — this is proposal review, not
 * authoring) with numbered outline boxes over each anomaly. Deliberately a
 * lighter build than AnalyzeCanvas/useCanvasStage — no spot editing needed.
 */
export function AiReviewViewer({
  captureId,
  anomalies,
  selectedIndex,
  onSelectIndex,
}: {
  captureId: string | null;
  anomalies: ThermalAnomaly[];
  selectedIndex: number | null;
  onSelectIndex: (i: number) => void;
}) {
  const [grid, setGrid] = useState<ThermalV2Grid | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ left: 0, top: 0, width: 0, height: 0 });

  useEffect(() => {
    setGrid(null);
    setError(null);
    if (!captureId) return;
    let cancelled = false;
    void fetchThermalGrid(captureId).then((result) => {
      if (cancelled) return;
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setGrid(result.grid);
    });
    return () => {
      cancelled = true;
    };
  }, [captureId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !grid) return;
    canvas.width = grid.width;
    canvas.height = grid.height;
    const ctx = canvas.getContext("2d");
    if (ctx) renderHeatmap(ctx, grid.temps, grid.width, grid.height, "Iron", grid.minC, grid.maxC);
  }, [grid]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage || !grid) return;
    function measure() {
      const canvasEl = canvasRef.current;
      const stageEl = stageRef.current;
      if (!canvasEl || !stageEl || !grid) return;
      const canvasRect = canvasEl.getBoundingClientRect();
      const stageRect = stageEl.getBoundingClientRect();
      const fitScale = canvasRect.width > 0 ? Math.min(canvasRect.width / grid.width, canvasRect.height / grid.height) : 0;
      const w = grid.width * fitScale;
      const h = grid.height * fitScale;
      setBox({
        left: canvasRect.left - stageRect.left + (canvasRect.width - w) / 2,
        top: canvasRect.top - stageRect.top + (canvasRect.height - h) / 2,
        width: w,
        height: h,
      });
    }
    const observer = new ResizeObserver(measure);
    observer.observe(canvas);
    measure();
    return () => observer.disconnect();
  }, [grid]);

  if (!captureId) {
    return <div className="flex h-full items-center justify-center text-xs text-[var(--graphite-muted)]">Select an image to review.</div>;
  }
  if (error) {
    return <div className="flex h-full items-center justify-center text-xs text-[var(--graphite-muted)]">{error}</div>;
  }

  return (
    <div ref={stageRef} className="relative flex h-full w-full items-center justify-center overflow-hidden bg-[var(--graphite-canvas-deep)]">
      <canvas ref={canvasRef} className="max-h-full max-w-full object-contain" />
      {grid
        ? anomalies.map((a, i) => {
            if (!a.bbox) return null;
            const left = box.left + (a.bbox.x / grid.width) * box.width;
            const top = box.top + (a.bbox.y / grid.height) * box.height;
            const w = (a.bbox.w / grid.width) * box.width;
            const h = (a.bbox.h / grid.height) * box.height;
            const selected = selectedIndex === i;
            return (
              <button
                key={a.id ?? i}
                type="button"
                onClick={() => onSelectIndex(i)}
                title={`Finding #${i + 1}`}
                style={{ left, top, width: Math.max(w, 12), height: Math.max(h, 12) }}
                className={`absolute rounded border-2 ${SEVERITY_BORDER[a.severity] ?? SEVERITY_BORDER.info} ${
                  selected ? "ring-2 ring-[var(--graphite-primary)]" : ""
                }`}
              >
                <span className="absolute -left-1 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-black/70 text-[9px] font-bold text-white">
                  {i + 1}
                </span>
              </button>
            );
          })
        : null}
    </div>
  );
}
