"use client";

import type { OperatorKeyframe } from "@/lib/spatial-walkthrough/keyframes";
import { contactStripSamples, jumpPrivacy, nextReviewRate, type ReviewRate } from "@/lib/spatial-walkthrough/privacy-review";
import type { RedactionRule } from "@/lib/spatial-walkthrough/redaction";

type Props = {
  duration: number;
  playhead: number;
  rate: ReviewRate;
  frames: OperatorKeyframe[];
  rules: RedactionRule[];
  onRate: (r: ReviewRate) => void;
  onSeek: (t: number) => void;
};

export function PrivacyReviewBar({ duration, playhead, rate, frames, rules, onRate, onSeek }: Props) {
  const samples = contactStripSamples(frames, duration, Math.max(2, duration / 24));
  return (
    <section className="space-y-2 border border-white/10 bg-white/[0.04] p-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--graphite-muted)]">Privacy review</p>
        <button type="button" className="h-9 border border-white/10 px-3 text-sm" onClick={() => onRate(nextReviewRate(rate))}>
          {rate}×
        </button>
        <button type="button" className="h-9 border border-white/10 px-3 text-sm" onClick={() => { const t = jumpPrivacy("prev", playhead, frames, rules); if (t != null) onSeek(t); }}>
          Prev boundary
        </button>
        <button type="button" className="h-9 border border-white/10 px-3 text-sm" onClick={() => { const t = jumpPrivacy("next", playhead, frames, rules); if (t != null) onSeek(t); }}>
          Next boundary
        </button>
      </div>
      <div className="flex gap-1 overflow-x-auto" aria-label="Operator sector contact strip">
        {samples.map((s) => (
          <button
            key={s.t}
            type="button"
            className="h-12 w-10 shrink-0 border border-white/10"
            title={`${s.t.toFixed(0)}s · yaw ${s.yawCenter.toFixed(0)} ±${(s.yawWidth / 2).toFixed(0)}`}
            onClick={() => onSeek(s.t)}
            style={{
              background: `linear-gradient(180deg, transparent ${(90 - s.pitchTop) / 180 * 100}%, color-mix(in srgb, var(--graphite-primary) 35%, transparent) ${(90 - s.pitchBottom) / 180 * 100}%)`,
            }}
          />
        ))}
      </div>
    </section>
  );
}
