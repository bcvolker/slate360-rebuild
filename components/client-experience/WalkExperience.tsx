"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Camera, Map, MessageSquare, Minus, Pause, Play, Plus, SlidersHorizontal, Footprints } from "lucide-react";
import type { ProjectExperience, SpatialRef } from "@/lib/client-experience/types";
import { formatClock, positionAt, spaceAt, withSuffix } from "@/lib/client-experience/utils";
import { clampPathOpacity, pathHudDefault } from "@/lib/client-experience/layout";
import { ProjectShell } from "./ProjectShell";
import { brandStyle } from "@/lib/client-experience/layout";
import { WalkViewer, type WalkMode, type WalkViewerHandle, type WalkView } from "./WalkViewer";
import { ViewerPanel } from "./ViewerPanel";
import { WalkPanelBody, type WalkPanel } from "./WalkPanels";
import { useProjectItems } from "./useProjectItems";

type Props = { data: ProjectExperience; initial: { t: number; yaw: number; pitch: number; item: string | null; panel: WalkPanel; mode: WalkMode; ask?: boolean; path?: boolean | null } };

const PATH_KEY = "sw-path-visible", OPACITY_KEY = "sw-path-opacity";

/** Spatial Walkthrough. Explore (default) moves along the recorded path; Play follows it at 1×–2× with free look. */
export function WalkExperience({ data, initial }: Props) {
  const clip = data.walkthrough!;
  const viewer = useRef<WalkViewerHandle>(null);
  const [mode, setMode] = useState<WalkMode>(initial.mode);
  const [rate, setRate] = useState(1);
  const [t, setT] = useState(initial.t);
  const [view, setView] = useState<WalkView>({ t: initial.t, yaw: initial.yaw, pitch: initial.pitch });
  const [playing, setPlaying] = useState(false);
  const [panel, setPanel] = useState<WalkPanel>(initial.panel ?? (initial.item || initial.ask ? "items" : null));
  const [itemId, setItemId] = useState<string | null>(initial.item);
  const [asking, setAsking] = useState(Boolean(initial.ask));
  const [pathVisible, setPathVisible] = useState(false);
  const [pathOpacity, setPathOpacity] = useState(0.28);
  const [hint, setHint] = useState(true);
  const { items, ask, reply } = useProjectItems(data.items);

  // Path HUD: desktop/tablet on, phones off; the client's own choice persists.
  useEffect(() => {
    const wide = window.matchMedia("(min-width: 768px)").matches;
    const d = pathHudDefault(wide ? Math.max(window.innerWidth, 768) : Math.min(window.innerWidth || 375, 767));
    const saved = window.localStorage.getItem(PATH_KEY);
    setPathVisible(initial.path ?? (saved === "1" ? true : saved === "0" ? false : d.visible));
    const o = Number(window.localStorage.getItem(OPACITY_KEY));
    setPathOpacity(o > 0 ? clampPathOpacity(o) : d.opacity);
    const id = window.setTimeout(() => setHint(false), 7000);
    return () => window.clearTimeout(id);
  }, [initial.path]);
  const onPath = (v: boolean) => { setPathVisible(v); window.localStorage.setItem(PATH_KEY, v ? "1" : "0"); };
  const onPathOpacity = (v: number) => { const c = clampPathOpacity(v); setPathOpacity(c); window.localStorage.setItem(OPACITY_KEY, String(c)); };

  const switchMode = useCallback((m: WalkMode) => { setMode(m); viewer.current?.setMode(m); setHint(false); }, []);
  useEffect(() => { if (initial.mode === "play") viewer.current?.setMode("play"); }, [initial.mode]);
  const onRate = (r: number) => { setRate(r); viewer.current?.setRate(r); };
  const go = (time: number, play = false) => { viewer.current?.moveTo(time); if (play) switchMode("play"); };
  const openRef = (ref: SpatialRef) => { if (ref.kind === "walkthrough") { switchMode("explore"); viewer.current?.seek(ref.t, ref.yaw, ref.pitch); } };
  const togglePanel = (p: WalkPanel) => setPanel((cur) => (cur === p ? null : p));

  const space = spaceAt(clip.waypoints, t);
  const position = useMemo(() => positionAt(clip.waypoints, t), [clip.waypoints, t]);
  const nearStation = useMemo(() => {
    const hit = data.stations.filter((s) => s.t != null && Math.abs((s.t ?? 0) - t) <= 4).sort((a, b) => Math.abs((a.t ?? 0) - t) - Math.abs((b.t ?? 0) - t))[0];
    return hit && data.capabilities.stations ? hit : null;
  }, [data.stations, data.capabilities.stations, t]);
  const stationHref = nearStation ? withSuffix(`${data.basePath}/stations?s=${nearStation.id}&from=walk&t=${view.t.toFixed(1)}&yaw=${view.yaw.toFixed(0)}&pitch=${view.pitch.toFixed(0)}`, data.linkSuffix) : null;
  const shareUrl = typeof window === "undefined" ? "" : `${window.location.origin}${withSuffix(`${data.basePath}/walk?t=${view.t.toFixed(1)}&yaw=${view.yaw.toFixed(0)}&pitch=${view.pitch.toFixed(0)}`, data.linkSuffix)}`;
  const openCount = items.filter((i) => i.status !== "resolved").length;

  return (
    <div className="ce ce-viewer" data-testid="ce-walk" data-mode={mode} data-path={pathVisible ? "on" : "off"} style={brandStyle(data)}>
      <WalkViewer ref={viewer} videoUrl={clip.videoUrl} posterUrl={clip.posterUrl} waypoints={clip.waypoints} items={items} selectedItemId={itemId}
        pathVisible={pathVisible} pathOpacity={pathOpacity} initial={initial}
        onTime={setT} onView={setView} onPlayState={setPlaying} onItemSelect={(id) => { setItemId(id); setAsking(false); setPanel("items"); }} />
      <ProjectShell data={data} section="reality" immersive visitId={clip.visitId} backHref={data.basePath} viewLabel="Walkthrough" more={[{ label: "Tools", icon: <SlidersHorizontal size={15} />, onSelect: () => setPanel("more") }]} onShare={() => setPanel("more")} />

      <div className={`ce-viewer__hint${hint ? "" : " is-hidden"}`}>{mode === "explore" ? "Drag to look around · tap the floor ahead to move" : "Following the recorded route · drag to look around"}</div>
      {stationHref && nearStation ? (
        <Link href={stationHref} className="ce-station-chip" data-testid="ce-station-near" style={{ bottom: panel ? 84 : undefined }}>
          <Camera size={15} /> High-res 360 <span className="ce-eyebrow" style={{ fontSize: 12 }}>· {nearStation.label}</span>
        </Link>
      ) : null}

      <div className={`ce-dock ce-dock--${mode}`} data-testid="ce-dock">
        <div className="ce-dock__group">
          <button type="button" className="ce-dock__btn ce-dock__btn--primary" onClick={() => switchMode(mode === "play" ? "explore" : "play")} aria-label={mode === "play" ? "Pause and explore" : "Play the walk"} aria-pressed={mode === "play"} data-testid="ce-mode-toggle">
            {mode === "play" ? <Pause size={18} /> : <Play size={18} />}
          </button>
          <span className="ce-dock__desktop ce-eyebrow" style={{ padding: "0 6px 0 2px", display: "inline-flex", alignItems: "center", gap: 6 }}>
            {mode === "play" ? <>Playing <button type="button" className="ce-btn ce-btn--sm" style={{ minHeight: 26, padding: "0 8px" }} onClick={() => onRate(rate >= 2 ? 1 : rate >= 1.5 ? 2 : 1.5)} aria-label="Play speed">{rate}×</button></> : <><Footprints size={14} /> Explore</>}
          </span>
        </div>
        <div className="ce-dock__transport">
          <input type="range" className="ce-scrub" min={0} max={clip.durationS} step={0.1} value={t} aria-label="Position along the walk" onChange={(e) => { const v = Number(e.target.value); setT(v); viewer.current?.seek(v); }} />
          <span className="ce-dock__time">{formatClock(t)} / {formatClock(clip.durationS)}</span>
        </div>
        <span className="ce-dock__sep ce-dock__desktop" />
        <button type="button" className="ce-dock__btn ce-dock__space ce-dock__desktop" onClick={() => togglePanel("spaces")} aria-pressed={panel === "spaces"} title="Spaces"><span>{space || "Walkthrough"}</span></button>
        <span className="ce-dock__sep ce-dock__desktop" />
        <div className="ce-dock__group ce-dock__desktop">
          {data.plan ? <button type="button" className="ce-dock__btn" onClick={() => togglePanel("plan")} aria-pressed={panel === "plan"}><Map size={16} /> Plan</button> : null}
          <button type="button" className="ce-dock__btn" onClick={() => { setItemId(null); setAsking(false); togglePanel("items"); }} aria-pressed={panel === "items"}><MessageSquare size={16} /> Items{openCount ? <span className="ce-badge">{openCount}</span> : null}</button>
          <span className="ce-dock__sep" />
          <button type="button" className="ce-dock__btn" onClick={() => viewer.current?.zoom(-10)} aria-label="Zoom out"><Minus size={16} /></button>
          <button type="button" className="ce-dock__btn" onClick={() => viewer.current?.zoom(10)} aria-label="Zoom in"><Plus size={16} /></button>
        </div>
        <button type="button" className="ce-dock__btn ce-dock__mobile" onClick={() => togglePanel(panel ? null : data.plan ? "plan" : "items")} aria-pressed={panel !== null} aria-label="Tools"><SlidersHorizontal size={18} /></button>
      </div>

      <ViewerPanel open={panel !== null} title="Walkthrough"
        tabs={[...(data.plan ? [{ key: "plan", label: "Plan" }] : []), { key: "spaces", label: "Spaces" }, { key: "items", label: "Items", count: openCount }, { key: "more", label: "More" }]}
        activeTab={panel ?? undefined} onTab={(k) => { setPanel(k as WalkPanel); if (k !== "items") setAsking(false); }} onClose={() => setPanel(null)}>
        <WalkPanelBody data={data} panel={panel} items={items} itemId={itemId} asking={asking} t={t} view={view} space={space} position={position} waypoints={clip.waypoints}
          pathVisible={pathVisible} pathOpacity={pathOpacity} playbackRate={rate} shareUrl={shareUrl}
          onSelectItem={(id) => { setItemId(id); setAsking(false); }} onAsk={(open) => { setAsking(open); if (open) { setItemId(null); switchMode("explore"); } }}
          onSubmitQuestion={(text, loc) => { const q = ask(text, loc); setAsking(false); setItemId(q.id); }} onReply={reply} onOpenRef={openRef} onGo={go}
          onPath={onPath} onPathOpacity={onPathOpacity} onPlaybackRate={onRate} />
      </ViewerPanel>
    </div>
  );
}
