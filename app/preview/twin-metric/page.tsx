import { notFound } from "next/navigation";

import { KitchenProofClient } from "@/app/preview/twin-metric/viewer-client";
import { KITCHEN_APPEARANCE_KIND, KITCHEN_PROOF_JOB } from "@/lib/digital-twin/kitchen-proof-world";

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
  const failRaw = params.fail;
  const fail = Array.isArray(failRaw) ? failRaw[0] : failRaw;
  const sha = process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ?? "";

  const asset = (kind: string) =>
    `/preview/twin-metric/asset?job=${encodeURIComponent(job)}&kind=${kind}`;

  return (
    <main
      className="relative h-dvh w-full bg-[var(--graphite-canvas)]"
      data-release-sha={sha}
      data-testid="twin-metric-root"
    >
      <div className="relative h-full w-full">
        <KitchenProofClient
          displayUrl={fail === "glb" ? "/preview/twin-metric/missing.glb" : asset("geometry-display.glb")}
          navUrl={asset("geometry-nav.glb")}
          measureUrl={asset("geometry-measurement.glb")}
          appearanceUrl={fail === "spz" ? null : asset(KITCHEN_APPEARANCE_KIND)}
          heroUrl="/monday-release/kitchen-hero.png"
          failAppearance={fail === "spz"}
          debug={debug}
        />
      </div>
    </main>
  );
}
