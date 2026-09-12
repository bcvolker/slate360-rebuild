"use client";

import { X } from "lucide-react";

const ROWS: [string, string][] = [
  ["Camera", "Insta360 X4 / X5 or Ricoh Theta. Shoot 360 video, not flat/single-lens."],
  ["Lighting", "Every light on, blinds open, daytime if possible. Target mean brightness >= 100/255, < 5% deep shadow."],
  ["Exposure", "Lock exposure and white balance on a mid-tone. Shutter ~1/250s if light allows. Auto-exposure flicker destabilizes training."],
  ["Resolution", "8K 30fps when the room is bright. If still dim, prefer 5.7K 60fps or interval stills over a blurry 8K walk — blur hurts more than missing pixels."],
  ["Stabilization", "Export equirectangular. Turn off FlowState, horizon lock, and tilt recovery — they warp geometry COLMAP needs."],
  ["Pace", "Walk at museum tempo (0.3-0.7 m/s). Wide arcs at corners. No pivots, no jerks."],
  ["Path", "High pass (head height) then low pass (hip). Loop back to the start. Stay 0.7-1 m from walls."],
  ["People", "Keep yourself under the camera. Leave Remove People on so operators do not become floaters."],
  ["Lenses", "Wipe both lenses before every walk — a smudge blurs a quarter of the sphere."],
  ["Extract", "4 fps is the proven default for walking 360. Blurry frames hurt SfM more than missing a few."],
  ["Hardware", "Local train: NVIDIA GPU, 24 GB VRAM recommended. Training views default to 1280px so 16 views/pano fit in RAM."],
];

export function HelpSheet({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
      <div className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-xl border border-white/10 bg-[var(--graphite-canvas)] p-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--graphite-muted)]">Capture guide</p>
          <button onClick={onClose} className="text-[var(--graphite-muted)] hover:text-white"><X className="size-4" /></button>
        </div>
        <ul className="mt-3 space-y-1.5">
          {ROWS.map(([label, text]) => (
            <li key={label} className="flex items-start gap-2 text-sm text-slate-200">
              <span className="text-[var(--graphite-primary)]">»</span>
              <span><span className="font-medium text-[var(--graphite-text-header)]">{label}.</span> {text}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
