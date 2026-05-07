"use client";

import type { MouseEvent } from "react";
import { cn } from "@/lib/utils";
import type { SiteWalkPin } from "@/lib/types/site-walk";

export type PlanViewerPin = {
  id: string;
  x_pct: number;
  y_pct: number;
  session_id: string;
  label: string;
  amber: boolean;
  item_id: string | null;
};

export function PlanPin({ pin, active, current, onClick }: { pin: PlanViewerPin; active: boolean; current: boolean; onClick: (event: MouseEvent) => void }) {
  return (
    <button type="button" onClick={onClick} className={cn("absolute -translate-x-1/2 -translate-y-full p-2 transition-all duration-300", active ? "z-20 scale-125" : "z-10 hover:scale-110")} style={{ left: `${pin.x_pct}%`, top: `${pin.y_pct}%` }}>
      <span className="relative flex flex-col items-center">
        <span className={cn("flex h-8 w-8 items-center justify-center rounded-full border-2 shadow-xl shadow-black/50", current ? "border-amber-200 bg-amber-500 text-amber-950" : "border-slate-500 bg-slate-700 text-slate-300", active && current && "ring-4 ring-amber-500/30")}>
          <span className="text-[11px] font-black">{pin.label}</span>
        </span>
        <span className={cn("h-3 w-0.5 shadow-lg", current ? "bg-amber-500" : "bg-slate-700")} />
      </span>
    </button>
  );
}

export function mapPlanPin(row: SiteWalkPin, index: number, sessionId: string): PlanViewerPin {
  return {
    id: row.id,
    x_pct: row.x_pct,
    y_pct: row.y_pct,
    session_id: row.session_id ?? "",
    label: row.pin_number ? String(row.pin_number).padStart(2, "0") : String(index + 1).padStart(2, "0"),
    amber: row.session_id === sessionId,
    item_id: row.item_id ?? null,
  };
}

export function mergeFetchedPlanPins(current: PlanViewerPin[], fetched: PlanViewerPin[]) {
  const optimistic = current.filter((pin) => pin.amber && !isUuid(pin.id) && !fetched.some((saved) => samePoint(saved, pin)));
  return [...fetched, ...optimistic];
}

function samePoint(a: PlanViewerPin, b: PlanViewerPin) {
  return Math.abs(a.x_pct - b.x_pct) < 0.25 && Math.abs(a.y_pct - b.y_pct) < 0.25;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
