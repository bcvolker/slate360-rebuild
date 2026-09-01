import { notFound } from "next/navigation";

import { KitchenProofClient } from "@/app/preview/twin-metric/viewer-client";
import { KITCHEN_APPEARANCE_KIND, KITCHEN_PROOF_JOB } from "@/lib/digital-twin/kitchen-proof-world";

/**
 * Kitchen visual proof. Metric geometry + Brush appearance. No dashboard chrome.
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
    <main className="relative h-dvh w-full bg-[var(--graphite-canvas)]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={asset("thumbnail.png")}
        alt=""
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-50"
      />
      <div className="relative h-full w-full">
        <KitchenProofClient
          displayUrl={asset("geometry-display.glb")}
          navUrl={asset("geometry-nav.glb")}
          measureUrl={asset("geometry-measurement.glb")}
          appearanceUrl={asset(KITCHEN_APPEARANCE_KIND)}
          thumbnailUrl={asset("thumbnail.png")}
          debug={debug}
        />
      </div>
    </main>
  );
}
