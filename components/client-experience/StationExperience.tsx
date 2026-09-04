"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Map, MessageSquare, Minus, Plus, Share2, SlidersHorizontal } from "lucide-react";
import type { ProjectExperience, SpatialRef } from "@/lib/client-experience/types";
import { formatDate, formatTime, stationById, visitById } from "@/lib/client-experience/utils";
import { ProjectShell } from "./ProjectShell";
import { StationViewer, type StationViewerHandle } from "./StationViewer";
import { PlanCanvas } from "./PlanCanvas";
import { ItemPanel } from "./ItemPanel";
import { ViewerPanel, SharePanelBody } from "./ViewerPanel";

type Panel = "plan" | "stations" | "items" | "share" | null;
type Props = { data: ProjectExperience; initial: { stationId: string; yaw: number; pitch: number; item: string | null; panel: Panel } };

export function StationExperience({ data, initial }: Props) {
  const router = useRouter();
  const viewer = useRef<StationViewerHandle>(null);
  const [stationId, setStationId] = useState(initial.stationId);
  const [look, setLook] = useState<{ yaw?: number; pitch?: number }>({ yaw: initial.yaw, pitch: initial.pitch });
  const [panel, setPanel] = useState<Panel>(initial.panel ?? (initial.item ? "items" : "plan"));
  const [itemId, setItemId] = useState<string | null>(initial.item);
  const [view, setView] = useState({ yaw: initial.yaw, pitch: initial.pitch });

  const station = stationById(data, stationId) ?? data.stations[0];
  const visit = visitById(data, station.visitId);
  const siblings = useMemo(() => data.stations.filter((s) => s.visitId === station.visitId), [data.stations, station.visitId]);
  const idx = siblings.findIndex((s) => s.id === station.id);
  const item = data.items.find((i) => i.id === itemId) ?? null;
  const planItems = data.items.flatMap((i) => i.refs.filter((r) => r.kind === "plan").map((r) => (r.kind === "plan" ? { id: i.id, label: i.title, status: i.status, u: r.u, v: r.v } : null))).filter((x): x is NonNullable<typeof x> => Boolean(x));
  const otherVisits = data.visits.filter((v) => v.id !== station.visitId && data.stations.some((s) => s.visitId === v.id));

  const go = (id: string) => { setStationId(id); setLook({}); };
  const openRef = (ref: SpatialRef) => { if (ref.kind === "station") { setStationId(ref.stationId); setLook({ yaw: ref.yaw, pitch: ref.pitch }); } };
  const togglePanel = (p: Panel) => setPanel((cur) => (cur === p ? null : p));
  const shareUrl = typeof window === "undefined" ? "" : `${window.location.origin}${data.basePath}/stations?s=${station.id}&yaw=${view.yaw.toFixed(0)}&pitch=${view.pitch.toFixed(0)}`;

  return (
    <div className="ce ce-viewer" data-testid="ce-stations">
      <div className="ce-viewer__stage">
        <StationViewer ref={viewer} station={station} stations={data.stations} items={data.items} selectedItemId={itemId} initial={look} onNavigate={go} onItemSelect={(id) => { setItemId(id); setPanel("items"); }} onView={setView} />
      </div>
      <ProjectShell data={data} section="reality" immersive visitId={station.visitId} backHref={data.basePath} viewLabel="360 documentation" />

      <div className="ce-dock" data-testid="ce-dock">
        <button type="button" className="ce-dock__btn" onClick={() => idx > 0 && go(siblings[idx - 1].id)} disabled={idx <= 0} aria-label="Previous station"><ChevronLeft size={18} /></button>
        <div className="ce-dock__label">
          <div style={{ fontSize: 13.5, fontWeight: 500 }}>{station.label}</div>
          <div className="ce-eyebrow" style={{ fontSize: 10 }}>{station.space} · {formatDate(station.capturedAt)} {formatTime(station.capturedAt)} · {idx + 1}/{siblings.length}</div>
        </div>
        <button type="button" className="ce-dock__btn" onClick={() => idx < siblings.length - 1 && go(siblings[idx + 1].id)} disabled={idx >= siblings.length - 1} aria-label="Next station"><ChevronRight size={18} /></button>
        <span className="ce-dock__sep ce-dock__desktop" />
        <div className="ce-dock__group ce-dock__desktop">
          <button type="button" className="ce-dock__btn" onClick={() => togglePanel("plan")} aria-pressed={panel === "plan"}><Map size={16} /> Plan</button>
          <button type="button" className="ce-dock__btn" onClick={() => togglePanel("stations")} aria-pressed={panel === "stations"}>Stations</button>
          <button type="button" className="ce-dock__btn" onClick={() => togglePanel("items")} aria-pressed={panel === "items"}><MessageSquare size={16} /> Items</button>
          <button type="button" className="ce-dock__btn" onClick={() => togglePanel("share")} aria-pressed={panel === "share"}><Share2 size={16} /></button>
          <span className="ce-dock__sep" />
          <button type="button" className="ce-dock__btn" onClick={() => viewer.current?.zoom(-10)} aria-label="Zoom out"><Minus size={16} /></button>
          <button type="button" className="ce-dock__btn" onClick={() => viewer.current?.zoom(10)} aria-label="Zoom in"><Plus size={16} /></button>
        </div>
        <button type="button" className="ce-dock__btn ce-dock__mobile" onClick={() => togglePanel(panel ? null : "plan")} aria-pressed={panel !== null} aria-label="Tools"><SlidersHorizontal size={18} /></button>
      </div>

      <ViewerPanel open={panel !== null} title="360 documentation"
        tabs={[{ key: "plan", label: "Plan" }, { key: "stations", label: "Stations", count: siblings.length }, { key: "items", label: "Items", count: data.items.length }, { key: "share", label: "Share" }]}
        activeTab={panel ?? undefined} onTab={(k) => setPanel(k as Panel)} onClose={() => setPanel(null)}>
        {panel === "plan" && data.plan ? (
          <div style={{ height: "100%", minHeight: 360 }}>
            <PlanCanvas sheet={data.plan} stations={siblings} items={planItems} selectedStationId={station.id} selectedItemId={itemId}
              waypoints={data.walkthrough && data.walkthrough.visitId === station.visitId ? data.walkthrough.waypoints : []}
              onStation={(s) => go(s.id)} onWaypoint={(w) => router.push(`${data.basePath}/walk?t=${w.t}`)} onItem={(id) => { setItemId(id); setPanel("items"); }} />
          </div>
        ) : null}
        {panel === "stations" ? (
          <div style={{ padding: 12 }}>
            {visit ? <p className="ce-eyebrow" style={{ margin: "4px 6px 10px" }}>{visit.label} · {formatDate(visit.capturedAt)}</p> : null}
            <div className="ce-grid ce-grid--2" style={{ gap: 8 }}>
              {siblings.map((s) => (
                <button key={s.id} type="button" className={`ce-tile${s.id === station.id ? " ce-tile--selected" : ""}`} onClick={() => go(s.id)} style={{ textAlign: "left" }}>
                  <img src={s.thumbUrl} alt="" className="ce-tile__img ce-tile__img--wide" />
                  <div className="ce-tile__body" style={{ padding: "8px 10px 10px" }}><div className="ce-tile__title" style={{ fontSize: 13 }}>{s.label}</div><div className="ce-tile__meta">{formatTime(s.capturedAt)}</div></div>
                </button>
              ))}
            </div>
            {otherVisits.length ? (
              <div style={{ marginTop: 18 }}>
                <p className="ce-eyebrow" style={{ margin: "0 6px 8px" }}>Other visits</p>
                {otherVisits.map((v) => { const first = data.stations.find((s) => s.visitId === v.id)!; return (
                  <button key={v.id} type="button" className="ce-row" style={{ width: "100%", textAlign: "left" }} onClick={() => go(first.id)}>
                    <div><div className="ce-row__title">{formatDate(v.capturedAt)}</div><div className="ce-row__sub">{v.label}</div></div>
                    <span className="ce-btn ce-btn--sm">Open</span>
                  </button>
                ); })}
              </div>
            ) : null}
          </div>
        ) : null}
        {panel === "items" ? (item ? (<><button type="button" className="ce-btn ce-btn--sm" style={{ margin: "12px 18px 0" }} onClick={() => setItemId(null)}>All items</button><ItemPanel item={item} basePath={data.basePath} currentKind="station" onOpenHere={openRef} compact /></>) : (
          <div className="ce-list" style={{ padding: "0 8px" }}>
            {data.items.map((i) => (
              <button key={i.id} type="button" className="ce-row" style={{ textAlign: "left" }} onClick={() => setItemId(i.id)}>
                <div><div className="ce-row__title">{i.title}</div><div className="ce-row__sub">{i.refs.some((r) => r.kind === "station" && r.stationId === station.id) ? "In this station" : "Other views"}</div></div>
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
