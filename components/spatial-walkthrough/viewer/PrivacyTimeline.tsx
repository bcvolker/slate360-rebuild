"use client";

import type { RedactionMode } from "@/lib/spatial-walkthrough/types";

type Mark = { start: number; end: number; mode: RedactionMode };

type Props = {
  duration: number;
  marks: Mark[];
};

export function PrivacyTimeline({ duration, marks }: Props) {
  if (!(duration > 0) || marks.length === 0) return null;
  return (
    <div className="pointer-events-none relative h-2 w-full overflow-hidden border border-white/10 bg-black/40" aria-label="Excluded ranges">
      {marks.map((m, i) => {
        const left = `${(m.start / duration) * 100}%`;
        const width = `${((m.end - m.start) / duration) * 100}%`;
        const tone = m.mode === "skip" ? "bg-[var(--graphite-primary)]/70" : "bg-white/50";
        return (
          <span
            key={`${m.mode}-${i}`}
            className={`absolute inset-y-0 ${tone}`}
            style={{ left, width }}
            title={`${m.mode} ${m.start.toFixed(0)}s–${m.end.toFixed(0)}s`}
          />
        );
      })}
    </div>
  );
}
