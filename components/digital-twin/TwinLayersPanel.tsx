"use client";

import { useState } from "react";
import { Layers, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { twinAccent } from "@/lib/digital-twin/twin-accent";

type Layer = {
  id: string;
  label: string;
  description: string;
  defaultVisible: boolean;
};

const DEFAULT_LAYERS: Layer[] = [
  {
    id: "model",
    label: "Published model",
    description: "Primary twin geometry",
    defaultVisible: true,
  },
  {
    id: "pins",
    label: "Pins",
    description: "Coordination markers from share links",
    defaultVisible: true,
  },
  {
    id: "measurements",
    label: "Measurements",
    description: "Approximate distances (coordination only)",
    defaultVisible: true,
  },
  {
    id: "punch",
    label: "Punch annotations",
    description: "Linked punch items",
    defaultVisible: false,
  },
];

export function TwinLayersPanel({
  layers = DEFAULT_LAYERS,
  onToggle,
}: {
  layers?: Layer[];
  onToggle?: (layerId: string, visible: boolean) => void;
}) {
  const [visible, setVisible] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(layers.map((l) => [l.id, l.defaultVisible])),
  );

  const toggle = (id: string) => {
    setVisible((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      onToggle?.(id, next[id]);
      return next;
    });
  };

  return (
    <section className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
      <div className="mb-3 flex items-center gap-2">
        <Layers className={cn("size-4", twinAccent.text)} aria-hidden />
        <h2 className="text-sm font-semibold text-zinc-100">Layers</h2>
      </div>
      <ul className="space-y-2">
        {layers.map((layer) => {
          const isOn = visible[layer.id];
          return (
            <li key={layer.id}>
              <button
                type="button"
                onClick={() => toggle(layer.id)}
                className={cn(
                  "flex w-full items-start gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors",
                  isOn
                    ? "border-[var(--accent-border-blue)] bg-[color-mix(in_srgb,var(--twin360-blue)_8%,transparent)]"
                    : "border-white/[0.06] bg-[#0B0F15]/30 hover:bg-white/[0.04]",
                )}
              >
                {isOn ? (
                  <Eye className={cn("mt-0.5 size-3.5 shrink-0", twinAccent.text)} aria-hidden />
                ) : (
                  <EyeOff className="mt-0.5 size-3.5 shrink-0 text-zinc-500" aria-hidden />
                )}
                <span>
                  <span className="block text-xs font-semibold text-zinc-200">{layer.label}</span>
                  <span className="block text-[10px] text-zinc-500">{layer.description}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
