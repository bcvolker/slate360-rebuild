import { notFound } from "next/navigation";
import { loadThermalSessionDetail } from "@/lib/thermal/load-session-data";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveReportTemplate } from "@/lib/thermal/resolve-report-template";
import { ThermalStudioShell } from "@/components/ops/thermal/ThermalStudioShell";
import type { StudioCapture } from "@/components/ops/thermal/ThermalStudioWorkView";
import type { ThermalBrandingConfig } from "@/lib/thermal/types";

type PageProps = { params: Promise<{ sessionId: string }> };

function readLinkedSpaceId(metadata: Record<string, unknown>): string | null {
  return typeof metadata.linked_space_id === "string" ? metadata.linked_space_id : null;
}

export default async function ThermalSessionDetailPage({ params }: PageProps) {
  const { sessionId } = await params;
  const detail = await loadThermalSessionDetail(sessionId);
  if (!detail) notFound();

  const metadata = (detail.session.metadata as Record<string, unknown>) ?? {};
  const linkedSpaceId = readLinkedSpaceId(metadata);

  const templateId =
    typeof metadata.report_template_id === "string" ? metadata.report_template_id : null;
  const signature =
    typeof metadata.report_signature === "string" ? metadata.report_signature : null;
  const reportSet = Array.isArray(metadata.report_set)
    ? (metadata.report_set as unknown[]).filter((v): v is string => typeof v === "string")
    : null;
  const conditions =
    metadata.conditions && typeof metadata.conditions === "object"
      ? (metadata.conditions as Record<string, unknown>)
      : null;
  const resolvedTemplate = await resolveReportTemplate(createAdminClient(), templateId);

  const captures: StudioCapture[] = detail.captures.map((c) => ({
    id: c.id,
    filename: c.filename ?? "Capture",
    previewUrl: c.previewUrl,
    qualityMetrics: (c.quality_metrics as Record<string, unknown> | null) ?? null,
    metadata: (c.metadata as Record<string, unknown> | null) ?? null,
    anomalies: (c.anomalies as unknown[] | null) ?? null,
  }));

  return (
    <div className="h-full min-h-0">
      <ThermalStudioShell
          sessionId={detail.session.id}
          sessionName={detail.session.name}
          captures={captures}
          initialJob={detail.latestJob}
          brandingConfig={detail.session.branding_config as ThermalBrandingConfig}
          initialParams={(metadata.analysis_params as unknown) ?? undefined}
          linkedSpaceId={linkedSpaceId}
          standards={resolvedTemplate.standards}
          initialTemplateId={templateId}
          initialSignature={signature}
          initialProjectId={(detail.session.project_id as string | null) ?? null}
          summaryMetrics={(detail.session.summary_metrics as Record<string, unknown> | null) ?? null}
          reportSet={reportSet}
          conditions={conditions}
      />
    </div>
  );
}
