"use client";

import { useState } from "react";
import { PALETTE_NAMES, fmtTemp } from "@/lib/thermal/probe-palettes";
import { AnalyzeMoreMenu } from "@/components/thermal-studio-v2/panels/analyze/AnalyzeMoreMenu";
import { AnalyzeViewControls } from "@/components/thermal-studio-v2/panels/analyze/AnalyzeViewControls";
import type { HoverInfo } from "@/components/thermal-studio-v2/panels/analyze/AnalyzeCanvas";
import type { ThermalV2DisplayTransform, ThermalV2Tool } from "@/components/thermal-studio-v2/types";

const TOOLS: { id: ThermalV2Tool; label: string; hint: string }[] = [
  { id: "move", label: "Move/Select", hint: "Select existing measurements to drag, resize, or delete" },
  { id: "point", label: "Point", hint: "Click the image to read one pixel's temperature" },
  { id: "area", label: "Area", hint: "Click the image to average a region's temperature" },
  { id: "line", label: "Line", hint: "Click the image to average along a line" },
  { id: "polygon", label: "Polygon", hint: "Click each corner, then Enter (or double-click) to close the shape" },
];

/**
 * One-row toolbar above the viewer. V2.1 §7 grouping: the measure→re-palette→
 * re-span loop lives in ONE left cluster (tools · palette · °C/°F · undo/redo);
 * the right side is navigation (‹ 3/24 ›) + the live cursor readout.
 */
export function AnalyzeToolbar({
  palette,
  onPaletteChange,
  unit,
  onUnitChange,
  hover,
  tool,
  onToolChange,
  areaShape,
  onAreaShapeChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  imageIndex,
  imageCount,
  onPrev,
  onNext,
  onCopySettings,
  onPasteSettings,
  canPaste,
  onEnhanceHere,
  displayTransform,
  onRotate90,
  onFlipHorizontal,
  onFlipVertical,
  onResetTransform,
  viewOriginal,
  onViewOriginalStart,
  onViewOriginalEnd,
  focusMode,
  onToggleFocusMode,
}: {
  palette: string;
  onPaletteChange: (p: string) => void;
  unit: "C" | "F";
  onUnitChange: (u: "C" | "F") => void;
  hover: HoverInfo;
  tool: ThermalV2Tool;
  onToolChange: (t: ThermalV2Tool) => void;
  areaShape: "box" | "circle";
  onAreaShapeChange: (s: "box" | "circle") => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  /** 0-based index of the open image in the working set. */
  imageIndex: number;
  imageCount: number;
  onPrev: () => void;
  onNext: () => void;
  /** W1 copy/paste settings (palette, span, tuning, alarm mode). */
  onCopySettings: () => void;
  onPasteSettings: () => void;
  canPaste: boolean;
  /** S5.6 Enhance-here (⌖ / E) — undefined while nothing is hovered. */
  onEnhanceHere?: () => void;
  /** S5.6 non-destructive rotate/flip (F1.2). */
  displayTransform?: ThermalV2DisplayTransform;
  onRotate90?: () => void;
  onFlipHorizontal?: () => void;
  onFlipVertical?: () => void;
  onResetTransform?: () => void;
  /** W2 "View original" — hold to temporarily view the untouched camera image. */
  viewOriginal: boolean;
  onViewOriginalStart: () => void;
  onViewOriginalEnd: () => void;
  /** W2 Focus mode — collapses both rails + filmstrip for a maximum viewer. */
  focusMode: boolean;
  onToggleFocusMode: () => void;
}) {
  const [shapeMenuOpen, setShapeMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  return (
    <div className="flex w-full items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <div className="inline-flex overflow-hidden rounded-md border border-[var(--mobile-app-card-border)] text-[11px]">
          {TOOLS.map((t) => (
            <span key={t.id} className="relative inline-flex">
              <button
                type="button"
                onClick={() => onToolChange(t.id)}
                title={t.id === "area" ? `${t.hint} — current shape: ${areaShape}` : t.hint}
                className={`px-2 py-1 font-medium ${
                  tool === t.id
                    ? "bg-[color-mix(in_srgb,var(--graphite-primary)_18%,transparent)] text-[var(--graphite-text-header)]"
                    : "text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)]"
                }`}
              >
                {t.id === "area" ? `Area ${areaShape === "circle" ? "○" : "□"}` : t.label}
              </button>
              {t.id === "area" ? (
                <button
                  type="button"
                  onClick={() => setShapeMenuOpen((v) => !v)}
                  title="Choose the area shape"
                  aria-expanded={shapeMenuOpen}
                  className="px-1 text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)]"
                >
                  ▾
                </button>
              ) : null}
            </span>
          ))}
        </div>
        {shapeMenuOpen ? (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShapeMenuOpen(false)} />
            <div className="absolute left-40 top-9 z-50 flex flex-col rounded-md border border-[var(--mobile-app-card-border)] bg-[var(--graphite-canvas)] p-1 text-[11px] shadow-lg">
              {(["box", "circle"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    onAreaShapeChange(s);
                    onToolChange("area");
                    setShapeMenuOpen(false);
                  }}
                  className={`rounded px-3 py-1 text-left ${
                    areaShape === s
                      ? "bg-[color-mix(in_srgb,var(--graphite-primary)_18%,transparent)] text-[var(--graphite-text-header)]"
                      : "text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)]"
                  }`}
                >
                  {s === "box" ? "□ Box" : "○ Circle"}
                </button>
              ))}
            </div>
          </>
        ) : null}
        <select
          value={palette}
          onChange={(e) => onPaletteChange(e.target.value)}
          title="Color palette"
          className="rounded-md border border-[var(--mobile-app-card-border)] bg-transparent px-1.5 py-0.5 text-[11px] text-[var(--graphite-text-header)]"
        >
          {PALETTE_NAMES.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <div className="relative">
          <button
            type="button"
            onClick={() => setMoreMenuOpen((v) => !v)}
            title="More display settings"
            aria-expanded={moreMenuOpen}
            aria-label="More display settings"
            className="rounded-md border border-[var(--mobile-app-card-border)] px-1.5 py-0.5 text-[11px] text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)]"
          >
            ⋯
          </button>
          {moreMenuOpen ? (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMoreMenuOpen(false)} />
              <AnalyzeMoreMenu
                unit={unit}
                onUnitChange={(u) => {
                  onUnitChange(u);
                  setMoreMenuOpen(false);
                }}
                displayTransform={displayTransform}
                onRotate90={onRotate90}
                onFlipHorizontal={onFlipHorizontal}
                onFlipVertical={onFlipVertical}
                onResetTransform={onResetTransform}
              />
            </>
          ) : null}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            className="rounded px-1.5 py-0.5 text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)] disabled:cursor-not-allowed disabled:opacity-30"
          >
            ↶
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Shift+Z)"
            className="rounded px-1.5 py-0.5 text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)] disabled:cursor-not-allowed disabled:opacity-30"
          >
            ↷
          </button>
        </div>
        <div className="flex items-center gap-1 border-l border-[var(--mobile-app-card-border)] pl-2">
          <button
            type="button"
            onClick={onCopySettings}
            title="Copy this image's palette, span, tuning, and alarm mode (Ctrl+Shift+C)"
            className="rounded px-1.5 py-0.5 text-[11px] text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)]"
          >
            ⧉ Copy
          </button>
          <button
            type="button"
            onClick={onPasteSettings}
            disabled={!canPaste}
            title={canPaste ? "Paste the copied look onto this scope (Ctrl+Shift+V)" : "Copy a look first"}
            className="rounded px-1.5 py-0.5 text-[11px] text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)] disabled:cursor-not-allowed disabled:opacity-30"
          >
            ⧉ Paste
          </button>
        </div>
        <AnalyzeViewControls
          viewOriginal={viewOriginal}
          onViewOriginalStart={onViewOriginalStart}
          onViewOriginalEnd={onViewOriginalEnd}
          focusMode={focusMode}
          onToggleFocusMode={onToggleFocusMode}
        />
      </div>
      <div className="flex items-center gap-2">
        {hover ? (
          <>
            <span className="text-[11px] font-semibold tabular-nums text-[var(--graphite-text-header)]">
              {fmtTemp(hover.tempC, unit)}
            </span>
            <button
              type="button"
              onClick={onEnhanceHere}
              title="Enhance here — center the display span on this temperature (E)"
              className="rounded px-1.5 py-0.5 text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)]"
            >
              ⌖
            </button>
          </>
        ) : null}
        {imageCount > 0 ? (
          <div className="flex items-center gap-1 text-[11px] text-[var(--graphite-muted)]">
            <button
              type="button"
              onClick={onPrev}
              disabled={imageIndex <= 0}
              title="Previous image ( [ )"
              className="rounded px-1.5 py-0.5 hover:text-[var(--graphite-text-header)] disabled:cursor-not-allowed disabled:opacity-30"
            >
              ‹
            </button>
            <span className="tabular-nums">
              {imageIndex + 1}/{imageCount}
            </span>
            <button
              type="button"
              onClick={onNext}
              disabled={imageIndex >= imageCount - 1}
              title="Next image ( ] )"
              className="rounded px-1.5 py-0.5 hover:text-[var(--graphite-text-header)] disabled:cursor-not-allowed disabled:opacity-30"
            >
              ›
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
