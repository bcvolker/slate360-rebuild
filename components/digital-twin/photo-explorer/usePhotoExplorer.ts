"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  twinCamerasEndpoint,
  twinPhotoUrl,
  type TwinCameraPose,
  type TwinCamerasDocument,
} from "@/lib/digital-twin/twin-cameras";

export type PhotoExplorerSource = {
  modelUrl?: string | null;
  shareToken?: string | null;
  modelId?: string | null;
};

function resolveCamerasUrl(source: PhotoExplorerSource): string | null {
  if (source.shareToken) return `/api/share/twin/${source.shareToken}/cameras`;
  if (source.modelId) return `/api/digital-twin/models/${source.modelId}/cameras`;
  if (source.modelUrl) return twinCamerasEndpoint(source.modelUrl);
  return null;
}

function resolvePhotoUrl(source: PhotoExplorerSource, assetId: string): string | null {
  if (source.shareToken) return `/api/share/twin/${source.shareToken}/photo/${assetId}`;
  if (source.modelId) return `/api/digital-twin/models/${source.modelId}/photo/${assetId}`;
  if (source.modelUrl) return twinPhotoUrl(source.modelUrl, assetId);
  return null;
}

function normalizeCameras(data: unknown): TwinCamerasDocument | null {
  if (Array.isArray(data)) {
    return { cameraCount: data.length, cameras: data as TwinCameraPose[] };
  }
  if (data && typeof data === "object" && Array.isArray((data as TwinCamerasDocument).cameras)) {
    return data as TwinCamerasDocument;
  }
  return null;
}

export function usePhotoExplorer(source: PhotoExplorerSource) {
  const camerasUrl = resolveCamerasUrl(source);
  const [doc, setDoc] = useState<TwinCamerasDocument | null>(null);
  const [layerOn, setLayerOn] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!camerasUrl) {
      setDoc(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void fetch(camerasUrl)
      .then(async (res) => (res.ok ? normalizeCameras(await res.json()) : null))
      .then((next) => {
        if (cancelled) return;
        setDoc(next);
        setLoading(false);
        setSelectedIndex(null);
      })
      .catch(() => {
        if (!cancelled) {
          setDoc(null);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [camerasUrl]);

  const cameras = doc?.cameras ?? [];
  const available = cameras.length > 0;
  const selected: TwinCameraPose | null =
    selectedIndex != null ? cameras[selectedIndex] ?? null : null;

  const photoUrl = useMemo(() => {
    if (!selected?.assetId) return null;
    return resolvePhotoUrl(source, selected.assetId);
  }, [source.shareToken, source.modelId, source.modelUrl, selected?.assetId]);

  const toggleLayer = useCallback(() => setLayerOn((on) => !on), []);
  const clearSelection = useCallback(() => setSelectedIndex(null), []);

  return {
    cameras,
    available,
    loading,
    layerOn,
    toggleLayer,
    selectedIndex,
    setSelectedIndex,
    hoveredIndex,
    setHoveredIndex,
    selected,
    photoUrl,
    clearSelection,
  };
}
