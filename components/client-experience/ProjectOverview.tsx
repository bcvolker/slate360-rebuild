import Link from "next/link";
import type { ProjectExperience } from "@/lib/client-experience/types";
import { formatDate, ITEM_STATUS_LABEL, ITEM_TYPE_LABEL, latestVisit, stationsForVisit } from "@/lib/client-experience/utils";
import { ModalityTiles } from "./ModalityTiles";

export function ProjectOverview({ data }: { data: ProjectExperience }) {
  const base = data.basePath;
  const latest = latestVisit(data);
  const open = data.items.filter((i) => i.status !== "resolved");
  const stationCount = data.stations.length;
  const hasWalk = Boolean(data.walkthrough);
  const hasTwin = Boolean(data.twin);
  const hasPlan = Boolean(data.plan);

  return (
    <main className="ce-page" data-testid="ce-overview">
      <section className="ce-hero">
        <img src={data.project.coverUrl} alt="" />
        <div className="ce-hero__shade" />
        <div className="ce-hero__body">
          <div>
            <p className="ce-eyebrow" style={{ marginBottom: 10 }}>
              {data.brand.name}{data.project.code ? ` · ${data.project.code}` : ""}
            </p>
            <h1 className="ce-h1">{data.project.name}</h1>
            <p className="ce-body" style={{ marginTop: 10, marginBottom: 0 }}>
              Latest documentation {formatDate(latest.capturedAt)}
              {data.project.location ? ` · ${data.project.location}` : ""}
            </p>
          </div>
          <div className="ce-hero__actions">
            {hasWalk ? <Link href={`${base}/walk`} className="ce-btn ce-btn--primary">Enter Walkthrough</Link> : null}
            {hasTwin ? <Link href={`${base}/twin`} className="ce-btn">Open Reality Twin</Link> : null}
            {hasPlan ? <Link href={`${base}/plan`} className="ce-btn">Open Plan</Link> : null}
          </div>
        </div>
      </section>

      <section className="ce-section">
        <div className="ce-section__head">
          <h2 className="ce-h2">Reality</h2>
          <Link href={`${base}/reality`} className="ce-section__link">All representations</Link>
        </div>
        <ModalityTiles data={data} />
      </section>

      <div className="ce-grid ce-grid--2" style={{ marginTop: 44, gap: 40 }}>
        <section>
          <div className="ce-section__head">
            <h2 className="ce-h2">History</h2>
            <Link href={`${base}/history`} className="ce-section__link">All visits</Link>
          </div>
          <div className="ce-list">
            {data.visits.map((v) => (
              <Link key={v.id} href={`${base}/history#${v.id}`} className="ce-row">
                <div>
                  <div className="ce-row__title">{formatDate(v.capturedAt)}</div>
                  <div className="ce-row__sub">{v.label} · {stationsForVisit(data, v.id).length} stations</div>
                </div>
                <img src={v.thumbUrl} alt="" width={96} height={48} style={{ borderRadius: 3, objectFit: "cover" }} />
              </Link>
            ))}
          </div>
        </section>
        <section>
          <div className="ce-section__head">
            <h2 className="ce-h2">Open items</h2>
            <Link href={`${base}/items`} className="ce-section__link">{data.items.length} total</Link>
          </div>
          <div className="ce-list">
            {open.map((i) => (
              <Link key={i.id} href={`${base}/items/${i.id}`} className="ce-row">
                <div>
                  <div className="ce-row__title">{i.title}</div>
                  <div className="ce-row__sub">{ITEM_TYPE_LABEL[i.type]} · {i.refs.length} locations</div>
                </div>
                <span className={`ce-chip ce-chip--${i.status}`}>{ITEM_STATUS_LABEL[i.status]}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <div className="ce-grid ce-grid--2" style={{ marginTop: 44, gap: 40 }}>
        <section>
          <div className="ce-section__head">
            <h2 className="ce-h2">Documents</h2>
            <Link href={`${base}/documents`} className="ce-section__link">All documents</Link>
          </div>
          <div className="ce-grid ce-grid--3">
            {data.documents.slice(0, 3).map((d) => (
              <Link key={d.id} href={`${base}/documents#${d.id}`} className="ce-tile">
                <img src={d.thumbUrl} alt="" className="ce-tile__img" />
                <div className="ce-tile__body">
                  <div className="ce-tile__title">{d.title}</div>
                  <div className="ce-tile__meta">{d.meta}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
        <section>
          <div className="ce-section__head"><h2 className="ce-h2">Recent activity</h2></div>
          <ul className="ce-activity" style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {data.activity.slice(0, 5).map((a) => (
              <li key={a.id}>
                <time dateTime={a.at}>{formatDate(a.at)}</time>
                <span>{a.itemId ? <Link href={`${base}/items/${a.itemId}`}>{a.summary}</Link> : a.summary}</span>
              </li>
            ))}
          </ul>
          <p className="ce-eyebrow" style={{ marginTop: 28 }}>{stationCount} stations · {data.documents.length} documents · {open.length} open items</p>
        </section>
      </div>
    </main>
  );
}
