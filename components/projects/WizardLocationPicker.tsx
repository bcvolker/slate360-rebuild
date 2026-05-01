"use client";

import { APIProvider, AdvancedMarker, Map } from "@vis.gl/react-google-maps";
import WizardLocationPickerController from "./WizardLocationPickerController";

export type LatLng = { lat: number; lng: number };

export type LocationPickerValue = {
  address: string;
  lat: number | null;
  lng: number | null;
  boundary: LatLng[];
};

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
      <div className="flex h-full items-center justify-center px-4 text-center text-xs font-semibold text-slate-400">
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
        <WizardLocationPickerController value={value} onChange={onChange} />
      </div>
    </APIProvider>
  );
}
