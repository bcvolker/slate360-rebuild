"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ProjectExperience } from "@/lib/client-experience/types";
import { formatDate, visitById } from "@/lib/client-experience/utils";
import { ProjectShell } from "./ProjectShell";
import { PlanCanvas } from "./PlanCanvas";
import { ItemPanel } from "./ItemPanel";
import { ViewerPanel } from "./ViewerPanel";

type Props = { data: ProjectExperience; initial: { u: number | null; v: number | null; item: string | null; visitId: string | null } };

/** Plan mode: the sheet is the stage; everything on it is a way into another representation. */
export function PlanExperience({ data, initial }: Props) {
  const router = useRouter();
  const plan = data.plan!;
  const [visitId, setVisitId] = useState(initial.visitId ?? data.latestVisitId);
  const [itemId, setItemId] = useState<string | null>(initial.item);
  const [panel, setPanel] = useState<"items" | "legend" | null>(initial.item ? "items" : null);
  const visit = visitById(data, visitId);
  const stations = data.stations.filter((s) => s.visitId === visitId);
  const waypoints = data.walkthrough && data.walkthrough.visitId === visitId ? data.walkthrough.waypoints : [];
  const item = data.items.find((i) => i.id === itemId) ?? null;
  const planItems = data.items.flatMap((i) => i.refs.filter((r) => r.kind === "plan").map((r) => (r.kind === "plan" ? { id: i.id, label: i.title, status: i.status, u: r.u, v: r.v } : null))).filter((x): x is NonNullable<typeof x> => Boolean(x));
  const focusPoint = initial.u != null && initial.v != null ? { u: initial.u, v: initial.v } : null;

  return (
    <div className="ce ce-viewer" data-testid="ce-plan-mode">
      <div className="ce-viewer__stage" style={{ top: "var(--ce-shell-h)" }}>
        <PlanCanvas sheet={plan} waypoints={waypoints} stations={stations} items={planItems} selectedItemId={itemId} focusPoint={focusPoint}
          onWaypoint={(w) => router.push(`${data.basePath}/walk?t=${w.t}`)}
          onStation={(s) => router.push(`${data.basePath}/stations?s=${s.id}`)}
          onItem={(id) => { setItemId(id); setPanel("items"); }} />
      </div>
      <ProjectShell data={data} section="plan" visitId={visitId} backHref={data.basePath} viewLabel={`${plan.sheetNumber} · ${plan.title}`}
        actions={data.visits.length > 1 ? (
          <label className="ce-eyebrow" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="ce-dock__desktop">Visit</span>
            <select value={visitId} onChange={(e) => setVisitId(e.target.value)} aria-label="Visit" style={{ background: "transparent", color: "var(--ce-ink)", border: "1px solid var(--ce-line-strong)", borderRadius: 6, minHeight: 32, padding: "0 8px", font: "inherit", fontSize: 12.5 }}>
              {data.visits.map((v) => <option key={v.id} value={v.id} style={{ color: "black" }}>{formatDate(v.capturedAt)} — {v.label}</option>)}
            </select>
          </label>
        ) : null}
      />
      <div className="ce-dock">
        <span className="ce-dock__space" style={{ padding: "0 10px" }}>{visit ? `${stations.length} stations${waypoints.length ? " · walk path" : ""} · ${planItems.length} items` : ""}</span>
        <span className="ce-dock__sep" />
        <button type="button" className="ce-dock__btn" onClick={() => setPanel((p) => (p === "items" ? null : "items"))} aria-pressed={panel === "items"}>Items</button>
        {data.walkthrough ? <button type="button" className="ce-dock__btn" onClick={() => router.push(`${data.basePath}/walk`)}>Walkthrough</button> : null}
        {stations[0] ? <button type="button" className="ce-dock__btn" onClick={() => router.push(`${data.basePath}/stations?s=${stations[0].id}`)}>360</button> : null}
      </div>
      <ViewerPanel open={panel !== null} title="Items" onClose={() => setPanel(null)}>
        {item ? (
          <>
            <button type="button" className="ce-btn ce-btn--sm" style={{ margin: "12px 18px 0" }} onClick={() => setItemId(null)}>All items</button>
            <ItemPanel item={item} basePath={data.basePath} currentKind="plan" compact />
          </>
        ) : (
          <div className="ce-list" style={{ padding: "0 8px" }}>
            {data.items.map((i) => (
              <button key={i.id} type="button" className="ce-row" style={{ textAlign: "left" }} onClick={() => setItemId(i.id)}>
                <div><div className="ce-row__title">{i.title}</div><div className="ce-row__sub">{i.refs.length} locations</div></div>
                <span className={`ce-chip ce-chip--${i.status}`} />
              </button>
            ))}
          </div>
        )}
      </ViewerPanel>
    </div>
  );
}
