"use client";

import { Loader2, AlertTriangle, Check } from "lucide-react";
import type { DesignVariant } from "@/lib/design-studio/internal-types";

const STATUS_TINT: Record<string, string> = {
  queued: "text-slate-400",
  processing: "text-amber-300",
  ready: "text-emerald-300",
  failed: "text-red-400",
};

/** Horizontal variant gallery (bottom overlay). Select to load; shows live status. */
export function VariantStrip({
  variants,
  activeVariantId,
  onSelect,
}: {
  variants: DesignVariant[];
  activeVariantId: string | null;
  onSelect: (variantId: string) => void;
}) {
  if (variants.length === 0) {
    return <p className="text-[11px] text-slate-500">No variants yet — send a prompt to generate one.</p>;
  }
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {variants.map((v) => {
        const active = v.id === activeVariantId;
        return (
          <button
            key={v.id}
            onClick={() => onSelect(v.id)}
            className={`flex h-20 w-28 shrink-0 flex-col justify-between rounded-md border p-2 text-left transition ${
              active ? "border-[#3D8EFF] bg-white/5" : "border-white/10 hover:border-white/20"
            }`}
          >
            <span className="truncate text-[11px] text-slate-300">{v.label ?? v.tier}</span>
            <span className={`flex items-center gap-1 text-[10px] ${STATUS_TINT[v.status] ?? "text-slate-400"}`}>
              {v.status === "processing" || v.status === "queued" ? (
                <Loader2 className="size-3 animate-spin" />
              ) : v.status === "ready" ? (
                <Check className="size-3" />
              ) : v.status === "failed" ? (
                <AlertTriangle className="size-3" />
              ) : null}
              {v.status}
            </span>
          </button>
        );
      })}
    </div>
  );
}
