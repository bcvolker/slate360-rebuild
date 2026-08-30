"use client";

import type { TimelineRange } from "@/lib/spatial-walkthrough/timeline-model";
import type { OperatorKeyframe } from "@/lib/spatial-walkthrough/keyframes";
import type { WaypointRecord } from "@/lib/spatial-walkthrough/types";
import type { StudioTimelineApi } from "./useStudioTimeline";

type PinMark = { id: string; tSeconds: number | null; label: string };

type Props = {
  duration: number;
  api: StudioTimelineApi;
  videoLabel: string;
  chapters: TimelineRange[];
  privacy: TimelineRange[];
  skips: TimelineRange[];
  waypoints: WaypointRecord[];
  pins: PinMark[];
  keyframes: OperatorKeyframe[];
  playhead: number;
  onSeek: (t: number) => void;
  onResize?: (id: string, edge: "start" | "end", t: number) => void;
  onSelect?: (id: string) => void;
};

const TRACKS: Array<{ id: string; label: string; narration?: boolean }> = [
  { id: "video", label: "Video" },
  { id: "chapters", label: "Spaces" },
  { id: "privacy", label: "Privacy" },
  { id: "skip", label: "Skip" },
  { id: "waypoints", label: "Waypoints" },
  { id: "pins", label: "Pins" },
  { id: "narration", label: "Narration", narration: true },
];

export function TimelineTracks({
  duration, api, videoLabel, chapters, privacy, skips, waypoints, pins, keyframes, playhead, onSeek, onResize, onSelect,
}: Props) {
  const ranges: Record<string, TimelineRange[]> = {
    chapters,
    privacy,
    skip: skips,
  };
  const ticks = [];
  for (let s = 0; s <= duration; s += duration > 120 ? 10 : 5) ticks.push(s);

  const onLaneClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    onSeek(api.tOf(e.clientX - rect.left));
  };

  return (
    <div className="sw-tl-body" style={{ width: api.width }}>
      <div className="sw-tl-row sw-tl-ruler">
        <span className="sw-tl-label">Time</span>
        <div className="sw-tl-lane" onClick={onLaneClick}>
          {ticks.map((s) => (
            <span key={s} style={{ left: api.xOf(s) }}>{fmt(s)}</span>
          ))}
        </div>
      </div>
      {TRACKS.map((track) => (
        <div key={track.id} className={`sw-tl-row${track.narration ? " sw-tl-narration" : ""}`} data-track={track.id}>
          <span className="sw-tl-label">{track.label}</span>
          <div className="sw-tl-lane" onClick={onLaneClick}>
            {track.id === "video" ? (
              <span className="sw-tl-block" style={{ left: 0, width: api.width }} title={videoLabel}>{videoLabel}</span>
            ) : null}
            {(ranges[track.id] ?? []).map((r) => (
              <RangeBlock key={r.id} range={r} api={api} selected={api.selectedId === r.id} onResize={onResize} onSelect={onSelect} />
            ))}
            {track.id === "waypoints"
              ? waypoints.map((w) => <span key={w.id} className="sw-tl-mark" style={{ left: api.xOf(w.tSeconds) }} title={w.label ?? "Waypoint"} />)
              : null}
            {track.id === "pins"
              ? pins.filter((p) => p.tSeconds != null).map((p) => (
                <span key={p.id} className="sw-tl-mark" style={{ left: api.xOf(p.tSeconds ?? 0) }} title={p.label} />
              ))
              : null}
            {track.id === "privacy"
              ? keyframes.map((k) => <span key={`kf-${k.t}`} className="sw-tl-kf" style={{ left: api.xOf(k.t) }} title={`Keyframe ${k.t.toFixed(1)}s`} />)
              : null}
            {track.id === "narration" ? <span className="sw-tl-block" style={{ left: 0, width: api.width }}>Placeholder — not recorded</span> : null}
          </div>
        </div>
      ))}
      <div className="sw-tl-playhead" style={{ ["--x" as string]: `${api.xOf(playhead)}px` }} />
    </div>
  );
}

function RangeBlock({
  range, api, selected, onResize, onSelect,
}: {
  range: TimelineRange;
  api: StudioTimelineApi;
  selected: boolean;
  onResize?: (id: string, edge: "start" | "end", t: number) => void;
  onSelect?: (id: string) => void;
}) {
  const left = api.xOf(range.start);
  const width = Math.max(8, api.xOf(range.end) - left);
  return (
    <span
      className="sw-tl-block"
      data-p={range.policy ?? "client"}
      data-on={selected}
      style={{ left, width }}
      title={`${range.label} ${range.start.toFixed(1)}–${range.end.toFixed(1)}s`}
      onClick={(e) => { e.stopPropagation(); onSelect?.(range.id); }}
    >
      {range.label}
      <i
        className="sw-tl-handle"
        data-edge="start"
        onPointerDown={(e) => dragEdge(e, "start", range, api, onResize)}
      />
      <i
        className="sw-tl-handle"
        data-edge="end"
        onPointerDown={(e) => dragEdge(e, "end", range, api, onResize)}
      />
    </span>
  );
}

function dragEdge(
  e: React.PointerEvent,
  edge: "start" | "end",
  range: TimelineRange,
  api: StudioTimelineApi,
  onResize?: (id: string, edge: "start" | "end", t: number) => void,
) {
  e.stopPropagation();
  e.preventDefault();
  const startX = e.clientX;
  const origin = edge === "start" ? range.start : range.end;
  const move = (ev: PointerEvent) => {
    const dt = (ev.clientX - startX) / Math.max(api.pxPerSec, 1);
    onResize?.(range.id, edge, origin + dt);
  };
  const up = () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
}

function fmt(s: number): string {
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${String(r).padStart(2, "0")}`;
}
