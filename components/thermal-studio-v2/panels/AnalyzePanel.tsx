"use client";

import { useEffect, useState } from "react";
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

  // Ctrl/Cmd+Z (undo, +Shift for redo), Ctrl/Cmd+Y (redo), Delete/Backspace removes the selected measurement.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.shiftKey && e.key.toLowerCase() === "c") {
        e.preventDefault();
        clipboard.copySettings();
        return;
      }
      if (mod && e.shiftKey && e.key.toLowerCase() === "v") {
        e.preventDefault();
        void clipboard.pasteSettings();
        return;
      }
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) img.redo();
        else img.undo();
        return;
      }
      if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        img.redo();
        return;
      }
      if ((e.key === "Delete" || e.key === "Backspace") && img.selectedId) {
        e.preventDefault();
        img.deleteSpot(img.selectedId);
        return;
      }
      // [ ] step through the working set (V2.1 rule 0.3).
      if (e.key === "[") {
        e.preventDefault();
        step(-1);
        return;
      }
      if (e.key === "]") {
        e.preventDefault();
        step(1);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [img, scope, scopeIds, clipboard]);

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
          isotherm={img.isotherm}
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
                isotherm={img.isotherm}
                onIsothermChange={img.setIsotherm}
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
