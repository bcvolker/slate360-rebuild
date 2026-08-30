"use client";

import { OEM_GYRO_NOTE, type OrientationKeyframe, type OrientationTrack } from "@/lib/spatial-walkthrough/orientation";

type Props = {
  track: OrientationTrack;
  current: OrientationKeyframe;
  onChange: (frame: OrientationKeyframe) => void;
  onSave: () => void;
  onRemove: () => void;
};

export function OrientationPanel({ track, current, onChange, onSave, onRemove }: Props) {
  const set = (partial: Partial<OrientationKeyframe>) => onChange({ ...current, ...partial });
  return (
    <section className="space-y-3 border border-white/10 bg-white/[0.04] p-4">
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--graphite-muted)]">Orientation</p>
      <p className="text-sm text-[var(--graphite-muted)]">
        {OEM_GYRO_NOTE}. Preview uses a spherical transform. CLIENT/PUBLIC correction is bakeable into the derivative. True positional camera bob is left in the record.
      </p>
      <p className="text-xs text-[var(--graphite-muted)]">Source: {track.source} · {track.keyframes.length} keyframes</p>
      <div className="grid gap-2 sm:grid-cols-3">
        <Num label="Roll" value={current.rollDeg} onChange={(rollDeg) => set({ rollDeg })} />
        <Num label="Pitch" value={current.pitchDeg} onChange={(pitchDeg) => set({ pitchDeg })} />
        <Num label="Yaw" value={current.yawDeg} onChange={(yawDeg) => set({ yawDeg })} />
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="h-11 border border-[color-mix(in_srgb,var(--graphite-primary)_40%,transparent)] px-4 text-[var(--graphite-primary)]" onClick={onSave}>
          Set keyframe
        </button>
        <button type="button" className="h-11 border border-white/10 px-4 text-sm" onClick={onRemove}>
          Remove keyframe
        </button>
      </div>
    </section>
  );
}

function Num({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <label className="text-sm">
      <span className="mb-1 block font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--graphite-muted)]">{label}</span>
      <input type="number" step={0.1} value={Number.isFinite(value) ? value : 0} onChange={(e) => onChange(Number(e.target.value))} className="h-11 w-full border border-white/10 bg-transparent px-3" />
    </label>
  );
}
