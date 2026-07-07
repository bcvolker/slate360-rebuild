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
import { useAnalyzeImage } from "@/components/thermal-studio-v2/lib/useAnalyzeImage";
import type { HoverInfo } from "@/components/thermal-studio-v2/panels/analyze/AnalyzeCanvas";
import type { useLibrarySelection } from "@/components/thermal-studio-v2/lib/useLibrarySelection";
import type { ThermalV2Capture, ThermalV2Scope } from "@/components/thermal-studio-v2/types";

/** Tab 2 — Analyze (doc §1, slice S3-S5): viewer core, measurement lifecycle, tuning + display + batch. */
export function AnalyzePanel({
  captures,
  selection,
  scope,
}: {
  captures: ThermalV2Capture[];
  selection: ReturnType<typeof useLibrarySelection>;
  scope: ThermalV2Scope;
}) {
  const [palette, setPalette] = useState("Iron");
  const [unit, setUnit] = useState<"C" | "F">("C");
  const [hover, setHover] = useState<HoverInfo>(null);

  const activeId = selection.focusedId ?? captures[0]?.id ?? null;
  const activeCapture = captures.find((c) => c.id === activeId) ?? null;
  const img = useAnalyzeImage(activeCapture);

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

  // Ctrl/Cmd+Z (undo, +Shift for redo), Ctrl/Cmd+Y (redo), Delete/Backspace removes the selected measurement.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      const mod = e.ctrlKey || e.metaKey;
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
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [img]);

  return (
    <V2PanelFrame
      toolbar={
        <AnalyzeToolbar
          palette={palette}
          onPaletteChange={setPalette}
          unit={unit}
          onUnitChange={setUnit}
          hover={hover}
          tool={img.tool}
          onToolChange={img.setTool}
          canUndo={img.canUndo}
          canRedo={img.canRedo}
          onUndo={img.undo}
          onRedo={img.redo}
        />
      }
      left={{
        title: "Working set",
        content: (
          <AnalyzeCaptureStrip
            captures={captures}
            activeId={activeId}
            selectedIds={selection.selectedIds}
            onOpen={openCapture}
            onToggleSelect={(id) => selection.click(id, captures.findIndex((c) => c.id === id), { toggle: true })}
            layout="vertical"
          />
        ),
      }}
      center={
        <AnalyzeViewer
          grid={img.grid}
          loading={img.loading}
          error={img.error}
          palette={palette}
          unit={unit}
          span={img.span}
          onSpanChange={img.setSpan}
          isotherm={img.isotherm}
          hover={hover}
          onHoverChange={setHover}
          spots={img.spots}
          tool={img.tool}
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
          <div className="flex h-full flex-col overflow-y-auto">
            <AnalyzeAccordion title="Measurements" defaultOpen>
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
              />
            </AnalyzeAccordion>
            <AnalyzeAccordion title="Tuning">
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
            <AnalyzeAccordion title="Display">
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
            <AnalyzeAccordion title="Notes & photo data">
              <div className="p-2 text-xs text-[var(--graphite-muted)]">Findings note + camera/sensor data (later slice).</div>
            </AnalyzeAccordion>
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
  );
}
