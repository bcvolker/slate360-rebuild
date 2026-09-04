"use client";

import Link from "next/link";
import { useState } from "react";
import { Box, ExternalLink, FileText, Footprints, Map, Orbit } from "lucide-react";
import type { ProjectItem, SpatialRef } from "@/lib/client-experience/types";
import { formatDate, formatTime, hrefForRef, ITEM_STATUS_LABEL, ITEM_TYPE_LABEL, REF_LABEL } from "@/lib/client-experience/utils";

type Props = {
  item: ProjectItem;
  basePath: string;
  linkSuffix?: string;
  currentKind?: SpatialRef["kind"] | null;
  onOpenHere?: (ref: SpatialRef) => void;
  /** Which locator kinds the client may open (twin only when accepted). */
  allowed?: Partial<Record<SpatialRef["kind"], boolean>>;
  compact?: boolean;
  onReply?: (body: string) => void;
};

const KIND_ICON = { plan: Map, walkthrough: Footprints, station: Orbit, twin: Box } as const;

/** One item presentation for every entry point: type/status → title → summary → locations → attachments → conversation. */
export function ItemPanel({ item, basePath, linkSuffix = "", currentKind = null, onOpenHere, allowed, compact = false, onReply }: Props) {
  const [expanded, setExpanded] = useState(!compact);
  const [showActivity, setShowActivity] = useState(false);
  const [draft, setDraft] = useState("");
  const refs = item.refs.filter((r) => allowed?.[r.kind] !== false);
  const isQuestion = item.type === "question";

  return (
    <article className="ce-item" data-testid="ce-item-panel">
      <header>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span className="ce-eyebrow" style={{ color: "var(--ce-ink-2)", fontWeight: 600 }}>{ITEM_TYPE_LABEL[item.type]}</span>
          <span className={`ce-chip ce-chip--${item.status}`}>{ITEM_STATUS_LABEL[item.status]}</span>
        </div>
        <h2 className="ce-item__title">{item.title}</h2>
        <p className="ce-eyebrow" style={{ marginTop: 6 }}>{item.author ? `${item.author} · ` : ""}<span className="ce-code">{formatDate(item.createdAt)}</span></p>
      </header>

      {item.description && !isQuestion ? (
        <div>
          <p className={`ce-body${expanded ? "" : " ce-clamp"}`} style={{ margin: 0 }}>{item.description}</p>
          {compact && item.description.length > 160 ? <button type="button" className="ce-btn ce-btn--quiet ce-btn--sm" style={{ paddingLeft: 0 }} onClick={() => setExpanded((v) => !v)}>{expanded ? "Show less" : "Read more"}</button> : null}
        </div>
      ) : null}

      {refs.length ? (
        <section>
          <h3 className="ce-h2" style={{ marginBottom: 8 }}>Locations</h3>
          <div className="ce-refs">
            {refs.map((ref, i) => {
              const Icon = KIND_ICON[ref.kind];
              const here = ref.kind === currentKind;
              const body = (
                <>
                  <Icon size={16} style={{ color: "var(--ce-ink-3)" }} />
                  <div><div className="ce-ref__kind">{REF_LABEL[ref.kind]}{here ? " · this view" : ""}</div><div className="ce-ref__label">{ref.label}</div></div>
                  <span className="ce-ref__go">View</span>
                </>
              );
              return here && onOpenHere
                ? <button key={i} type="button" className="ce-ref" onClick={() => onOpenHere(ref)}>{body}</button>
                : <Link key={i} href={hrefForRef(basePath, ref, item.id, linkSuffix)} className="ce-ref">{body}</Link>;
            })}
          </div>
        </section>
      ) : null}

      {item.attachments.length ? (
        <section>
          <h3 className="ce-h2" style={{ marginBottom: 8 }}>Attachments</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {item.attachments.map((a) => (
              <a key={a.id} href={a.url} target="_blank" rel="noreferrer" className="ce-attach">
                {a.thumbUrl ? <img src={a.thumbUrl} alt="" loading="lazy" /> : <span style={{ display: "grid", placeItems: "center", width: 56, height: 40 }}><FileText size={18} /></span>}
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>{a.title} <ExternalLink size={12} style={{ opacity: .6 }} /></div>
                  {a.meta ? <div className="ce-tile__meta ce-code">{a.meta}</div> : null}
                </div>
              </a>
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <h3 className="ce-h2" style={{ marginBottom: 4 }}>Conversation</h3>
        {item.comments.length === 0 ? <p className="ce-body" style={{ fontSize: 13.5, margin: "6px 0" }}>No messages yet.</p> : null}
        {item.comments.map((c) => (
          <div key={c.id} className="ce-msg">
            <span className={`ce-msg__avatar${c.role === "slate360" ? " ce-msg__avatar--slate" : ""}`} aria-hidden="true">{c.author.split(/\s+/).map((w) => w[0]).slice(0, 2).join("")}</span>
            <div>
              <div className="ce-msg__meta"><span className="ce-msg__author">{c.author}</span><time dateTime={c.at} className="ce-code">{formatDate(c.at)} · {formatTime(c.at)}</time></div>
              <p className="ce-body" style={{ margin: 0, fontSize: 14 }}>{c.body}</p>
            </div>
          </div>
        ))}
        {item.status === "resolved" ? <p className="ce-eyebrow" style={{ marginTop: 6 }}>Resolved</p> : null}
        <form onSubmit={(e) => { e.preventDefault(); if (draft.trim()) { onReply?.(draft.trim()); setDraft(""); } }} style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
          <input className="ce-field" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Reply" aria-label="Reply" />
          <button type="submit" className="ce-btn" disabled={!draft.trim()}>Send</button>
        </form>
      </section>

      {item.activity.length ? (
        <section>
          <button type="button" className="ce-btn ce-btn--quiet ce-btn--sm" style={{ paddingLeft: 0 }} onClick={() => setShowActivity((v) => !v)} aria-expanded={showActivity}>
            {showActivity ? "Hide activity" : `Activity (${item.activity.length})`}
          </button>
          {showActivity ? (
            <ul className="ce-activity" style={{ listStyle: "none", padding: 0, margin: "8px 0 0" }}>
              {item.activity.map((a) => <li key={a.id}><time dateTime={a.at} className="ce-code">{formatDate(a.at)}</time><span>{a.summary}</span></li>)}
            </ul>
          ) : null}
        </section>
      ) : null}
    </article>
  );
}
