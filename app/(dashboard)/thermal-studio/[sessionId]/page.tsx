import { notFound } from "next/navigation";
import Link from "next/link";
import { loadThermalSessionDetail } from "@/lib/thermal/load-session-data";
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

  const captures: StudioCapture[] = detail.captures.map((c) => ({
    id: c.id,
    filename: c.filename ?? "Capture",
    previewUrl: c.previewUrl,
    qualityMetrics: (c.quality_metrics as Record<string, unknown> | null) ?? null,
    metadata: (c.telemetry as Record<string, unknown> | null) ?? null,
  }));

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <Link href="/thermal-studio" className="text-sm text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)]">
        ← All sessions
      </Link>
      <h1 className="text-lg font-bold text-[var(--graphite-text-header)]">{detail.session.name}</h1>
      <div className="min-h-0 flex-1">
        <ThermalStudioShell
          sessionId={detail.session.id}
          sessionName={detail.session.name}
          captures={captures}
          initialJob={detail.latestJob}
          brandingConfig={detail.session.branding_config as ThermalBrandingConfig}
          initialParams={(metadata.analysis_params as unknown) ?? undefined}
          linkedSpaceId={linkedSpaceId}
        />
      </div>
    </div>
  );
}
