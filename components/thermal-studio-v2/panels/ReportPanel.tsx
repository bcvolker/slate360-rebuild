"use client";

import { useMemo } from "react";
import { V2PanelFrame } from "@/components/thermal-studio-v2/V2PanelFrame";
import { ReportOutline } from "@/components/thermal-studio-v2/panels/report/ReportOutline";
import { ReportTemplateGallery } from "@/components/thermal-studio-v2/panels/report/ReportTemplateGallery";
import { ReportBrandingAndGenerate } from "@/components/thermal-studio-v2/panels/report/ReportBrandingAndGenerate";
import { useReportState } from "@/components/thermal-studio-v2/lib/useReportState";
import { ThermalReportPreview } from "@/components/ops/thermal/ThermalReportPreview";
import type { useLibrarySelection } from "@/components/thermal-studio-v2/lib/useLibrarySelection";
import type { ThermalV2Capture } from "@/components/thermal-studio-v2/types";

/** Tab 4 — Report (doc §1, S7): re-openable document over the real report backend. */
export function ReportPanel({
  sessionId,
  captures,
  selection,
}: {
  sessionId: string;
  captures: ThermalV2Capture[];
  selection: ReturnType<typeof useLibrarySelection>;
}) {
  const report = useReportState(sessionId);
  const byId = useMemo(() => new Map(captures.map((c) => [c.id, c])), [captures]);
  // Audit remediation Batch 2: don't flatten "nothing curated yet" into "every
  // capture" here — that silently masked ThermalReportPreview's own honest
  // "Previewing all N images, mark ★ to choose" banner (it never saw an empty
  // order to trigger it). Pass the real, possibly-empty selection through.
  const order = selection.reportOrder;

  return (
    <V2PanelFrame
      left={{
        title: "Outline",
        content: (
          <ReportOutline
            order={order}
            byId={byId}
            onReorder={selection.reorderReport}
            onRemove={selection.removeFromReport}
            template={report.template}
            onToggleSection={report.toggleSection}
          />
        ),
      }}
      center={
        <ThermalReportPreview
          sessionName={report.sessionName}
          template={report.template}
          branding={report.branding}
          conditions={report.conditions}
          signature={report.signature}
          order={order}
          byId={byId}
          summary={report.summary}
        />
      }
      right={{
        title: "Template & branding",
        content: (
          <div className="flex h-full flex-col gap-3 overflow-y-auto">
            <ReportTemplateGallery templates={report.templates} activeId={report.templateId} onSelect={report.setTemplateId} />
            <ReportBrandingAndGenerate
              sessionId={sessionId}
              branding={report.branding}
              onBrandingChange={report.setBranding}
              conditions={report.conditions}
              onConditionsChange={report.setConditions}
              signature={report.signature}
              onSignatureChange={report.setSignature}
              captureIds={order}
            />
          </div>
        ),
      }}
    />
  );
}
