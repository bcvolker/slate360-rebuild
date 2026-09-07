import Link from "next/link";
import { FileText } from "lucide-react";
import type { ProjectExperience } from "@/lib/client-experience/types";
import { formatDate, formatTime, ITEM_STATUS_LABEL, ITEM_TYPE_LABEL, stationsForVisit, withSuffix } from "@/lib/client-experience/utils";
import { ModalityTiles } from "./ModalityTiles";

const MODALITY_LABEL = { walkthrough: "Walkthrough", twin: "Reality twin", stations: "360 documentation", aerial: "Aerial" } as const;

export function RealityIndex({ data }: { data: ProjectExperience }) {
  return (
    <main className="ce-page" data-testid="ce-reality">
      <section className="ce-section">
        <p className="ce-eyebrow">Reality</p>
        <h1 className="ce-h1" style={{ marginTop: 8 }}>Every representation of the same project</h1>
        <p className="ce-body" style={{ maxWidth: "58ch", marginTop: 12 }}>Move between the continuous walkthrough and the dated 360 stations. Items and documents follow you into each one.</p>
        <div style={{ marginTop: 28 }}><ModalityTiles data={data} /></div>
      </section>
    </main>
  );
}

export function HistoryList({ data }: { data: ProjectExperience }) {
  const base = data.basePath, q = data.linkSuffix;
  return (
    <main className="ce-page" data-testid="ce-history">
      <section className="ce-section">
        <div className="ce-section__head"><h2 className="ce-h2">History</h2><span className="ce-section__link">{data.visits.length} visits</span></div>
        <div className="ce-list">
          {data.visits.map((v) => {
            const stations = stationsForVisit(data, v.id);
            return (
              <div key={v.id} id={v.id} className="ce-row" style={{ gridTemplateColumns: "140px 1fr auto", padding: "18px 4px" }}>
                <img src={v.thumbUrl} alt="" width={140} height={70} loading="lazy" style={{ borderRadius: 4, objectFit: "cover" }} />
                <div>
                  <div className="ce-row__title">{formatDate(v.capturedAt)} <span className="ce-code">{formatTime(v.capturedAt)}</span></div>
                  <div className="ce-row__sub">{v.label}</div>
                  <div className="ce-row__sub" style={{ marginTop: 6 }}>{v.modalities.filter((m) => m !== "twin" || data.capabilities.twin).map((m) => MODALITY_LABEL[m]).join(" · ")}{stations.length ? ` · ${stations.length} stations` : ""}</div>
                </div>
                <div className="ce-row__side">
                  {v.modalities.includes("walkthrough") && data.walkthrough ? <Link href={withSuffix(`${base}/walk`, q)} className="ce-btn ce-btn--sm">Walkthrough</Link> : null}
                  {stations.length ? <Link href={withSuffix(`${base}/stations?s=${stations[0].id}`, q)} className="ce-btn ce-btn--sm">360</Link> : null}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}

export function DocumentsList({ data }: { data: ProjectExperience }) {
  const base = data.basePath, q = data.linkSuffix;
  return (
    <main className="ce-page" data-testid="ce-documents">
      <section className="ce-section">
        <div className="ce-section__head"><h2 className="ce-h2">Project documents</h2><span className="ce-section__link">{data.documents.length} files</span></div>
        <div className="ce-grid ce-grid--3">
          {data.documents.map((d) => {
            const refs = data.items.filter((i) => i.attachments.some((a) => a.id === d.id));
            return (
              <div key={d.id} id={d.id} className="ce-tile">
                <a href={d.url} target="_blank" rel="noreferrer"><img src={d.thumbUrl} alt="" className="ce-tile__img" loading="lazy" /></a>
                <div className="ce-tile__body">
                  <div className="ce-tile__title" style={{ display: "flex", gap: 8, alignItems: "center" }}><FileText size={15} /> {d.title}</div>
                  <div className="ce-tile__meta ce-code">{d.meta}</div>
                  {refs.length ? (
                    <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 4 }}>
                      {refs.map((i) => <Link key={i.id} href={withSuffix(`${base}/items/${i.id}`, q)} className="ce-body" style={{ fontSize: 13 }}>Referenced by “{i.title}”</Link>)}
                    </div>
                  ) : null}
                  {d.sheetId && data.capabilities.plan ? <Link href={withSuffix(`${base}/plan`, q)} className="ce-btn ce-btn--sm" style={{ marginTop: 12 }}>Open on plan</Link> : null}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}

export function ItemsList({ data }: { data: ProjectExperience }) {
  const base = data.basePath, q = data.linkSuffix;
  return (
    <main className="ce-page" data-testid="ce-items">
      <section className="ce-section">
        <div className="ce-section__head"><h2 className="ce-h2">Items and questions</h2><span className="ce-section__link">{data.items.filter((i) => i.status !== "resolved").length} open</span></div>
        <div className="ce-list">
          {data.items.map((i) => (
            <Link key={i.id} href={withSuffix(`${base}/items/${i.id}`, q)} className="ce-row">
              <div>
                <div className="ce-row__title">{i.title}</div>
                <div className="ce-row__sub">{ITEM_TYPE_LABEL[i.type]}{i.author ? ` · ${i.author}` : ""} · <span className="ce-code">{formatDate(i.createdAt)}</span> · {i.refs.length} location{i.refs.length === 1 ? "" : "s"}{i.comments.length ? ` · ${i.comments.length} messages` : ""}</div>
              </div>
              <span className={`ce-chip ce-chip--${i.status}`}>{ITEM_STATUS_LABEL[i.status]}</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
