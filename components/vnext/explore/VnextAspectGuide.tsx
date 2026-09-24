"use client";

import type { SavedViewAspect } from "@/lib/vnext/views/saved-view-types";

const RATIO: Record<SavedViewAspect, string> = {
  "16:9": "16 / 9",
  "9:16": "9 / 16",
  "1:1": "1 / 1",
};

export function VnextAspectGuide({ aspect }: { aspect: SavedViewAspect }) {
  const wide = aspect === "16:9";
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center" data-vnext-aspect-guide={aspect}>
      <div
        className="border border-[var(--vnext-accent)]"
        style={{
          aspectRatio: RATIO[aspect],
          width: wide ? "100%" : "auto",
          height: wide ? "auto" : "100%",
          maxWidth: "100%",
          maxHeight: "100%",
        }}
      >
        <span className="absolute left-2 top-2 bg-[var(--vnext-surface)] px-2 py-1 text-[length:var(--vnext-meta)] text-[var(--vnext-ink)]">{aspect}</span>
      </div>
    </div>
  );
}
