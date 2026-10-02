"use client";

import { useEffect, useRef, useState } from "react";
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
  const ref = useRef<HTMLDivElement>(null);
  const [vec, setVec] = useState<StickVector>({ x: 0, y: 0 });
  const onVectorRef = useRef(onVector);
  const onActiveRef = useRef(onActive);
  onVectorRef.current = onVector;
  onActiveRef.current = onActive;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let dragging = false;
    let originX = 0;
    let originY = 0;
    const publish = (next: StickVector) => {
      setVec(next);
      onVectorRef.current(next);
    };
    const down = (e: PointerEvent) => {
      e.stopPropagation();
      e.preventDefault();
      dragging = true;
      originX = e.clientX;
      originY = e.clientY;
      el.setPointerCapture(e.pointerId);
      onActiveRef.current(true);
    };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      e.stopPropagation();
      publish(stickFromPointer(e.clientX - originX, e.clientY - originY, TRAVEL_PX));
    };
    const up = (e: PointerEvent) => {
      if (!dragging) return;
      e.stopPropagation();
      dragging = false;
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
      publish({ x: 0, y: 0 });
      onActiveRef.current(false);
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
  }, []);

  return (
    <div
      ref={ref}
      className="sw-joy-stick"
      data-side={side}
      data-testid={testId}
      role={side === "left" ? "slider" : "group"}
      aria-label={label}
      aria-valuemin={side === "left" ? -1 : undefined}
      aria-valuemax={side === "left" ? 1 : undefined}
      aria-valuenow={side === "left" ? Number(vec.x.toFixed(2)) : undefined}
      aria-orientation={side === "left" ? "horizontal" : undefined}
    >
      <span className="sw-joy-label">{label}</span>
      <span
        className="sw-joy-knob"
        style={{ transform: `translate(${vec.x * TRAVEL_PX}px, ${vec.y * TRAVEL_PX}px)` }}
      />
    </div>
  );
}
