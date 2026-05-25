"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  APIProvider,
  AdvancedMarker,
  Map,
  useMap,
} from "@vis.gl/react-google-maps";
import { MapPin } from "lucide-react";
import type { LatLng, ResolvedProjectLocation } from "@/lib/projects/location";

export type MapViewport = {
  center: LatLng;
  zoom: number;
};

type ProjectSiteLocationMapProps = {
  location: ResolvedProjectLocation;
  onViewportChange?: (viewport: MapViewport) => void;
};

function ReadOnlyMapLayer({
  location,
  onViewportChange,
}: ProjectSiteLocationMapProps) {
  const map = useMap("project-site-map");
  const boundaryRef = useRef<google.maps.Polygon | null>(null);
  const onViewportChangeRef = useRef(onViewportChange);
  onViewportChangeRef.current = onViewportChange;

  const publishViewport = useCallback(() => {
    if (!map) return;
    const center = map.getCenter();
    const zoom = map.getZoom();
    if (!center || zoom == null) return;
    onViewportChangeRef.current?.({
      center: { lat: center.lat(), lng: center.lng() },
      zoom,
    });
  }, [map]);

  useEffect(() => {
    if (!map) return;
    map.setMapTypeId("satellite");
  }, [map]);

  useEffect(() => {
    if (!map || !location.center) return;

    if (location.boundary.length >= 3) {
      const bounds = new google.maps.LatLngBounds();
      location.boundary.forEach((point) => bounds.extend(point));
      map.fitBounds(bounds, 48);
    } else {
      map.setCenter(location.center);
      map.setZoom(16);
    }
  }, [location.boundary, location.center, map]);

  useEffect(() => {
    if (!map) return;

    boundaryRef.current?.setMap(null);
    boundaryRef.current = null;

    if (location.boundary.length >= 3) {
      boundaryRef.current = new google.maps.Polygon({
        paths: location.boundary,
        strokeColor: "#F59E0B",
        strokeOpacity: 0.95,
        strokeWeight: 2,
        fillColor: "#F59E0B",
        fillOpacity: 0.18,
        clickable: false,
        map,
      });
    }

    return () => {
      boundaryRef.current?.setMap(null);
      boundaryRef.current = null;
    };
  }, [location.boundary, map]);

  useEffect(() => {
    if (!map) return;
    const idleListener = map.addListener("idle", publishViewport);
    publishViewport();
    return () => {
      google.maps.event.removeListener(idleListener);
    };
  }, [map, publishViewport]);

  return null;
}

export function ProjectSiteLocationMap({
  location,
  onViewportChange,
}: ProjectSiteLocationMapProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
  const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ?? "DEMO_MAP_ID";

  if (!apiKey) {
    return (
      <div className="flex h-full min-h-[420px] items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.02] px-6 text-center text-sm text-zinc-400">
        Google Maps API key is not configured.
      </div>
    );
  }

  if (!location.center) {
    return (
      <div className="flex h-full min-h-[420px] items-center justify-center rounded-xl border border-dashed border-white/[0.12] bg-white/[0.02] px-6 text-center">
        <div className="max-w-sm space-y-2">
          <MapPin className="mx-auto h-6 w-6 text-amber-400/80" />
          <p className="text-sm font-semibold text-zinc-200">No site location saved</p>
          <p className="text-xs leading-relaxed text-zinc-500">
            This project does not have coordinates yet. Location is set when the project is created.
          </p>
        </div>
      </div>
    );
  }

  return (
    <APIProvider apiKey={apiKey}>
      <div className="relative h-full min-h-[420px] overflow-hidden rounded-xl border border-white/[0.08]">
        <Map
          id="project-site-map"
          mapId={mapId}
          defaultCenter={location.center}
          defaultZoom={16}
          disableDefaultUI
          gestureHandling="cooperative"
          style={{ width: "100%", height: "100%" }}
        >
          <AdvancedMarker position={location.center} />
          <ReadOnlyMapLayer location={location} onViewportChange={onViewportChange} />
        </Map>

        <div className="pointer-events-none absolute bottom-3 right-3 z-10">
          <div className="rounded-lg border border-white/[0.12] bg-[#0B0F15]/85 px-2.5 py-1 text-[10px] text-zinc-300 backdrop-blur-sm">
            {location.center.lat.toFixed(5)}, {location.center.lng.toFixed(5)}
          </div>
        </div>

        {location.boundary.length >= 3 && (
          <div className="pointer-events-none absolute left-3 top-3 z-10">
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[10px] font-semibold text-amber-200">
              Site boundary · {location.boundary.length} pts
            </div>
          </div>
        )}
      </div>
    </APIProvider>
  );
}
