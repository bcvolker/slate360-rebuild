"use client";

export type PayneTab = "items" | "plan" | "photos" | "walk" | "geometry";

const LABELS: Record<PayneTab, string> = {
  items: "Items",
  plan: "Plan",
  photos: "Photos",
  walk: "Walk",
  geometry: "Geometry",
};

export function PayneTabBar({
  tabs,
  active,
  onPick,
}: {
  tabs: PayneTab[];
  active: PayneTab;
  onPick: (tab: PayneTab) => void;
}) {
  return (
    <nav className="absolute inset-x-0 top-0 z-30 flex flex-wrap gap-1 px-3 pt-[max(0.5rem,env(safe-area-inset-top))]">
      {tabs.map((id) => (
        <button
          key={id}
          type="button"
          onClick={() => onPick(id)}
          className={`min-h-11 px-3 text-[12px] font-semibold uppercase tracking-wide ${
            active === id ? "text-[var(--twin360-blue)]" : "text-[var(--mkt-canvas)]/55"
          }`}
        >
          {LABELS[id]}
        </button>
      ))}
    </nav>
  );
}
