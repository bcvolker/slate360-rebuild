import { notFound } from "next/navigation";

import { KitchenProofClient } from "@/app/preview/twin-metric/viewer-client";
import { KITCHEN_PROOF_JOB } from "@/lib/digital-twin/kitchen-proof-world";

/**
 * Kitchen visual proof. Geometry-first. No fake Gaussian. No dashboard chrome.
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
  const debugRaw = params.debugTwin;
  const debug = (Array.isArray(debugRaw) ? debugRaw[0] : debugRaw) === "1";

  const asset = (kind: string) =>
    `/preview/twin-metric/asset?job=${encodeURIComponent(job)}&kind=${kind}`;

  return (
    <main className="h-dvh w-full bg-[var(--graphite-canvas)]">
      <KitchenProofClient
        displayUrl={asset("geometry-display.glb")}
        navUrl={asset("geometry-nav.glb")}
        measureUrl={asset("geometry-measurement.glb")}
        thumbnailUrl={asset("thumbnail.png")}
        appearanceUrl={asset("appearance-x4-v1.spz")}
        debug={debug}
      />
    </main>
  );
}
