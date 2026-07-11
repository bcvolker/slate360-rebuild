/**
 * S8.5 export engine (roster #11): renders Clean/Annotated PNGs at native grid
 * resolution, measurement + full-grid radiometric CSVs, and a metadata JSON
 * sidecar per image, batched into one ZIP — entirely client-side (JSZip),
 * reusing the same paint (`renderHeatmap`) and per-spot math (`spotStats`) the
 * live Analyze viewer uses so an export always matches what the operator saw.
 */

// @ts-ignore — jszip types may lag, same pattern as lib/site-walk/evidence-export.ts
import JSZip from "jszip";
import { fetchThermalGrid, type ThermalV2Grid } from "@/components/thermal-studio-v2/lib/grid-api";
import { tuneTemps } from "@/lib/thermal/radiometric";
import { renderHeatmap } from "@/lib/thermal/probe-palettes";
import { spotStats } from "@/lib/thermal/spot-stats";
import type { ThermalV2Capture, ThermalV2Spot, ThermalV2Tuning } from "@/components/thermal-studio-v2/types";

export type ExportSkip = { id: string; filename: string; reason: string };
export type ExportResult = { zipBlob: Blob; exportedCount: number; skipped: ExportSkip[] };

function safeName(s: string): string {
  return s.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80) || "capture";
}

function toDisplayTemp(c: number, unit: "C" | "F"): number {
  return unit === "F" ? (c * 9) / 5 + 32 : c;
}

function csvTemp(c: number, unit: "C" | "F"): string {
  return toDisplayTemp(c, unit).toFixed(1);
}

function paintCanvas(grid: ThermalV2Grid, palette: string): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = grid.width;
  canvas.height = grid.height;
  const ctx = canvas.getContext("2d");
  if (ctx) renderHeatmap(ctx, grid.temps, grid.width, grid.height, palette, grid.minC, grid.maxC, null);
  return canvas;
}

/** Burns numbered measurement markers onto an already-painted canvas — a static, non-interactive twin of SpotOverlay. */
function drawSpotAnnotations(ctx: CanvasRenderingContext2D, spots: ThermalV2Spot[]): void {
  const stroke = Math.max(1, Math.round(ctx.canvas.width / 320));
  const fontSize = Math.max(10, Math.round(ctx.canvas.width / 32));
  ctx.save();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = stroke;
  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.textBaseline = "bottom";
  spots.forEach((spot, i) => {
    if (spot.kind === "line" && spot.x2 != null && spot.y2 != null) {
      ctx.beginPath();
      ctx.moveTo(spot.x, spot.y);
      ctx.lineTo(spot.x2, spot.y2);
      ctx.stroke();
    } else if (spot.kind === "polygon" && Array.isArray(spot.points) && spot.points.length >= 3) {
      ctx.beginPath();
      ctx.moveTo(spot.points[0].x, spot.points[0].y);
      for (const p of spot.points.slice(1)) ctx.lineTo(p.x, p.y);
      ctx.closePath();
      ctx.stroke();
    } else if (spot.kind === "area") {
      const w = spot.w ?? 20;
      const h = spot.h ?? 20;
      if (spot.areaShape === "circle") {
        ctx.beginPath();
        ctx.ellipse(spot.x, spot.y, w / 2, h / 2, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.strokeRect(spot.x - w / 2, spot.y - h / 2, w, h);
      }
    } else {
      ctx.beginPath();
      ctx.arc(spot.x, spot.y, stroke * 3, 0, Math.PI * 2);
      ctx.stroke();
    }
    const label = spot.label || String(i + 1);
    const labelW = ctx.measureText(label).width + fontSize * 0.6;
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(spot.x + 4, spot.y - fontSize - 4, labelW, fontSize + 4);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(label, spot.x + 4 + fontSize * 0.3, spot.y);
  });
  ctx.restore();
}

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("canvas.toBlob failed"))), "image/png");
  });
}

function buildMeasurementCsv(spots: ThermalV2Spot[], grid: ThermalV2Grid, unit: "C" | "F"): string {
  const header = `id,label,kind,x,y,value_${unit},min_${unit},max_${unit},pixels\n`;
  const rows = spots.map((s) => {
    const stats = spotStats(s, grid.temps, grid.width, grid.height);
    return [
      s.id,
      (s.label ?? "").replace(/[,\n]/g, " "),
      s.kind ?? "point",
      s.x.toFixed(1),
      s.y.toFixed(1),
      csvTemp(stats.value, unit),
      stats.min != null ? csvTemp(stats.min, unit) : "",
      stats.max != null ? csvTemp(stats.max, unit) : "",
      stats.pixels ?? "",
    ].join(",");
  });
  return header + rows.join("\n");
}

/** Every pixel's temperature, one CSV row per grid row — the FLIR-parity "full-grid" export (F1.5). */
function buildFullGridCsv(grid: ThermalV2Grid, unit: "C" | "F"): string {
  const lines: string[] = [];
  for (let y = 0; y < grid.height; y++) {
    const row: string[] = new Array(grid.width);
    for (let x = 0; x < grid.width; x++) {
      row[x] = csvTemp(grid.temps[y * grid.width + x], unit);
    }
    lines.push(row.join(","));
  }
  return lines.join("\n");
}

function buildMetadataJson(capture: ThermalV2Capture, grid: ThermalV2Grid, tuning: ThermalV2Tuning, palette: string): string {
  return JSON.stringify(
    {
      id: capture.id,
      filename: capture.filename,
      width: grid.width,
      height: grid.height,
      min_c: grid.minC,
      max_c: grid.maxC,
      tuning,
      palette,
      camera: capture.qualityMetrics ?? null,
      capture_metadata: capture.metadata ?? null,
      exported_at: new Date().toISOString(),
    },
    null,
    2,
  );
}

/**
 * Renders + zips Clean/Annotated PNGs, measurement CSV, full-grid CSV, and a
 * metadata JSON sidecar for every exportable capture in `captures` (skips
 * captures with no radiometric grid — e.g. display-only cameras or a paired
 * visual-photo row — recording why in `skipped`). Applies each image's own
 * saved tuning/palette/spots so the export always matches its last-seen
 * Analyze state; does NOT apply rotate/flip yet (scoped down — see build log).
 */
export async function exportCapturesToZip(captures: ThermalV2Capture[], unit: "C" | "F"): Promise<ExportResult> {
  const zip = new JSZip();
  const skipped: ExportSkip[] = [];
  let exportedCount = 0;

  for (const capture of captures) {
    const result = await fetchThermalGrid(capture.id);
    if ("error" in result) {
      skipped.push({ id: capture.id, filename: capture.filename, reason: result.error });
      continue;
    }
    const rawGrid = result.grid;
    const meta = (capture.metadata ?? {}) as Record<string, unknown>;
    const savedTuning = (meta.tuning as ThermalV2Tuning | undefined) ?? { emissivity: 0.95, reflected_c: 20 };
    const baseEmissivity = rawGrid.emissivity ?? 0.95;
    const tuned = tuneTemps(rawGrid.temps, rawGrid.minC, rawGrid.maxC, baseEmissivity, savedTuning.emissivity, savedTuning.reflected_c);
    const grid: ThermalV2Grid = { ...rawGrid, temps: Array.from(tuned.temps), minC: tuned.minC, maxC: tuned.maxC };
    const palette = typeof meta.palette === "string" ? meta.palette : "Iron";
    const spots = Array.isArray(meta.spots) ? (meta.spots as ThermalV2Spot[]) : [];

    const cleanCanvas = paintCanvas(grid, palette);
    const cleanBlob = await canvasToPngBlob(cleanCanvas);

    const annotatedCanvas = document.createElement("canvas");
    annotatedCanvas.width = grid.width;
    annotatedCanvas.height = grid.height;
    const actx = annotatedCanvas.getContext("2d");
    let annotatedBlob = cleanBlob;
    if (actx) {
      actx.drawImage(cleanCanvas, 0, 0);
      if (spots.length) drawSpotAnnotations(actx, spots);
      annotatedBlob = await canvasToPngBlob(annotatedCanvas);
    }

    const folder = `${safeName(capture.filename.replace(/\.[^.]+$/, ""))}-${capture.id.slice(0, 8)}`;
    zip.file(`${folder}/clean.png`, cleanBlob);
    zip.file(`${folder}/annotated.png`, annotatedBlob);
    zip.file(`${folder}/measurements.csv`, buildMeasurementCsv(spots, grid, unit));
    zip.file(`${folder}/full-grid.csv`, buildFullGridCsv(grid, unit));
    zip.file(`${folder}/metadata.json`, buildMetadataJson(capture, grid, savedTuning, palette));
    exportedCount += 1;
  }

  const zipBlob = (await zip.generateAsync({ type: "blob", compression: "DEFLATE" })) as Blob;
  return { zipBlob, exportedCount, skipped };
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
