import Link from "next/link";
import type { ProjectExperience } from "@/lib/client-experience/types";
import { formatDate, ITEM_STATUS_LABEL, ITEM_TYPE_LABEL, latestVisit, stationsForVisit, withSuffix } from "@/lib/client-experience/utils";
import { heroActions, overviewSections } from "@/lib/client-experience/layout";
import { ModalityTiles } from "./ModalityTiles";

/**
 * Content-adaptive overview. Sections render only when they have real content;
 * a project with a title, a date, a hero and one action is complete on its own.
 */
export function ProjectOverview({ data }: { data: ProjectExperience }) {
  const base = data.basePath, q = data.linkSuffix;
  const latest = latestVisit(data);
  const actions = heroActions(data);
  const sections = overviewSections(data);
  const open = data.items.filter((i) => i.status !== "resolved");
  const sparse = sections.length === 0;
  const eyebrow = [data.brand.clientDisplayName, data.project.code].filter(Boolean).join(" · ");

  return (
    <main className="ce-page" data-testid="ce-overview" data-sections={sections.join(",") || "none"}>
      <section className={`ce-hero${sparse ? " ce-hero--sparse" : ""}`}>
        <img src={data.project.coverUrl} alt="" />
        <div className="ce-hero__shade" />
        <div className="ce-hero__body">
          <div>
            {eyebrow ? <p className="ce-eyebrow" style={{ marginBottom: 12 }}>{eyebrow}</p> : null}
            <h1 className="ce-h1">{data.project.name}</h1>
            <p className="ce-body" style={{ marginTop: 10, marginBottom: 0 }}>
              Documented <span className="ce-code" style={{ fontSize: 14, color: "inherit" }}>{formatDate(latest.capturedAt)}</span>
              {data.project.location ? ` · ${data.project.location}` : ""}
            </p>
          </div>
          {actions.length ? (
            <div className="ce-hero__actions">
              {actions.map((a) => (
                <Link key={a.key} href={a.href} className={`ce-btn${a.primary ? " ce-btn--primary" : ""}`} data-testid={`hero-${a.key}`}>{a.label}</Link>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      {sections.includes("reality") ? (
        <section className="ce-section">
          <div className="ce-section__head">
            <h2 className="ce-h2">Reality</h2>
            <Link href={withSuffix(`${base}/reality`, q)} className="ce-section__link">All representations</Link>
          </div>
          <ModalityTiles data={data} />
        </section>
      ) : null}

      {sections.includes("history") || sections.includes("items") ? (
        <div className="ce-two">
          {sections.includes("history") ? (
            <section>
              <div className="ce-section__head">
                <h2 className="ce-h2">History</h2>
                <Link href={withSuffix(`${base}/history`, q)} className="ce-section__link">All visits</Link>
              </div>
              <div className="ce-list">
                {data.visits.map((v) => (
                  <Link key={v.id} href={withSuffix(`${base}/history#${v.id}`, q)} className="ce-row">
                    <div>
                      <div className="ce-row__title">{formatDate(v.capturedAt)}</div>
                      <div className="ce-row__sub">{v.label}{stationsForVisit(data, v.id).length ? ` · ${stationsForVisit(data, v.id).length} stations` : ""}</div>
                    </div>
                    <img src={v.thumbUrl} alt="" width={96} height={48} loading="lazy" style={{ borderRadius: 3, objectFit: "cover" }} />
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
          {sections.includes("items") ? (
            <section>
              <div className="ce-section__head">
                <h2 className="ce-h2">{open.length ? "Open items" : "Items"}</h2>
                <Link href={withSuffix(`${base}/items`, q)} className="ce-section__link">{data.items.length} total</Link>
              </div>
              <div className="ce-list">
                {(open.length ? open : data.items).slice(0, 4).map((i) => (
                  <Link key={i.id} href={withSuffix(`${base}/items/${i.id}`, q)} className="ce-row">
                    <div>
                      <div className="ce-row__title">{i.title}</div>
                      <div className="ce-row__sub">{ITEM_TYPE_LABEL[i.type]} · {i.refs.length} location{i.refs.length === 1 ? "" : "s"}</div>
                    </div>
                    <span className={`ce-chip ce-chip--${i.status}`}>{ITEM_STATUS_LABEL[i.status]}</span>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      ) : null}

      {sections.includes("documents") || sections.includes("activity") ? (
        <div className="ce-two">
          {sections.includes("documents") ? (
            <section>
              <div className="ce-section__head">
                <h2 className="ce-h2">Documents</h2>
                <Link href={withSuffix(`${base}/documents`, q)} className="ce-section__link">All documents</Link>
              </div>
              <div className={`ce-grid ce-grid--${Math.min(3, data.documents.length) as 1 | 2 | 3}`}>
                {data.documents.slice(0, 3).map((d) => (
                  <Link key={d.id} href={withSuffix(`${base}/documents#${d.id}`, q)} className="ce-tile">
                    <img src={d.thumbUrl} alt="" className="ce-tile__img" loading="lazy" />
                    <div className="ce-tile__body">
                      <div className="ce-tile__title">{d.title}</div>
                      <div className="ce-tile__meta ce-code">{d.meta}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
          {sections.includes("activity") ? (
            <section>
              <div className="ce-section__head"><h2 className="ce-h2">Recent activity</h2></div>
              <ul className="ce-activity" style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {data.activity.slice(0, 5).map((a) => (
                  <li key={a.id}>
                    <time dateTime={a.at} className="ce-code">{formatDate(a.at)}</time>
                    <span>{a.itemId ? <Link href={withSuffix(`${base}/items/${a.itemId}`, q)}>{a.summary}</Link> : a.summary}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      ) : null}
    </main>
  );
}
