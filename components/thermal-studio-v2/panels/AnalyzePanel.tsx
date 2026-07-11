"use client";

import { useEffect, useMemo, useState } from "react";
import { computeAlarmBand } from "@/lib/thermal/alarm-band";
import { V2PanelFrame } from "@/components/thermal-studio-v2/V2PanelFrame";
import { AnalyzeCaptureStrip } from "@/components/thermal-studio-v2/panels/analyze/AnalyzeCaptureStrip";
import { AnalyzeViewer } from "@/components/thermal-studio-v2/panels/analyze/AnalyzeViewer";
import { AnalyzeCompareView } from "@/components/thermal-studio-v2/panels/analyze/AnalyzeCompareView";
import { AnalyzeToolbar } from "@/components/thermal-studio-v2/panels/analyze/AnalyzeToolbar";
import { AnalyzeDetailsRail } from "@/components/thermal-studio-v2/panels/analyze/AnalyzeDetailsRail";
import { KeepUndoToast } from "@/components/thermal-studio-v2/panels/analyze/KeepUndoToast";
import { useAnalyzeImage } from "@/components/thermal-studio-v2/lib/useAnalyzeImage";
import { useSettingsClipboardActions } from "@/components/thermal-studio-v2/lib/useSettingsClipboardActions";
import { useAnalyzeKeyboardShortcuts } from "@/components/thermal-studio-v2/lib/useAnalyzeKeyboardShortcuts";
import type { HoverInfo } from "@/components/thermal-studio-v2/panels/analyze/AnalyzeCanvas";
import type { useLibrarySelection } from "@/components/thermal-studio-v2/lib/useLibrarySelection";
import type { ThermalV2Capture, ThermalV2Scope } from "@/components/thermal-studio-v2/types";

/** Tab 2 — Analyze (doc §1, slice S3-S5): viewer core, measurement lifecycle, tuning + display + batch. */
export function AnalyzePanel({
  captures,
  selection,
  scope,
  registerEscapeHandler,
}: {
  captures: ThermalV2Capture[];
  selection: ReturnType<typeof useLibrarySelection>;
  scope: ThermalV2Scope;
  /** L1: lets the shell's Escape-cascade clear the selected measurement before it resets Scope. */
  registerEscapeHandler?: (handler: (() => boolean) | null) => void;
}) {
  const [openSection, setOpenSection] = useState("Measurements");
  // °F is the product default (Brian, 2026-07-07); the choice persists per
  // browser. Init "F" then hydrate from storage in an effect (SSR-safe).
  const [unit, setUnitState] = useState<"C" | "F">("F");
  useEffect(() => {
    if (window.localStorage.getItem("thermal-v2-unit") === "C") setUnitState("C");
  }, []);
  function setUnit(u: "C" | "F") {
    setUnitState(u);
    try {
      window.localStorage.setItem("thermal-v2-unit", u);
    } catch {
      // storage unavailable (private mode) — preference just won't persist
    }
  }
  const [hover, setHover] = useState<HoverInfo>(null);
  // The toolbar's readout + Enhance-here button use the LAST non-null hover
  // temp, not the live one: clicking that button requires moving the mouse
  // off the canvas toward the toolbar, which fires onMouseLeave (hover→null)
  // before the click lands — gating the button on live hover made it
  // disappear out from under every click, for a real user too, not just tests.
  const [lastHoverTemp, setLastHoverTemp] = useState<number | null>(null);
  function handleHoverChange(next: HoverInfo) {
    setHover(next);
    if (next) setLastHoverTemp(next.tempC);
  }
  // W2 Focus mode: collapses both rails + filmstrip for a maximum viewer.
  const [focusMode, setFocusMode] = useState(false);
  // S6.5 Compare view: enabled only when exactly 2 captures are selected.
  const [compareMode, setCompareMode] = useState(false);
  const [spanLock, setSpanLock] = useState(false);
  const compareIds = Array.from(selection.selectedIds);
  const canCompare = compareIds.length === 2;

  const activeId = selection.focusedId ?? captures[0]?.id ?? null;
  const activeCapture = captures.find((c) => c.id === activeId) ?? null;
  const activeIndex = captures.findIndex((c) => c.id === activeId);
  const img = useAnalyzeImage(activeCapture);

  // S5.6 alarm suite: caller-side band computed from the alarm mode + tuning,
  // fed straight into AnalyzeViewer's isotherm-style paint prop.
  const alarmBand = useMemo(
    () => (img.grid ? computeAlarmBand(img.alarm, img.tuning, img.grid.minC, img.grid.maxC) : null),
    [img.alarm, img.tuning, img.grid],
  );

  // W2 "View original": overrides palette/span to camera values and hides every
  // overlay (alarm band + measurements) — a pure presentation override, same
  // pattern as the A/B flicker paint override; nothing is persisted or undone.
  const viewOriginalPalette = img.viewOriginal ? "Iron" : img.displayPalette;
  const viewOriginalSpan = img.viewOriginal && img.rawGrid ? { lo: img.rawGrid.minC, hi: img.rawGrid.maxC } : img.displaySpan;
  const viewOriginalIsotherm = img.viewOriginal ? null : alarmBand;
  const viewOriginalSpots = img.viewOriginal ? [] : img.spots;

  // Exit Compare automatically if the selection stops being exactly 2 (e.g.
  // the operator picks a 3rd image, or clears selection from Library).
  useEffect(() => {
    if (compareMode && !canCompare) setCompareMode(false);
  }, [compareMode, canCompare]);

  useEffect(() => {
    setLastHoverTemp(null);
  }, [activeId]);

  function step(delta: number) {
    const next = captures[activeIndex + delta];
    if (next) selection.click(next.id, activeIndex + delta, {});
  }

  const scopeIds =
    scope.kind === "all"
      ? captures.map((c) => c.id)
      : scope.kind === "selected"
        ? captures.filter((c) => selection.selectedIds.has(c.id)).map((c) => c.id)
        : activeId
          ? [activeId]
          : [];

  function openCapture(id: string) {
    const index = captures.findIndex((c) => c.id === id);
    selection.click(id, index, {});
  }

  const clipboard = useSettingsClipboardActions(img, scope, scopeIds, captures);
  useAnalyzeKeyboardShortcuts({
    img,
    hover,
    clipboard,
    step,
    focusMode,
    onToggleFocusMode: () => setFocusMode((v) => !v),
  });

  // L1 Esc-cascade (Addendum C/W3): register "clear the selected measurement"
  // as this tab's local level of the shell's global Escape cascade — the
  // shell only falls through to resetting Scope when this returns false.
  useEffect(() => {
    if (!registerEscapeHandler) return;
    registerEscapeHandler(() => {
      if (img.selectedId) {
        img.setSelectedId(null);
        return true;
      }
      // S5.6 Enhance-here restore: Escape resets a customized span back to
      // full range before falling through to the Scope-pill reset.
      if (img.spanCustomized && img.grid) {
        img.setSpan({ lo: img.grid.minC, hi: img.grid.maxC });
        return true;
      }
      // W2 Focus mode: Esc exits it last, before falling through to the
      // Scope-pill reset (doc C1: "clear selection → collapse menus → exit
      // focus mode", in that order).
      if (focusMode) {
        setFocusMode(false);
        return true;
      }
      return false;
    });
    return () => registerEscapeHandler(null);
  }, [registerEscapeHandler, img, focusMode]);

  return (
    <>
    <V2PanelFrame
      toolbar={
        <AnalyzeToolbar
          palette={img.palette}
          onPaletteChange={img.setPalette}
          unit={unit}
          onUnitChange={setUnit}
          hoverTemp={lastHoverTemp}
          tool={img.tool}
          onToolChange={img.setTool}
          areaShape={img.areaShape}
          onAreaShapeChange={img.setAreaShape}
          canUndo={img.canUndo}
          canRedo={img.canRedo}
          onUndo={img.undo}
          onRedo={img.redo}
          imageIndex={activeIndex}
          imageCount={captures.length}
          onPrev={() => step(-1)}
          onNext={() => step(1)}
          onCopySettings={clipboard.copySettings}
          onPasteSettings={clipboard.pasteSettings}
          canPaste={clipboard.hasClip}
          onEnhanceHere={lastHoverTemp != null ? () => img.enhanceHere(lastHoverTemp) : undefined}
          displayTransform={img.transform}
          onRotate90={img.rotate90}
          onFlipHorizontal={img.flipHorizontal}
          onFlipVertical={img.flipVertical}
          onResetTransform={img.resetTransform}
          viewOriginal={img.viewOriginal}
          onViewOriginalStart={() => img.setViewOriginal(true)}
          onViewOriginalEnd={() => img.setViewOriginal(false)}
          focusMode={focusMode}
          onToggleFocusMode={() => setFocusMode((v) => !v)}
          canCompare={canCompare}
          compareMode={compareMode}
          onToggleCompare={() => setCompareMode((v) => !v)}
          spanLock={spanLock}
          onSpanLockChange={setSpanLock}
        />
      }
      center={
        compareMode ? (
          <AnalyzeCompareView
            captureA={captures.find((c) => c.id === compareIds[0]) ?? null}
            captureB={captures.find((c) => c.id === compareIds[1]) ?? null}
            palette={img.palette}
            unit={unit}
            spanLock={spanLock}
          />
        ) : (
          <AnalyzeViewer
            grid={img.grid}
            loading={img.loading}
            error={img.error}
            palette={img.palette}
            unit={unit}
            span={img.span}
            onSpanChange={img.setSpan}
            isotherm={viewOriginalIsotherm}
            localContrast={img.viewOriginal ? false : img.localContrast}
            displayPalette={viewOriginalPalette}
            displaySpan={viewOriginalSpan}
            displayTransform={img.transform}
            hover={hover}
            onHoverChange={handleHoverChange}
            spots={viewOriginalSpots}
            tool={img.tool}
            areaShape={img.areaShape}
            selectedId={img.selectedId}
            referenceId={img.referenceId}
            onSelect={img.setSelectedId}
            onCreateSpot={img.viewOriginal ? () => {} : img.createSpot}
            onCommitSpots={img.viewOriginal ? () => {} : img.commitSpots}
          />
        )
      }
      right={
        focusMode
          ? undefined
          : {
              title: "Details",
              content: (
                <AnalyzeDetailsRail
                  img={img}
                  unit={unit}
                  activeId={activeId}
                  activeCapture={activeCapture}
                  captures={captures}
                  scope={scope}
                  scopeIds={scopeIds}
                  openSection={openSection}
                  onOpenSectionChange={setOpenSection}
                />
              ),
            }
      }
      bottom={
        focusMode
          ? undefined
          : {
        title: "Filmstrip",
        compact: true,
        defaultSize: 20,
        content: (
          <AnalyzeCaptureStrip
            captures={captures}
            activeId={activeId}
            selectedIds={selection.selectedIds}
            onOpen={openCapture}
            onToggleSelect={(id) => selection.click(id, captures.findIndex((c) => c.id === id), { toggle: true })}
            layout="horizontal"
          />
        ),
      }
      }
    />
    {clipboard.pasteToast ? (
      <KeepUndoToast message={clipboard.pasteToast.message} onKeep={clipboard.keepPasteToast} onUndo={clipboard.undoPasteToast} />
    ) : null}
    </>
  );
}
