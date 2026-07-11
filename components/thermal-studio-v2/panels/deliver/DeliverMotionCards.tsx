"use client";

import type { MotionMode } from "@/components/thermal-studio-v2/lib/motion-api";

/** Deliver's quiet "Motion" section (doc D4): two cards, deliberately tucked away — few users need it. */
export function DeliverMotionCards({ frameCount, onOpen }: { frameCount: number; onOpen: (mode: MotionMode) => void }) {
  const cards: { mode: MotionMode; title: string; hint: string }[] = [
    { mode: "timelapse", title: "Timelapse Builder", hint: "Condense a long capture window into a short MP4 (e.g. 6 hours → 30s)" },
    { mode: "video", title: "Video Trim", hint: "Trim, retime, and export a clip from this session's frames" },
  ];
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--graphite-muted)]">Motion ({frameCount} frames available)</span>
      {cards.map((c) => (
        <button
          key={c.mode}
          type="button"
          onClick={() => onOpen(c.mode)}
          disabled={frameCount < 1}
          className="flex flex-col rounded-md border border-[var(--mobile-app-card-border)] p-3 text-left hover:border-[var(--graphite-primary)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <span className="text-sm font-semibold text-[var(--graphite-text-header)]">{c.title}</span>
          <span className="mt-0.5 text-xs text-[var(--graphite-muted)]">{c.hint}</span>
        </button>
      ))}
    </div>
  );
}
