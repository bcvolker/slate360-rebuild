"use client";

import { useEffect, useMemo, useState } from "react";
import { computeAlarmBand } from "@/lib/thermal/alarm-band";
import { V2PanelFrame } from "@/components/thermal-studio-v2/V2PanelFrame";
import { AnalyzeCaptureStrip } from "@/components/thermal-studio-v2/panels/analyze/AnalyzeCaptureStrip";
import { AnalyzeViewer } from "@/components/thermal-studio-v2/panels/analyze/AnalyzeViewer";
import { AnalyzeToolbar } from "@/components/thermal-studio-v2/panels/analyze/AnalyzeToolbar";
import { AnalyzeMeasurements } from "@/components/thermal-studio-v2/panels/analyze/AnalyzeMeasurements";
import { AnalyzeTuning } from "@/components/thermal-studio-v2/panels/analyze/AnalyzeTuning";
import { AnalyzeDisplay } from "@/components/thermal-studio-v2/panels/analyze/AnalyzeDisplay";
import { AnalyzeAccordion } from "@/components/thermal-studio-v2/panels/analyze/AnalyzeAccordion";
import { AnalyzeNotes } from "@/components/thermal-studio-v2/panels/analyze/AnalyzeNotes";
import { AnalyzeMiniSummary } from "@/components/thermal-studio-v2/panels/analyze/AnalyzeMiniSummary";
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
  useAnalyzeKeyboardShortcuts({ img, hover, clipboard, step });

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
      return false;
    });
    return () => registerEscapeHandler(null);
  }, [registerEscapeHandler, img]);

  return (
    <>
    <V2PanelFrame
      toolbar={
        <AnalyzeToolbar
          palette={img.palette}
          onPaletteChange={img.setPalette}
          unit={unit}
          onUnitChange={setUnit}
          hover={hover}
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
          onEnhanceHere={hover ? () => img.enhanceHere(hover.tempC) : undefined}
        />
      }
      center={
        <AnalyzeViewer
          grid={img.grid}
          loading={img.loading}
          error={img.error}
          palette={img.palette}
          unit={unit}
          span={img.span}
          onSpanChange={img.setSpan}
          isotherm={alarmBand}
          localContrast={img.localContrast}
          displayPalette={img.displayPalette}
          displaySpan={img.displaySpan}
          hover={hover}
          onHoverChange={setHover}
          spots={img.spots}
          tool={img.tool}
          areaShape={img.areaShape}
          selectedId={img.selectedId}
          referenceId={img.referenceId}
          onSelect={img.setSelectedId}
          onCreateSpot={img.createSpot}
          onCommitSpots={img.commitSpots}
        />
      }
      right={{
        title: "Details",
        content: (
          <div className="flex h-full flex-col overflow-hidden">
            <AnalyzeMiniSummary temps={img.grid?.temps ?? null} unit={unit} />
            <div className="min-h-0 flex-1 overflow-y-auto">
            <AnalyzeAccordion
              title="Measurements"
              open={openSection === "Measurements"}
              onToggle={() => setOpenSection((s) => (s === "Measurements" ? "" : "Measurements"))}
            >
              <AnalyzeMeasurements
                spots={img.spots}
                grid={img.grid}
                unit={unit}
                referenceId={img.referenceId}
                selectedId={img.selectedId}
                onSelect={img.setSelectedId}
                onSetReference={img.setReferenceId}
                onRename={img.renameSpot}
                onDelete={img.deleteSpot}
                onMarkExtreme={img.markExtreme}
                comparePair={img.comparePair}
                pendingCompareId={img.pendingCompareId}
                onToggleCompare={img.toggleCompare}
                onClearCompare={img.clearCompare}
                severityBands={img.severityBands}
              />
            </AnalyzeAccordion>
            <AnalyzeAccordion
              title="Tuning"
              open={openSection === "Tuning"}
              onToggle={() => setOpenSection((s) => (s === "Tuning" ? "" : "Tuning"))}
            >
              <AnalyzeTuning
                captureId={activeId}
                captures={captures}
                tuning={img.tuning}
                baseEmissivity={img.baseEmissivity}
                onTuningChange={img.setTuning}
                scope={scope}
                scopeIds={scopeIds}
              />
            </AnalyzeAccordion>
            <AnalyzeAccordion
              title="Display"
              open={openSection === "Display"}
              onToggle={() => setOpenSection((s) => (s === "Display" ? "" : "Display"))}
            >
              <AnalyzeDisplay
                temps={img.grid?.temps ?? null}
                span={img.span}
                gridMin={img.grid?.minC ?? 0}
                gridMax={img.grid?.maxC ?? 1}
                unit={unit}
                onSpanChange={img.setSpan}
                alarm={img.alarm}
                onAlarmChange={img.setAlarm}
                tuning={img.tuning}
                severityBands={img.severityBands}
                onSeverityBandsChange={img.setSeverityBands}
                localContrast={img.localContrast}
                onLocalContrastChange={img.setLocalContrast}
                hasFlickerA={!!img.flickerA}
                hasFlickerB={!!img.flickerB}
                flickerShowing={img.flickerShowing}
                autoFlicker={img.autoFlicker}
                onAutoFlickerChange={img.setAutoFlicker}
                onSnapshotFlickerA={img.snapshotFlickerA}
                onSnapshotFlickerB={img.snapshotFlickerB}
                onToggleFlickerView={img.toggleFlickerView}
                onClearFlicker={img.clearFlicker}
              />
            </AnalyzeAccordion>
            <AnalyzeAccordion
              title="Notes & photo data"
              open={openSection === "Notes & photo data"}
              onToggle={() => setOpenSection((s) => (s === "Notes & photo data" ? "" : "Notes & photo data"))}
            >
              <AnalyzeNotes capture={activeCapture} />
            </AnalyzeAccordion>
            </div>
          </div>
        ),
      }}
      bottom={{
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
      }}
    />
    {clipboard.pasteToast ? (
      <KeepUndoToast message={clipboard.pasteToast.message} onKeep={clipboard.keepPasteToast} onUndo={clipboard.undoPasteToast} />
    ) : null}
    </>
  );
}
