"use client";

import type { ChapterRecord } from "@/lib/spatial-walkthrough/chapters";

type Props = {
  chapter: ChapterRecord | null;
  onSelect: (id: string) => void;
};

export function NextChapterControl({ chapter, onSelect }: Props) {
  if (!chapter) return null;
  return (
    <button
      type="button"
      className="sw-chrome-btn sw-next-chapter"
      onClick={() => onSelect(chapter.id)}
    >
      Next chapter
      <span>{chapter.name}</span>
    </button>
  );
}
