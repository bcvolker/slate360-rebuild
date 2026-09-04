"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare } from "lucide-react";
import type { ProjectExperience, SpatialRef } from "@/lib/client-experience/types";
import { formatDate, visitById, withSuffix } from "@/lib/client-experience/utils";
import { ProjectShell } from "./ProjectShell";
import { brandStyle } from "@/lib/client-experience/layout";
import { PlanCanvas } from "./PlanCanvas";
import { ItemPanel } from "./ItemPanel";
import { ReferencesPanel } from "./ReferencesPanel";
import { AskQuestion } from "./AskQuestion";
import { ViewerPanel, SharePanelBody } from "./ViewerPanel";
import { planItemMarkers } from "./WalkPanels";
import { useProjectItems } from "./useProjectItems";

type Panel = "items" | "more" | null;
type Props = { data: ProjectExperience; initial: { u: number | null; v: number | null; item: string | null; visitId: string | null } };

/** Plan mode: white sheet inside dark project chrome. Everything on it is a way into another representation. */
export function PlanExperience({ data, initial }: Props) {
  const router = useRouter();
  const plan = data.plan!;
  const q = data.linkSuffix;
  const [visitId, setVisitId] = useState(initial.visitId ?? data.latestVisitId);
  const [itemId, setItemId] = useState<string | null>(initial.item);
  const [asking, setAsking] = useState(false);
  const [panel, setPanel] = useState<Panel>(initial.item ? "items" : null);
  const { items, ask, reply } = useProjectItems(data.items);
  const visit = visitById(data, visitId);
  const stations = data.stations.filter((s) => s.visitId === visitId);
  const waypoints = data.walkthrough && data.walkthrough.visitId === visitId ? data.walkthrough.waypoints : [];
  const item = items.find((i) => i.id === itemId) ?? null;
  const focusPoint = initial.u != null && initial.v != null ? { u: initial.u, v: initial.v } : null;
  const locator: SpatialRef = { kind: "plan", label: `${plan.sheetNumber} · ${plan.title}`, u: focusPoint?.u ?? (plan.focus.u0 + plan.focus.u1) / 2, v: focusPoint?.v ?? (plan.focus.v0 + plan.focus.v1) / 2 };
  const openCount = items.filter((i) => i.status !== "resolved").length;

  return (
    <div className="ce ce-viewer" data-testid="ce-plan-mode" style={brandStyle(data)}>
      <div className="ce-viewer__stage" style={{ top: "var(--ce-shell-h)" }}>
        <PlanCanvas sheet={plan} waypoints={waypoints} stations={stations} items={planItemMarkers(items)} selectedItemId={itemId} focusPoint={focusPoint}
          onWaypoint={(w) => router.push(withSuffix(`${data.basePath}/walk?t=${w.t}`, q))}
          onStation={(s) => router.push(withSuffix(`${data.basePath}/stations?s=${s.id}`, q))}
          onItem={(id) => { setItemId(id); setAsking(false); setPanel("items"); }} />
      </div>
      <ProjectShell data={data} section="plan" visitId={visitId} backHref={data.basePath} viewLabel={`Plan · ${plan.sheetNumber}`} onShare={() => setPanel("more")}
        actions={data.visits.length > 1 ? (
          <select value={visitId} onChange={(e) => setVisitId(e.target.value)} aria-label="Visit" className="ce-btn ce-btn--sm" style={{ background: "var(--ce-glass-strong)", paddingRight: 8 }}>
            {data.visits.map((v) => <option key={v.id} value={v.id} style={{ color: "black" }}>{formatDate(v.capturedAt)} — {v.label}</option>)}
          </select>
        ) : null} />
      <div className="ce-dock">
        <span className="ce-dock__space" style={{ padding: "0 10px" }}><span>{visit ? `${stations.length} stations${waypoints.length ? " · walk path" : ""}` : ""}</span></span>
        <span className="ce-dock__sep" />
        <button type="button" className="ce-dock__btn" onClick={() => { setItemId(null); setAsking(false); setPanel((p) => (p === "items" ? null : "items")); }} aria-pressed={panel === "items"}><MessageSquare size={16} /> Items{openCount ? <span className="ce-badge">{openCount}</span> : null}</button>
        {data.walkthrough ? <button type="button" className="ce-dock__btn" onClick={() => router.push(withSuffix(`${data.basePath}/walk`, q))}>Walkthrough</button> : null}
        {stations[0] ? <button type="button" className="ce-dock__btn" onClick={() => router.push(withSuffix(`${data.basePath}/stations?s=${stations[0].id}`, q))}>360</button> : null}
      </div>
      <ViewerPanel open={panel !== null} title="Items" tabs={[{ key: "items", label: "Items", count: openCount }, { key: "more", label: "More" }]} activeTab={panel ?? undefined} onTab={(k) => setPanel(k as Panel)} onClose={() => setPanel(null)}>
        {panel === "items" ? (asking ? <AskQuestion locator={locator} thumbUrl={data.documents[0]?.thumbUrl} onSubmit={(text) => { const created = ask(text, locator); setAsking(false); setItemId(created.id); }} onCancel={() => setAsking(false)} />
          : item ? (<><button type="button" className="ce-btn ce-btn--quiet ce-btn--sm" style={{ margin: "10px 12px 0" }} onClick={() => setItemId(null)}>← All references</button><ItemPanel item={item} basePath={data.basePath} linkSuffix={q} currentKind="plan" allowed={{ twin: data.capabilities.twin }} compact onReply={(b) => reply(item.id, b)} /></>)
          : <ReferencesPanel data={data} items={items} currentKind="plan" onSelectItem={(id) => setItemId(id)} onAsk={() => { setItemId(null); setAsking(true); }} />) : null}
        {panel === "more" ? <SharePanelBody url={typeof window === "undefined" ? "" : window.location.href} poweredBy={data.brand.poweredBySlate360 && data.brand.whiteLabel} /> : null}
      </ViewerPanel>
    </div>
  );
}
