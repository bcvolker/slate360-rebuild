"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft, Upload, Trash2, Loader2, Globe, Crosshair, EyeOff,
  CheckCircle2, ChevronUp, ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  StudioWorkspaceShell, StudioTabs, type StudioTab,
} from "@/components/studio/StudioWorkspaceShell";
import { TourSceneViewer, type TourSceneViewerHandle, type SceneView } from "./TourSceneViewer";
import { TourPlanTab, type PlanSetSummary, type PlanPinRow } from "./TourPlanTab";
import { StatusChip, SceneThumb } from "./TourSceneThumb";

export type TourTab = "library" | "build" | "plan" | "deliverables" | "analytics";
export type SceneStatus = "uploading" | "processing" | "ready" | "failed";

export type TourSceneRow = {
  id: string;
  title: string;
  sort_order: number;
  status: SceneStatus;
  processing_error?: string | null;
  initial_yaw?: number | null;
  initial_pitch?: number | null;
  default_zoom?: number | null;
  file_size_bytes?: number | null;
};

export type TourStudioWorkspaceProps = {
  title: string;
  tourStatus: "draft" | "published";
  viewerSlug?: string | null;
  scenes: TourSceneRow[];
  connected?: boolean;
  uploading?: boolean;
  activeTab: TourTab;
  onTab: (t: TourTab) => void;
  activeSceneId: string | null;
  onSelectScene: (id: string) => void;
  /** Resolve a displayable (signed) URL for a scene asset. */
  resolveImageUrl: (sceneId: string, variant: "full" | "thumbnail") => Promise<string | null>;
  onUpload: (files: FileList) => void;
  onDeleteScene: (id: string) => void;
  onReorder: (id: string, dir: "up" | "down") => void;
  onSetStartView: (id: string, view: SceneView) => void;
  onRestrictView: (id: string, view: SceneView) => void;
  onPublish: () => void;
  publishing?: boolean;
  onBack: () => void;
  planLoading: boolean;
  planSets: PlanSetSummary[];
  activePlanSheetId: string | null;
  onSelectPlanSheet: (sheetId: string) => void;
  planPins: PlanPinRow[];
  onPlacePin: (xPct: number, yPct: number, sceneId: string) => void;
  onDeletePin: (pinId: string) => void;
  creatingPin: boolean;
};

const TABS: StudioTab<TourTab>[] = [
  { id: "library", label: "Library" },
  { id: "build", label: "Build" },
  { id: "plan", label: "Plan" },
  { id: "deliverables", label: "Deliverables" },
  { id: "analytics", label: "Analytics" },
];

export function TourStudioWorkspace(props: TourStudioWorkspaceProps) {
  const {
    title, tourStatus, viewerSlug, scenes, connected, uploading,
    activeTab, onTab, activeSceneId, onSelectScene, resolveImageUrl,
    onUpload, onDeleteScene, onReorder, onSetStartView, onRestrictView,
    onPublish, publishing, onBack,
    planLoading, planSets, activePlanSheetId, onSelectPlanSheet, planPins,
    onPlacePin, onDeletePin, creatingPin,
  } = props;

  const fileRef = useRef<HTMLInputElement>(null);
  const viewerRef = useRef<TourSceneViewerHandle>(null);
  const [buildUrl, setBuildUrl] = useState<string | null>(null);
  const activeScene = scenes.find((s) => s.id === activeSceneId) ?? null;

  // Resolve the full-res signed URL for the active Build scene.
  useEffect(() => {
    let alive = true;
    setBuildUrl(null);
    if (activeScene && activeScene.status === "ready") {
      resolveImageUrl(activeScene.id, "full").then((u) => { if (alive) setBuildUrl(u); });
    }
    return () => { alive = false; };
  }, [activeScene?.id, activeScene?.status, resolveImageUrl]);

  const readyCount = scenes.filter((s) => s.status === "ready").length;

  return (
    <StudioWorkspaceShell
      title="360° Tours"
      subtitle={title}
      leftSlot={
        <button onClick={onBack} className="flex items-center gap-1 rounded px-1.5 py-1 text-xs text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)]">
          <ArrowLeft className="size-3.5" /> Tours
        </button>
      }
      tabsSlot={<StudioTabs tabs={TABS} active={activeTab} onChange={onTab} />}
      rightSlot={
        <>
          <Badge variant={tourStatus === "published" ? "default" : "secondary"} className="gap-1">
            {tourStatus === "published" ? <><Globe className="size-3" /> Published</> : "Draft"}
          </Badge>
          {!connected && <span className="text-[10px] text-[var(--graphite-muted)]">·offline</span>}
        </>
      }
    >
      {/* ── Library ─────────────────────────────────────────────── */}
      {activeTab === "library" && (
        <div className="h-full overflow-y-auto p-4">
          <input
            ref={fileRef} type="file" accept="image/jpeg,image/png" multiple className="hidden"
            onChange={(e) => { if (e.target.files?.length) onUpload(e.target.files); e.target.value = ""; }}
          />
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files?.length) onUpload(e.dataTransfer.files); }}
            className="mb-4 flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--mobile-app-card-border)] px-4 py-6 text-sm text-[var(--graphite-muted)] transition hover:border-[var(--graphite-primary)] hover:text-[var(--graphite-text-header)]"
          >
            {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            {uploading ? "Uploading…" : "Drag equirectangular panoramas here, or click to upload (JPG/PNG, 2:1)"}
          </div>

          {scenes.length === 0 ? (
            <p className="py-12 text-center text-sm text-[var(--graphite-muted)]">
              No scenes yet. Upload a 360° panorama exported from any camera or drone app.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {scenes.map((s) => (
                <div key={s.id} className="group overflow-hidden rounded-xl border border-[var(--mobile-app-card-border)]">
                  <SceneThumb scene={s} resolveImageUrl={resolveImageUrl} className="aspect-video w-full" />
                  <div className="flex items-center justify-between gap-1 px-2 py-1.5">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-[var(--graphite-text-header)]">{s.title}</p>
                      <StatusChip status={s.status} />
                    </div>
                    <Button variant="ghost" size="icon-xs" className="text-red-400 opacity-0 group-hover:opacity-100"
                      onClick={() => onDeleteScene(s.id)}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Build ───────────────────────────────────────────────── */}
      {activeTab === "build" && (
        <div className="flex h-full min-h-0">
          {/* scene list */}
          <aside className="flex w-52 shrink-0 flex-col gap-1.5 overflow-y-auto border-r border-[var(--mobile-app-card-border)] p-2">
            {scenes.map((s, i) => (
              <div key={s.id}
                onClick={() => onSelectScene(s.id)}
                className={`flex cursor-pointer items-center gap-2 rounded-lg p-1.5 text-xs ${activeSceneId === s.id ? "bg-[color-mix(in_srgb,var(--graphite-primary)_16%,transparent)]" : "hover:bg-[color-mix(in_srgb,var(--graphite-text-header)_6%,transparent)]"}`}>
                <SceneThumb scene={s} resolveImageUrl={resolveImageUrl} className="size-10 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[var(--graphite-text-header)]">{s.title}</p>
                  <StatusChip status={s.status} />
                </div>
                <div className="flex flex-col">
                  <button disabled={i === 0} onClick={(e) => { e.stopPropagation(); onReorder(s.id, "up"); }} className="text-[var(--graphite-muted)] disabled:opacity-30"><ChevronUp className="size-3" /></button>
                  <button disabled={i === scenes.length - 1} onClick={(e) => { e.stopPropagation(); onReorder(s.id, "down"); }} className="text-[var(--graphite-muted)] disabled:opacity-30"><ChevronDown className="size-3" /></button>
                </div>
              </div>
            ))}
          </aside>

          {/* viewer */}
          <main className="relative min-w-0 flex-1 bg-black">
            {activeScene && buildUrl ? (
              <TourSceneViewer
                ref={viewerRef}
                src={buildUrl}
                initialYaw={activeScene.initial_yaw ?? 0}
                initialPitch={activeScene.initial_pitch ?? 0}
                initialZoom={activeScene.default_zoom ?? undefined}
              />
            ) : (
              <div className="grid h-full place-items-center text-sm text-[var(--graphite-muted)]">
                {activeScene ? (activeScene.status !== "ready" ? "Scene is still processing…" : <Loader2 className="size-5 animate-spin" />) : "Select a scene"}
              </div>
            )}
          </main>

          {/* inspector */}
          <aside className="flex w-64 shrink-0 flex-col gap-3 overflow-y-auto border-l border-[var(--mobile-app-card-border)] p-3 text-xs">
            <p className="font-semibold text-[var(--graphite-text-header)]">{activeScene?.title ?? "No scene"}</p>
            <p className="text-[var(--graphite-muted)]">
              Frame the pano to the exact angle and zoom you want, then capture it.
            </p>
            <Button size="sm" variant="outline" disabled={!activeScene || activeScene.status !== "ready"}
              onClick={() => { const v = viewerRef.current?.getView(); if (v && activeScene) onSetStartView(activeScene.id, v); }}>
              <Crosshair className="mr-1.5 size-3.5" /> Set as start view
            </Button>
            <Button size="sm" variant="outline" disabled={!activeScene || activeScene.status !== "ready"}
              onClick={() => { const v = viewerRef.current?.getView(); if (v && activeScene) onRestrictView(activeScene.id, v); }}>
              <EyeOff className="mr-1.5 size-3.5" /> Restrict this view
            </Button>
            {activeScene && (activeScene.initial_yaw != null) && (
              <p className="flex items-center gap-1 text-[10px] text-emerald-400">
                <CheckCircle2 className="size-3" /> Start view set ({Math.round(activeScene.initial_yaw)}°, {Math.round(activeScene.initial_pitch ?? 0)}°)
              </p>
            )}
            <p className="mt-2 text-[10px] text-[var(--graphite-muted)]">
              Hotspots, text layers & guided paths arrive in the next phase.
            </p>
          </aside>
        </div>
      )}

      {/* ── Plan ────────────────────────────────────────────────── */}
      {activeTab === "plan" && (
        <TourPlanTab
          loading={planLoading}
          planSets={planSets}
          activeSheetId={activePlanSheetId}
          onSelectSheet={onSelectPlanSheet}
          pins={planPins}
          scenes={scenes}
          onPlacePin={onPlacePin}
          onDeletePin={onDeletePin}
          creatingPin={creatingPin}
        />
      )}

      {/* ── Deliverables ───────────────────────────────────────────────── */}
      {activeTab === "deliverables" && (
        <div className="h-full overflow-y-auto p-6">
          <div className="mx-auto max-w-lg space-y-4">
            <h2 className="text-sm font-semibold text-[var(--graphite-text-header)]">Interactive Link</h2>
            <p className="text-xs text-[var(--graphite-muted)]">
              {readyCount} scene{readyCount === 1 ? "" : "s"} ready. This link is the plan-sheet walkthrough
              automatically if the tour has plan pins, otherwise the scene-to-scene viewer.
            </p>
            <Button size="sm" onClick={onPublish} disabled={publishing || readyCount === 0}>
              {publishing ? <Loader2 className="size-4 animate-spin" /> : <><Globe className="mr-1.5 size-3.5" /> {tourStatus === "published" ? "Unpublish" : "Publish"}</>}
            </Button>
            {tourStatus === "published" && viewerSlug && (
              <a href={`/tours/view/${viewerSlug}`} target="_blank" rel="noopener"
                className="block text-xs text-[var(--graphite-primary)] underline">
                Open public tour →
              </a>
            )}
            <div className="border-t border-[var(--mobile-app-card-border)] pt-4">
              <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--graphite-muted)]">
                Coming to Deliverables
              </p>
              <p className="mt-1.5 text-xs text-[var(--graphite-muted)]">
                Embed snippet, MLS-compliant unbranded export, PDF leave-behind, video flythrough,
                offline tour package, and VR/headset entry — see TOUR_BUILDER_PLAN.md §9.2.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Analytics ───────────────────────────────────────────── */}
      {activeTab === "analytics" && (
        <div className="grid h-full place-items-center p-6 text-center text-sm text-[var(--graphite-muted)]">
          Views, hotspot clicks and dwell time appear here once the tour is published (P2).
        </div>
      )}
    </StudioWorkspaceShell>
  );
}
