"use client";

import { ENTIRE_WALK_NAME, type ChapterRecord } from "@/lib/spatial-walkthrough/chapters";

type Props = {
  chapters: ChapterRecord[];
  selectedId: string | null;
  locked?: boolean;
  open?: boolean;
  onSelect: (id: string | null) => void;
};

export function ChapterPicker({ chapters, selectedId, locked = false, open = false, onSelect }: Props) {
  const selected = chapters.find((c) => c.id === selectedId);
  const label = selected?.name ?? ENTIRE_WALK_NAME;

  if (locked) {
    return <p className="sw-chapter-chip">{label}</p>;
  }

  return (
    <details className="sw-chapter-picker" data-testid="sw-spaces" open={open || undefined}>
      <summary className="sw-chrome-btn">Spaces · {label}</summary>
      <ul>
        <li>
          <button type="button" data-active={!selectedId} onClick={() => onSelect(null)}>
            {ENTIRE_WALK_NAME}
          </button>
        </li>
        {chapters.map((c) => (
          <li key={c.id}>
            <button type="button" data-active={c.id === selectedId} onClick={() => onSelect(c.id)}>
              <span>{c.name}</span>
              <small>{[c.floor, c.zone, c.chapterType].filter(Boolean).join(" · ")}</small>
            </button>
          </li>
        ))}
      </ul>
    </details>
  );
}
