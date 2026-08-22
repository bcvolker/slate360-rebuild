"use client";

/**
 * M6 — the walkthrough control bar.
 *
 * Purely presentational: it owns no camera state, only reports intent. Sized
 * for a gloved thumb on a job site (44 px minimum targets) and positioned
 * absolutely within the viewer panel rather than fixed to the window, so the
 * viewer can be embedded in a client portal without the bar escaping it.
 */

import type { ReactElement } from "react";

import type { FloorInfo, ViewMode } from "@/lib/digital-twin/walkthrough-navigation";

export type WalkthroughControlsProps = {
  mode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  floors: FloorInfo[];
  currentFloorIndex: number;
  onFloorChange: (index: number) => void;
  measureActive: boolean;
  onToggleMeasure: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
};

const MODES: { id: ViewMode; label: string }[] = [
  { id: "inside", label: "Inside" },
  { id: "dollhouse", label: "Dollhouse" },
  { id: "floorplan", label: "Floor plan" },
];

const BUTTON =
  "flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 px-3 text-xs font-medium uppercase tracking-wide transition-colors";

function IconInside(): ReactElement {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M3 21h18M5 21V8l7-5 7 5v13" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 21v-6h4v6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconDollhouse(): ReactElement {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M12 3l9 5-9 5-9-5 9-5z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 13l9 5 9-5M3 8v5m18-5v5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconFloorplan(): ReactElement {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="1" />
      <path d="M3 10h7m0-7v18m4-11h7" strokeLinecap="round" />
    </svg>
  );
}

function IconMeasure(): ReactElement {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M3 15l12-12 6 6-12 12-6-6z" strokeLinejoin="round" />
      <path d="M7 11l2 2m2-6l2 2m2-6l2 2" strokeLinecap="round" />
    </svg>
  );
}

function IconFullscreen({ active }: { active: boolean }): ReactElement {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      {active ? (
        <path d="M9 3v6H3m12-6v6h6M9 21v-6H3m12 6v-6h6" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="M3 9V3h6M21 9V3h-6M3 15v6h6m12-6v6h-6" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
}

const MODE_ICONS: Record<ViewMode, () => ReactElement> = {
  inside: IconInside,
  dollhouse: IconDollhouse,
  floorplan: IconFloorplan,
};

export function WalkthroughControls({
  mode,
  onModeChange,
  floors,
  currentFloorIndex,
  onFloorChange,
  measureActive,
  onToggleMeasure,
  isFullscreen,
  onToggleFullscreen,
}: WalkthroughControlsProps): ReactElement {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center px-4"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)" }}
    >
      {/* Swallow pointer events here as well as checking the target on the
          canvas side. Belt and braces: a press that lands on this bar must
          never also register as a click on the model. */}
      <div
        className="pointer-events-auto flex items-stretch overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] backdrop-blur-xl"
        onPointerDown={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
      >
        {MODES.map(({ id, label }) => {
          const Icon = MODE_ICONS[id];
          const active = mode === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onModeChange(id)}
              aria-label={label}
              aria-pressed={active}
              className={`${BUTTON} ${
                active
                  ? "bg-white/[0.06] text-[var(--twin360-blue)]"
                  : "text-white/60 hover:text-white/90"
              }`}
            >
              <Icon />
              <span className="hidden sm:inline">{label}</span>
            </button>
          );
        })}

        {floors.length > 1 ? (
          <label className="flex items-center border-l border-white/10">
            <span className="sr-only">Floor</span>
            <select
              value={currentFloorIndex}
              onChange={(event) => onFloorChange(Number(event.target.value))}
              aria-label="Select floor"
              className="min-h-[44px] cursor-pointer bg-transparent px-3 text-xs font-medium uppercase tracking-wide text-white/80 outline-none focus-visible:text-[var(--twin360-blue)]"
            >
              {floors.map((floor) => (
                <option key={floor.index} value={floor.index} className="bg-[var(--background)]">
                  {floor.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <button
          type="button"
          onClick={onToggleMeasure}
          aria-label="Measure"
          aria-pressed={measureActive}
          className={`${BUTTON} border-l border-white/10 ${
            measureActive ? "text-[var(--twin360-blue)]" : "text-white/60 hover:text-white/90"
          }`}
        >
          <IconMeasure />
        </button>

        <button
          type="button"
          onClick={onToggleFullscreen}
          aria-label={isFullscreen ? "Exit full screen" : "Full screen"}
          aria-pressed={isFullscreen}
          className={`${BUTTON} border-l border-white/10 text-white/60 hover:text-white/90`}
        >
          <IconFullscreen active={isFullscreen} />
        </button>
      </div>
    </div>
  );
}
