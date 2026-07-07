"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useTourRealtime } from "@/hooks/useTourRealtime";
import {
  TourStudioWorkspace, type TourTab, type TourSceneRow,
} from "./TourStudioWorkspace";
import type { SceneView } from "./TourSceneViewer";
import type { PlanSetSummary, PlanPinRow } from "./TourPlanTab";

type TourRow = { id: string; title: string; status: "draft" | "published"; viewer_slug: string | null };

export function TourStudioShell({
  tourId,
  onBack,
  pendingFiles,
}: {
  tourId: string;
  onBack: () => void;
  /** Files chosen on the entry screen's drop zone before this tour existed —
   * uploaded once, the moment this workspace mounts. */
  pendingFiles?: FileList;
}) {
  const [tour, setTour] = useState<TourRow | null>(null);
  const [scenes, setScenes] = useState<TourSceneRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TourTab>("library");
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [planLoading, setPlanLoading] = useState(false);
  const [planLoaded, setPlanLoaded] = useState(false);
  const [planSets, setPlanSets] = useState<PlanSetSummary[]>([]);
  const [activePlanSheetId, setActivePlanSheetId] = useState<string | null>(null);
  const [planPins, setPlanPins] = useState<PlanPinRow[]>([]);
  const [creatingPin, setCreatingPin] = useState(false);

  const unwrap = (d: { data?: unknown } | unknown) =>
    (d && typeof d === "object" && "data" in d ? (d as { data: unknown }).data : d);

  const fetchScenes = useCallback(async () => {
    const r = await fetch(`/api/tours/${tourId}/scenes`);
    if (r.ok) {
      const list = (unwrap(await r.json()) as TourSceneRow[]) ?? [];
      setScenes(list);
      setActiveSceneId((cur) => cur ?? list[0]?.id ?? null);
    }
  }, [tourId]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/tours/${tourId}`);
        if (r.ok) setTour(unwrap(await r.json()) as TourRow);
        await fetchScenes();
      } finally {
        setLoading(false);
      }
    })();
  }, [tourId, fetchScenes]);

  const { connected } = useTourRealtime(tourId, fetchScenes);

  const resolveImageUrl = useCallback(
    async (sceneId: string, variant: "full" | "thumbnail") => {
      const r = await fetch(`/api/tours/${tourId}/scenes/${sceneId}/image?variant=${variant}`);
      if (!r.ok) return null;
      return ((unwrap(await r.json()) as { url?: string })?.url) ?? null;
    },
    [tourId],
  );

  async function readDims(file: File): Promise<{ width?: number; height?: number }> {
    try {
      const bmp = await createImageBitmap(file);
      const d = { width: bmp.width, height: bmp.height };
      bmp.close();
      return d;
    } catch {
      return {};
    }
  }

  const handleUpload = useCallback(async (files: FileList) => {
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const { width, height } = await readDims(file);
        const presign = await fetch(`/api/tours/${tourId}/scenes/upload`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: file.name, contentType: file.type, size: file.size, width, height }),
        });
        if (!presign.ok) continue;
        const { uploadUrl, s3Key } = (unwrap(await presign.json()) as { uploadUrl: string; s3Key: string });
        await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
        await fetch(`/api/tours/${tourId}/scenes/complete`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: file.name.replace(/\.\w+$/, ""), s3Key, size: file.size }),
        });
      }
      await fetchScenes();
    } finally {
      setUploading(false);
    }
  }, [tourId, fetchScenes]);

  const [pendingConsumed, setPendingConsumed] = useState(false);
  useEffect(() => {
    if (loading || pendingConsumed || !pendingFiles?.length) return;
    setPendingConsumed(true);
    void handleUpload(pendingFiles);
  }, [loading, pendingConsumed, pendingFiles, handleUpload]);

  const patchScene = useCallback(async (id: string, body: Record<string, unknown>) => {
    await fetch(`/api/tours/${tourId}/scenes/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    await fetchScenes();
  }, [tourId, fetchScenes]);

  const handleDelete = useCallback(async (id: string) => {
    await fetch(`/api/tours/${tourId}/scenes/${id}`, { method: "DELETE" });
    setScenes((p) => p.filter((s) => s.id !== id));
    setActiveSceneId((cur) => (cur === id ? null : cur));
  }, [tourId]);

  const handleReorder = useCallback(async (id: string, dir: "up" | "down") => {
    const idx = scenes.findIndex((s) => s.id === id);
    const swap = dir === "up" ? idx - 1 : idx + 1;
    if (idx < 0 || swap < 0 || swap >= scenes.length) return;
    const next = [...scenes];
    [next[idx], next[swap]] = [next[swap], next[idx]];
    setScenes(next);
    await fetch(`/api/tours/${tourId}/scenes/reorder`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sceneIds: next.map((s) => s.id) }),
    });
  }, [scenes, tourId]);

  const handleSetStartView = useCallback((id: string, v: SceneView) => {
    void patchScene(id, { initial_yaw: v.yaw, initial_pitch: v.pitch, default_zoom: v.zoom });
  }, [patchScene]);

  const handleRestrictView = useCallback((id: string, v: SceneView) => {
    // Keep-out: clamp the camera to a window around the framed view. Enforcement is
    // refined in P2; P0 records the author's intent + a basic FOV clamp.
    void patchScene(id, {
      view_limits: { center: { yaw: v.yaw, pitch: v.pitch }, mode: "restrict", zoom: v.zoom },
      max_fov: 90,
    });
  }, [patchScene]);

  const handlePublish = useCallback(async () => {
    if (!tour) return;
    setPublishing(true);
    try {
      const next = tour.status === "published" ? "draft" : "published";
      const r = await fetch(`/api/tours/${tourId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: next }),
      });
      if (r.ok) {
        const updated = unwrap(await r.json()) as Partial<TourRow>;
        setTour((t) => (t ? { ...t, ...updated } : t));
      }
    } finally {
      setPublishing(false);
    }
  }, [tour, tourId]);

  // Lazy: only fetch plan sheets/pins once the Plan tab is actually opened —
  // not every tour has (or needs) a plan set.
  useEffect(() => {
    if (tab !== "plan" || planLoaded) return;
    (async () => {
      setPlanLoading(true);
      try {
        const [sheetsRes, pinsRes] = await Promise.all([
          fetch(`/api/tours/${tourId}/plan-sheets`),
          fetch(`/api/tours/${tourId}/plan-pins`),
        ]);
        if (sheetsRes.ok) {
          const data = unwrap(await sheetsRes.json()) as { planSetId: string | null; planSets: PlanSetSummary[] };
          setPlanSets(data.planSets ?? []);
          setActivePlanSheetId((cur) => cur ?? data.planSets?.[0]?.sheets?.[0]?.id ?? null);
        }
        if (pinsRes.ok) {
          setPlanPins((unwrap(await pinsRes.json()) as PlanPinRow[]) ?? []);
        }
      } finally {
        setPlanLoading(false);
        setPlanLoaded(true);
      }
    })();
  }, [tab, planLoaded, tourId]);

  const handlePlacePin = useCallback(async (xPct: number, yPct: number, sceneId: string) => {
    if (!activePlanSheetId) return;
    setCreatingPin(true);
    try {
      const r = await fetch(`/api/tours/${tourId}/plan-pins`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planSheetId: activePlanSheetId, sceneId, xPct, yPct }),
      });
      if (r.ok) {
        const newPin = unwrap(await r.json()) as PlanPinRow;
        setPlanPins((prev) => [...prev, newPin]);
      }
    } finally {
      setCreatingPin(false);
    }
  }, [tourId, activePlanSheetId]);

  const handleDeletePin = useCallback(async (pinId: string) => {
    await fetch(`/api/tours/${tourId}/plan-pins/${pinId}`, { method: "DELETE" });
    setPlanPins((prev) => prev.filter((p) => p.id !== pinId));
  }, [tourId]);

  if (loading) {
    return <div className="grid h-full place-items-center"><Loader2 className="size-6 animate-spin text-[var(--graphite-muted)]" /></div>;
  }
  if (!tour) {
    return <div className="grid h-full place-items-center text-sm text-[var(--graphite-muted)]">Tour not found.</div>;
  }

  return (
    <TourStudioWorkspace
      title={tour.title}
      tourStatus={tour.status}
      viewerSlug={tour.viewer_slug}
      scenes={scenes}
      connected={connected}
      uploading={uploading}
      activeTab={tab}
      onTab={setTab}
      activeSceneId={activeSceneId}
      onSelectScene={setActiveSceneId}
      resolveImageUrl={resolveImageUrl}
      onUpload={handleUpload}
      onDeleteScene={handleDelete}
      onReorder={handleReorder}
      onSetStartView={handleSetStartView}
      onRestrictView={handleRestrictView}
      onPublish={handlePublish}
      publishing={publishing}
      onBack={onBack}
      planLoading={planLoading}
      planSets={planSets}
      activePlanSheetId={activePlanSheetId}
      onSelectPlanSheet={setActivePlanSheetId}
      planPins={planPins}
      onPlacePin={handlePlacePin}
      onDeletePin={handleDeletePin}
      creatingPin={creatingPin}
    />
  );
}
