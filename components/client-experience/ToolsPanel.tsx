"use client";

import { clampPathOpacity } from "@/lib/client-experience/layout";

type Props = {
  pathVisible: boolean;
  pathOpacity: number;
  onPathVisible: (v: boolean) => void;
  onPathOpacity: (v: number) => void;
  playbackRate?: number;
  onPlaybackRate?: (rate: number) => void;
  children?: React.ReactNode;
};

/** Viewer tools: Show Path, Path Opacity, playback speed. Persisted by the experience. */
export function ToolsPanel({ pathVisible, pathOpacity, onPathVisible, onPathOpacity, playbackRate, onPlaybackRate, children }: Props) {
  return (
    <div className="ce-item" data-testid="ce-tools">
      <section>
        <h3 className="ce-h2" style={{ marginBottom: 10 }}>Route</h3>
        <label className="ce-row" style={{ cursor: "pointer" }}>
          <div><div className="ce-row__title">Show path</div><div className="ce-row__sub">A few upcoming route markers on the floor ahead of you.</div></div>
          <input type="checkbox" role="switch" checked={pathVisible} onChange={(e) => onPathVisible(e.target.checked)} aria-label="Show path" style={{ width: 20, height: 20, accentColor: "var(--ce-accent)" }} data-testid="ce-path-toggle" />
        </label>
        <div className="ce-row" style={{ gridTemplateColumns: "1fr 140px" }}>
          <div><div className="ce-row__title">Path opacity</div><div className="ce-row__sub">{Math.round(pathOpacity * 100)}%</div></div>
          <input type="range" min={15} max={45} step={1} value={Math.round(pathOpacity * 100)} disabled={!pathVisible} onChange={(e) => onPathOpacity(clampPathOpacity(Number(e.target.value) / 100))} aria-label="Path opacity" className="ce-scrub" style={{ width: 140 }} />
        </div>
      </section>
      {onPlaybackRate ? (
        <section>
          <h3 className="ce-h2" style={{ marginBottom: 10 }}>Play speed</h3>
          <div className="ce-seg" role="group" aria-label="Playback speed">
            {[1, 1.5, 2].map((r) => (
              <button key={r} type="button" className="ce-seg__btn" aria-pressed={playbackRate === r} onClick={() => onPlaybackRate(r)}>{r}×</button>
            ))}
          </div>
        </section>
      ) : null}
      {children}
    </div>
  );
}
