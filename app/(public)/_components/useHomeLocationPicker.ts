"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMap, useMapsLibrary } from "@vis.gl/react-google-maps";

export type LatLng = { lat: number; lng: number };
export type HomeLocationValue = {
  address: string;
  lat: number | null;
  lng: number | null;
  boundary: LatLng[];
};
type Tool = "select" | "marker" | "polygondraw";

/**
 * Location-picker logic for the public contact form. Adapted from
 * components/projects/useWizardLocationPickerController.ts (dashboard-owned
 * — not edited here) with two deliberate differences, both explained in
 * docs/design/HOMEPAGE_LIGHT_REBUILD_PLAN.md §4.2/§4.3:
 *   1. Autocomplete leads with the legacy `AutocompleteService` — confirmed
 *      working live on this key. The newer `AutocompleteSuggestion` method
 *      is confirmed BLOCKED by a key restriction (reproduced directly:
 *      "Requests to this API ... are blocked"), so it is not attempted.
 *   2. No Hybrid maptype (Map/Satellite only) and no raw lat/lng display —
 *      handled by the chrome component, not this hook.
 */
export function useHomeLocationPicker(value: HomeLocationValue, onChange: (v: HomeLocationValue) => void) {
  const map = useMap("home-loc-map");
  const geocodingLib = useMapsLibrary("geocoding");
  const placesLib = useMapsLibrary("places");
  const geocoder = useMemo(() => (geocodingLib ? new geocodingLib.Geocoder() : null), [geocodingLib]);

  const [input, setInput] = useState(value.address);
  const [suggestions, setSuggestions] = useState<Array<{ placeId: string; description: string }>>([]);
  const [resolving, setResolving] = useState(false);
  const [tool, setTool] = useState<Tool>("select");
  const [mapType, setMapType] = useState<"roadmap" | "satellite">("satellite");
  const [is3D, setIs3D] = useState(true);
  const [drawingVertices, setDrawingVertices] = useState<LatLng[]>([]);

  const toolRef = useRef<Tool>("select");
  const verticesRef = useRef<LatLng[]>([]);
  verticesRef.current = drawingVertices;
  const valueRef = useRef(value);
  valueRef.current = value;
  const skipNextSearchRef = useRef(false);
  const previewLineRef = useRef<google.maps.Polyline | null>(null);
  const previewMarkersRef = useRef<google.maps.Marker[]>([]);
  const boundaryPolyRef = useRef<google.maps.Polygon | null>(null);
  const pinMarkerRef = useRef<google.maps.Marker | null>(null);

  useEffect(() => { skipNextSearchRef.current = true; setInput(value.address); }, [value.address]);
  useEffect(() => { if (map) map.setMapTypeId(mapType); }, [map, mapType]);
  useEffect(() => { if (map) { map.setTilt(is3D ? 45 : 0); map.setHeading(0); } }, [map, is3D]);

  // Draggable pin, synced to value.lat/lng.
  useEffect(() => {
    if (!map) return;
    if (value.lat == null || value.lng == null) {
      pinMarkerRef.current?.setMap(null);
      pinMarkerRef.current = null;
      return;
    }
    if (!pinMarkerRef.current) {
      pinMarkerRef.current = new google.maps.Marker({ map, draggable: true, position: { lat: value.lat, lng: value.lng } });
      pinMarkerRef.current.addListener("dragend", (e: google.maps.MapMouseEvent) => {
        if (!e.latLng) return;
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        onChange({ ...valueRef.current, lat, lng });
        geocoder?.geocode({ location: { lat, lng } }).then((r) => {
          const address = r.results[0]?.formatted_address;
          if (address) { skipNextSearchRef.current = true; setInput(address); onChange({ ...valueRef.current, address, lat, lng }); }
        }).catch(() => {});
      });
    } else {
      pinMarkerRef.current.setPosition({ lat: value.lat, lng: value.lng });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, value.lat, value.lng]);

  // Autocomplete — legacy AutocompleteService first (confirmed working);
  // Geocoder as a last-resort fallback only. skipNextSearchRef suppresses
  // the search this effect would otherwise fire when setInput() is called
  // programmatically (suggestion selected, map clicked, pin dragged) — a
  // resolved address re-queried against itself was reopening the dropdown
  // with itself as the only suggestion right after selection. Confirmed
  // live during mobile QA, not just in code review.
  useEffect(() => {
    if (skipNextSearchRef.current) { skipNextSearchRef.current = false; return; }
    const trimmed = input.trim();
    if (trimmed.length < 3) { setSuggestions([]); return; }
    const legacy = (placesLib as { AutocompleteService?: new () => google.maps.places.AutocompleteService } | null)?.AutocompleteService;
    const timer = window.setTimeout(() => {
      if (legacy) {
        new legacy().getPlacePredictions({ input: trimmed }, (predictions, status) => {
          if (status === "OK" && predictions?.length) {
            setSuggestions(predictions.slice(0, 6).map((p) => ({ placeId: p.place_id, description: p.description })));
          } else {
            setSuggestions([]);
          }
        });
        return;
      }
      if (geocoder) {
        geocoder.geocode({ address: trimmed }).then((r) => {
          setSuggestions((r.results ?? []).slice(0, 6).map((res) => ({ placeId: res.place_id ?? "", description: res.formatted_address ?? trimmed })));
        }).catch(() => setSuggestions([]));
      }
    }, 220);
    return () => clearTimeout(timer);
  }, [input, placesLib, geocoder]);

  const clearPreview = useCallback(() => {
    previewLineRef.current?.setMap(null);
    previewLineRef.current = null;
    previewMarkersRef.current.forEach((m) => m.setMap(null));
    previewMarkersRef.current = [];
    setDrawingVertices([]);
  }, []);

  // Click handling: drop/move pin, or add a boundary vertex.
  useEffect(() => {
    if (!map) return;
    const listener = map.addListener("click", (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      if (toolRef.current === "polygondraw") {
        const next = [...verticesRef.current, { lat, lng }];
        setDrawingVertices(next);
        if (previewLineRef.current) previewLineRef.current.setPath(next);
        else previewLineRef.current = new google.maps.Polyline({ path: next, strokeColor: "var(--mkt-accent)", strokeWeight: 2, map });
        previewMarkersRef.current.push(new google.maps.Marker({ position: { lat, lng }, map, icon: { path: google.maps.SymbolPath.CIRCLE, scale: 5, fillColor: "#0C7A52", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 1.5 } }));
        return;
      }
      onChange({ ...valueRef.current, lat, lng });
      geocoder?.geocode({ location: { lat, lng } }).then((r) => {
        const address = r.results[0]?.formatted_address ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        skipNextSearchRef.current = true;
        setInput(address);
        onChange({ ...valueRef.current, address, lat, lng });
      }).catch(() => {});
    });
    return () => (listener as google.maps.MapsEventListener).remove();
  }, [map, geocoder, onChange]);

  useEffect(() => () => { clearPreview(); boundaryPolyRef.current?.setMap(null); pinMarkerRef.current?.setMap(null); }, [clearPreview]);

  const finishBoundary = useCallback(() => {
    const vertices = verticesRef.current;
    if (vertices.length < 3) return;
    clearPreview();
    boundaryPolyRef.current?.setMap(null);
    boundaryPolyRef.current = new google.maps.Polygon({ paths: vertices, strokeColor: "#0C7A52", strokeWeight: 2, fillColor: "#0C7A52", fillOpacity: 0.14, editable: true, draggable: true, map: map ?? undefined });
    const lat = vertices.reduce((s, p) => s + p.lat, 0) / vertices.length;
    const lng = vertices.reduce((s, p) => s + p.lng, 0) / vertices.length;
    onChange({ ...valueRef.current, lat, lng, boundary: vertices });
    setTool("select"); toolRef.current = "select";
  }, [clearPreview, map, onChange]);

  const selectSuggestion = useCallback(async (s: { placeId: string; description: string }) => {
    if (!geocoder || !map) return;
    setResolving(true); setSuggestions([]);
    try {
      const r = await geocoder.geocode({ placeId: s.placeId });
      const loc = r.results[0]?.geometry?.location;
      if (loc) {
        const lat = loc.lat(); const lng = loc.lng();
        const address = r.results[0].formatted_address;
        skipNextSearchRef.current = true;
        setInput(address); map.panTo({ lat, lng }); map.setZoom(17);
        onChange({ ...valueRef.current, address, lat, lng });
      }
    } finally { setResolving(false); }
  }, [geocoder, map, onChange]);

  const activateTool = (next: Tool) => {
    if (next === "polygondraw") { clearPreview(); }
    setTool(next); toolRef.current = next;
  };
  const clearBoundary = () => { boundaryPolyRef.current?.setMap(null); boundaryPolyRef.current = null; clearPreview(); onChange({ ...value, boundary: [] }); };

  // Clears the dropped pin/address entirely (distinct from clearBoundary,
  // which only clears a drawn outline) — lets someone who picked the wrong
  // spot start over instead of being stuck with it.
  const clearLocation = useCallback(() => {
    pinMarkerRef.current?.setMap(null);
    pinMarkerRef.current = null;
    boundaryPolyRef.current?.setMap(null);
    boundaryPolyRef.current = null;
    clearPreview();
    skipNextSearchRef.current = true;
    setInput("");
    setSuggestions([]);
    onChange({ address: "", lat: null, lng: null, boundary: [] });
  }, [clearPreview, onChange]);

  return { input, setInput, suggestions, resolving, tool, mapType, setMapType, is3D, setIs3D, drawingVertices, isDrawingBoundary: tool === "polygondraw", activateTool, clearPreview, clearBoundary, clearLocation, finishBoundary, selectSuggestion };
}
