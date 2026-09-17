"use client";

import { PayneRoomPlan } from "@/components/splat-lab/PayneRoomPlan";

export function PaynePlanBoard({ planSrc: _planSrc }: { planSrc: string }) {
  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <PayneRoomPlan />
      <p className="mt-4 text-center text-[13px] text-[var(--mkt-canvas)]/70">
        Pink tables stay in 213. Tables on the left with arrows move to Sun Devil Hall.
      </p>
    </div>
  );
}
