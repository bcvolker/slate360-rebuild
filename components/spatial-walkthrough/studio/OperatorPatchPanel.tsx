"use client";

import type { OperatorPatch, PatchStyle } from "@/lib/spatial-walkthrough/types";

type Props = {
  patch: OperatorPatch;
  onChange: (patch: OperatorPatch) => void;
  onPersist: () => void;
  onUseRearFromView?: () => void;
};

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (n: number) => void;
}) {
  return (
    <label className="block space-y-1 text-sm text-[var(--graphite-text-header)]">
      <span className="flex justify-between font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--graphite-muted)]">
        {label}
        <span>{Number.isInteger(step) ? value : value.toFixed(2)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-11 w-full"
      />
    </label>
  );
}

export function OperatorPatchPanel({ patch, onChange, onPersist, onUseRearFromView }: Props) {
  const set = (partial: Partial<OperatorPatch>) => onChange({ ...patch, ...partial });
  return (
    <section className="space-y-3 border border-white/10 bg-white/[0.04] p-4">
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--graphite-muted)]">Operator mask preset</p>
      <label className="flex h-11 items-center gap-2 text-sm">
        <input type="checkbox" checked={patch.enabled} onChange={(e) => set({ enabled: e.target.checked })} />
        Enabled
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <Slider label="Nadir radius" value={patch.nadirRadius} min={0.08} max={0.6} step={0.01} onChange={(nadirRadius) => set({ nadirRadius })} />
        <Slider label="Vertical extent" value={patch.nadirVerticalExtent} min={0.05} max={0.45} step={0.01} onChange={(nadirVerticalExtent) => set({ nadirVerticalExtent })} />
        <Slider label="Rear yaw center" value={patch.rearYawCenter} min={-180} max={180} step={1} onChange={(rearYawCenter) => set({ rearYawCenter })} />
        <Slider label="Rear yaw width" value={patch.rearYawWidth} min={8} max={180} step={1} onChange={(rearYawWidth) => set({ rearYawWidth })} />
        <Slider label="Pitch min" value={patch.pitchMin} min={-90} max={0} step={1} onChange={(pitchMin) => set({ pitchMin })} />
        <Slider label="Pitch max" value={patch.pitchMax} min={-90} max={40} step={1} onChange={(pitchMax) => set({ pitchMax })} />
        <Slider label="Mask from (s)" value={patch.tStart ?? 0} min={0} max={600} step={1} onChange={(tStart) => set({ tStart: tStart > 0 ? tStart : null })} />
        <Slider label="Mask to (s)" value={patch.tEnd ?? 0} min={0} max={600} step={1} onChange={(tEnd) => set({ tEnd: tEnd > 0 ? tEnd : null })} />
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <select
          value={patch.style}
          onChange={(e) => set({ style: e.target.value as PatchStyle })}
          className="h-11 border border-white/10 bg-transparent px-2"
        >
          <option value="solid">Solid</option>
          <option value="blur">Blur</option>
          <option value="logo">Logo plate</option>
        </select>
        <select
          value={patch.fill}
          onChange={(e) => set({ fill: e.target.value === "brand" ? "brand" : "neutral" })}
          className="h-11 border border-white/10 bg-transparent px-2"
        >
          <option value="neutral">Neutral fill</option>
          <option value="brand">Contractor brand</option>
        </select>
        <label className="flex h-11 items-center gap-2 text-sm">
          <input type="checkbox" checked={patch.logoInPatch} onChange={(e) => set({ logoInPatch: e.target.checked })} />
          Logo in patch
        </label>
        <label className="flex h-11 items-center gap-2 text-sm">
          <input type="checkbox" checked={patch.showDate} onChange={(e) => set({ showDate: e.target.checked })} />
          Capture date
        </label>
        <label className="flex h-11 items-center gap-2 text-sm">
          <input type="checkbox" checked={patch.showCompass} onChange={(e) => set({ showCompass: e.target.checked })} />
          Compass N
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--graphite-muted)]">Heading °</span>
          <input
            type="number"
            value={patch.headingDeg ?? ""}
            onChange={(e) => set({ headingDeg: e.target.value === "" ? null : Number(e.target.value) })}
            className="h-11 w-full border border-white/10 bg-transparent px-3"
            placeholder="If known"
          />
        </label>
      </div>
      <button type="button" onClick={onPersist} className="h-11 border border-white/10 px-4 text-sm">
        Save preset
      </button>
      {onUseRearFromView ? (
        <button type="button" onClick={onUseRearFromView} className="h-11 border border-white/10 px-4 text-sm">
          Rear from current view
        </button>
      ) : null}
    </section>
  );
}
