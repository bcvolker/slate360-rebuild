import { notFound } from "next/navigation";

import { MeshTwinViewerClient } from "@/app/preview/twin-mesh/viewer-client";

/**
 * Unauthenticated harness for Twin Metric Processor V1 geometry.glb.
 * Pinned to the KitchenAprilTags org/space. Job UUID is the only query input.
 */
export const dynamic = "force-dynamic";

const PINNED_ORG = "c5538bfd-a67a-4930-8481-0e5e331ec7cc";
const PINNED_SPACE = "e4eaf78b-b064-4cce-b640-8bc8efb820e1";
const JOB_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const DUMMY_STATIONS = [
  { id: "origin", position: [0, 1.5, 0] as [number, number, number], floorIndex: 0, headingY: 0 },
];
const DUMMY_FLOORS = [{ index: 0, label: "Ground", elevationY: 0 }];

export default async function TwinMetricPreviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const raw = params.job;
  const jobId = Array.isArray(raw) ? raw[0] : raw;
  if (!jobId || !JOB_RE.test(jobId)) notFound();

  const meshUrl = `/preview/twin-metric/asset?job=${encodeURIComponent(jobId)}&kind=geometry.glb`;
  return (
    <main className="h-dvh w-full bg-[var(--graphite-canvas)] p-3">
      <MeshTwinViewerClient
        meshUrl={meshUrl}
        splatUrl={null}
        stations={DUMMY_STATIONS}
        floors={DUMMY_FLOORS}
        ceilingCutY={null}
        label={`metric-${jobId.slice(0, 8)}`}
      />
      <p className="sr-only">
        Pinned KitchenAprilTags metric GLB org={PINNED_ORG} space={PINNED_SPACE}
      </p>
    </main>
  );
}
