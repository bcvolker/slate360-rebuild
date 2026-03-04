"use client";
/**
 * WizardLocationPicker
 * Rich interactive location picker for the project-creation wizard.
 * Features: Places autocomplete (new API), map-type toggle, 2D/3D tilt,
 * drawing tools (pin + custom click-based polygon boundary).
 *
 * API migration notes:
 *  - Autocomplete: AutocompleteSuggestion (replaces deprecated AutocompleteService)
 *  - Polygon draw:  Custom click-based drawing (replaces deprecated DrawingManager)
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  APIProvider,
  AdvancedMarker,
  Map,
  useMap,
  useMapsLibrary,
} from "@vis.gl/react-google-maps";
import {
  CheckCircle2,
  Eraser,
  Loader2,
  MapPin,
  MousePointer2,
  Pentagon,
  Search,
  X,
} from "lucide-react";

export type LatLng = { lat: number; lng: number };

export type LocationPickerValue = {
  address: string;
  lat: number | null;
  lng: number | null;
  boundary: LatLng[];
};

// "polygondraw" is an internal-only active-drawing sub-state for "polygon".
// Stored in the toolRef so map click handlers know to add vertices rather than
// place a pin. NOT exposed as a UI state — `tool` (useState) only tracks the
// public tool names; the ref carries the extra "polygondraw" value.
type DrawTool = "select" | "marker" | "polygon" | "polygondraw";

// ─── Inner controller (must render inside <APIProvider> + <Map>) ──────────────
function Controller({
  value,
  onChange,
}: {
  value: LocationPickerValue;
  onChange: (v: LocationPickerValue) => void;
}) {
  const map = useMap("wiz-loc-map");
  const geocodingLib = useMapsLibrary("geocoding");
  // Load places library so AutocompleteSuggestion becomes available globally
  useMapsLibrary("places");

  const geocoder = useMemo(
    () => (geocodingLib ? new geocodingLib.Geocoder() : null),
    [geocodingLib]
  );
  const [input, setInput] = useState(value.address);
  const [suggestions, setSuggestions] = useState<
    Array<{ placeId: string; description: string }>
  >([]);
  const [resolving, setResolving] = useState(false);
  const [tool, setTool] = useState<DrawTool>("select");
  const [mapType, setMapType] = useState<"roadmap" | "satellite" | "hybrid">("roadmap");
  const [isThreeD, setIsThreeD] = useState(false);

  // Custom polygon drawing state (replaces deprecated DrawingManager)
  const [drawingVertices, setDrawingVertices] = useState<LatLng[]>([]);
  const previewPolylineRef = useRef<google.maps.Polyline | null>(null);
  const previewMarkersRef = useRef<google.maps.Marker[]>([]);
  const boundaryPolygonRef = useRef<google.maps.Polygon | null>(null);
  const toolRef = useRef<DrawTool>("select");
  const drawingVerticesRef = useRef<LatLng[]>([]);
  drawingVerticesRef.current = drawingVertices;

  // Keep a ref so map event listeners never have stale `value` closures.
  const valueRef = useRef(value);
  useEffect(() => { valueRef.current = value; }, [value]);

  // Sync input when address changes externally
  useEffect(() => {
    setInput(value.address);
  }, [value.address]);

  // Map type
  useEffect(() => {
    if (map) map.setMapTypeId(mapType);
  }, [map, mapType]);

  // 3D tilt
  useEffect(() => {
    if (map) {
      map.setTilt(isThreeD ? 45 : 0);
      map.setHeading(0);
    }
  }, [map, isThreeD]);

  // ── AutocompleteSuggestion (replaces deprecated AutocompleteService) ────────
  useEffect(() => {
    const trimmed = input.trim();
    if (!trimmed || trimmed.length < 3) { setSuggestions([]); return; }
    const g = (window as any).google?.maps?.places;
    if (!g?.AutocompleteSuggestion) { setSuggestions([]); return; }
    const timer = window.setTimeout(async () => {
      try {
        const response = await g.AutocompleteSuggestion.fetchAutocompleteSuggestions({ input: trimmed });
        setSuggestions(
          (response?.suggestions ?? []).slice(0, 6).map((s: any) => ({
            placeId: s.placePrediction?.placeId ?? "",
            description: s.placePrediction?.text?.text ?? s.placePrediction?.text ?? trimmed,
          }))
        );
      } catch {
        // Places API (New) may 403 if not enabled — fall back to Geocoding API
        if (geocoder) {
          try {
            const res = await geocoder.geocode({ address: trimmed });
            setSuggestions(
              (res?.results ?? []).slice(0, 6).map((r: google.maps.GeocoderResult) => ({
                placeId: r.place_id ?? "",
                description: r.formatted_address ?? trimmed,
              }))
            );
          } catch { setSuggestions([]); }
        } else {
          setSuggestions([]);
        }
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [input, geocoder]);

  // ── Map click handler (pin or polygon vertex) ───────────────────────────
  useEffect(() => {
    if (!map) return;
    const listener = map.addListener("click", (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      const la = e.latLng.lat();
      const lo = e.latLng.lng();
      const currentTool = toolRef.current;

      if (currentTool === "polygondraw") {
        const newVerts = [...drawingVerticesRef.current, { lat: la, lng: lo }];
        setDrawingVertices(newVerts);
        if (previewPolylineRef.current) {
          previewPolylineRef.current.setPath(newVerts);
        } else {
          previewPolylineRef.current = new google.maps.Polyline({
            path: newVerts, strokeColor: "#FF4D00", strokeWeight: 2, map,
          });
        }
        previewMarkersRef.current.push(new google.maps.Marker({
          position: { lat: la, lng: lo }, map,
          icon: { path: google.maps.SymbolPath.CIRCLE, scale: 5, fillColor: "#FF4D00", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 1.5 },
        }));
        return;
      }

      if (currentTool === "select" || currentTool === "marker") {
        onChange({ ...valueRef.current, lat: la, lng: lo });
        if (geocoder) {
          geocoder.geocode({ location: { lat: la, lng: lo } }).then((r) => {
            const addr = r.results[0]?.formatted_address ?? `${la.toFixed(5)}, ${lo.toFixed(5)}`;
            setInput(addr);
            onChange({ ...valueRef.current, address: addr, lat: la, lng: lo });
          }).catch(() => {});
        }
        if (currentTool === "marker") { setTool("select"); toolRef.current = "select"; }
      }
    });
    return () => (listener as google.maps.MapsEventListener).remove();
  }, [map, geocoder, onChange]);

  // Cleanup preview overlays on unmount
  useEffect(() => {
    return () => {
      previewPolylineRef.current?.setMap(null);
      previewMarkersRef.current.forEach((m) => m.setMap(null));
      boundaryPolygonRef.current?.setMap(null);
    };
  }, []);

  const clearPreview = useCallback(() => {
    previewPolylineRef.current?.setMap(null);
    previewPolylineRef.current = null;
    previewMarkersRef.current.forEach((m) => m.setMap(null));
    previewMarkersRef.current = [];
    setDrawingVertices([]);
  }, []);

  const finishPolygon = useCallback(() => {
    const verts = drawingVerticesRef.current;
    if (verts.length < 3) return;
    clearPreview();
    boundaryPolygonRef.current?.setMap(null);
    boundaryPolygonRef.current = new google.maps.Polygon({
      paths: verts, strokeColor: "#FF4D00", strokeWeight: 2,
      fillColor: "#FF4D00", fillOpacity: 0.15, editable: true, draggable: true, map,
    });
    const centLat = verts.reduce((s, p) => s + p.lat, 0) / verts.length;
    const centLng = verts.reduce((s, p) => s + p.lng, 0) / verts.length;
    onChange({ ...valueRef.current, lat: centLat, lng: centLng, boundary: verts });
    if (geocoder) {
      geocoder.geocode({ location: { lat: centLat, lng: centLng } }).then((r) => {
        const addr = r.results[0]?.formatted_address;
        if (addr) { setInput(addr); onChange({ address: addr, lat: centLat, lng: centLng, boundary: verts }); }
      }).catch(() => {});
    }
    setTool("select"); toolRef.current = "select";
  }, [map, onChange, geocoder, clearPreview]);

  const selectSuggestion = useCallback(
    async (s: { placeId: string; description: string }) => {
      if (!geocoder || !map) return;
      setResolving(true); setSuggestions([]);
      try {
        const res = await geocoder.geocode({ placeId: s.placeId });
        const loc = res.results[0]?.geometry?.location;
        if (loc) {
          const la = loc.lat(); const lo = loc.lng();
          const addr = res.results[0].formatted_address;
          setInput(addr); map.panTo({ lat: la, lng: lo }); map.setZoom(16);
          onChange({ ...valueRef.current, address: addr, lat: la, lng: lo });
        }
      } catch {}
      setResolving(false);
    }, [geocoder, map, onChange]
  );

  const searchAddress = useCallback(async () => {
    if (!geocoder || !map || !input.trim()) return;
    setResolving(true); setSuggestions([]);
    try {
      const res = await geocoder.geocode({ address: input.trim() });
      const loc = res.results[0]?.geometry?.location;
      if (loc) {
        const la = loc.lat(); const lo = loc.lng();
        const addr = res.results[0].formatted_address;
        setInput(addr); map.panTo({ lat: la, lng: lo }); map.setZoom(16);
        onChange({ ...valueRef.current, address: addr, lat: la, lng: lo });
      }
    } catch {}
    setResolving(false);
  }, [geocoder, map, input, onChange]);

  const isDrawingPolygon = toolRef.current === "polygondraw";

  const activateTool = (next: DrawTool) => {
    if (next === "polygon") {
      setTool("polygon");
      toolRef.current = "polygondraw";
      clearPreview();
    } else {
      setTool(next);
      toolRef.current = next;
      clearPreview();
    }
  };

  const clearBoundary = () => {
    boundaryPolygonRef.current?.setMap(null);
    boundaryPolygonRef.current = null;
    clearPreview();
    onChange({ ...value, boundary: [] });
  };

  const btn = (active: boolean) =>
    `px-2 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${
      active ? "bg-[#FF4D00] text-white" : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
    }`;

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Address search bar */}
      <div className="absolute top-2 left-2 right-2 z-10 pointer-events-auto">
        <div className="flex gap-1.5 bg-white rounded-xl shadow-md border border-gray-200 p-1.5">
          <div className="relative flex-1">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); void searchAddress(); }
                if (e.key === "Escape") setSuggestions([]);
              }}
              placeholder="Search address or coordinates…"
              className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-200 focus:border-[#FF4D00] focus:ring-1 focus:ring-[#FF4D00]/20 focus:outline-none"
            />
            {resolving && <Loader2 size={12} className="absolute right-2 top-1/2 -translate-y-1/2 animate-spin text-gray-400" />}
            {suggestions.length > 0 && (
              <ul className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-gray-200 shadow-xl z-20 max-h-52 overflow-y-auto">
                {suggestions.map((s) => (
                  <li key={s.placeId} onMouseDown={(e) => { e.preventDefault(); void selectSuggestion(s); }}
                    className="px-3 py-2 text-xs hover:bg-orange-50 cursor-pointer flex items-start gap-2">
                    <MapPin size={11} className="text-[#FF4D00] mt-0.5 shrink-0" />
                    {s.description}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button type="button" onClick={() => void searchAddress()} className="px-2.5 py-1.5 bg-[#FF4D00] hover:bg-[#E64500] rounded-lg text-white transition-colors"><Search size={14} /></button>
        </div>
      </div>

      {/* Bottom toolbar */}
      <div className="absolute bottom-2 left-2 z-10 pointer-events-auto flex gap-1.5 flex-wrap">
        {/* Drawing tools */}
        <div className="flex gap-0.5 bg-white rounded-xl border border-gray-200 shadow p-1">
          <button type="button" onClick={() => activateTool("select")} title="Select/Pan" className={btn(!isDrawingPolygon && tool === "select")}><MousePointer2 size={13} /></button>
          <button type="button" onClick={() => activateTool("marker")} title="Drop pin" className={btn(tool === "marker")}><MapPin size={13} /></button>
          <button type="button"
            onClick={() => isDrawingPolygon ? finishPolygon() : activateTool("polygon")}
            title={isDrawingPolygon ? `Finish boundary (${drawingVertices.length} pts)` : "Draw site boundary"}
            className={btn(tool === "polygon")}
          >
            <Pentagon size={13} />
            {isDrawingPolygon && drawingVertices.length >= 3 && <CheckCircle2 size={10} className="text-green-400" />}
          </button>
          {isDrawingPolygon && <button type="button" onClick={clearPreview} title="Cancel drawing" className={btn(false)}><X size={13} /></button>}
          {!isDrawingPolygon && value.boundary.length > 0 && <button type="button" onClick={clearBoundary} title="Clear boundary" className={btn(false)}><Eraser size={13} /></button>}
        </div>

        {/* Map type */}
        <div className="flex gap-0.5 bg-white rounded-xl border border-gray-200 shadow p-1">
          <button type="button" onClick={() => setMapType("roadmap")} className={btn(mapType === "roadmap")}>Map</button>
          <button type="button" onClick={() => setMapType("satellite")} className={btn(mapType === "satellite")}>Sat</button>
          <button type="button" onClick={() => setMapType("hybrid")} className={btn(mapType === "hybrid")}>Hyb</button>
        </div>

        {/* 2D / 3D */}
        <div className="flex gap-0.5 bg-white rounded-xl border border-gray-200 shadow p-1">
          <button type="button" onClick={() => setIsThreeD(false)} className={btn(!isThreeD)}>2D</button>
          <button type="button" onClick={() => setIsThreeD(true)} className={btn(isThreeD)}>3D</button>
        </div>
      </div>

      {/* Drawing hint */}
      {isDrawingPolygon && (
        <div className="absolute top-14 left-2 right-2 z-10 pointer-events-none">
          <div className="bg-[#1E3A8A]/90 backdrop-blur-sm rounded-lg px-3 py-1.5 text-[11px] text-white font-semibold text-center">
            {drawingVertices.length < 3
              ? `Click map to add vertices (${drawingVertices.length} so far, need 3 min)`
              : `${drawingVertices.length} pts — click ⧆ again to close boundary`}
          </div>
        </div>
      )}

      {/* Coordinates badge */}
      {value.lat !== null && value.lng !== null && (
        <div className="absolute bottom-2 right-2 z-10 pointer-events-none">
          <div className="bg-white/90 backdrop-blur-sm rounded-lg px-2 py-1 text-[10px] text-gray-600 border border-gray-200 shadow flex items-center gap-1">
            <MapPin size={9} className="text-[#FF4D00]" />
            {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
          </div>
        </div>
      )}

      {/* Boundary badge */}
      {!isDrawingPolygon && value.boundary.length > 0 && (
        <div className="absolute top-14 right-2 z-10 pointer-events-none">
          <div className="bg-[#FF4D00]/10 border border-[#FF4D00]/30 rounded-lg px-2 py-1 text-[10px] text-[#FF4D00] font-semibold">Boundary: {value.boundary.length} pts</div>
        </div>
      )}
    </div>
  );
}

// ─── Public component ─────────────────────────────────────────────────────────
export default function WizardLocationPicker({
  value,
  onChange,
}: {
  value: LocationPickerValue;
  onChange: (v: LocationPickerValue) => void;
}) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
  const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ?? "DEMO_MAP_ID";

  if (!apiKey) {
    return (
      <div className="h-full flex items-center justify-center text-xs text-gray-500 px-4 text-center">
        Google Maps API key not configured (NEXT_PUBLIC_GOOGLE_MAPS_API_KEY).
      </div>
    );
  }

  return (
    <APIProvider apiKey={apiKey} libraries={["places", "geocoding"]}>
      <div className="relative h-full w-full">
        <Map
          id="wiz-loc-map"
          mapId={mapId}
          defaultCenter={{ lat: value.lat ?? 39.5, lng: value.lng ?? -98.35 }}
          defaultZoom={value.lat !== null ? 15 : 4}
          disableDefaultUI
          gestureHandling="greedy"
          style={{ width: "100%", height: "100%" }}
        >
          {value.lat !== null && value.lng !== null && (
            <AdvancedMarker position={{ lat: value.lat, lng: value.lng }} />
          )}
        </Map>
        <Controller value={value} onChange={onChange} />
      </div>
    </APIProvider>
  );
}
