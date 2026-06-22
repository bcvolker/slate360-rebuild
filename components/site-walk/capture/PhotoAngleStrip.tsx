"use client";

import { Camera, ImagePlus, Plus } from "lucide-react";
import GlassCard from "@/components/shared/GlassCard";
import { getCaptureImageUrl } from "@/lib/site-walk/capture-image-url";
import { getItemPhotoAngles, getPhotoAngleImageUrl } from "@/lib/site-walk/photo-angles";
import type { CaptureItemRecord } from "@/lib/types/site-walk-capture";

type Props = {
  item: CaptureItemRecord | null;
  activeAngleId: string | null;
  className?: string;
  onSelectAngle: (angleId: string | null) => void;
  onAddAngle: () => void;
};

export function PhotoAngleStrip({ item, activeAngleId, className = "", onSelectAngle, onAddAngle }: Props) {
  if (!item || item.item_type !== "photo") return null;
  const angles = getItemPhotoAngles(item);
  const primaryUrl = getCaptureImageUrl(item);

  return (
    <GlassCard className={`${className} bg-slate-950/65 p-2 backdrop-blur-xl`}>
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar" aria-label="Current item photo angles">
        <AngleButton label="Main" imageUrl={primaryUrl} active={!activeAngleId} onClick={() => onSelectAngle(null)} />
        {angles.map((angle) => (
          <AngleButton key={angle.id} label={angle.label} imageUrl={getPhotoAngleImageUrl(item, angle.id)} active={activeAngleId === angle.id} failed={angle.uploadState === "failed"} onClick={() => onSelectAngle(angle.id)} />
        ))}
        <button type="button" onClick={onAddAngle} className="flex h-16 min-w-28 shrink-0 flex-col items-center justify-center gap-1 rounded-2xl border border-[color-mix(in_srgb,var(--graphite-primary)_50%,transparent)] bg-[color-mix(in_srgb,var(--graphite-primary)_15%,transparent)] px-3 text-[11px] font-black uppercase tracking-[0.08em] text-[var(--graphite-primary)] hover:bg-[color-mix(in_srgb,var(--graphite-primary)_25%,transparent)]" aria-label="Add another angle to this item">
          <Plus className="h-4 w-4" /> Add Angle
        </button>
      </div>
    </GlassCard>
  );
}

function AngleButton({ label, imageUrl, active, failed = false, onClick }: { label: string; imageUrl: string | null; active: boolean; failed?: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border bg-black/60 ${active ? "border-[var(--graphite-primary)] ring-2 ring-[color-mix(in_srgb,var(--graphite-primary)_30%,transparent)]" : "border-white/15"}`} aria-label={`Open ${label}`}>
      {imageUrl ? <img src={imageUrl} alt="" className="h-full w-full object-cover" /> : <span className="flex h-full w-full items-center justify-center bg-zinc-950"><Camera className="h-5 w-5 text-white/45" /></span>}
      <span className="absolute inset-x-1 bottom-1 truncate rounded-full bg-black/65 px-1 text-[9px] font-black text-white/85">{failed ? "Retry" : label}</span>
      {failed && <ImagePlus className="absolute right-1 top-1 h-3.5 w-3.5 text-rose-300" />}
    </button>
  );
}
