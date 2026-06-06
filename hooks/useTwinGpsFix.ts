"use client";

import { useCallback } from "react";
import type { TwinGpsFix } from "@/hooks/useMultipartTwinUpload";

export function useTwinGpsFix() {
  return useCallback(async (): Promise<TwinGpsFix | undefined> => {
    if (!navigator.geolocation) return undefined;
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 8000,
          maximumAge: 60_000,
        });
      });
      return {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        alt: position.coords.altitude ?? undefined,
        accuracy: position.coords.accuracy,
      };
    } catch {
      return undefined;
    }
  }, []);
}
