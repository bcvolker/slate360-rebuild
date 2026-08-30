"use client";

import type { CSSProperties } from "react";
import type { OperatorKeyframe } from "@/lib/spatial-walkthrough/keyframes";
import { wrapYaw } from "@/lib/spatial-walkthrough/redaction";
import type { WalkthroughPlayerHandle } from "@/components/spatial-walkthrough/viewer/WalkthroughPlayer";

type Props = {
  frame: OperatorKeyframe | null;
  player: WalkthroughPlayerHandle | null;
  onChange: (partial: Partial<OperatorKeyframe>) => void;
  review?: boolean;
};

export function OperatorMaskOverlay({ frame, player, onChange, review }: Props) {
  if (!frame) return null;
  const yawPct = ((wrapYaw(frame.yawCenter) + 180) / 360) * 100;
  const widthPct = (frame.yawWidth / 360) * 100;
  const topPct = ((90 - frame.pitchTop) / 180) * 100;
  const heightPct = ((frame.pitchTop - frame.pitchBottom) / 180) * 100;

  const fromPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mapped = player?.viewerToSphere?.(e.clientX - rect.left, e.clientY - rect.top);
    if (mapped) return mapped;
    const yaw = (e.clientX - rect.left) / rect.width * 360 - 180;
    const pitch = 90 - (e.clientY - rect.top) / rect.height * 180;
    return { yaw, pitch };
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-10" aria-hidden={false}>
      <div
        className={`pointer-events-auto absolute border bg-[color-mix(in_srgb,var(--graphite-primary)_12%,transparent)] ${review ? "border-[var(--graphite-primary)]" : "border-[color-mix(in_srgb,var(--graphite-primary)_55%,transparent)]"}`}
        style={{
          left: `${yawPct - widthPct / 2}%`,
          width: `${widthPct}%`,
          top: `${topPct}%`,
          height: `${Math.max(heightPct, 4)}%`,
        } as CSSProperties}
        onPointerDown={(e) => {
          e.preventDefault();
          const start = fromPointer(e);
          const origin = { yaw: frame.yawCenter, top: frame.pitchTop, bottom: frame.pitchBottom };
          const move = (ev: PointerEvent) => {
            const now = player?.viewerToSphere?.(ev.clientX, ev.clientY) ?? {
              yaw: origin.yaw + (ev.clientX - e.clientX) * 0.25,
              pitch: origin.top - (ev.clientY - e.clientY) * 0.15,
            };
            onChange({ yawCenter: wrapYaw(origin.yaw + (now.yaw - start.yaw)) });
          };
          const up = () => {
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", up);
          };
          window.addEventListener("pointermove", move);
          window.addEventListener("pointerup", up);
        }}
      >
        <button type="button" className="absolute left-0 top-1/2 h-8 w-2 -translate-y-1/2 bg-[var(--graphite-primary)]" aria-label="Resize yaw" onPointerDown={(e) => resizeYaw(e, -1, frame, onChange)} />
        <button type="button" className="absolute right-0 top-1/2 h-8 w-2 -translate-y-1/2 bg-[var(--graphite-primary)]" aria-label="Resize yaw" onPointerDown={(e) => resizeYaw(e, 1, frame, onChange)} />
        <button type="button" className="absolute inset-x-4 top-0 h-2 bg-[var(--graphite-primary)]" aria-label="Resize pitch top" onPointerDown={(e) => resizePitch(e, "top", frame, onChange)} />
        <button type="button" className="absolute inset-x-4 bottom-0 h-2 bg-[var(--graphite-primary)]" aria-label="Resize pitch bottom" onPointerDown={(e) => resizePitch(e, "bottom", frame, onChange)} />
      </div>
    </div>
  );
}

function resizeYaw(e: React.PointerEvent, dir: 1 | -1, frame: OperatorKeyframe, onChange: (p: Partial<OperatorKeyframe>) => void) {
  e.stopPropagation();
  const startX = e.clientX;
  const origin = frame.yawWidth;
  const move = (ev: PointerEvent) => onChange({ yawWidth: Math.min(180, Math.max(8, origin + dir * (ev.clientX - startX) * 0.4)) });
  const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
}

function resizePitch(e: React.PointerEvent, edge: "top" | "bottom", frame: OperatorKeyframe, onChange: (p: Partial<OperatorKeyframe>) => void) {
  e.stopPropagation();
  const startY = e.clientY;
  const origin = edge === "top" ? frame.pitchTop : frame.pitchBottom;
  const move = (ev: PointerEvent) => {
    const next = origin - (ev.clientY - startY) * 0.2;
    if (edge === "top") onChange({ pitchTop: Math.min(40, Math.max(frame.pitchBottom + 4, next)) });
    else onChange({ pitchBottom: Math.max(-90, Math.min(frame.pitchTop - 4, next)) });
  };
  const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
}
