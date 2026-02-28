"use client";
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { APIProvider, Map, useMap, useMapsLibrary } from "@vis.gl/react-google-maps";
import { usePathname } from "next/navigation";
import {
  ArrowUpDown,
  Bike,
  Car,
  CheckCircle2,
  Circle,
  Copy,
  Download,
  Loader2,
  LocateFixed,
  MapPin,
  Maximize2,
  Minimize2,
  Minus,
  X,
  Eraser,
  MousePointer2,
  Navigation,
  PenTool,
  Pentagon,
  RectangleHorizontal,
  Save,
  Search,
  Share,
  Send,
  Train,
  Trash2,
  User,
  Workflow,
} from "lucide-react";
type LocationMapProps = {
  center?: { lat: number; lng: number };
  locationLabel?: string;
  contactRecipients?: Array<{ name: string; email?: string; phone?: string }>;
  /** When true, render a shorter preview card (no toolbar/share panel) suitable for widget grids. */
  compact?: boolean;
  /** When true, render expanded map mode for widget containers. */
  expanded?: boolean;
};
type ProjectOption = {
  id: string;
  name: string;
};
type FolderOption = {
  id: string;
  name: string;
  path: string;
};
type AddressSuggestion = {
  placeId: string;
  description: string;
};
type DrawTool = "select" | "marker" | "line" | "arrow" | "rectangle" | "circle" | "polygon";
type TravelMode = "DRIVING" | "WALKING" | "BICYCLING" | "TRANSIT";
type OverlayRecord = {
  id: string;
  overlay: any;
  kind: string;
  arrow: boolean;
  listeners: Array<{ remove: () => void }>;
};
const DRAW_MODE_BY_TOOL: Record<DrawTool, string | null> = {
  select: null,
  marker: "marker",
  line: "polyline",
  arrow: "polyline",
  rectangle: "rectangle",
  circle: "circle",
  polygon: "polygon",
};
function applyStyleToOverlay(
  overlay: any,
  kind: string,
  style: { strokeColor: string; fillColor: string; strokeWeight: number },
  arrow = false
) {
  if (!overlay || typeof overlay.setOptions !== "function") return;
  if (kind === "marker") {
    return;
  }
  if (kind === "polyline") {
    overlay.setOptions({
      strokeColor: style.strokeColor,
      strokeWeight: style.strokeWeight,
      editable: true,
      draggable: true,
      icons: arrow
        ? [
            {
              icon: {
                path: (window as any).google?.maps?.SymbolPath?.FORWARD_CLOSED_ARROW,
                scale: 3,
                strokeColor: style.strokeColor,
              },
              offset: "100%",
            },
          ]
        : [],
    });
    return;
  }
  if (kind === "polygon") {
    overlay.setOptions({
      strokeColor: style.strokeColor,
      strokeWeight: style.strokeWeight,
      fillColor: style.fillColor,
      fillOpacity: 0.18,
      editable: true,
      draggable: true,
    });
    return;
  }
  if (kind === "rectangle" || kind === "circle") {
    overlay.setOptions({
      strokeColor: style.strokeColor,
      strokeWeight: style.strokeWeight,
      fillColor: style.fillColor,
      fillOpacity: 0.18,
      editable: true,
      draggable: true,
    });
  }
}
type RouteData = {
  origin: string;
  destination: string;
  travelMode: TravelMode;
  distance: string;
  duration: string;
  googleMapsUrl: string;
  encodedPolyline?: string;
};
/** Decode a Google-encoded polyline string into lat/lng pairs. */
function decodePolyline(encoded: string): Array<{ lat: number; lng: number }> {
  const points: Array<{ lat: number; lng: number }> = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let shift = 0, result = 0, byte: number;
    do { byte = encoded.charCodeAt(index++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    shift = 0; result = 0;
    do { byte = encoded.charCodeAt(index++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return points;
}
function buildGoogleMapsUrl(origin: string, dest: string, mode: TravelMode): string {
  const modeMap: Record<TravelMode, string> = { DRIVING: "driving", WALKING: "walking", BICYCLING: "bicycling", TRANSIT: "transit" };
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(dest)}&travelmode=${modeMap[mode]}`;
}
function DrawController({
  setStatus,
  strokeColor,
  fillColor,
  strokeWeight,
  setStrokeColor,
  setFillColor,
  setStrokeWeight,
  setAddressQuery,
  setMapCenter,
  condensed,
  isThreeD,
  setIsThreeD,
  onToggleSharePanel,
  onRouteReady,
}: {
  setStatus: (value: { ok: boolean; text: string } | null) => void;
  strokeColor: string;
  fillColor: string;
  strokeWeight: number;
  setStrokeColor: (value: string) => void;
  setFillColor: (value: string) => void;
  setStrokeWeight: (value: number) => void;
  setAddressQuery: (value: string) => void;
  setMapCenter: (value: { lat: number; lng: number }) => void;
  condensed: boolean;
  isThreeD: boolean;
  setIsThreeD: (val: boolean) => void;
  onToggleSharePanel: () => void;
  onRouteReady: (data: RouteData | null) => void;
}) {
  const map = useMap("main-map");
  const mapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
  const geocodingLib = useMapsLibrary("geocoding");
  const placesLib = useMapsLibrary("places");
  const drawingLib = useMapsLibrary("drawing");
  const geocoder = useMemo(() => geocodingLib ? new geocodingLib.Geocoder() : null, [geocodingLib]);
  const autocompleteService = useMemo(() => placesLib ? new placesLib.AutocompleteService() : null, [placesLib]);
  const [tool, setTool] = useState<DrawTool>("select");
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isResolvingAddress, setIsResolvingAddress] = useState(false);
  const [addressInput, setAddressInput] = useState("");
  const drawingManagerRef = useRef<any>(null);
  const overlaysRef = useRef<OverlayRecord[]>([]);
  const selectedOverlayIdRef = useRef<string | null>(null);
  const selectedToolRef = useRef<DrawTool>("select");
  // Keep refs in sync with current draw-style values so overlay listeners
  // always read the latest colors (avoids stale closure on deselect).
  const strokeColorRef = useRef(strokeColor);
  const fillColorRef = useRef(fillColor);
  const strokeWeightRef = useRef(strokeWeight);
  strokeColorRef.current = strokeColor;
  fillColorRef.current = fillColor;
  strokeWeightRef.current = strokeWeight;
  // ── Directions mode state ──────────────────────────────────────
  const [mapMode, setMapMode] = useState<"markup" | "directions">("markup");
  const [originInput, setOriginInput] = useState("");
  const [destInput, setDestInput] = useState("");
  const [originSuggestions, setOriginSuggestions] = useState<AddressSuggestion[]>([]);
  const [destSuggestions, setDestSuggestions] = useState<AddressSuggestion[]>([]);
  const [travelMode, setTravelMode] = useState<TravelMode>("DRIVING");
  const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string } | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const routePolylineRef = useRef<google.maps.Polyline | null>(null);
  const routeMarkersRef = useRef<google.maps.Marker[]>([]);
  // origin autocomplete
  useEffect(() => {
    const trimmed = originInput.trim();
    if (!trimmed || trimmed.length < 3 || !mapsApiKey) { setOriginSuggestions([]); return; }
    const timeout = window.setTimeout(() => {
      if (!autocompleteService) return;
      autocompleteService.getPlacePredictions({ input: trimmed }, (predictions, status) => {
        if (status === "OK" && predictions) {
          setOriginSuggestions(
            predictions.slice(0, 5).map(p => ({ placeId: p.place_id, description: p.description }))
          );
        } else {
          setOriginSuggestions([]);
        }
      });
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [originInput, mapsApiKey]);
  // destination autocomplete
  useEffect(() => {
    const trimmed = destInput.trim();
    if (!trimmed || trimmed.length < 3 || !mapsApiKey) { setDestSuggestions([]); return; }
    const timeout = window.setTimeout(() => {
      if (!autocompleteService) return;
      autocompleteService.getPlacePredictions({ input: trimmed }, (predictions, status) => {
        if (status === "OK" && predictions) {
          setDestSuggestions(
            predictions.slice(0, 5).map(p => ({ placeId: p.place_id, description: p.description }))
          );
        } else {
          setDestSuggestions([]);
        }
      });
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [destInput, mapsApiKey]);
  // Cleanup route polyline + markers on unmount
  useEffect(() => {
    return () => {
      routePolylineRef.current?.setMap(null);
      routeMarkersRef.current.forEach((m) => m.setMap(null));
    };
  }, []);
  const clearRouteDisplay = () => {
    routePolylineRef.current?.setMap(null);
    routePolylineRef.current = null;
    routeMarkersRef.current.forEach((m) => m.setMap(null));
    routeMarkersRef.current = [];
  };
  const getDirections = useCallback(async (origin: string, dest: string, mode: TravelMode) => {
    if (!map || !originInput.trim() || !destInput.trim()) return;
    setIsLoadingRoute(true);
    setStatus(null);
    try {
      const res = await fetch("/api/directions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ origin: origin.trim(), destination: dest.trim(), travelMode: mode }),
      });
      const data = await res.json();
      if (!res.ok || !data.encodedPolyline) {
        throw new Error(data.error || "Could not find a route between those locations.");
      }
      // Clear any previous route display
      clearRouteDisplay();
      // Decode and render polyline on the map
      const path = decodePolyline(data.encodedPolyline);
      const polyline = new google.maps.Polyline({
        path,
        strokeColor: "#FF4D00",
        strokeWeight: 4,
        strokeOpacity: 0.85,
        map,
      });
      routePolylineRef.current = polyline;
      // Add A / B markers at start and end
      const startMarker = new google.maps.Marker({
        position: path[0],
        map,
        label: { text: "A", color: "white", fontWeight: "bold", fontSize: "12px" },
      });
      const endMarker = new google.maps.Marker({
        position: path[path.length - 1],
        map,
        label: { text: "B", color: "white", fontWeight: "bold", fontSize: "12px" },
      });
      routeMarkersRef.current = [startMarker, endMarker];
      // Fit the map bounds to show the entire route
      const bounds = new google.maps.LatLngBounds();
      path.forEach((p) => bounds.extend(p));
      map.fitBounds(bounds, 50);
      const dist = data.distance as string;
      const dur = data.duration as string;
      setRouteInfo({ distance: dist, duration: dur });
      const gmapsUrl = buildGoogleMapsUrl(origin, dest, mode);
      onRouteReady({
        origin,
        destination: dest,
        travelMode: mode,
        distance: dist,
        duration: dur,
        googleMapsUrl: gmapsUrl,
        encodedPolyline: data.encodedPolyline as string,
      });
      setStatus({ ok: true, text: `Route: ${dist} · ${dur}` });
    } catch (err: any) {
      setRouteInfo(null);
      setStatus({ ok: false, text: err?.message || "Could not calculate route." });
    } finally {
      setIsLoadingRoute(false);
    }
  }, [map, setStatus, onRouteReady]);
  const clearDirections = () => {
    clearRouteDisplay();
    setOriginInput("");
    setDestInput("");
    setRouteInfo(null);
    onRouteReady(null);
    setStatus(null);
    setOriginSuggestions([]);
    setDestSuggestions([]);
  };
  const swapAddresses = () => {
    const prev = originInput;
    setOriginInput(destInput);
    setDestInput(prev);
    setOriginSuggestions([]);
    setDestSuggestions([]);
  };
  const goToCurrentLocationForOrigin = () => {
    if (!navigator.geolocation) {
      setStatus({ ok: false, text: "Geolocation not available." });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const label = `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`;
        setOriginInput(label);
        setOriginSuggestions([]);
        if (destInput.trim()) void getDirections(label, destInput, travelMode);
      },
      () => setStatus({ ok: false, text: "Unable to determine current location." })
    );
  };
  const selectOriginSug = async (suggestion: AddressSuggestion) => {
    setOriginInput(suggestion.description);
    setOriginSuggestions([]);
    if (destInput.trim()) await getDirections(suggestion.description, destInput, travelMode);
  };
  const selectDestSug = async (suggestion: AddressSuggestion) => {
    setDestInput(suggestion.description);
    setDestSuggestions([]);
    if (originInput.trim()) await getDirections(originInput, suggestion.description, travelMode);
  };
  const setDrawingTool = (next: DrawTool) => {
    setTool(next);
    selectedToolRef.current = next;
    const manager = drawingManagerRef.current;
    if (manager && typeof manager.setDrawingMode === "function") {
      manager.setDrawingMode(DRAW_MODE_BY_TOOL[next]);
    }
  };
  const attachOverlayListeners = (record: OverlayRecord) => {
    const listeners: Array<{ remove: () => void }> = [];
    const mapsApi = (window as any).google?.maps;
    if (!mapsApi?.event) return listeners;
    listeners.push(
      mapsApi.event.addListener(record.overlay, "click", () => {
        // Deselect previous — read current colors from refs (not stale closure)
        const prevId = selectedOverlayIdRef.current;
        if (prevId && prevId !== record.id) {
          const prev = overlaysRef.current.find((r) => r.id === prevId);
          if (prev) {
            applyStyleToOverlay(prev.overlay, prev.kind, { strokeColor: strokeColorRef.current, fillColor: fillColorRef.current, strokeWeight: strokeWeightRef.current }, prev.arrow);
          }
        }
        selectedOverlayIdRef.current = record.id;
        // Highlight selected overlay
        applyStyleToOverlay(record.overlay, record.kind, { strokeColor: "#2196F3", fillColor: "#2196F3", strokeWeight: strokeWeightRef.current + 1 }, record.arrow);
        setStatus({ ok: true, text: "Shape selected — press Delete or Backspace to remove" });
      })
    );
    return listeners;
  };
  /** Delete the currently selected overlay */
  const deleteSelectedOverlay = useCallback(() => {
    const selectedId = selectedOverlayIdRef.current;
    if (!selectedId) return;
    const idx = overlaysRef.current.findIndex((r) => r.id === selectedId);
    if (idx === -1) return;
    const record = overlaysRef.current[idx];
    record.listeners.forEach((listener) => listener.remove());
    if (record.overlay && typeof record.overlay.setMap === "function") {
      record.overlay.setMap(null);
    }
    overlaysRef.current = overlaysRef.current.filter((r) => r.id !== selectedId);
    selectedOverlayIdRef.current = null;
    setStatus({ ok: true, text: "Shape deleted." });
  }, [setStatus]);
  // Keyboard listener for Delete / Backspace to remove selected overlay
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        // Don't delete if user is typing in an input
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
        if (selectedOverlayIdRef.current) {
          e.preventDefault();
          deleteSelectedOverlay();
        }
      }
      // Escape to deselect
      if (e.key === "Escape") {
        selectedOverlayIdRef.current = null;
        setStatus(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [deleteSelectedOverlay, setStatus]);
  const clearMarkup = () => {
    overlaysRef.current.forEach((record) => {
      record.listeners.forEach((listener) => listener.remove());
      if (record.overlay && typeof record.overlay.setMap === "function") {
        record.overlay.setMap(null);
      }
    });
    overlaysRef.current = [];
    selectedOverlayIdRef.current = null;
    setStatus({ ok: true, text: "Markup cleared." });
  };
  useEffect(() => {
    if (!map || !drawingLib) return;
    const mapsApi = (window as any).google.maps;
    if (!drawingManagerRef.current) {
      drawingManagerRef.current = new drawingLib.DrawingManager({
        drawingControl: false,
        drawingMode: null,
        markerOptions: {
          draggable: true,
        },
        polylineOptions: {
          strokeColor,
          strokeWeight,
          editable: true,
          draggable: true,
        },
        polygonOptions: {
          strokeColor,
          strokeWeight,
          fillColor,
          fillOpacity: 0.18,
          editable: true,
          draggable: true,
        },
        rectangleOptions: {
          strokeColor,
          strokeWeight,
          fillColor,
          fillOpacity: 0.18,
          editable: true,
          draggable: true,
        },
        circleOptions: {
          strokeColor,
          strokeWeight,
          fillColor,
          fillOpacity: 0.18,
          editable: true,
          draggable: true,
        },
      });
    }
    const manager = drawingManagerRef.current;
    manager.setMap(map);
    const overlayListener = mapsApi.event.addListener(manager, "overlaycomplete", (event: any) => {
      const id = `${Date.now()}-${Math.round(Math.random() * 100000)}`;
      const isArrow = selectedToolRef.current === "arrow" && event.type === "polyline";
      const record: OverlayRecord = {
        id,
        overlay: event.overlay,
        kind: event.type,
        arrow: isArrow,
        listeners: [],
      };
      applyStyleToOverlay(event.overlay, event.type, { strokeColor, fillColor, strokeWeight }, isArrow);
      record.listeners = attachOverlayListeners(record);
      overlaysRef.current = [...overlaysRef.current, record];
      selectedOverlayIdRef.current = id;
      // Extract coordinates from any overlay type and populate the address bar
      {
        let lat: number | undefined, lng: number | undefined;
        if (event.type === "marker") {
          const pos = event.overlay.getPosition();
          if (pos) { lat = pos.lat(); lng = pos.lng(); }
        } else if (event.type === "circle") {
          const c = event.overlay.getCenter();
          if (c) { lat = c.lat(); lng = c.lng(); }
        } else if (event.type === "rectangle") {
          const b = event.overlay.getBounds();
          if (b) { const c = b.getCenter(); lat = c.lat(); lng = c.lng(); }
        } else if (event.type === "polygon" || event.type === "polyline") {
          const p = event.overlay.getPath();
          if (p && p.getLength() > 0) { const f = p.getAt(0); lat = f.lat(); lng = f.lng(); }
        }
        if (lat !== undefined && lng !== undefined) {
          const coordStr = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
          setAddressInput(coordStr);
          setAddressQuery(coordStr);
          setStatus({ ok: true, text: `Markup placed at ${coordStr}` });
          // Reverse-geocode to get a human-readable address alongside coordinates
          if (geocoder) {
            geocoder.geocode({ location: { lat, lng } }).then((response) => {
              const result = response.results[0];
              if (result?.formatted_address) {
                const fullLabel = `${result.formatted_address} (${coordStr})`;
                setAddressInput(fullLabel);
                setAddressQuery(fullLabel);
                setStatus({ ok: true, text: `Markup placed at ${result.formatted_address}` });
              }
            }).catch(() => { /* keep coordinate string as fallback */ });
          }
        }
      }
      // Reset to select tool after placing a marker
      if (selectedToolRef.current === "marker") {
        manager.setDrawingMode(null);
        setTool("select");
        selectedToolRef.current = "select";
      }
    });
    return () => {
      overlayListener?.remove?.();
      manager.setMap(null);
    };
  }, [map, strokeColor, fillColor, strokeWeight, drawingLib]);
  useEffect(() => {
    const manager = drawingManagerRef.current;
    if (!manager) return;
    manager.setOptions({
      polylineOptions: {
        strokeColor,
        strokeWeight,
        editable: true,
        draggable: true,
      },
      polygonOptions: {
        strokeColor,
        strokeWeight,
        fillColor,
        fillOpacity: 0.18,
        editable: true,
        draggable: true,
      },
      rectangleOptions: {
        strokeColor,
        strokeWeight,
        fillColor,
        fillOpacity: 0.18,
        editable: true,
        draggable: true,
      },
      circleOptions: {
        strokeColor,
        strokeWeight,
        fillColor,
        fillOpacity: 0.18,
        editable: true,
        draggable: true,
      },
    });
    const selectedId = selectedOverlayIdRef.current;
    if (!selectedId) return;
    const selected = overlaysRef.current.find((record) => record.id === selectedId);
    if (selected) {
      applyStyleToOverlay(selected.overlay, selected.kind, { strokeColor, fillColor, strokeWeight }, selected.arrow);
    }
  }, [fillColor, strokeColor, strokeWeight]);
  useEffect(() => {
    const trimmed = addressInput.trim();
    if (!trimmed || trimmed.length < 3 || !mapsApiKey) {
      setSuggestions([]);
      return;
    }
    const timeout = window.setTimeout(() => {
      if (!autocompleteService) return;
      autocompleteService.getPlacePredictions({ input: trimmed }, (predictions, status) => {
        if (status === "OK" && predictions) {
          setSuggestions(
            predictions.slice(0, 6).map(p => ({ placeId: p.place_id, description: p.description }))
          );
        } else {
          setSuggestions([]);
        }
      });
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [addressInput, mapsApiKey, autocompleteService]);
  const goToCurrentLocation = () => {
    if (!navigator.geolocation) {
      setStatus({ ok: false, text: "Geolocation is not available on this browser." });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setMapCenter(next);
        const coordStr = `${next.lat.toFixed(5)}, ${next.lng.toFixed(5)}`;
        setAddressQuery(coordStr);
        setAddressInput(coordStr);
        if (map) {
          map.panTo(next);
          map.setZoom(15);
        }
      },
      () => setStatus({ ok: false, text: "Unable to determine current location." })
    );
  };
  const resolveAddressQuery = async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed || !mapsApiKey || !map) return;
    setIsResolvingAddress(true);
    try {
      if (!geocoder) throw new Error("Geocoder not loaded");
      const response = await geocoder.geocode({ address: trimmed });
      const result = response.results[0];
      const location = result?.geometry?.location;
      if (!location) throw new Error("place_lookup_failed");
      const lat = location.lat();
      const lng = location.lng();
      const next = { lat, lng };
      setMapCenter(next);
      setAddressQuery(result?.formatted_address ?? trimmed);
      setAddressInput(result?.formatted_address ?? trimmed);
      setSuggestions([]);
      map.panTo(next);
      map.setZoom(16);
    } catch {
      setStatus({ ok: false, text: "Could not locate that address." });
    } finally {
      setIsResolvingAddress(false);
    }
  };
  const selectAddress = async (suggestion: AddressSuggestion) => {
    if (!map || !mapsApiKey) {
      setStatus({ ok: false, text: "Map is still loading. Try again." });
      return;
    }
    if (!suggestion.placeId || suggestion.placeId.includes("-")) {
      await resolveAddressQuery(suggestion.description);
      return;
    }
    setIsResolvingAddress(true);
    try {
      if (!geocoder) throw new Error("Geocoder not loaded");
      const response = await geocoder.geocode({ placeId: suggestion.placeId });
      const result = response.results[0];
      const location = result?.geometry?.location;
      if (!location) throw new Error("Place lookup failed");
      const lat = location.lat();
      const lng = location.lng();
      const next = { lat, lng };
      setMapCenter(next);
      setAddressQuery(result?.formatted_address ?? suggestion.description);
      setAddressInput(result?.formatted_address ?? suggestion.description);
      map.panTo(next);
      map.setZoom(16);
      setSuggestions([]);
    } catch {
      setStatus({ ok: false, text: "Could not locate that address." });
    } finally {
      setIsResolvingAddress(false);
    }
  };
  // Travel mode meta
  const TRAVEL_MODES: { id: TravelMode; label: string; icon: ReactNode }[] = [
    { id: "DRIVING",  label: "Drive",   icon: <Car size={11} /> },
    { id: "WALKING",  label: "Walk",    icon: <User size={11} /> },
    { id: "BICYCLING",label: "Cycle",   icon: <Bike size={11} /> },
    { id: "TRANSIT",  label: "Transit", icon: <Train size={11} /> },
  ];
  const TOOLBAR_TOOLS: Array<{ id: DrawTool; label: string; icon: ReactNode }> = [
    { id: "select", label: "Select", icon: <MousePointer2 size={12} /> },
    { id: "line", label: "Line", icon: <Minus size={12} /> },
    { id: "arrow", label: "Arrow", icon: <Workflow size={12} /> },
    { id: "rectangle", label: "Box", icon: <RectangleHorizontal size={12} /> },
    { id: "circle", label: "Circle", icon: <Circle size={12} /> },
    { id: "polygon", label: "Polygon", icon: <Pentagon size={12} /> },
    { id: "marker", label: "Pin", icon: <MapPin size={12} /> },
  ];
  return (
    <div className="border-b border-gray-100 bg-white px-2 py-2 sm:px-4 flex flex-col gap-2 relative z-20">
      {/* ── ROW 1: Search & Main Modes ── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search Input Group */}
        <div className="relative flex-1 min-w-[200px] h-9 flex items-center rounded-lg border border-gray-200 bg-gray-50/50 hover:bg-white focus-within:bg-white focus-within:border-[#1E3A8A] focus-within:ring-1 focus-within:ring-[#1E3A8A]/20 transition-all px-2.5">
          <Search size={14} className="text-gray-400 shrink-0" />
          <input
            type="text"
            value={addressInput}
            onChange={(event) => {
              setAddressInput(event.target.value);
              setAddressQuery(event.target.value);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void resolveAddressQuery(addressInput);
              }
            }}
            placeholder="Search location, address or coordinates..."
            className="w-full h-full bg-transparent text-xs text-gray-800 outline-none placeholder:text-gray-400 ml-2"
          />
          <button
            onClick={goToCurrentLocation}
            className="ml-1 flex items-center justify-center w-6 h-6 rounded-md hover:bg-gray-100 text-gray-400 hover:text-[#1E3A8A] transition-colors"
            title="Use current location"
            type="button"
          >
            <LocateFixed size={13} />
          </button>
          {/* Autocomplete Dropdown */}
          {suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 max-h-48 overflow-auto rounded-xl border border-gray-200 bg-white shadow-xl">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.placeId}
                  onClick={() => void selectAddress(suggestion)}
                  className="w-full flex items-start gap-2 border-b border-gray-50 px-3 py-2.5 text-left hover:bg-[#FF4D00]/5 transition-colors last:border-b-0 group"
                  type="button"
                >
                  <MapPin size={14} className="mt-0.5 shrink-0 text-gray-400 group-hover:text-[#FF4D00]" />
                  <span className="text-xs text-gray-700 leading-snug group-hover:text-gray-900">{suggestion.description}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        {/* Global Controls */}
        <div className="flex bg-gray-100/80 p-1 rounded-lg border border-gray-200/60 shrink-0">
          <button
            onClick={() => setMapMode("markup")}
            className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition-all ${mapMode === "markup" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
          >
            Markup
          </button>
          <button
            onClick={() => setMapMode("directions")}
            className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition-all ${mapMode === "directions" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
          >
            Directions
          </button>
        </div>
        <button
          onClick={() => setIsThreeD(!isThreeD)}
          className={`h-9 px-3 flex items-center justify-center rounded-lg text-[11px] font-bold transition-all border ${isThreeD ? "bg-[#1E3A8A] border-[#1E3A8A] text-white" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300"}`}
        >
          3D View
        </button>
        <button
          onClick={onToggleSharePanel}
          className="h-9 px-3 flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white text-[11px] font-bold text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all ml-auto sm:ml-0"
        >
          <Share size={13} /> Share
        </button>
      </div>
      {/* ── ROW 2: Contextual Tools ── */}
      {mapMode === "markup" && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <div className="flex items-center p-1 bg-gray-50 border border-gray-200 rounded-lg">
            {TOOLBAR_TOOLS.map((toolButton) => (
              <button
                key={toolButton.id}
                type="button"
                onClick={() => setDrawingTool(toolButton.id)}
                className={`flex items-center justify-center w-8 h-8 rounded-md transition-all ${tool === toolButton.id ? "bg-white border border-gray-200 text-[#FF4D00] shadow-sm" : "text-gray-500 hover:bg-gray-200/50 hover:text-gray-800"}`}
                title={toolButton.label}
              >
                {toolButton.icon}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5 h-10 px-2.5 bg-gray-50 border border-gray-200 rounded-lg shadow-sm">
            <div className="flex items-center gap-1.5 mr-2">
              <div className="w-5 h-5 rounded-full overflow-hidden border border-gray-300 shadow-inner flex items-center justify-center relative cursor-pointer group">
                <input
                  type="color"
                  value={strokeColor}
                  onChange={(e) => setStrokeColor(e.target.value)}
                  className="absolute -inset-2 w-10 h-10 cursor-pointer opacity-0"
                  title="Stroke Color"
                />
                <div className="w-full h-full" style={{ backgroundColor: strokeColor }} />
              </div>
              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Line</span>
            </div>
            <div className="flex items-center gap-1.5 mr-2 text-gray-300">|</div>
            <div className="flex items-center gap-1.5 mr-2">
              <div className="w-5 h-5 rounded-full overflow-hidden border border-gray-300 shadow-inner flex items-center justify-center relative cursor-pointer relative">
                <input
                  type="color"
                  value={fillColor}
                  onChange={(e) => setFillColor(e.target.value)}
                  className="absolute -inset-2 w-10 h-10 cursor-pointer opacity-0"
                  title="Fill Color"
                />
                <div className="w-full h-full" style={{ backgroundColor: fillColor }} />
                {fillColor === "transparent" && (
                  <div className="absolute inset-0 flex items-center justify-center text-red-500 bg-white">
                    <X size={14} />
                  </div>
                )}
              </div>
              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Fill</span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-300">|</div>
            <div className="flex items-center gap-1.5 ml-2">
              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Size</span>
              <input
                type="range"
                min="1"
                max="10"
                value={strokeWeight}
                onChange={(e) => setStrokeWeight(Number(e.target.value))}
                className="w-16 accent-gray-500"
              />
            </div>
          </div>
          <button
            onClick={() => clearMarkup()}
            className="h-10 px-3 flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all text-[11px] font-bold text-gray-600"
            title="Clear all drawings"
          >
            <Eraser size={13} /> Clear
          </button>
        </div>
      )}
      {mapMode === "directions" && (
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 pt-1">
          <div className="flex flex-1 sm:flex-none items-center gap-1">
            <div className="flex flex-col min-w-[200px] flex-1 gap-1">
              <div className="relative flex items-center h-8 rounded-lg border border-gray-200 bg-gray-50/50 hover:bg-white focus-within:bg-white focus-within:border-[#1E3A8A] transition-all px-2 overflow-hidden">
                <div className="w-2 h-2 rounded-full border-2 border-blue-500 shrink-0 mr-2" />
                <input
                  type="text"
                  value={originInput}
                  onChange={(e) => setOriginInput(e.target.value)}
                  placeholder="Starting point"
                  className="w-full bg-transparent text-xs text-gray-800 outline-none"
                />
              </div>
              <div className="relative flex items-center h-8 rounded-lg border border-gray-200 bg-gray-50/50 hover:bg-white focus-within:bg-white focus-within:border-[#FF4D00] transition-all px-2 overflow-hidden">
                <MapPin size={12} className="text-[#FF4D00] shrink-0 mr-2" />
                <input
                  type="text"
                  value={destInput}
                  onChange={(e) => setDestInput(e.target.value)}
                  placeholder="Destination"
                  className="w-full bg-transparent text-xs text-gray-800 outline-none"
                />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center p-0.5 bg-gray-100 border border-gray-200 rounded-lg">
              <button
                onClick={() => setTravelMode("DRIVING")}
                className={`flex items-center justify-center h-8 px-3 rounded-md transition-all text-xs font-semibold ${travelMode === "DRIVING" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-800"}`}
              >
                Drive
              </button>
              <button
                onClick={() => setTravelMode("WALKING")}
                className={`flex items-center justify-center h-8 px-3 rounded-md transition-all text-xs font-semibold ${travelMode === "WALKING" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-800"}`}
              >
                Walk
              </button>
            </div>
            <button
              onClick={() => void getDirections(originInput, destInput, travelMode)}
              disabled={isLoadingRoute || !originInput || !destInput}
              className="h-9 px-4 flex items-center justify-center gap-1.5 rounded-lg bg-[#FF4D00] text-xs font-bold text-white hover:bg-[#E64500] disabled:opacity-50 transition-all shadow-sm"
            >
              {isLoadingRoute ? <Loader2 size={13} className="animate-spin" /> : "Calculate"}
            </button>
            <button
              onClick={() => {
                clearDirections();
                onRouteReady?.(null);
              }}
              className="h-9 w-9 flex items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all text-gray-500"
              title="Clear Route"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
function MapUpdater({ center, isThreeD }: { center: { lat: number; lng: number }; isThreeD: boolean }) {
  const map = useMap("main-map");
  const prevCenterRef = useRef<{lat: number, lng: number} | null>(null);
  const prevThreeDRef = useRef<boolean | null>(null);
  // Pan to new center only when the center state actually changes
  useEffect(() => {
    if (map && center) {
      if (!prevCenterRef.current || 
          Math.abs(prevCenterRef.current.lat - center.lat) > 0.0001 || 
          Math.abs(prevCenterRef.current.lng - center.lng) > 0.0001) {
        map.panTo(center);
        prevCenterRef.current = center;
      }
    }
  }, [map, center]);
  // Update map type and tilt when 3D mode changes
  useEffect(() => {
    if (!map) return;
    if (prevThreeDRef.current === isThreeD) return;
    prevThreeDRef.current = isThreeD;
    map.setMapTypeId(isThreeD ? "satellite" : "roadmap");
    map.setTilt(isThreeD ? 45 : 0);
  }, [map, isThreeD]);
  return null;
}
export default function LocationMap({ center, locationLabel, contactRecipients = [], compact = false, expanded = false }: LocationMapProps) {
  const pathname = usePathname();
  const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || undefined;
  const mapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isExportingAudit, setIsExportingAudit] = useState(false);
  const [strokeColor, setStrokeColor] = useState("#FF4D00");
  const [fillColor, setFillColor] = useState("#1E3A8A");
  const [strokeWeight, setStrokeWeight] = useState(3);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [folders, setFolders] = useState<FolderOption[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState("");
  const [recipientMode, setRecipientMode] = useState<"email" | "phone">("email");
  const [recipientValue, setRecipientValue] = useState("");
  const [selectedContact, setSelectedContact] = useState("");
  const [addressQuery, setAddressQuery] = useState(locationLabel ?? "");
  const [lastFileId, setLastFileId] = useState<string | null>(null);
  const [lastShareUrl, setLastShareUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [mapCenter, setMapCenter] = useState(center ?? { lat: 40.7128, lng: -74.0060 });
  const [isThreeD, setIsThreeD] = useState(true);
  const [showSharePanel, setShowSharePanel] = useState(false);
  const [controlsExpanded, setControlsExpanded] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [widgetDiagEnabled, setWidgetDiagEnabled] = useState(false);
  const [diagTick, setDiagTick] = useState(0);
  const mapRef = useRef<HTMLDivElement>(null);
  const controlsHeaderRef = useRef<HTMLDivElement>(null);
  const controlsPanelRef = useRef<HTMLDivElement>(null);
  const mapCanvasRef = useRef<HTMLDivElement>(null);
  const expandedView = expanded;
  const requestCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus({ ok: false, text: "Geolocation is not supported in this browser." });
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextCenter = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setMapCenter(nextCenter);
        const coordStr = `${nextCenter.lat.toFixed(5)}, ${nextCenter.lng.toFixed(5)}`;
        setAddressQuery(coordStr);
        setStatus({ ok: true, text: "Map centered to your current location." });
        setIsLocating(false);
      },
      () => {
        setStatus({ ok: false, text: "Unable to retrieve your current location." });
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      }
    );
  }, []);
  useEffect(() => {
    if (center) setMapCenter(center);
  }, [center]);
  useEffect(() => {
    if (center) return;
    requestCurrentLocation();
  }, [center, requestCurrentLocation]);
  useEffect(() => {
    if (locationLabel && !addressQuery) {
      setAddressQuery(locationLabel);
    }
  }, [locationLabel, addressQuery]);
  useEffect(() => {
    if (expandedView) {
      setControlsExpanded(true);
    } else {
      setControlsExpanded(false);
    }
  }, [expandedView]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const enabled = params.get("widgetDiag") === "1";
    setWidgetDiagEnabled(enabled);
  }, []);
  useEffect(() => {
    if (!widgetDiagEnabled) return;
    const id = window.setInterval(() => setDiagTick((v) => v + 1), 1200);
    return () => window.clearInterval(id);
  }, [widgetDiagEnabled]);
  const diagSnapshot = useMemo(() => {
    if (!widgetDiagEnabled || typeof window === "undefined") return null;
    const mapHeight = Math.round(mapCanvasRef.current?.getBoundingClientRect().height ?? 0);
    const topBarHeight = Math.round(controlsHeaderRef.current?.getBoundingClientRect().height ?? 0);
    const panelHeight = Math.round(controlsPanelRef.current?.getBoundingClientRect().height ?? 0);
    const total = mapHeight + topBarHeight + panelHeight;
    const mapPct = total > 0 ? Math.round((mapHeight / total) * 100) : 0;
    let dashboardPrefs = "missing";
    let hubPrefs = "missing";
    try {
      dashboardPrefs = localStorage.getItem("slate360-dashboard-widgets") ? "present" : "missing";
      hubPrefs = localStorage.getItem("slate360-hub-widgets") ? "present" : "missing";
    } catch {
      dashboardPrefs = "blocked";
      hubPrefs = "blocked";
    }
    return {
      route: pathname,
      compact,
      isExpanded: expandedView,
      controlsExpanded,
      isThreeD,
      mapsApiKeyPresent: Boolean(mapsApiKey),
      mapHeight,
      topBarHeight,
      panelHeight,
      mapPct,
      dashboardPrefs,
      hubPrefs,
      tick: diagTick,
    };
  }, [widgetDiagEnabled, pathname, compact, expandedView, controlsExpanded, isThreeD, diagTick, mapsApiKey]);
  useEffect(() => {
    if (!widgetDiagEnabled || !diagSnapshot) return;
    console.info("[widget-diag][location]", diagSnapshot);
  }, [widgetDiagEnabled, diagSnapshot]);
  const selectedFolder = useMemo(
    () => folders.find((folder) => folder.id === selectedFolderId) ?? null,
    [folders, selectedFolderId]
  );
  const recipientOptions = useMemo(() => {
    return contactRecipients.reduce<Array<{ label: string; email?: string; phone?: string }>>((acc, contact) => {
      const email = contact.email?.trim();
      const phone = contact.phone?.trim();
      if (!email && !phone) return acc;
      acc.push({
        label: `${contact.name}${email ? ` · ${email}` : phone ? ` · ${phone}` : ""}`,
        email,
        phone,
      });
      return acc;
    }, []);
  }, [contactRecipients]);
  useEffect(() => {
    let cancelled = false;
    const loadProjects = async () => {
      try {
        const res = await fetch("/api/dashboard/widgets", { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !Array.isArray(data?.projects)) {
          return;
        }
        if (cancelled) return;
        const normalized = (data.projects as Array<{ id: string; name: string }>).map((project) => ({
          id: project.id,
          name: project.name,
        }));
        setProjects(normalized);
        if (normalized.length > 0) {
          setSelectedProjectId((prev) => prev || normalized[0].id);
        }
      } catch {
        // silently ignore dashboard data load failures
      }
    };
    void loadProjects();
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    let cancelled = false;
    const loadFolders = async () => {
      if (!selectedProjectId) {
        setFolders([]);
        setSelectedFolderId("");
        return;
      }
      try {
        const res = await fetch(`/api/slatedrop/project-folders?projectId=${encodeURIComponent(selectedProjectId)}`, { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !Array.isArray(data?.folders)) {
          if (!cancelled) {
            setFolders([]);
            setSelectedFolderId("");
          }
          return;
        }
        if (cancelled) return;
        const normalized = (data.folders as FolderOption[]).map((folder) => ({
          id: folder.id,
          name: folder.name,
          path: folder.path,
        }));
        setFolders(normalized);
        setSelectedFolderId((prev) => {
          if (prev && normalized.some((folder) => folder.id === prev)) return prev;
          return normalized[0]?.id ?? "";
        });
      } catch {
        if (!cancelled) {
          setFolders([]);
          setSelectedFolderId("");
        }
      }
    };
    void loadFolders();
    return () => {
      cancelled = true;
    };
  }, [selectedProjectId]);
  const createPdfBlob = async () => {
    const { default: jsPDF } = await import("jspdf");
    const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 10;
    // ── Build Static Maps API URL ──────────────────────────────
    const staticParams = new URLSearchParams();
    staticParams.set("center", `${mapCenter.lat},${mapCenter.lng}`);
    staticParams.set("zoom", "13");
    staticParams.set("size", "800x450");
    staticParams.set("maptype", isThreeD ? "satellite" : "roadmap");
    if (routeData?.encodedPolyline) {
      staticParams.set("path", `weight:4|color:0xFF4D00FF|enc:${routeData.encodedPolyline}`);
      staticParams.append("markers", `color:green|label:A|${routeData.origin}`);
      staticParams.append("markers", `color:red|label:B|${routeData.destination}`);
    } else {
      staticParams.append("markers", `color:red|${mapCenter.lat},${mapCenter.lng}`);
    }
    // Fetch map image from our server-side proxy (avoids CORS / oklch issues)
    let mapImgData: string | null = null;
    try {
      const imgRes = await fetch(`/api/static-map?${staticParams.toString()}`);
      if (imgRes.ok) {
        const imgBlob = await imgRes.blob();
        const reader = new FileReader();
        mapImgData = await new Promise<string>((resolve, reject) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(imgBlob);
        });
      }
    } catch (e) {
      console.warn("Static map fetch failed, using text-only PDF", e);
    }
    // ── Compose PDF ───────────────────────────────────────────
    if (mapImgData) {
      const imgW = pageW - margin * 2;
      const imgH = pageH * 0.60;
      pdf.addImage(mapImgData, "PNG", margin, margin, imgW, imgH);
      let y = margin + imgH + 6;
      pdf.setFontSize(13);
      pdf.setFont("helvetica", "bold");
      pdf.text("SLATE360 — Map Export", margin, y); y += 6;
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");
      pdf.text(`Generated: ${new Date().toLocaleString()}`, margin, y); y += 4;
      if (addressQuery) { pdf.text(`Location: ${addressQuery}`, margin, y); y += 4; }
      pdf.text(`Center: ${mapCenter.lat.toFixed(6)}, ${mapCenter.lng.toFixed(6)}`, margin, y); y += 5;
      if (routeData) {
        pdf.setFont("helvetica", "bold");
        pdf.text("Directions", margin, y); y += 5;
        pdf.setFont("helvetica", "normal");
        pdf.text(`From: ${routeData.origin}`, margin, y); y += 4;
        pdf.text(`To: ${routeData.destination}`, margin, y); y += 4;
        pdf.text(`Mode: ${routeData.travelMode}  ·  Distance: ${routeData.distance}  ·  Duration: ${routeData.duration}`, margin, y); y += 5;
        pdf.setTextColor(0, 102, 204);
        pdf.textWithLink("Open in Google Maps", margin, y, { url: routeData.googleMapsUrl });
        pdf.setTextColor(0, 0, 0);
      }
    } else {
      // Fallback text-only layout
      let y = 20;
      pdf.setFontSize(18);
      pdf.setFont("helvetica", "bold");
      pdf.text("SLATE360 — Map Export", 14, y); y += 10;
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.text(`Generated: ${new Date().toLocaleString()}`, 14, y); y += 6;
      pdf.text(`Location: ${addressQuery || "N/A"}`, 14, y); y += 6;
      pdf.text(`Center: ${mapCenter.lat.toFixed(6)}, ${mapCenter.lng.toFixed(6)}`, 14, y); y += 8;
      if (routeData) {
        pdf.setFont("helvetica", "bold");
        pdf.text("Directions", 14, y); y += 6;
        pdf.setFont("helvetica", "normal");
        pdf.text(`From: ${routeData.origin}`, 14, y); y += 5;
        pdf.text(`To: ${routeData.destination}`, 14, y); y += 5;
        pdf.text(`Mode: ${routeData.travelMode}  ·  Distance: ${routeData.distance}  ·  Duration: ${routeData.duration}`, 14, y); y += 6;
        pdf.setTextColor(0, 102, 204);
        pdf.textWithLink(`Open in Google Maps: ${routeData.googleMapsUrl}`, 14, y, { url: routeData.googleMapsUrl });
        pdf.setTextColor(0, 0, 0);
        y += 8;
      }
      pdf.text("Tip: Open the Google Maps link to navigate in real-time.", 14, y);
    }
    const blob = pdf.output("blob");
    return { blob, filename: `map-export-${Date.now()}.pdf` };
  };
  const handleDownloadPDF = async () => {
    setIsDownloading(true);
    setStatus(null);
    try {
      const { blob, filename } = await createPdfBlob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setStatus({ ok: true, text: "Map exported to PDF." });
    } catch (error) {
      console.error("Failed to generate PDF", error);
      setStatus({ ok: false, text: "Failed to export PDF." });
    } finally {
      setIsDownloading(false);
    }
  };
  const handleSaveToFolder = async () => {
    if (!selectedProjectId || !selectedFolderId || !selectedFolder) {
      setStatus({ ok: false, text: "Choose a project folder first." });
      return;
    }
    setIsSaving(true);
    setStatus(null);
    try {
      const { blob, filename } = await createPdfBlob();
      const urlRes = await fetch("/api/slatedrop/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename,
          contentType: "application/pdf",
          size: blob.size,
          folderId: selectedFolderId,
          folderPath: selectedFolder.path,
        }),
      });
      const urlData = await urlRes.json().catch(() => ({}));
      if (!urlRes.ok || !urlData?.uploadUrl || !urlData?.fileId) {
        throw new Error(urlData?.error ?? "Failed to reserve upload");
      }
      const putRes = await fetch(urlData.uploadUrl as string, {
        method: "PUT",
        headers: { "Content-Type": "application/pdf" },
        body: blob,
      });
      if (!putRes.ok) {
        throw new Error("Upload failed");
      }
      const completeRes = await fetch("/api/slatedrop/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId: urlData.fileId as string }),
      });
      if (!completeRes.ok) {
        throw new Error("Upload finalization failed");
      }
      setLastFileId(urlData.fileId as string);
      setStatus({ ok: true, text: `Saved to ${selectedFolder.name}.` });
    } catch (error) {
      console.error("Failed to save map PDF", error);
      setStatus({ ok: false, text: "Could not save map to SlateDrop." });
    } finally {
      setIsSaving(false);
    }
  };
  const handleSendShareLink = async () => {
    const recipient = recipientValue.trim();
    if (!recipient) {
      setStatus({ ok: false, text: recipientMode === "email" ? "Recipient email is required." : "Recipient phone is required." });
      return;
    }
    // If we have a saved file, share via secure link
    if (lastFileId) {
      setIsSharing(true);
      setStatus(null);
      try {
        const res = await fetch("/api/slatedrop/secure-send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileId: lastFileId,
            email: recipientMode === "email" ? recipient : undefined,
            phone: recipientMode === "phone" ? recipient : undefined,
            permission: "download",
            expiryDays: 7,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.shareUrl) throw new Error(data?.error ?? "Failed to generate share link");
        setLastShareUrl(data.shareUrl as string);
        setStatus({ ok: true, text: recipientMode === "email" ? "Secure email link sent." : "Share link generated for phone delivery." });
        if (recipientMode === "phone" && data?.smsUrl) window.open(data.smsUrl as string, "_blank");
      } catch (error) {
        console.error("Failed to send secure link", error);
        setStatus({ ok: false, text: "Could not send secure link." });
      } finally {
        setIsSharing(false);
      }
      return;
    }
    // Fallback: if route data exists, share Google Maps directions link directly
    if (routeData) {
      const shareUrl = routeData.googleMapsUrl;
      if (recipientMode === "phone") {
        const smsBody = encodeURIComponent(`Directions from ${routeData.origin} to ${routeData.destination} (${routeData.distance}, ${routeData.duration}): ${shareUrl}`);
        window.open(`sms:${recipient}?body=${smsBody}`, "_blank");
        setStatus({ ok: true, text: "SMS opened with route link." });
      } else {
        const mailSubject = encodeURIComponent("Directions via Slate360");
        const mailBody = encodeURIComponent(`Here are directions from ${routeData.origin} to ${routeData.destination}:\n\nMode: ${routeData.travelMode}\nDistance: ${routeData.distance}\nDuration: ${routeData.duration}\n\nOpen in Google Maps: ${shareUrl}`);
        window.open(`mailto:${recipient}?subject=${mailSubject}&body=${mailBody}`, "_blank");
        setStatus({ ok: true, text: "Email opened with route link." });
      }
      return;
    }
    setStatus({ ok: false, text: "Save the map to a project folder first, or get directions to share a route link." });
  };
  const handleCopyShareLink = async () => {
    if (!lastShareUrl) return;
    try {
      await navigator.clipboard.writeText(lastShareUrl);
      setStatus({ ok: true, text: "Share link copied." });
    } catch {
      setStatus({ ok: false, text: "Could not copy share link." });
    }
  };
  const handleExportAuditPackage = async () => {
    if (!selectedProjectId) {
      setStatus({ ok: false, text: "Select a project before exporting an audit package." });
      return;
    }
    setIsExportingAudit(true);
    setStatus(null);
    try {
      const res = await fetch("/api/slatedrop/project-audit-export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: selectedProjectId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Unable to export audit package");
      }
      const blob = await res.blob();
      const projectName = projects.find((project) => project.id === selectedProjectId)?.name ?? "project";
      const filename = `${projectName.replace(/[^a-zA-Z0-9._-]+/g, "-")}-audit-package-${new Date().toISOString().slice(0, 10)}.zip`;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setStatus({ ok: true, text: "Audit package exported successfully." });
    } catch (error) {
      console.error("Failed to export audit package", error);
      setStatus({ ok: false, text: "Could not export audit package." });
    } finally {
      setIsExportingAudit(false);
    }
  };
  const renderMapCanvas = (mode: "inline" | "expanded") => {
    const isModal = mode === "expanded";
    const showToolbar = isModal;
    const toolbarShellClass = "shrink-0 overflow-visible";
    return (
      <div className={`relative flex flex-col ${isModal ? "h-full min-h-[70vh]" : compact ? "flex-1 min-h-[200px]" : "flex-1 min-h-[420px]"}`} ref={isModal ? undefined : mapRef}>
        <APIProvider apiKey={mapsApiKey} libraries={["places", "drawing", "geometry"]}>
          <MapUpdater center={mapCenter} isThreeD={isThreeD} />
          {showToolbar && (
            <div ref={controlsPanelRef} className={toolbarShellClass}>
              <DrawController
                setStatus={setStatus}
                strokeColor={strokeColor}
                fillColor={fillColor}
                strokeWeight={strokeWeight}
                setStrokeColor={setStrokeColor}
                setFillColor={setFillColor}
                setStrokeWeight={setStrokeWeight}
                setAddressQuery={setAddressQuery}
                setMapCenter={setMapCenter}
                condensed={true}
                isThreeD={isThreeD}
                setIsThreeD={setIsThreeD}
                onToggleSharePanel={() => setShowSharePanel(!showSharePanel)}
                onRouteReady={setRouteData}
              />
            </div>
          )}
          {showSharePanel && showToolbar && (
            <div className="relative z-10 border-b border-gray-100 bg-gray-50/50 px-2 py-2 sm:px-4 shadow-inner">
              {routeData && (
                <div className="mb-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900 shadow-sm flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                    <MapPin size={12} />
                  </div>
                  <span><span className="font-bold">Route Data:</span> {routeData.origin} &rarr; {routeData.destination} &middot; {routeData.distance} &middot; {routeData.duration} &middot; {routeData.travelMode.toLowerCase()}</span>
                </div>
              )}
              <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2">
                <div className="flex flex-1 sm:flex-none items-center gap-2 bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
                  <select
                    value={selectedProjectId}
                    onChange={(event) => setSelectedProjectId(event.target.value)}
                    className="h-8 flex-1 sm:min-w-[130px] rounded-md border-0 bg-transparent px-2 text-xs font-medium text-gray-700 outline-none focus:ring-2 focus:ring-[#1E3A8A]/20"
                  >
                    <option value="">Select project</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                  </select>
                  <div className="w-px h-5 bg-gray-200" />
                  <select
                    value={selectedFolderId}
                    onChange={(event) => setSelectedFolderId(event.target.value)}
                    disabled={!selectedProjectId || folders.length === 0}
                    className="h-8 flex-1 sm:min-w-[130px] rounded-md border-0 bg-transparent px-2 text-xs font-medium text-gray-700 outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 disabled:opacity-50"
                  >
                    <option value="">Select folder</option>
                    {folders.map((folder) => (
                      <option key={folder.id} value={folder.id}>{folder.name}</option>
                    ))}
                  </select>
                  <div className="w-px h-5 bg-gray-200" />
                  <button
                    onClick={handleSaveToFolder}
                    disabled={isSaving || !selectedFolderId}
                    className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md px-3 text-xs font-bold text-[#FF4D00] hover:bg-[#FF4D00]/10 disabled:opacity-50 transition-colors"
                  >
                    {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save
                  </button>
                </div>
                <div className="flex flex-1 sm:flex-none items-center gap-2 bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
                  <div className="flex items-center bg-gray-100 rounded-md p-0.5 shrink-0">
                    <button onClick={() => setRecipientMode("email")} className={`px-2.5 py-1 rounded-[4px] text-[10px] font-bold uppercase tracking-wider transition-colors ${recipientMode === "email" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>Email</button>
                    <button onClick={() => setRecipientMode("phone")} className={`px-2.5 py-1 rounded-[4px] text-[10px] font-bold uppercase tracking-wider transition-colors ${recipientMode === "phone" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>SMS</button>
                  </div>
                  <input
                    type={recipientMode === "email" ? "email" : "tel"}
                    value={recipientValue}
                    onChange={(e) => setRecipientValue(e.target.value)}
                    placeholder={recipientMode === "email" ? "client@example.com" : "+1 (555) 000-0000"}
                    className="h-8 flex-1 sm:min-w-[150px] rounded-md border-0 bg-transparent px-2 text-xs font-medium text-gray-700 outline-none focus:ring-2 focus:ring-[#1E3A8A]/20"
                  />
                  <button
                    onClick={handleSendShareLink}
                    disabled={isSharing || (!lastFileId && !routeData) || !recipientValue}
                    className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-[#1E3A8A] px-3 py-1 text-[11px] font-bold text-white hover:bg-[#162D69] disabled:opacity-50 transition-colors shadow-sm"
                  >
                    {isSharing ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} Send
                  </button>
                </div>
                <button
                  onClick={handleDownloadPDF}
                  disabled={isDownloading}
                  className="ml-auto inline-flex h-10 px-4 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white text-xs font-bold text-gray-700 transition-colors hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 shadow-sm"
                >
                  {isDownloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Download PDF
                </button>
              </div>
              {status && (
                <div className={`mt-2 px-3 py-2 rounded-lg border text-xs font-bold flex items-center gap-2 ${status.ok ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-700"}`}>
                  {status.ok ? <Save size={14} /> : <X size={14} />} {status.text}
                </div>
              )}
            </div>
          )}
          <div ref={mapCanvasRef} className={`flex-1 relative min-h-0 ${isModal ? "min-h-[55vh]" : "min-h-[180px]"}`}>
            {mapsApiKey ? (
              <Map
                id="main-map"
                className="w-full h-full absolute inset-0"
                style={{ width: '100%', height: '100%' }}
                defaultZoom={13}
                defaultCenter={mapCenter}
                mapId={mapId}
                gestureHandling={"greedy"}
                disableDefaultUI={false}
                zoomControl={true}
                streetViewControl={false}
                fullscreenControl={false}
                mapTypeControl={false}
                tiltInteractionEnabled={true}
                headingInteractionEnabled={true}
              >
              </Map>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center rounded-lg border border-amber-300 bg-amber-50 px-4 text-center">
                <p className="text-xs font-semibold text-amber-900">
                  Google Maps key missing in deployment (`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`).
                </p>
              </div>
            )}
          </div>
        </APIProvider>
      </div>
    );
  };
  return (
    <div className="flex flex-col h-full overflow-hidden -mx-6 -mb-0">
      {renderMapCanvas(expandedView ? "expanded" : "inline")}
      {widgetDiagEnabled && diagSnapshot && (
        <div className="px-2 pb-2">
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-2 py-1 text-[10px] text-amber-900">
            diag route={diagSnapshot.route} compact={String(diagSnapshot.compact)} expanded={String(diagSnapshot.isExpanded)} controls={String(diagSnapshot.controlsExpanded)} sat={String(diagSnapshot.isThreeD)} map={diagSnapshot.mapPct}% (h={diagSnapshot.mapHeight}) dStore={diagSnapshot.dashboardPrefs} hStore={diagSnapshot.hubPrefs}
          </div>
        </div>
      )}
    </div>
  );
}
