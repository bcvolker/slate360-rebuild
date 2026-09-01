import { notFound } from "next/navigation";

import { KitchenProofClient } from "@/app/preview/twin-metric/viewer-client";
import { KITCHEN_PROOF_JOB } from "@/lib/digital-twin/kitchen-proof-world";

/**
 * Kitchen visual proof. Default job is the real metric cloud GLB + V1 X4 Gaussian.
 * No dashboard chrome. No QA overlays.
 */
export const dynamic = "force-dynamic";

const JOB_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function TwinMetricPreviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const raw = params.job;
  const jobId = Array.isArray(raw) ? raw[0] : raw;
  const job = jobId && JOB_RE.test(jobId) ? jobId : KITCHEN_PROOF_JOB;
  if (!JOB_RE.test(job)) notFound();

  const asset = (kind: string) =>
    `/preview/twin-metric/asset?job=${encodeURIComponent(job)}&kind=${kind}`;

  return (
    <main className="h-dvh w-full bg-[var(--graphite-canvas)]">
      <KitchenProofClient
        meshUrl={asset("geometry-web.glb")}
        splatUrl={asset("appearance-x4-v1.spz")}
      />
    </main>
  );
}
