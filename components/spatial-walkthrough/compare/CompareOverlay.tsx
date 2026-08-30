"use client";

import { ComparePane } from "./ComparePane";
import { APPROXIMATE_COPY, type OverlayGate } from "@/lib/spatial-walkthrough/compare-overlay";
import type { CaptureDate } from "@/lib/spatial-walkthrough/compare-dates";
import type { CompareLocator } from "@/lib/spatial-walkthrough/compare-locator";
import type { PinType, WaypointRecord } from "@/lib/spatial-walkthrough/types";

type Pin = { id: string; label: string; pinType: PinType | string; yawDeg: number; pitchDeg: number };
type Side = { capture: CaptureDate; locator: CompareLocator; waypoints: WaypointRecord[]; pins: Pin[] };

type Props = {
  before: Side;
  after: Side;
  opacity: number;
  gate: OverlayGate;
  onBeforeLook: (yawDeg: number, pitchDeg: number) => void;
};

export function CompareOverlay({ before, after, opacity, gate, onBeforeLook }: Props) {
  return (
    <div className="sw-compare-overlay" style={{ "--sw-overlay": gate.enabled ? String(opacity) : "0" } as never}>
      <ComparePane side="before" title={before.capture.title} capturedAt={before.capture.capturedAt} locator={before.locator} waypoints={before.waypoints} pins={before.pins} onLook={onBeforeLook} />
      {gate.enabled ? (
        <div className="sw-compare-overlay-after">
          <ComparePane side="after" title={after.capture.title} capturedAt={after.capture.capturedAt} locator={after.locator} waypoints={after.waypoints} pins={after.pins} />
        </div>
      ) : (
        <div className="sw-compare-locked">
          <p>Overlay needs a Compare Anchor and a close time / heading match. Heading is linked by authored locators, not a shared world frame.</p>
        </div>
      )}
      <p className="sw-compare-approx">{APPROXIMATE_COPY}</p>
    </div>
  );
}
