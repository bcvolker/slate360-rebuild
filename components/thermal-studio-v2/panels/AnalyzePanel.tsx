"use client";

import { useState } from "react";
import { V2PanelFrame } from "@/components/thermal-studio-v2/V2PanelFrame";
import { AnalyzeCaptureStrip } from "@/components/thermal-studio-v2/panels/analyze/AnalyzeCaptureStrip";
import { AnalyzeViewer } from "@/components/thermal-studio-v2/panels/analyze/AnalyzeViewer";
import { AnalyzeToolbar } from "@/components/thermal-studio-v2/panels/analyze/AnalyzeToolbar";
import { PlaceholderZone } from "@/components/thermal-studio-v2/panels/PlaceholderZone";
import type { HoverInfo } from "@/components/thermal-studio-v2/panels/analyze/AnalyzeCanvas";
import type { useLibrarySelection } from "@/components/thermal-studio-v2/lib/useLibrarySelection";
import type { ThermalV2Capture } from "@/components/thermal-studio-v2/types";

/** Tab 2 — Analyze (doc §1, slice S3): viewer core. Measurements land in S4, tuning in S5. */
export function AnalyzePanel({
  captures,
  selection,
}: {
  captures: ThermalV2Capture[];
  selection: ReturnType<typeof useLibrarySelection>;
}) {
  const [palette, setPalette] = useState("Iron");
  const [unit, setUnit] = useState<"C" | "F">("C");
  const [hover, setHover] = useState<HoverInfo>(null);

  const activeId = selection.focusedId ?? captures[0]?.id ?? null;

  function openCapture(id: string) {
    const index = captures.findIndex((c) => c.id === id);
    selection.click(id, index, {});
  }

  return (
    <V2PanelFrame
      toolbar={<AnalyzeToolbar palette={palette} onPaletteChange={setPalette} unit={unit} onUnitChange={setUnit} hover={hover} />}
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
      center={<AnalyzeViewer captureId={activeId} palette={palette} unit={unit} onHoverChange={setHover} />}
      right={{
        title: "Measurements",
        content: (
          <PlaceholderZone
            label="Measurements · Tuning · Display · Notes"
            detail="Accordions, Measurements open first (S4-S5)"
          />
        ),
      }}
      bottom={{
        title: "Filmstrip",
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
