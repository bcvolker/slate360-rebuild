"use client";

import { useMemo } from "react";
import { describeAnomaly, type ThermalAnomaly, type DescribeUnit } from "@/lib/thermal/anomaly-describe";
import type { ThermalReportTemplate } from "@/lib/thermal/report-templates";
import type { ThermalBrandingConfig } from "@/lib/thermal/types";
import type { StudioCapture } from "@/components/ops/thermal/ThermalStudioWorkView";

type Conditions = { ambient_c?: number | string; wind_mph?: number | string; focal_mm?: number | string };

/**
 * WYSIWYG report preview — a faithful HTML mirror of the PDF the Modal worker
 * builds (workers/modal/thermal-analysis/report.py): cover + executive summary +
 * methodology, one FLIR-style findings page per image (sidebar of measurements /
 * parameters / conditions / capture / findings beside the thermal + visual pair),
 * then severity scale, disclaimer, and signature. Renders as white "paper" sheets
 * so the operator sees exactly what the export will look like as they build it.
 */
export function ThermalReportPreview({
  sessionName,
  template,
  branding,
  conditions,
  signature,
  order,
  byId,
  summary,
}: {
  sessionName: string;
  template: ThermalReportTemplate;
  branding: ThermalBrandingConfig;
  conditions: Conditions;
  signature: string;
  order: string[];
  byId: Map<string, StudioCapture>;
  summary?: Record<string, unknown> | null;
}) {
  const unit: DescribeUnit = ((branding as { temp_unit?: string }).temp_unit === "C" ? "C" : "F");
  const sections = template.sections ?? ({} as ThermalReportTemplate["sections"]);
  const on = (k: keyof ThermalReportTemplate["sections"]) => sections[k] !== false;
  const standards = template.standards ?? [];
  const company = branding?.company_name || "Thermal Inspection Report";
  const today = useMemo(() => new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }), []);

  const ordered = order.map((id) => byId.get(id)).filter(Boolean) as StudioCapture[];
  // If nothing is curated yet, preview ALL images so the format is always visible.
  const frames = ordered.length ? ordered : ([...byId.values()] as StudioCapture[]);
  const usingAll = ordered.length === 0 && frames.length > 0;
  const totalCaptures = summary?.total_captures ?? frames.length;
  const critical = summary?.critical_anomalies ?? 0;
  const flagged = frames.filter((c) => (c.anomalies?.length ?? 0) > 0).length;
  // Two images per page (matches the 2-up PDF layout).
  const pages: StudioCapture[][] = [];
  for (let i = 0; i < frames.length; i += 2) pages.push(frames.slice(i, i + 2));

  return (
    <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-2 py-1">
      {/* COVER — clean: logo, title, key counts (methodology moves to the back). */}
      <Sheet>
        {template.show_logo !== false ? (
          branding?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={branding.logo_url} alt="logo" className="mb-4 max-h-16 object-contain" />
          ) : (
            <div className="mb-4 flex h-12 w-40 items-center justify-center rounded border border-dashed border-slate-300 text-[10px] text-slate-400">
              Your logo (upload in Deliver → Branding)
            </div>
          )
        ) : null}
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{company}</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">{sessionName || "Thermal Inspection"}</h1>
        <p className="mt-1 text-xs text-slate-500">Generated {today}</p>
        {on("executive_summary") ? (
          <div className="mt-5 grid grid-cols-3 gap-3">
            <Metric label="Images" value={String(totalCaptures)} />
            <Metric label="Flagged images" value={String(flagged)} />
            <Metric label="Action anomalies" value={String(critical)} />
          </div>
        ) : null}
        {usingAll ? (
          <p className="mt-4 rounded bg-slate-100 px-3 py-2 text-[11px] text-slate-500">
            Previewing all {frames.length} images. Mark images with ★ in the Library to choose
            which ones — and in what order — appear in the report.
          </p>
        ) : null}
      </Sheet>

      {/* FINDINGS — two images per page (the 2-up PDF layout) */}
      {on("findings") ? (
        frames.length === 0 ? (
          <Sheet>
            <p className="text-center text-xs text-slate-400">No images yet — upload or import captures to build the report.</p>
          </Sheet>
        ) : (
          pages.map((pg, pi) => (
            <Sheet key={pi}>
              <p className="mb-3 text-[9px] font-semibold uppercase tracking-wide text-slate-400">Page {pi + 1}</p>
              <div className="space-y-5">
                {pg.map((c, j) => (
                  <ImageBlock
                    key={c.id}
                    capture={c}
                    paired={pairOf(c, byId)}
                    index={pi * 2 + j + 1}
                    conditions={conditions}
                    standards={standards}
                    unit={unit}
                  />
                ))}
              </div>
            </Sheet>
          ))
        )
      ) : null}

      {/* BACK MATTER — methodology + severity + disclaimer + signature */}
      {(on("methodology") && template.methodology_text) ||
      (on("severity_table") && template.severity_levels?.length) ||
      (on("disclaimer") && template.disclaimer_text) ||
      (on("signature") && signature) ? (
        <Sheet>
          {on("methodology") && template.methodology_text ? (
            <section className="mb-5">
              <h2 className="text-sm font-bold text-slate-900">Methodology</h2>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-600">{template.methodology_text}</p>
              {standards.length ? <p className="mt-1 text-[11px] italic text-slate-500">Standards: {standards.join(", ")}</p> : null}
            </section>
          ) : null}
          {on("severity_table") && template.severity_levels?.length ? (
            <section>
              <h2 className="text-sm font-bold text-slate-900">Severity scale</h2>
              <table className="mt-2 w-full border-collapse text-[11px]">
                <tbody>
                  {template.severity_levels.map((lvl) => (
                    <tr key={lvl.label}>
                      <td className="border border-slate-300 px-2 py-1 font-semibold text-slate-800">{lvl.label}</td>
                      <td className="border border-slate-300 px-2 py-1 text-slate-600">{lvl.definition}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ) : null}
          {on("disclaimer") && template.disclaimer_text ? (
            <section className="mt-5">
              <h2 className="text-sm font-bold text-slate-900">Disclaimer</h2>
              <p className="mt-1 text-[11px] italic leading-relaxed text-slate-600">{template.disclaimer_text}</p>
            </section>
          ) : null}
          {on("signature") && signature ? (
            <section className="mt-5 border-t border-slate-200 pt-3">
              <p className="whitespace-pre-line text-[12px] text-slate-700">{signature}</p>
            </section>
          ) : null}
          {branding?.custom_footer ? (
            <p className="mt-5 text-[10px] italic text-slate-400">{branding.custom_footer}</p>
          ) : null}
        </Sheet>
      ) : null}
    </div>
  );
}

function pairOf(c: StudioCapture, byId: Map<string, StudioCapture>): StudioCapture | null {
  const pid = (c.metadata as Record<string, unknown> | null)?.visual_pair_id;
  return typeof pid === "string" ? byId.get(pid) ?? null : null;
}

function ImageBlock({
  capture,
  paired,
  index,
  conditions,
  standards,
  unit,
}: {
  capture: StudioCapture;
  paired: StudioCapture | null;
  index: number;
  conditions: Conditions;
  standards: string[];
  unit: DescribeUnit;
}) {
  const q = (capture.qualityMetrics ?? {}) as Record<string, unknown>;
  const meta = (capture.metadata ?? {}) as Record<string, unknown>;
  const tuning = (meta.tuning ?? {}) as Record<string, unknown>;
  const gps = (meta.gps ?? {}) as Record<string, unknown>;
  const anomalies = (capture.anomalies ?? []) as ThermalAnomaly[];
  const findingsText = typeof meta.findings === "string" ? meta.findings : "";

  const measurements: [string, string][] = [];
  if (q.max_temp_c != null) measurements.push(["Max", fmt(q.max_temp_c, unit)]);
  if (q.min_temp_c != null) measurements.push(["Min", fmt(q.min_temp_c, unit)]);
  if (q.avg_temp_c != null) measurements.push(["Average", fmt(q.avg_temp_c, unit)]);
  anomalies.forEach((a, i) => {
    measurements.push([`A${i + 1} peak`, fmt(a.temp_c, unit)]);
    measurements.push([`A${i + 1} ΔT`, fmtDelta(a.delta_c, unit)]);
  });

  // Camera / sensor / resolution (pixels).
  const w = q.width ?? q.image_width, h = q.height ?? q.image_height;
  const imageRows: [string, string][] = [];
  if (q.sensor_make) imageRows.push(["Camera", String(q.sensor_make)]);
  if (q.sensor_model || q.parser_id) imageRows.push(["Sensor", String(q.sensor_model ?? q.parser_id)]);
  if (w != null && h != null) imageRows.push(["Resolution", `${w} × ${h} px`]);

  const params: [string, string][] = [];
  const emis = tuning.emissivity ?? q.emissivity_used;
  if (emis != null) params.push(["Emissivity", String(emis)]);
  if (tuning.reflected_c != null) params.push(["Reflected", fmt(tuning.reflected_c, unit)]);
  if (tuning.distance_m != null) params.push(["Distance", `${tuning.distance_m} m`]);
  if (tuning.humidity_pct != null) params.push(["Humidity", `${tuning.humidity_pct}%`]);
  if (tuning.atmospheric_c != null) params.push(["Atmospheric", fmt(tuning.atmospheric_c, unit)]);

  const condRows: [string, string][] = [];
  if (conditions.ambient_c != null && conditions.ambient_c !== "") condRows.push(["Ambient", fmt(Number(conditions.ambient_c), unit)]);
  if (conditions.wind_mph != null && conditions.wind_mph !== "") condRows.push(["Wind", `${conditions.wind_mph} mph`]);
  if (conditions.focal_mm != null && conditions.focal_mm !== "") condRows.push(["Focal length", `${conditions.focal_mm} mm`]);

  const capRows: [string, string][] = [];
  if (q.captured_at) capRows.push(["Captured", String(q.captured_at)]);
  const lat = gps.lat, lon = gps.lon ?? gps.lng;
  if (lat != null && lon != null) capRows.push(["Location", `${Number(lat).toFixed(5)}, ${Number(lon).toFixed(5)}`]);
  if (typeof (capture as { weather_str?: string }).weather_str === "string") capRows.push(["Weather", (capture as { weather_str?: string }).weather_str!]);

  return (
    <div className="border-b border-slate-200 pb-4 last:border-b-0 last:pb-0">
      <h3 className="mb-1.5 text-xs font-bold text-slate-900">
        {index}. {capture.filename}
      </h3>
      {/* Image featured (left), all metadata alongside (right). */}
      <div className="grid grid-cols-[1.5fr_1fr] gap-3">
        <div className="min-w-0 space-y-1">
          {capture.previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={capture.previewUrl} alt={capture.filename} className="max-h-44 w-full rounded border border-slate-200 object-contain" />
          ) : (
            <div className="flex h-36 items-center justify-center rounded bg-slate-100 text-[10px] text-slate-400">No image</div>
          )}
          {paired?.previewUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={paired.previewUrl} alt={paired.filename} className="max-h-28 w-full rounded border border-slate-200 object-contain" />
              <p className="text-[9px] italic text-slate-500">Visual · {paired.filename}</p>
            </>
          ) : null}
        </div>
        <div className="min-w-0 space-y-2 text-[10px] text-slate-700">
          <KV title="Measurements" rows={measurements} head />
          {imageRows.length ? <KV title="Image" rows={imageRows} /> : null}
          {params.length ? <KV title="Parameters" rows={params} /> : null}
          {condRows.length ? <KV title="Conditions" rows={condRows} /> : null}
          {capRows.length ? <KV title="Capture" rows={capRows} /> : null}
        </div>
      </div>
      {/* Findings below the image + data. */}
      <div className="mt-2 text-[11px] text-slate-700">
        <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500">Findings &amp; notes</p>
        {findingsText ? <p className="mt-1 leading-relaxed">{findingsText}</p> : null}
        {anomalies.map((a, i) => (
          <p key={i} className="mt-1 leading-relaxed">• {describeAnomaly(a, { standards, unit })}</p>
        ))}
        {!findingsText && anomalies.length === 0 ? <p className="mt-1 text-slate-400">No findings recorded.</p> : null}
      </div>
    </div>
  );
}

function Sheet({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[680px] rounded-md bg-white p-6 text-slate-900 shadow-[0_2px_12px_rgba(0,0,0,0.35)]">
      {children}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-[10px] text-slate-500">{label}</p>
      <p className="text-base font-bold text-slate-900">{value}</p>
    </div>
  );
}

function KV({ title, rows, head }: { title: string; rows: [string, string][]; head?: boolean }) {
  if (!rows.length) return null;
  return (
    <div>
      <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500">{title}</p>
      <table className="mt-0.5 w-full border-collapse">
        <tbody>
          {rows.map(([k, v], i) => (
            <tr key={i} className={head ? "border-b border-slate-100" : ""}>
              <td className="py-0.5 pr-2 text-slate-500">{k}</td>
              <td className="py-0.5 text-right font-medium text-slate-800">{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function fmt(c: unknown, unit: DescribeUnit): string {
  if (typeof c !== "number" || !Number.isFinite(c)) return "—";
  const v = unit === "F" ? c * 9 / 5 + 32 : c;
  return `${v.toFixed(1)}°${unit}`;
}
function fmtDelta(c: unknown, unit: DescribeUnit): string {
  if (typeof c !== "number" || !Number.isFinite(c)) return "—";
  const v = Math.abs(c) * (unit === "F" ? 9 / 5 : 1);
  return `${v.toFixed(1)}°${unit}`;
}
