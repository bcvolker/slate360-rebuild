// Preview harness for the deliverable slideshow (no login). Mock blocks.
"use client";

import { useState } from "react";
import { DeliverableSlideshow } from "@/components/external-portal/DeliverableSlideshow";
import type { EditorBlock } from "@/lib/types/blocks";

const BLOCKS: EditorBlock[] = [
  { id: "1", type: "heading", level: 1, content: "Oak Ridge Roof — Inspection" } as EditorBlock,
  { id: "2", type: "image", src: "https://picsum.photos/seed/roof1/1200/800", alt: "Roof", caption: "North slope membrane lifting" } as EditorBlock,
  { id: "3", type: "text", content: "Several seams show separation along the north edge; recommend resealing before the rainy season." } as EditorBlock,
  { id: "4", type: "image", src: "https://picsum.photos/seed/roof2/1200/800", alt: "Drain", caption: "Blocked scupper drain" } as EditorBlock,
];

export default function DeliverableSlideshowPreview() {
  const [open, setOpen] = useState(true);
  return (
    <div className="min-h-screen bg-[var(--graphite-canvas)] p-6">
      <button type="button" onClick={() => setOpen(true)} className="rounded-xl bg-[var(--graphite-primary)] px-4 py-2 text-sm font-semibold text-[var(--graphite-canvas)]">
        Open slideshow
      </button>
      {open ? <DeliverableSlideshow title="Oak Ridge Roof — Inspection" blocks={BLOCKS} onClose={() => setOpen(false)} /> : null}
    </div>
  );
}
