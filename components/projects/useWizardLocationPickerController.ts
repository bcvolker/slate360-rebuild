"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMap, useMapsLibrary } from "@vis.gl/react-google-maps";
import type { LatLng, LocationPickerValue } from "./WizardLocationPicker";

type DrawTool = "select" | "marker" | "polygon" | "polygondraw";

interface UseWizardLocationPickerControllerProps {
  value: LocationPickerValue;
  onChange: (value: LocationPickerValue) => void;
}

export function useWizardLocationPickerController({
  value,
  onChange,
}: UseWizardLocationPickerControllerProps) {
  const map = useMap("wiz-loc-map");
  const geocodingLib = useMapsLibrary("geocoding");
  const placesLib = useMapsLibrary("places");
  const geocoder = useMemo(() => (geocodingLib ? new geocodingLib.Geocoder() : null), [geocodingLib]);
  const [input, setInput] = useState(value.address);
  const [suggestions, setSuggestions] = useState<
    Array<{ placeId: string; description: string }>
  >([]);
  const [resolving, setResolving] = useState(false);
  const [tool, setTool] = useState<DrawTool>("select");
  const [mapType, setMapType] = useState<"roadmap" | "satellite" | "hybrid">("roadmap");
  const [isThreeD, setIsThreeD] = useState(false);
  const [drawingVertices, setDrawingVertices] = useState<LatLng[]>([]);
  const previewPolylineRef = useRef<google.maps.Polyline | null>(null);
  const previewMarkersRef = useRef<google.maps.Marker[]>([]);
  const boundaryPolygonRef = useRef<google.maps.Polygon | null>(null);
  const toolRef = useRef<DrawTool>("select");
  const drawingVerticesRef = useRef<LatLng[]>([]);
  drawingVerticesRef.current = drawingVertices;

  const valueRef = useRef(value);
  useEffect(() => { valueRef.current = value; }, [value]);

  useEffect(() => { setInput(value.address); }, [value.address]);

  useEffect(() => {
    if (map) map.setMapTypeId(mapType);
  }, [map, mapType]);

  useEffect(() => {
    if (map) {
      map.setTilt(isThreeD ? 45 : 0);
      map.setHeading(0);
    }
  }, [map, isThreeD]);

  useEffect(() => {
    const trimmed = input.trim();
    if (!trimmed || trimmed.length < 3) {
      setSuggestions([]);
      return;
    }
    const autocomplete = (placesLib as { AutocompleteSuggestion?: { fetchAutocompleteSuggestions: (request: { input: string }) => Promise<{ suggestions?: Array<{ placePrediction?: { placeId?: string; text?: { text?: string } | string } }> }> } } | null)?.AutocompleteSuggestion;
    if (!autocomplete) {
      setSuggestions([]);
      return;
    }
    const timer = window.setTimeout(async () => {
      try {
        const response = await autocomplete.fetchAutocompleteSuggestions({ input: trimmed });
        setSuggestions(
          (response?.suggestions ?? []).slice(0, 6).map((suggestion) => ({
            placeId: suggestion.placePrediction?.placeId ?? "",
            description:
              typeof suggestion.placePrediction?.text === "string"
                ? suggestion.placePrediction.text
                : suggestion.placePrediction?.text?.text ?? trimmed,
          }))
        );
      } catch {
        if (geocoder) {
          try {
            const response = await geocoder.geocode({ address: trimmed });
            setSuggestions(
              (response?.results ?? []).slice(0, 6).map((result: google.maps.GeocoderResult) => ({
                placeId: result.place_id ?? "",
                description: result.formatted_address ?? trimmed,
              }))
            );
          } catch {
            setSuggestions([]);
          }
        } else {
          setSuggestions([]);
        }
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [geocoder, input, placesLib]);

  useEffect(() => {
    if (!map) return;
    const listener = map.addListener("click", (event: google.maps.MapMouseEvent) => {
      if (!event.latLng) return;
      const latitude = event.latLng.lat();
      const longitude = event.latLng.lng();
      const currentTool = toolRef.current;

      if (currentTool === "polygondraw") {
        const nextVertices = [...drawingVerticesRef.current, { lat: latitude, lng: longitude }];
        setDrawingVertices(nextVertices);
        if (previewPolylineRef.current) {
          previewPolylineRef.current.setPath(nextVertices);
        } else {
          previewPolylineRef.current = new google.maps.Polyline({
            path: nextVertices,
            strokeColor: "#3B82F6",
            strokeWeight: 2,
            map,
          });
        }
        previewMarkersRef.current.push(
          new google.maps.Marker({
            position: { lat: latitude, lng: longitude },
            map,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 5,
              fillColor: "#3B82F6",
              fillOpacity: 1,
              strokeColor: "#fff",
              strokeWeight: 1.5,
            },
          })
        );
        return;
      }

      if (currentTool === "select" || currentTool === "marker") {
        onChange({ ...valueRef.current, lat: latitude, lng: longitude });
        if (geocoder) {
          geocoder
            .geocode({ location: { lat: latitude, lng: longitude } })
            .then((response) => {
              const address =
                response.results[0]?.formatted_address ??
                `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
              setInput(address);
              onChange({ ...valueRef.current, address, lat: latitude, lng: longitude });
            })
            .catch(() => {});
        }
        if (currentTool === "marker") {
          setTool("select");
          toolRef.current = "select";
        }
      }
    });
    return () => (listener as google.maps.MapsEventListener).remove();
  }, [geocoder, map, onChange]);

  useEffect(() => {
    return () => {
      previewPolylineRef.current?.setMap(null);
      previewMarkersRef.current.forEach((marker) => marker.setMap(null));
      boundaryPolygonRef.current?.setMap(null);
    };
  }, []);

  const clearPreview = useCallback(() => {
    previewPolylineRef.current?.setMap(null);
    previewPolylineRef.current = null;
    previewMarkersRef.current.forEach((marker) => marker.setMap(null));
    previewMarkersRef.current = [];
    setDrawingVertices([]);
  }, []);

  const finishPolygon = useCallback(() => {
    const vertices = drawingVerticesRef.current;
    if (vertices.length < 3) return;
    clearPreview();
    boundaryPolygonRef.current?.setMap(null);
    boundaryPolygonRef.current = new google.maps.Polygon({
      paths: vertices,
      strokeColor: "#3B82F6",
      strokeWeight: 2,
      fillColor: "#3B82F6",
      fillOpacity: 0.15,
      editable: true,
      draggable: true,
      map,
    });
    const centerLat = vertices.reduce((sum, point) => sum + point.lat, 0) / vertices.length;
    const centerLng = vertices.reduce((sum, point) => sum + point.lng, 0) / vertices.length;
    onChange({ ...valueRef.current, lat: centerLat, lng: centerLng, boundary: vertices });
    if (geocoder) {
      geocoder
        .geocode({ location: { lat: centerLat, lng: centerLng } })
        .then((response) => {
          const address = response.results[0]?.formatted_address;
          if (address) {
            setInput(address);
            onChange({ address, lat: centerLat, lng: centerLng, boundary: vertices });
          }
        })
        .catch(() => {});
    }
    setTool("select");
    toolRef.current = "select";
  }, [clearPreview, geocoder, map, onChange]);

  const selectSuggestion = useCallback(
    async (suggestion: { placeId: string; description: string }) => {
      if (!geocoder || !map) return;
      setResolving(true);
      setSuggestions([]);
      try {
        const response = await geocoder.geocode({ placeId: suggestion.placeId });
        const location = response.results[0]?.geometry?.location;
        if (location) {
          const latitude = location.lat();
          const longitude = location.lng();
          const address = response.results[0].formatted_address;
          setInput(address);
          map.panTo({ lat: latitude, lng: longitude });
          map.setZoom(16);
          onChange({ ...valueRef.current, address, lat: latitude, lng: longitude });
        }
      } catch {
      } finally {
        setResolving(false);
      }
    },
    [geocoder, map, onChange]
  );

  const searchAddress = useCallback(async () => {
    if (!geocoder || !map || !input.trim()) return;
    setResolving(true);
    setSuggestions([]);
    try {
      const response = await geocoder.geocode({ address: input.trim() });
      const location = response.results[0]?.geometry?.location;
      if (location) {
        const latitude = location.lat();
        const longitude = location.lng();
        const address = response.results[0].formatted_address;
        setInput(address);
        map.panTo({ lat: latitude, lng: longitude });
        map.setZoom(16);
        onChange({ ...valueRef.current, address, lat: latitude, lng: longitude });
      }
    } catch {
    } finally {
      setResolving(false);
    }
  }, [geocoder, input, map, onChange]);

  const isDrawingPolygon = toolRef.current === "polygondraw";

  const activateTool = (next: DrawTool) => {
    if (next === "polygon") {
      setTool("polygon");
      toolRef.current = "polygondraw";
      clearPreview();
      return;
    }
    setTool(next);
    toolRef.current = next;
    clearPreview();
  };

  const clearBoundary = () => {
    boundaryPolygonRef.current?.setMap(null);
    boundaryPolygonRef.current = null;
    clearPreview();
    onChange({ ...value, boundary: [] });
  };

  return {
    input,
    suggestions,
    resolving,
    tool,
    mapType,
    isThreeD,
    drawingVertices,
    isDrawingPolygon,
    setInput,
    setSuggestions,
    setMapType,
    setIsThreeD,
    activateTool,
    clearPreview,
    clearBoundary,
    finishPolygon,
    selectSuggestion,
    searchAddress,
  };
}