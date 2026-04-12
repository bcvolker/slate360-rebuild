"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft, Upload, GripVertical, Trash2, Loader2, Eye, Settings,
  ChevronUp, ChevronDown, Globe, Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TourPanoViewer } from "./TourPanoViewer";
import { TourSettingsPanel } from "./TourSettingsPanel";
import type { TourScene } from "@/lib/types/tours";

interface TourEditorClientProps {
  tourId: string;
  onBack: () => void;
}

interface TourData {
  id: string;
  title: string;
  description: string | null;
  status: "draft" | "published";
  viewer_slug: string | null;
}

export function TourEditorClient({ tourId, onBack }: TourEditorClientProps) {
  const [tour, setTour] = useState<TourData | null>(null);
  const [scenes, setScenes] = useState<TourScene[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeScene, setActiveScene] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchTour = useCallback(async () => {
    setLoading(true);
    try {
      const [tourRes, scenesRes] = await Promise.all([
        fetch(`/api/tours/${tourId}`),
        fetch(`/api/tours/${tourId}/scenes`),
      ]);
      if (tourRes.ok) {
        const d = await tourRes.json();
        setTour(d.data ?? d);
      }
      if (scenesRes.ok) {
        const d = await scenesRes.json();
        const list = d.data ?? d ?? [];
        setScenes(list);
        if (list.length > 0 && !activeScene) setActiveScene(list[0].id);
      }
    } finally {
      setLoading(false);
    }
  }, [tourId, activeScene]);

  useEffect(() => { fetchTour(); }, [fetchTour]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !tour) return;
    setUploading(true);
    try {
      // 1. Get presigned URL
      const urlRes = await fetch(`/api/tours/${tourId}/scenes/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          size: file.size,
        }),
      });
      if (!urlRes.ok) return;
      const { data: urlData } = await urlRes.json();

      // 2. Upload to S3
      await fetch(urlData.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      // 3. Complete scene creation
      const completeRes = await fetch(`/api/tours/${tourId}/scenes/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: file.name.replace(/\.\w+$/, ""),
          s3Key: urlData.s3Key,
          size: file.size,
        }),
      });
      if (completeRes.ok) {
        const { data: scene } = await completeRes.json();
        setScenes((prev) => [...prev, scene]);
        setActiveScene(scene.id);
      }
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleDeleteScene(sceneId: string) {
    const res = await fetch(`/api/tours/${tourId}/scenes/${sceneId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      const remaining = scenes.filter((s) => s.id !== sceneId);
      setScenes(remaining);
      if (activeScene === sceneId) {
        setActiveScene(remaining[0]?.id ?? null);
      }
    }
  }

  async function handleReorder(sceneId: string, direction: "up" | "down") {
    const idx = scenes.findIndex((s) => s.id === sceneId);
    if (idx < 0) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= scenes.length) return;
    const updated = [...scenes];
    [updated[idx], updated[swapIdx]] = [updated[swapIdx], updated[idx]];
    setScenes(updated);
    // Persist sort_order via dedicated reorder endpoint
    await fetch(`/api/tours/${tourId}/scenes/reorder`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sceneIds: updated.map((s) => s.id),
      }),
    });
  }

  async function handlePublish() {
    if (!tour) return;
    setSaving(true);
    const newStatus = tour.status === "published" ? "draft" : "published";
    const res = await fetch(`/api/tours/${tourId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) setTour({ ...tour, status: newStatus });
    setSaving(false);
  }

  async function handleSaveSettings(title: string, description: string) {
    if (!tour) return;
    setSaving(true);
    const res = await fetch(`/api/tours/${tourId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description }),
    });
    if (res.ok) {
      setTour({ ...tour, title, description });
      setShowSettings(false);
    }
    setSaving(false);
  }

  const currentScene = scenes.find((s) => s.id === activeScene);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!tour) return <p className="text-center text-sm text-muted-foreground">Tour not found.</p>;

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="mr-1 size-4" /> Tours
          </Button>
          <h2 className="text-lg font-bold">{tour.title}</h2>
          <Badge variant={tour.status === "published" ? "default" : "secondary"}>
            {tour.status}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowSettings(true)}>
            <Settings className="mr-1 size-3.5" /> Settings
          </Button>
          {tour.viewer_slug && tour.status === "published" && (
            <Button variant="outline" size="sm" asChild>
              <a href={`/tours/view/${tour.viewer_slug}`} target="_blank" rel="noopener">
                <Share2 className="mr-1 size-3.5" /> View
              </a>
            </Button>
          )}
          <Button size="sm" onClick={handlePublish} disabled={saving || scenes.length === 0}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : (
              <><Globe className="mr-1 size-3.5" /> {tour.status === "published" ? "Unpublish" : "Publish"}</>
            )}
          </Button>
        </div>
      </div>

      {/* Settings modal */}
      {showSettings && (
        <TourSettingsPanel
          title={tour.title}
          description={tour.description ?? ""}
          saving={saving}
          onSave={handleSaveSettings}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Main layout: scene list + viewer */}
      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* Scene sidebar */}
        <div className="flex w-60 shrink-0 flex-col gap-2 overflow-y-auto">
          <label className="cursor-pointer">
            <input type="file" accept="image/jpeg,image/png" className="hidden" onChange={handleUpload} />
            <div className="flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border px-3 py-3 text-sm text-muted-foreground transition hover:border-primary hover:text-primary">
              {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
              {uploading ? "Uploading…" : "Add Scene"}
            </div>
          </label>

          {scenes.map((scene, idx) => (
            <Card
              key={scene.id}
              className={`cursor-pointer transition ${activeScene === scene.id ? "ring-2 ring-primary" : ""}`}
              onClick={() => setActiveScene(scene.id)}
            >
              <CardContent className="flex items-center gap-2 px-3 py-2">
                <GripVertical className="size-3.5 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">{scene.title}</p>
                  <p className="text-[10px] text-muted-foreground">Scene {idx + 1}</p>
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  <Button variant="ghost" size="icon-xs" disabled={idx === 0}
                          onClick={(e) => { e.stopPropagation(); handleReorder(scene.id, "up"); }}>
                    <ChevronUp className="size-3" />
                  </Button>
                  <Button variant="ghost" size="icon-xs" disabled={idx === scenes.length - 1}
                          onClick={(e) => { e.stopPropagation(); handleReorder(scene.id, "down"); }}>
                    <ChevronDown className="size-3" />
                  </Button>
                  <Button variant="ghost" size="icon-xs" className="text-destructive"
                          onClick={(e) => { e.stopPropagation(); handleDeleteScene(scene.id); }}>
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Viewer */}
        <div className="flex-1 overflow-hidden rounded-lg bg-black">
          {currentScene ? (
            <TourPanoViewer
              src={currentScene.panoramaPath}
              initialYaw={currentScene.initialYaw ?? 0}
              initialPitch={currentScene.initialPitch ?? 0}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-zinc-500">
              <div className="text-center">
                <Eye className="mx-auto mb-2 size-8" />
                <p>Upload a panorama to get started</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
