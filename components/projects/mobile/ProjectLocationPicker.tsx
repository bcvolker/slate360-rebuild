"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  APIProvider,
  AdvancedMarker,
  Map,
  useMap,
  useMapsLibrary,
} from "@vis.gl/react-google-maps";
import { Expand, Loader2, MapPin, Search, X } from "lucide-react";
import { mapClickAction } from "@/lib/maps/pin-placement";
import { useMapTapGate } from "@/lib/maps/use-map-tap-gate";
import { ProjectLocationPickerChrome } from "./ProjectLocationPickerChrome";

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
  const surfaceId = fullscreen ? "project-loc-full" : "project-loc";
  const map = useMap(surfaceId);
  const placesLib = useMapsLibrary("places");
  const geocodingLib = useMapsLibrary("geocoding");
  const [mapType, setMapType] = useState<"roadmap" | "satellite">("roadmap");
  const [placing, setPlacing] = useState(false);
  const [input, setInput] = useState(value.address);
  const tapGateRef = useMapTapGate(map);
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

  const clearPin = useCallback(() => {
    setInput("");
    setSuggestions([]);
    onChange({ ...value, address: "", lat: null, lng: null });
  }, [onChange, value]);

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
        id={surfaceId}
        mapId={mapId}
        mapTypeId={mapType}
        defaultCenter={{ lat: value.lat ?? 39.5, lng: value.lng ?? -98.35 }}
        defaultZoom={value.lat !== null ? 16 : 4}
        gestureHandling="greedy"
        disableDefaultUI
        className="h-full w-full"
        onClick={(ev) => {
          const action = mapClickAction(placing ? "place" : "explore", tapGateRef.current?.consumeClick() ?? false);
          if (action !== "place") return;
          const ll = ev.detail.latLng;
          if (ll) reverseGeocode(ll.lat, ll.lng);
        }}
      >
        {value.lat !== null && value.lng !== null ? (
          <AdvancedMarker
            position={{ lat: value.lat, lng: value.lng }}
            clickable={placing}
            draggable={placing}
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

      <ProjectLocationPickerChrome
        placing={placing}
        onTogglePlacing={() => setPlacing((on) => !on)}
        hasPin={value.lat !== null && value.lng !== null}
        onRemovePin={clearPin}
        showHint={placing && suggestions.length === 0}
        mapType={mapType}
        onMapType={setMapType}
        onZoomIn={() => map?.setZoom((map.getZoom() ?? 10) + 1)}
        onZoomOut={() => map?.setZoom((map.getZoom() ?? 10) - 1)}
      />
    </div>
  );
}
