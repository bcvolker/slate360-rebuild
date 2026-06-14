"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  APIProvider,
  AdvancedMarker,
  Map,
  useMap,
  useMapsLibrary,
} from "@vis.gl/react-google-maps";
import { Expand, Loader2, MapPin, Minus, Plus, Search, X } from "lucide-react";

export type ProjectLatLng = { lat: number; lng: number };
export type ProjectLocationValue = {
  address: string;
  lat: number | null;
  lng: number | null;
  boundary: ProjectLatLng[];
};

type Props = { value: ProjectLocationValue; onChange: (v: ProjectLocationValue) => void };

const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ?? "DEMO_MAP_ID";

export default function ProjectLocationPicker({ value, onChange }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (!apiKey) {
    return (
      <div className="flex h-full items-center justify-center px-4 text-center text-xs text-[var(--graphite-muted)]">
        Map unavailable — set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.
      </div>
    );
  }

  return (
    <APIProvider apiKey={apiKey} libraries={["places", "geocoding"]}>
      <PickerSurface value={value} onChange={onChange} onExpand={() => setExpanded(true)} />
      {expanded ? (
        <div className="fixed inset-0 z-[60] bg-[var(--graphite-canvas)]">
          <PickerSurface value={value} onChange={onChange} fullscreen onClose={() => setExpanded(false)} />
        </div>
      ) : null}
    </APIProvider>
  );
}

function PickerSurface({
  value,
  onChange,
  fullscreen,
  onExpand,
  onClose,
}: Props & { fullscreen?: boolean; onExpand?: () => void; onClose?: () => void }) {
  const map = useMap();
  const placesLib = useMapsLibrary("places");
  const geocodingLib = useMapsLibrary("geocoding");
  const [mapType, setMapType] = useState<"roadmap" | "satellite">("roadmap");
  const [input, setInput] = useState(value.address);
  const [suggestions, setSuggestions] = useState<{ id: string; label: string }[]>([]);
  const [resolving, setResolving] = useState(false);
  const acRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);

  useEffect(() => {
    if (placesLib && !acRef.current) acRef.current = new placesLib.AutocompleteService();
  }, [placesLib]);
  useEffect(() => {
    if (geocodingLib && !geocoderRef.current) geocoderRef.current = new geocodingLib.Geocoder();
  }, [geocodingLib]);

  // Type-ahead suggestions.
  useEffect(() => {
    const q = input.trim();
    if (!acRef.current || q.length < 3 || q === value.address) {
      setSuggestions([]);
      return;
    }
    const t = setTimeout(() => {
      acRef.current!.getPlacePredictions({ input: q }, (preds) => {
        setSuggestions((preds ?? []).slice(0, 5).map((p) => ({ id: p.place_id, label: p.description })));
      });
    }, 220);
    return () => clearTimeout(t);
  }, [input, value.address]);

  const applyLatLng = useCallback(
    (lat: number, lng: number, address?: string) => {
      onChange({ ...value, lat, lng, address: address ?? value.address });
      map?.panTo({ lat, lng });
      if ((map?.getZoom() ?? 0) < 15) map?.setZoom(16);
    },
    [map, onChange, value],
  );

  const selectSuggestion = useCallback(
    (s: { id: string; label: string }) => {
      setInput(s.label);
      setSuggestions([]);
      geocoderRef.current?.geocode({ placeId: s.id }, (res, status) => {
        if (status === "OK" && res?.[0]) {
          const loc = res[0].geometry.location;
          applyLatLng(loc.lat(), loc.lng(), res[0].formatted_address ?? s.label);
        }
      });
    },
    [applyLatLng],
  );

  // Reverse geocode a dropped/dragged pin to an address.
  const reverseGeocode = useCallback(
    (lat: number, lng: number) => {
      setResolving(true);
      geocoderRef.current?.geocode({ location: { lat, lng } }, (res, status) => {
        setResolving(false);
        const address = status === "OK" && res?.[0] ? res[0].formatted_address ?? "" : value.address;
        setInput(address);
        onChange({ ...value, lat, lng, address });
      });
    },
    [onChange, value],
  );

  return (
    <div className="relative h-full w-full overflow-hidden">
      <Map
        mapId={mapId}
        mapTypeId={mapType}
        defaultCenter={{ lat: value.lat ?? 39.5, lng: value.lng ?? -98.35 }}
        defaultZoom={value.lat !== null ? 16 : 4}
        gestureHandling="greedy"
        disableDefaultUI
        className="h-full w-full"
        onClick={(ev) => {
          const ll = ev.detail.latLng;
          if (ll) reverseGeocode(ll.lat, ll.lng);
        }}
      >
        {value.lat !== null && value.lng !== null ? (
          <AdvancedMarker
            position={{ lat: value.lat, lng: value.lng }}
            draggable
            onDragEnd={(ev) => {
              const ll = ev.latLng;
              if (ll) reverseGeocode(ll.lat(), ll.lng());
            }}
          />
        ) : null}
      </Map>

      {/* Search — single row, top edge */}
      <div className="pointer-events-auto absolute inset-x-2 top-2 z-10">
        <div className="relative flex items-center gap-1.5 rounded-xl border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_88%,transparent)] px-2.5 py-1.5 backdrop-blur-md">
          <Search className="h-4 w-4 shrink-0 text-[var(--graphite-muted)]" />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Search an address…"
            className="min-w-0 flex-1 bg-transparent text-sm text-[var(--graphite-text-header)] outline-none placeholder:text-[var(--graphite-muted)]"
          />
          {resolving ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[var(--graphite-muted)]" /> : null}
          {onClose ? (
            <button type="button" onClick={onClose} aria-label="Close" className="shrink-0 text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)]">
              <X className="h-4 w-4" />
            </button>
          ) : onExpand ? (
            <button type="button" onClick={onExpand} aria-label="Expand map" className="shrink-0 text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)]">
              <Expand className="h-4 w-4" />
            </button>
          ) : null}
        </div>
        {suggestions.length ? (
          <ul className="mt-1 max-h-52 overflow-y-auto rounded-xl border border-[var(--mobile-app-card-border)] bg-[var(--graphite-canvas)] shadow-lg">
            {suggestions.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); selectSuggestion(s); }}
                  className="flex w-full items-start gap-2 px-3 py-2 text-left text-xs text-[var(--graphite-text-body)] hover:bg-[color-mix(in_srgb,var(--graphite-primary)_10%,transparent)]"
                >
                  <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-[var(--graphite-primary)]" />
                  {s.label}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {/* Map type — single segmented, bottom-left edge */}
      <div className="pointer-events-auto absolute bottom-2 left-2 z-10 inline-flex overflow-hidden rounded-lg border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_88%,transparent)] text-[11px] font-semibold backdrop-blur-md">
        <button type="button" onClick={() => setMapType("roadmap")} className={`px-2.5 py-1 ${mapType === "roadmap" ? "bg-[var(--graphite-primary)] text-[var(--graphite-canvas)]" : "text-[var(--graphite-muted)]"}`}>Map</button>
        <button type="button" onClick={() => setMapType("satellite")} className={`px-2.5 py-1 ${mapType === "satellite" ? "bg-[var(--graphite-primary)] text-[var(--graphite-canvas)]" : "text-[var(--graphite-muted)]"}`}>Satellite</button>
      </div>

      {/* Zoom — single column, right edge */}
      <div className="pointer-events-auto absolute bottom-2 right-2 z-10 flex flex-col overflow-hidden rounded-lg border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_88%,transparent)] backdrop-blur-md">
        <button type="button" aria-label="Zoom in" onClick={() => map?.setZoom((map.getZoom() ?? 10) + 1)} className="px-2 py-1.5 text-[var(--graphite-text-body)] hover:text-[var(--graphite-text-header)]"><Plus className="h-4 w-4" /></button>
        <button type="button" aria-label="Zoom out" onClick={() => map?.setZoom((map.getZoom() ?? 10) - 1)} className="border-t border-[var(--mobile-app-card-border)] px-2 py-1.5 text-[var(--graphite-text-body)] hover:text-[var(--graphite-text-header)]"><Minus className="h-4 w-4" /></button>
      </div>

      {/* Lat/lng — single line, bottom-center */}
      {value.lat !== null && value.lng !== null ? (
        <div className="pointer-events-none absolute bottom-2 left-1/2 z-10 -translate-x-1/2 rounded-full border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_88%,transparent)] px-2.5 py-1 text-[10px] tabular-nums text-[var(--graphite-text-body)] backdrop-blur-md">
          {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
        </div>
      ) : null}
    </div>
  );
}
