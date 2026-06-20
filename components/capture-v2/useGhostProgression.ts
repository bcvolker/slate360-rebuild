"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Project-scoped progression ghost.
 *
 * Ghost mode is for before/after & progression reports: at the current spot,
 * surface every photo taken nearby across ALL walks in the project (different
 * walks, possibly months/years apart) so the user can pick a prior shot, match
 * its angle/distance, and re-capture. This hook is the data half — it asks the
 * existing /api/site-walk/nearby endpoint (GPS via the get_nearby_photos RPC,
 * with a project-wide fallback when location is unavailable) and resolves each
 * item to a viewable image URL. The picker UI is the rendering half.
 */
export type GhostPhoto = {
  id: string;
  url: string;
  capturedAt: string | null;
  authorName: string | null;
  distanceMeters: number | null;
};

type NearbyItem = Record<string, unknown> & { id: string };

const RADIUS_METERS = 75;

function toNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
function toStr(value: unknown): string | null {
  return typeof value === "string" && value ? value : null;
}

function getPosition(): Promise<GeolocationPosition | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return Promise.resolve(null);
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 },
    );
  });
}

export function useGhostProgression({
  enabled,
  projectId,
}: {
  enabled: boolean;
  projectId: string | null;
}) {
  const [photos, setPhotos] = useState<GhostPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [usedGps, setUsedGps] = useState(false);
  const loadedRef = useRef(false);

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const pos = await getPosition();
      const params = new URLSearchParams({ project_id: projectId, include_authors: "true" });
      if (pos) {
        params.set("lat", String(pos.coords.latitude));
        params.set("lng", String(pos.coords.longitude));
        params.set("radius", String(RADIUS_METERS));
      }
      setUsedGps(Boolean(pos));

      const res = await fetch(`/api/site-walk/nearby?${params.toString()}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Could not load nearby photos");
      const body = (await res.json()) as { items?: NearbyItem[] };

      const mapped: GhostPhoto[] = (body.items ?? [])
        .filter((it) => it.id && !String(it.id).startsWith("item-"))
        .map((it) => ({
          id: it.id,
          url: `/api/site-walk/items/${encodeURIComponent(it.id)}/image`,
          capturedAt: toStr(it.captured_at) ?? toStr(it.created_at),
          authorName: toStr(it.author_name),
          distanceMeters: toNumber(it.distance_meters) ?? toNumber(it.distance),
        }));

      setPhotos(mapped);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load nearby photos");
      setPhotos([]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // Load once when ghost mode is first enabled for a project walk.
  useEffect(() => {
    if (!enabled || !projectId || loadedRef.current) return;
    loadedRef.current = true;
    void load();
  }, [enabled, projectId, load]);

  const selectPhoto = useCallback((id: string | null) => {
    setSelectedId((current) => (current === id ? null : id));
  }, []);

  const refresh = useCallback(() => {
    loadedRef.current = true;
    void load();
  }, [load]);

  const selectedUrl = selectedId ? photos.find((p) => p.id === selectedId)?.url ?? null : null;

  return {
    photos,
    loading,
    error,
    selectedId,
    selectedUrl,
    selectPhoto,
    refresh,
    usedGps,
    /** True when there are prior photos in this project to compare against. */
    hasProgression: photos.length > 0,
  };
}
