"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { IconCalendar } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { twinAccent } from "@/lib/digital-twin/twin-accent";
import type { ProgressionSlide } from "@/lib/digital-twin/progression-types";
import { ProgressionCompareViewer } from "./ProgressionCompareViewer";

type Props = {
  spaceId: string;
  spaceTitle: string;
  slides: ProgressionSlide[];
};

export function ProgressionTimeline({ spaceId, spaceTitle, slides }: Props) {
  const [index, setIndex] = useState(Math.max(0, slides.length - 1));
  const [compareIndex, setCompareIndex] = useState<number | null>(null);

  const slide = slides[index];
  const compareSlide = compareIndex !== null ? slides[compareIndex] : null;

  const labels = useMemo(
    () =>
      slides.map((s) =>
        new Date(s.captureDate).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
      ),
    [slides],
  );

  if (!slides.length) {
    return (
      <p className="text-sm text-zinc-400">
        No splat models with capture dates in this space yet.
      </p>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-zinc-100">{spaceTitle}</p>
          <p className="text-xs text-zinc-500">Progression · {slides.length} captures</p>
        </div>
        <Link href={`/digital-twin/twins/${spaceId}`} className={cn("text-xs", twinAccent.link)}>
          Viewer
        </Link>
      </div>

      <ProgressionCompareViewer slideA={slide} slideB={compareSlide} />

      <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
        <div className="mb-2 flex items-center gap-2 text-xs text-zinc-300">
          <IconCalendar className={cn("size-4", twinAccent.text)} aria-hidden />
          <span className="font-medium">{slide.title}</span>
          <span className="text-zinc-500">{labels[index]}</span>
        </div>
        <input
          type="range"
          min={0}
          max={slides.length - 1}
          value={index}
          onChange={(e) => setIndex(Number(e.target.value))}
          className="w-full accent-[var(--twin360-blue)]"
          aria-label="Scrub capture date"
        />
        <div className="mt-1 flex justify-between text-[10px] text-zinc-500">
          <span>{labels[0]}</span>
          <span>{labels[labels.length - 1]}</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-zinc-500">Compare with:</span>
        <button
          type="button"
          onClick={() => setCompareIndex(null)}
          className={cn(
            "rounded-lg border px-2 py-1",
            compareIndex === null ? twinAccent.button : "border-white/10 text-zinc-400",
          )}
        >
          Off
        </button>
        {slides.map((s, i) =>
          i === index ? null : (
            <button
              key={s.modelId}
              type="button"
              onClick={() => setCompareIndex(i)}
              className={cn(
                "rounded-lg border px-2 py-1",
                compareIndex === i ? twinAccent.button : "border-white/10 text-zinc-400",
              )}
            >
              {labels[i]}
            </button>
          ),
        )}
      </div>
    </div>
  );
}
