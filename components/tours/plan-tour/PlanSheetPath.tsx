"use client";

/** Path through plan pins, in the same percent space as the pin markers. */
export function PlanSheetPath({ points }: { points: Array<{ u: number; v: number }> }) {
  if (points.length < 2) return null;
  const d = points.map((point, index) => `${index ? "L" : "M"}${point.u} ${point.v}`).join(" ");
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden="true" data-testid="plan-sheet-path">
      <path d={d} fill="none" stroke="white" strokeWidth={0.012} strokeLinejoin="round" strokeLinecap="round" />
      <path d={d} fill="none" stroke="var(--graphite-primary)" strokeWidth={0.006} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
