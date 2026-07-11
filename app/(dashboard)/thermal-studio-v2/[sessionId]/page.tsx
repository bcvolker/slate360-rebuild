import { notFound } from "next/navigation";
import { loadThermalSessionDetail } from "@/lib/thermal/load-session-data";
import { ThermalV2Shell } from "@/components/thermal-studio-v2/ThermalV2Shell";
import { toThermalV2Captures } from "@/components/thermal-studio-v2/lib/map-captures";
import type { ThermalV2Tab } from "@/components/thermal-studio-v2/types";

type PageProps = {
  params: Promise<{ sessionId: string }>;
  /** ?report=1 (TS-SD re-open deep link) jumps straight to the Report tab. */
  searchParams: Promise<{ report?: string }>;
};

export default async function ThermalStudioV2SessionPage({ params, searchParams }: PageProps) {
  const { sessionId } = await params;
  const { report } = await searchParams;
  const detail = await loadThermalSessionDetail(sessionId);
  if (!detail) notFound();

  const captures = toThermalV2Captures(detail.captures);

  const initialTab: ThermalV2Tab | undefined = report ? "report" : undefined;

  return (
    <div className="h-full min-h-0">
      <ThermalV2Shell sessionId={detail.session.id} sessionName={detail.session.name} captures={captures} initialTab={initialTab} />
    </div>
  );
}
