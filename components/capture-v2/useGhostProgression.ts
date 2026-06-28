"use client";

import { useCallback, useEffect, useState } from "react";

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
  /** SW-004: compass heading (deg) the prior photo was shot at, if captured. */
  heading: number | null;
};

type NearbyItem = Record<string, unknown> & { id: string };

const FEET_PER_METER = 3.28084;
/** Smallest, most precise default — the user can widen. */
const DEFAULT_RADIUS_FT = 5;
/** GPS can't discriminate below its own error; widen the query to ~2.5× accuracy. */
const ACCURACY_WIDEN_FACTOR = 2.5;
/** Never query a silly-large area even on a terrible fix. */
const MAX_RADIUS_METERS = 120;
/** Below this the GPS radius is meaningless; keep a sane floor. */
const MIN_RADIUS_METERS = 1.5;

function toNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
function toStr(value: unknown): string | null {
  return typeof value === "string" && value ? value : null;
}
/** SW-004: pull the stored compass heading out of an item's capture metadata. */
function extractHeading(it: NearbyItem): number | null {
  const md = it.metadata;
  if (md && typeof md === "object") {
    const ori = (md as Record<string, unknown>).orientation;
    if (ori && typeof ori === "object") {
      return toNumber((ori as Record<string, unknown>).compass_heading);
    }
  }
  return null;
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
  radiusFt = DEFAULT_RADIUS_FT,
}: {
  enabled: boolean;
  projectId: string | null;
  /** User-selected vicinity in feet (default 5ft, the most precise). */
  radiusFt?: number;
}) {
  const [photos, setPhotos] = useState<GhostPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [usedGps, setUsedGps] = useState(false);
  /** True when GPS accuracy forced the query wider than the user asked for. */
  const [weakGps, setWeakGps] = useState(false);
  /** The radius actually queried, in feet (so the UI can say "showing nearby within N ft"). */
  const [effectiveRadiusFt, setEffectiveRadiusFt] = useState(radiusFt);

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const pos = await getPosition();
      const params = new URLSearchParams({ project_id: projectId, include_authors: "true" });
      const requestedM = Math.max(MIN_RADIUS_METERS, radiusFt / FEET_PER_METER);
      if (pos) {
        // GPS can't resolve below its own error radius — widen the query to at least
        // ~2.5× the reported accuracy so we don't silently miss true matches sitting
        // just outside the noise. Surface that we widened so the UI can be honest.
        const accuracyM = Number.isFinite(pos.coords.accuracy) ? pos.coords.accuracy : 0;
        const effectiveM = Math.min(
          MAX_RADIUS_METERS,
          Math.max(requestedM, accuracyM * ACCURACY_WIDEN_FACTOR),
        );
        params.set("lat", String(pos.coords.latitude));
        params.set("lng", String(pos.coords.longitude));
        params.set("radius", String(effectiveM));
        setWeakGps(effectiveM > requestedM * 1.5);
        setEffectiveRadiusFt(Math.round(effectiveM * FEET_PER_METER));
      } else {
        setWeakGps(false);
        setEffectiveRadiusFt(radiusFt);
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
          heading: extractHeading(it),
        }));

      setPhotos(mapped);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load nearby photos");
      setPhotos([]);
    } finally {
      setLoading(false);
    }
  }, [projectId, radiusFt]);

  // Reload when ghost is enabled, or when the user changes the vicinity radius.
  useEffect(() => {
    if (!enabled || !projectId) return;
    void load();
  }, [enabled, projectId, radiusFt, load]);

  const selectPhoto = useCallback((id: string | null) => {
    setSelectedId((current) => (current === id ? null : id));
  }, []);

  const refresh = useCallback(() => {
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
    /** GPS accuracy forced the query wider than the user's selected vicinity. */
    weakGps,
    /** Radius actually queried (feet) — show "nearby within N ft" when widened. */
    effectiveRadiusFt,
    /** True when there are prior photos in this project to compare against. */
    hasProgression: photos.length > 0,
  };
}
