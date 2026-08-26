import { notFound } from "next/navigation";

import { MeshTwinViewerClient } from "@/app/preview/twin-mesh/viewer-client";
import { s3, BUCKET } from "@/lib/s3";
import { GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";

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

// The 2026-08-25 capture, reprocessed after the frame-truncation fix took
// untextured vertices from 37.3% to 20.0%.
const DEFAULT_LABEL = "kitchen-aug25";
const PINNED_ORG = "c5538bfd-a67a-4930-8481-0e5e331ec7cc";
const PINNED_SPACE = "f10a56ab-cd2b-42e0-b328-363e8940172e";
const LABEL_RE = /^[a-z0-9][a-z0-9-]{0,63}$/i;

async function objectExists(key: string): Promise<boolean> {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

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

  // Prefer the atlas-textured GLB. The vertex-coloured PLY is the fallback for
  // captures processed before atlas baking existed — it carries one colour per
  // vertex, roughly one sample every 4.5 cm, which is why it looks soft.
  const textured = await objectExists(`${base}.textured.glb`);
  const meshKind = textured ? "textured.glb" : "dollhouse.ply";

  // The processor CUTS the ceiling but deliberately does not REMOVE it, so the
  // viewer can offer open/closed/plenum. That makes ceilingCutY mandatory here:
  // without it nothing clips, and dollhouse mode looks down at a sealed roof
  // instead of into the room.
  const layers = await readJsonKey(`${base}.layers.json`);
  const ceilingCutY =
    typeof layers?.ceilingCutY === "number" ? layers.ceilingCutY : null;

  return (
    <main className="h-dvh w-full bg-[var(--graphite-canvas)] p-3">
      <MeshTwinViewerClient
        meshUrl={`/preview/twin-mesh/asset?label=${encodeURIComponent(label)}&kind=${meshKind}`}
        stations={(walk.stations as never) ?? []}
        floors={(walk.floors as never) ?? []}
        ceilingCutY={ceilingCutY}
        label={label}
      />
    </main>
  );
}
