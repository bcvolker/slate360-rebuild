"use client";

import { useRef } from "react";
import { ComparePane } from "./ComparePane";
import { APPROXIMATE_COPY } from "@/lib/spatial-walkthrough/compare-overlay";
import type { CaptureDate } from "@/lib/spatial-walkthrough/compare-dates";
import type { CompareLocator } from "@/lib/spatial-walkthrough/compare-locator";
import type { PinType, WaypointRecord } from "@/lib/spatial-walkthrough/types";

type Pin = { id: string; label: string; pinType: PinType | string; yawDeg: number; pitchDeg: number };
type Side = { capture: CaptureDate; locator: CompareLocator; waypoints: WaypointRecord[]; pins: Pin[] };

type Props = {
  before: Side;
  after: Side;
  showingAfter: boolean;
  onShowingAfter: (value: boolean) => void;
  onBeforeLook: (yawDeg: number, pitchDeg: number) => void;
};

export function CompareFlip({ before, after, showingAfter, onShowingAfter, onBeforeLook }: Props) {
  const hold = useRef<number | null>(null);
  const held = useRef(false);
  const origin = useRef(showingAfter);
  const side = showingAfter ? after : before;
  const label = showingAfter ? "after" : "before";
  return (
    <div
      className="sw-compare-swipe"
      onPointerDown={() => {
        origin.current = showingAfter;
        held.current = false;
        hold.current = window.setTimeout(() => {
          held.current = true;
          onShowingAfter(!origin.current);
        }, 280);
      }}
      onPointerUp={() => {
        if (hold.current) {
          window.clearTimeout(hold.current);
          hold.current = null;
        }
        if (held.current) {
          held.current = false;
          onShowingAfter(origin.current);
        } else {
          onShowingAfter(!origin.current);
        }
      }}
      onPointerLeave={() => {
        if (hold.current) {
          window.clearTimeout(hold.current);
          hold.current = null;
        }
        if (held.current) {
          held.current = false;
          onShowingAfter(origin.current);
        }
      }}
    >
      <ComparePane
        side={label}
        title={side.capture.title}
        capturedAt={side.capture.capturedAt}
        locator={side.locator}
        waypoints={side.waypoints}
        pins={side.pins}
        onLook={onBeforeLook}
      />
      <p className="sw-compare-approx">{APPROXIMATE_COPY} · Tap to flip · hold to peek</p>
    </div>
  );
}
