"use client";

import type { OperatorPatch } from "@/lib/spatial-walkthrough/types";

type Props = {
  patch: OperatorPatch;
  onChange: (patch: OperatorPatch) => void;
  onPersist: () => void;
  onMaskHere: () => void;
  onPrevKey?: () => void;
  onNextKey?: () => void;
  onAddKey?: () => void;
  onDeleteKey?: () => void;
  onCopyPrev?: () => void;
  keyCount?: number;
};

export function PrivacyInspector({ patch, onChange, onPersist, onMaskHere, onPrevKey, onNextKey, onAddKey, onDeleteKey, onCopyPrev, keyCount = 0 }: Props) {
  const set = (partial: Partial<OperatorPatch>) => onChange({ ...patch, ...partial });
  return (
    <div className="space-y-4" data-testid="sw-privacy-inspector">
      <p className="text-sm text-white">Operator mask</p>
      <p className="text-xs leading-relaxed text-[var(--graphite-text-body)]">
        Pause on the person, then mask the rear sector. The public file uses a baked derivative — not this tint.
      </p>
      <label className="block text-sm">
        Width
        <input type="range" className="mt-2 h-11 w-full" min={24} max={160} value={patch.rearYawWidth} onChange={(e) => set({ rearYawWidth: Number(e.target.value) })} />
      </label>
      <label className="block text-sm">
        Height
        <input type="range" className="mt-2 h-11 w-full" min={0.08} max={0.5} step={0.01} value={patch.nadirVerticalExtent} onChange={(e) => set({ nadirVerticalExtent: Number(e.target.value) })} />
      </label>
      <label className="block text-sm">
        Feather
        <input type="range" className="mt-2 h-11 w-full" min={0.04} max={0.2} step={0.01} value={patch.nadirRadius} onChange={(e) => set({ nadirRadius: Number(e.target.value) })} />
      </label>
      <button type="button" onClick={onMaskHere} className="inline-flex h-12 w-full items-center justify-center border border-white/20 text-sm">
        Mask operator here
      </button>
      <p className="text-xs text-[var(--graphite-muted)]">{keyCount} privacy keys</p>
      <div className="flex gap-2">
        <button type="button" className="h-12 flex-1 border border-white/10 text-sm" onClick={onPrevKey}>Prev key</button>
        <button type="button" className="h-12 flex-1 border border-white/10 text-sm" onClick={onNextKey}>Next key</button>
      </div>
      <div className="flex gap-2">
        <button type="button" className="h-12 flex-1 border border-white/10 text-sm" onClick={onAddKey}>Add key</button>
        <button type="button" className="h-12 flex-1 border border-white/10 text-sm" onClick={onDeleteKey}>Delete</button>
      </div>
      <button type="button" className="h-12 w-full border border-white/10 text-sm" onClick={onCopyPrev}>Copy previous</button>
      <button type="button" onClick={onPersist} className="h-12 w-full border border-white/10 text-sm">Save mask</button>
      <details className="text-xs text-[var(--graphite-muted)]">
        <summary className="min-h-12 cursor-pointer">Advanced numbers</summary>
        <p className="mt-2">Yaw {Math.round(patch.rearYawCenter)} · pitch {patch.pitchMin} / {patch.pitchMax}</p>
      </details>
    </div>
  );
}
