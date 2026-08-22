import { notFound } from "next/navigation";

import { MeshTwinViewerClient } from "@/app/preview/twin-mesh/viewer-client";
import { resolveDigitalTwinModelUrl } from "@/lib/digital-twin/resolve-model-url";
import { s3, BUCKET } from "@/lib/s3";
import { GetObjectCommand } from "@aws-sdk/client-s3";

export const dynamic = "force-dynamic";

/**
 * Unauthenticated harness for the M6b walkthrough viewer, matching the other
 * `/preview/*` routes. Thermal Studio is CEO-gated and the twin viewer needs a
 * signed-in org, so a preview route is the only way to look at real geometry
 * without a login — same pattern already used for the thermal harnesses.
 *
 * Reads a label (default the kitchen validation run) and serves that run's
 * dollhouse GLB plus its stations sidecar.
 */

const DEFAULT_ORG = "c5538bfd-a67a-4930-8481-0e5e331ec7cc";
const DEFAULT_SPACE = "8604e6dd-24b9-4c22-86df-67c784466b86";
const DEFAULT_LABEL = "kitchen-walk";

async function readJsonKey(key: string): Promise<unknown | null> {
  try {
    const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
    const body = await res.Body?.transformToString();
    return body ? JSON.parse(body) : null;
  } catch {
    return null;
  }
}

export default async function TwinMeshPreviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const pick = (k: string, fallback: string) => {
    const v = params[k];
    return (Array.isArray(v) ? v[0] : v) || fallback;
  };
  const org = pick("org", DEFAULT_ORG);
  const space = pick("space", DEFAULT_SPACE);
  const label = pick("label", DEFAULT_LABEL);

  const base = `orgs/${org}/digital-twin/${space}/models/${label}`;
  const meshUrl = await resolveDigitalTwinModelUrl(`${base}.dollhouse.glb`).catch(() => null);
  if (!meshUrl) notFound();

  const walk = (await readJsonKey(`${base}.walk.json`)) as
    | { stations?: unknown[]; floors?: unknown[] }
    | null;

  return (
    <main className="h-dvh w-full bg-[var(--background)] p-3">
      <MeshTwinViewerClient
        meshUrl={meshUrl}
        stations={(walk?.stations as never) ?? []}
        floors={(walk?.floors as never) ?? []}
        label={label}
      />
    </main>
  );
}
