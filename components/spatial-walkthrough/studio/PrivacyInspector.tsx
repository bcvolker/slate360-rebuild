"use client";

import { useState } from "react";
import type { OperatorPatch } from "@/lib/spatial-walkthrough/types";
import { COVERAGE_TOO_LIMITED } from "@/lib/spatial-walkthrough/field-of-regard";
import { CONSTRUCTION_PRIVACY } from "@/lib/spatial-walkthrough/privacy-profile";

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
  onSkipSegment?: () => void;
  keyCount?: number;
};

export function PrivacyInspector({ patch, onChange, onPersist, onMaskHere, onPrevKey, onNextKey, onAddKey, onDeleteKey, onCopyPrev, onSkipSegment, keyCount = 0 }: Props) {
  const [previewRegard, setPreviewRegard] = useState(false);
  const set = (partial: Partial<OperatorPatch>) => onChange({ ...patch, ...partial });
  const tooWide = patch.rearYawWidth > 140;
  return (
    <div className="space-y-4" data-testid="sw-privacy-inspector">
      <p className="text-sm text-white">Hide Camera Operator</p>
      <p className="text-xs leading-relaxed text-[var(--graphite-text-body)]">
        Construction profile: field of regard plus a neutral baked safety mask. Never generative fill. Preview CLIENT/PUBLIC to see the allowed view.
      </p>
      <p className="text-xs text-[var(--graphite-muted)]">Available view stays in front. Excluded operator sector is behind/below.</p>
      <label className="flex min-h-12 items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={previewRegard}
          onChange={(e) => {
            setPreviewRegard(e.target.checked);
            window.dispatchEvent(new CustomEvent("sw-preview-regard", { detail: e.target.checked }));
          }}
        />
        Preview Field of Regard
      </label>
      <label className="block text-sm">
        Width
        <input type="range" className="mt-2 h-11 w-full" min={24} max={160} value={patch.rearYawWidth} onChange={(e) => set({ rearYawWidth: Number(e.target.value) })} />
      </label>
      <label className="block text-sm">
        Top extent
        <input type="range" className="mt-2 h-11 w-full" min={-20} max={20} step={1} value={patch.pitchMax} onChange={(e) => set({ pitchMax: Number(e.target.value) })} />
      </label>
      <label className="block text-sm">
        Bottom / Nadir
        <input type="range" className="mt-2 h-11 w-full" min={0.08} max={0.5} step={0.01} value={patch.nadirVerticalExtent} onChange={(e) => set({ nadirVerticalExtent: Number(e.target.value) })} />
      </label>
      <label className="block text-sm">
        Feather
        <input type="range" className="mt-2 h-11 w-full" min={0.04} max={0.2} step={0.01} value={patch.nadirRadius} onChange={(e) => set({ nadirRadius: Number(e.target.value) })} />
      </label>
      {tooWide ? <p className="text-xs text-[var(--graphite-text-body)]">{COVERAGE_TOO_LIMITED}</p> : null}
      <button type="button" onClick={onMaskHere} className="inline-flex h-12 w-full items-center justify-center border border-white/20 text-sm">
        Hide operator here
      </button>
      <p className="text-xs text-[var(--graphite-muted)]">{keyCount} privacy keys · {CONSTRUCTION_PRIVACY.profile}</p>
      <div className="flex gap-2">
        <button type="button" className="h-12 flex-1 border border-white/10 text-sm" onClick={onPrevKey}>Prev key</button>
        <button type="button" className="h-12 flex-1 border border-white/10 text-sm" onClick={onNextKey}>Next key</button>
      </div>
      <div className="flex gap-2">
        <button type="button" className="h-12 flex-1 border border-white/10 text-sm" onClick={onAddKey}>Add key</button>
        <button type="button" className="h-12 flex-1 border border-white/10 text-sm" onClick={onDeleteKey}>Delete</button>
      </div>
      <button type="button" className="h-12 w-full border border-white/10 text-sm" onClick={onCopyPrev}>Copy previous</button>
      <button type="button" className="h-12 w-full border border-white/10 text-sm" onClick={onSkipSegment}>Skip Segment</button>
      <button type="button" className="h-12 w-full border border-white/10 text-sm" onClick={onPersist}>Save</button>
      <details className="text-xs text-[var(--graphite-muted)]">
        <summary className="min-h-12 cursor-pointer">Advanced</summary>
        <p className="mt-2">Yaw {Math.round(patch.rearYawCenter)} · pitch {patch.pitchMin} / {patch.pitchMax}</p>
      </details>
    </div>
  );
}
