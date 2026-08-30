"use client";

import type { OperatorPatch } from "@/lib/spatial-walkthrough/types";

type Patch = OperatorPatch & {
  nadirRadius?: number;
  nadirFrac?: number;
  wrapFrac?: number;
  wrapY0Frac?: number;
  nadirVerticalExtent?: number;
  rearYawCenter?: number;
  rearYawWidth?: number;
  pitchMin?: number;
  pitchMax?: number;
  style?: string;
  fill?: "neutral" | "brand";
  showCompass?: boolean;
  headingDeg?: number | null;
};

type Props = {
  patch: OperatorPatch;
  onChange: (patch: OperatorPatch) => void;
  onPersist: () => void;
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
    <label className="block space-y-1 text-sm">
      <span className="flex justify-between font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--graphite-muted)]">
        {label}
        <span>{Number.isInteger(step) ? value : value.toFixed(2)}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="h-11 w-full" />
    </label>
  );
}

export function OperatorPatchPanel({ patch, onChange, onPersist }: Props) {
  const p = patch as Patch;
  const set = (partial: Partial<Patch>) => onChange({ ...p, ...partial } as OperatorPatch);
  return (
    <section className="space-y-3 border border-white/10 bg-white/[0.04] p-4">
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--graphite-muted)]">Operator patch</p>
      <label className="flex h-11 items-center gap-2 text-sm">
        <input type="checkbox" checked={p.enabled} onChange={(e) => set({ enabled: e.target.checked })} />
        Enabled
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        {typeof p.nadirRadius === "number" ? (
          <Slider label="Nadir radius" value={p.nadirRadius} min={0.08} max={0.6} step={0.01} onChange={(nadirRadius) => set({ nadirRadius })} />
        ) : (
          <Slider label="Nadir size" value={p.nadirFrac ?? 0.22} min={0.05} max={0.45} step={0.01} onChange={(nadirFrac) => set({ nadirFrac })} />
        )}
        {typeof p.nadirVerticalExtent === "number" ? (
          <Slider label="Vertical extent" value={p.nadirVerticalExtent} min={0.05} max={0.45} step={0.01} onChange={(nadirVerticalExtent) => set({ nadirVerticalExtent })} />
        ) : null}
        {typeof p.wrapFrac === "number" ? (
          <Slider label="Rear wrap" value={p.wrapFrac} min={0} max={0.25} step={0.01} onChange={(wrapFrac) => set({ wrapFrac })} />
        ) : null}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <select value={p.fill === "brand" ? "brand" : "neutral"} onChange={(e) => set({ fill: e.target.value === "brand" ? "brand" : "neutral" })} className="h-11 border border-white/10 bg-transparent px-2">
          <option value="neutral">Neutral fill</option>
          <option value="brand">Contractor brand</option>
        </select>
        <label className="flex h-11 items-center gap-2 text-sm">
          <input type="checkbox" checked={p.logoInPatch !== false} onChange={(e) => set({ logoInPatch: e.target.checked })} />
          Logo in patch
        </label>
        <label className="flex h-11 items-center gap-2 text-sm">
          <input type="checkbox" checked={p.showDate !== false} onChange={(e) => set({ showDate: e.target.checked })} />
          Capture date
        </label>
        <label className="flex h-11 items-center gap-2 text-sm">
          <input type="checkbox" checked={p.showCompass === true} onChange={(e) => set({ showCompass: e.target.checked })} />
          Compass N
        </label>
        <label className="text-sm sm:col-span-2">
          <span className="mb-1 block font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--graphite-muted)]">Heading °</span>
          <input
            type="number"
            value={p.headingDeg ?? ""}
            onChange={(e) => set({ headingDeg: e.target.value === "" ? null : Number(e.target.value) })}
            className="h-11 w-full border border-white/10 bg-transparent px-3"
            placeholder="If known"
          />
        </label>
      </div>
      <button type="button" onClick={onPersist} className="h-11 border border-white/10 px-4 text-sm">
        Save preset
      </button>
    </section>
  );
}
