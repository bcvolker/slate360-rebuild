"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { cameraOf } from "@/lib/thermal/curation-client";
import { saveFindings } from "@/components/thermal-studio-v2/lib/findings-api";

// Leaflet touches `window` at import time — must never enter the SSR bundle.
const AnalyzeGpsMiniMap = dynamic(
  () => import("@/components/thermal-studio-v2/panels/analyze/AnalyzeGpsMiniMap").then((m) => m.AnalyzeGpsMiniMap),
  { ssr: false },
);
import type { ThermalV2Capture } from "@/components/thermal-studio-v2/types";

function row(label: string, value: string | null): [string, string] | null {
  return value ? [label, value] : null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.length ? v : typeof v === "number" && Number.isFinite(v) ? String(v) : null;
}

/**
 * Right rail — Notes & photo data accordion (S5.5): the operator's findings
 * note (autosaved to the existing `findings` PATCH field) plus every camera/
 * capture fact we actually have. Rows with no data don't render (§0.4).
 */
export function AnalyzeNotes({ capture }: { capture: ThermalV2Capture | null }) {
  const captureId = capture?.id ?? null;
  const meta = (capture?.metadata ?? {}) as Record<string, unknown>;
  const q = (capture?.qualityMetrics ?? {}) as Record<string, unknown>;

  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setNote(typeof meta.findings === "string" ? meta.findings : "");
    setSaved(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [captureId]);

  function onNoteChange(next: string) {
    setNote(next);
    setSaved(false);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (captureId) saveFindings(captureId, next);
      setSaved(true);
    }, 800);
  }

  if (!capture) {
    return <div className="p-2 text-xs text-[var(--graphite-muted)]">Open an image to see its details.</div>;
  }

  const gps = (meta.gps ?? null) as { lat?: number; lon?: number } | null;
  const hasGps = gps && Number.isFinite(gps.lat) && Number.isFinite(gps.lon);

  const rows = [
    row("Camera", cameraOf(capture) === "Unknown camera" ? null : cameraOf(capture)),
    row("Serial", str(q.sensor_serial ?? meta.camera_serial)),
    row("Lens", str(q.lens ?? meta.lens)),
    row("Resolution", str(q.resolution) ?? (Number.isFinite(Number(q.width)) && Number.isFinite(Number(q.height)) ? `${q.width} × ${q.height}` : null)),
    row("Captured", str(meta.captured_at ?? meta.created_at)),
    row("Ambient", Number.isFinite(Number(meta.ambient_temp_c)) ? `${Number(meta.ambient_temp_c).toFixed(1)} °C` : null),
    row("Humidity", Number.isFinite(Number(meta.humidity_pct)) ? `${Number(meta.humidity_pct).toFixed(0)} %` : null),
    row("Compass", str(meta.compass)),
  ].filter((r): r is [string, string] => r !== null);

  return (
    <div className="flex flex-col gap-3 p-1">
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <label htmlFor="thermal-v2-findings" className="text-[11px] text-[var(--graphite-muted)]">
            Findings note
          </label>
          <span className="text-[10px] text-[var(--graphite-muted)]">{saved ? "Saved ✓" : "Saving…"}</span>
        </div>
        <textarea
          id="thermal-v2-findings"
          value={note}
          onChange={(e) => onNoteChange(e.target.value)}
          rows={4}
          maxLength={5000}
          placeholder="What you observed on this image — goes into the report."
          className="resize-y rounded-md border border-[var(--mobile-app-card-border)] bg-transparent px-2 py-1.5 text-xs text-[var(--graphite-text-header)] placeholder:text-[var(--graphite-muted)] focus:border-[var(--graphite-primary)] focus:outline-none"
        />
      </div>

      {rows.length ? (
        <dl className="flex flex-col gap-1 text-[11px]">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-baseline justify-between gap-3">
              <dt className="shrink-0 text-[var(--graphite-muted)]">{label}</dt>
              <dd className="m-0 min-w-0 truncate text-right text-[var(--graphite-text-header)]">{value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {hasGps ? (
        <div className="flex flex-col gap-1">
          <AnalyzeGpsMiniMap lat={Number(gps.lat)} lon={Number(gps.lon)} />
          <a
            href={`https://www.openstreetmap.org/?mlat=${gps.lat}&mlon=${gps.lon}#map=17/${gps.lat}/${gps.lon}`}
            target="_blank"
            rel="noreferrer"
            className="text-[11px] text-[var(--graphite-primary)] underline"
            title="Open the capture location in OpenStreetMap"
          >
            {Number(gps.lat).toFixed(5)}, {Number(gps.lon).toFixed(5)} — open full map
          </a>
        </div>
      ) : null}
    </div>
  );
}
