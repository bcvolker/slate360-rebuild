"use client";

import { useRouter } from "next/navigation";
import type { ProjectExperience, ProjectItem, SpatialRef, Waypoint } from "@/lib/client-experience/types";
import { formatClock, withSuffix } from "@/lib/client-experience/utils";
import { PlanCanvas } from "./PlanCanvas";
import { ItemPanel } from "./ItemPanel";
import { ReferencesPanel } from "./ReferencesPanel";
import { AskQuestion } from "./AskQuestion";
import { ToolsPanel } from "./ToolsPanel";
import { SharePanelBody } from "./ViewerPanel";

export type WalkPanel = "plan" | "spaces" | "items" | "more" | null;

type Props = {
  data: ProjectExperience;
  panel: WalkPanel;
  items: ProjectItem[];
  itemId: string | null;
  asking: boolean;
  t: number;
  view: { t: number; yaw: number; pitch: number };
  space: string;
  position: { u: number; v: number; heading: number } | null;
  waypoints: Waypoint[];
  pathVisible: boolean;
  pathOpacity: number;
  playbackRate: number;
  shareUrl: string;
  onSelectItem: (id: string | null) => void;
  onAsk: (open: boolean) => void;
  onSubmitQuestion: (text: string, locator: SpatialRef) => void;
  onReply: (itemId: string, body: string) => void;
  onOpenRef: (ref: SpatialRef) => void;
  onGo: (t: number, play?: boolean) => void;
  onPath: (visible: boolean) => void;
  onPathOpacity: (v: number) => void;
  onPlaybackRate: (r: number) => void;
};

export function planItemMarkers(items: ProjectItem[]) {
  return items.flatMap((i) => i.refs.filter((r) => r.kind === "plan").map((r) => (r.kind === "plan" ? { id: i.id, label: i.title, status: i.status, u: r.u, v: r.v, kind: i.type === "question" ? ("question" as const) : ("item" as const) } : null))).filter((x): x is NonNullable<typeof x> => Boolean(x));
}

/** Panel contents for the walkthrough: Plan · Spaces · Items (references, item, ask) · More (tools, share). */
export function WalkPanelBody(p: Props) {
  const router = useRouter();
  const { data } = p;
  const item = p.items.find((i) => i.id === p.itemId) ?? null;
  const twinOk = data.capabilities.twin;
  const locator: SpatialRef = { kind: "walkthrough", label: `${p.space || "Walkthrough"} · ${formatClock(p.view.t)}`, t: Math.round(p.view.t * 10) / 10, yaw: Math.round(p.view.yaw), pitch: Math.round(p.view.pitch) };

  if (p.panel === "plan" && data.plan) {
    return (
      <div style={{ height: "100%", minHeight: 360 }}>
        <PlanCanvas sheet={data.plan} waypoints={p.waypoints} stations={data.stations.filter((s) => s.visitId === data.walkthrough?.visitId)} items={planItemMarkers(p.items)} position={p.position} selectedItemId={p.itemId}
          onWaypoint={(w) => p.onGo(w.t)} onStation={(s) => router.push(withSuffix(`${data.basePath}/stations?s=${s.id}&from=walk&t=${p.view.t.toFixed(1)}&yaw=${p.view.yaw.toFixed(0)}&pitch=${p.view.pitch.toFixed(0)}`, data.linkSuffix))} onItem={(id) => p.onSelectItem(id)} />
      </div>
    );
  }
  if (p.panel === "spaces") {
    return (
      <div className="ce-list" style={{ padding: "0 8px" }}>
        {p.waypoints.map((w) => (
          <button key={w.id} type="button" className="ce-row" onClick={() => p.onGo(w.t)} aria-current={w.space === p.space && w.t <= p.t && !p.waypoints.some((o) => o.t > w.t && o.t <= p.t) ? "true" : undefined}>
            <div><div className="ce-row__title">{w.label}</div><div className="ce-row__sub">{w.space}</div></div>
            <span className="ce-dock__time">{formatClock(w.t)}</span>
          </button>
        ))}
      </div>
    );
  }
  if (p.panel === "items") {
    if (p.asking) return <AskQuestion locator={locator} thumbUrl={data.walkthrough?.posterUrl} onSubmit={(text) => p.onSubmitQuestion(text, locator)} onCancel={() => p.onAsk(false)} />;
    if (item) {
      return (
        <>
          <button type="button" className="ce-btn ce-btn--quiet ce-btn--sm" style={{ margin: "10px 12px 0" }} onClick={() => p.onSelectItem(null)}>← All references</button>
          <ItemPanel item={item} basePath={data.basePath} linkSuffix={data.linkSuffix} currentKind="walkthrough" onOpenHere={p.onOpenRef} allowed={{ twin: twinOk }} compact onReply={(b) => p.onReply(item.id, b)} />
        </>
      );
    }
    return <ReferencesPanel data={data} items={p.items} currentKind="walkthrough" isNearby={(i) => i.refs.some((r) => r.kind === "walkthrough" && Math.abs(r.t - p.t) <= 6)} onSelectItem={(id) => p.onSelectItem(id)} onAsk={() => p.onAsk(true)} />;
  }
  if (p.panel === "more") {
    return (
      <ToolsPanel pathVisible={p.pathVisible} pathOpacity={p.pathOpacity} onPathVisible={p.onPath} onPathOpacity={p.onPathOpacity} playbackRate={p.playbackRate} onPlaybackRate={p.onPlaybackRate}>
        <section><h3 className="ce-h2" style={{ marginBottom: 4 }}>Share this view</h3><div style={{ margin: "0 -18px" }}><SharePanelBody url={p.shareUrl} poweredBy={data.brand.poweredBySlate360 && data.brand.whiteLabel} /></div></section>
      </ToolsPanel>
    );
  }
  return null;
}
