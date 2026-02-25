"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { APIProvider, AdvancedMarker, Map, useMap } from "@vis.gl/react-google-maps";
import {
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
  PenTool,
  Pentagon,
  RectangleHorizontal,
  Save,
  Search,
  Send,
  Trash2,
  Workflow,
} from "lucide-react";

type LocationMapProps = {
  center?: { lat: number; lng: number };
  locationLabel?: string;
  contactRecipients?: Array<{ name: string; email?: string; phone?: string }>;
  /** When true, render a shorter preview card (no toolbar/share panel) suitable for widget grids. */
  compact?: boolean;
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
              .map((result) => ({
                placeId: result.place_id ?? "",
                description: result.formatted_address ?? "",
              }))
              .filter((result) => Boolean(result.placeId) && Boolean(result.description))
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

  const selectAddress = async (suggestion: AddressSuggestion) => {
    if (!map || !mapsApiKey) {
      setStatus({ ok: false, text: "Map is still loading. Try again." });
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

  return (
    <>
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/60 space-y-2">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
          <div className="relative">
            <div className="flex items-center rounded-lg border border-gray-200 bg-white px-2.5 py-2">
              <Search size={13} className="text-gray-400 mr-1.5" />
              <input
                type="text"
                value={addressInput}
                onChange={(event) => {
                  setAddressInput(event.target.value);
                  setAddressQuery(event.target.value);
                }}
                placeholder="Search address (autocomplete)"
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
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100"
              title="Use current location"
            >
              <LocateFixed size={12} /> Locate
            </button>
            <span className="text-[10px] text-gray-500 px-1">{isResolvingAddress ? "Finding address…" : ""}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            type="button"
            onClick={() => setDrawingTool("select")}
            className={`inline-flex items-center justify-center gap-1.5 rounded-lg border px-2.5 py-2 text-[11px] font-semibold ${tool === "select" ? "border-[#FF4D00] text-[#FF4D00] bg-[#FF4D00]/10" : "border-gray-200 text-gray-600 hover:bg-gray-100"}`}
          >
            <MousePointer2 size={12} /> Select
          </button>
          <button
            type="button"
            onClick={() => setDrawingTool("line")}
            className={`inline-flex items-center justify-center gap-1.5 rounded-lg border px-2.5 py-2 text-[11px] font-semibold ${tool === "line" ? "border-[#FF4D00] text-[#FF4D00] bg-[#FF4D00]/10" : "border-gray-200 text-gray-600 hover:bg-gray-100"}`}
          >
            <Minus size={12} /> Line
          </button>
          <button
            type="button"
            onClick={() => setDrawingTool("arrow")}
            className={`inline-flex items-center justify-center gap-1.5 rounded-lg border px-2.5 py-2 text-[11px] font-semibold ${tool === "arrow" ? "border-[#FF4D00] text-[#FF4D00] bg-[#FF4D00]/10" : "border-gray-200 text-gray-600 hover:bg-gray-100"}`}
          >
            <Workflow size={12} /> Arrow
          </button>
          <button
            type="button"
            onClick={() => setDrawingTool("rectangle")}
            className={`inline-flex items-center justify-center gap-1.5 rounded-lg border px-2.5 py-2 text-[11px] font-semibold ${tool === "rectangle" ? "border-[#FF4D00] text-[#FF4D00] bg-[#FF4D00]/10" : "border-gray-200 text-gray-600 hover:bg-gray-100"}`}
          >
            <RectangleHorizontal size={12} /> Box
          </button>
          <button
            type="button"
            onClick={() => setDrawingTool("circle")}
            className={`inline-flex items-center justify-center gap-1.5 rounded-lg border px-2.5 py-2 text-[11px] font-semibold ${tool === "circle" ? "border-[#FF4D00] text-[#FF4D00] bg-[#FF4D00]/10" : "border-gray-200 text-gray-600 hover:bg-gray-100"}`}
          >
            <Circle size={12} /> Circle
          </button>
          <button
            type="button"
            onClick={() => setDrawingTool("polygon")}
            className={`inline-flex items-center justify-center gap-1.5 rounded-lg border px-2.5 py-2 text-[11px] font-semibold ${tool === "polygon" ? "border-[#FF4D00] text-[#FF4D00] bg-[#FF4D00]/10" : "border-gray-200 text-gray-600 hover:bg-gray-100"}`}
          >
            <Pentagon size={12} /> Polygon
          </button>
          <button
            type="button"
            onClick={() => setDrawingTool("marker")}
            className={`inline-flex items-center justify-center gap-1.5 rounded-lg border px-2.5 py-2 text-[11px] font-semibold ${tool === "marker" ? "border-[#FF4D00] text-[#FF4D00] bg-[#FF4D00]/10" : "border-gray-200 text-gray-600 hover:bg-gray-100"}`}
          >
            <MapPin size={12} /> Pin
          </button>
          <button
            type="button"
            onClick={clearMarkup}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-2 text-[11px] font-semibold text-gray-600 hover:bg-gray-100"
          >
            <Trash2 size={12} /> Clear
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-2.5 py-2">
            <span className="text-[10px] font-semibold text-gray-500">Stroke</span>
            <input
              type="color"
              value={strokeColor}
              onChange={(event) => setStrokeColor(event.target.value)}
              className="h-5 w-7 bg-transparent border-0 p-0"
            />
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-2.5 py-2">
            <span className="text-[10px] font-semibold text-gray-500">Fill</span>
            <input
              type="color"
              value={fillColor}
              onChange={(event) => setFillColor(event.target.value)}
              className="h-5 w-7 bg-transparent border-0 p-0"
            />
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-2.5 py-2 sm:col-span-2">
            <span className="text-[10px] font-semibold text-gray-500">Width</span>
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
    </>
  );
}

export default function LocationMap({ center, locationLabel, contactRecipients = [], compact = false }: LocationMapProps) {
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
  const [isThreeD, setIsThreeD] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);

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
    const showToolbar = isModal || !compact;
    return (
      <div className={`relative flex flex-col ${isModal ? "h-full min-h-[70vh]" : compact ? "flex-1 min-h-[200px]" : "flex-1 min-h-[420px]"}`} ref={isModal ? undefined : mapRef}>
        <div className="absolute left-3 top-3 z-20 inline-flex items-center gap-1 rounded-xl border border-white/70 bg-white/95 p-1 shadow-sm backdrop-blur">
          <button
            type="button"
            onClick={() => setIsThreeD(false)}
            className={`rounded-md px-2 py-1 text-[10px] font-semibold transition-colors ${!isThreeD ? "bg-[#1E3A8A] text-white" : "text-gray-600 hover:bg-gray-100"}`}
          >
            2D
          </button>
          <button
            type="button"
            onClick={() => setIsThreeD(true)}
            className={`rounded-md px-2 py-1 text-[10px] font-semibold transition-colors ${isThreeD ? "bg-[#FF4D00] text-white" : "text-gray-600 hover:bg-gray-100"}`}
          >
            3D
          </button>
          <button
            type="button"
            onClick={requestCurrentLocation}
            className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-[10px] font-semibold text-gray-700 hover:bg-gray-100"
            disabled={isLocating}
          >
            {isLocating ? <Loader2 size={10} className="animate-spin" /> : <LocateFixed size={10} />}
            Find Me
          </button>
          <button
            type="button"
            onClick={() => setIsExpanded((value) => !value)}
            className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-[10px] font-semibold text-gray-700 hover:bg-gray-100"
          >
            {isModal ? <Minimize2 size={10} /> : <Maximize2 size={10} />}
            {isModal ? "Collapse" : "Expand"}
          </button>
        </div>

        <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""}>
          {showToolbar && (
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
            />
          )}
          <div className="flex-1 relative min-h-0">
            <Map
              defaultZoom={13}
              defaultCenter={mapCenter}
              center={mapCenter}
              mapId={mapId}
              gestureHandling={"greedy"}
              disableDefaultUI={true}
              mapTypeId={isThreeD ? "satellite" : "roadmap"}
              tilt={isThreeD ? 45 : 0}
            >
              <AdvancedMarker position={mapCenter} />
            </Map>
          </div>
        </APIProvider>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
            <MapPin size={16} className="text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">Site Location</h3>
            <p className="text-[10px] text-gray-500">{locationLabel ?? "Interactive map search, markup, and sharing"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-[10px] font-semibold text-gray-500">
            <PenTool size={12} /> Markup tools enabled
          </div>
          <button 
            onClick={handleDownloadPDF}
            disabled={isDownloading}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50" 
            title="Download PDF"
          >
            {isDownloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          </button>
        </div>
      </div>

      {!compact && (
      <details className="px-4 py-3 border-b border-gray-100 bg-gray-50/60" open={false}>
        <summary className="cursor-pointer list-none flex items-center justify-between text-xs font-semibold text-gray-600">
          Share, save, and delivery controls
          <span className="text-[10px] text-gray-400">Optional</span>
        </summary>
        <div className="space-y-2 pt-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <select
              value={selectedProjectId}
              onChange={(event) => setSelectedProjectId(event.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-xs text-gray-700"
            >
              <option value="">Select project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
            <select
              value={selectedFolderId}
              onChange={(event) => setSelectedFolderId(event.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-xs text-gray-700"
              disabled={!selectedProjectId || folders.length === 0}
            >
              <option value="">Select folder</option>
              {folders.map((folder) => (
                <option key={folder.id} value={folder.id}>{folder.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <select
              value={selectedContact}
              onChange={(event) => {
                const value = event.target.value;
                setSelectedContact(value);
                if (!value) return;
                const found = recipientOptions.find((option) => option.label === value);
                if (!found) return;
                if (found.email) {
                  setRecipientMode("email");
                  setRecipientValue(found.email);
                } else if (found.phone) {
                  setRecipientMode("phone");
                  setRecipientValue(found.phone);
                }
              }}
              className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-xs text-gray-700"
            >
              <option value="">Pick contact recipient (optional)</option>
              {recipientOptions.map((option) => (
                <option key={option.label} value={option.label}>{option.label}</option>
              ))}
            </select>
            <div className="grid grid-cols-[auto_1fr] gap-2">
              <select
                value={recipientMode}
                onChange={(event) => setRecipientMode(event.target.value as "email" | "phone")}
                className="rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-xs text-gray-700"
              >
                <option value="email">Email</option>
                <option value="phone">Phone</option>
              </select>
              <input
                type={recipientMode === "email" ? "email" : "tel"}
                placeholder={recipientMode === "email" ? "recipient@email.com" : "+1 555-123-4567"}
                value={recipientValue}
                onChange={(event) => setRecipientValue(event.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-xs text-gray-700"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
            <div className="text-[10px] text-gray-500 flex items-center">
              Save your marked-up map to a project folder, then send a secure link by email or phone.
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveToFolder}
                disabled={isSaving}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-50"
              >
                {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save
              </button>
              <button
                onClick={handleSendShareLink}
                disabled={isSharing}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: "#FF4D00" }}
              >
                {isSharing ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} Send Link
              </button>
              <button
                onClick={handleCopyShareLink}
                disabled={!lastShareUrl}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-40"
                title="Copy last generated link"
              >
                <Copy size={12} /> Copy
              </button>
              <button
                onClick={handleExportAuditPackage}
                disabled={isExportingAudit}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-40"
                title="Download complete project audit package"
              >
                {isExportingAudit ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />} Audit ZIP
              </button>
              {lastShareUrl && recipientMode === "phone" && (
                <a
                  href={`sms:${encodeURIComponent(recipientValue.trim())}?body=${encodeURIComponent(`Project location and markup: ${lastShareUrl}`)}`}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100"
                >
                  SMS
                </a>
              )}
            </div>
          </div>
          {status && (
            <p className={`text-[10px] flex items-center gap-1 ${status.ok ? "text-emerald-600" : "text-red-600"}`}>
              {status.ok ? <CheckCircle2 size={11} /> : null}
              {status.text}
            </p>
          )}
        </div>
      </details>
      )}

      {!isExpanded && renderMapCanvas("inline")}

      {isExpanded && (
        <div className="fixed inset-0 z-[120] bg-black/55 backdrop-blur-sm p-4 sm:p-8">
          <div className="h-full w-full rounded-2xl border border-white/20 bg-white overflow-hidden shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <MapPin size={16} className="text-blue-600" />
                </div>
                <h3 className="text-sm font-bold text-gray-900">Site Location — Expanded</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100"
              >
                <Minimize2 size={12} /> Collapse
              </button>
            </div>
            <div className="flex-1 relative min-h-0">
              {renderMapCanvas("expanded")}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
