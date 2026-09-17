"use client";

export function PaynePlanBoard({ planSrc }: { planSrc: string }) {
  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={planSrc} alt="Payne Hall 213 target layout" className="w-full invert" />
      <p className="mt-3 text-[13px] text-[var(--mkt-canvas)]/70">
        Pink tables stay in 213. Tables on the left with arrows move to Sun Devil Hall.
      </p>
    </div>
  );
}
