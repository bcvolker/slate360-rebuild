"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Footprints, Map, MessageSquare, Minus, Plus, SlidersHorizontal } from "lucide-react";
import type { ProjectExperience, SpatialRef } from "@/lib/client-experience/types";
import { formatDate, formatTime, stationById, visitById, withSuffix } from "@/lib/client-experience/utils";
import { ProjectShell } from "./ProjectShell";
import { brandStyle } from "@/lib/client-experience/layout";
import { StationViewer, type StationViewerHandle } from "./StationViewer";
import { PlanCanvas } from "./PlanCanvas";
import { ItemPanel } from "./ItemPanel";
import { ReferencesPanel } from "./ReferencesPanel";
import { AskQuestion } from "./AskQuestion";
import { ViewerPanel, SharePanelBody } from "./ViewerPanel";
import { StationStrip } from "./StationStrip";
import { planItemMarkers } from "./WalkPanels";
import { useProjectItems } from "./useProjectItems";

type Panel = "plan" | "stations" | "items" | "more" | null;
type Props = { data: ProjectExperience; initial: { stationId: string; yaw: number; pitch: number; item: string | null; panel: Panel; ask?: boolean; from: { t: number; yaw: number; pitch: number } | null } };

/** 360 Documentation: the same project at a sharp station. Never Tour Builder chrome. */
export function StationExperience({ data, initial }: Props) {
  const router = useRouter();
  const viewer = useRef<StationViewerHandle>(null);
  const [stationId, setStationId] = useState(initial.stationId);
  const [look, setLook] = useState<{ yaw?: number; pitch?: number }>({ yaw: initial.yaw, pitch: initial.pitch });
  const [panel, setPanel] = useState<Panel>(initial.panel ?? (initial.item || initial.ask ? "items" : null));
  const [itemId, setItemId] = useState<string | null>(initial.item);
  const [asking, setAsking] = useState(Boolean(initial.ask));
  const [view, setView] = useState({ yaw: initial.yaw, pitch: initial.pitch });
  const { items, ask, reply } = useProjectItems(data.items);

  const station = stationById(data, stationId) ?? data.stations[0];
  const visit = visitById(data, station.visitId);
  const siblings = useMemo(() => data.stations.filter((s) => s.visitId === station.visitId), [data.stations, station.visitId]);
  const idx = siblings.findIndex((s) => s.id === station.id);
  const item = items.find((i) => i.id === itemId) ?? null;
  const go = (id: string) => { setStationId(id); setLook({}); };
  const openRef = (ref: SpatialRef) => { if (ref.kind === "station") { setStationId(ref.stationId); setLook({ yaw: ref.yaw, pitch: ref.pitch }); } };
  const togglePanel = (p: Panel) => setPanel((cur) => (cur === p ? null : p));
  const shareUrl = typeof window === "undefined" ? "" : `${window.location.origin}${withSuffix(`${data.basePath}/stations?s=${station.id}&yaw=${view.yaw.toFixed(0)}&pitch=${view.pitch.toFixed(0)}`, data.linkSuffix)}`;
  const returnHref = initial.from && data.walkthrough ? withSuffix(`${data.basePath}/walk?t=${initial.from.t}&yaw=${initial.from.yaw}&pitch=${initial.from.pitch}`, data.linkSuffix) : null;
  const locator: SpatialRef = { kind: "station", label: `${station.label} · ${formatTime(station.capturedAt)}`, stationId: station.id, yaw: Math.round(view.yaw), pitch: Math.round(view.pitch) };
  const openCount = items.filter((i) => i.status !== "resolved").length;

  return (
    <div className="ce ce-viewer" data-panel={panel ? "open" : "closed"} data-testid="ce-stations" style={brandStyle(data)}>
      <div className="ce-viewer__stage">
        <StationViewer ref={viewer} station={station} stations={data.stations} items={items} selectedItemId={itemId} initial={look} onNavigate={go} onItemSelect={(id) => { setItemId(id); setAsking(false); setPanel("items"); }} onView={setView} />
      </div>
      <ProjectShell data={data} section="reality" immersive visitId={station.visitId} backHref={returnHref ? undefined : data.basePath} viewLabel="360 documentation" onShare={() => setPanel("more")}
        actions={returnHref ? <Link href={returnHref} className="ce-btn ce-btn--sm" data-testid="ce-back-to-walk"><Footprints size={14} /> <span className="ce-dock__desktop">Back to walkthrough</span></Link> : null} />

      <div className="ce-dock" data-testid="ce-dock">
        <button type="button" className="ce-dock__btn" onClick={() => idx > 0 && go(siblings[idx - 1].id)} disabled={idx <= 0} aria-label="Previous station"><ChevronLeft size={18} /></button>
        <div className="ce-dock__label">
          <div style={{ fontSize: 13.5, fontWeight: 500 }}>{station.label}</div>
          <div style={{ fontSize: 12, color: "var(--ce-ink-3)" }}>{station.space} · <span className="ce-code">{formatDate(station.capturedAt)} {formatTime(station.capturedAt)}</span> · <span className="ce-code">{idx + 1}/{siblings.length}</span></div>
        </div>
        <button type="button" className="ce-dock__btn" onClick={() => idx < siblings.length - 1 && go(siblings[idx + 1].id)} disabled={idx >= siblings.length - 1} aria-label="Next station"><ChevronRight size={18} /></button>
        <span className="ce-dock__sep ce-dock__desktop" />
        <div className="ce-dock__group ce-dock__desktop">
          {data.plan ? <button type="button" className="ce-dock__btn" onClick={() => togglePanel("plan")} aria-pressed={panel === "plan"}><Map size={16} /> Plan</button> : null}
          <button type="button" className="ce-dock__btn" onClick={() => togglePanel("stations")} aria-pressed={panel === "stations"}>Stations<span className="ce-badge">{siblings.length}</span></button>
          <button type="button" className="ce-dock__btn" onClick={() => { setItemId(null); setAsking(false); togglePanel("items"); }} aria-pressed={panel === "items"}><MessageSquare size={16} /> Items{openCount ? <span className="ce-badge">{openCount}</span> : null}</button>
          <span className="ce-dock__sep" />
          <button type="button" className="ce-dock__btn" onClick={() => viewer.current?.zoom(-10)} aria-label="Zoom out"><Minus size={16} /></button>
          <button type="button" className="ce-dock__btn" onClick={() => viewer.current?.zoom(10)} aria-label="Zoom in"><Plus size={16} /></button>
        </div>
        <button type="button" className="ce-dock__btn ce-dock__mobile" onClick={() => togglePanel(panel ? null : "stations")} aria-pressed={panel !== null} aria-label="Tools"><SlidersHorizontal size={18} /></button>
      </div>

      <ViewerPanel open={panel !== null} title="360 documentation"
        tabs={[...(data.plan ? [{ key: "plan", label: "Plan" }] : []), { key: "stations", label: "Stations", count: siblings.length }, { key: "items", label: "Items", count: openCount }, { key: "more", label: "More" }]}
        activeTab={panel ?? undefined} onTab={(k) => { setPanel(k as Panel); if (k !== "items") setAsking(false); }} onClose={() => setPanel(null)}>
        {panel === "plan" && data.plan ? (
          <div style={{ height: "100%", minHeight: 360 }}>
            <PlanCanvas sheet={data.plan} stations={siblings} items={planItemMarkers(items)} selectedStationId={station.id} selectedItemId={itemId}
              waypoints={data.walkthrough && data.walkthrough.visitId === station.visitId ? data.walkthrough.waypoints : []}
              onStation={(s) => go(s.id)} onWaypoint={(w) => router.push(withSuffix(`${data.basePath}/walk?t=${w.t}`, data.linkSuffix))} onItem={(id) => { setItemId(id); setPanel("items"); }} />
          </div>
        ) : null}
        {panel === "stations" ? <StationStrip data={data} siblings={siblings} currentId={station.id} visitLabel={visit ? `${visit.label} · ${formatDate(visit.capturedAt)}` : null} onSelect={go} /> : null}
        {panel === "items" ? (asking ? <AskQuestion locator={locator} thumbUrl={station.thumbUrl} onSubmit={(text) => { const q = ask(text, locator); setAsking(false); setItemId(q.id); }} onCancel={() => setAsking(false)} />
          : item ? (<><button type="button" className="ce-btn ce-btn--quiet ce-btn--sm" style={{ margin: "10px 12px 0" }} onClick={() => setItemId(null)}>← All references</button><ItemPanel item={item} basePath={data.basePath} linkSuffix={data.linkSuffix} currentKind="station" onOpenHere={openRef} allowed={{ twin: data.capabilities.twin }} compact onReply={(b) => reply(item.id, b)} /></>)
          : <ReferencesPanel data={data} items={items} currentKind="station" isNearby={(i) => i.refs.some((r) => r.kind === "station" && r.stationId === station.id)} onSelectItem={(id) => setItemId(id)} onAsk={() => { setItemId(null); setAsking(true); }} />) : null}
        {panel === "more" ? <SharePanelBody url={shareUrl} poweredBy={data.brand.poweredBySlate360 && data.brand.whiteLabel} /> : null}
      </ViewerPanel>
    </div>
  );
}
