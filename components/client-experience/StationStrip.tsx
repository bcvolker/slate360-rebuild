"use client";

import { useState } from "react";
import type { ProjectExperience, Station } from "@/lib/client-experience/types";
import { formatDate, formatTime } from "@/lib/client-experience/utils";

/** Station browser: small optimized thumbs, skeleton until loaded, calm fade-in. Never the ERP source. */
export function StationStrip({ data, siblings, currentId, visitLabel, onSelect }: { data: ProjectExperience; siblings: Station[]; currentId: string; visitLabel: string | null; onSelect: (id: string) => void }) {
  const otherVisits = data.visits.filter((v) => !siblings.some((s) => s.visitId === v.id) && data.stations.some((s) => s.visitId === v.id));
  return (
    <div style={{ padding: 12 }} data-testid="ce-station-strip">
      {visitLabel ? <p className="ce-eyebrow" style={{ margin: "4px 6px 10px" }}>{visitLabel}</p> : null}
      <div className="ce-grid ce-grid--2" style={{ gap: 8 }}>
        {siblings.map((s) => <StationTile key={s.id} station={s} selected={s.id === currentId} onSelect={() => onSelect(s.id)} />)}
      </div>
      {otherVisits.length ? (
        <div style={{ marginTop: 18 }}>
          <p className="ce-eyebrow" style={{ margin: "0 6px 8px" }}>Other visits</p>
          {otherVisits.map((v) => { const first = data.stations.find((s) => s.visitId === v.id)!; return (
            <button key={v.id} type="button" className="ce-row" onClick={() => onSelect(first.id)}>
              <div><div className="ce-row__title">{formatDate(v.capturedAt)}</div><div className="ce-row__sub">{v.label}</div></div>
              <span className="ce-btn ce-btn--sm">Open</span>
            </button>
          ); })}
        </div>
      ) : null}
    </div>
  );
}

function StationTile({ station, selected, onSelect }: { station: Station; selected: boolean; onSelect: () => void }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <button type="button" className={`ce-tile${selected ? " ce-tile--selected" : ""}`} onClick={onSelect} aria-current={selected ? "true" : undefined} style={{ textAlign: "left" }}>
      <div className={`ce-tile__img ce-tile__img--wide${loaded ? "" : " ce-skel"}`} style={{ position: "relative" }}>
        <img src={station.thumbUrl} alt="" loading="lazy" decoding="async" className={`ce-img-fade${loaded ? " is-loaded" : ""}`} onLoad={() => setLoaded(true)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
      <div className="ce-tile__body" style={{ padding: "8px 10px 10px" }}>
        <div className="ce-tile__title" style={{ fontSize: 13 }}>{station.label}</div>
        <div className="ce-tile__meta ce-code">{formatTime(station.capturedAt)}</div>
      </div>
    </button>
  );
}
