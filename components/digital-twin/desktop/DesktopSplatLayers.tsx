"use client";

import { IconEye, IconEyeOff, IconStack2 } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { twinAccent } from "@/lib/digital-twin/twin-accent";
import type { TwinEditListOp } from "@/lib/digital-twin/edit-list-types";

export function DesktopSplatLayers({
  ops,
  onToggle,
  onRemove,
}: {
  ops: TwinEditListOp[];
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <section className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
      <div className="mb-3 flex items-center gap-2">
        <IconStack2 className={cn("size-4", twinAccent.text)} aria-hidden />
        <h2 className="text-sm font-semibold text-zinc-100">Edit layers</h2>
        <span className={cn("ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold", twinAccent.iconChip)}>
          {ops.length}
        </span>
      </div>
      {ops.length === 0 ? (
        <p className="text-xs text-zinc-500">No edits yet. Pick a tool and click the model.</p>
      ) : (
        <ul className="max-h-48 space-y-2 overflow-y-auto">
          {ops.map((op) => {
            const on = op.enabled !== false;
            return (
              <li key={op.id} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onToggle(op.id)}
                  className={cn(
                    "flex min-w-0 flex-1 items-center gap-2 rounded-lg border px-2 py-1.5 text-left text-xs",
                    on
                      ? "border-[var(--accent-border-blue)] bg-[color-mix(in_srgb,var(--twin360-blue)_8%,transparent)]"
                      : "border-white/[0.06] bg-[#0B0F15]/30",
                  )}
                >
                  {on ? (
                    <IconEye className={cn("size-3.5 shrink-0", twinAccent.text)} aria-hidden />
                  ) : (
                    <IconEyeOff className="size-3.5 shrink-0 text-zinc-500" aria-hidden />
                  )}
                  <span className="truncate font-medium text-zinc-200">
                    {op.label ?? op.tool} · {op.sdfType}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(op.id)}
                  className="shrink-0 text-[10px] text-zinc-500 hover:text-red-300"
                >
                  Remove
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
