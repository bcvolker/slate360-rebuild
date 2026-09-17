"use client";

import { useMemo, useState } from "react";
import type { PayneItem } from "@/lib/splat-lab/payne-items";
import { moveItems, stayItems } from "@/lib/splat-lab/payne-items";

export function PayneItemList({
  items,
  onPick,
  selectedId,
  chrome = true,
}: {
  items: PayneItem[];
  onPick: (id: string) => void;
  selectedId: string | null;
  chrome?: boolean;
}) {
  const [showStay, setShowStay] = useState(false);
  const move = useMemo(() => moveItems(items), [items]);
  const stay = useMemo(() => stayItems(items), [items]);
  const shown = showStay ? items : move;
  const picked = items.find((i) => i.id === selectedId) ?? null;

  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--graphite-canvas)] text-[var(--mkt-canvas)]">
      {chrome ? (
      <header className="shrink-0 px-5 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--mkt-accent)]">
          Payne Hall 213
        </p>
        <h1 className="font-serif text-2xl font-normal">Furniture Move</h1>
        <p className="mt-1 text-[13px] text-[var(--mkt-canvas)]/70">
          {move.length} items to move · {stay.length} tables stay
        </p>
        <button
          type="button"
          onClick={() => setShowStay((v) => !v)}
          className="mt-3 min-h-11 text-left text-[13px] font-semibold text-[var(--mkt-accent)]"
        >
          {showStay ? "Hide stay tables" : "Show stay tables"}
        </button>
      </header>
      ) : (
      <header className="shrink-0 px-5 pb-2 pt-2">
        <p className="text-[13px] text-[var(--mkt-canvas)]/70">
          {move.length} items to move · {stay.length} tables stay
        </p>
        <button
          type="button"
          onClick={() => setShowStay((v) => !v)}
          className="mt-2 min-h-11 text-left text-[13px] font-semibold text-[var(--mkt-accent)]"
        >
          {showStay ? "Hide stay tables" : "Show stay tables"}
        </button>
      </header>
      )}
      <ul className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        {shown.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onPick(item.id)}
              className={`mb-1 flex min-h-14 w-full items-start gap-3 rounded-[10px] px-3 py-3 text-left ${
                selectedId === item.id ? "bg-white/10" : "bg-white/[0.04]"
              }`}
            >
              <span
                className={`mt-1 h-2 w-2 shrink-0 ${
                  item.action === "MOVE"
                    ? "bg-[var(--mkt-accent)]"
                    : "bg-[var(--mkt-canvas)]/40"
                }`}
              />
              <span>
                <span className="block text-[14px] font-semibold">{item.label}</span>
                <span className="block text-[12px] text-[var(--mkt-canvas)]/65">
                  {item.action === "MOVE" ? `Move · ${item.destination}` : "Stay in 213"}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      {picked ? (
        <aside className="shrink-0 border-t border-white/10 px-5 py-4">
          <p className="text-[14px] font-semibold">{picked.label}</p>
          <p className="text-[12px] text-[var(--mkt-canvas)]/70">
            {picked.action === "MOVE" ? `Move to ${picked.destination}` : "Stays in Payne 213"}
          </p>
        </aside>
      ) : null}
    </div>
  );
}
