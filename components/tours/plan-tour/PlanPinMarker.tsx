"use client";

/**
 * Numbered pin on the plan sheet — matches the authoring-side TourPlanTab.tsx
 * pin shape (rounded-sm square, not a circle) for visual consistency between
 * authoring and recipient views. "Accent pulse" is implemented as a looping
 * border-opacity keyframe (see globals below), never a blurred glow — the
 * design system bans glow effects outright.
 */
export function PlanPinMarker({
  pinNumber,
  xPct,
  yPct,
  isActive,
  onClick,
  reducedMotion,
}: {
  pinNumber: number;
  xPct: number;
  yPct: number;
  isActive: boolean;
  onClick: () => void;
  reducedMotion: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Open scene at pin ${pinNumber}`}
      style={{ left: `${xPct}%`, top: `${yPct}%` }}
      className={[
        "absolute flex size-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center",
        "rounded-sm bg-[var(--graphite-primary)] text-xs font-bold text-black",
        "border-2",
        isActive ? "border-white" : "border-transparent",
        reducedMotion ? "" : "transition-transform duration-[120ms] ease-out hover:scale-[1.08]",
        isActive && !reducedMotion ? "animate-tour-pin-pulse" : "",
      ].join(" ")}
    >
      {pinNumber}
    </button>
  );
}
