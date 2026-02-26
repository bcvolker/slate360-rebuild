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
};

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
  const routesLib = useMapsLibrary("routes");
  const drawingLib = useMapsLibrary("drawing");

  const geocoder = useMemo(() => geocodingLib ? new geocodingLib.Geocoder() : null, [geocodingLib]);
  const autocompleteService = useMemo(() => placesLib ? new placesLib.AutocompleteService() : null, [placesLib]);
  const directionsService = useMemo(() => routesLib ? new routesLib.DirectionsService() : null, [routesLib]);


  const [tool, setTool] = useState<DrawTool>("select");
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isResolvingAddress, setIsResolvingAddress] = useState(false);
  const [addressInput, setAddressInput] = useState("");

  const drawingManagerRef = useRef<any>(null);
  const overlaysRef = useRef<OverlayRecord[]>([]);
  const selectedOverlayIdRef = useRef<string | null>(null);
  const selectedToolRef = useRef<DrawTool>("select");

  // ── Directions mode state ──────────────────────────────────────
  const [mapMode, setMapMode] = useState<"markup" | "directions">("markup");
  const [originInput, setOriginInput] = useState("");
  const [destInput, setDestInput] = useState("");
  const [originSuggestions, setOriginSuggestions] = useState<AddressSuggestion[]>([]);
  const [destSuggestions, setDestSuggestions] = useState<AddressSuggestion[]>([]);
  const [travelMode, setTravelMode] = useState<TravelMode>("DRIVING");
  const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string } | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const directionsRendererRef = useRef<any>(null);
  const directionsServiceRef = useRef<any>(null);

  

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

  // Initialise directions service + renderer only in directions mode
  useEffect(() => {
    if (mapMode !== "directions") return;
    if (!map || !routesLib) return;
    // directionsService is now a useMemo hook
    if (!directionsRendererRef.current) {
      directionsRendererRef.current = new routesLib.DirectionsRenderer({
        suppressMarkers: false,
        polylineOptions: { strokeColor: "#FF4D00", strokeWeight: 4, strokeOpacity: 0.85 },
      });
    }
  }, [map, mapMode, routesLib]);

  // Cleanup directions renderer on unmount
  useEffect(() => {
    return () => {
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setMap(null);
      }
    };
  }, []);

  const getDirections = useCallback(async (origin: string, dest: string, mode: TravelMode) => {
    if (!map || !origin.trim() || !dest.trim()) return;
    if (!directionsService || !routesLib) return;
    if (!directionsRendererRef.current) {
      directionsRendererRef.current = new routesLib.DirectionsRenderer({
        suppressMarkers: false,
        polylineOptions: { strokeColor: "#FF4D00", strokeWeight: 4, strokeOpacity: 0.85 },
      });
    }

    setIsLoadingRoute(true);
    directionsRendererRef.current.setMap(map);

    try {
      const result = await directionsService.route({
        origin: origin.trim(),
        destination: dest.trim(),
        travelMode: mode as unknown as google.maps.TravelMode,
      });
      setIsLoadingRoute(false);
      if (result?.routes?.[0]) {
        directionsRendererRef.current.setDirections(result);
        const leg = result.routes[0].legs[0];
        const dist = leg.distance?.text ?? "";
        const dur = leg.duration?.text ?? "";
        setRouteInfo({ distance: dist, duration: dur });
        const gmapsUrl = buildGoogleMapsUrl(origin, dest, mode);
        onRouteReady({ origin, destination: dest, travelMode: mode, distance: dist, duration: dur, googleMapsUrl: gmapsUrl });
        setStatus({ ok: true, text: `Route: ${dist} · ${dur}` });
      } else {
        setRouteInfo(null);
        setStatus({ ok: false, text: "Could not find a route between those locations." });
      }
    } catch (err: any) {
      setIsLoadingRoute(false);
      setRouteInfo(null);
      const msg = err?.message || "Could not find a route between those locations.";
      setStatus({ ok: false, text: msg });
    }
  }, [map, setStatus, directionsService, routesLib, onRouteReady]);

  const clearDirections = () => {
    if (directionsRendererRef.current) {
      directionsRendererRef.current.setDirections({ routes: [] });
      directionsRendererRef.current.setMap(null);
    }
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
        selectedOverlayIdRef.current = record.id;
        applyStyleToOverlay(record.overlay, record.kind, { strokeColor, fillColor, strokeWeight }, record.arrow);
      })
    );

    return listeners;
  };

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
    <div className="border-b border-gray-100 bg-gray-50/60 px-6 py-1.5 overflow-visible">
      <div className="flex flex-wrap items-center gap-1">
        {/* Address Search */}
        <div className="relative flex-1 min-w-[120px]">
          <div className="flex items-center rounded-md border border-gray-200 bg-white px-1.5 py-1">
            <Search size={11} className="text-gray-400 mr-1 shrink-0" />
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
              placeholder="Address..."
              className="w-full text-[10px] text-gray-700 bg-transparent outline-none"
            />
          </div>
          {suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-40 rounded-md border border-gray-200 bg-white shadow-sm max-h-44 overflow-auto">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.placeId}
                  onClick={() => void selectAddress(suggestion)}
                  className="w-full text-left px-2 py-1.5 text-[10px] text-gray-700 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                >
                  {suggestion.description}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Locate */}
        <button onClick={goToCurrentLocation} className="inline-flex items-center justify-center w-6 h-6 rounded-md border border-gray-200 bg-white text-gray-700 hover:bg-gray-100 shrink-0" title="Use current location">
          <LocateFixed size={11} />
        </button>

        {/* Mode Toggle */}
        <div className="flex items-center rounded-md border border-gray-200 bg-white p-0.5 shrink-0">
          <button onClick={() => setMapMode("markup")} className={`px-1.5 py-0.5 text-[9px] font-semibold rounded-sm ${mapMode === "markup" ? "bg-gray-100 text-gray-800" : "text-gray-500 hover:text-gray-700"}`}>Markup</button>
          <button onClick={() => setMapMode("directions")} className={`px-1.5 py-0.5 text-[9px] font-semibold rounded-sm ${mapMode === "directions" ? "bg-gray-100 text-gray-800" : "text-gray-500 hover:text-gray-700"}`}>Directions</button>
        </div>

        {/* 3D Toggle */}
        <button onClick={() => setIsThreeD(!isThreeD)} className={`inline-flex items-center justify-center px-1.5 h-6 rounded-md border text-[9px] font-semibold shrink-0 ${isThreeD ? "border-[#1E3A8A] text-[#1E3A8A] bg-[#1E3A8A]/10" : "border-gray-200 text-gray-600 bg-white hover:bg-gray-100"}`}>
          3D
        </button>

        {/* Share Toggle */}
        <button onClick={onToggleSharePanel} className="inline-flex items-center justify-center gap-1 px-1.5 h-6 rounded-md border border-gray-200 bg-white text-[9px] font-semibold text-gray-700 hover:bg-gray-100 shrink-0">
          <Share size={10} /> Share
        </button>
      </div>

      {/* Markup Tools Row */}
      {mapMode === "markup" && (
        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
          {TOOLBAR_TOOLS.map((toolButton) => (
            <button
              key={toolButton.id}
              type="button"
              onClick={() => setDrawingTool(toolButton.id)}
              className={`inline-flex items-center justify-center w-6 h-6 rounded-md border ${tool === toolButton.id ? "border-[#FF4D00] text-[#FF4D00] bg-[#FF4D00]/10" : "border-gray-200 text-gray-600 hover:bg-gray-100"}`}
              title={toolButton.label}
            >
              {toolButton.icon}
            </button>
          ))}
          <div className="w-px h-4 bg-gray-200 mx-1" />
          <div className="flex items-center gap-1 rounded-md border border-gray-200 bg-white px-1.5 py-0.5">
            <span className="text-[9px] font-semibold text-gray-500">S</span>
            <input type="color" value={strokeColor} onChange={(e) => setStrokeColor(e.target.value)} className="h-4 w-4 bg-transparent border-0 p-0" />
          </div>
          <div className="flex items-center gap-1 rounded-md border border-gray-200 bg-white px-1.5 py-0.5">
            <span className="text-[9px] font-semibold text-gray-500">F</span>
            <input type="color" value={fillColor} onChange={(e) => setFillColor(e.target.value)} className="h-4 w-4 bg-transparent border-0 p-0" />
          </div>
          <div className="flex items-center gap-1 rounded-md border border-gray-200 bg-white px-1.5 py-0.5 w-20">
            <span className="text-[9px] font-semibold text-gray-500">W</span>
            <input type="range" min={1} max={10} value={strokeWeight} onChange={(e) => setStrokeWeight(Number(e.target.value))} className="w-full" />
          </div>
          <button type="button" onClick={clearMarkup} className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-[10px] font-semibold text-gray-600 hover:bg-gray-100 ml-auto">
            <Trash2 size={10} /> Clear
          </button>
        </div>
      )}

      {/* Directions Row */}
      {mapMode === "directions" && (
        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
          {/* Travel mode selector */}
          <div className="flex items-center gap-1">
            {TRAVEL_MODES.map(({ id, icon, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setTravelMode(id);
                  if (originInput.trim() && destInput.trim()) void getDirections(originInput, destInput, id);
                }}
                className={`inline-flex items-center justify-center w-6 h-6 rounded-md border transition-colors ${
                  travelMode === id
                    ? "border-[#1E3A8A] bg-[#1E3A8A]/10 text-[#1E3A8A]"
                    : "border-gray-200 text-gray-500 hover:bg-gray-100"
                }`}
                title={label}
              >
                {icon}
              </button>
            ))}
          </div>
          <div className="w-px h-4 bg-gray-200 mx-1" />
          {/* Origin */}
          <div className="relative w-32 shrink-0">
            <div className="flex items-center rounded-md border border-gray-200 bg-white px-1.5 py-1 gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <input
                type="text"
                value={originInput}
                onChange={(e) => setOriginInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && destInput.trim()) void getDirections(originInput, destInput, travelMode); }}
                placeholder="Start…"
                className="flex-1 text-[10px] text-gray-700 bg-transparent outline-none"
              />
            </div>
            {originSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-30 rounded-md border border-gray-200 bg-white shadow-md max-h-40 overflow-auto">
                {originSuggestions.map((s) => (
                  <button key={s.placeId} type="button" onClick={() => void selectOriginSug(s)}
                    className="w-full text-left px-2 py-1.5 text-[10px] text-gray-700 hover:bg-gray-50 border-b border-gray-100 last:border-b-0">
                    {s.description}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button type="button" onClick={swapAddresses} className="w-5 h-5 shrink-0 rounded-md border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100">
            <ArrowUpDown size={9} />
          </button>
          {/* Destination */}
          <div className="relative w-32 shrink-0">
            <div className="flex items-center rounded-md border border-gray-200 bg-white px-1.5 py-1 gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-[#FF4D00] shrink-0" />
              <input
                type="text"
                value={destInput}
                onChange={(e) => setDestInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && originInput.trim()) void getDirections(originInput, destInput, travelMode); }}
                placeholder="End…"
                className="flex-1 text-[10px] text-gray-700 bg-transparent outline-none"
              />
            </div>
            {destSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-30 rounded-md border border-gray-200 bg-white shadow-md max-h-40 overflow-auto">
                {destSuggestions.map((s) => (
                  <button key={s.placeId} type="button" onClick={() => void selectDestSug(s)}
                    className="w-full text-left px-2 py-1.5 text-[10px] text-gray-700 hover:bg-gray-50 border-b border-gray-100 last:border-b-0">
                    {s.description}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => { if (originInput.trim() && destInput.trim()) void getDirections(originInput, destInput, travelMode); }}
            disabled={!originInput.trim() || !destInput.trim() || isLoadingRoute}
            className="inline-flex items-center justify-center gap-1 rounded-md bg-[#1E3A8A] px-2 py-1 text-[10px] font-semibold text-white hover:bg-[#1a3270] disabled:opacity-50"
          >
            {isLoadingRoute ? <Loader2 size={10} className="animate-spin" /> : <Navigation size={10} />} Go
          </button>
          {(originInput || destInput || routeInfo) && (
            <button type="button" onClick={clearDirections} className="inline-flex items-center justify-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-[10px] font-semibold text-gray-600 hover:bg-gray-100">
              <Trash2 size={10} />
            </button>
          )}
          {routeInfo && (
            <>
              <div className="flex items-center gap-1.5 rounded-md bg-emerald-50 border border-emerald-100 px-2 py-1">
                <span className="text-[10px] font-bold text-emerald-800">{routeInfo.distance}</span>
                <span className="text-[9px] text-emerald-400">·</span>
                <span className="text-[10px] font-semibold text-emerald-700">{routeInfo.duration}</span>
              </div>
              <a
                href={buildGoogleMapsUrl(originInput, destInput, travelMode)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1 rounded-md bg-[#FF4D00] px-2 py-1 text-[10px] font-semibold text-white hover:opacity-90"
                title="Open in Google Maps"
              >
                <Navigation size={10} /> Navigate
              </a>
              <button
                type="button"
                onClick={async () => {
                  const url = buildGoogleMapsUrl(originInput, destInput, travelMode);
                  try {
                    await navigator.clipboard.writeText(url);
                    setStatus({ ok: true, text: "Route link copied to clipboard." });
                  } catch {
                    setStatus({ ok: false, text: "Could not copy link." });
                  }
                }}
                className="inline-flex items-center justify-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-[10px] font-semibold text-gray-600 hover:bg-gray-100"
                title="Copy route link"
              >
                <Copy size={10} /> Copy Link
              </button>
              <button
                type="button"
                onClick={onToggleSharePanel}
                className="inline-flex items-center justify-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-[10px] font-semibold text-gray-600 hover:bg-gray-100"
                title="Share route"
              >
                <Share size={10} /> Share
              </button>
            </>
          )}
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
    const { default: html2canvas } = await import("html2canvas");
    const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();

    // Try capturing the map canvas
    let mapImgData: string | null = null;
    if (mapCanvasRef.current) {
      try {
        const canvas = await html2canvas(mapCanvasRef.current, {
          useCORS: true,
          allowTaint: true,
          scale: 2,
          backgroundColor: "#ffffff",
          ignoreElements: (el) => {
            // Skip elements that may use oklch or other unsupported CSS
            return el.tagName === "STYLE" || el.classList?.contains("gm-style-pbc");
          },
        });
        mapImgData = canvas.toDataURL("image/jpeg", 0.92);
      } catch (e) {
        console.warn("html2canvas failed, generating text-only PDF", e);
      }
    }

    if (mapImgData) {
      // Full-width map image
      const margin = 8;
      const imgW = pageW - margin * 2;
      const imgH = pageH * 0.65;
      pdf.addImage(mapImgData, "JPEG", margin, margin, imgW, imgH);

      // Info text below the map
      let y = margin + imgH + 8;
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.text("SLATE360 — Map Export", margin, y);
      y += 7;
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");
      pdf.text(`Generated: ${new Date().toLocaleString()}`, margin, y);
      y += 5;
      if (addressQuery) {
        pdf.text(`Location: ${addressQuery}`, margin, y);
        y += 5;
      }

      if (routeData) {
        y += 2;
        pdf.setFont("helvetica", "bold");
        pdf.text("Directions", margin, y);
        y += 5;
        pdf.setFont("helvetica", "normal");
        pdf.text(`From: ${routeData.origin}`, margin, y); y += 4;
        pdf.text(`To: ${routeData.destination}`, margin, y); y += 4;
        pdf.text(`Mode: ${routeData.travelMode}  ·  Distance: ${routeData.distance}  ·  Duration: ${routeData.duration}`, margin, y); y += 5;
        pdf.setTextColor(0, 102, 204);
        pdf.textWithLink(routeData.googleMapsUrl, margin, y, { url: routeData.googleMapsUrl });
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
        <APIProvider apiKey={mapsApiKey} libraries={["places", "drawing", "geometry", "routes"]}>
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
            <div className="border-b border-gray-100 bg-white px-6 py-2.5 shadow-sm z-10 relative">
              {routeData && (
                <div className="mb-2 rounded-md border border-blue-100 bg-blue-50 px-3 py-1.5 text-[10px] text-blue-900">
                  <span className="font-semibold">Route:</span> {routeData.origin} &rarr; {routeData.destination} &middot; {routeData.distance} &middot; {routeData.duration} &middot; {routeData.travelMode.toLowerCase()}
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={selectedProjectId}
                  onChange={(event) => setSelectedProjectId(event.target.value)}
                  className="rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] text-gray-700 w-32"
                >
                  <option value="">Select project</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>{project.name}</option>
                  ))}
                </select>
                <select
                  value={selectedFolderId}
                  onChange={(event) => setSelectedFolderId(event.target.value)}
                  disabled={!selectedProjectId || folders.length === 0}
                  className="rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] text-gray-700 w-32 disabled:opacity-50"
                >
                  <option value="">Select folder</option>
                  {folders.map((folder) => (
                    <option key={folder.id} value={folder.id}>{folder.name}</option>
                  ))}
                </select>
                <button
                  onClick={handleSaveToFolder}
                  disabled={isSaving || !selectedFolderId}
                  className="inline-flex items-center justify-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-[11px] font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                >
                  {isSaving ? <Loader2 size={10} className="animate-spin" /> : <Save size={10} />} Save
                </button>
                <div className="w-px h-4 bg-gray-200 mx-1" />
                <div className="flex items-center rounded-md border border-gray-200 bg-white p-0.5">
                  <button onClick={() => setRecipientMode("email")} className={`px-2 py-0.5 text-[10px] font-semibold rounded-sm ${recipientMode === "email" ? "bg-gray-100 text-gray-800" : "text-gray-500 hover:text-gray-700"}`}>Email</button>
                  <button onClick={() => setRecipientMode("phone")} className={`px-2 py-0.5 text-[10px] font-semibold rounded-sm ${recipientMode === "phone" ? "bg-gray-100 text-gray-800" : "text-gray-500 hover:text-gray-700"}`}>SMS</button>
                </div>
                <input
                  type={recipientMode === "email" ? "email" : "tel"}
                  value={recipientValue}
                  onChange={(e) => setRecipientValue(e.target.value)}
                  placeholder={recipientMode === "email" ? "client@example.com" : "+1 (555) 000-0000"}
                  className="rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] text-gray-700 w-32 outline-none focus:border-[#1E3A8A]"
                />
                <button
                  onClick={handleSendShareLink}
                  disabled={isSharing || (!lastFileId && !routeData) || !recipientValue}
                  className="inline-flex items-center justify-center gap-1 rounded-md bg-[#FF4D00] px-2 py-1 text-[11px] font-semibold text-white hover:opacity-90 disabled:opacity-50"
                >
                  {isSharing ? <Loader2 size={10} className="animate-spin" /> : <Send size={10} />} Send
                </button>
                <button
                  onClick={handleDownloadPDF}
                  disabled={isDownloading}
                  className="inline-flex items-center justify-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-[11px] font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-50 ml-auto"
                >
                  {isDownloading ? <Loader2 size={10} className="animate-spin" /> : <Download size={10} />} PDF
                </button>
              </div>
              {status && (
                <div className={`mt-2 text-[10px] font-medium ${status.ok ? "text-emerald-600" : "text-red-600"}`}>
                  {status.text}
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
