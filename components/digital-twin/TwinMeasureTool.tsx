"use client";

import { IconLoader2, IconRuler, IconX } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { twinAccent } from "@/lib/digital-twin/twin-accent";
import { APPROX_COORDINATION_LABEL } from "@/lib/digital-twin/measure-helpers";

type Props = {
  active: boolean;
  hasFirstPoint: boolean;
  busy: boolean;
  splatReady: boolean;
  onToggle: () => void;
  onCancel: () => void;
};

export function TwinMeasureTool({
  active,
  hasFirstPoint,
  busy,
  splatReady,
  onToggle,
  onCancel,
}: Props) {
  if (!splatReady) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={onToggle}
        disabled={busy}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-[11px] font-semibold transition-colors disabled:opacity-40",
          active ? twinAccent.button : "border-white/10 text-zinc-400 hover:text-zinc-200",
        )}
      >
        <IconRuler className="size-3.5" stroke={1.75} aria-hidden />
        Measure
      </button>

      {active ? (
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="inline-flex items-center gap-1 rounded-xl border border-white/10 px-2 py-1.5 text-[11px] font-semibold text-zinc-400 transition-colors hover:text-zinc-200 disabled:opacity-40"
        >
          <IconX className="size-3.5" stroke={1.75} aria-hidden />
          Cancel
        </button>
      ) : null}

      {busy ? <IconLoader2 className={cn("size-4 animate-spin", twinAccent.spinner)} aria-hidden /> : null}

      {active ? (
        <p className="w-full text-[10px] leading-relaxed text-zinc-400">
          {hasFirstPoint ? "Tap second point on the model." : "Tap two points on the model surface."}{" "}
          {APPROX_COORDINATION_LABEL}
        </p>
      ) : null}
    </div>
  );
}
