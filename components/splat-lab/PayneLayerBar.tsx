"use client";

export type PayneLayer = "scene" | "lidar" | "photos" | "layout" | "list";

const BTN =
  "flex min-h-[44px] items-center justify-center px-2.5 text-[12px] font-semibold tracking-wide touch-manipulation sm:px-3.5 sm:text-[13px]";

const LABELS: Record<PayneLayer, string> = {
  scene: "360",
  lidar: "LiDAR",
  photos: "Photos",
  layout: "Layout",
  list: "List",
};

export function PayneLayerBar({
  layers,
  active,
  onPick,
}: {
  layers: PayneLayer[];
  active: PayneLayer;
  onPick: (layer: PayneLayer) => void;
}) {
  return (
    <div className="pointer-events-auto flex max-w-full flex-wrap items-stretch justify-center overflow-hidden rounded-[10px] border border-[var(--mkt-line)] bg-[var(--mkt-surface)]/92 shadow-[0_10px_26px_-12px_rgba(26,36,51,0.18)] backdrop-blur-sm">
      {layers.map((id) => (
        <button
          key={id}
          type="button"
          aria-label={LABELS[id]}
          aria-pressed={active === id}
          onClick={() => onPick(id)}
          className={`${BTN} border-l border-[var(--mkt-line)] first:border-l-0 ${
            active === id
              ? "bg-[var(--mkt-accent)] text-white"
              : "text-[var(--mkt-ink)] hover:bg-[var(--mkt-accent-soft)]"
          }`}
        >
          {LABELS[id]}
        </button>
      ))}
    </div>
  );
}
