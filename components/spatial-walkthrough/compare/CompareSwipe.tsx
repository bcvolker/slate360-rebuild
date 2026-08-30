"use client";

import { useCallback, type PointerEvent } from "react";
import { ComparePane } from "./ComparePane";
import type { CaptureDate } from "@/lib/spatial-walkthrough/compare-dates";
import type { CompareLocator } from "@/lib/spatial-walkthrough/compare-locator";
import type { PinType, WaypointRecord } from "@/lib/spatial-walkthrough/types";

type Pin = { id: string; label: string; pinType: PinType | string; yawDeg: number; pitchDeg: number };

type Side = { capture: CaptureDate; locator: CompareLocator; waypoints: WaypointRecord[]; pins: Pin[] };

type Props = {
  before: Side;
  after: Side;
  percent: number;
  onPercent: (value: number) => void;
  onBeforeLook: (yawDeg: number, pitchDeg: number) => void;
};

export function CompareSwipe({ before, after, percent, onPercent, onBeforeLook }: Props) {
  const onPointerDown = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const track = event.currentTarget.parentElement;
    if (!track) return;
    const move = (ev: PointerEvent | PointerEventInit) => {
      const box = track.getBoundingClientRect();
      const x = Number(ev.clientX ?? 0);
      onPercent(Math.min(92, Math.max(8, ((x - box.left) / box.width) * 100)));
    };
    move(event);
    const up = () => {
      window.removeEventListener("pointermove", move as never);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move as never);
    window.addEventListener("pointerup", up);
  }, [onPercent]);

  return (
    <div className="sw-compare-swipe" style={{ "--sw-swipe": `${percent}%` } as never}>
      <ComparePane side="before" title={before.capture.title} capturedAt={before.capture.capturedAt} locator={before.locator} waypoints={before.waypoints} pins={before.pins} onLook={onBeforeLook} />
      <div className="sw-compare-swipe-after">
        <ComparePane side="after" title={after.capture.title} capturedAt={after.capture.capturedAt} locator={after.locator} waypoints={after.waypoints} pins={after.pins} />
      </div>
      <div
        className="sw-compare-divider"
        role="slider"
        aria-label="Before after divider"
        aria-valuemin={8}
        aria-valuemax={92}
        aria-valuenow={Math.round(percent)}
        onPointerDown={onPointerDown}
      />
    </div>
  );
}
