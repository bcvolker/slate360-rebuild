"use client";

import { useCallback, type PointerEvent } from "react";
import { PreviewSphere } from "@/components/spatial-walkthrough/viewer/PreviewSphere";
import { formatCaptureDate } from "@/lib/spatial-walkthrough/compare-dates";
import type { CompareLocator } from "@/lib/spatial-walkthrough/compare-locator";
import { PREVIEW_PATCH, PREVIEW_THEME } from "@/lib/spatial-walkthrough/compare-preview-fixtures";
import type { PinType, WaypointRecord } from "@/lib/spatial-walkthrough/types";

type Pin = { id: string; label: string; pinType: PinType | string; yawDeg: number; pitchDeg: number };

type Props = {
  side: "before" | "after";
  title: string;
  capturedAt: string;
  locator: CompareLocator;
  waypoints: WaypointRecord[];
  pins: Pin[];
  onLook?: (yawDeg: number, pitchDeg: number) => void;
};

export function ComparePane({ side, title, capturedAt, locator, waypoints, pins, onLook }: Props) {
  const onPointerDown = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (!onLook) return;
    const origin = event.currentTarget;
    const startX = event.clientX;
    const startY = event.clientY;
    const startYaw = locator.yawDeg;
    const startPitch = locator.pitchDeg;
    origin.setPointerCapture(event.pointerId);
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      onLook(startYaw + dx * 0.18, Math.max(-80, Math.min(80, startPitch - dy * 0.12)));
    };
    const up = () => {
      origin.removeEventListener("pointermove", move as never);
      origin.removeEventListener("pointerup", up);
    };
    origin.addEventListener("pointermove", move as never);
    origin.addEventListener("pointerup", up);
  }, [locator.pitchDeg, locator.yawDeg, onLook]);

  return (
    <div className="sw-compare-pane" data-side={side} onPointerDown={onPointerDown}>
      <p className="sw-compare-date">{side === "before" ? "Before" : "After"} · {formatCaptureDate(capturedAt)}</p>
      <div
        className="sw-compare-look"
        style={{ transform: `translate(${-locator.yawDeg * 0.42}%, ${locator.pitchDeg * 0.22}%)` }}
      >
        <PreviewSphere
          theme={PREVIEW_THEME}
          title={title}
          capturedAt={capturedAt}
          waypoints={waypoints}
          pins={pins}
          operatorPatch={{ ...PREVIEW_PATCH, enabled: false }}
          clipId={locator.clipId}
          currentT={locator.tSeconds}
        />
      </div>
    </div>
  );
}
