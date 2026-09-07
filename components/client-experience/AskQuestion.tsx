"use client";

import { useState } from "react";
import type { SpatialRef } from "@/lib/client-experience/types";
import { REF_LABEL } from "@/lib/client-experience/utils";
import { QUESTION_COPY } from "@/lib/spatial-experience/questions";

type Props = {
  /** The client's current view, attached automatically. */
  locator: SpatialRef;
  thumbUrl?: string | null;
  onSubmit: (text: string) => void;
  onCancel: () => void;
};

/** Ask a Question: location attached, one short field, one button. Never "Create RFI". */
export function AskQuestion({ locator, thumbUrl, onSubmit, onCancel }: Props) {
  const [text, setText] = useState("");
  const where = locator.kind === "walkthrough" ? `${REF_LABEL.walkthrough} · ${Math.round(locator.t)}s` : locator.kind === "station" ? `${REF_LABEL.station}` : locator.kind === "plan" ? REF_LABEL.plan : REF_LABEL.twin;
  return (
    <form className="ce-item" data-testid="ce-ask" onSubmit={(e) => { e.preventDefault(); if (text.trim()) onSubmit(text.trim()); }}>
      <header>
        <h2 className="ce-item__title" style={{ marginTop: 0 }}>{QUESTION_COPY.action}</h2>
        <p className="ce-body" style={{ margin: "6px 0 0", fontSize: 14 }}>Your question will be attached to this location.</p>
      </header>
      <div className="ce-attach" style={{ gridTemplateColumns: thumbUrl ? "56px 1fr" : "1fr" }}>
        {thumbUrl ? <img src={thumbUrl} alt="" /> : null}
        <div>
          <div style={{ fontSize: 14, fontWeight: 500 }}>{locator.label}</div>
          <div className="ce-tile__meta">{where}</div>
        </div>
      </div>
      <textarea className="ce-field" rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="What would you like to know about this spot?" aria-label="Your question" autoFocus />
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button type="button" className="ce-btn ce-btn--quiet" onClick={onCancel}>Cancel</button>
        <button type="submit" className="ce-btn ce-btn--primary" disabled={!text.trim()}>{QUESTION_COPY.submit}</button>
      </div>
      <p className="ce-eyebrow">{QUESTION_COPY.guestHelp}</p>
    </form>
  );
}
