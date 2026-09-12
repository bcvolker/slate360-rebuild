"use client";

const ROWS = [
  ["Camera", "Insta360 X4 / X5 or Ricoh Theta. Shoot 360 video, not flat/single-lens."],
  ["Resolution", "Indoor / low light: 5.7K 60 fps. Bright indoor or outdoor: 8K 30 fps."],
  ["Stabilization", "Export equirectangular. Turn off horizon lock, tilt recovery, and FlowState — they warp geometry COLMAP needs."],
  ["Pace", "Walk at museum tempo (~0.5–1 m/s). Wide arcs at corners. No pivots, no jerks."],
  ["Path", "High pass (head height) then low pass (hip). Loop back to the start. Stay 0.5–1 m from walls."],
  ["People", "Keep yourself under the camera. Leave Remove People on so operators do not become floaters."],
  ["Extract", "4 fps is the proven default for walking 360. Blurry frames hurt SfM more than missing a few."],
  ["Hardware", "Local train: NVIDIA GPU, 24 GB VRAM recommended for Auto / SH 3. 32 GB+ for 20M-splat scenes."],
];

export function CaptureGuide() {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--graphite-muted)]">Capture guide</p>
      <p className="mt-1 text-xs text-[var(--graphite-muted)]">
        Proven 360 method for Clone 1. Follow this on site; the knobs below only refine processing.
      </p>
      <ul className="mt-3 space-y-1.5">
        {ROWS.map(([label, text]) => (
          <li key={label} className="flex items-start gap-2 text-slate-200 text-base font-normal tracking-wide">
            <span className="text-[var(--graphite-primary)] drop-shadow-[0_0_8px_rgba(0,230,153,0.6)]">»</span>
            <span><span className="font-medium text-[var(--graphite-text-header)]">{label}.</span> {text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
