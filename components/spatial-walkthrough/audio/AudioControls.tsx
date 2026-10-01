"use client";

import { mixVolumes } from "@/lib/spatial-walkthrough/audio";

type Props = {
  sourceMuted: boolean;
  duckSource: boolean;
  sourceVolume: number;
  narrationActive: boolean;
  onSourceMuted: (v: boolean) => void;
  onDuckSource: (v: boolean) => void;
  onSourceVolume: (v: number) => void;
  onOpenTranscript: () => void;
};

export function AudioControls({
  sourceMuted,
  duckSource,
  sourceVolume,
  narrationActive,
  onSourceMuted,
  onDuckSource,
  onSourceVolume,
  onOpenTranscript,
}: Props) {
  const mix = mixVolumes({
    sourceVolume,
    narrationVolume: 1,
    duckSource,
    narrationActive,
  });
  return (
    <div className="sw-audio-controls" data-testid="sw-audio-controls">
      <label className="sw-audio-check">
        <input type="checkbox" checked={!sourceMuted} onChange={(e) => onSourceMuted(!e.target.checked)} />
        Source
      </label>
      <label className="sw-audio-check">
        <input type="checkbox" checked={duckSource} onChange={(e) => onDuckSource(e.target.checked)} />
        Duck
      </label>
      <label className="sw-audio-vol">
        <span>Src {Math.round(mix.source * 100)}</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={sourceVolume}
          onChange={(e) => onSourceVolume(Number(e.target.value))}
        />
      </label>
      <button type="button" className="sw-chrome-btn" onClick={onOpenTranscript}>
        Transcript
      </button>
    </div>
  );
}
