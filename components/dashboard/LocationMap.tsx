"use client";

import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { APIProvider, AdvancedMarker, Map, useMap } from "@vis.gl/react-google-maps";
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
}) {
  const map = useMap();
  const mapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

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
      void fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(trimmed)}&key=${mapsApiKey}`)
        .then((r) => r.json())
        .then((data: any) => {
          setOriginSuggestions(
            (data.results ?? []).slice(0, 5)
              .map((r: any) => ({ placeId: r.place_id ?? "", description: r.formatted_address ?? "" }))
              .filter((s: AddressSuggestion) => s.placeId && s.description)
          );
        }).catch(() => setOriginSuggestions([]));
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [originInput, mapsApiKey]);

  // destination autocomplete
  useEffect(() => {
    const trimmed = destInput.trim();
    if (!trimmed || trimmed.length < 3 || !mapsApiKey) { setDestSuggestions([]); return; }
    const timeout = window.setTimeout(() => {
      void fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(trimmed)}&key=${mapsApiKey}`)
        .then((r) => r.json())
        .then((data: any) => {
          setDestSuggestions(
            (data.results ?? []).slice(0, 5)
              .map((r: any) => ({ placeId: r.place_id ?? "", description: r.formatted_address ?? "" }))
              .filter((s: AddressSuggestion) => s.placeId && s.description)
          );
        }).catch(() => setDestSuggestions([]));
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [destInput, mapsApiKey]);

  // Initialise directions service + renderer only in directions mode
  useEffect(() => {
    if (mapMode !== "directions") return;
    if (!map || !(window as any).google?.maps) return;
    const mapsApi = (window as any).google.maps;
    if (!directionsServiceRef.current) {
      directionsServiceRef.current = new mapsApi.DirectionsService();
    }
    if (!directionsRendererRef.current) {
      directionsRendererRef.current = new mapsApi.DirectionsRenderer({
        suppressMarkers: false,
        polylineOptions: { strokeColor: "#FF4D00", strokeWeight: 4, strokeOpacity: 0.85 },
      });
    }
  }, [map, mapMode]);

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
    const mapsApi = (window as any).google?.maps;
    if (!mapsApi || !directionsServiceRef.current) return;

    if (!directionsRendererRef.current) {
      directionsRendererRef.current = new mapsApi.DirectionsRenderer({
        suppressMarkers: false,
        polylineOptions: { strokeColor: "#FF4D00", strokeWeight: 4, strokeOpacity: 0.85 },
      });
    }

    setIsLoadingRoute(true);
    directionsRendererRef.current.setMap(map);

    directionsServiceRef.current.route(
      {
        origin: origin.trim(),
        destination: dest.trim(),
        travelMode: mapsApi.TravelMode[mode],
      },
      (result: any, status: string) => {
        setIsLoadingRoute(false);
        if (status === "OK" && result?.routes?.[0]) {
          directionsRendererRef.current.setDirections(result);
          const leg = result.routes[0].legs[0];
          setRouteInfo({ distance: leg.distance?.text ?? "", duration: leg.duration?.text ?? "" });
          setStatus({ ok: true, text: `Route: ${leg.distance?.text} · ${leg.duration?.text}` });
        } else {
          setRouteInfo(null);
          setStatus({ ok: false, text: "Could not find a route between those locations." });
        }
      }
    );
  }, [map, setStatus]);

  const clearDirections = () => {
    if (directionsRendererRef.current) {
      directionsRendererRef.current.setDirections({ routes: [] });
      directionsRendererRef.current.setMap(null);
    }
    setOriginInput("");
    setDestInput("");
    setRouteInfo(null);
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
    if (!map || !(window as any).google?.maps) return;
    const mapsApi = (window as any).google.maps;
    if (!mapsApi?.drawing?.DrawingManager) return;

    if (!drawingManagerRef.current) {
      drawingManagerRef.current = new mapsApi.drawing.DrawingManager({
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
  }, [map, strokeColor, fillColor, strokeWeight]);

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
      const controller = new AbortController();
      void fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(trimmed)}&key=${mapsApiKey}`,
        { signal: controller.signal }
      )
        .then((response) => {
          if (!response.ok) throw new Error("geocode_failed");
          return response.json();
        })
        .then((payload: unknown) => {
          const results =
            payload && typeof payload === "object" && Array.isArray((payload as { results?: unknown[] }).results)
              ? ((payload as { results: Array<{ place_id?: string; formatted_address?: string }> }).results)
              : [];

          setSuggestions(
            results
              .slice(0, 6)
              .map((result, index) => ({
                placeId: result.place_id ?? `${trimmed}-${index}`,
                description: result.formatted_address ?? "",
              }))
              .filter((result) => Boolean(result.description))
          );
        })
        .catch(() => {
          setSuggestions([]);
        });

      return () => controller.abort();
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [addressInput, mapsApiKey]);

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
        setAddressQuery(`${next.lat.toFixed(5)}, ${next.lng.toFixed(5)}`);
        map?.panTo(next);
        map?.setZoom(15);
      },
      () => setStatus({ ok: false, text: "Unable to determine current location." })
    );
  };

  const resolveAddressQuery = async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed || !mapsApiKey || !map) return;

    setIsResolvingAddress(true);
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(trimmed)}&key=${mapsApiKey}`
      );
      if (!response.ok) throw new Error("geocode_failed");

      const payload = (await response.json()) as {
        results?: Array<{
          formatted_address?: string;
          geometry?: { location?: { lat?: number; lng?: number } };
        }>;
      };

      const result = Array.isArray(payload.results) ? payload.results[0] : undefined;
      const location = result?.geometry?.location;
      if (!location || typeof location.lat !== "number" || typeof location.lng !== "number") {
        throw new Error("place_lookup_failed");
      }

      const next = { lat: location.lat, lng: location.lng };
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
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?place_id=${encodeURIComponent(suggestion.placeId)}&key=${mapsApiKey}`
      );
      if (!response.ok) {
        throw new Error("Place lookup failed");
      }

      const payload = (await response.json()) as {
        results?: Array<{
          formatted_address?: string;
          geometry?: { location?: { lat?: number; lng?: number } };
        }>;
      };

      const result = Array.isArray(payload.results) ? payload.results[0] : undefined;
      const location = result?.geometry?.location;
      if (!location || typeof location.lat !== "number" || typeof location.lng !== "number") {
        throw new Error("Place lookup failed");
      }

      const next = { lat: location.lat, lng: location.lng };

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

  if (condensed) {
    const TOOLBAR_TOOLS: Array<{ id: DrawTool; label: string; icon: ReactNode }> = [
      { id: "select", label: "Select", icon: <MousePointer2 size={11} /> },
      { id: "line", label: "Line", icon: <Minus size={11} /> },
      { id: "arrow", label: "Arrow", icon: <Workflow size={11} /> },
      { id: "rectangle", label: "Box", icon: <RectangleHorizontal size={11} /> },
      { id: "circle", label: "Circle", icon: <Circle size={11} /> },
      { id: "polygon", label: "Polygon", icon: <Pentagon size={11} /> },
      { id: "marker", label: "Pin", icon: <MapPin size={11} /> },
    ];

    return (
      <div className="border-b border-gray-100 bg-gray-50/60 px-2 py-1.5 overflow-visible">
        <div className="flex items-center gap-1 overflow-x-auto whitespace-nowrap">
          <div className="relative min-w-[230px]">
            <div className="flex items-center rounded-md border border-gray-200 bg-white px-2 py-1">
              <Search size={11} className="text-gray-400 mr-1" />
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
                placeholder="Search address"
                className="w-full text-[11px] text-gray-700 bg-transparent outline-none"
              />
            </div>
            {suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-40 rounded-md border border-gray-200 bg-white shadow-sm max-h-44 overflow-auto">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion.placeId}
                    onClick={() => void selectAddress(suggestion)}
                    className="w-full text-left px-2 py-1.5 text-[11px] text-gray-700 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                  >
                    {suggestion.description}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={goToCurrentLocation}
            className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-[10px] font-semibold text-gray-700 hover:bg-gray-100"
            title="Use current location"
          >
            <LocateFixed size={10} /> Locate
          </button>

          {TOOLBAR_TOOLS.map((toolButton) => (
            <button
              key={toolButton.id}
              type="button"
              onClick={() => setDrawingTool(toolButton.id)}
              className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-semibold ${tool === toolButton.id ? "border-[#FF4D00] text-[#FF4D00] bg-[#FF4D00]/10" : "border-gray-200 text-gray-600 hover:bg-gray-100"}`}
            >
              {toolButton.icon} {toolButton.label}
            </button>
          ))}

          <div className="flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1">
            <span className="text-[9px] font-semibold text-gray-500">S</span>
            <input
              type="color"
              value={strokeColor}
              onChange={(event) => setStrokeColor(event.target.value)}
              className="h-4 w-5 bg-transparent border-0 p-0"
            />
          </div>

          <div className="flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1">
            <span className="text-[9px] font-semibold text-gray-500">F</span>
            <input
              type="color"
              value={fillColor}
              onChange={(event) => setFillColor(event.target.value)}
              className="h-4 w-5 bg-transparent border-0 p-0"
            />
          </div>

          <div className="flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 min-w-[92px]">
            <span className="text-[9px] font-semibold text-gray-500">W</span>
            <input
              type="range"
              min={1}
              max={10}
              value={strokeWeight}
              onChange={(event) => setStrokeWeight(Number(event.target.value))}
              className="w-full"
            />
          </div>

          <button
            type="button"
            onClick={clearMarkup}
            className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-[10px] font-semibold text-gray-600 hover:bg-gray-100"
          >
            <Trash2 size={10} /> Clear
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* ── Markup panel ────────────────────────────────────────── */}
      {(condensed || mapMode === "markup") && (
      <div className={`border-b border-gray-100 bg-gray-50/60 ${condensed ? "px-3 py-2" : "px-4 py-3"} space-y-2`}>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
          <div className="relative">
            <div className={`flex items-center rounded-lg border border-gray-200 bg-white ${condensed ? "px-2 py-1.5" : "px-2.5 py-2"}`}>
              <Search size={13} className="text-gray-400 mr-1.5" />
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
                placeholder="Search address"
                className="w-full text-xs text-gray-700 bg-transparent outline-none"
              />
            </div>
            {suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-20 rounded-lg border border-gray-200 bg-white shadow-sm max-h-44 overflow-auto">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion.placeId}
                    onClick={() => void selectAddress(suggestion)}
                    className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                  >
                    {suggestion.description}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goToCurrentLocation}
              className={`inline-flex items-center justify-center gap-1 rounded-lg border border-gray-200 ${condensed ? "px-2 py-1.5 text-[11px]" : "px-2.5 py-2 text-xs"} font-semibold text-gray-700 hover:bg-gray-100`}
              title="Use current location"
            >
              <LocateFixed size={12} /> Locate
            </button>
            <span className="text-[10px] text-gray-500 px-1">{isResolvingAddress ? "Finding address…" : ""}</span>
          </div>
        </div>

        {!condensed && (
        <div className="overflow-x-auto">
        <div className="flex items-center gap-1.5 whitespace-nowrap pb-0.5">
          <button
            type="button"
            onClick={() => setDrawingTool("select")}
            className={`inline-flex items-center justify-center gap-1 rounded-md border px-2 py-1 text-[10px] font-semibold ${tool === "select" ? "border-[#FF4D00] text-[#FF4D00] bg-[#FF4D00]/10" : "border-gray-200 text-gray-600 hover:bg-gray-100"}`}
          >
            <MousePointer2 size={12} /> Select
          </button>
          <button
            type="button"
            onClick={() => setDrawingTool("line")}
            className={`inline-flex items-center justify-center gap-1 rounded-md border px-2 py-1 text-[10px] font-semibold ${tool === "line" ? "border-[#FF4D00] text-[#FF4D00] bg-[#FF4D00]/10" : "border-gray-200 text-gray-600 hover:bg-gray-100"}`}
          >
            <Minus size={12} /> Line
          </button>
          <button
            type="button"
            onClick={() => setDrawingTool("arrow")}
            className={`inline-flex items-center justify-center gap-1 rounded-md border px-2 py-1 text-[10px] font-semibold ${tool === "arrow" ? "border-[#FF4D00] text-[#FF4D00] bg-[#FF4D00]/10" : "border-gray-200 text-gray-600 hover:bg-gray-100"}`}
          >
            <Workflow size={12} /> Arrow
          </button>
          <button
            type="button"
            onClick={() => setDrawingTool("rectangle")}
            className={`inline-flex items-center justify-center gap-1 rounded-md border px-2 py-1 text-[10px] font-semibold ${tool === "rectangle" ? "border-[#FF4D00] text-[#FF4D00] bg-[#FF4D00]/10" : "border-gray-200 text-gray-600 hover:bg-gray-100"}`}
          >
            <RectangleHorizontal size={12} /> Box
          </button>
          <button
            type="button"
            onClick={() => setDrawingTool("circle")}
            className={`inline-flex items-center justify-center gap-1 rounded-md border px-2 py-1 text-[10px] font-semibold ${tool === "circle" ? "border-[#FF4D00] text-[#FF4D00] bg-[#FF4D00]/10" : "border-gray-200 text-gray-600 hover:bg-gray-100"}`}
          >
            <Circle size={12} /> Circle
          </button>
          <button
            type="button"
            onClick={() => setDrawingTool("polygon")}
            className={`inline-flex items-center justify-center gap-1 rounded-md border px-2 py-1 text-[10px] font-semibold ${tool === "polygon" ? "border-[#FF4D00] text-[#FF4D00] bg-[#FF4D00]/10" : "border-gray-200 text-gray-600 hover:bg-gray-100"}`}
          >
            <Pentagon size={12} /> Polygon
          </button>
          <button
            type="button"
            onClick={() => setDrawingTool("marker")}
            className={`inline-flex items-center justify-center gap-1 rounded-md border px-2 py-1 text-[10px] font-semibold ${tool === "marker" ? "border-[#FF4D00] text-[#FF4D00] bg-[#FF4D00]/10" : "border-gray-200 text-gray-600 hover:bg-gray-100"}`}
          >
            <MapPin size={12} /> Pin
          </button>
          <button
            type="button"
            onClick={clearMarkup}
            className="inline-flex items-center justify-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-[10px] font-semibold text-gray-600 hover:bg-gray-100"
          >
            <Trash2 size={12} /> Clear
          </button>
          <div className="flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1">
            <span className="text-[10px] font-semibold text-gray-500">S</span>
            <input
              type="color"
              value={strokeColor}
              onChange={(event) => setStrokeColor(event.target.value)}
              className="h-4 w-6 bg-transparent border-0 p-0"
            />
          </div>
          <div className="flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1">
            <span className="text-[10px] font-semibold text-gray-500">F</span>
            <input
              type="color"
              value={fillColor}
              onChange={(event) => setFillColor(event.target.value)}
              className="h-4 w-6 bg-transparent border-0 p-0"
            />
          </div>
          <div className="flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 min-w-[112px]">
            <span className="text-[10px] font-semibold text-gray-500">W</span>
            <input
              type="range"
              min={1}
              max={10}
              value={strokeWeight}
              onChange={(event) => setStrokeWeight(Number(event.target.value))}
              className="w-full"
            />
            <span className="text-[10px] text-gray-500 w-5 text-right">{strokeWeight}</span>
          </div>
        </div>
        </div>
        )}
      </div>
      )}{/* end markup panel */}

      {/* ── Directions panel ────────────────────────────────────── */}
      {mapMode === "directions" && (
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/60 space-y-3">

          {/* Travel mode selector */}
          <div className="flex items-center gap-1 flex-wrap">
            {TRAVEL_MODES.map(({ id, label, icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setTravelMode(id);
                  if (originInput.trim() && destInput.trim()) void getDirections(originInput, destInput, id);
                }}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
                  travelMode === id
                    ? "border-[#1E3A8A] bg-[#1E3A8A]/10 text-[#1E3A8A]"
                    : "border-gray-200 text-gray-500 hover:bg-gray-100"
                }`}
              >
                {icon} {label}
              </button>
            ))}
          </div>

          {/* Origin */}
          <div className="relative">
            <div className="flex items-center rounded-lg border border-gray-200 bg-white px-2.5 py-2 gap-2 focus-within:border-[#1E3A8A] focus-within:ring-1 focus-within:ring-[#1E3A8A]/30 transition-all">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
              <input
                type="text"
                value={originInput}
                onChange={(e) => setOriginInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && destInput.trim()) void getDirections(originInput, destInput, travelMode); }}
                placeholder="Starting point…"
                className="flex-1 text-xs text-gray-700 bg-transparent outline-none"
              />
              <button
                type="button"
                onClick={goToCurrentLocationForOrigin}
                className="text-gray-400 hover:text-[#FF4D00] transition-colors"
                title="Use my current location"
              >
                <LocateFixed size={12} />
              </button>
            </div>
            {originSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-30 rounded-lg border border-gray-200 bg-white shadow-md max-h-40 overflow-auto">
                {originSuggestions.map((s) => (
                  <button key={s.placeId} type="button" onClick={() => void selectOriginSug(s)}
                    className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 border-b border-gray-100 last:border-b-0">
                    {s.description}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Swap button + Destination */}
          <div className="flex items-start gap-2">
            <button
              type="button"
              onClick={swapAddresses}
              className="mt-1.5 w-7 h-7 shrink-0 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              title="Swap origin and destination"
            >
              <ArrowUpDown size={11} />
            </button>
            <div className="relative flex-1">
              <div className="flex items-center rounded-lg border border-gray-200 bg-white px-2.5 py-2 gap-2 focus-within:border-[#1E3A8A] focus-within:ring-1 focus-within:ring-[#1E3A8A]/30 transition-all">
                <div className="w-2.5 h-2.5 rounded-full bg-[#FF4D00] shrink-0" />
                <input
                  type="text"
                  value={destInput}
                  onChange={(e) => setDestInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && originInput.trim()) void getDirections(originInput, destInput, travelMode); }}
                  placeholder="Destination…"
                  className="flex-1 text-xs text-gray-700 bg-transparent outline-none"
                />
              </div>
              {destSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-30 rounded-lg border border-gray-200 bg-white shadow-md max-h-40 overflow-auto">
                  {destSuggestions.map((s) => (
                    <button key={s.placeId} type="button" onClick={() => void selectDestSug(s)}
                      className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 border-b border-gray-100 last:border-b-0">
                      {s.description}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Get Directions + Clear */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => { if (originInput.trim() && destInput.trim()) void getDirections(originInput, destInput, travelMode); }}
              disabled={!originInput.trim() || !destInput.trim() || isLoadingRoute}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#1E3A8A] px-3 py-2 text-xs font-semibold text-white hover:bg-[#1a3270] disabled:opacity-50 transition-colors"
            >
              {isLoadingRoute ? <Loader2 size={11} className="animate-spin" /> : <Navigation size={11} />}
              {isLoadingRoute ? "Finding route…" : "Get Directions"}
            </button>
            {(originInput || destInput || routeInfo) && (
              <button
                type="button"
                onClick={clearDirections}
                className="inline-flex items-center justify-center gap-1 rounded-lg border border-gray-200 px-2.5 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
                title="Clear route"
              >
                <Trash2 size={11} /> Clear
              </button>
            )}
          </div>

          {/* Route result badge */}
          {routeInfo && (
            <div className="flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-xs font-bold text-emerald-800">{routeInfo.distance}</span>
              <span className="text-[10px] text-emerald-400">·</span>
              <span className="text-xs font-semibold text-emerald-700">{routeInfo.duration}</span>
              <span className="text-[10px] text-emerald-500 ml-auto capitalize">{travelMode.toLowerCase()}</span>
            </div>
          )}
        </div>
      )}{/* end directions panel */}
    </>
  );
}

export default function LocationMap({ center, locationLabel, contactRecipients = [], compact = false, expanded = false }: LocationMapProps) {
  const pathname = usePathname();
  const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID";
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
  const [controlsExpanded, setControlsExpanded] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
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
      mapHeight,
      topBarHeight,
      panelHeight,
      mapPct,
      dashboardPrefs,
      hubPrefs,
      tick: diagTick,
    };
  }, [widgetDiagEnabled, pathname, compact, expandedView, controlsExpanded, isThreeD, diagTick]);

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
    // Temporary bypass: html2canvas crashes on Tailwind v4 oklch colors.
    // Returning a dummy text file to prevent the UI thread from crashing.
    const blob = new Blob(["Map export temporarily disabled due to CSS parsing engine updates. Please use browser print."], { type: "text/plain" });
    return { blob, filename: `map-export-${Date.now()}.txt` };
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
    if (!lastFileId) {
      setStatus({ ok: false, text: "Save the map to a project folder first." });
      return;
    }

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
      if (!res.ok || !data?.shareUrl) {
        throw new Error(data?.error ?? "Failed to generate share link");
      }

      setLastShareUrl(data.shareUrl as string);
      setStatus({
        ok: true,
        text: recipientMode === "email" ? "Secure email link sent and ready to copy." : "Share link generated for phone delivery. Use Copy or SMS.",
      });

      if (recipientMode === "phone" && data?.smsUrl) {
        window.open(data.smsUrl as string, "_blank");
      }
    } catch (error) {
      console.error("Failed to send secure link", error);
      setStatus({ ok: false, text: "Could not send secure link." });
    } finally {
      setIsSharing(false);
    }
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
        <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""}>
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
              />
            </div>
          )}
          <div ref={mapCanvasRef} className={`flex-1 relative min-h-0 ${isModal ? "min-h-[55vh]" : "min-h-[180px]"}`}>
            <Map
              defaultZoom={13}
              defaultCenter={mapCenter}
              center={mapCenter}
              mapId={mapId}
              gestureHandling={"greedy"}
              disableDefaultUI={true}
              mapTypeId={isThreeD ? "satellite" : "roadmap"}
              tilt={isThreeD ? 45 : 0}
              headingInteractionEnabled={isThreeD}
              tiltInteractionEnabled={isThreeD}
            >
              <AdvancedMarker position={mapCenter} />
            </Map>
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
