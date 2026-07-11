"use client";

import { useEffect, useMemo, useState } from "react";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import type { LatLngBoundsExpression } from "leaflet";
import { capturesToPins } from "@/components/thermal-studio-v2/lib/geo-pins";
import type { ThermalV2Capture } from "@/components/thermal-studio-v2/types";

function FitBounds({ bounds }: { bounds: LatLngBoundsExpression }) {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(bounds, { padding: [24, 24], maxZoom: 18 });
  }, [map, bounds]);
  return null;
}

/**
 * Library's Map mode (doc D2, MAP-1): Grid ⇄ Map toggle's Map half. Geotagged
 * captures pin by GPS; a pin's popup opens it in Analyze or toggles it into
 * the Scope selection (the app's existing click-to-toggle selection grammar,
 * doc Addendum E1 — the simpler equivalent of a Leaflet drag-marquee, which
 * would need a custom rectangle-select plugin; scoped down, see build log).
 */
export function LibraryMap({
  captures,
  selectedIds,
  onToggleSelect,
  onOpenInAnalyze,
}: {
  captures: ThermalV2Capture[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string, index: number) => void;
  onOpenInAnalyze?: (id: string, index: number) => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const pins = useMemo(() => capturesToPins(captures), [captures]);
  const indexOf = useMemo(() => new Map(captures.map((c, i) => [c.id, i])), [captures]);

  if (pins.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-center text-xs text-[var(--graphite-muted)]">
        None of these {captures.length} image{captures.length === 1 ? "" : "s"} have location data yet.
      </div>
    );
  }

  const bounds: LatLngBoundsExpression = pins.map((p) => [p.lat, p.lon] as [number, number]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 p-2">
      <span className="shrink-0 text-[11px] text-[var(--graphite-muted)]">
        {pins.length} of {captures.length} have location
      </span>
      <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-[var(--mobile-app-card-border)]">
        {mounted ? (
          <MapContainer style={{ height: "100%", width: "100%" }} scrollWheelZoom>
            <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <FitBounds bounds={bounds} />
            {pins.map((p) => {
              const selected = selectedIds.has(p.id);
              return (
                <CircleMarker
                  key={p.id}
                  center={[p.lat, p.lon]}
                  radius={selected ? 9 : 7}
                  pathOptions={{
                    color: selected ? "#ffffff" : "var(--graphite-primary)",
                    fillColor: "var(--graphite-primary)",
                    fillOpacity: 0.75,
                    weight: selected ? 3 : 2,
                  }}
                >
                  <Popup>
                    <div style={{ width: 160 }}>
                      {p.previewUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.previewUrl} alt={p.filename} style={{ width: "100%", borderRadius: 6 }} />
                      ) : null}
                      <p style={{ margin: "6px 0 0", fontWeight: 600, fontSize: 12 }}>{p.filename}</p>
                      <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                        {onOpenInAnalyze ? (
                          <button
                            type="button"
                            onClick={() => onOpenInAnalyze(p.id, indexOf.get(p.id) ?? 0)}
                            style={{ fontSize: 11, fontWeight: 600, cursor: "pointer" }}
                          >
                            Open in Analyze
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => onToggleSelect(p.id, indexOf.get(p.id) ?? 0)}
                          style={{ fontSize: 11, fontWeight: 600, cursor: "pointer" }}
                        >
                          {selected ? "✓ Selected" : "+ Select"}
                        </button>
                      </div>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-[var(--graphite-muted)]">Loading map…</div>
        )}
      </div>
    </div>
  );
}
