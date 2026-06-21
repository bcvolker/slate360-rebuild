"use client";

import { useEffect, useMemo, useState } from "react";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import type { LatLngBoundsExpression } from "leaflet";
import type { StudioCapture } from "@/components/ops/thermal/ThermalStudioWorkView";

type Pin = {
  id: string;
  filename: string;
  previewUrl?: string | null;
  lat: number;
  lon: number;
  anomalies: number;
  maxTempC: number | null;
};

function FitBounds({ bounds }: { bounds: LatLngBoundsExpression }) {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(bounds, { padding: [24, 24], maxZoom: 19 });
  }, [map, bounds]);
  return null;
}

/**
 * Twin overlay MVP — pins each thermal capture onto a map by its GPS location, the 2D
 * spatial layer over the site (precursor to the full splat projection). Click a pin to
 * see the thermal thumbnail + key readings; toggle the thermal layer on/off. Flagged
 * captures (detected anomalies) read as warning red; clean ones as the Slate360 accent.
 */
export function ThermalTwinOverlayMap({ captures }: { captures: StudioCapture[] }) {
  const [mounted, setMounted] = useState(false);
  const [showThermal, setShowThermal] = useState(true);
  useEffect(() => setMounted(true), []);

  const pins = useMemo<Pin[]>(() => {
    return captures
      .map((c) => {
        const gps = ((c.metadata as Record<string, unknown> | null)?.gps ??
          (c.metadata as Record<string, unknown> | null)?.gps_position ??
          {}) as Record<string, unknown>;
        const lat = gps.lat != null ? Number(gps.lat) : NaN;
        const lon = (gps.lon ?? gps.lng) != null ? Number(gps.lon ?? gps.lng) : NaN;
        const q = (c.qualityMetrics ?? {}) as Record<string, unknown>;
        return {
          id: c.id,
          filename: c.filename,
          previewUrl: c.previewUrl,
          lat,
          lon,
          anomalies: c.anomalies?.length ?? 0,
          maxTempC: typeof q.max_temp_c === "number" ? q.max_temp_c : null,
        };
      })
      .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon));
  }, [captures]);

  if (pins.length === 0) {
    return (
      <div className="flex h-full min-h-[240px] items-center justify-center rounded-xl border border-[var(--mobile-app-card-border)] p-4 text-center text-xs text-[var(--graphite-muted)]">
        No GPS-tagged captures yet. Geotagged thermal images appear here pinned to their
        location on the site.
      </div>
    );
  }

  const bounds: LatLngBoundsExpression = pins.map((p) => [p.lat, p.lon] as [number, number]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex shrink-0 items-center justify-between">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--graphite-muted)]">
          {pins.length} located capture{pins.length === 1 ? "" : "s"}
        </span>
        <button
          type="button"
          onClick={() => setShowThermal((v) => !v)}
          className={`rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors ${
            showThermal
              ? "border-[color-mix(in_srgb,var(--graphite-primary)_50%,transparent)] bg-[color-mix(in_srgb,var(--graphite-primary)_16%,transparent)] text-[var(--graphite-text-header)]"
              : "border-[var(--mobile-app-card-border)] text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)]"
          }`}
        >
          Thermal layer {showThermal ? "on" : "off"}
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-[var(--mobile-app-card-border)]">
        {mounted ? (
          <MapContainer style={{ height: "100%", width: "100%" }} scrollWheelZoom>
            <TileLayer
              attribution="&copy; OpenStreetMap"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FitBounds bounds={bounds} />
            {showThermal
              ? pins.map((p) => {
                  const color = p.anomalies > 0 ? "#ef4444" : "var(--graphite-primary)";
                  return (
                    <CircleMarker
                      key={p.id}
                      center={[p.lat, p.lon]}
                      radius={7}
                      pathOptions={{ color, fillColor: color, fillOpacity: 0.7, weight: 2 }}
                    >
                      <Popup>
                        <div style={{ width: 160 }}>
                          {p.previewUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.previewUrl} alt={p.filename} style={{ width: "100%", borderRadius: 6 }} />
                          ) : null}
                          <p style={{ margin: "6px 0 0", fontWeight: 600, fontSize: 12 }}>{p.filename}</p>
                          <p style={{ margin: "2px 0 0", fontSize: 11 }}>
                            {p.anomalies > 0 ? `${p.anomalies} finding${p.anomalies === 1 ? "" : "s"}` : "No findings"}
                            {p.maxTempC != null ? ` · max ${p.maxTempC.toFixed(1)}°C` : ""}
                          </p>
                        </div>
                      </Popup>
                    </CircleMarker>
                  );
                })
              : null}
          </MapContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-[var(--graphite-muted)]">Loading map…</div>
        )}
      </div>
    </div>
  );
}
