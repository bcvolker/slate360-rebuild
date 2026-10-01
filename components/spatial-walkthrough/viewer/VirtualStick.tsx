"use client";

import { useRef, useState } from "react";
import { stickFromPointer, type StickVector } from "@/lib/spatial-walkthrough/joystick-map";

const TRAVEL_PX = 36;

type Props = {
  label: string;
  testId: string;
  side: "left" | "right";
  onVector: (vector: StickVector) => void;
  onActive: (active: boolean) => void;
};

export function VirtualStick({ label, testId, side, onVector, onActive }: Props) {
  const [vec, setVec] = useState<StickVector>({ x: 0, y: 0 });
  const origin = useRef({ x: 0, y: 0 });
  const dragging = useRef(false);

  const publish = (next: StickVector) => {
    setVec(next);
    onVector(next);
  };

  const end = (el: HTMLElement, pointerId: number) => {
    if (!dragging.current) return;
    dragging.current = false;
    if (el.hasPointerCapture(pointerId)) el.releasePointerCapture(pointerId);
    publish({ x: 0, y: 0 });
    onActive(false);
  };

  return (
    <div
      className="sw-joy-stick"
      data-side={side}
      data-testid={testId}
      role={side === "left" ? "slider" : "group"}
      aria-label={label}
      aria-valuemin={side === "left" ? -1 : undefined}
      aria-valuemax={side === "left" ? 1 : undefined}
      aria-valuenow={side === "left" ? Number(vec.x.toFixed(2)) : undefined}
      aria-orientation={side === "left" ? "horizontal" : undefined}
      onPointerDown={(e) => {
        e.stopPropagation();
        e.preventDefault();
        dragging.current = true;
        origin.current = { x: e.clientX, y: e.clientY };
        e.currentTarget.setPointerCapture(e.pointerId);
        onActive(true);
      }}
      onPointerMove={(e) => {
        if (!dragging.current) return;
        e.stopPropagation();
        publish(stickFromPointer(e.clientX - origin.current.x, e.clientY - origin.current.y, TRAVEL_PX));
      }}
      onPointerUp={(e) => {
        e.stopPropagation();
        end(e.currentTarget, e.pointerId);
      }}
      onPointerCancel={(e) => {
        e.stopPropagation();
        end(e.currentTarget, e.pointerId);
      }}
    >
      <span className="sw-joy-label">{label}</span>
      <span
        className="sw-joy-knob"
        style={{ transform: `translate(${vec.x * TRAVEL_PX}px, ${vec.y * TRAVEL_PX}px)` }}
      />
    </div>
  );
}
