"use client";

import { useState } from "react";
import { FileText, MessageCircleQuestion } from "lucide-react";
import type { ProjectExperience, ProjectItem, SpatialRef } from "@/lib/client-experience/types";
import { ITEM_STATUS_LABEL, ITEM_TYPE_LABEL } from "@/lib/client-experience/utils";

type Group = "items" | "questions" | "documents";
type Scope = "all" | "nearby";

type Props = {
  data: ProjectExperience;
  items: ProjectItem[];
  /** Honest proximity: which items count as "nearby" in the current view. Omit to hide the scope control. */
  isNearby?: (item: ProjectItem) => boolean;
  onSelectItem: (id: string) => void;
  onAsk?: () => void;
  currentKind?: SpatialRef["kind"];
};

/**
 * Spatial references index inside a viewer. A document pinned in the sphere
 * is also findable here — the client never has to hunt through the panorama.
 */
export function ReferencesPanel({ data, items, isNearby, onSelectItem, onAsk, currentKind }: Props) {
  const [group, setGroup] = useState<Group>("items");
  const [scope, setScope] = useState<Scope>("all");
  const questions = items.filter((i) => i.type === "question");
  const nonQuestions = items.filter((i) => i.type !== "question");
  const docs = data.documents;
  const scoped = (list: ProjectItem[]) => (scope === "nearby" && isNearby ? list.filter(isNearby) : list);
  const rows = group === "items" ? scoped(nonQuestions) : group === "questions" ? scoped(questions) : [];
  const inView = (i: ProjectItem) => (currentKind ? i.refs.some((r) => r.kind === currentKind) : false);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "12px 12px 20px" }} data-testid="ce-references">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        <div className="ce-seg" role="group" aria-label="Reference type">
          {([["items", "Items", nonQuestions.length], ["questions", "Questions", questions.length], ["documents", "Documents", docs.length]] as const).map(([k, label, n]) => (
            <button key={k} type="button" className="ce-seg__btn" aria-pressed={group === k} onClick={() => setGroup(k)}>{label}{n ? <span className="ce-badge" style={{ marginLeft: 6 }}>{n}</span> : null}</button>
          ))}
        </div>
        {isNearby && group !== "documents" ? (
          <div className="ce-seg" role="group" aria-label="Scope">
            <button type="button" className="ce-seg__btn" aria-pressed={scope === "all"} onClick={() => setScope("all")}>All project</button>
            <button type="button" className="ce-seg__btn" aria-pressed={scope === "nearby"} onClick={() => setScope("nearby")}>Nearby</button>
          </div>
        ) : null}
      </div>

      {group === "documents" ? (
        <div className="ce-list">
          {docs.map((d) => (
            <a key={d.id} href={d.url} target="_blank" rel="noreferrer" className="ce-row">
              <div style={{ display: "grid", gridTemplateColumns: "20px 1fr", gap: 10, alignItems: "center" }}>
                <FileText size={16} style={{ color: "var(--ce-ink-3)" }} />
                <div><div className="ce-row__title">{d.title}</div><div className="ce-row__sub ce-code">{d.meta}</div></div>
              </div>
              {d.refCount ? <span className="ce-badge" title="Spatial references">{d.refCount}</span> : null}
            </a>
          ))}
          {docs.length === 0 ? <p className="ce-body" style={{ padding: "12px 4px", fontSize: 13.5 }}>No documents on this project.</p> : null}
        </div>
      ) : (
        <div className="ce-list">
          {rows.map((i) => (
            <button key={i.id} type="button" className="ce-row" onClick={() => onSelectItem(i.id)}>
              <div>
                <div className="ce-row__title">{i.title}</div>
                <div className="ce-row__sub">{ITEM_TYPE_LABEL[i.type]}{i.author ? ` · ${i.author}` : ""}{inView(i) ? " · in this view" : ""}</div>
              </div>
              <span className={`ce-chip ce-chip--${i.status}`}>{ITEM_STATUS_LABEL[i.status]}</span>
            </button>
          ))}
          {rows.length === 0 ? <p className="ce-body" style={{ padding: "12px 4px", fontSize: 13.5 }}>{scope === "nearby" ? "Nothing near this view." : group === "questions" ? "No questions yet." : "No items yet."}</p> : null}
        </div>
      )}

      {onAsk && data.capabilities.questions ? (
        <button type="button" className="ce-btn" onClick={onAsk} data-testid="ce-ask-open" style={{ alignSelf: "flex-start", marginTop: 4 }}><MessageCircleQuestion size={16} /> Ask a Question</button>
      ) : null}
    </div>
  );
}
