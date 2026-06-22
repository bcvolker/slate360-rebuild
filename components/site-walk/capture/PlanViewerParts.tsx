"use client";

import type { PlanViewerPin } from "./PlanPin";

export function PlanEmptySurface({ projectAware }: { projectAware: boolean }) {
  const msg = projectAware ? "Plan file is being prepared. Switch pages or refresh." : "Start from a project with uploaded plans to use plan mode.";
  return <div className="flex h-full w-full items-center justify-center bg-white px-8 text-center text-sm font-bold text-slate-600">{msg}</div>;
}

export function PinInfoBubble({ pin, item, onSelect }: { pin: PlanViewerPin; item?: { title?: string; description?: string | null } | null; onSelect: () => void }) {
  return (
    <div className="pointer-events-auto absolute z-40 flex w-56 -translate-x-1/2 -translate-y-full gap-2 rounded-2xl border border-cyan-300/25 bg-slate-950/95 p-2 text-white shadow-2xl backdrop-blur-xl" style={{ left: `${pin.x_pct}%`, top: `calc(${pin.y_pct}% - 3rem)` }} onClick={(e) => e.stopPropagation()}>
      <div className="min-w-0 flex-1 text-left">
        <p className="truncate text-xs font-black text-cyan-100">{item?.title || `Pin ${pin.label}`}</p>
        <p className="mt-1 line-clamp-2 text-[11px] font-bold text-white/65">{item?.description || "Saved item"}</p>
      </div>
      <button type="button" onClick={onSelect} className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-black border border-white/10 hover:ring-2 hover:ring-[var(--graphite-primary)]">
        <img src={`/api/site-walk/items/${pin.item_id}/image`} alt="Preview" className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} />
      </button>
    </div>
  );
}
