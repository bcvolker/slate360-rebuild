"use client";

import Link from "next/link";
import { ExternalLink, FileText } from "lucide-react";
import type { ProjectItem, SpatialRef } from "@/lib/client-experience/types";
import { formatDate, formatTime, hrefForRef, ITEM_STATUS_LABEL, ITEM_TYPE_LABEL, REF_LABEL } from "@/lib/client-experience/utils";

type Props = {
  item: ProjectItem;
  basePath: string;
  /** The representation the panel is being shown inside; that ref is marked "here". */
  currentKind?: SpatialRef["kind"] | null;
  /** Optional in-place handler; when provided, refs of `currentKind` navigate without a page change. */
  onOpenHere?: (ref: SpatialRef) => void;
  compact?: boolean;
};

/**
 * One item presentation for every entry point (plan, walkthrough, twin,
 * station, list). Only the container differs.
 */
export function ItemPanel({ item, basePath, currentKind = null, onOpenHere, compact = false }: Props) {
  return (
    <article className="ce-item" data-testid="ce-item-panel">
      <header>
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <span className="ce-eyebrow">{ITEM_TYPE_LABEL[item.type]}</span>
          <span className={`ce-chip ce-chip--${item.status}`}>{ITEM_STATUS_LABEL[item.status]}</span>
        </div>
        <h2 className="ce-item__title">{item.title}</h2>
        <p className="ce-eyebrow" style={{ marginTop: 8 }}>Opened {formatDate(item.createdAt)}</p>
      </header>

      <p className="ce-body" style={{ margin: 0 }}>{item.description}</p>

      <section>
        <h3 className="ce-h2" style={{ marginBottom: 10 }}>Locations</h3>
        <div className="ce-refs">
          {item.refs.map((ref, i) => {
            const here = ref.kind === currentKind;
            const href = hrefForRef(basePath, ref, item.id);
            const body = (
              <>
                <div>
                  <div className="ce-ref__kind">{REF_LABEL[ref.kind]}{here ? " · this view" : ""}</div>
                  <div className="ce-ref__label">{ref.label}</div>
                </div>
                <span className="ce-btn ce-btn--sm">{here ? "Go to location" : "Open location"}</span>
              </>
            );
            return here && onOpenHere ? (
              <button key={i} type="button" className="ce-ref" onClick={() => onOpenHere(ref)} style={{ textAlign: "left" }}>{body}</button>
            ) : (
              <Link key={i} href={href} className="ce-ref">{body}</Link>
            );
          })}
        </div>
      </section>

      {item.attachments.length ? (
        <section>
          <h3 className="ce-h2" style={{ marginBottom: 10 }}>Attachments</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {item.attachments.map((a) => (
              <a key={a.id} href={a.url} target="_blank" rel="noreferrer" className="ce-attach">
                {a.thumbUrl ? <img src={a.thumbUrl} alt="" /> : <span style={{ display: "grid", placeItems: "center", width: 56, height: 40 }}><FileText size={18} /></span>}
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>{a.title} <ExternalLink size={12} style={{ opacity: .6 }} /></div>
                  {a.meta ? <div className="ce-tile__meta">{a.meta}</div> : null}
                </div>
              </a>
            ))}
          </div>
        </section>
      ) : null}

      {!compact || item.comments.length ? (
        <section>
          <h3 className="ce-h2" style={{ marginBottom: 6 }}>Comments</h3>
          {item.comments.length === 0 ? <p className="ce-body" style={{ fontSize: 13.5 }}>No comments yet.</p> : null}
          {item.comments.map((c) => (
            <div key={c.id} className="ce-comment">
              <div className="ce-comment__meta">
                <span className={`ce-comment__author${c.role === "slate360" ? " ce-comment__author--slate" : ""}`}>{c.author}</span>
                <time dateTime={c.at}>{formatDate(c.at)} · {formatTime(c.at)}</time>
              </div>
              <p className="ce-body" style={{ margin: 0, fontSize: 14 }}>{c.body}</p>
            </div>
          ))}
          <form onSubmit={(e) => e.preventDefault()} style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
            <input type="text" placeholder="Ask a question or add a comment" aria-label="Add a comment" style={{ minHeight: 40, padding: "0 12px", borderRadius: 6, border: "1px solid var(--ce-line-strong)", background: "transparent", color: "inherit", font: "inherit", fontSize: 14 }} />
            <button type="submit" className="ce-btn">Post</button>
          </form>
        </section>
      ) : null}

      {!compact && item.activity.length ? (
        <section>
          <h3 className="ce-h2" style={{ marginBottom: 10 }}>Activity</h3>
          <ul className="ce-activity" style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {item.activity.map((a) => (
              <li key={a.id}><time dateTime={a.at}>{formatDate(a.at)}</time><span>{a.summary}</span></li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}
