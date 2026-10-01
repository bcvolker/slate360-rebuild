"use client";

import { MapPin, Minus, Plus, X } from "lucide-react";

type MapType = "roadmap" | "satellite";

type Props = {
  placing: boolean;
  onTogglePlacing: () => void;
  hasPin: boolean;
  onRemovePin: () => void;
  showHint: boolean;
  mapType: MapType;
  onMapType: (next: MapType) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
};

const glass =
  "border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_88%,transparent)] backdrop-blur-md";

export function ProjectLocationPickerChrome({
  placing,
  onTogglePlacing,
  hasPin,
  onRemovePin,
  showHint,
  mapType,
  onMapType,
  onZoomIn,
  onZoomOut,
}: Props) {
  return (
    <>
      {showHint ? (
        <p className={`pointer-events-none absolute left-2 right-14 top-14 z-10 rounded-lg px-2.5 py-1.5 text-[11px] text-[var(--graphite-text-body)] ${glass}`}>
          Tap the map to place or move the pin. Pan and pinch still move the map.
        </p>
      ) : null}

      <div className="pointer-events-auto absolute bottom-2 left-2 z-10 flex max-w-[calc(100%-3.25rem)] flex-wrap items-center gap-1.5">
        <button
          type="button"
          aria-pressed={placing}
          onClick={onTogglePlacing}
          className={`inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-[var(--mobile-app-card-border)] px-3 text-xs font-semibold backdrop-blur-md ${placing ? "bg-[var(--graphite-primary)] text-[var(--graphite-canvas)]" : "bg-[color-mix(in_srgb,var(--graphite-canvas)_88%,transparent)] text-[var(--graphite-text-body)]"}`}
        >
          <MapPin className="h-3.5 w-3.5" />
          {placing ? "Placing" : "Place pin"}
        </button>
        {hasPin ? (
          <button
            type="button"
            onClick={onRemovePin}
            aria-label="Remove pin"
            className={`inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-[var(--graphite-text-body)] ${glass}`}
          >
            <X className="h-3.5 w-3.5" />
            Remove pin
          </button>
        ) : null}
        <div className={`inline-flex overflow-hidden rounded-lg text-[11px] font-semibold ${glass}`}>
          <button type="button" onClick={() => onMapType("roadmap")} className={`min-h-11 px-2.5 ${mapType === "roadmap" ? "bg-[var(--graphite-primary)] text-[var(--graphite-canvas)]" : "text-[var(--graphite-muted)]"}`}>Map</button>
          <button type="button" onClick={() => onMapType("satellite")} className={`min-h-11 px-2.5 ${mapType === "satellite" ? "bg-[var(--graphite-primary)] text-[var(--graphite-canvas)]" : "text-[var(--graphite-muted)]"}`}>Satellite</button>
        </div>
      </div>

      <div className={`pointer-events-auto absolute bottom-2 right-2 z-10 flex flex-col overflow-hidden rounded-lg ${glass}`}>
        <button type="button" aria-label="Zoom in" onClick={onZoomIn} className="min-h-11 px-2 text-[var(--graphite-text-body)]"><Plus className="h-4 w-4" /></button>
        <button type="button" aria-label="Zoom out" onClick={onZoomOut} className="min-h-11 border-t border-[var(--mobile-app-card-border)] px-2 text-[var(--graphite-text-body)]"><Minus className="h-4 w-4" /></button>
      </div>
    </>
  );
}
