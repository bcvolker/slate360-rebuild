"use client";

import { AnalyzeMiniSummary } from "@/components/thermal-studio-v2/panels/analyze/AnalyzeMiniSummary";
import { AnalyzeAccordion } from "@/components/thermal-studio-v2/panels/analyze/AnalyzeAccordion";
import { AnalyzeMeasurements } from "@/components/thermal-studio-v2/panels/analyze/AnalyzeMeasurements";
import { AnalyzeTuning } from "@/components/thermal-studio-v2/panels/analyze/AnalyzeTuning";
import { AnalyzeDisplay } from "@/components/thermal-studio-v2/panels/analyze/AnalyzeDisplay";
import { AnalyzeNotes } from "@/components/thermal-studio-v2/panels/analyze/AnalyzeNotes";
import { useAnalyzeImage } from "@/components/thermal-studio-v2/lib/useAnalyzeImage";
import type { ThermalV2Capture, ThermalV2Scope } from "@/components/thermal-studio-v2/types";

/** Analyze's right rail — Measurements/Tuning/Display/Notes accordions. Extracted from AnalyzePanel for the file-size gate. */
export function AnalyzeDetailsRail({
  img,
  unit,
  activeId,
  activeCapture,
  captures,
  scope,
  scopeIds,
  openSection,
  onOpenSectionChange,
}: {
  img: ReturnType<typeof useAnalyzeImage>;
  unit: "C" | "F";
  activeId: string | null;
  activeCapture: ThermalV2Capture | null;
  captures: ThermalV2Capture[];
  scope: ThermalV2Scope;
  scopeIds: string[];
  openSection: string;
  onOpenSectionChange: (next: string) => void;
}) {
  function toggle(section: string) {
    onOpenSectionChange(openSection === section ? "" : section);
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <AnalyzeMiniSummary temps={img.grid?.temps ?? null} unit={unit} />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <AnalyzeAccordion title="Measurements" open={openSection === "Measurements"} onToggle={() => toggle("Measurements")}>
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
        <AnalyzeAccordion title="Tuning" open={openSection === "Tuning"} onToggle={() => toggle("Tuning")}>
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
        <AnalyzeAccordion title="Display" open={openSection === "Display"} onToggle={() => toggle("Display")}>
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
        <AnalyzeAccordion title="Notes & photo data" open={openSection === "Notes & photo data"} onToggle={() => toggle("Notes & photo data")}>
          <AnalyzeNotes capture={activeCapture} />
        </AnalyzeAccordion>
      </div>
    </div>
  );
}
