"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { IconArrowsHorizontal } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { twinAccent } from "@/lib/digital-twin/twin-accent";
import type { ProgressionSlide } from "@/lib/digital-twin/progression-types";

const TwinShareSplatViewer = dynamic(
  () => import("@/components/digital-twin/TwinShareSplatViewer").then((m) => m.TwinShareSplatViewer),
  { ssr: false },
);

type CompareMode = "single" | "blend" | "wipe";

export function ProgressionCompareViewer({
  slideA,
  slideB,
}: {
  slideA: ProgressionSlide;
  slideB: ProgressionSlide | null;
}) {
  const [mode, setMode] = useState<CompareMode>("single");
  const [blend, setBlend] = useState(0.5);
  const [wipe, setWipe] = useState(0.5);

  const compareReady = slideB !== null;

  return (
    <div className="flex min-h-[400px] flex-1 flex-col gap-2">
      {compareReady ? (
        <div className="flex flex-wrap gap-2">
          {(["single", "blend", "wipe"] as CompareMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn(
                "rounded-lg border px-2 py-1 text-xs capitalize",
                mode === m ? twinAccent.button : "border-white/10 text-zinc-400",
              )}
            >
              {m === "wipe" ? (
                <span className="inline-flex items-center gap-1">
                  <IconArrowsHorizontal className="size-3.5" aria-hidden />
                  Split
                </span>
              ) : (
                m
              )}
            </button>
          ))}
        </div>
      ) : null}

      <div className="relative min-h-[400px] flex-1 overflow-hidden rounded-xl">
        {mode === "single" || !slideB ? (
          <TwinShareSplatViewer src={slideA.modelUrl} className="h-full min-h-[400px]" />
        ) : mode === "blend" ? (
          <>
            <TwinShareSplatViewer src={slideA.modelUrl} className="absolute inset-0 h-full" />
            <div className="absolute inset-0" style={{ opacity: blend }}>
              <TwinShareSplatViewer src={slideB.modelUrl} className="h-full" />
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={blend}
              onChange={(e) => setBlend(Number(e.target.value))}
              className="absolute bottom-3 left-1/2 z-10 w-48 -translate-x-1/2 accent-[var(--twin360-blue)]"
              aria-label="Blend between captures"
            />
          </>
        ) : (
          <div className="relative h-full min-h-[400px]">
            <TwinShareSplatViewer src={slideB.modelUrl} className="absolute inset-0 h-full" />
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ clipPath: `inset(0 ${(1 - wipe) * 100}% 0 0)` }}
            >
              <TwinShareSplatViewer src={slideA.modelUrl} className="h-full" />
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={wipe}
              onChange={(e) => setWipe(Number(e.target.value))}
              className="absolute bottom-3 left-1/2 z-10 w-48 -translate-x-1/2 accent-[var(--twin360-blue)]"
              aria-label="Wipe compare position"
            />
          </div>
        )}
      </div>
    </div>
  );
}
