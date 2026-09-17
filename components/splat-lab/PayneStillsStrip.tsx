"use client";

import { useState } from "react";

export type PayneStill = { id: number; src: string; source: string };

export function PayneStillsStrip({
  stills,
  captured,
}: {
  stills: PayneStill[];
  captured?: number;
}) {
  const [open, setOpen] = useState<PayneStill | null>(stills[0] ?? null);
  if (!stills.length) {
    return (
      <p className="px-5 py-8 text-[13px] text-[var(--mkt-canvas)]/70">
        Phone stills are not on this link yet.
      </p>
    );
  }
  const total = captured && captured > stills.length ? captured : stills.length;
  return (
    <div className="flex h-full min-h-0 flex-col px-3 pb-4">
      {open ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={open.src} alt={open.source} className="max-h-[55vh] w-full object-contain" />
      ) : null}
      <p className="mt-2 px-2 text-[12px] text-[var(--mkt-canvas)]/65">
        iPhone stills from the same walk as the LiDAR. Showing {stills.length} of {total} frames.
      </p>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
        {stills.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setOpen(s)}
            className={`h-16 w-24 shrink-0 overflow-hidden border ${
              open?.id === s.id ? "border-[var(--mkt-accent)]" : "border-white/10"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s.src} alt="" className="h-full w-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}
