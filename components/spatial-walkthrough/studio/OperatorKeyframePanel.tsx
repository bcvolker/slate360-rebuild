"use client";

import type { PatchStyle } from "@/lib/spatial-walkthrough/types";
import type { OperatorKeyframe as Kf } from "@/lib/spatial-walkthrough/keyframes";

type Props = {
  frame: Kf;
  onChange: (next: Kf) => void;
  onAdd: () => void;
  onRemove: () => void;
};

export function OperatorKeyframePanel({ frame, onChange, onAdd, onRemove }: Props) {
  const set = (partial: Partial<Kf>) => onChange({ ...frame, ...partial });
  return (
    <section className="space-y-3 border border-white/10 bg-white/[0.04] p-4">
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--graphite-muted)]">
        Privacy · Operator keyframe @ {frame.t.toFixed(1)}s
      </p>
      <p className="text-sm text-[var(--graphite-muted)]">Pause, then Add/Edit. Drag the sector on the sphere; numbers are advanced.</p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Num label="Yaw center" value={frame.yawCenter} onChange={(yawCenter) => set({ yawCenter })} />
        <Num label="Yaw width" value={frame.yawWidth} onChange={(yawWidth) => set({ yawWidth })} />
        <Num label="Pitch top" value={frame.pitchTop} onChange={(pitchTop) => set({ pitchTop })} />
        <Num label="Pitch bottom" value={frame.pitchBottom} onChange={(pitchBottom) => set({ pitchBottom })} />
        <Num label="Nadir radius" value={frame.nadirRadius} step={0.01} onChange={(nadirRadius) => set({ nadirRadius })} />
        <Num label="Feather" value={frame.feather} step={0.01} onChange={(feather) => set({ feather })} />
        <label className="text-sm">
          <span className="mb-1 block font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--graphite-muted)]">Style</span>
          <select
            value={frame.style}
            onChange={(e) => set({ style: e.target.value as PatchStyle })}
            className="h-11 w-full border border-white/10 bg-transparent px-2"
          >
            <option value="solid">Solid</option>
            <option value="blur">Blur</option>
            <option value="logo">Logo</option>
          </select>
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="h-11 border border-[color-mix(in_srgb,var(--graphite-primary)_40%,transparent)] px-4 text-[var(--graphite-primary)]" onClick={onAdd}>
          Add / update keyframe
        </button>
        <button type="button" className="h-11 border border-white/10 px-4 text-sm" onClick={onRemove}>
          Remove keyframe
        </button>
      </div>
    </section>
  );
}

function Num({ label, value, step = 1, onChange }: { label: string; value: number; step?: number; onChange: (n: number) => void }) {
  return (
    <label className="text-sm">
      <span className="mb-1 block font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--graphite-muted)]">{label}</span>
      <input type="number" step={step} value={Number.isFinite(value) ? value : 0} onChange={(e) => onChange(Number(e.target.value))} className="h-11 w-full border border-white/10 bg-transparent px-3" />
    </label>
  );
}
