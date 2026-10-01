"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Footprints, LayoutGrid, Map, MessageSquare, Minus, Orbit, Plus, RotateCcw, Share2, SlidersHorizontal, Square } from "lucide-react";
import { SplatViewerCore } from "@/components/digital-twin/splat-viewer-core";
import type { CameraMode, SplatViewerHandle } from "@/components/digital-twin/splat-viewer-constants";
import type { ProjectExperience, SpatialRef } from "@/lib/client-experience/types";
import { ProjectShell } from "./ProjectShell";
import { PlanCanvas } from "./PlanCanvas";
import { ItemPanel } from "./ItemPanel";
import { ViewerPanel, SharePanelBody } from "./ViewerPanel";

type Panel = "plan" | "items" | "share" | null;
type ViewMode = "walk" | "orbit" | "overview" | "top";
type Props = { data: ProjectExperience; initial: { item: string | null; panel: Panel } };

const MODES: { key: ViewMode; label: string; icon: typeof Orbit; hint: string }[] = [
  { key: "walk", label: "Walk", icon: Footprints, hint: "Click the floor to move · drag to look" },
  { key: "orbit", label: "Orbit", icon: Orbit, hint: "Drag to orbit · scroll to zoom · double-click to focus" },
  { key: "overview", label: "Overview", icon: LayoutGrid, hint: "Whole space at once" },
  { key: "top", label: "Top", icon: Square, hint: "Plan-like view from above" },
];

/**
 * Reality twin for clients. The Gaussian fills the viewport; the only chrome is
 * the shared shell, one mode group and the panel. Nothing about training,
 * cameras, confidence or point budgets is ever shown here — a model that is
 * not good enough simply is not published.
 */
export function TwinExperience({ data, initial }: Props) {
  const router = useRouter();
  const twin = data.twin!;
  const viewer = useRef<SplatViewerHandle>(null);
  const [mode, setMode] = useState<ViewMode>("orbit");
  const [panel, setPanel] = useState<Panel>(initial.panel ?? (initial.item ? "items" : null));
  const [itemId, setItemId] = useState<string | null>(initial.item);
  const item = data.items.find((i) => i.id === itemId) ?? null;
  const cameraMode: CameraMode = mode === "walk" ? "interior" : "orbit";
  const planItems = data.items.flatMap((i) => i.refs.filter((r) => r.kind === "plan").map((r) => (r.kind === "plan" ? { id: i.id, label: i.title, status: i.status, u: r.u, v: r.v } : null))).filter((x): x is NonNullable<typeof x> => Boolean(x));

  const applyMode = useCallback((m: ViewMode) => {
    setMode(m);
    const h = viewer.current;
    if (!h) return;
    if (m === "overview") h.recenter();
    if (m === "top") {
      const pose = h.getCameraPose();
      const target = pose?.target ?? [0, 0, 0];
      const dist = pose ? Math.hypot(pose.position[0] - target[0], pose.position[1] - target[1], pose.position[2] - target[2]) : 8;
      h.setCameraPose({ position: [target[0], target[1] + Math.max(dist, 6), target[2] + 0.001], target });
    }
  }, []);
  const onCoreMode = useCallback((m: CameraMode) => setMode((cur) => (m === "interior" ? "walk" : cur === "walk" ? "orbit" : cur)), []);
  const openRef = (_ref: SpatialRef) => { setPanel("items"); };
  const togglePanel = (p: Panel) => setPanel((cur) => (cur === p ? null : p));
  const shareUrl = typeof window === "undefined" ? "" : `${window.location.origin}${data.basePath}/twin`;
  const current = MODES.find((m) => m.key === mode)!;

  return (
    <div className="ce ce-viewer ce-twin" data-testid="ce-twin">
      <div className="ce-viewer__stage ce-twin__stage">
        <SplatViewerCore ref={viewer} src={twin.splatUrl} cameraMode={cameraMode} onCameraModeChange={onCoreMode} pickEnabled={mode === "walk"} quiet className="!rounded-none !border-0" />
      </div>
      <ProjectShell data={data} section="reality" immersive visitId={twin.visitId} backHref={data.basePath} viewLabel="Reality twin" />
      <div className="ce-viewer__hint" style={{ bottom: 84 }}>{current.hint}</div>

      <div className="ce-dock" data-testid="ce-dock">
        <div className="ce-dock__group" role="radiogroup" aria-label="View mode">
          {MODES.map((m) => (
            <button key={m.key} type="button" className="ce-dock__btn" role="radio" aria-checked={mode === m.key} aria-pressed={mode === m.key} onClick={() => applyMode(m.key)} title={m.hint}>
              <m.icon size={16} /> <span className="ce-dock__desktop">{m.label}</span>
            </button>
          ))}
          <button type="button" className="ce-dock__btn" onClick={() => { viewer.current?.recenter(); setMode("orbit"); }} aria-label="Reset view" title="Reset view"><RotateCcw size={16} /></button>
        </div>
        <span className="ce-dock__sep ce-dock__desktop" />
        <div className="ce-dock__group ce-dock__desktop">
          <button type="button" className="ce-dock__btn" onClick={() => togglePanel("plan")} aria-pressed={panel === "plan"}><Map size={16} /> Plan</button>
          <button type="button" className="ce-dock__btn" onClick={() => togglePanel("items")} aria-pressed={panel === "items"}><MessageSquare size={16} /> Items</button>
          <button type="button" className="ce-dock__btn" onClick={() => togglePanel("share")} aria-pressed={panel === "share"}><Share2 size={16} /></button>
          <span className="ce-dock__sep" />
          <button type="button" className="ce-dock__btn" onClick={() => viewer.current?.zoomOut()} aria-label="Zoom out"><Minus size={16} /></button>
          <button type="button" className="ce-dock__btn" onClick={() => viewer.current?.zoomIn()} aria-label="Zoom in"><Plus size={16} /></button>
        </div>
        <button type="button" className="ce-dock__btn ce-dock__mobile" onClick={() => togglePanel(panel ? null : "plan")} aria-pressed={panel !== null} aria-label="Tools"><SlidersHorizontal size={18} /></button>
      </div>

      <ViewerPanel open={panel !== null} title="Reality twin"
        tabs={[{ key: "plan", label: "Plan" }, { key: "items", label: "Items", count: data.items.length }, { key: "share", label: "Share" }]}
        activeTab={panel ?? undefined} onTab={(k) => setPanel(k as Panel)} onClose={() => setPanel(null)}>
        {panel === "plan" && data.plan ? (
          <div style={{ height: "100%", minHeight: 360 }}>
            <PlanCanvas sheet={data.plan} stations={data.stations.filter((s) => s.visitId === twin.visitId)} items={planItems} selectedItemId={itemId}
              waypoints={data.walkthrough?.visitId === twin.visitId ? data.walkthrough.waypoints : []}
              onStation={(s) => router.push(`${data.basePath}/stations?s=${s.id}`)} onWaypoint={(w) => router.push(`${data.basePath}/walk?t=${w.t}`)} onItem={(id) => { setItemId(id); setPanel("items"); }} />
          </div>
        ) : null}
        {panel === "items" ? (item ? (<><button type="button" className="ce-btn ce-btn--sm" style={{ margin: "12px 18px 0" }} onClick={() => setItemId(null)}>All items</button><ItemPanel item={item} basePath={data.basePath} currentKind="twin" onOpenHere={openRef} compact /></>) : (
          <div className="ce-list" style={{ padding: "0 8px" }}>
            {data.items.map((i) => (
              <button key={i.id} type="button" className="ce-row" style={{ textAlign: "left" }} onClick={() => setItemId(i.id)}>
                <div><div className="ce-row__title">{i.title}</div><div className="ce-row__sub">{i.refs.some((r) => r.kind === "twin") ? "In this twin" : "Other views"}</div></div>
                <span className={`ce-chip ce-chip--${i.status}`} />
              </button>
            ))}
          </div>
        )) : null}
        {panel === "share" ? <SharePanelBody url={shareUrl} /> : null}
      </ViewerPanel>
    </div>
  );
}
