import { notFound } from "next/navigation";
import Link from "next/link";
import { loadThermalSessionDetail } from "@/lib/thermal/load-session-data";
import { ThermalSessionGallery } from "@/components/ops/thermal/ThermalSessionGallery";
import { ThermalBrandingPanel } from "@/components/ops/thermal/ThermalBrandingPanel";
import { ThermalSessionActions } from "@/components/ops/thermal/ThermalSessionActions";
import { ThermalTwinLayerPanel } from "@/components/ops/thermal/ThermalTwinLayerPanel";
import { ThermalSessionSummaryBar } from "@/components/ops/thermal/ThermalSessionSummaryBar";
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
  const summary = (detail.session.summary_metrics as Record<string, unknown>) ?? {};

  return (
    <div className="space-y-4">
      <Link href="/operations-console/thermal" className="text-sm text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)]">
        ← All sessions
      </Link>
      <ThermalSessionSummaryBar summary={summary} />
      <ThermalSessionGallery
        sessionId={detail.session.id}
        sessionName={detail.session.name}
        sessionStatus={detail.session.status}
        captures={detail.captures}
        initialJob={detail.latestJob}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <ThermalBrandingPanel
          sessionId={detail.session.id}
          initial={detail.session.branding_config as ThermalBrandingConfig}
        />
        <ThermalSessionActions sessionId={detail.session.id} captureCount={detail.captures.length} />
      </div>
      <ThermalTwinLayerPanel sessionId={detail.session.id} linkedSpaceId={linkedSpaceId} />
    </div>
  );
}
