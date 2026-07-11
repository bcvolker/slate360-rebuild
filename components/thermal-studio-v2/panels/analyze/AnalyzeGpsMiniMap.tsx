"use client";

import { useState } from "react";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, CircleMarker } from "react-leaflet";

/**
 * Notes & photo data's GPS row (doc D2, MAP-1): a 160px inline mini-map,
 * non-interactive until clicked (so it doesn't fight the rail's own scroll
 * with its own scroll-to-zoom) — one click "activates" pan/zoom.
 */
export function AnalyzeGpsMiniMap({ lat, lon }: { lat: number; lon: number }) {
  const [active, setActive] = useState(false);
  return (
    <div
      className="relative h-40 w-full shrink-0 overflow-hidden rounded-md border border-[var(--mobile-app-card-border)]"
      onClick={() => setActive(true)}
    >
      <MapContainer
        center={[lat, lon]}
        zoom={16}
        style={{ height: "100%", width: "100%" }}
        dragging={active}
        scrollWheelZoom={active}
        doubleClickZoom={active}
        touchZoom={active}
        zoomControl={active}
        attributionControl={active}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <CircleMarker center={[lat, lon]} radius={7} pathOptions={{ color: "var(--graphite-primary)", fillColor: "var(--graphite-primary)", fillOpacity: 0.8, weight: 2 }} />
      </MapContainer>
      {!active ? (
        <div className="pointer-events-none absolute inset-0 flex items-end justify-center bg-black/0 pb-1">
          <span className="rounded bg-black/60 px-1.5 py-0.5 text-[9px] text-white">Click to interact</span>
        </div>
      ) : null}
    </div>
  );
}
