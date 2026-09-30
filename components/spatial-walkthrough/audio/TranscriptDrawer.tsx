"use client";

import { useMemo, useState } from "react";
import type { TranscriptPhrase, TranscriptRecord } from "@/lib/spatial-walkthrough/audio";
import { activePhrase, allPhrases, searchTranscript } from "@/lib/spatial-walkthrough/transcript";

type Props = {
  open: boolean;
  records: TranscriptRecord[];
  t: number;
  onClose: () => void;
  onSeek: (phrase: TranscriptPhrase) => void;
};

export function TranscriptDrawer({ open, records, t, onClose, onSeek }: Props) {
  const [query, setQuery] = useState("");
  const phrases = useMemo(() => allPhrases(records), [records]);
  const active = activePhrase(phrases, t);
  const hits = query.trim() ? searchTranscript(records, query) : [];
  const list = query.trim() ? hits.map((h) => h.phrase) : phrases;
  if (!open) return null;

  return (
    <aside className="sw-drawer sw-transcript-drawer" role="dialog" aria-label="Transcript" data-testid="sw-transcript-drawer">
      <div className="sw-drawer-head">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--sw-muted)]">Transcript</p>
          <h2 className="text-base font-semibold">Search the briefing</h2>
        </div>
        <button type="button" className="sw-chrome-btn" onClick={onClose}>Close</button>
      </div>
      <div className="p-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search phrases"
          className="h-11 w-full border border-white/10 bg-transparent px-3 text-sm"
        />
      </div>
      <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        {list.map((phrase, i) => {
          const on = phrase === active || (active && phrase.start === active.start && phrase.text === active.text);
          return (
            <li key={`${phrase.start}-${i}`}>
              <button
                type="button"
                className="sw-transcript-row"
                data-active={on}
                onClick={() => onSeek(phrase)}
              >
                <span className="font-mono text-[10px] text-[var(--sw-muted)]">{phrase.start.toFixed(1)}s</span>
                <span>{phrase.text}</span>
                {phrase.speaker ? <small>{phrase.speaker}</small> : null}
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
