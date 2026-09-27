"use client";

import { useEffect, useRef } from "react";
import type { WalkInput } from "@/components/room213/walk-input";

/*
 * Movement math adapted from Spark's mobile-joystick example
 * (github.com/sparkjsdev/spark/tree/main/examples/mobile-joystick) — MIT License,
 * Copyright (c) 2025 World Labs Technologies, Inc. Offset is clamped to the pad radius, normalised to -1..1 and a
 * per-axis deadzone applied. Rewritten as a React pad that writes a ref (no per-move React state).
 */
const SIZE = 120;
const KNOB = 50;
const DEADZONE = 0.15;
const RADIUS = (SIZE - KNOB) / 2;

export function WalkJoystick({ input, onActivity }: { input: WalkInput; onActivity: () => void }) {
  const knob = useRef<HTMLDivElement>(null);
  const pad = useRef<HTMLDivElement>(null);
  const pointer = useRef<number | null>(null);

  useEffect(() => {
    const el = pad.current;
    if (!el) return;
    const center = () => {
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    };
    const release = () => {
      pointer.current = null;
      input.stick.x = 0;
      input.stick.y = 0;
      input.stick.active = false;
      if (knob.current) knob.current.style.transform = "translate(-50%, -50%)";
    };
    const moveTo = (cx: number, cy: number) => {
      const c = center();
      let dx = cx - c.x;
      let dy = cy - c.y;
      const d = Math.hypot(dx, dy);
      if (d > RADIUS) {
        dx = (dx / d) * RADIUS;
        dy = (dy / d) * RADIUS;
      }
      let nx = dx / RADIUS;
      let ny = dy / RADIUS;
      if (Math.abs(nx) < DEADZONE) nx = 0;
      if (Math.abs(ny) < DEADZONE) ny = 0;
      input.stick.x = nx;
      input.stick.y = -ny; // screen up = forward
      if (knob.current) knob.current.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    };
    const down = (e: PointerEvent) => {
      if (pointer.current !== null) return;
      e.preventDefault();
      e.stopPropagation();
      pointer.current = e.pointerId;
      el.setPointerCapture(e.pointerId);
      input.stick.active = true;
      moveTo(e.clientX, e.clientY);
      onActivity();
    };
    const move = (e: PointerEvent) => {
      if (e.pointerId !== pointer.current) return;
      e.preventDefault();
      moveTo(e.clientX, e.clientY);
    };
    const up = (e: PointerEvent) => {
      if (e.pointerId === pointer.current) release();
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("lostpointercapture", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      el.removeEventListener("lostpointercapture", up);
      release();
    };
  }, [input, onActivity]);

  return (
    <div
      ref={pad}
      aria-label="Move"
      role="application"
      className="absolute z-30 rounded-[40px] border border-[color-mix(in_srgb,var(--mkt-surface)_45%,transparent)] bg-[color-mix(in_srgb,var(--graphite-canvas)_28%,transparent)] backdrop-blur-[2px]"
      style={{
        width: SIZE,
        height: SIZE,
        left: "max(1.25rem, calc(env(safe-area-inset-left) + 0.75rem))",
        bottom: "max(1.25rem, calc(env(safe-area-inset-bottom) + 0.75rem))",
        touchAction: "none",
      }}
    >
      <div
        ref={knob}
        className="pointer-events-none absolute left-1/2 top-1/2 rounded-[18px] bg-[color-mix(in_srgb,var(--mkt-surface)_70%,transparent)]"
        style={{ width: KNOB, height: KNOB, transform: "translate(-50%, -50%)" }}
      />
    </div>
  );
}
