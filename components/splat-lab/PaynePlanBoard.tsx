"use client";

import type { PayneItem } from "@/lib/splat-lab/payne-items";
import { moveItems } from "@/lib/splat-lab/payne-items";

export function PaynePlanBoard({
  planSrc,
  items,
  showStay,
  selectedId,
  onPick,
}: {
  planSrc: string;
  items: PayneItem[];
  showStay: boolean;
  selectedId: string | null;
  onPick: (id: string) => void;
}) {
  const shown = showStay ? items : moveItems(items);
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={planSrc} alt="Brooke target layout for Payne 213" className="w-full" />
        {shown.map((item) => (
          <button
            key={item.id}
            type="button"
            title={item.label}
            onClick={() => onPick(item.id)}
            className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${item.fx * 100}%`, top: `${item.fy * 100}%` }}
          >
            <span
              className={`block h-3 w-3 ${
                item.action === "MOVE"
                  ? "bg-[var(--mkt-accent)]"
                  : "bg-[var(--mkt-canvas)]/70"
              } ${selectedId === item.id ? "ring-2 ring-[var(--mkt-canvas)]" : ""}`}
            />
          </button>
        ))}
      </div>
      <p className="mt-3 text-[13px] text-[var(--mkt-canvas)]/70">
        Marks are MOVE to Sun Devil Hall. Pink blocks on the drawing are tables that stay.
      </p>
    </div>
  );
}
