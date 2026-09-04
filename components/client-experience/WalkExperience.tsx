"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Map, MessageSquare, Minus, Pause, Play, Plus, Share2, SlidersHorizontal, SkipBack, SkipForward } from "lucide-react";
import type { ProjectExperience, SpatialRef } from "@/lib/client-experience/types";
import { formatClock, positionAt, spaceAt, waypointAt } from "@/lib/client-experience/utils";
import { ProjectShell } from "./ProjectShell";
import { WalkViewer, type WalkViewerHandle, type WalkView } from "./WalkViewer";
import { PlanCanvas } from "./PlanCanvas";
import { ItemPanel } from "./ItemPanel";
import { ViewerPanel, SharePanelBody } from "./ViewerPanel";

type Panel = "plan" | "items" | "spaces" | "share" | null;

type Props = { data: ProjectExperience; initial: { t: number; yaw: number; pitch: number; item: string | null; panel: Panel } };

export function WalkExperience({ data, initial }: Props) {
  const router = useRouter();
  const clip = data.walkthrough!;
  const viewer = useRef<WalkViewerHandle>(null);
  const [t, setT] = useState(initial.t);
  const [view, setView] = useState<WalkView>({ t: initial.t, yaw: initial.yaw, pitch: initial.pitch });
  const [playing, setPlaying] = useState(false);
  const [panel, setPanel] = useState<Panel>(initial.panel ?? (initial.item ? "items" : null));
  const [itemId, setItemId] = useState<string | null>(initial.item);
  const [hint, setHint] = useState(true);
  const [ready, setReady] = useState(false);

  const space = spaceAt(clip.waypoints, t);
  const position = useMemo(() => positionAt(clip.waypoints, t), [clip.waypoints, t]);
  const item = data.items.find((i) => i.id === itemId) ?? null;
  const planItems = data.items.flatMap((i) => i.refs.filter((r) => r.kind === "plan").map((r) => (r.kind === "plan" ? { id: i.id, label: i.title, status: i.status, u: r.u, v: r.v } : null))).filter((x): x is NonNullable<typeof x> => Boolean(x));

  useEffect(() => { const id = setTimeout(() => setHint(false), 6000); return () => clearTimeout(id); }, []);
  const toggle = useCallback(() => { if (playing) viewer.current?.pause(); else viewer.current?.play(); setHint(false); }, [playing]);
  const step = (dir: 1 | -1) => {
    const cur = waypointAt(clip.waypoints, t);
    const idx = cur ? clip.waypoints.indexOf(cur) : -1;
    const next = clip.waypoints[Math.max(0, Math.min(clip.waypoints.length - 1, idx + dir))];
    if (next) viewer.current?.seek(next.t);
  };
  const openRef = (ref: SpatialRef) => { if (ref.kind === "walkthrough") { viewer.current?.seek(ref.t, ref.yaw, ref.pitch); viewer.current?.pause(); } };
  const shareUrl = typeof window === "undefined" ? "" : `${window.location.origin}${data.basePath}/walk?t=${view.t.toFixed(1)}&yaw=${view.yaw.toFixed(0)}&pitch=${view.pitch.toFixed(0)}`;
  const togglePanel = (p: Panel) => setPanel((cur) => (cur === p ? null : p));

  return (
    <div className="ce ce-viewer" data-testid="ce-walk">
      <div className="ce-viewer__stage">
        <WalkViewer
          ref={viewer}
          videoUrl={clip.videoUrl}
          posterUrl={clip.posterUrl}
          waypoints={clip.waypoints}
          items={data.items}
          selectedItemId={itemId}
          showNavMarkers
          showItemMarkers
          initial={initial}
          onTime={setT}
          onView={setView}
          onPlayState={setPlaying}
          onReady={() => setReady(true)}
          onItemSelect={(id) => { setItemId(id); setPanel("items"); viewer.current?.pause(); }}
        />
      </div>
      <ProjectShell data={data} section="reality" immersive visitId={clip.visitId} backHref={data.basePath} viewLabel="Walkthrough" />

      {!playing && ready && t < 0.5 ? (
        <button type="button" onClick={toggle} aria-label="Play walkthrough" style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "transparent" }}>
          <span className="ce-nav-marker" style={{ width: 84, height: 84 }}><Play size={30} style={{ marginLeft: 4 }} /></span>
        </button>
      ) : null}
      <div className={`ce-viewer__hint${hint ? "" : " is-hidden"}`}>Drag to look · Follow the marker to move</div>

      <div className="ce-dock" data-testid="ce-dock">
        <div className="ce-dock__group">
          <button type="button" className="ce-dock__btn ce-dock__btn--primary" onClick={toggle} aria-label={playing ? "Pause" : "Play"}>{playing ? <Pause size={18} /> : <Play size={18} />}</button>
          <button type="button" className="ce-dock__btn ce-dock__desktop" onClick={() => step(-1)} aria-label="Previous space"><SkipBack size={16} /></button>
          <button type="button" className="ce-dock__btn ce-dock__desktop" onClick={() => step(1)} aria-label="Next space"><SkipForward size={16} /></button>
        </div>
        <input type="range" className="ce-scrub" min={0} max={clip.durationS} step={0.1} value={t} aria-label="Timeline" onChange={(e) => { const v = Number(e.target.value); setT(v); viewer.current?.seek(v); }} />
        <span className="ce-dock__time ce-num">{formatClock(t)} / {formatClock(clip.durationS)}</span>
        <span className="ce-dock__sep ce-dock__desktop" />
        <button type="button" className="ce-dock__btn ce-dock__space ce-dock__desktop" onClick={() => togglePanel("spaces")} aria-pressed={panel === "spaces"} title="Spaces"><span>{space || "Walkthrough"}</span></button>
        <span className="ce-dock__sep ce-dock__desktop" />
        <div className="ce-dock__group ce-dock__desktop">
          <button type="button" className="ce-dock__btn" onClick={() => togglePanel("plan")} aria-pressed={panel === "plan"}><Map size={16} /> Plan</button>
          <button type="button" className="ce-dock__btn" onClick={() => togglePanel("items")} aria-pressed={panel === "items"}><MessageSquare size={16} /> Items</button>
          <button type="button" className="ce-dock__btn" onClick={() => togglePanel("share")} aria-pressed={panel === "share"}><Share2 size={16} /></button>
          <span className="ce-dock__sep" />
          <button type="button" className="ce-dock__btn" onClick={() => viewer.current?.zoom(-10)} aria-label="Zoom out"><Minus size={16} /></button>
          <button type="button" className="ce-dock__btn" onClick={() => viewer.current?.zoom(10)} aria-label="Zoom in"><Plus size={16} /></button>
        </div>
        <button type="button" className="ce-dock__btn ce-dock__mobile" onClick={() => togglePanel(panel ? null : "plan")} aria-pressed={panel !== null} aria-label="Tools"><SlidersHorizontal size={18} /></button>
      </div>

      <ViewerPanel
        open={panel !== null}
        title="Walkthrough"
        tabs={[{ key: "plan", label: "Plan" }, { key: "spaces", label: "Spaces", count: clip.spaces.length }, { key: "items", label: "Items", count: data.items.length }, { key: "share", label: "Share" }]}
        activeTab={panel ?? undefined}
        onTab={(k) => setPanel(k as Panel)}
        onClose={() => setPanel(null)}
      >
        {panel === "plan" && data.plan ? (
          <div style={{ height: "100%", minHeight: 360 }}>
            <PlanCanvas sheet={data.plan} waypoints={clip.waypoints} stations={data.stations.filter((s) => s.visitId === clip.visitId)} items={planItems} position={position} selectedItemId={itemId}
              onWaypoint={(w) => { viewer.current?.seek(w.t); viewer.current?.play(); }}
              onStation={(s) => router.push(`${data.basePath}/stations?s=${s.id}`)}
              onItem={(id) => { setItemId(id); setPanel("items"); }} />
          </div>
        ) : null}
        {panel === "spaces" ? (
          <div className="ce-list" style={{ padding: "0 8px" }}>
            {clip.waypoints.map((w) => (
              <button key={w.id} type="button" className="ce-row" style={{ textAlign: "left" }} onClick={() => { viewer.current?.seek(w.t); viewer.current?.play(); }}>
                <div><div className="ce-row__title">{w.label}</div><div className="ce-row__sub">{w.space}</div></div>
                <span className="ce-dock__time ce-num">{formatClock(w.t)}</span>
              </button>
            ))}
          </div>
        ) : null}
        {panel === "items" ? (
          item ? (
            <>
              <button type="button" className="ce-btn ce-btn--sm" style={{ margin: "12px 18px 0" }} onClick={() => setItemId(null)}>All items</button>
              <ItemPanel item={item} basePath={data.basePath} currentKind="walkthrough" onOpenHere={openRef} compact />
            </>
          ) : (
            <div className="ce-list" style={{ padding: "0 8px" }}>
              {data.items.map((i) => (
                <button key={i.id} type="button" className="ce-row" style={{ textAlign: "left" }} onClick={() => setItemId(i.id)}>
                  <div><div className="ce-row__title">{i.title}</div><div className="ce-row__sub">{i.refs.map((r) => r.kind).includes("walkthrough") ? "In this walkthrough" : "Other views"}</div></div>
                  <span className={`ce-chip ce-chip--${i.status}`} />
                </button>
              ))}
            </div>
          )
        ) : null}
        {panel === "share" ? <SharePanelBody url={shareUrl} /> : null}
      </ViewerPanel>
    </div>
  );
}
