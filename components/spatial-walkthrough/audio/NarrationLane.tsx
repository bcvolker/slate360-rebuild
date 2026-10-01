"use client";

import { narrationBands, type NarrationSegment } from "@/lib/spatial-walkthrough/audio";

type Props = {
  segments: NarrationSegment[];
  clipId: string;
  duration: number;
  activeId: string | null;
  authoring?: boolean;
  onSelect?: (id: string) => void;
  onDrag?: (id: string, deltaS: number) => void;
};

export function NarrationLane({ segments, clipId, duration, activeId, authoring, onSelect, onDrag }: Props) {
  const bands = narrationBands(segments, clipId, duration, activeId);
  if (!bands.length) return null;
  return (
    <div className="sw-narration-lane" data-testid="sw-narration-lane" aria-label="Narration segments">
      {bands.map((b) => (
        <button
          key={b.id}
          type="button"
          className="sw-narration-band"
          data-active={b.active}
          style={{ left: `${b.startPct}%`, width: `${b.widthPct}%` }}
          title={b.title}
          onClick={() => onSelect?.(b.id)}
          onPointerDown={(e) => {
            if (!authoring || !onDrag) return;
            const startX = e.clientX;
            const track = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
            const move = (ev: PointerEvent) => {
              const deltaPct = (ev.clientX - startX) / Math.max(1, track.width);
              onDrag(b.id, deltaPct * duration);
            };
            const up = () => {
              window.removeEventListener("pointermove", move);
              window.removeEventListener("pointerup", up);
            };
            window.addEventListener("pointermove", move);
            window.addEventListener("pointerup", up);
          }}
        >
          <span>{b.title}</span>
        </button>
      ))}
    </div>
  );
}
