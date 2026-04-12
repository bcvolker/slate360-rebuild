"use client";

import { useCallback, useEffect, useState } from "react";

type GeoPosition = {
  latitude: number;
  longitude: number;
  accuracy: number;
};

type UseGeolocationReturn = {
  position: GeoPosition | null;
  error: string | null;
  loading: boolean;
  refresh: () => void;
};

export function useGeolocation(autoStart = true): UseGeolocationReturn {
  const [position, setPosition] = useState<GeoPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setError("Geolocation not supported");
      return;
    }
    setLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    );
  }, []);

  useEffect(() => {
    if (autoStart) refresh();
  }, [autoStart, refresh]);

  return { position, error, loading, refresh };
}
