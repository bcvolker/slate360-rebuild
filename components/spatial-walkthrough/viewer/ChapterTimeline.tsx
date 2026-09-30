"use client";

import type { TimelineBand } from "@/lib/spatial-walkthrough/chapters";

type Props = {
  bands: TimelineBand[];
  onSelect: (id: string) => void;
};

export function ChapterTimeline({ bands, onSelect }: Props) {
  if (bands.length === 0) return null;
  return (
    <div className="sw-chapter-bands" aria-hidden={false}>
      {bands.map((b) => (
        <button
          key={b.id}
          type="button"
          className="sw-chapter-band"
          data-active={b.active}
          style={{ left: `${b.startPct}%`, width: `${b.widthPct}%` }}
          title={b.name}
          onClick={() => onSelect(b.id)}
        >
          <span>{b.name}</span>
        </button>
      ))}
    </div>
  );
}
