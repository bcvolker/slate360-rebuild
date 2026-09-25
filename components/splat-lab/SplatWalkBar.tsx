"use client";

/**
 * Homepage-matched chrome: cream glass, brand green accent, labeled controls.
 * Floats on the 3D stage so the model keeps the full viewport.
 */

export type SplatViewMode = "walk" | "dollhouse" | "plan";
export type WalkStride = "normal" | "leap";

const BTN =
  "flex min-h-[44px] items-center justify-center gap-1.5 px-2.5 text-[12px] font-semibold tracking-wide touch-manipulation sm:px-3.5 sm:text-[13px]";

export function SplatWalkBar({
  view,
  onView,
  stride,
  onStride,
  onReset,
  onZoomIn,
  onZoomOut,
  showPlan = true,
  showZoom = true,
  onFullscreen,
  fullscreen = false,
}: {
  view: SplatViewMode;
  onView: (view: SplatViewMode) => void;
  stride: WalkStride;
  onStride: (stride: WalkStride) => void;
  onReset: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  /** Plan needs a baked plan view; hide it where the model has none. */
  showPlan?: boolean;
  showZoom?: boolean;
  /** Present only where the browser allows element fullscreen (not iPhone Safari). */
  onFullscreen?: () => void;
  fullscreen?: boolean;
}) {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center px-3 pl-[max(3.5rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] sm:px-4"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0px))" }}
    >
      <div
        className="pointer-events-auto flex max-w-full flex-wrap items-stretch justify-center overflow-hidden rounded-[10px] border border-[var(--mkt-line)] bg-[var(--mkt-surface)]/92 shadow-[0_10px_26px_-12px_rgba(26,36,51,0.18)] backdrop-blur-sm"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <ModeBtn id="walk" label="Walk" on={view === "walk"} onClick={() => onView("walk")} />
        <ModeBtn id="dollhouse" label="Dollhouse" on={view === "dollhouse"} onClick={() => onView("dollhouse")} />
        {showPlan ? <ModeBtn id="plan" label="Plan" on={view === "plan"} onClick={() => onView("plan")} /> : null}
        {view === "walk" ? (
          <>
            <ModeBtn id="normal" label="Normal steps" on={stride === "normal"} onClick={() => onStride("normal")} />
            <ModeBtn
              id="leap"
              label="Leap ahead"
              on={stride === "leap"}
              onClick={() => onStride("leap")}
            />
          </>
        ) : null}
        {showZoom ? (
          <>
            <ModeBtn id="zin" label="Zoom in" on={false} onClick={onZoomIn} />
            <ModeBtn id="zout" label="Zoom out" on={false} onClick={onZoomOut} />
          </>
        ) : null}
        <ModeBtn id="reset" label="Reset" on={false} onClick={onReset} />
        {onFullscreen ? (
          <ModeBtn id="fullscreen" label={fullscreen ? "Exit full screen" : "Full screen"} on={false} onClick={onFullscreen} />
        ) : null}
      </div>
    </div>
  );
}

function ModeBtn({
  id,
  label,
  on,
  onClick,
}: {
  id: string;
  label: string;
  on: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      data-id={id}
      onClick={onClick}
      aria-label={label}
      aria-pressed={on}
      className={`${BTN} border-l border-[var(--mkt-line)] first:border-l-0 ${
        on
          ? "bg-[var(--mkt-accent)] text-white"
          : "text-[var(--mkt-ink)] hover:bg-[var(--mkt-accent-soft)]"
      }`}
    >
      {label}
    </button>
  );
}
