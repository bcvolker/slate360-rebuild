"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { CAPTURE_TAG_SUGGESTIONS } from "@/lib/types/site-walk-capture";
import { noteReviewTokens } from "./capture-v2-note-review-tokens";

type Props = {
  tags: string[];
  previousTags?: string[];
  onChange: (tags: string[]) => void;
};

export function CaptureV2NoteReviewTags({ tags, previousTags = [], onChange }: Props) {
  const [draftTag, setDraftTag] = useState("");
  const [adding, setAdding] = useState(false);

  const suggestions = useMemo(() => {
    const pool = Array.from(new Set([...CAPTURE_TAG_SUGGESTIONS, ...previousTags]));
    const query = draftTag.trim().toLowerCase();
    if (!query) return pool.filter((tag) => !tags.includes(tag)).slice(0, 6);
    return pool
      .filter((tag) => tag.toLowerCase().includes(query) && !tags.includes(tag))
      .slice(0, 6);
  }, [draftTag, previousTags, tags]);

  function addTag(value: string) {
    const next = value.trim();
    if (!next || tags.includes(next)) return;
    onChange([...tags, next]);
    setDraftTag("");
    setAdding(false);
  }

  function removeTag(tag: string) {
    onChange(tags.filter((current) => current !== tag));
  }

  return (
    <section className={`${noteReviewTokens.margin} pb-3`} data-note-review="tags">
      <div className={noteReviewTokens.sectionCard}>
      <span className={noteReviewTokens.sectionLabel}>Tags</span>
      <div className="mt-2 flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span key={tag} className={noteReviewTokens.tagChip}>
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="inline-flex h-4 w-4 items-center justify-center rounded text-[var(--graphite-muted)]"
              aria-label={`Remove tag ${tag}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        {adding ? (
          <div className="flex min-w-[8rem] flex-1 flex-col gap-1">
            <input
              value={draftTag}
              onChange={(event) => setDraftTag(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addTag(draftTag);
                }
                if (event.key === "Escape") setAdding(false);
              }}
              autoFocus
              placeholder="Tag name"
              className="h-9 rounded-lg border border-[var(--mobile-app-card-border)] bg-[var(--surface-zinc)] px-2 text-sm outline-none focus:border-[var(--accent-border-green)]"
            />
            {suggestions.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {suggestions.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => addTag(tag)}
                    className="rounded-md border border-[var(--mobile-app-card-border)] px-2 py-0.5 text-[11px] text-[var(--graphite-muted)]"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className={noteReviewTokens.tagAddChip}
          >
            + tag
          </button>
        )}
      </div>
      </div>
    </section>
  );
}
