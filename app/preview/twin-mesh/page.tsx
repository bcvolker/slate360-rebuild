import { notFound } from "next/navigation";

import { MeshTwinViewerClient } from "@/app/preview/twin-mesh/viewer-client";
import { s3, BUCKET } from "@/lib/s3";
import { GetObjectCommand } from "@aws-sdk/client-s3";

export const dynamic = "force-dynamic";

/**
 * Unauthenticated harness for the M6b walkthrough viewer, matching the other
 * `/preview/*` routes. The authenticated twin viewer needs a signed-in org, so
 * this is the only way to look at real geometry without a login.
 *
 * Assets are served through the sibling `asset` route rather than a presigned
 * R2 URL: presigned URLs carry no CORS headers, so the browser refuses the GLB
 * and three.js fails the load. That route pins org and space, so only the
 * kitchen validation capture is reachable here.
 */

const DEFAULT_LABEL = "kitchen-walk";
const PINNED_ORG = "c5538bfd-a67a-4930-8481-0e5e331ec7cc";
const PINNED_SPACE = "8604e6dd-24b9-4c22-86df-67c784466b86";
const LABEL_RE = /^[a-z0-9][a-z0-9-]{0,63}$/i;

async function readJsonKey(key: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
    const body = await res.Body?.transformToString();
    return body ? (JSON.parse(body) as Record<string, unknown>) : null;
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
  const raw = params.label;
  const requested = (Array.isArray(raw) ? raw[0] : raw) || DEFAULT_LABEL;
  const label = LABEL_RE.test(requested) ? requested : DEFAULT_LABEL;

  const base = `orgs/${PINNED_ORG}/digital-twin/${PINNED_SPACE}/models/${label}`;
  const walk = await readJsonKey(`${base}.walk.json`);
  if (!walk) notFound();

  return (
    <main className="h-dvh w-full bg-[var(--graphite-canvas)] p-3">
      <MeshTwinViewerClient
        meshUrl={`/preview/twin-mesh/asset?label=${encodeURIComponent(label)}&kind=dollhouse.ply`}
        stations={(walk.stations as never) ?? []}
        floors={(walk.floors as never) ?? []}
        label={label}
      />
    </main>
  );
}
