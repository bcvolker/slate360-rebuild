"use client";

import type { WalkthroughPlayerHandle } from "@/components/spatial-walkthrough/viewer/WalkthroughPlayer";
import type { OperatorKeyframe } from "@/lib/spatial-walkthrough/keyframes";
import { skipIntervals, type RedactionRule } from "@/lib/spatial-walkthrough/redaction";

function clock(t: number): string {
  const s = Math.max(0, t);
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

export function StudioTransport({
  player,
  currentT,
  duration,
  playing,
  clipId,
  keyframes,
  redactions,
  selectedT,
  onSelectKey,
}: {
  player: WalkthroughPlayerHandle | null;
  currentT: number;
  duration: number;
  playing: boolean;
  clipId: string;
  keyframes: OperatorKeyframe[];
  redactions: RedactionRule[];
  selectedT: number | null;
  onSelectKey: (t: number) => void;
}) {
  const skips = skipIntervals(redactions, clipId);
  const max = Math.max(duration, 0.1);
  return (
    <div className="sw-studio-timeline" data-testid="sw-studio-transport">
      <div className="flex h-full items-center gap-3">
        <button
          type="button"
          className="inline-flex h-11 min-w-11 items-center justify-center border border-white/20 text-sm"
          onClick={() => (playing ? player?.pause() : player?.play())}
        >
          {playing ? "Pause" : "Play"}
        </button>
        <p className="w-24 shrink-0 text-sm tabular-nums">{clock(currentT)} / {clock(duration)}</p>
        <div className="relative min-w-0 flex-1">
          <div className="pointer-events-none absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 bg-white/10">
            {skips.map((s) => (
              <span
                key={`${s.start}-${s.end}`}
                className="absolute top-0 h-full bg-[repeating-linear-gradient(45deg,transparent,transparent_3px,rgba(255,255,255,0.35)_3px,rgba(255,255,255,0.35)_6px)]"
                style={{ left: `${(s.start / max) * 100}%`, width: `${((s.end - s.start) / max) * 100}%` }}
              />
            ))}
          </div>
          {keyframes.map((k) => (
            <button
              key={k.t}
              type="button"
              aria-label={`Privacy key ${clock(k.t)}`}
              className="absolute top-1/2 z-10 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 border border-white"
              data-on={selectedT != null && Math.abs(selectedT - k.t) < 0.06 ? "true" : "false"}
              style={{ left: `${(k.t / max) * 100}%`, background: selectedT != null && Math.abs(selectedT - k.t) < 0.06 ? "var(--graphite-primary)" : "white" }}
              onClick={() => {
                onSelectKey(k.t);
                player?.seekTo(k.t, k.yawCenter, (k.pitchTop + k.pitchBottom) / 2, { pause: true });
              }}
            />
          ))}
          <input
            type="range"
            className="relative z-20 h-11 w-full opacity-70"
            min={0}
            max={max}
            step={0.05}
            value={currentT}
            aria-label="Studio playhead"
            onPointerDown={() => player?.pause()}
            onChange={(e) => player?.seekTo(Number(e.target.value), undefined, undefined, { pause: false })}
          />
        </div>
      </div>
    </div>
  );
}
