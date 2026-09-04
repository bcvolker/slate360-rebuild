"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Footprints, LayoutGrid, Map, MessageSquare, Minus, Orbit, Plane, Plus, RotateCcw, SlidersHorizontal, Square } from "lucide-react";
import { SplatViewerCore } from "@/components/digital-twin/splat-viewer-core";
import type { CameraMode, SplatViewerHandle } from "@/components/digital-twin/splat-viewer-constants";
import type { ProjectExperience } from "@/lib/client-experience/types";
import { withSuffix } from "@/lib/client-experience/utils";
import { ProjectShell } from "./ProjectShell";
import { brandStyle } from "@/lib/client-experience/layout";
import { PlanCanvas } from "./PlanCanvas";
import { ItemPanel } from "./ItemPanel";
import { ReferencesPanel } from "./ReferencesPanel";
import { ViewerPanel, SharePanelBody } from "./ViewerPanel";
import { planItemMarkers } from "./WalkPanels";
import { useProjectItems } from "./useProjectItems";

type Panel = "plan" | "items" | "mode" | "more" | null;
type ViewMode = "walk" | "orbit" | "fly" | "overview" | "top";
type Props = { data: ProjectExperience; initial: { item: string | null; panel: Panel } };

const MODES: { key: ViewMode; label: string; icon: typeof Orbit; hint: string }[] = [
  { key: "walk", label: "Walk", icon: Footprints, hint: "Click the floor to move · drag to look" },
  { key: "orbit", label: "Orbit", icon: Orbit, hint: "Drag to orbit · scroll to zoom · double-click to focus" },
  { key: "fly", label: "Fly", icon: Plane, hint: "Drag to look · scroll to move forward" },
  { key: "overview", label: "Overview", icon: LayoutGrid, hint: "Whole space at once" },
  { key: "top", label: "Top", icon: Square, hint: "Plan-like view from above" },
];

/**
 * Reality twin chrome. Only reachable when the capability resolver says the
 * model is accepted (in the preview: an explicitly simulated fixture). Nothing
 * about training, cameras, confidence or point budgets is ever shown.
 * Walk-mode click-to-move uses the core's floor-plane navigation proxy.
 */
export function TwinExperience({ data, initial }: Props) {
  const router = useRouter();
  const twin = data.twin!;
  const viewer = useRef<SplatViewerHandle>(null);
  const [mode, setMode] = useState<ViewMode>("orbit");
  const [panel, setPanel] = useState<Panel>(initial.panel ?? (initial.item ? "items" : null));
  const [itemId, setItemId] = useState<string | null>(initial.item);
  const { items, reply } = useProjectItems(data.items);
  const item = items.find((i) => i.id === itemId) ?? null;
  const cameraMode: CameraMode = mode === "walk" ? "interior" : "orbit";

  const applyMode = useCallback((m: ViewMode) => {
    setMode(m);
    const h = viewer.current; if (!h) return;
    if (m === "overview") h.recenter();
    if (m === "top") {
      const pose = h.getCameraPose(); const target = pose?.target ?? [0, 0, 0];
      const dist = pose ? Math.hypot(pose.position[0] - target[0], pose.position[1] - target[1], pose.position[2] - target[2]) : 8;
      h.setCameraPose({ position: [target[0], target[1] + Math.max(dist, 6), target[2] + 0.001], target });
    }
  }, []);
  const onCoreMode = useCallback((m: CameraMode) => setMode((cur) => (m === "interior" ? "walk" : cur === "walk" ? "orbit" : cur)), []);
  const togglePanel = (p: Panel) => setPanel((cur) => (cur === p ? null : p));
  const current = MODES.find((m) => m.key === mode)!;
  const openCount = items.filter((i) => i.status !== "resolved").length;

  return (
    <div className="ce ce-viewer ce-twin" data-testid="ce-twin" data-simulated={twin.simulated ? "true" : undefined} style={brandStyle(data)}>
      <div className="ce-viewer__stage">
        <SplatViewerCore ref={viewer} src={twin.splatUrl} cameraMode={cameraMode} onCameraModeChange={onCoreMode} pickEnabled={mode === "walk"} quiet className="!rounded-none !border-0" />
      </div>
      <ProjectShell data={data} section="reality" immersive visitId={twin.visitId} backHref={data.basePath} viewLabel="Reality twin" onShare={() => setPanel("more")} />
      <div className="ce-viewer__hint">{current.hint}</div>

      <div className="ce-dock" data-testid="ce-dock">
        <div className="ce-dock__group ce-dock__desktop" role="radiogroup" aria-label="View mode">
          {MODES.map((m) => (
            <button key={m.key} type="button" className="ce-dock__btn" role="radio" aria-checked={mode === m.key} aria-pressed={mode === m.key} onClick={() => applyMode(m.key)} title={m.hint}><m.icon size={16} /> {m.label}</button>
          ))}
        </div>
        <button type="button" className="ce-dock__btn ce-dock__mobile" onClick={() => togglePanel("mode")} aria-pressed={panel === "mode"}><current.icon size={16} /> {current.label}</button>
        <span className="ce-dock__sep ce-dock__desktop" />
        <div className="ce-dock__group ce-dock__desktop">
          {data.plan ? <button type="button" className="ce-dock__btn" onClick={() => togglePanel("plan")} aria-pressed={panel === "plan"}><Map size={16} /> Plan</button> : null}
          <button type="button" className="ce-dock__btn" onClick={() => { setItemId(null); togglePanel("items"); }} aria-pressed={panel === "items"}><MessageSquare size={16} /> Items{openCount ? <span className="ce-badge">{openCount}</span> : null}</button>
          <span className="ce-dock__sep" />
          <button type="button" className="ce-dock__btn" onClick={() => viewer.current?.zoomOut()} aria-label="Zoom out"><Minus size={16} /></button>
          <button type="button" className="ce-dock__btn" onClick={() => viewer.current?.zoomIn()} aria-label="Zoom in"><Plus size={16} /></button>
        </div>
        <button type="button" className="ce-dock__btn ce-dock__mobile" onClick={() => togglePanel(panel && panel !== "mode" ? null : "items")} aria-pressed={panel !== null && panel !== "mode"} aria-label="Tools"><SlidersHorizontal size={18} /></button>
      </div>

      <ViewerPanel open={panel !== null} title="Reality twin"
        tabs={[{ key: "mode", label: "Mode" }, ...(data.plan ? [{ key: "plan", label: "Plan" }] : []), { key: "items", label: "Items", count: openCount }, { key: "more", label: "More" }]}
        activeTab={panel ?? undefined} onTab={(k) => setPanel(k as Panel)} onClose={() => setPanel(null)}>
        {panel === "mode" ? (
          <div className="ce-list" style={{ padding: "0 8px" }}>
            {MODES.map((m) => (
              <button key={m.key} type="button" className="ce-row" aria-pressed={mode === m.key} onClick={() => { applyMode(m.key); setPanel(null); }}>
                <div style={{ display: "grid", gridTemplateColumns: "24px 1fr", gap: 10, alignItems: "center" }}><m.icon size={18} /><div><div className="ce-row__title">{m.label}</div><div className="ce-row__sub">{m.hint}</div></div></div>
                {mode === m.key ? <span className="ce-chip ce-chip--in_progress">Current</span> : null}
              </button>
            ))}
            <button type="button" className="ce-row" onClick={() => { viewer.current?.recenter(); applyMode("orbit"); setPanel(null); }}><div style={{ display: "grid", gridTemplateColumns: "24px 1fr", gap: 10, alignItems: "center" }}><RotateCcw size={18} /><div className="ce-row__title">Reset view</div></div></button>
          </div>
        ) : null}
        {panel === "plan" && data.plan ? (
          <div style={{ height: "100%", minHeight: 360 }}>
            <PlanCanvas sheet={data.plan} stations={data.stations.filter((s) => s.visitId === twin.visitId)} items={planItemMarkers(items)} selectedItemId={itemId}
              waypoints={data.walkthrough?.visitId === twin.visitId ? data.walkthrough.waypoints : []}
              onStation={(s) => router.push(withSuffix(`${data.basePath}/stations?s=${s.id}`, data.linkSuffix))} onWaypoint={(w) => router.push(withSuffix(`${data.basePath}/walk?t=${w.t}`, data.linkSuffix))} onItem={(id) => { setItemId(id); setPanel("items"); }} />
          </div>
        ) : null}
        {panel === "items" ? (item ? (<><button type="button" className="ce-btn ce-btn--quiet ce-btn--sm" style={{ margin: "10px 12px 0" }} onClick={() => setItemId(null)}>← All references</button><ItemPanel item={item} basePath={data.basePath} linkSuffix={data.linkSuffix} currentKind="twin" allowed={{ twin: true }} compact onReply={(b) => reply(item.id, b)} /></>)
          : <ReferencesPanel data={data} items={items} currentKind="twin" onSelectItem={(id) => setItemId(id)} />) : null}
        {panel === "more" ? (
          <div className="ce-item">
            <button type="button" className="ce-btn" onClick={() => { viewer.current?.recenter(); applyMode("orbit"); }}><RotateCcw size={15} /> Reset view</button>
            <div style={{ margin: "0 -18px" }}><SharePanelBody url={typeof window === "undefined" ? "" : window.location.href} poweredBy={data.brand.poweredBySlate360 && data.brand.whiteLabel} /></div>
          </div>
        ) : null}
      </ViewerPanel>
    </div>
  );
}
