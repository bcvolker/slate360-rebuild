"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { EditorBlock } from "@/lib/types/blocks";
import { cn } from "@/lib/utils";

/**
 * Cinematic click-through slideshow for a shared deliverable — dark full-screen presentation (like a video player; deliberately not the light page chrome),
 * one block per slide, keyboard + tap navigation. Matches the app design system.
 */
export function DeliverableSlideshow({
  title,
  blocks,
  onClose,
}: {
  title: string;
  blocks: EditorBlock[];
  onClose: () => void;
}) {
  const slides = blocks.filter((b) => b.type !== "divider");
  const [index, setIndex] = useState(0);
  const count = slides.length;

  const go = useCallback(
    (delta: number) => setIndex((p) => Math.min(Math.max(p + delta, 0), count - 1)),
    [count],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") go(1);
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, onClose]);

  if (count === 0) return null;
  const slide = slides[index];
  const atStart = index === 0;
  const atEnd = index === count - 1;

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-black [-webkit-user-select:none] select-none">
      {/* Header */}
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <p className="truncate text-sm font-semibold text-white">{title}</p>
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs tabular-nums text-white/60">
            {index + 1} / {count}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close slideshow"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/60 transition-colors hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Stage */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-4 py-6 sm:px-16">
        {/* Tap zones */}
        <button type="button" aria-label="Previous" onClick={() => go(-1)} disabled={atStart} className="absolute inset-y-0 left-0 z-10 w-1/4 cursor-w-resize disabled:cursor-default" />
        <button type="button" aria-label="Next" onClick={() => go(1)} disabled={atEnd} className="absolute inset-y-0 right-0 z-10 w-1/4 cursor-e-resize disabled:cursor-default" />

        <SlideContent block={slide} />

        {/* Arrow buttons */}
        <button
          type="button"
          onClick={() => go(-1)}
          disabled={atStart}
          aria-label="Previous slide"
          className="absolute left-3 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/85 transition-opacity hover:bg-white/10 disabled:opacity-30 sm:flex"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => go(1)}
          disabled={atEnd}
          aria-label="Next slide"
          className="absolute right-3 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/85 transition-opacity hover:bg-white/10 disabled:opacity-30 sm:flex"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Dots */}
      <footer className="flex shrink-0 items-center justify-center gap-1.5 px-4 py-4">
        {slides.map((s, i) => (
          <button
            key={s.id}
            type="button"
            aria-label={`Go to slide ${i + 1}`}
            onClick={() => setIndex(i)}
            className={cn(
              "h-1.5 rounded-sm transition-all",
              i === index ? "w-6 bg-[var(--portal-accent)]" : "w-1.5 bg-white/20 hover:bg-white/40",
            )}
          />
        ))}
      </footer>
    </div>
  );
}

function SlideContent({ block }: { block: EditorBlock }) {
  switch (block.type) {
    case "image":
      return (
        <figure className="flex h-full max-h-full w-full max-w-5xl flex-col items-center justify-center gap-3">
          {block.src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={block.src} alt={block.alt || "Slide"} className="max-h-[78vh] w-auto max-w-full rounded-2xl object-contain" />
          ) : (
            <div className="flex aspect-video w-full max-w-2xl items-center justify-center rounded-2xl bg-white/[0.04]">
              <span className="text-xs text-white/60">Image unavailable</span>
            </div>
          )}
          {block.caption ? (
            <figcaption className="max-w-2xl text-center text-sm text-white/60">{block.caption}</figcaption>
          ) : null}
        </figure>
      );
    case "heading":
      return (
        <h2 className="max-w-3xl text-center text-3xl font-bold text-white sm:text-4xl">
          {block.content}
        </h2>
      );
    case "callout":
    case "text":
      return (
        <p className="max-w-2xl whitespace-pre-wrap text-center text-lg leading-relaxed text-white/85">
          {block.content}
        </p>
      );
    default:
      return null;
  }
}
